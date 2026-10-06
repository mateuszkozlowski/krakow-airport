import type { Observation } from "./model";

// Observed trend only; capped METAR visibility is not extrapolated into a forecast.
export function visibilityTrend(
  history: Observation[],
  observed: Observation | null,
  now: string,
) {
  if (!observed) return null;
  if (
    observed.conditions.visibility === null ||
    !Number.isFinite(observed.conditions.visibility)
  )
    return null;
  const end = Date.parse(observed.at);
  const age = Date.parse(now) - end;
  if (!Number.isFinite(age) || age < 0 || age > 90 * 60000) return null;
  const unique = new Map(
    history
      .filter((o) => {
        const at = Date.parse(o.at),
          v = o.conditions.visibility;
        return (
          at <= end &&
          at >= end - 2 * 3600000 &&
          v !== null &&
          Number.isFinite(v) &&
          v >= 0
        );
      })
      .map((o) => [Date.parse(o.at), o]),
  );
  const points = [...unique.values()].sort(
    (a, b) => Date.parse(a.at) - Date.parse(b.at),
  );
  if (
    points.length < 3 ||
    Date.parse(points.at(-1)?.at ?? "") !== end ||
    end - Date.parse(points[0].at) < 3600000 ||
    points.some(
      (o, i) =>
        i > 0 && Date.parse(o.at) - Date.parse(points[i - 1].at) > 45 * 60000,
    )
  )
    return null;
  const values = points.map((o) => Math.min(10000, o.conditions.visibility!));
  const first = values[0],
    last = values.at(-1)!;
  const threshold = Math.max(300, Math.max(first, last) * 0.2);
  const changes = values.slice(1).map((v, i) => v - values[i]);
  const fluctuating =
    changes.some((v) => v > threshold) && changes.some((v) => v < -threshold);
  const direction: "variable" | "improving" | "worsening" | "steady" =
    fluctuating
      ? "variable"
      : last - first > threshold
        ? "improving"
        : first - last > threshold
          ? "worsening"
          : "steady";
  return {
    direction,
    points,
    minutes: Math.round((end - Date.parse(points[0].at)) / 60000),
  };
}
