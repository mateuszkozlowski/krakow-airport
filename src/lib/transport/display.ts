import type { Locale } from "../weather/model";
import { findPlace } from "./catalog";
import type { Leg, TransitStop } from "./model";
export function clock(at: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "pl" ? "pl-PL" : "en-GB", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(at));
}
export function dateLabel(at: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "pl" ? "pl-PL" : "en-GB", {
    timeZone: "Europe/Warsaw",
    day: "numeric",
    month: "short",
    weekday: "short",
  }).format(new Date(at));
}
export function duration(minutes: number, locale: Locale) {
  const hours = Math.floor(minutes / 60),
    rest = minutes % 60;
  return hours
    ? `${hours} ${locale === "pl" ? "godz." : "h"}${rest ? ` ${rest} min` : ""}`
    : `${rest} min`;
}
export function stopLabel(stop: TransitStop, locale: Locale) {
  if (stop.place === "airport")
    return locale === "pl" ? "Kraków Lotnisko" : "Kraków Airport";
  if (stop.place === "krakow-glowny") {
    return stop.name.includes("MDA")
      ? "Kraków · MDA"
      : stop.name.includes("Wschód")
        ? locale === "pl"
          ? "Dworzec Główny Wschód"
          : "Main station · east side"
        : "Kraków Główny";
  }
  return findPlace(stop.place)?.name[locale] ?? stop.name;
}
export function routeLabel(leg: Leg, locale: Locale) {
  if (leg.mode === "train") return locale === "pl" ? "Pociąg KMŁ" : "KMŁ train";
  if (leg.mode === "replacement-bus")
    return locale === "pl" ? "Autobus zastępczy KMŁ" : "KMŁ replacement bus";
  if (leg.mode === "coach") return leg.route || "FlixBus";
  return `${locale === "pl" ? "Autobus" : "Bus"} ${leg.route}`;
}
export function walkingLink(stop: TransitStop) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${stop.lat},${stop.lon}`)}`;
}
