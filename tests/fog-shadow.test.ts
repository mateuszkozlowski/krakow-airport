import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import artifact from "../src/lib/weather/artifacts/fog-2h-v1.json";
import references from "./fixtures/fog-2h-parity.json";
import { fogModel, fogProbability, shadowPrediction } from "../src/lib/weather/fog-shadow";
import { evaluateShadow } from "../src/lib/weather/shadow-quality";
import { observation, parseTaf, forecastPeriods } from "../src/lib/weather/parse";
import { assess } from "../src/lib/weather/engine";
import type { Snapshot } from "../src/lib/weather/model";
import { collect, getQuality } from "../src/lib/weather/history";
import { verificationIndex } from "../src/lib/weather/verification";

const issued = "2026-10-06T06:00:00.000Z";
const recorded = "2026-10-06T06:05:00.000Z";
function sample(): Snapshot {
  const observed = observation("EPKK 060600Z 08003KT 2000 BR BKN004 04/03 Q1015", issued);
  const taf = parseTaf("TAF EPKK 060500Z 0606/0706 08003KT 2000 BR BKN004 PROB40 0607/0609 0300 FG BKN001", "2026-10-06T05:00:00.000Z");
  const source = { state: "fresh" as const, fetchedAt: recorded, detail: "test" };
  const history = Array.from({ length: 53 }, (_, i) => {
    if (!i) return observed;
    const at = new Date(Date.parse(issued) - i * 30 * 60000);
    const stamp = at.toISOString().slice(8, 10) + at.toISOString().slice(11, 16).replace(":", "");
    return observation(`EPKK ${stamp}Z 08003KT 4000 BR BKN005 05/03 Q1015`, at.toISOString());
  });
  return {
    version: 2,
    generatedAt: recorded,
    observed,
    history,
    forecast: forecastPeriods(taf, new Date(recorded)),
    current: { arrival: assess(observed.conditions, "arrival"), departure: assess(observed.conditions, "departure") },
    sources: { metar: { ...source }, taf: { ...source }, model: { ...source }, ensemble: { ...source } },
    taf: { issued: taf.issued.toISOString(), end: taf.end.toISOString(), raw: "test TAF" },
    ensemble: [], fogSignal: null,
  };
}
test("frozen inference matches saved Python predictions and feature lineage", () => {
  assert.equal(createHash("sha256").update(readFileSync("src/lib/weather/research-features.ts")).digest("hex"), artifact.featuresSha256);
  for (const reference of references) {
    const result = fogProbability(reference.features)!;
    assert.ok(Math.abs(result - reference.expectedProbability) < 1e-12, reference.at);
  }
  const features: Record<string, number> = { ...references[0].features };
  delete features.spread;
  assert.equal(fogProbability(features), null);
  features.spread = NaN;
  assert.equal(fogProbability(features), null);
  features.spread = Infinity;
  assert.equal(fogProbability(features), null);
});
test("shadow forecast has the same future target as TAF and ignores future history", () => {
  const snapshot = sample();
  const before = structuredClone(snapshot);
  const prediction = shadowPrediction(snapshot)!;
  assert.equal(prediction.target, "2026-10-06T08:00:00.000Z");
  assert.equal(prediction.tafProbability, 0.4);
  assert.equal(prediction.persistenceProbability, 0);
  assert.equal(prediction.modelId, fogModel.id);
  assert.deepEqual(snapshot, before, "must not mutate passenger risk or forecast");
  snapshot.history.push(observation("EPKK 060700Z 00000KT 0300 FG BKN001 04/04 Q1015", "2026-10-06T07:00:00.000Z"));
  assert.deepEqual(shadowPrediction(snapshot), prediction);
  snapshot.sources.metar.state = "stale";
  assert.equal(shadowPrediction(snapshot), null);
});
test("shadow collection rejects old/future/missing input and future-issued TAF", () => {
  const snapshot = sample();
  assert.equal(shadowPrediction(snapshot, "2026-10-06T06:46:00.000Z"), null);
  assert.equal(shadowPrediction(snapshot, "2026-10-06T05:59:00.000Z"), null);
  snapshot.taf!.issued = "2026-10-06T06:06:00.000Z";
  const prediction = shadowPrediction(snapshot)!;
  assert.equal(prediction.tafProbability, null);
  assert.equal(prediction.tafRaw, null);
  const incomplete = sample();
  incomplete.history = [incomplete.observed!];
  assert.equal(shadowPrediction(incomplete), null, "a single fallback METAR is insufficient");
  snapshot.observed!.conditions.dewpoint = null;
  assert.equal(shadowPrediction(snapshot), null);
});
test("paired scoring uses 550m and the same subset; missing TAF is not zero", () => {
  const base = shadowPrediction(sample())!;
  const verifying = observation("EPKK 060800Z 00000KT 0800 BR BKN002 03/03 Q1015", base.target);
  const second = { ...base, id: "next", observedAt: "2026-10-06T07:00:00.000Z", recordedAt: "2026-10-06T07:05:00.000Z", target: "2026-10-06T09:00:00.000Z", tafProbability: null, modelProbability: .6 };
  const bad = observation("EPKK 060900Z 00000KT 0300 FG BKN001 03/03 Q1015", second.target);
  const q = evaluateShadow([{ ...base, modelProbability: .2 }, second], [verifying, bad], fogModel.id, Date.parse("2026-10-06T10:00:00Z"));
  assert.equal(q.matched, 2);
  assert.equal(q.all.model.samples, 2);
  assert.ok(Math.abs(q.all.model.brier! - .1) < 1e-12);
  assert.equal(q.paired.model.samples, 1);
  assert.equal(q.paired.model.positiveReadings, 0, "800m is not below 550m");
  assert.ok(Math.abs(q.paired.model.brier! - .04) < 1e-12);
  assert.ok(Math.abs(q.paired.taf.brier! - .16) < 1e-12);
  assert.equal(q.paired.persistence.brier, 0);
  assert.equal(q.missingNumericTaf, 1);
  assert.equal(q.leadMinutes.min, 115);
});
test("paired scoring rejects hindsight, duplicate revisions, wrong versions and unmatched outcomes", () => {
  const base = { ...shadowPrediction(sample())!, modelProbability: .4 };
  const good = observation("EPKK 060800Z 00000KT 0300 FG BKN001 03/03 Q1015", base.target);
  const later = { ...base, recordedAt: "2026-10-06T06:10:00.000Z", modelProbability: .9 };
  const invalid = [
    { ...base, id: "hindsight", recordedAt: base.target },
    { ...base, id: "futureTAF", tafIssueAt: "2026-10-06T07:00:00Z" },
    { ...base, id: "otherVersion", modelId: "unverified" },
    { ...base, id: "differentTarget", thresholdMetres: 1000 },
    { ...base, id: "invalidProbability", modelProbability: NaN },
  ];
  const q = evaluateShadow([later, base, ...invalid], [good], fogModel.id, Date.parse("2026-10-06T10:00:00Z"));
  assert.equal(q.matched, 1);
  assert.equal(q.paired.model.brier, .36);
  assert.equal(evaluateShadow([base], [good], fogModel.id, Date.parse("2026-10-06T08:15:00Z")).matched, 0);
  assert.equal(evaluateShadow([base], [{ ...good, at: "2026-10-06T08:16:00Z" }], fogModel.id, Date.parse("2026-10-06T10:00:00Z")).matched, 0);
});
test("collector freezes first prediction, separates thresholds and isolates evaluation failures", async () => {
  const savedUrl = process.env.UPSTASH_REDIS_REST_URL;
  const savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const originalFetch = globalThis.fetch;
  process.env.UPSTASH_REDIS_REST_URL = "https://fog-storage.test";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  const records = new Map<string, string[]>();
  const dedupe = new Set<string>();
  let failShadow = false;
  let failLegacy = false;
  globalThis.fetch = (async (input, init) => {
    assert.equal(String(input), "https://fog-storage.test");
    const command = JSON.parse(String(init!.body)) as (string | number)[];
    let result: unknown = 1;
    if (command[0] === "EVAL" && !dedupe.has(String(command[3]))) {
      dedupe.add(String(command[3]));
      const key = String(command[4]);
      records.set(key, [...(records.get(key) ?? []), String(command[6])]);
    } else if (command[0] === "ZRANGEBYSCORE") {
      if (failShadow && String(command[1]).endsWith("shadow-predictions")) throw new Error("test experimental outage");
      if (failLegacy && command[1] === "krk:v2:predictions") throw new Error("test legacy outage");
      result = records.get(String(command[1])) ?? [];
    }
    return Response.json({ result });
  }) as typeof fetch;
  try {
    const first = sample();
    await collect(first, first.generatedAt);
    const revised = sample();
    revised.generatedAt = "2026-10-06T06:15:00.000Z";
    revised.forecast.forEach((p) => { p.scenarios = []; });
    await collect(revised, revised.generatedAt);
    const legacy = records.get("krk:v2:predictions")!;
    const shadow = records.get("krk:v2:shadow-predictions")!;
    assert.equal(legacy.length, 1);
    assert.equal(shadow.length, 1);
    assert.equal(JSON.parse(shadow[0]).recordedAt, first.generatedAt);
    assert.equal(JSON.parse(shadow[0]).tafProbability, .4);
    assert.equal(JSON.parse(shadow[0]).thresholdMetres, 550);
    assert.equal(JSON.parse(legacy[0]).source, "TAF v2");
    failShadow = true;
    const quality = await getQuality();
    assert.equal(quality.available, true);
    assert.equal(quality.shadow.available, false);
    failShadow = false;
    failLegacy = true;
    const comparison = await getQuality();
    assert.equal(comparison.available, false);
    assert.equal(comparison.shadow.available, true);
  } finally {
    globalThis.fetch = originalFetch;
    if (savedUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL; else process.env.UPSTASH_REDIS_REST_URL = savedUrl;
    if (savedToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN; else process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
  }
});
test("verification index matches brute-force nearest outcomes and rejects conflicting revisions", () => {
  const start = Date.parse(issued);
  const data = Array.from({ length: 96 }, (_, i) => {
    const at = new Date(start + i * 30 * 60000).toISOString();
    return observation(`EPKK 060600Z 00000KT ${i % 2 ? "0800" : "0300"} BKN001 04/03 Q1015`, at);
  });
  const now = start + 100 * 30 * 60000;
  const find = verificationIndex([...data].reverse(), now);
  for (let i = -5; i < 300; i++) {
    const target = start + i * 10 * 60000;
    const brute = [...data].sort((a, b) => Math.abs(Date.parse(a.at) - target) - Math.abs(Date.parse(b.at) - target) || Date.parse(b.at) - Date.parse(a.at))[0];
    const expected = Math.abs(Date.parse(brute.at) - target) <= 15 * 60000 ? brute.at : null;
    assert.equal(find(target)?.at ?? null, expected);
  }
  assert.equal(verificationIndex([data[0], data[0]], now)(start)?.at, issued);
  assert.equal(find(start + 15 * 60000)?.at, data[1].at, "later report wins a tie, consistently with offline labels");
  const conflict = structuredClone(data[0]);
  conflict.conditions.visibility = 1000;
  assert.equal(verificationIndex([data[0], conflict, data[0]], now)(start), null);
  const unknown = structuredClone(data[1]);
  unknown.conditions.visibility = null;
  assert.equal(verificationIndex([data[0], unknown], now)(Date.parse(unknown.at)), null);
  assert.equal(verificationIndex([data[0]], start - 1)(start), null);
  assert.equal(find(NaN), null);
});
