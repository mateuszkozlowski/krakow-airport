import { localInput, warsawToUtc } from "../weather/time";
import { resolveFlight } from "./query";
import { unknownWeather } from "./weather";
import type {
  TransitFeed,
  TransitTrip,
  ServiceDays,
  TripQuery,
  Leg,
  Journey,
  RealtimeData,
  PlannerResult,
  TripUpdate,
  ConnectionWeather,
} from "./model";

const minute = 60000,
  day = 86400000;
export function serviceRuns(service: ServiceDays, date: string) {
  if (service.removed.includes(date)) return false;
  if (service.added.includes(date)) return true;
  return (
    date >= service.start &&
    date <= service.end &&
    service.weekdays.includes(new Date(date + "T12:00Z").getUTCDay())
  );
}
// GTFS defines its service-day clock as local noon minus twelve elapsed hours.
// Using wall-clock midnight would shift services on a daylight-saving change.
export function serviceAnchor(date: string) {
  return Date.parse(warsawToUtc(date + "T12:00")) - 12 * 3600000;
}
function civilDate(epoch: number) {
  return localInput(new Date(epoch).toISOString()).slice(0, 10);
}
function datesFor(feed: TransitFeed, start: number, end: number) {
  const first =
    Date.parse(civilDate(start) + "T12:00Z") -
    Math.ceil(feed.maxSeconds / 86400) * day;
  const last = Date.parse(civilDate(end) + "T12:00Z");
  const dates: string[] = [];
  for (let at = first; at <= last; at += day) {
    const date = new Date(at).toISOString().slice(0, 10);
    if (date >= feed.validFrom && date <= feed.validUntil) dates.push(date);
  }
  return dates;
}
function legFrom(
  feed: TransitFeed,
  trip: TransitTrip,
  date: string,
  fromIndex: number,
  toIndex: number,
  update?: TripUpdate,
  anchor = serviceAnchor(date),
): Leg | null {
  if (update?.cancelled) return null;
  const from = trip.times[fromIndex],
    to = trip.times[toIndex];
  if (!from[4] || !to[5]) return null;
  const liveFrom = update?.stops[from[0]],
    liveTo = update?.stops[to[0]];
  if (liveFrom?.skipped || liveTo?.skipped) return null;
  const plannedDeparture = anchor + from[2] * 1000,
    plannedArrival = anchor + to[1] * 1000;
  const departure =
    liveFrom?.departure ??
    (liveFrom?.departureDelay !== undefined
      ? plannedDeparture + liveFrom.departureDelay * 1000
      : plannedDeparture);
  const arrivalEstimated =
    departure > plannedDeparture &&
    liveTo?.arrival === undefined &&
    liveTo?.arrivalDelay === undefined;
  const arrival =
    liveTo?.arrival ??
    (liveTo?.arrivalDelay !== undefined
      ? plannedArrival + liveTo.arrivalDelay * 1000
      : plannedArrival + (arrivalEstimated ? departure - plannedDeparture : 0));
  if (arrival < departure) return null;
  const observed =
    liveFrom?.departure !== undefined || liveFrom?.departureDelay !== undefined;
  return {
    source: feed.source,
    mode: trip.mode,
    tripId: trip.id,
    serviceDate: date,
    route: trip.route,
    number: trip.number,
    headsign: trip.headsign,
    from: feed.stops[from[0]],
    to: feed.stops[to[0]],
    departure: new Date(departure).toISOString(),
    arrival: new Date(arrival).toISOString(),
    plannedDeparture: new Date(plannedDeparture).toISOString(),
    plannedArrival: new Date(plannedArrival).toISOString(),
    platform: from[6],
    live: observed,
    departureDelay: observed
      ? Math.round((departure - plannedDeparture) / minute)
      : null,
    arrivalDelay:
      liveTo?.arrival !== undefined || liveTo?.arrivalDelay !== undefined
        ? Math.round((arrival - plannedArrival) / minute)
        : null,
    arrivalEstimated,
  };
}
function occurrences(
  feeds: TransitFeed[],
  start: number,
  end: number,
  fromPlaces: Set<string>,
  toPlaces: Set<string>,
  realtime: RealtimeData,
): Leg[] {
  const out: Leg[] = [];
  const updates = new Map(
    realtime.updates.map((u) => [
      `${u.source}:${u.tripId}:${u.serviceDate}`,
      u,
    ]),
  );
  for (const feed of feeds) {
    const dates = datesFor(feed, start, end);
    const anchors = new Map(dates.map((date) => [date, serviceAnchor(date)]));
    for (const trip of feed.trips) {
      const pairs: [number, number][] = [];
      for (let i = 0; i < trip.times.length - 1; i++) {
        if (
          !fromPlaces.has(feed.stops[trip.times[i][0]].place) ||
          !trip.times[i][4]
        )
          continue;
        for (let j = i + 1; j < trip.times.length; j++)
          if (
            toPlaces.has(feed.stops[trip.times[j][0]].place) &&
            trip.times[j][5]
          )
            pairs.push([i, j]);
      }
      if (!pairs.length) continue;
      for (const date of dates) {
        if (!serviceRuns(feed.services[trip.service], date)) continue;
        const update = updates.get(`${feed.source}:${trip.id}:${date}`);
        for (const [i, j] of pairs) {
          const planned = anchors.get(date)! + trip.times[i][2] * 1000;
          if (planned < start - 6 * 3600000 || planned > end + 3600000)
            continue;
          const leg = legFrom(
            feed,
            trip,
            date,
            i,
            j,
            update,
            anchors.get(date)!,
          );
          if (
            leg &&
            Date.parse(leg.departure) >= start &&
            Date.parse(leg.arrival) <= end
          )
            out.push(leg);
        }
      }
    }
  }
  return out;
}
function journey(legs: Leg[], query: TripQuery, ready: number): Journey {
  const departure = legs[0].departure,
    arrival = legs[legs.length - 1].arrival;
  const start = Date.parse(departure),
    end = Date.parse(arrival);
  const transferMinutes =
    legs.length > 1
      ? Math.floor(
          (Date.parse(legs[1].departure) - Date.parse(legs[0].arrival)) /
            minute,
        )
      : null;
  return {
    id: legs
      .map(
        (l) =>
          `${l.source}:${l.tripId}:${l.serviceDate}:${l.from.id}:${l.to.id}`,
      )
      .join("~"),
    legs,
    departure,
    arrival,
    durationMinutes: Math.round((end - start) / minute),
    waitMinutes:
      query.direction === "from-airport"
        ? Math.max(0, Math.round((start - ready) / minute))
        : 0,
    spareMinutes:
      query.direction === "to-airport"
        ? Math.floor((ready - end) / minute)
        : null,
    transferMinutes,
    overnight:
      civilDate(start) !== query.date || civilDate(end) !== civilDate(start),
  };
}
function distinct(journeys: Journey[]) {
  const seen = new Set<string>();
  return journeys.filter((j) => {
    const key = j.legs
      .map((l) =>
        [
          l.source,
          l.route,
          l.number,
          l.from.place,
          l.to.place,
          l.departure,
          l.arrival,
        ].join(":"),
      )
      .join("~");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
export function planJourney(
  feeds: TransitFeed[],
  query: TripQuery,
  realtime: RealtimeData = { updates: [], statuses: [] },
  now = new Date(),
  weather: ConnectionWeather = unknownWeather(),
): PlannerResult {
  const { at, issue } = resolveFlight(query, now);
  const result: PlannerResult = {
    version: 1,
    query,
    generatedAt: now.toISOString(),
    flightAt: at,
    readyAt: null,
    issue,
    journeys: [],
    feeds: (["rail", "city", "coach"] as const).map((source) => {
      const feed = feeds.find((f) => f.source === source);
      const spillEnd = feed
        ? new Date(
            Date.parse(feed.validUntil + "T12:00Z") +
              Math.floor(feed.maxSeconds / 86400) * day,
          )
            .toISOString()
            .slice(0, 10)
        : "";
      return {
        source,
        state: !feed
          ? "unavailable"
          : query.date < feed.validFrom || query.date > spillEnd
            ? "outside-range"
            : now.getTime() - Date.parse(feed.checkedAt) > day
              ? "cached"
              : "fresh",
        checkedAt: feed?.checkedAt ?? null,
        validUntil: feed?.validUntil ?? null,
      };
    }),
    realtime: realtime.statuses,
    cancelled: 0,
    weather,
  };
  if (issue || !at) return result;
  const flight = Date.parse(at);
  const nominalReady =
    query.direction === "from-airport"
      ? Math.max(now.getTime(), flight + (query.buffer + query.delay) * minute)
      : flight - query.buffer * minute;
  const ready =
    query.direction === "from-airport"
      ? Math.max(
          now.getTime(),
          flight + (query.buffer + query.delay + weather.extraMinutes) * minute,
        )
      : nominalReady;
  result.readyAt = new Date(ready).toISOString();
  if (query.direction === "to-airport" && ready <= now.getTime()) {
    result.issue = "past";
    return result;
  }
  // Stop offering schedules whose last successful check is more than seven days old.
  const usable = feeds.filter(
    (f) => now.getTime() - Date.parse(f.checkedAt) <= 7 * day,
  );
  result.feeds = result.feeds.map((s) =>
    s.state !== "unavailable" &&
    s.checkedAt &&
    now.getTime() - Date.parse(s.checkedAt) > 7 * day
      ? { ...s, state: "unavailable" }
      : s,
  );
  const start =
    query.direction === "from-airport"
      ? ready
      : Math.max(now.getTime(), ready - 36 * 3600000);
  const end = query.direction === "from-airport" ? ready + 36 * 3600000 : ready;
  const origin = query.direction === "from-airport" ? "airport" : query.place;
  const target = query.direction === "from-airport" ? query.place : "airport";
  const hub = "krakow-glowny";
  const legs = occurrences(
    usable,
    start,
    end,
    new Set([origin, hub]),
    new Set([target, hub]),
    realtime,
  );
  const candidates = legs
    .filter((l) => l.from.place === origin && l.to.place === target)
    .map((l) => journey([l], query, nominalReady));
  if (origin !== hub && target !== hub) {
    const firsts = legs.filter(
      (l) => l.from.place === origin && l.to.place === hub,
    );
    const seconds = legs
      .filter((l) => l.from.place === hub && l.to.place === target)
      .sort((a, b) => Date.parse(a.departure) - Date.parse(b.departure));
    for (const first of firsts)
      for (const second of seconds) {
        const wait =
          (Date.parse(second.departure) - Date.parse(first.arrival)) / minute;
        if (wait < Math.max(query.transfer, weather.minTransfer) || wait > 180)
          continue;
        if (
          first.source === second.source &&
          first.tripId === second.tripId &&
          first.serviceDate === second.serviceDate
        )
          continue;
        // A destination without a live arrival estimate cannot inherit a bus's
        // boarding-time delay: doing so would promise an unverified connection.
        if (
          first.departureDelay !== null &&
          first.departureDelay > 0 &&
          first.arrivalDelay === null
        )
          continue;
        candidates.push(journey([first, second], query, nominalReady));
      }
  }
  const sortedCandidates = distinct(candidates).sort((a, b) =>
    query.direction === "from-airport"
      ? Date.parse(a.arrival) - Date.parse(b.arrival) ||
        a.durationMinutes - b.durationMinutes ||
        a.legs.length - b.legs.length
      : Date.parse(b.departure) - Date.parse(a.departure) ||
        a.durationMinutes - b.durationMinutes ||
        a.legs.length - b.legs.length,
  );
  // Several feeder trains can reach the same onward bus. Keep the shortest
  // connection for each transport combination rather than eight variants of it.
  const onward = new Set<string>();
  const sorted = sortedCandidates.filter((j) => {
    if (j.legs.length === 1) return true;
    const last = j.legs[1];
    const key = [
      last.source,
      last.tripId,
      last.serviceDate,
      j.legs[0].mode,
      last.to.id,
    ].join(":");
    if (onward.has(key)) return false;
    onward.add(key);
    return true;
  });
  // Show a useful mix, then retain the next services as backups.
  const selected: Journey[] = [],
    picked = new Set<string>();
  if (sorted[0]) {
    selected.push(sorted[0]);
    picked.add(sorted[0].id);
  }
  const modes = new Set(
    selected.map((j) => j.legs.map((l) => l.mode).join("/")),
  );
  for (const j of sorted) {
    const mode = j.legs.map((l) => l.mode).join("/");
    if (
      !modes.has(mode) &&
      selected.length < 3 &&
      sorted[0] &&
      Math.abs(Date.parse(j.departure) - Date.parse(sorted[0].departure)) <=
        2 * 3600000
    ) {
      selected.push(j);
      picked.add(j.id);
      modes.add(mode);
    }
  }
  for (const j of sorted)
    if (!picked.has(j.id) && selected.length < 8) {
      selected.push(j);
      picked.add(j.id);
    }
  result.journeys = selected;
  result.cancelled = realtime.updates.filter(
    (u) =>
      u.cancelled &&
      usable.some(
        (f) => f.source === u.source && f.trips.some((t) => t.id === u.tripId),
      ),
  ).length;
  return result;
}
