import { site } from "../seo";
import type { Locale } from "../weather/model";
import { queryString } from "./query";
import { transportPath } from "./paths";
import { routeLabel, stopLabel } from "./display";
import type { Journey, TripQuery } from "./model";
const escape = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
const stamp = (at: string) =>
  new Date(at).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
function fold(value: string) {
  const lines: string[] = [];
  let line = "",
    bytes = 0;
  for (const char of value) {
    const size = new TextEncoder().encode(char).length;
    if (bytes + size > 75) {
      lines.push(line);
      line = " ";
      bytes = 1;
    }
    line += char;
    bytes += size;
  }
  lines.push(line);
  return lines.join("\r\n");
}
export function journeyCalendar(
  journey: Journey,
  query: TripQuery,
  locale: Locale,
  now = new Date(),
) {
  const first = journey.legs[0],
    last = journey.legs[journey.legs.length - 1];
  const title = `${stopLabel(first.from, locale)} → ${stopLabel(last.to, locale)}`;
  const description = [
    locale === "pl"
      ? "Plan podróży. Sprawdź aktualny rozkład przed wyjściem."
      : "Travel plan. Check the latest timetable before leaving.",
    ...journey.legs.map(
      (l) => `${routeLabel(l, locale)}: ${l.from.name} → ${l.to.name}`,
    ),
    `${site}${transportPath(locale)}?${queryString(query)}`,
  ].join("\n");
  // A short stable non-personal UID; raw operator IDs can contain reserved characters.
  let hash = 2166136261;
  for (const char of journey.id)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KRK.flights//Transport//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${(hash >>> 0).toString(16)}-${stamp(journey.departure)}@krk.flights`,
    `DTSTAMP:${stamp(now.toISOString())}`,
    `DTSTART:${stamp(journey.departure)}`,
    `DTEND:${stamp(journey.arrival)}`,
    `SUMMARY:${escape(title)}`,
    `LOCATION:${escape(first.from.name)}`,
    `DESCRIPTION:${escape(description)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escape(title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
