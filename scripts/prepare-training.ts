import { readFileSync, writeFileSync } from "node:fs";
import { observation } from "../src/lib/weather/parse";
import { researchFeatures } from "../src/lib/weather/research-features";
import type { Observation } from "../src/lib/weather/model";
const [input, output, leadArg = "2", featureSet = "base"] =
  process.argv.slice(2);
const lead = Number(leadArg);
if (
  !input ||
  !output ||
  !Number.isFinite(lead) ||
  lead < 1 ||
  lead > 12 ||
  !["base", "extended"].includes(featureSet)
)
  throw new Error(
    "Usage: node --import tsx scripts/prepare-training.ts input.jsonl output.jsonl [lead_hours=2] [base|extended]",
  );
let parseErrors = 0;
const observations: Observation[] = readFileSync(input, "utf8")
  .trim()
  .split("\n")
  .flatMap((line) => {
    try {
      const raw = JSON.parse(line);
      return [observation(raw.raw, raw.at)];
    } catch {
      parseErrors++;
      return [];
    }
  })
  .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
const times = observations.map((o) => Date.parse(o.at));
function nearest(target: number) {
  let lo = 0;
  let hi = times.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (times[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return [lo, lo - 1]
    .filter((i) => i >= 0 && i < times.length)
    .sort(
      (a, b) => Math.abs(times[a] - target) - Math.abs(times[b] - target),
    )[0];
}
let missingOutcomes = 0;
let missingInputs = 0;
const rows = observations.flatMap((o, i) => {
  const c = o.conditions;
  if (
    c.temperature === null ||
    c.dewpoint === null ||
    !c.wind ||
    c.visibility === null
  ) {
    missingInputs++;
    return [];
  }
  const target = times[i] + lead * 3600000;
  const future = nearest(target);
  if (
    future === undefined ||
    Math.abs(times[future] - target) > 15 * 60000 ||
    observations[future].conditions.visibility === null
  ) {
    missingOutcomes++;
    return [];
  }
  const features = researchFeatures(
    o,
    observations.slice(Math.max(0, i - 100), i),
    lead,
    featureSet === "extended",
  );
  if (!features) return [];
  return [
    {
      at: o.at,
      target: new Date(target).toISOString(),
      leadHours: lead,
      outcomeObservedAt: observations[future].at,
      featureSet,
      features,
      lowVisibility: observations[future].conditions.visibility! < 550 ? 1 : 0,
      persistence: c.visibility < 550 ? 1 : 0,
    },
  ];
});
writeFileSync(output, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
console.log(
  JSON.stringify(
    {
      observations: observations.length,
      rows: rows.length,
      parseErrors,
      missingInputs,
      missingOutcomes,
    },
    null,
    2,
  ),
);
