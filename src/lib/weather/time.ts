export const zone = "Europe/Warsaw";
export function localInput(iso: string): string {
  const p = new Intl.DateTimeFormat("sv-SE", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
  return p.replace(" ", "T");
}
// Never shift the underlying epoch to display local time. Detect DST gaps and folds.
export function warsawToUtc(local: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))
    throw new Error("Invalid date");
  const naive = Date.parse(local + "Z");
  const candidates = [1, 2]
    .map((offset) => new Date(naive - offset * 3600000).toISOString())
    .filter((iso) => localInput(iso) === local);
  if (candidates.length !== 1)
    throw new Error(
      candidates.length ? "Ambiguous time (DST)" : "Nonexistent time (DST)",
    );
  return candidates[0];
}
export function formatTime(
  iso: string,
  locale: "pl" | "en",
  full = false,
): string {
  return new Intl.DateTimeFormat(locale === "pl" ? "pl-PL" : "en-GB", {
    timeZone: zone,
    ...(full ? ({ day: "numeric", month: "short" } as const) : {}),
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
export function eveningBefore(at: string): string {
  const local = localInput(at);
  const day = new Date(local.slice(0, 10) + "T12:00:00Z");
  day.setUTCDate(day.getUTCDate() - 1);
  return warsawToUtc(day.toISOString().slice(0, 10) + "T18:00");
}
