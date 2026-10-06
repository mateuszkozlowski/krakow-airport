import type { Locale } from "../weather/model";
export const transportSlugs = {
  pl: {
    transport: "dojazd",
    night: "dojazd-noca",
    early: "lot-rano",
    zakopane: "balice-zakopane",
  },
  en: {
    transport: "transport",
    night: "late-night",
    early: "early-flight",
    zakopane: "airport-to-zakopane",
  },
} as const;
export type TransportPageKind = keyof typeof transportSlugs.pl;
export function transportPath(
  locale: Locale,
  kind: TransportPageKind = "transport",
) {
  return `/${locale}/${transportSlugs[locale][kind]}`;
}
export function transportKind(
  locale: Locale,
  slug: string,
): TransportPageKind | undefined {
  return Object.entries(transportSlugs[locale]).find(
    ([, value]) => value === slug,
  )?.[0] as TransportPageKind | undefined;
}
