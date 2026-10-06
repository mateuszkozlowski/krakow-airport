import type { Observation, Period } from "./model";
import { verificationIndex } from "./verification";
export function visibilityProbability(
  period: Period,
  threshold = 1000,
): number | null {
  if (
    period.conditions.visibility === null ||
    period.scenarios.some((s) => s.conditions.visibility === null)
  )
    return null;
  const base = period.conditions.visibility < threshold;
  const changes = period.scenarios.filter(
    (s) => s.conditions.visibility! < threshold !== base,
  );
  if (!changes.length) return base ? 1 : 0;
  // Joint dependence between several PROB scenarios is unknown.
  if (changes.length !== 1 || changes[0].probability === null) return null;
  const p = changes[0].probability / 100;
  return base ? 1 - p : p;
}
export interface Prediction {
  id: string;
  recordedAt: string;
  target: string;
  source: string;
  arrival: number | null;
  departure: number | null;
  visibilityProbability: number | null;
  tafIssueAt?: string | null;
  tafRaw?: string | null;
}
export interface Quality {
  matched: number;
  scored: number;
  brier: number | null;
  hits: number;
  misses: number;
  falseAlarms: number;
  correctNegatives: number;
  byLevel: { level: number; count: number; lowVisibility: number }[];
}
export function evaluate(
  predictions: Prediction[],
  observations: Observation[],
  now = Date.now(),
): Quality {
  const q: Quality = {
    matched: 0,
    scored: 0,
    brier: null,
    hits: 0,
    misses: 0,
    falseAlarms: 0,
    correctNegatives: 0,
    byLevel: [],
  };
  let squared = 0;
  const verify = verificationIndex(observations, now);
  for (const p of predictions) {
    const target = Date.parse(p.target);
    const recorded = Date.parse(p.recordedAt);
    if (
      !Number.isFinite(target) ||
      !Number.isFinite(recorded) ||
      target > now - 20 * 60000 ||
      target - recorded < 90 * 60000
    )
      continue;
    const observed = verify(target);
    if (!observed) continue;
    const outcome = observed.conditions.visibility! < 1000 ? 1 : 0;
    q.matched++;
    if (p.arrival !== null) {
      let row = q.byLevel.find((r) => r.level === p.arrival);
      if (!row) {
        row = { level: p.arrival, count: 0, lowVisibility: 0 };
        q.byLevel.push(row);
      }
      row.count++;
      row.lowVisibility += outcome;
    }
    if (
      p.visibilityProbability === null ||
      !Number.isFinite(p.visibilityProbability) ||
      p.visibilityProbability < 0 ||
      p.visibilityProbability > 1
    )
      continue;
    const predicted = p.visibilityProbability >= 0.5;
    squared += (p.visibilityProbability - outcome) ** 2;
    q.scored++;
    if (outcome) {
      if (predicted) q.hits++;
      else q.misses++;
    } else {
      if (predicted) q.falseAlarms++;
      else q.correctNegatives++;
    }
  }
  q.brier = q.scored ? squared / q.scored : null;
  q.byLevel.sort((a, b) => a.level - b.level);
  return q;
}
