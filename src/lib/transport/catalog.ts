import type { Place, SourceId } from "./model";

export const sources: Record<
  SourceId,
  {
    name: string;
    url: string;
    page: string;
    ticket: string;
    license: string | null;
  }
> = {
  rail: {
    name: "Koleje Małopolskie",
    url: "https://www.kolejemalopolskie.com.pl/rozklady_jazdy/kml-ska-gtfs.zip",
    page: "https://www.kolejemalopolskie.com.pl/pl/rozklady-jazdy/gtfs",
    ticket:
      "https://www.kolejemalopolskie.com.pl/pl/dla-pasazera/gdzie-kupic-bilet-kolejowy",
    license: null,
  },
  city: {
    name: "ZTP Kraków / MPK",
    url: "https://gtfs.ztp.krakow.pl/GTFS_KRK_A.zip",
    page: "https://ztp.krakow.pl/dane-otwarte",
    ticket: "https://ztp.krakow.pl/kmk/kup-bilet-kmk",
    license: null,
  },
  coach: {
    name: "FlixBus / FlixMobility Tech GmbH",
    url: "https://gtfs.gis.flix.tech/gtfs_generic_eu.zip",
    page: "https://transport.data.gouv.fr/datasets/flixbus-horaires-theoriques-du-reseau-europeen-1/?locale=en",
    ticket: "https://www.flixbus.pl/",
    license: "ODbL-1.0",
  },
};
export const airport: Place = {
  id: "airport",
  name: { pl: "Kraków Balice", en: "Kraków Airport" },
  group: "krakow",
  aliases: {
    rail: ["KRAKÓW LOTNISKO"],
    city: ["Kraków Airport"],
    coach: ["Krakow, Krakow-Balice Airport"],
  },
};
export const places: Place[] = [
  {
    id: "krakow-glowny",
    name: { pl: "Kraków Główny · dworzec", en: "Kraków Główny · main station" },
    group: "krakow",
    aliases: {
      rail: ["KRAKÓW GŁÓWNY"],
      city: ["Dworzec Główny Wschód"],
      coach: ["Krakow, MDA Bus Station"],
    },
  },
  {
    id: "muzeum-narodowe",
    name: { pl: "Kraków · Muzeum Narodowe", en: "Kraków · National Museum" },
    group: "krakow",
    aliases: { city: ["Muzeum Narodowe"] },
  },
  {
    id: "salwator",
    name: { pl: "Kraków · Salwator", en: "Kraków · Salwator" },
    group: "krakow",
    aliases: { city: ["Salwator"] },
  },
  {
    id: "bronowice",
    name: { pl: "Kraków · Bronowice", en: "Kraków · Bronowice" },
    group: "krakow",
    aliases: { rail: ["KRAKÓW BRONOWICE"] },
  },
  {
    id: "plaszow",
    name: { pl: "Kraków · Płaszów", en: "Kraków · Płaszów" },
    group: "krakow",
    aliases: { rail: ["KRAKÓW PŁASZÓW"] },
  },
  {
    id: "wieliczka",
    name: { pl: "Wieliczka · Rynek-Kopalnia", en: "Wieliczka · Salt Mine" },
    group: "region",
    aliases: { rail: ["WIELICZKA RYNEK-KOPALNIA"] },
  },
  {
    id: "zakopane",
    name: { pl: "Zakopane", en: "Zakopane" },
    group: "region",
    aliases: { rail: ["ZAKOPANE"], coach: ["Zakopane, Bus station"] },
  },
  {
    id: "nowy-targ",
    name: { pl: "Nowy Targ", en: "Nowy Targ" },
    group: "region",
    aliases: {
      rail: ["NOWY TARG"],
      coach: ["Nowy Targ, Bus Station", "Nowy Targ, Bus station", "Nowy Targ"],
    },
  },
  {
    id: "katowice",
    name: { pl: "Katowice · dworzec", en: "Katowice · main station" },
    group: "region",
    aliases: { coach: ["Katowice, Bus Station Sadowa"] },
  },
  {
    id: "katowice-airport",
    name: { pl: "Katowice · lotnisko Pyrzowice", en: "Katowice · airport" },
    group: "region",
    aliases: { coach: ["Pyrzowice, Katowice Airport"] },
  },
  {
    id: "rzeszow",
    name: { pl: "Rzeszów · dworzec", en: "Rzeszów · main station" },
    group: "region",
    aliases: { rail: ["RZESZÓW GŁÓWNY"], coach: ["Rzeszow, Bus Station"] },
  },
  {
    id: "tarnow",
    name: { pl: "Tarnów", en: "Tarnów" },
    group: "region",
    aliases: { rail: ["TARNÓW"], coach: ["Tarnow, Dworzec Autobusowy"] },
  },
  {
    id: "bochnia",
    name: { pl: "Bochnia", en: "Bochnia" },
    group: "region",
    aliases: { rail: ["BOCHNIA"], coach: ["Bochnia"] },
  },
  {
    id: "brzesko",
    name: { pl: "Brzesko · Okocim", en: "Brzesko · Okocim" },
    group: "region",
    aliases: { rail: ["BRZESKO OKOCIM"], coach: ["Brzesko, Bus Station"] },
  },
  {
    id: "skawina",
    name: { pl: "Skawina", en: "Skawina" },
    group: "region",
    aliases: { rail: ["SKAWINA"] },
  },
  {
    id: "oswiecim",
    name: { pl: "Oświęcim", en: "Oświęcim" },
    group: "region",
    aliases: { rail: ["OŚWIĘCIM"] },
  },
  {
    id: "nowy-sacz",
    name: { pl: "Nowy Sącz", en: "Nowy Sącz" },
    group: "region",
    aliases: { rail: ["NOWY SĄCZ"], coach: ["Nowy Sacz, Bus Station"] },
  },
  {
    id: "krynica",
    name: { pl: "Krynica-Zdrój", en: "Krynica-Zdrój" },
    group: "region",
    aliases: {
      rail: ["KRYNICA-ZDRÓJ"],
      coach: ["Krynica-Zdroj", "Krynica Zdroj"],
    },
  },
];
export function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/gi, "l")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
export function matchPlace(name: string, source: SourceId): Place | undefined {
  const normalized = normalizeName(name);
  return [airport, ...places].find((p) =>
    p.aliases[source]?.some((alias) => normalizeName(alias) === normalized),
  );
}
export const findPlace = (id: string) =>
  [airport, ...places].find((p) => p.id === id);
