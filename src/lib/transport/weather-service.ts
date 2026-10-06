import "server-only";
import { getWeather } from "../weather/service";
import { resolveFlight } from "./query";
import { connectionWeather, unknownWeather } from "./weather";
import type { TripQuery } from "./model";
export async function getConnectionWeather(query: TripQuery, now = new Date()) {
  const { at, issue } = resolveFlight(query, now);
  if (!at || issue || Date.parse(at) > now.getTime() + 48 * 3600000)
    return unknownWeather();
  try {
    return connectionWeather(await getWeather(), query, now);
  } catch {
    return unknownWeather();
  }
}
