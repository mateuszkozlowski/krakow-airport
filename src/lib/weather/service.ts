import "server-only";
import { cached } from "@/lib/cache";
import { assess, defaultConfig, type RiskConfig } from "./engine";
import { observation, parseTaf, forecastPeriods } from "./parse";
import type {
  Conditions,
  Observation,
  Snapshot,
  SourceStatus,
  Period,
} from "./model";
import { ensembleSignals, type EnsembleData } from "./ensemble";
type RawMetar = { rawOb: string; obsTime: number };
type RawTaf = { rawTAF: string; issueTime: string };
async function json<T>(
  url: string,
  headers?: Record<string, string>,
): Promise<T> {
  const response = await fetch(url, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Weather provider unavailable");
  return response.json();
}
function issuedFromRaw(raw: string): string {
  const match = raw.match(/\b(\d{2})(\d{2})(\d{2})Z\b/);
  if (!match) throw new Error("Missing report time");
  const now = new Date();
  return [-1, 0, 1]
    .map(
      (m) =>
        new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth() + m,
            +match[1],
            +match[2],
            +match[3],
          ),
        ),
    )
    .sort(
      (a, b) =>
        Math.abs(a.getTime() - now.getTime()) -
        Math.abs(b.getTime() - now.getTime()),
    )[0]
    .toISOString();
}
async function metars(): Promise<RawMetar[]> {
  try {
    const records = await json<RawMetar[]>(
      "https://aviationweather.gov/api/data/metar?ids=EPKK&format=json&hours=30",
    );
    if (!Array.isArray(records) || !records.length)
      throw new Error("Missing METAR");
    return records;
  } catch {
    const key =
      process.env.CHECKWX_API_KEY || process.env.NEXT_PUBLIC_CHECKWX_API_KEY;
    if (!key) throw new Error("METAR unavailable");
    const result = await json<{ data: string[] }>(
      "https://api.checkwx.com/metar/EPKK",
      { "X-API-Key": key },
    );
    return result.data.map((raw) => ({
      rawOb: raw,
      obsTime: Date.parse(issuedFromRaw(raw)) / 1000,
    }));
  }
}
async function tafs(): Promise<RawTaf[]> {
  try {
    const records = await json<RawTaf[]>(
      "https://aviationweather.gov/api/data/taf?ids=EPKK&format=json",
    );
    if (!Array.isArray(records) || !records.length)
      throw new Error("Missing TAF");
    return records;
  } catch {
    const key =
      process.env.CHECKWX_API_KEY || process.env.NEXT_PUBLIC_CHECKWX_API_KEY;
    if (!key) throw new Error("TAF unavailable");
    const result = await json<{ data: string[] }>(
      "https://api.checkwx.com/taf/EPKK",
      { "X-API-Key": key },
    );
    return result.data.map((raw) => ({
      rawTAF: raw,
      issueTime: issuedFromRaw(raw),
    }));
  }
}
export function configuredRisk(): RiskConfig {
  const numeric = (name: string, fallback: number, max: number) => {
    const v = Number(process.env[name]);
    return Number.isFinite(v) && v > 0 && v <= max ? v : fallback;
  };
  return {
    ...defaultConfig,
    runwayTrue: numeric("AIRPORT_RUNWAY_TRUE_HEADING", 78, 360),
    arrivalRvr: numeric("AIRPORT_ARRIVAL_RVR_ADVISORY_M", 550, 2000),
    departureRvr: numeric("AIRPORT_DEPARTURE_RVR_ADVISORY_M", 300, 2000),
    ceilingFt: numeric("AIRPORT_CEILING_ADVISORY_FT", 200, 1000),
  };
}
type ModelData = {
  hourly_units?: Record<string, string>;
  hourly: {
    time: string[];
    visibility: (number | null)[];
    wind_speed_10m: (number | null)[];
    wind_direction_10m: (number | null)[];
    wind_gusts_10m: (number | null)[];
    temperature_2m: (number | null)[];
    dew_point_2m: (number | null)[];
    weather_code: (number | null)[];
    snowfall: (number | null)[];
    cape: (number | null)[];
  };
};
// The current site is noncommercial, as confirmed by its owner. Change this
// setting or configure a commercial key before introducing monetisation.
function modelEnabled() {
  return (
    process.env.OPEN_METEO_DISABLED !== "true" &&
    (process.env.SITE_COMMERCIAL !== "true" || !!process.env.OPEN_METEO_API_KEY)
  );
}
async function model(): Promise<ModelData> {
  const key = process.env.OPEN_METEO_API_KEY;
  const host = key ? "customer-api.open-meteo.com" : "api.open-meteo.com";
  const query = new URLSearchParams({
    latitude: "50.078",
    longitude: "19.785",
    hourly:
      "visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,dew_point_2m,weather_code,snowfall,cape",
    wind_speed_unit: "kn",
    timezone: "UTC",
    forecast_hours: "49",
  });
  if (key) query.set("apikey", key);
  return json(`https://${host}/v1/forecast?${query}`);
}
async function ensemble(): Promise<EnsembleData> {
  const key = process.env.OPEN_METEO_API_KEY;
  const host = key
    ? "customer-ensemble-api.open-meteo.com"
    : "ensemble-api.open-meteo.com";
  const query = new URLSearchParams({
    latitude: "50.078",
    longitude: "19.785",
    models: "ecmwf_ifs025_ensemble",
    hourly: "temperature_2m,dew_point_2m,wind_speed_10m",
    wind_speed_unit: "kn",
    forecast_days: "3",
    timezone: "UTC",
  });
  if (key) query.set("apikey", key);
  return json(`https://${host}/v1/ensemble?${query}`);
}
function modelPeriods(
  data: ModelData,
  now: Date,
  config: RiskConfig,
): Period[] {
  const h = data.hourly;
  if (
    !h?.time ||
    data.hourly_units?.wind_speed_10m !== "kn" ||
    data.hourly_units?.visibility !== "m"
  )
    throw new Error("Invalid model data or units");
  const numeric = (
    value: unknown,
    min: number,
    max = Infinity,
  ): number | null =>
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
      ? value
      : null;
  return h.time.flatMap((time, i) => {
    const start = Date.parse(time.endsWith("Z") ? time : time + "Z");
    if (
      start + 3600000 <= now.getTime() ||
      start >= now.getTime() + 48 * 3600000
    )
      return [];
    const code = h.weather_code?.[i];
    const weather =
      code === 95 || code === 96 || code === 99
        ? ["TS"]
        : code === 66 || code === 67
          ? ["FZRA"]
          : code === 56 || code === 57
            ? ["FZDZ"]
            : code === 75 || code === 86
              ? ["+SN"]
              : code !== null &&
                  code !== undefined &&
                  [71, 73, 77, 85].includes(code)
                ? ["SN"]
                : code === 45
                  ? ["FG"]
                  : code === 48
                    ? ["FZFG"]
                    : code !== null &&
                        code !== undefined &&
                        [61, 63, 65, 80, 81, 82].includes(code)
                      ? [code === 65 || code === 82 ? "+RA" : "RA"]
                      : code !== null &&
                          code !== undefined &&
                          [51, 53, 55].includes(code)
                        ? ["DZ"]
                        : [];
    const speed = numeric(h.wind_speed_10m?.[i], 0, 150);
    const c: Conditions = {
      visibility: numeric(h.visibility?.[i], 0),
      ceiling: null,
      rvr: [],
      cavok: false,
      temperature: numeric(h.temperature_2m?.[i], -80, 65),
      dewpoint: numeric(h.dew_point_2m?.[i], -100, 65),
      snowfallCm:
        data.hourly_units?.snowfall === "cm"
          ? numeric(h.snowfall?.[i], 0)
          : null,
      cape: numeric(h.cape?.[i], 0),
      weather,
      wind:
        speed === null
          ? null
          : {
              direction: numeric(h.wind_direction_10m?.[i], 0, 360),
              speed,
              gust: numeric(h.wind_gusts_10m?.[i], 0, 150),
              variable: false,
            },
    };
    return [
      {
        start: new Date(Math.max(start, now.getTime())).toISOString(),
        end: new Date(
          Math.min(start + 3600000, now.getTime() + 48 * 3600000),
        ).toISOString(),
        source: "model" as const,
        conditions: c,
        arrival: assess(c, "arrival", config),
        departure: assess(c, "departure", config),
        scenarios: [],
      },
    ];
  });
}
const missing = (detail: string): SourceStatus => ({
  state: "missing",
  fetchedAt: null,
  detail,
});
export async function getWeather(): Promise<Snapshot> {
  const now = new Date();
  const config = configuredRisk();
  const [m, t, n, e] = await Promise.allSettled([
    cached("metar", metars),
    cached("taf", tafs),
    modelEnabled()
      ? cached("model", model, 6 * 3600, 900)
      : Promise.resolve(null),
    modelEnabled() && process.env.ENSEMBLE_DISABLED !== "true"
      ? cached("ensemble", ensemble, 12 * 3600, 3600)
      : Promise.resolve(null),
  ]);
  let history: Observation[] = [];
  let metarStatus = missing("NOAA / CheckWX");
  if (m.status === "fulfilled") {
    history = m.value.data
      .flatMap((r) => {
        try {
          return [
            observation(r.rawOb, new Date(r.obsTime * 1000).toISOString()),
          ];
        } catch {
          return [];
        }
      })
      .filter((o) => Date.parse(o.at) <= now.getTime() + 5 * 60000)
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    metarStatus = {
      state:
        history[0] &&
        now.getTime() - Date.parse(history[0].at) <= 90 * 60000 &&
        now.getTime() - m.value.fetchedAt <= 10 * 60000
          ? "fresh"
          : "stale",
      fetchedAt: new Date(m.value.fetchedAt).toISOString(),
      detail: "METAR EPKK · NOAA / CheckWX",
    };
  }
  let forecast: Period[] = [];
  let taf: Snapshot["taf"] = null;
  let tafStatus = missing("TAF EPKK");
  if (t.status === "fulfilled") {
    for (const raw of t.value.data) {
      try {
        const parsed = parseTaf(raw.rawTAF, raw.issueTime);
        taf = {
          raw: raw.rawTAF,
          issued: parsed.issued.toISOString(),
          end: parsed.end.toISOString(),
        };
        const valid =
          parsed.issued.getTime() <= now.getTime() + 5 * 60000 &&
          parsed.end > now &&
          now.getTime() - parsed.issued.getTime() <= 12 * 3600000 &&
          now.getTime() - t.value.fetchedAt <= 30 * 60000;
        tafStatus = {
          state: valid ? "fresh" : "stale",
          fetchedAt: new Date(t.value.fetchedAt).toISOString(),
          detail: "TAF EPKK · NOAA / CheckWX",
        };
        if (valid) forecast = forecastPeriods(parsed, now, config);
        break;
      } catch {
        /* Invalid forecasts cannot be shown as low risk. */
      }
    }
  }
  let modelStatus: SourceStatus = modelEnabled()
    ? missing("Open-Meteo")
    : { state: "disabled", fetchedAt: null, detail: "Open-Meteo" };
  if (n.status === "fulfilled" && n.value) {
    try {
      const valid = now.getTime() - n.value.fetchedAt < 3600000;
      modelStatus = {
        state: valid ? "fresh" : "stale",
        fetchedAt: new Date(n.value.fetchedAt).toISOString(),
        detail: "Open-Meteo · best_match · model",
      };
      if (valid) {
        const periods = modelPeriods(n.value.data, now, config);
        const tafEnd = forecast.length
          ? Date.parse(forecast[forecast.length - 1].end)
          : now.getTime();
        forecast.push(
          ...periods
            .filter((p) => Date.parse(p.end) > tafEnd)
            .map((p) => ({
              ...p,
              start: new Date(
                Math.max(Date.parse(p.start), tafEnd),
              ).toISOString(),
            })),
        );
      }
    } catch {
      modelStatus = missing("Open-Meteo");
    }
  }
  const observed = history[0] ?? null;
  const current =
    metarStatus.state === "fresh" ? (observed?.conditions ?? null) : null;
  let fogSignal: Snapshot["fogSignal"] = null;
  if (
    current &&
    current.temperature !== null &&
    current.dewpoint !== null &&
    current.temperature - current.dewpoint <= 2 &&
    current.wind &&
    current.wind.speed <= 4
  ) {
    const previous = history.find(
      (o) =>
        Date.parse(o.at) <= Date.parse(observed!.at) - 30 * 60000 &&
        Date.parse(o.at) >= Date.parse(observed!.at) - 2 * 3600000,
    );
    const p = previous?.conditions;
    const spread = current.temperature - current.dewpoint;
    fogSignal =
      p &&
      p.temperature !== null &&
      p.dewpoint !== null &&
      spread < p.temperature - p.dewpoint - 0.5
        ? "increasing"
        : "possible";
  }
  let ensemblePoints: Snapshot["ensemble"] = [];
  let ensembleStatus: SourceStatus = {
    state:
      modelEnabled() && process.env.ENSEMBLE_DISABLED !== "true"
        ? "missing"
        : "disabled",
    fetchedAt: null,
    detail: "ECMWF ensemble · Open-Meteo",
  };
  if (e.status === "fulfilled" && e.value) {
    const valid = now.getTime() - e.value.fetchedAt < 6 * 3600000;
    const points = ensembleSignals(e.value.data).filter(
      (p) =>
        Date.parse(p.at) >= now.getTime() &&
        Date.parse(p.at) <= now.getTime() + 48 * 3600000,
    );
    ensembleStatus = {
      state: points.length ? (valid ? "fresh" : "stale") : "missing",
      fetchedAt: new Date(e.value.fetchedAt).toISOString(),
      detail: "ECMWF IFS 0.25° ensemble · Open-Meteo",
    };
    if (valid) ensemblePoints = points;
  }
  return {
    version: 2,
    generatedAt: now.toISOString(),
    observed,
    history,
    forecast,
    ensemble: ensemblePoints,
    current: {
      arrival: assess(current, "arrival", config),
      departure: assess(current, "departure", config),
    },
    sources: {
      metar: metarStatus,
      taf: tafStatus,
      model: modelStatus,
      ensemble: ensembleStatus,
    },
    taf,
    fogSignal,
  };
}
