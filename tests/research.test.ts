import { test } from "node:test";
import assert from "node:assert/strict";
import { observation } from "../src/lib/weather/parse";
import { researchFeatures } from "../src/lib/weather/research-features";
import { visibilityTrend } from "../src/lib/weather/visibility-trend";

const at = "2025-10-06T06:00:00.000Z";
const sample = (time: string, visibility = "1000", cloud = "BKN002") =>
  observation(`EPKK 060600Z 08003KT ${visibility} ${cloud} 04/03 Q1015`, time);

test("research features cannot change when future observations are supplied", () => {
  const current = sample(at);
  const past = [
    sample("2025-10-06T05:00:00.000Z", "2000"),
    sample("2025-10-06T03:00:00.000Z", "4000"),
  ];
  const first = researchFeatures(current, past, 6, true)!;
  assert.deepEqual(
    researchFeatures(
      current,
      [...past, sample("2025-10-06T07:00:00.000Z", "0200")],
      6,
      true,
    ),
    first,
  );
  assert.equal(first.visibilityLagMissing1h, 0);
  assert.equal(first.visibilityLagMissing6h, 1);
  assert.equal(first.windowIncomplete24h, 1);
  assert.ok(first.visibilityChange3h < 0);
  assert.ok(Object.values(first).every(Number.isFinite));
});
test("CAVOK is not total clear sky and missing inputs do not become dry calm weather", () => {
  const current = observation("EPKK 060600Z 00000KT CAVOK 04/03 Q1015", at);
  assert.equal(researchFeatures(current, [], 2, true)!.cloudCoverMissing, 1);
  current.conditions.temperature = null;
  assert.equal(researchFeatures(current, [], 2, true), null);
});
test("visibility trend rejects stale, short, interrupted and future data", () => {
  const observations = [
    sample("2025-10-06T05:00:00.000Z", "2000"),
    sample("2025-10-06T05:30:00.000Z", "1000"),
    sample(at, "0400"),
  ];
  const current = observations[2];
  const trend = visibilityTrend(observations, current, at)!;
  assert.equal(trend.direction, "worsening");
  assert.equal(trend.minutes, 60);
  assert.deepEqual(
    visibilityTrend(
      [...observations, sample("2025-10-06T07:00:00.000Z", "9999")],
      current,
      at,
    ),
    trend,
  );
  assert.equal(
    visibilityTrend(observations, current, "2025-10-06T08:00:00.000Z"),
    null,
  );
  assert.equal(visibilityTrend(observations.slice(1), current, at), null);
  assert.equal(
    visibilityTrend([observations[0], observations[0], current], current, at),
    null,
  );
  assert.equal(
    visibilityTrend(
      [sample("2025-10-06T04:00:00.000Z"), ...observations.slice(1)],
      current,
      at,
    ),
    null,
  );
});
test("visibility trend distinguishes a rebound from improvement and caps >=10km readings", () => {
  const times = ["2025-10-06T05:00:00.000Z", "2025-10-06T05:30:00.000Z", at];
  const varying = times.map((time, i) =>
    sample(time, ["8000", "0400", "8000"][i]),
  );
  assert.equal(visibilityTrend(varying, varying[2], at)!.direction, "variable");
  const capped = times.map((time) => sample(time, "9999"));
  capped[1].conditions.visibility = 12000;
  assert.equal(visibilityTrend(capped, capped[2], at)!.direction, "steady");
});
