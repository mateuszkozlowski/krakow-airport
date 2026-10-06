import "server-only";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { cached, hasStorage, storage } from "../cache";
import { normalizeName } from "./catalog";
import {
  matchPlkOperations,
  realtimeDate,
  type PlkTrain,
} from "./realtime-parse";
import type {
  TransitFeed,
  RealtimeData,
  RealtimeStatus,
  TripUpdate,
} from "./model";

const recent = (at: string | null, now: number, seconds = 180) =>
  !!at &&
  Number.isFinite(Date.parse(at)) &&
  now - Date.parse(at) < seconds * 1000 &&
  Date.parse(at) <= now + 60000;
export function decodeCityRealtime(
  bytes: Uint8Array,
  feed: TransitFeed,
  now = new Date(),
): { at: string; updates: TripUpdate[] } {
  const message =
    GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(bytes);
  const header = Number(message.header.timestamp?.toString() ?? 0) * 1000;
  if (!Number.isFinite(header) || header < 1)
    throw new Error("GTFS realtime lacks timestamp");
  const at = new Date(header).toISOString();
  if (!recent(at, now.getTime())) throw new Error("GTFS realtime is stale");
  const trips = new Map(feed.trips.map((t) => [t.id, t]));
  const updates: TripUpdate[] = [];
  for (const entity of message.entity) {
    const update = entity.tripUpdate;
    const id = update?.trip.tripId;
    if (!update || !id || !trips.has(id)) continue;
    const ownTimestamp = Number(update.timestamp?.toString() ?? 0) * 1000;
    const timestamp = ownTimestamp > 0 ? ownTimestamp : header;
    if (
      now.getTime() - timestamp > 5 * 60000 ||
      timestamp > now.getTime() + 60000
    )
      continue;
    // Without an explicit service date, an overnight trip cannot be joined safely.
    if (!update.trip.startDate || !/^\d{8}$/.test(update.trip.startDate))
      continue;
    const record: TripUpdate = {
      source: "city",
      tripId: id,
      serviceDate: realtimeDate(update.trip.startDate, now),
      cancelled: [3, 7].includes(update.trip.scheduleRelationship ?? 0),
      stops: {},
    };
    let propagatedDelay: number | undefined;
    const actual = [...(update.stopTimeUpdate ?? [])].sort(
      (a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0),
    );
    for (const stop of actual) {
      if (!stop.stopId) continue;
      const event = (
        value:
          | GtfsRealtimeBindings.transit_realtime.TripUpdate.IStopTimeEvent
          | null
          | undefined,
      ) => {
        // protobuf.js exposes inherited defaults (time=0, delay=0), so only
        // fields actually present in the message count as observations.
        const time =
          value && Object.prototype.hasOwnProperty.call(value, "time")
            ? Number(value.time?.toString()) * 1000
            : undefined;
        const delay =
          value && Object.prototype.hasOwnProperty.call(value, "delay")
            ? value.delay
            : undefined;
        return {
          time:
            time !== undefined &&
            Number.isFinite(time) &&
            time > 0 &&
            Math.abs(time - header) < 7 * 86400000
              ? time
              : undefined,
          delay:
            delay !== undefined &&
            delay !== null &&
            Number.isFinite(delay) &&
            Math.abs(delay) < 12 * 3600
              ? delay
              : undefined,
        };
      };
      const arrival = event(stop.arrival),
        departure = event(stop.departure);
      if (stop.scheduleRelationship === 2) propagatedDelay = undefined;
      const delay = departure.delay ?? arrival.delay;
      if (delay !== undefined) propagatedDelay = delay;
      record.stops[stop.stopId] = {
        skipped: stop.scheduleRelationship === 1,
        ...(arrival.time !== undefined
          ? { arrival: arrival.time }
          : arrival.delay !== undefined
            ? { arrivalDelay: arrival.delay }
            : {}),
        ...(departure.time !== undefined
          ? { departure: departure.time }
          : propagatedDelay !== undefined
            ? { departureDelay: propagatedDelay }
            : {}),
      };
    }
    updates.push(record);
  }
  return { at, updates };
}
async function cityRealtime(
  feed: TransitFeed,
): Promise<{ updates: TripUpdate[]; status: RealtimeStatus }> {
  try {
    const entry = await cached(
      "transport:city-live:v1",
      async () => {
        try {
          const response = await fetch(
            "https://gtfs.ztp.krakow.pl/TripUpdates_A.pb",
            { cache: "no-store", signal: AbortSignal.timeout(7000) },
          );
          if (
            !response.ok ||
            Number(response.headers.get("content-length") ?? 0) > 6_000_000
          )
            throw new Error("City realtime unavailable");
          const bytes = new Uint8Array(await response.arrayBuffer());
          if (bytes.byteLength > 6_000_000)
            throw new Error("City realtime exceeds limit");
          return {
            ...decodeCityRealtime(bytes, feed),
            state: "fresh" as const,
          };
        } catch {
          return {
            at: null,
            updates: [] as TripUpdate[],
            state: "unavailable" as const,
          };
        }
      },
      600,
      90,
    );
    const fresh = recent(entry.data.at, Date.now());
    return {
      updates: fresh ? entry.data.updates : [],
      status: {
        source: "city",
        state:
          entry.data.state === "unavailable"
            ? "unavailable"
            : fresh
              ? "fresh"
              : "stale",
        updatedAt: entry.data.at,
      },
    };
  } catch {
    return {
      updates: [],
      status: { source: "city", state: "unavailable", updatedAt: null },
    };
  }
}
class InactiveKey extends Error {}
async function plkJson(path: string) {
  const response = await fetch(`https://pdp-api.plk-sa.pl${path}`, {
    headers: { "X-API-Key": process.env.PLK_API_KEY! },
    cache: "no-store",
    signal: AbortSignal.timeout(7000),
  });
  if ([401, 403].includes(response.status)) throw new InactiveKey();
  if (!response.ok) throw new Error("PLK unavailable");
  if (Number(response.headers.get("content-length") ?? 0) > 8_000_000)
    throw new Error("PLK response exceeds limit");
  return response.json();
}
async function plkRealtime(
  feed: TransitFeed,
): Promise<{ updates: TripUpdate[]; status: RealtimeStatus }> {
  if (!process.env.PLK_API_KEY)
    return {
      updates: [],
      status: { source: "plk", state: "inactive", updatedAt: null },
    };
  try {
    // A failed activation is cached too, to avoid repeated requests from visitors.
    const entry = await cached(
      "transport:plk-live:v1",
      async () => {
        try {
          if (hasStorage()) {
            const lock = await storage<string | null>(
              "SET",
              "krk:transport:plk-live:lock",
              "refresh",
              "NX",
              "EX",
              180,
            );
            if (!lock) throw new Error("Another instance is refreshing PLK");
          }
          const dictionary = await cached(
            "transport:plk-stations:v1",
            async () => {
              const data = await plkJson(
                "/api/v1/dictionaries/stations?pageSize=10000",
              );
              if (!Array.isArray(data.stations) || data.totalPages > 1)
                throw new Error("Incomplete PLK station dictionary");
              return data.stations as { id: number; name: string }[];
            },
            30 * 86400,
            7 * 86400,
          );
          const relevant = new Set(
            Object.values(feed.stops)
              .filter((s) => ["airport", "krakow-glowny"].includes(s.place))
              .map((s) => normalizeName(s.name)),
          );
          const ids = dictionary.data
            .filter((s) => relevant.has(normalizeName(s.name)))
            .map((s) => s.id);
          if (ids.length !== 2)
            throw new Error("PLK station match is ambiguous");
          const data = await plkJson(
            `/api/v1/operations?stations=${ids.join(",")}&fullRoutes=true&withPlanned=true&pageSize=1000`,
          );
          if (
            !Array.isArray(data.trains) ||
            !data.stations ||
            data.pagination?.totalPages > 1 ||
            !recent(data.generatedAt, Date.now(), 300)
          )
            throw new Error("PLK data incomplete or stale");
          return {
            state: "fresh" as const,
            at: data.generatedAt as string,
            updates: matchPlkOperations(
              data.trains as PlkTrain[],
              data.stations as Record<string, string>,
              feed,
            ),
          };
        } catch (error) {
          if (error instanceof InactiveKey)
            return {
              state: "inactive" as const,
              at: null,
              updates: [] as TripUpdate[],
            };
          throw error;
        }
      },
      600,
      180,
    );
    const valid =
      entry.data.state === "fresh" && recent(entry.data.at, Date.now(), 300);
    return {
      updates: valid ? entry.data.updates : [],
      status: {
        source: "plk",
        state:
          entry.data.state === "inactive"
            ? "inactive"
            : valid
              ? "fresh"
              : "stale",
        updatedAt: entry.data.at,
      },
    };
  } catch {
    return {
      updates: [],
      status: { source: "plk", state: "unavailable", updatedAt: null },
    };
  }
}
export async function getRealtime(feeds: TransitFeed[]): Promise<RealtimeData> {
  const rail = feeds.find((f) => f.source === "rail"),
    city = feeds.find((f) => f.source === "city");
  const results = await Promise.allSettled([
    rail ? plkRealtime(rail) : Promise.resolve(null),
    city ? cityRealtime(city) : Promise.resolve(null),
  ]);
  const updates: TripUpdate[] = [],
    statuses: RealtimeStatus[] = [];
  for (const result of results)
    if (result.status === "fulfilled" && result.value) {
      updates.push(...result.value.updates);
      statuses.push(result.value.status);
    }
  return { updates, statuses };
}
