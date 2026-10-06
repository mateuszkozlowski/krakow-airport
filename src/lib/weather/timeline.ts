import type { Level, Operation, Period } from "./model";

// undefined means there is no worse scenario; null means a scenario lacks data.
export function possibleWorsening(
  period: Period,
  operation: Operation,
): Level | null | undefined {
  const base = period[operation].level;
  const known = period.scenarios
    .map((s) => s[operation].level)
    .filter(
      (level): level is Level =>
        level !== null && (base === null || level > base),
    );
  if (known.length) return Math.max(...known) as Level;
  return period.scenarios.some((s) => s[operation].level === null)
    ? null
    : undefined;
}

export function timelineSegments(
  periods: Period[],
): { start: string; end: string; period: Period | null }[] {
  const result: { start: string; end: string; period: Period | null }[] = [];
  for (const period of [...periods].sort(
    (a, b) => Date.parse(a.start) - Date.parse(b.start),
  )) {
    const previous = result[result.length - 1];
    if (previous && Date.parse(period.start) > Date.parse(previous.end))
      result.push({ start: previous.end, end: period.start, period: null });
    result.push({ start: period.start, end: period.end, period });
  }
  return result;
}
