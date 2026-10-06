import {
  parseMetar,
  parseTAFAsForecast,
  getCompositeForecastForDate,
  WeatherChangeType,
  SpeedUnit,
} from "metar-taf-parser";
import type {
  IAbstractWeatherContainer,
  IForecastContainer,
  Forecast,
  IMetarDated,
} from "metar-taf-parser";
import type { Conditions, Observation, Period, Rvr, Scenario } from "./model";
import { assess, defaultConfig, type RiskConfig } from "./engine";

export function parseRvr(raw: string): Rvr[] {
  const result: Rvr[] = [];
  const pattern =
    /(?:^|\s)R(\d{2}[LCR]?)\/([MP]?)(\d{4})(?:V([MP]?)(\d{4}))?(FT)?([UDN])?(?=\s|$)/g;
  for (const m of raw.matchAll(pattern)) {
    const factor = m[6] ? 0.3048 : 1;
    result.push({
      runway: m[1],
      min: Math.round(Number(m[3]) * factor),
      max: m[5] ? Math.round(Number(m[5]) * factor) : null,
      minQualifier: (m[2] || null) as Rvr["minQualifier"],
      maxQualifier: (m[4] || null) as Rvr["maxQualifier"],
      trend: m[7] || null,
    });
  }
  return result;
}
export function normalize(
  p: IAbstractWeatherContainer,
  inherited?: Conditions,
): Conditions {
  const wind = p.wind;
  const factor =
    wind?.unit === SpeedUnit.MetersPerSecond
      ? 1.94384
      : wind?.unit === SpeedUnit.KilometersPerHour
        ? 0.539957
        : 1;
  const clouds = p.clouds
    .filter(
      (c) => ["BKN", "OVC"].includes(c.quantity) && c.height !== undefined,
    )
    .map((c) => c.height!);
  const raw =
    "raw" in p && typeof p.raw === "string"
      ? p.raw
      : "message" in p && typeof p.message === "string"
        ? p.message
        : "";
  const zeroCeiling = /\b(?:BKN|OVC|VV)000\b/.test(raw);
  const ceiling = zeroCeiling
    ? 0
    : p.verticalVisibility !== undefined
      ? p.verticalVisibility
      : clouds.length
        ? Math.min(...clouds)
        : null;
  const visibility = p.cavok
    ? 10000
    : p.visibility
      ? p.visibility.value * (p.visibility.unit === "SM" ? 1609.344 : 1)
      : (inherited?.visibility ?? null);
  return {
    visibility,
    ceiling: p.cavok
      ? null
      : zeroCeiling || p.clouds.length || p.verticalVisibility !== undefined
        ? ceiling
        : (inherited?.ceiling ?? null),
    wind: wind
      ? {
          direction: wind.degrees ?? null,
          variable: wind.direction === "VRB",
          speed: wind.speed * factor,
          gust: wind.gust === undefined ? null : wind.gust * factor,
          from: wind.minVariation,
          to: wind.maxVariation,
        }
      : (inherited?.wind ?? null),
    weather: p.cavok
      ? []
      : p.weatherConditions.length
        ? p.weatherConditions
            .filter((w) => !w.phenomenons.includes("NSW" as never))
            .map(
              (w) =>
                `${w.intensity ?? ""}${w.descriptive ?? ""}${w.phenomenons.join("")}`,
            )
        : (inherited?.weather ?? []),
    temperature: null,
    dewpoint: null,
    rvr: [],
    cavok: !!p.cavok,
    windShear: !!p.windShear || !!inherited?.windShear,
  };
}
export function observation(raw: string, issued: string): Observation {
  const p: IMetarDated = parseMetar(raw, { issued: new Date(issued) });
  if (p.station !== "EPKK" || p.nil)
    throw new Error("Invalid EPKK observation");
  const conditions = normalize(p);
  conditions.temperature = p.temperature ?? null;
  conditions.dewpoint = p.dewPoint ?? null;
  conditions.rvr = parseRvr(raw);
  return { at: new Date(issued).toISOString(), raw, conditions };
}
export function parseTaf(raw: string, issued: string): IForecastContainer {
  const p = parseTAFAsForecast(raw, { issued: new Date(issued) });
  if (p.station !== "EPKK" || p.nil || p.canceled || !p.forecast.length)
    throw new Error("Invalid EPKK TAF");
  return p;
}
function supplemental(
  f: Forecast,
  base: Conditions,
  config: RiskConfig,
  kind = f.type as string,
): Scenario {
  const conditions = normalize(f, base);
  return {
    kind,
    probability: f.probability ?? null,
    conditions,
    arrival: assess(conditions, "arrival", config),
    departure: assess(conditions, "departure", config),
  };
}
export function forecastAt(
  taf: IForecastContainer,
  at: Date,
  config = defaultConfig,
): Omit<Period, "start" | "end" | "source"> {
  const composite = getCompositeForecastForDate(at, taf);
  let base = normalize(composite.prevailing);
  const scenarios: Scenario[] = [];
  if (
    composite.prevailing.type === WeatherChangeType.BECMG &&
    at < composite.prevailing.by
  ) {
    const bases = taf.forecast.filter(
      (f) =>
        !f.type ||
        f.type === WeatherChangeType.FM ||
        f.type === WeatherChangeType.BECMG,
    );
    const index = bases.indexOf(composite.prevailing);
    if (index > 0) {
      base = normalize(bases[index - 1]);
      scenarios.push(supplemental(composite.prevailing, base, config, "BECMG"));
    }
  }
  for (const f of composite.supplemental)
    scenarios.push(supplemental(f, base, config));
  return {
    conditions: base,
    arrival: assess(base, "arrival", config),
    departure: assess(base, "departure", config),
    scenarios,
  };
}
export function forecastPeriods(
  taf: IForecastContainer,
  now: Date,
  config = defaultConfig,
): Period[] {
  const start = Math.max(now.getTime(), taf.start.getTime());
  const end = Math.min(taf.end.getTime(), now.getTime() + 48 * 3600000);
  const boundaries = new Set<number>([start, end]);
  for (let t = Math.ceil(start / 3600000) * 3600000; t < end; t += 3600000)
    boundaries.add(t);
  for (const f of taf.forecast)
    for (const t of [
      f.start.getTime(),
      f.end.getTime(),
      ...(f.type === WeatherChangeType.BECMG ? [f.by.getTime()] : []),
    ])
      if (t > start && t < end) boundaries.add(t);
  const sorted = [...boundaries].sort((a, b) => a - b);
  return sorted
    .slice(0, -1)
    .filter((t) => t < end)
    .map((t, i) => ({
      start: new Date(t).toISOString(),
      end: new Date(sorted[i + 1]).toISOString(),
      source: "TAF",
      ...forecastAt(taf, new Date(t), config),
    }));
}
