import type { Snapshot, Assessment, Conditions } from "../weather/model";
import { weatherSymbol } from "../weather/presentation";
import { resolveFlight } from "./query";
import type { TripQuery, ConnectionWeather } from "./model";
export const unknownWeather = (): ConnectionWeather => ({
  at: null,
  source: null,
  level: null,
  possible: false,
  label: null,
  icon: "cloud",
  extraMinutes: 0,
  suggestedMinutes: 0,
  minTransfer: 0,
});
export function connectionWeather(
  snapshot: Snapshot | null,
  query: TripQuery,
  now = new Date(),
): ConnectionWeather {
  const empty = unknownWeather();
  const flight = resolveFlight(query, now);
  if (!flight.at || flight.issue) return empty;
  const target =
    Date.parse(flight.at) +
    (query.direction === "from-airport" ? query.delay * 60000 : 0);
  empty.at = new Date(target).toISOString();
  if (
    !snapshot ||
    !Number.isFinite(Date.parse(snapshot.generatedAt)) ||
    now.getTime() - Date.parse(snapshot.generatedAt) > 10 * 60000 ||
    Date.parse(snapshot.generatedAt) > now.getTime() + 60000
  )
    return empty;
  const period = snapshot.forecast.find(
    (p) =>
      Date.parse(p.start) <= target &&
      Date.parse(p.end) > target &&
      snapshot.sources[p.source === "TAF" ? "taf" : "model"].state === "fresh",
  );
  let chosen: Assessment,
    conditions: Conditions,
    source: ConnectionWeather["source"],
    possible = false;
  const operation =
    query.direction === "from-airport" ? "arrival" : "departure";
  if (period) {
    chosen = period[operation];
    conditions = period.conditions;
    source = period.source;
    for (const scenario of period.scenarios) {
      if (scenario.probability === 0) continue;
      if ((scenario[operation].level ?? 0) > (chosen.level ?? 0)) {
        chosen = scenario[operation];
        conditions = scenario.conditions;
        possible = true;
      }
    }
  } else if (
    snapshot.observed &&
    snapshot.sources.metar.state === "fresh" &&
    Math.abs(target - now.getTime()) <= 30 * 60000 &&
    now.getTime() - Date.parse(snapshot.observed.at) <= 90 * 60000
  ) {
    chosen = snapshot.current[operation];
    conditions = snapshot.observed.conditions;
    source = "METAR";
  } else return empty;
  const symbol = weatherSymbol(conditions);
  // This is an explicit planning allowance, never an estimate or probability
  // of a flight delay. A temporary forecast receives the smaller allowance.
  const suggestedMinutes =
    query.direction === "from-airport" && (chosen.level ?? 0) >= 3
      ? chosen.level === 4 && !possible
        ? 60
        : 30
      : 0;
  const extraMinutes = query.weather === "auto" ? suggestedMinutes : 0;
  const minTransfer = extraMinutes ? (suggestedMinutes === 60 ? 45 : 30) : 0;
  return {
    at: empty.at,
    source,
    level: chosen.level,
    possible,
    label: symbol.key,
    icon: symbol.icon,
    extraMinutes,
    suggestedMinutes,
    minTransfer,
  };
}
