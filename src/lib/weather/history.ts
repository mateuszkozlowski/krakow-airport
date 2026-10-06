import "server-only";
import { hasStorage, storage } from "@/lib/cache";
import type { Observation, Snapshot } from "./model";
import { evaluate, visibilityProbability, type Prediction } from "./quality";
import { fogModel, shadowPrediction, type ShadowPrediction } from "./fog-shadow";
import { evaluateShadow } from "./shadow-quality";
const retention = 90 * 86400000;
const observationsKey = "krk:v2:observations";
const predictionsKey = "krk:v2:predictions";
const shadowKey = "krk:v2:shadow-predictions";
export async function collect(snapshot: Snapshot, recordedAt = new Date().toISOString()) {
  if (!hasStorage()) throw new Error("History storage unavailable");
  if (snapshot.history.length)
    await storage(
      "ZADD",
      observationsKey,
      ...snapshot.history.flatMap((o) => [Date.parse(o.at), JSON.stringify(o)]),
    );
  // Freeze one forecast per UTC hour before its outcome exists. No backfilling.
  const hour = Math.floor(Date.parse(snapshot.generatedAt) / 3600000) * 3600000;
  const target = new Date(hour + 3 * 3600000).toISOString();
  const period = snapshot.forecast.find(
    (p) => p.source === "TAF" && p.start <= target && p.end > target,
  );
  if (period && period.conditions.visibility !== null) {
    const probability = visibilityProbability(period);
    const prediction: Prediction = {
      id: String(hour),
      recordedAt: snapshot.generatedAt,
      target,
      source: "TAF v2",
      arrival: period.arrival.level,
      departure: period.departure.level,
      visibilityProbability: probability,
      tafIssueAt: snapshot.taf?.issued ?? null,
      tafRaw: snapshot.taf?.raw ?? null,
    };
    await storage(
      "EVAL",
      "if redis.call('EXISTS',KEYS[1]) == 0 then redis.call('ZADD',KEYS[2],ARGV[1],ARGV[2]); redis.call('SET',KEYS[1],'1','EX',ARGV[3]); return 1 end return 0",
      2,
      `krk:v2:prediction:${hour}`,
      predictionsKey,
      hour,
      JSON.stringify(prediction),
      91 * 86400,
    );
  }
  // Same issued model, TAF and persistence target. Atomic first-write wins;
  // retries and later TAF revisions cannot replace the recorded prediction.
  const shadow = shadowPrediction(snapshot, recordedAt);
  if (shadow) {
    await storage(
      "EVAL",
      "if redis.call('EXISTS',KEYS[1]) == 0 then redis.call('ZADD',KEYS[2],ARGV[1],ARGV[2]); redis.call('SET',KEYS[1],'1','EX',ARGV[3]); return 1 end return 0",
      2,
      `krk:v2:shadow-prediction:${shadow.id}`,
      shadowKey,
      Date.parse(shadow.recordedAt),
      JSON.stringify(shadow),
      91 * 86400,
    );
  }
  await Promise.all([
    storage(
      "ZREMRANGEBYSCORE",
      observationsKey,
      "-inf",
      Date.now() - retention,
    ),
    storage("ZREMRANGEBYSCORE", predictionsKey, "-inf", Date.now() - retention),
    storage("ZREMRANGEBYSCORE", shadowKey, "-inf", Date.now() - retention),
    storage("EXPIRE", observationsKey, 91 * 86400),
    storage("EXPIRE", predictionsKey, 91 * 86400),
    storage("EXPIRE", shadowKey, 91 * 86400),
  ]);
}
export async function getQuality() {
  const emptyShadow = () => ({
    available: false,
    ...evaluateShadow([], [], fogModel.id),
  });
  if (!hasStorage())
    return { available: false, ...evaluate([], []), shadow: emptyShadow() };
  try {
    const [o, p, s] = await Promise.allSettled([
      storage<string[]>(
        "ZRANGEBYSCORE",
        observationsKey,
        Date.now() - retention,
        "+inf",
      ),
      storage<string[]>(
        "ZRANGEBYSCORE",
        predictionsKey,
        Date.now() - retention,
        "+inf",
      ),
      storage<string[]>("ZRANGEBYSCORE", shadowKey, Date.now() - retention, "+inf"),
    ]);
    if (o.status !== "fulfilled")
      throw new Error("Quality history unavailable");
    const observations = o.value.map((value) => JSON.parse(value) as Observation);
    let legacy = { available: false, ...evaluate([], []) };
    if (p.status === "fulfilled") {
      try {
        legacy = {
          available: true,
          ...evaluate(p.value.map((s) => JSON.parse(s) as Prediction), observations),
        };
      } catch {
        // Legacy evaluation failure cannot hide the experimental comparison.
      }
    }
    let shadow = emptyShadow();
    if (s.status === "fulfilled") {
      try {
        shadow = {
          available: true,
          ...evaluateShadow(
            s.value.map((value) => JSON.parse(value) as ShadowPrediction),
            observations,
            fogModel.id,
          ),
        };
      } catch {
        // Experimental evaluation failure cannot hide the existing TAF result.
      }
    }
    return { ...legacy, shadow };
  } catch {
    return { available: false, ...evaluate([], []), shadow: emptyShadow() };
  }
}
