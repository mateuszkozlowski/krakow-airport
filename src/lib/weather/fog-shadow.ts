import "server-only";
import artifact from "./artifacts/fog-2h-v1.json";
import type { Observation, Snapshot } from "./model";
import { researchFeatures } from "./research-features";
import { visibilityProbability } from "./quality";

export const fogModel = {
  id: artifact.id,
  leadHours: artifact.leadHours,
  thresholdMetres: artifact.thresholdMetres,
  use: artifact.use,
} as const;
const hour = 3600000;
const sigmoid = (value: number) =>
  1 / (1 + Math.exp(-Math.max(-700, Math.min(700, value))));

/** The frozen classifier and calibrator, including Python's logit clipping. */
export function fogProbability(features: Record<string, number>): number | null {
  const c = artifact.classifier;
  if (
    Object.keys(features).length !== c.features.length ||
    c.features.length !== c.mean.length ||
    c.features.length !== c.scale.length ||
    c.features.length !== c.coefficients.length
  )
    return null;
  let score = c.intercept;
  for (let i = 0; i < c.features.length; i++) {
    const value = features[c.features[i]];
    if (!Number.isFinite(value) || !Number.isFinite(c.scale[i]) || c.scale[i] <= 0)
      return null;
    score += ((value - c.mean[i]) / c.scale[i]) * c.coefficients[i];
  }
  if (!Number.isFinite(score)) return null;
  const raw = Math.max(1e-6, Math.min(1 - 1e-6, sigmoid(score)));
  const calibrated =
    artifact.sigmoid.coefficient * Math.log(raw / (1 - raw)) +
    artifact.sigmoid.intercept;
  return Number.isFinite(calibrated) ? sigmoid(calibrated) : null;
}

export interface ShadowPrediction {
  id: string;
  modelId: string;
  recordedAt: string;
  observedAt: string;
  target: string;
  thresholdMetres: number;
  modelProbability: number;
  persistenceProbability: 0 | 1;
  tafProbability: number | null;
  tafIssueAt: string | null;
  tafRaw: string | null;
  features: Record<string, number>;
}

/** Creates one prospective candidate; never changes a public weather risk. */
export function shadowPrediction(
  snapshot: Snapshot,
  recordedAt = snapshot.generatedAt,
): ShadowPrediction | null {
  const o = snapshot.observed;
  const recorded = Date.parse(recordedAt);
  const observed = o ? Date.parse(o.at) : NaN;
  if (
    snapshot.sources.metar.state !== "fresh" ||
    !o ||
    !Number.isFinite(recorded) ||
    !Number.isFinite(observed) ||
    !Number.isFinite(Date.parse(snapshot.generatedAt)) ||
    Date.parse(snapshot.generatedAt) > recorded ||
    observed > recorded ||
    recorded - observed > 45 * 60000
  )
    return null;
  const c = o.conditions;
  if (
    c.visibility === null ||
    !Number.isFinite(c.visibility) ||
    c.visibility < 0 ||
    c.temperature === null ||
    c.dewpoint === null ||
    !c.wind
  )
    return null;
  // Same chronological, unique, at-most-100 prior reports as offline preparation.
  const unique = new Map<string, Observation>();
  for (const past of snapshot.history) {
    if (Date.parse(past.at) < observed && !unique.has(past.at))
      unique.set(past.at, past);
  }
  const history = [...unique.values()]
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .slice(-100);
  const features = researchFeatures(o, history, fogModel.leadHours, true);
  // The fallback provider may give only one report. The expanded model was
  // checked with historical context; do not extrapolate from an empty 24h window.
  if (
    !features ||
    features.windowIncomplete6h !== 0 ||
    features.windowIncomplete24h !== 0 ||
    features.windowCoverage6h < 0.8 ||
    features.windowCoverage24h < 0.8
  )
    return null;
  const probability = features ? fogProbability(features) : null;
  if (probability === null || !features) return null;
  const target = new Date(observed + fogModel.leadHours * hour).toISOString();
  const tafKnown =
    snapshot.sources.taf.state === "fresh" &&
    snapshot.taf &&
    Date.parse(snapshot.taf.issued) <= recorded &&
    Date.parse(snapshot.taf.end) > Date.parse(target);
  const period = tafKnown
    ? snapshot.forecast.find(
        (p) =>
          p.source === "TAF" &&
          Date.parse(p.start) <= Date.parse(target) &&
          Date.parse(p.end) > Date.parse(target),
      )
    : null;
  return {
    id: `${fogModel.id}:${Math.floor(recorded / hour)}`,
    modelId: fogModel.id,
    recordedAt,
    observedAt: o.at,
    target,
    thresholdMetres: fogModel.thresholdMetres,
    modelProbability: probability,
    persistenceProbability: c.visibility < fogModel.thresholdMetres ? 1 : 0,
    tafProbability: period
      ? visibilityProbability(period, fogModel.thresholdMetres)
      : null,
    tafIssueAt: tafKnown ? snapshot.taf!.issued : null,
    tafRaw: tafKnown ? snapshot.taf!.raw : null,
    features,
  };
}
