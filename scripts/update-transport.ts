import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { importGtfs } from "../src/lib/transport/gtfs";
import { sources } from "../src/lib/transport/catalog";
import type { SourceId, TransitFeed } from "../src/lib/transport/model";

async function main() {
  const local = process.argv.includes("--local");
  const directory = resolve("src/lib/transport/artifacts");
  await mkdir(directory, { recursive: true });
  const results = await Promise.allSettled(
    (Object.keys(sources) as SourceId[]).map(async (source) => {
      let data: Uint8Array,
        checkedAt: string,
        updatedAt: string | null = null;
      if (local) {
        const path = `/tmp/krk-strategy/${source === "city" ? "bus" : source === "coach" ? "flix-eu" : "rail"}.zip`;
        data = await readFile(path);
        checkedAt = (await stat(path)).mtime.toISOString();
      } else {
        const response = await fetch(sources[source].url, {
          signal: AbortSignal.timeout(45000),
        });
        if (!response.ok) throw new Error(`${source}: HTTP ${response.status}`);
        data = new Uint8Array(await response.arrayBuffer());
        checkedAt = new Date().toISOString();
        updatedAt = response.headers.get("last-modified");
        updatedAt =
          updatedAt && Number.isFinite(Date.parse(updatedAt))
            ? new Date(updatedAt).toISOString()
            : null;
      }
      if (data.byteLength > 50_000_000)
        throw new Error(`${source}: feed exceeds download limit`);
      const feed = importGtfs(data, source, checkedAt, updatedAt);
      const json = JSON.stringify(feed);
      await writeFile(resolve(directory, `${source}.json`), json + "\n");
      console.log(
        JSON.stringify({
          source,
          checkedAt,
          validFrom: feed.validFrom,
          validUntil: feed.validUntil,
          ...feed.quality,
          jsonBytes: Buffer.byteLength(json),
          compressedBytes: gzipSync(json).byteLength,
        }),
      );
    }),
  );
  let missing = false;
  for (let i = 0; i < results.length; i++)
    if (results[i].status === "rejected") {
      const source = (Object.keys(sources) as SourceId[])[i];
      try {
        const old = JSON.parse(
          await readFile(resolve(directory, `${source}.json`), "utf8"),
        ) as TransitFeed;
        if (old.source !== source || old.version !== 1) throw new Error();
        console.warn(
          `${source}: refresh failed; retaining the snapshot from ${old.checkedAt}`,
        );
      } catch {
        console.error(`${source}: no usable transport snapshot`);
        missing = true;
      }
    }
  if (missing) process.exitCode = 1;
}
void main().catch(() => {
  console.error("Transport snapshot update failed");
  process.exitCode = 1;
});
