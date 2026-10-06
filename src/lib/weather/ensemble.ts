export interface EnsemblePoint {
  at: string;
  members: number;
  favourable: number;
}
export interface EnsembleData {
  hourly: Record<string, (string | number | null)[]>;
  hourly_units?: Record<string, string>;
}
export function ensembleSignals(data: EnsembleData): EnsemblePoint[] {
  const h = data.hourly;
  if (!h || !Array.isArray(h.time)) return [];
  const members = Object.keys(h)
    .filter((k) => /^temperature_2m_member\d+$/.test(k))
    .map((k) => k.slice("temperature_2m".length));
  if (Array.isArray(h.temperature_2m)) members.unshift(""); // Control member has no suffix.
  return h.time.flatMap((time, i) => {
    if (typeof time !== "string") return [];
    let valid = 0;
    let favourable = 0;
    for (const suffix of members) {
      if (
        data.hourly_units &&
        data.hourly_units[`wind_speed_10m${suffix}`] !== "kn"
      )
        continue;
      const temperature = h[`temperature_2m${suffix}`]?.[i];
      const dewpoint = h[`dew_point_2m${suffix}`]?.[i];
      const wind = h[`wind_speed_10m${suffix}`]?.[i];
      if (
        typeof temperature !== "number" ||
        typeof dewpoint !== "number" ||
        typeof wind !== "number" ||
        ![temperature, dewpoint, wind].every(Number.isFinite)
      )
        continue;
      valid++;
      if (temperature - dewpoint <= 1 && wind <= 4) favourable++;
    }
    return valid >= 10
      ? [
          {
            at: time.endsWith("Z") ? time : time + "Z",
            members: valid,
            favourable,
          },
        ]
      : [];
  });
}
