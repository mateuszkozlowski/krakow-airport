// Research inputs only. No trained model is called by the public weather service.
import type { Observation } from "./model";
import { localInput } from "./time";
const hour = 3600000;
const visibilityLog = (o: Observation) =>
  Math.log1p(Math.min(o.conditions.visibility ?? 10000, 10000));
const spread = (o: Observation) =>
  o.conditions.temperature !== null && o.conditions.dewpoint !== null
    ? o.conditions.temperature - o.conditions.dewpoint
    : null;

export function researchFeatures(
  o: Observation,
  history: Observation[],
  leadHours: number,
  extended = false,
): Record<string, number> | null {
  const c = o.conditions;
  if (
    c.temperature === null ||
    c.dewpoint === null ||
    !c.wind ||
    c.visibility === null
  )
    return null;
  const at = Date.parse(o.at);
  const past = history
    .filter((p) => Date.parse(p.at) < at)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const previous = past.at(-1);
  const usable =
    previous && at - Date.parse(previous.at) <= hour ? previous : null;
  const elapsed = usable ? (at - Date.parse(usable.at)) / hour : 1;
  const difference = spread(o)!;
  const previousSpread = usable ? spread(usable) : null;
  const local = localInput(o.at);
  const localHour =
    Number(local.slice(11, 13)) + Number(local.slice(14, 16)) / 60;
  const month = Number(local.slice(5, 7));
  const features: Record<string, number> = {
    spread: difference,
    temperature: c.temperature,
    wind: c.wind.speed,
    gust: c.wind.gust ?? c.wind.speed,
    visibilityLog: visibilityLog(o),
    visibilityChangePerHour:
      usable?.conditions.visibility !== null &&
      usable?.conditions.visibility !== undefined
        ? (visibilityLog(o) - visibilityLog(usable)) / elapsed
        : 0,
    ceiling: Math.min(c.ceiling ?? 10000, 10000),
    ceilingMissing: c.ceiling === null ? 1 : 0,
    spreadChangePerHour:
      previousSpread === null ? 0 : (difference - previousSpread) / elapsed,
    trendMissing: previousSpread === null ? 1 : 0,
    fog: c.weather.some((w) => w.includes("FG")) ? 1 : 0,
    mist: c.weather.includes("BR") ? 1 : 0,
    rain: c.weather.some((w) => /RA|DZ/.test(w)) ? 1 : 0,
    hourSin: Math.sin((localHour * Math.PI) / 12),
    hourCos: Math.cos((localHour * Math.PI) / 12),
    monthSin: Math.sin((month * Math.PI) / 6),
    monthCos: Math.cos((month * Math.PI) / 6),
  };
  if (!extended) return features;
  for (const hours of [1, 3, 6]) {
    const target = at - hours * hour;
    const lag = past
      .filter((p) => Math.abs(Date.parse(p.at) - target) <= 15 * 60000)
      .sort(
        (a, b) =>
          Math.abs(Date.parse(a.at) - target) -
          Math.abs(Date.parse(b.at) - target),
      )[0];
    const lagSpread = lag ? spread(lag) : null;
    features[`visibilityChange${hours}h`] =
      lag?.conditions.visibility !== null &&
      lag?.conditions.visibility !== undefined
        ? visibilityLog(o) - visibilityLog(lag)
        : 0;
    features[`visibilityLagMissing${hours}h`] =
      !lag || lag.conditions.visibility === null ? 1 : 0;
    features[`spreadChange${hours}h`] =
      lagSpread === null ? 0 : difference - lagSpread;
    features[`spreadLagMissing${hours}h`] = lagSpread === null ? 1 : 0;
    features[`temperatureChange${hours}h`] =
      lag?.conditions.temperature !== null &&
      lag?.conditions.temperature !== undefined
        ? c.temperature - lag.conditions.temperature
        : 0;
    features[`temperatureLagMissing${hours}h`] =
      !lag || lag.conditions.temperature === null ? 1 : 0;
    features[`windLag${hours}h`] = lag?.conditions.wind?.speed ?? 0;
    features[`windLagMissing${hours}h`] = lag?.conditions.wind ? 0 : 1;
  }
  const records = [...past, o];
  for (const hours of [6, 24]) {
    const window = records.filter((p) => Date.parse(p.at) > at - hours * hour);
    features[`rainReportShare${hours}h`] =
      window.filter((p) => p.conditions.weather.some((w) => /RA|DZ/.test(w)))
        .length / window.length;
    const known = window.filter((p) => p.conditions.visibility !== null);
    features[`lowVisibilityShare${hours}h`] = known.length
      ? known.filter((p) => p.conditions.visibility! < 550).length /
        known.length
      : 0;
    // Half-hour METAR coverage proxy, capped: special reports do not establish continuity.
    features[`windowCoverage${hours}h`] = Math.min(
      1,
      window.length / (hours * 2),
    );
    features[`windowIncomplete${hours}h`] =
      at - Date.parse(window[0].at) < (hours - 0.5) * hour ||
      window.some(
        (p, i) =>
          i > 0 && Date.parse(p.at) - Date.parse(window[i - 1].at) > hour,
      )
        ? 1
        : 0;
  }
  const direction = c.wind.direction;
  features.windDirectionMissing = direction === null || c.wind.variable ? 1 : 0;
  features.windNorth = features.windDirectionMissing
    ? 0
    : Math.cos((direction! * Math.PI) / 180) * c.wind.speed;
  features.windEast = features.windDirectionMissing
    ? 0
    : Math.sin((direction! * Math.PI) / 180) * c.wind.speed;
  const amounts: Record<string, number> = { FEW: 2, SCT: 4, BKN: 6, OVC: 8 };
  const layers = [...o.raw.matchAll(/\b(FEW|SCT|BKN|OVC)\d{3}(?:CB|TCU)?\b/g)];
  // CAVOK/NSC do not establish total clear sky; higher clouds may be present.
  const cover = layers.length
    ? Math.max(...layers.map((m) => amounts[m[1]]))
    : /\b(?:SKC|CLR)\b/.test(o.raw)
      ? 0
      : null;
  features.cloudCover = cover ?? 0;
  features.cloudCoverMissing = cover === null ? 1 : 0;
  const target = localInput(new Date(at + leadHours * hour).toISOString());
  const targetHour =
    Number(target.slice(11, 13)) + Number(target.slice(14, 16)) / 60;
  features.targetHourSin = Math.sin((targetHour * Math.PI) / 12);
  features.targetHourCos = Math.cos((targetHour * Math.PI) / 12);
  features.targetMonthSin = Math.sin(
    (Number(target.slice(5, 7)) * Math.PI) / 6,
  );
  features.targetMonthCos = Math.cos(
    (Number(target.slice(5, 7)) * Math.PI) / 6,
  );
  return features;
}
