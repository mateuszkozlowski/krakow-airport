import type { Observation } from "./model";

/** Index once, then find a verifying observation in O(log n) per forecast. */
export function verificationIndex(observations: Observation[], now: number) {
  const unique = new Map<number, Observation | null>();
  for (const o of observations) {
    const at = Date.parse(o.at);
    const visibility = o.conditions.visibility;
    if (!Number.isFinite(at) || at > now) continue;
    if (visibility === null || !Number.isFinite(visibility) || visibility < 0) {
      unique.set(at, null);
      continue;
    }
    // Without revision receipt times, conflicting values at the same timestamp
    // cannot establish an outcome. An identical duplicate is harmless.
    if (unique.has(at) && unique.get(at)?.conditions.visibility !== visibility)
      unique.set(at, null);
    else if (!unique.has(at)) unique.set(at, o);
  }
  const entries = [...unique.entries()]
    .sort(([a], [b]) => a - b);
  return (target: number): Observation | null => {
    if (!Number.isFinite(target)) return null;
    let lo = 0;
    let hi = entries.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (entries[mid][0] < target) lo = mid + 1;
      else hi = mid;
    }
    // Prefer the later observation on a tie, as offline target preparation does.
    const nearby = [lo, lo - 1]
      .filter((i) => i >= 0 && i < entries.length)
      .sort((a, b) => Math.abs(entries[a][0] - target) - Math.abs(entries[b][0] - target));
    const nearest = nearby[0];
    if (nearest === undefined || Math.abs(entries[nearest][0] - target) > 15 * 60000)
      return null;
    // A conflicting nearest observation is missing; do not silently jump to a
    // different time and turn an uncertain result into a known good/bad outcome.
    return entries[nearest][1];
  };
}
