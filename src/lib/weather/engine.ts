import type { Assessment, Conditions, Level, Operation } from "./model";

// Advisory weather bands, NOT aircraft operating limits or an airport-open status.
// METAR wind uses true north; runway 07/25 has approximately 078°/258° true.
export interface RiskConfig {
  runwayTrue: number;
  arrivalRvr: number;
  departureRvr: number;
  ceilingFt: number;
  surface: "unknown" | "dry" | "wet" | "contaminated";
}
export const defaultConfig: RiskConfig = {
  runwayTrue: 78,
  arrivalRvr: 550,
  departureRvr: 300,
  ceilingFt: 200,
  surface: "unknown",
};
export function crosswind(conditions: Conditions, heading = 78): number | null {
  const w = conditions.wind;
  if (!w) return null;
  const speed = Math.max(w.speed, w.gust ?? 0);
  if (w.direction === null || w.variable) return speed;
  const directions = [w.direction];
  if (w.from !== undefined && w.to !== undefined) {
    const arc = (w.to - w.from + 360) % 360;
    for (let n = 0; n <= arc; n++) directions.push((w.from + n) % 360);
  }
  return Math.max(
    ...directions.map(
      (d) => Math.abs(Math.sin(((d - heading) * Math.PI) / 180)) * speed,
    ),
  );
}
export function assess(
  c: Conditions | null,
  operation: Operation,
  config = defaultConfig,
): Assessment {
  if (!c)
    return {
      level: null,
      reasons: ["missing"],
      crosswind: null,
      basis: "missing",
    };
  let level: Level | null =
    c.visibility !== null || c.rvr.length || c.cavok ? 1 : null;
  const reasons: string[] = level === null ? ["missing"] : [];
  const add = (value: Level, reason: string) => {
    level = Math.max(level ?? 1, value) as Level;
    if (!reasons.includes(reason)) reasons.push(reason);
  };
  const basis = c.rvr.length
    ? "rvr"
    : c.visibility !== null || c.cavok
      ? "visibility"
      : "missing";
  // The active runway and touchdown/midpoint/stop-end readings are not available.
  // Use the lowest reported reading cautiously and state this limitation in the UI.
  const distance = c.rvr.length
    ? Math.min(...c.rvr.map((r) => r.min))
    : c.visibility;
  const threshold =
    operation === "arrival" ? config.arrivalRvr : config.departureRvr;
  if (distance !== null) {
    if (distance < threshold)
      add(4, basis === "rvr" ? "lowRvr" : "veryLowVisibility");
    else if (distance < (operation === "arrival" ? 1000 : 550))
      add(3, "lowVisibility");
    else if (distance < 1500) add(2, "reducedVisibility");
  }
  if (c.rvr.some((r) => r.minQualifier === "M")) add(3, "rvrBound");
  if (operation === "arrival" && c.ceiling !== null) {
    if (c.ceiling < config.ceilingFt) add(4, "veryLowCeiling");
    else if (c.ceiling < 500) add(3, "lowCeiling");
    else if (c.ceiling < 1000) add(2, "reducedCeiling");
  }
  if (c.weather.some((code) => code.includes("TS"))) add(3, "thunderstorm");
  if (c.windShear) add(3, "windShear");
  if (c.weather.some((code) => /FZ(RA|DZ)/.test(code))) add(4, "freezingRain");
  if (c.weather.some((code) => code.includes("FZFG"))) add(2, "deicing");
  if (c.weather.some((code) => /SN|SG|PL/.test(code)))
    add(c.weather.some((code) => /^\+.*SN/.test(code)) ? 3 : 2, "snow");
  if (c.snowfallCm !== null && c.snowfallCm !== undefined && c.snowfallCm >= 1)
    add(3, "heavySnow");
  if (
    c.temperature !== null &&
    c.temperature <= 3 &&
    (c.weather.some((code) => /RA|DZ|SN|FG/.test(code)) ||
      (c.dewpoint !== null &&
        c.temperature <= 0 &&
        c.temperature - c.dewpoint < 1))
  )
    add(2, "deicing");
  if (c.weather.some((code) => /\+.*RA/.test(code))) add(2, "heavyRain");
  const cross = crosswind(c, config.runwayTrue);
  const band =
    config.surface === "contaminated" ? 15 : config.surface === "wet" ? 25 : 30;
  if (cross !== null && cross >= band)
    add(3, c.wind?.variable ? "variableWind" : "crosswind");
  else if (cross !== null && cross >= band - 10)
    add(2, c.wind?.variable ? "variableWind" : "crosswind");
  if (c.wind && (c.wind.gust ?? c.wind.speed) >= 40) add(2, "strongWind");
  return {
    level,
    reasons,
    crosswind: cross === null ? null : Math.round(cross),
    basis,
  };
}
