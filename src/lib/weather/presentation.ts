import type { Conditions, Locale, Rvr, Scenario } from "./model";

export function windDescription(wind: Conditions["wind"], locale: Locale) {
  if (!wind) return locale === "pl" ? "Nie podano" : "Not reported";
  if (wind.speed === 0 && !wind.gust)
    return locale === "pl" ? "Bezwietrznie" : "Calm";
  if (wind.variable || wind.direction === null || wind.from !== undefined)
    return locale === "pl" ? "Zmienny kierunek" : "Changing direction";
  const names =
    locale === "pl"
      ? [
          "Z północy",
          "Z północnego wschodu",
          "Ze wschodu",
          "Z południowego wschodu",
          "Z południa",
          "Z południowego zachodu",
          "Z zachodu",
          "Z północnego zachodu",
        ]
      : [
          "From the north",
          "From the northeast",
          "From the east",
          "From the southeast",
          "From the south",
          "From the southwest",
          "From the west",
          "From the northwest",
        ];
  return names[Math.round(wind.direction / 45) % 8];
}
export function windSpeed(knots: number) {
  return `${Math.round(knots * 1.852)} km/h`;
}
export function scenarioDescription(
  s: Pick<Scenario, "kind" | "probability">,
  locale: Locale,
) {
  if (s.probability !== null)
    return locale === "pl"
      ? `${s.probability}% szans na te warunki${s.kind.includes("TEMPO") ? " chwilami" : ""}`
      : `${s.probability}% chance of these conditions${s.kind.includes("TEMPO") ? " at times" : ""}`;
  if (s.kind === "BECMG")
    return locale === "pl" ? "Stopniowa zmiana" : "Gradual change";
  return locale === "pl" ? "Warunki chwilami" : "Conditions at times";
}
export function runwayVisibility(r: Rvr, locale: Locale) {
  const bound = (q: Rvr["minQualifier"]) =>
    q === "M"
      ? locale === "pl"
        ? "poniżej "
        : "below "
      : q === "P"
        ? locale === "pl"
          ? "ponad "
          : "above "
        : "";
  return `${bound(r.minQualifier)}${r.min}${r.max === null ? "" : ` – ${bound(r.maxQualifier)}${r.max}`} m`;
}
export function runwayTrend(trend: string | null, locale: Locale) {
  const labels: Record<string, string> =
    locale === "pl"
      ? { U: "Poprawia się", D: "Pogarsza się", N: "Bez zmian" }
      : { U: "Improving", D: "Worsening", N: "Unchanged" };
  return trend ? (labels[trend] ?? "") : "";
}

export function weatherSymbol(c: Conditions) {
  if (c.weather.some((w) => w.includes("TS")))
    return { icon: "storm", key: "storm" } as const;
  if (c.weather.some((w) => /FZ(RA|DZ)/.test(w)))
    return { icon: "rain", key: "ice" } as const;
  if (c.weather.some((w) => /SN|SG|PL/.test(w)))
    return { icon: "snow", key: "snow" } as const;
  // Poor visibility alone does not establish fog; keep that distinction in labels.
  if (c.weather.some((w) => w.includes("FG")))
    return { icon: "fog", key: "fog" } as const;
  if (c.weather.includes("BR")) return { icon: "fog", key: "mist" } as const;
  if (c.weather.some((w) => /RA|DZ/.test(w)))
    return { icon: "rain", key: "rain" } as const;
  if (c.visibility !== null && c.visibility < 1500)
    return { icon: "visibility", key: "limited" } as const;
  if (c.ceiling !== null && c.ceiling < 1000)
    return { icon: "cloud", key: "lowCloud" } as const;
  if (c.wind && Math.max(c.wind.speed, c.wind.gust ?? 0) >= 25)
    return { icon: "wind", key: "wind" } as const;
  if (c.cavok) return { icon: "cloud", key: "clear" } as const;
  if (c.visibility !== null && c.visibility >= 9999)
    return { icon: "visibility", key: "goodVisibility" } as const;
  return { icon: "cloud", key: "unspecified" } as const;
}
