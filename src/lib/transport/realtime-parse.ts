import { localInput, warsawToUtc } from "../weather/time";
import { normalizeName } from "./catalog";
import { serviceAnchor, serviceRuns } from "./engine";
import type { TransitFeed, TripUpdate } from "./model";

export interface PlkStation {
  stationId: number;
  plannedArrival?: string | null;
  plannedDeparture?: string | null;
  arrivalDelayMinutes?: number | null;
  departureDelayMinutes?: number | null;
  isCancelled?: boolean;
}
export interface PlkTrain {
  operatingDate: string;
  trainStatus?: string;
  stations: PlkStation[];
}
function samePlanned(raw: string | null | undefined, expected: number) {
  if (!raw) return false;
  if (/Z$|[+-]\d\d:\d\d$/.test(raw))
    return Math.abs(Date.parse(raw) - expected) <= 60000;
  // PLK describes its unmarked planned times inconsistently across fields.
  // Only accept a representation that agrees with the published GTFS schedule.
  const candidates = [Date.parse(raw + "Z")];
  try {
    candidates.push(Date.parse(warsawToUtc(raw.slice(0, 16))));
  } catch {
    /* An unmarked DST-fold time cannot be guessed. */
  }
  return candidates.some((at) => Math.abs(at - expected) <= 60000);
}
export function matchPlkOperations(
  trains: PlkTrain[],
  stationNames: Record<string, string>,
  feed: TransitFeed,
  now = new Date(),
): TripUpdate[] {
  const stopIds = new Map(
    Object.values(feed.stops).map((stop) => [
      normalizeName(stop.name),
      stop.id,
    ]),
  );
  const updates: TripUpdate[] = [];
  const mapped = trains.map((train) => ({
    train,
    stops: train.stations.flatMap((s) => {
      const stop = stopIds.get(
        normalizeName(stationNames[String(s.stationId)] ?? ""),
      );
      return stop ? [{ ...s, stop }] : [];
    }),
  }));
  for (const { train, stops } of mapped) {
    const date = train.operatingDate.slice(0, 10);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Math.abs(Date.parse(date + "T12:00Z") - now.getTime()) > 3 * 86400000
    )
      continue;
    const anchor = serviceAnchor(date);
    const matches = feed.trips.filter((trip) => {
      if (!serviceRuns(feed.services[trip.service], date)) return false;
      let matching = 0;
      for (const stop of stops) {
        const time = trip.times.find((t) => t[0] === stop.stop);
        if (
          time &&
          (samePlanned(stop.plannedDeparture, anchor + time[2] * 1000) ||
            samePlanned(stop.plannedArrival, anchor + time[1] * 1000))
        )
          matching++;
      }
      return matching >= 2;
    });
    // Ambiguous matches must never put another train's delay on a journey.
    if (matches.length !== 1) continue;
    const trip = matches[0];
    const update: TripUpdate = {
      source: "rail",
      tripId: trip.id,
      serviceDate: date,
      cancelled: ["X", "Q"].includes(train.trainStatus ?? ""),
      stops: {},
    };
    for (const stop of stops) {
      const time = trip.times.find((t) => t[0] === stop.stop);
      if (!time) continue;
      const validDelay = (delay: number | null | undefined) =>
        typeof delay === "number" &&
        Number.isFinite(delay) &&
        Math.abs(delay) < 12 * 60;
      update.stops[stop.stop] = {
        skipped: stop.isCancelled,
        ...(validDelay(stop.departureDelayMinutes) &&
        samePlanned(stop.plannedDeparture, anchor + time[2] * 1000)
          ? { departureDelay: stop.departureDelayMinutes! * 60 }
          : {}),
        ...(validDelay(stop.arrivalDelayMinutes) &&
        samePlanned(stop.plannedArrival, anchor + time[1] * 1000)
          ? { arrivalDelay: stop.arrivalDelayMinutes! * 60 }
          : {}),
      };
    }
    updates.push(update);
  }
  return updates;
}
export function realtimeDate(
  date: string | null | undefined,
  now = new Date(),
) {
  if (date && /^\d{8}$/.test(date))
    return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
  return localInput(now.toISOString()).slice(0, 10);
}
