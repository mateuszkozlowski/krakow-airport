import type { Observation } from "./model";
import type { ShadowPrediction } from "./fog-shadow";
import { verificationIndex } from "./verification";

const probability = (p: number | null) =>
  p !== null && Number.isFinite(p) && p >= 0 && p <= 1;
const empty = () => ({
  samples: 0,
  positiveReadings: 0,
  brier: null as number | null,
  hits: 0,
  misses: 0,
  falseAlarms: 0,
  correctNegatives: 0,
});
type Score = ReturnType<typeof empty>;
function add(score: Score, predicted: number, outcome: 0 | 1) {
  const sum = (score.brier ?? 0) * score.samples + (predicted - outcome) ** 2;
  score.samples++;
  score.positiveReadings += outcome;
  score.brier = sum / score.samples;
  if (predicted >= 0.3) {
    if (outcome) score.hits++;
    else score.falseAlarms++;
  } else {
    if (outcome) score.misses++;
    else score.correctNegatives++;
  }
}

/** Compare exactly the same future outcomes, never mixed visibility thresholds. */
export function evaluateShadow(
  predictions: ShadowPrediction[],
  observations: Observation[],
  modelId: string,
  now = Date.now(),
) {
  const result = {
    modelId,
    thresholdMetres: 550,
    nominalLeadHours: 2,
    alarmThreshold: 0.3,
    matched: 0,
    missingNumericTaf: 0,
    leadMinutes: { min: null as number | null, max: null as number | null },
    all: { model: empty(), persistence: empty() },
    paired: { model: empty(), taf: empty(), persistence: empty() },
    currentlyClear: { model: empty(), taf: empty(), persistence: empty() },
  };
  const seen = new Set<string>();
  const verify = verificationIndex(observations, now);
  // Retain the first actual record of an issue, even if duplicate data is loaded.
  const ordered = [...predictions].sort(
    (a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt),
  );
  for (const p of ordered) {
    if (p.modelId !== modelId || seen.has(p.id)) continue;
    seen.add(p.id);
    const target = Date.parse(p.target);
    const recorded = Date.parse(p.recordedAt);
    const observed = Date.parse(p.observedAt);
    if (
      ![target, recorded, observed].every(Number.isFinite) ||
      p.thresholdMetres !== 550 ||
      target !== observed + 2 * 3600000 ||
      recorded < observed ||
      recorded - observed > 45 * 60000 ||
      target > now - 20 * 60000 ||
      !probability(p.modelProbability) ||
      ![0, 1].includes(p.persistenceProbability) ||
      (p.tafProbability !== null &&
        (!probability(p.tafProbability) ||
          !p.tafIssueAt ||
          !Number.isFinite(Date.parse(p.tafIssueAt)) ||
          Date.parse(p.tafIssueAt) > recorded))
    )
      continue;
    const verifying = verify(target);
    if (!verifying) continue;
    const outcome = verifying.conditions.visibility! < 550 ? 1 : 0;
    result.matched++;
    const lead = (target - recorded) / 60000;
    result.leadMinutes.min = Math.min(result.leadMinutes.min ?? lead, lead);
    result.leadMinutes.max = Math.max(result.leadMinutes.max ?? lead, lead);
    add(result.all.model, p.modelProbability, outcome);
    add(result.all.persistence, p.persistenceProbability, outcome);
    if (p.tafProbability === null) {
      result.missingNumericTaf++;
      continue;
    }
    add(result.paired.model, p.modelProbability, outcome);
    add(result.paired.taf, p.tafProbability, outcome);
    add(result.paired.persistence, p.persistenceProbability, outcome);
    if (p.persistenceProbability === 0) {
      add(result.currentlyClear.model, p.modelProbability, outcome);
      add(result.currentlyClear.taf, p.tafProbability, outcome);
      add(result.currentlyClear.persistence, p.persistenceProbability, outcome);
    }
  }
  return result;
}
