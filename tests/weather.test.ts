import { test } from "node:test";
import assert from "node:assert/strict";
import { assess, crosswind, defaultConfig } from "../src/lib/weather/engine";
import {
  observation,
  parseRvr,
  parseTaf,
  forecastAt,
  forecastPeriods,
} from "../src/lib/weather/parse";
import {
  localInput,
  warsawToUtc,
  eveningBefore,
} from "../src/lib/weather/time";
import { calendar } from "../src/lib/weather/calendar";
import { ensembleSignals } from "../src/lib/weather/ensemble";
import {
  evaluate,
  visibilityProbability,
  type Prediction,
} from "../src/lib/weather/quality";
import { validPush, validEndpoint } from "../src/lib/weather/push-validation";
const issue = "2026-10-06T00:00:00Z";
const metar = (groups: string) =>
  observation(`EPKK 060000Z ${groups} 01/00 Q1013`, issue).conditions;
const taf = (groups: string) =>
  parseTaf(`TAF EPKK 060000Z 0600/0706 ${groups}`, issue);

test("wind remains in knots and strong headwind is not a strong crosswind", () => {
  const c = metar("07830KT 9999 SCT030");
  assert.equal(c.wind?.speed, 30);
  assert.equal(crosswind(c), 0);
  assert.equal(assess(c, "arrival").level, 1);
  const side = metar("16830G40KT 9999 SCT030");
  assert.equal(crosswind(side), 40);
  assert.equal(assess(side, "arrival").level, 3);
});
test("metric wind converts once; VRB is unknown direction with a conservative bound", () => {
  assert.ok(
    Math.abs(metar("07810MPS 9999 SCT030").wind!.speed - 19.4384) < 0.01,
  );
  const variable = metar("VRB20KT 9999 SCT030");
  assert.equal(variable.wind!.direction, null);
  assert.equal(crosswind(variable), 20);
});
test("wind directional arc is included in the crosswind maximum", () => {
  const c = metar("07830KT 040V170 9999 SCT030");
  assert.ok(crosswind(c)! > 29.9);
});
test("cloud ceiling uses BKN/OVC or vertical visibility, never FEW/SCT", () => {
  assert.equal(assess(metar("00000KT 9999 FEW001 SCT002"), "arrival").level, 1);
  assert.equal(metar("00000KT 9999 BKN001").ceiling, 100);
  assert.equal(metar("00000KT 9999 OVC000").ceiling, 0);
  assert.equal(metar("00000KT 9999 VV000").ceiling, 0);
});
test("RVR parses variable readings, bounds, trend and feet", () => {
  assert.deepEqual(parseRvr("EPKK R07/M0600V1200U"), [
    {
      runway: "07",
      min: 600,
      max: 1200,
      minQualifier: "M",
      maxQualifier: null,
      trend: "U",
    },
  ]);
  assert.equal(parseRvr("R25/P2000N")[0].minQualifier, "P");
  assert.equal(parseRvr("R07/1000FT")[0].min, 305);
});
test("RVR and general visibility are distinct; arrival and departure differ", () => {
  const c = metar("00000KT 0300 R07/1200U FG NSC");
  assert.equal(assess(c, "arrival").basis, "rvr");
  assert.equal(assess(c, "arrival").level, 2);
  const fog = metar("00000KT 0500 FG NSC");
  assert.equal(assess(fog, "arrival").level, 4);
  assert.equal(assess(fog, "departure").level, 3);
  assert.ok(
    assess(metar("00000KT 9999 R07/M0600 FG NSC"), "arrival").reasons.includes(
      "rvrBound",
    ),
  );
});
test("visibility assessment is monotone at every threshold", () => {
  for (const op of ["arrival", "departure"] as const) {
    let prior = 1;
    for (let vis = 9999; vis >= 0; vis -= 1) {
      const c = metar("00000KT 9999 NSC");
      c.visibility = vis;
      const level = assess(c, op).level!;
      assert.ok(level >= prior, `visibility=${vis}, operation=${op}`);
      prior = level;
    }
  }
});
test("freezing fog is not a closure and thunderstorms matter in good visibility", () => {
  assert.equal(assess(metar("00000KT 8000 FZFG NSC"), "arrival").level, 2);
  assert.equal(assess(metar("00000KT 9999 TSRA SCT030"), "arrival").level, 3);
  assert.equal(assess(null, "arrival").level, null);
});
test("known hazards remain visible when the visibility observation is missing", () => {
  const c = metar("00000KT 9999 TSRA SCT030");
  c.visibility = null;
  const result = assess(c, "arrival");
  assert.equal(result.level, 3);
  assert.ok(result.reasons.includes("missing"));
  assert.ok(result.reasons.includes("thunderstorm"));
});
test("winter snowfall intensity and reported wind shear produce cautious warnings", () => {
  const c = metar("00000KT 9999 NSC");
  c.snowfallCm = 1.2;
  assert.equal(assess(c, "departure").level, 3);
  c.snowfallCm = null;
  c.windShear = true;
  assert.ok(assess(c, "arrival").reasons.includes("windShear"));
});
test("risk settings are configurable without a calendar-triggered CAT II change", () => {
  const c = metar("00000KT 9999 R07/0400 FG NSC");
  assert.equal(assess(c, "arrival").level, 4);
  assert.equal(
    assess(c, "arrival", { ...defaultConfig, arrivalRvr: 300 }).level,
    3,
  );
});
test("raw TAF visibility is parsed after wind without stealing wind digits", () => {
  const p = forecastAt(taf("07015G25KT 0300 FG BKN001"), new Date(issue));
  assert.equal(p.conditions.visibility, 300);
  assert.equal(p.conditions.wind?.speed, 15);
});
test("PROB40 survives parsing and a partial TEMPO inherits wind", () => {
  const p = forecastAt(
    taf("07810KT 9999 SCT030 PROB40 TEMPO 0601/0605 0300 FG BKN001"),
    new Date("2026-10-06T02:00:00Z"),
  );
  assert.equal(p.arrival.level, 1);
  assert.equal(p.scenarios[0].probability, 40);
  assert.equal(p.scenarios[0].conditions.wind?.speed, 10);
  assert.equal(p.scenarios[0].arrival.level, 4);
});
test("TEMPO has no invented numeric probability and cannot erase a worse base", () => {
  const p = forecastAt(
    taf("07810KT 0300 FG OVC001 TEMPO 0601/0605 5000 NSW"),
    new Date("2026-10-06T02:00:00Z"),
  );
  assert.equal(p.arrival.level, 4);
  assert.equal(p.scenarios[0].probability, null);
  assert.deepEqual(p.scenarios[0].conditions.weather, []);
});
test("BECMG retains pre-transition conditions until the transition end", () => {
  const t = taf("07810KT 9999 SCT030 BECMG 0605/0607 0300 FG BKN001");
  const during = forecastAt(t, new Date("2026-10-06T06:00:00Z"));
  assert.equal(during.arrival.level, 1);
  assert.equal(during.scenarios[0].kind, "BECMG");
  assert.equal(during.scenarios[0].arrival.level, 4);
  assert.equal(
    forecastAt(t, new Date("2026-10-06T07:00:00Z")).arrival.level,
    4,
  );
});
test("FM resets prevailing conditions, including old fog and ceiling", () => {
  const p = forecastAt(
    taf("07810KT 0300 FG BKN001 FM060900 25810KT CAVOK"),
    new Date("2026-10-06T09:00:00Z"),
  );
  assert.equal(p.arrival.level, 1);
  assert.deepEqual(p.conditions.weather, []);
  assert.equal(p.conditions.ceiling, null);
});
test("BECMG CAVOK clears the parser library’s inherited fog and cloud fields", () => {
  const p = forecastAt(
    taf("07810KT 0300 FG BKN001 BECMG 0605/0607 CAVOK"),
    new Date("2026-10-06T08:00:00Z"),
  );
  assert.equal(p.conditions.visibility, 10000);
  assert.equal(p.conditions.ceiling, null);
  assert.deepEqual(p.conditions.weather, []);
});
test("nested temporary forecasts retain the outer tail and all scenarios", () => {
  const t = taf(
    "07810KT CAVOK TEMPO 0601/0608 1000 BR PROB30 TEMPO 0603/0605 0300 FG BKN001",
  );
  assert.equal(
    forecastAt(t, new Date("2026-10-06T04:00:00Z")).scenarios.length,
    2,
  );
  assert.equal(
    forecastAt(t, new Date("2026-10-06T06:00:00Z")).scenarios.length,
    1,
  );
  const periods = forecastPeriods(t, new Date(issue));
  for (let i = 1; i < periods.length; i++)
    assert.equal(periods[i - 1].end, periods[i].start);
});
test("TAF date rollover across month and midnight preserves UTC instants", () => {
  const t = parseTaf(
    "TAF EPKK 312300Z 0100/0200 07810KT CAVOK",
    "2026-10-31T23:00:00Z",
  );
  assert.equal(t.start.toISOString(), "2026-11-01T00:00:00.000Z");
  assert.equal(localInput("2026-10-06T06:00:00Z"), "2026-10-06T08:00");
  assert.equal(warsawToUtc("2026-10-06T08:00"), "2026-10-06T06:00:00.000Z");
});
test("Warsaw DST gaps and duplicate hours are rejected explicitly", () => {
  assert.throws(() => warsawToUtc("2026-03-29T02:30"), /Nonexistent/);
  assert.throws(() => warsawToUtc("2026-10-25T02:30"), /Ambiguous/);
  assert.equal(warsawToUtc("2026-12-01T08:00"), "2026-12-01T07:00:00.000Z");
});
test("calendar reminders use the previous local day across DST and fold by bytes", () => {
  assert.equal(
    eveningBefore("2026-10-25T07:00:00Z"),
    "2026-10-24T16:00:00.000Z",
  );
  const ics = calendar(
    "2026-10-25T07:00:00Z",
    "departure",
    "pl",
    new Date("2026-10-20T00:00:00Z"),
  );
  assert.ok(ics.includes("TRIGGER;VALUE=DATE-TIME:20261024T160000Z"));
  assert.ok(ics.endsWith("\r\n"));
  assert.ok(
    ics.split("\r\n").every((line) => Buffer.byteLength(line, "utf8") <= 75),
  );
});
test("ensemble drops missing members instead of turning null into zero", () => {
  const hourly: Record<string, (string | number | null)[]> = {
    time: ["2026-10-06T00:00"],
  };
  for (let i = 1; i <= 12; i++) {
    hourly[`temperature_2m_member${i}`] = [10];
    hourly[`dew_point_2m_member${i}`] = [i <= 10 ? 9.5 : null];
    hourly[`wind_speed_10m_member${i}`] = [2];
  }
  assert.deepEqual(ensembleSignals({ hourly }), [
    { at: "2026-10-06T00:00Z", members: 10, favourable: 10 },
  ]);
  delete hourly.dew_point_2m_member1;
  assert.deepEqual(ensembleSignals({ hourly }), []);
});
test("ensemble includes the control member and rejects incorrect wind units", () => {
  const hourly: Record<string, (string | number | null)[]> = {
    time: ["2026-10-06T00:00"],
    temperature_2m: [10],
    dew_point_2m: [9.5],
    wind_speed_10m: [2],
  };
  for (let i = 1; i <= 9; i++) {
    hourly[`temperature_2m_member${i}`] = [10];
    hourly[`dew_point_2m_member${i}`] = [9.5];
    hourly[`wind_speed_10m_member${i}`] = [2];
  }
  assert.equal(ensembleSignals({ hourly })[0].members, 10);
  assert.deepEqual(
    ensembleSignals({ hourly, hourly_units: { wind_speed_10m: "m/s" } }),
    [],
  );
});
test("quality rejects hindsight and unmatched samples and calculates Brier correctly", () => {
  const base: Prediction = {
    id: "x",
    recordedAt: "2026-10-05T22:00:00Z",
    target: issue,
    source: "TAF",
    arrival: 4,
    departure: 3,
    visibilityProbability: 0.4,
  };
  const obs = observation(
    "EPKK 060000Z 00000KT 0300 FG BKN001 01/00 Q1013",
    issue,
  );
  const q = evaluate(
    [
      base,
      { ...base, recordedAt: issue },
      { ...base, recordedAt: "invalid-date" },
      { ...base, target: "2026-10-06T03:00:00Z" },
    ],
    [obs],
    Date.parse("2026-10-06T04:00:00Z"),
  );
  assert.equal(q.matched, 1);
  assert.equal(q.scored, 1);
  assert.equal(q.brier, 0.36);
  assert.equal(q.misses, 1);
});
test("quality handles probability of both improvement and deterioration without guessing joint scenarios", () => {
  const worsening = forecastPeriods(
    taf("07810KT CAVOK PROB40 TEMPO 0601/0605 0300 FG BKN001"),
    new Date(issue),
  ).find((p) => p.scenarios.length)!;
  assert.equal(visibilityProbability(worsening), 0.4);
  const improving = forecastPeriods(
    taf("07810KT 0300 FG OVC001 PROB40 TEMPO 0601/0605 5000 NSW"),
    new Date(issue),
  ).find((p) => p.scenarios.length)!;
  assert.equal(visibilityProbability(improving), 0.6);
  const unknown = forecastPeriods(
    taf("07810KT CAVOK TEMPO 0601/0605 0300 FG BKN001"),
    new Date(issue),
  ).find((p) => p.scenarios.length)!;
  assert.equal(visibilityProbability(unknown), null);
});
test("push endpoints block SSRF and invalid key lengths", () => {
  assert.equal(validEndpoint("https://127.0.0.1/push"), false);
  assert.equal(
    validEndpoint("https://fcm.googleapis.com.evil.test/push"),
    false,
  );
  assert.equal(validEndpoint("https://fcm.googleapis.com:8443/push"), false);
  assert.equal(
    validPush({
      endpoint: "https://fcm.googleapis.com/fcm/send/x",
      keys: { p256dh: "a".repeat(87), auth: "a".repeat(22) },
    }),
    true,
  );
  assert.equal(
    validPush({
      endpoint: "https://fcm.googleapis.com/fcm/send/x",
      keys: { p256dh: "a", auth: "b" },
    }),
    false,
  );
});
