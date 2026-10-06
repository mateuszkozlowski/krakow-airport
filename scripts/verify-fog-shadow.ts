import { createHash } from "node:crypto";
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { fogModel, fogProbability } from "../src/lib/weather/fog-shadow";
import artifact from "../src/lib/weather/artifacts/fog-2h-v1.json";

async function main() {
  const expected = new Map<string, number>();
  for (const line of readFileSync("data/iteration-predictions-2h.jsonl", "utf8").trim().split("\n")) {
    const row = JSON.parse(line);
    expected.set(row.at, row.predictions.selected_sigmoid);
  }
  if (createHash("sha256").update(readFileSync("src/lib/weather/research-features.ts")).digest("hex") !== artifact.featuresSha256)
    throw new Error("Feature lineage changed");
  let matched = 0;
  let maximumDifference = 0;
  const lines = createInterface({ input: createReadStream("data/iterations2h.jsonl"), crlfDelay: Infinity });
  for await (const line of lines) {
    const row = JSON.parse(line);
    const python = expected.get(row.at);
    if (python === undefined) continue;
    const predicted = fogProbability(row.features);
    if (predicted === null) throw new Error("Frozen feature schema rejected");
    const difference = Math.abs(predicted - python);
    if (difference > 1e-12) throw new Error("Python/TypeScript prediction mismatch");
    maximumDifference = Math.max(maximumDifference, difference);
    matched++;
    expected.delete(row.at);
  }
  if (expected.size || matched === 0) throw new Error("Missing reference predictions");
  const result = { model: fogModel.id, matched, maximumDifference, tolerance: 1e-12,
    featureSha256: artifact.featuresSha256, sourceReportSha256: artifact.reportSha256 };
  writeFileSync("docs/fog-shadow-parity.json", JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
}
void main();
