import { localInput, warsawToUtc } from "../weather/time";
import { findPlace } from "./catalog";
import type { TripQuery, QueryIssue } from "./model";

export type QueryValues = Record<string, string | string[] | undefined>;
export function defaultQuery(
  now = new Date(),
  kind: "transport" | "night" | "early" | "zakopane" = "transport",
): TripQuery {
  const local = localInput(new Date(now.getTime() + 3600000).toISOString());
  const today = localInput(now.toISOString()).slice(0, 10);
  const date =
    kind === "early"
      ? new Date(Date.parse(today + "T12:00Z") + 86400000)
          .toISOString()
          .slice(0, 10)
      : kind === "night"
        ? today
        : local.slice(0, 10);
  return {
    direction: kind === "early" ? "to-airport" : "from-airport",
    place: kind === "zakopane" ? "zakopane" : "krakow-glowny",
    date,
    time:
      kind === "early"
        ? "06:00"
        : kind === "night"
          ? "23:45"
          : local.slice(11, 16),
    buffer: kind === "early" ? 120 : 45,
    delay: 0,
    transfer: 20,
    fold: "auto",
    weather: "auto",
  };
}
export function parseQuery(
  values: QueryValues,
  defaults = defaultQuery(),
): TripQuery {
  const direction =
    values.direction === "to-airport"
      ? "to-airport"
      : values.direction === "from-airport"
        ? "from-airport"
        : defaults.direction;
  const bounded = (
    name: string,
    fallback: number,
    min: number,
    max: number,
  ) => {
    const value = values[name];
    return typeof value === "string" &&
      /^\d{1,3}$/.test(value) &&
      +value >= min &&
      +value <= max
      ? +value
      : fallback;
  };
  const place =
    typeof values.place === "string" &&
    values.place !== "airport" &&
    findPlace(values.place)
      ? values.place
      : defaults.place;
  return {
    direction,
    place,
    date:
      typeof values.date === "string"
        ? values.date.slice(0, 16)
        : defaults.date,
    time:
      typeof values.time === "string" ? values.time.slice(0, 8) : defaults.time,
    buffer: bounded(
      "buffer",
      direction === defaults.direction
        ? defaults.buffer
        : direction === "to-airport"
          ? 120
          : 45,
      direction === "to-airport" ? 30 : 5,
      300,
    ),
    delay: direction === "from-airport" ? bounded("delay", 0, 0, 180) : 0,
    transfer: bounded("transfer", defaults.transfer, 10, 60),
    fold:
      values.fold === "first" || values.fold === "second"
        ? values.fold
        : "auto",
    weather: values.weather === "off" ? "off" : "auto",
  };
}
export function resolveFlight(
  query: TripQuery,
  now = new Date(),
): { at: string | null; issue: QueryIssue | null } {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(query.date) ||
    !Number.isFinite(Date.parse(query.date)) ||
    new Date(query.date + "T12:00Z").toISOString().slice(0, 10) !== query.date
  )
    return { at: null, issue: "invalid-date" };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(query.time))
    return { at: null, issue: "invalid-time" };
  const local = query.date + "T" + query.time;
  let at: string;
  try {
    at = warsawToUtc(local);
  } catch {
    const naive = Date.parse(local + "Z");
    const candidates = [2, 1]
      .map((offset) => new Date(naive - offset * 3600000).toISOString())
      .filter((iso) => localInput(iso) === local);
    if (candidates.length !== 2 || query.fold === "auto")
      return { at: null, issue: "dst-time" };
    at = candidates[query.fold === "first" ? 0 : 1];
  }
  if (Date.parse(at) < now.getTime() - 12 * 3600000)
    return { at, issue: "past" };
  return { at, issue: null };
}
export function queryString(query: TripQuery) {
  return new URLSearchParams(
    Object.entries(query).map(([key, value]) => [key, String(value)]),
  ).toString();
}
export function queryForFlight(
  at: string,
  operation: "arrival" | "departure",
): TripQuery {
  const local = localInput(at);
  let fold: TripQuery["fold"] = "auto";
  try {
    warsawToUtc(local);
  } catch {
    const offset = (Date.parse(local + "Z") - Date.parse(at)) / 3600000;
    fold = offset === 2 ? "first" : "second";
  }
  return {
    ...defaultQuery(),
    date: local.slice(0, 10),
    time: local.slice(11, 16),
    direction: operation === "arrival" ? "from-airport" : "to-airport",
    buffer: operation === "arrival" ? 45 : 120,
    fold,
  };
}
