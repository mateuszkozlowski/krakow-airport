import "server-only";
import { gzipSync, gunzipSync } from "node:zlib";
import { hasStorage, storage } from "../cache";
import { sources } from "./catalog";
import { importGtfs } from "./gtfs";
import type { SourceId, TransitFeed } from "./model";
import rail from "./artifacts/rail.json";
import city from "./artifacts/city.json";
import coach from "./artifacts/coach.json";

const sourceIds: SourceId[] = ["rail", "city", "coach"];
const feeds = new Map<SourceId, TransitFeed>([
  ["rail", rail as unknown as TransitFeed],
  ["city", city as unknown as TransitFeed],
  ["coach", coach as unknown as TransitFeed],
]);
const readAt = new Map<SourceId, number>();
const lastAttempt = new Map<SourceId, number>();
const pending = new Map<SourceId, Promise<boolean>>();
const key = (source: SourceId) => `krk:transport:v1:feed:${source}`;

export function packFeed(feed: TransitFeed) {
  return gzipSync(JSON.stringify(feed)).toString("base64");
}
export function unpackFeed(packed: string): TransitFeed {
  if (packed.length > 900_000)
    throw new Error("Transport cache exceeds size limit");
  const data = JSON.parse(
    gunzipSync(Buffer.from(packed, "base64"), {
      maxOutputLength: 8_000_000,
    }).toString("utf8"),
  ) as TransitFeed;
  if (
    data.version !== 1 ||
    !sourceIds.includes(data.source) ||
    !Number.isFinite(Date.parse(data.checkedAt)) ||
    !Array.isArray(data.trips) ||
    !data.stops ||
    !data.services
  )
    throw new Error("Invalid transport cache");
  return data;
}
export async function readFeeds(): Promise<TransitFeed[]> {
  if (hasStorage())
    await Promise.all(
      sourceIds.map(async (source) => {
        if (Date.now() - (readAt.get(source) ?? 0) < 60000) return;
        readAt.set(source, Date.now());
        try {
          const saved = await storage<string | null>("GET", key(source));
          if (saved) {
            const data = unpackFeed(saved);
            if (
              data.source === source &&
              Date.parse(data.checkedAt) >
                Date.parse(feeds.get(source)!.checkedAt)
            )
              feeds.set(source, data);
          }
        } catch {
          /* The bundled, dated snapshot keeps the planner available. */
        }
      }),
    );
  return sourceIds.map((source) => feeds.get(source)!);
}
async function refresh(source: SourceId, force: boolean): Promise<boolean> {
  const old = feeds.get(source)!;
  if (!force && Date.now() - Date.parse(old.checkedAt) < 6 * 3600000)
    return true;
  if (!force && Date.now() - (lastAttempt.get(source) ?? 0) < 10 * 60000)
    return false;
  if (pending.has(source)) return pending.get(source)!;
  const task = (async () => {
    lastAttempt.set(source, Date.now());
    if (hasStorage()) {
      try {
        const lock = await storage<string | null>(
          "SET",
          key(source) + ":lock",
          "refresh",
          "NX",
          "EX",
          120,
        );
        if (!lock) return false;
      } catch {
        /* A cache failure must not prevent a public feed refresh. */
      }
    }
    try {
      const response = await fetch(sources[source].url, {
        cache: "no-store",
        signal: AbortSignal.timeout(40000),
        headers: old.sourceUpdatedAt
          ? { "If-Modified-Since": new Date(old.sourceUpdatedAt).toUTCString() }
          : {},
      });
      let data: TransitFeed;
      if (response.status === 304)
        data = { ...old, checkedAt: new Date().toISOString() };
      else {
        if (!response.ok) throw new Error("Feed unavailable");
        if (Number(response.headers.get("content-length") ?? 0) > 50_000_000)
          throw new Error("Feed exceeds download limit");
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength > 50_000_000)
          throw new Error("Feed exceeds download limit");
        const modified = response.headers.get("last-modified");
        data = importGtfs(
          bytes,
          source,
          new Date().toISOString(),
          modified && Number.isFinite(Date.parse(modified))
            ? new Date(modified).toISOString()
            : null,
        );
      }
      const packed = packFeed(data);
      if (packed.length > 900_000)
        throw new Error("Normalized feed exceeds cache limit");
      feeds.set(source, data);
      if (hasStorage()) {
        try {
          await storage("SET", key(source), packed, "EX", 45 * 86400);
        } catch {
          /* Fresh memory data remains usable. */
        }
      }
      return true;
    } catch {
      return false;
    }
  })().finally(() => pending.delete(source));
  pending.set(source, task);
  return task;
}
export async function refreshFeeds(force = false) {
  await readFeeds();
  const result = await Promise.allSettled(
    sourceIds.map((source) => refresh(source, force)),
  );
  return sourceIds.map((source, i) => ({
    source,
    refreshed: result[i].status === "fulfilled" && result[i].value,
    checkedAt: feeds.get(source)!.checkedAt,
  }));
}
