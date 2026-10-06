import { eveningBefore } from "./time";
import type { Locale, Operation } from "./model";
const stamp = (at: string) =>
  new Date(at)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
const escape = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
// Fold by UTF-8 bytes, including continuation whitespace (RFC 5545).
function fold(value: string) {
  const lines: string[] = [];
  let line = "";
  for (const char of value) {
    if (new TextEncoder().encode(line + char).length > 75) {
      lines.push(line);
      line = " ";
    }
    line += char;
  }
  lines.push(line);
  return lines.join("\r\n");
}
export function calendar(
  at: string,
  operation: Operation,
  locale: Locale,
  now = new Date(),
): string {
  const evening = eveningBefore(at);
  const fallback = new Date(Date.parse(at) - 30 * 60000).toISOString();
  const reminder =
    Date.parse(evening) > now.getTime()
      ? evening
      : Date.parse(fallback) > now.getTime()
        ? fallback
        : null;
  const title =
    locale === "pl"
      ? `Kraków Balice · ${operation === "arrival" ? "przylot" : "odlot"}`
      : `Kraków Airport · ${operation}`;
  const link = `https://www.krk.flights/${locale}?at=${encodeURIComponent(at)}&operation=${operation}`;
  const description =
    locale === "pl"
      ? `Sprawdź aktualną pogodę i komunikat przewoźnika. ${link}`
      : `Check current weather and your airline's information. ${link}`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KRK.flights//Travel reminder//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${stamp(at)}-${operation}@krk.flights`,
    `DTSTAMP:${stamp(now.toISOString())}`,
    `DTSTART:${stamp(at)}`,
    `DTEND:${stamp(new Date(Date.parse(at) + 3600000).toISOString())}`,
    `SUMMARY:${escape(title)}`,
    `DESCRIPTION:${escape(description)}`,
    `URL:${link}`,
  ];
  if (reminder)
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escape(title)}`,
      `TRIGGER;VALUE=DATE-TIME:${stamp(reminder)}`,
      "END:VALARM",
    );
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
