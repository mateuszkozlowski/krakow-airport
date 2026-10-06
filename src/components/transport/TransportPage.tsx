import Link from "next/link";
import { after } from "next/server";
import { readFeeds, refreshFeeds } from "@/lib/transport/feeds";
import { planJourney } from "@/lib/transport/engine";
import {
  defaultQuery,
  parseQuery,
  type QueryValues,
} from "@/lib/transport/query";
import { pageCopy } from "@/lib/transport/copy";
import { transportPath, type TransportPageKind } from "@/lib/transport/paths";
import type { Locale } from "@/lib/weather/model";
import { TransportPlanner } from "./TransportPlanner";
import { getConnectionWeather } from "@/lib/transport/weather-service";
export async function TransportPage({
  locale,
  kind,
  values,
}: {
  locale: Locale;
  kind: TransportPageKind;
  values: QueryValues;
}) {
  const copy = pageCopy[locale][kind];
  const query = parseQuery(values, defaultQuery(new Date(), kind));
  const [feeds, weather] = await Promise.all([
    readFeeds(),
    getConnectionWeather(query),
  ]);
  const initial = planJourney(feeds, query, undefined, new Date(), weather);
  after(async () => {
    await refreshFeeds();
  });
  const availablePlaces = [
    ...new Set(
      feeds.flatMap((f) => Object.values(f.stops).map((s) => s.place)),
    ),
  ];
  return (
    <div className="transport-page">
      <div className="hero">
        <h1>{copy.title}</h1>
        <nav
          className="transport-shortcuts"
          aria-label={
            locale === "pl" ? "Sytuacje w podróży" : "Travel situations"
          }
        >
          {(["transport", "night", "early", "zakopane"] as const)
            .filter((k) => k !== kind)
            .map((k) => (
              <Link key={k} href={transportPath(locale, k)}>
                {k === "transport"
                  ? locale === "pl"
                    ? "Wszystkie kierunki"
                    : "All destinations"
                  : k === "night"
                    ? locale === "pl"
                      ? "Przylot w nocy"
                      : "Late arrival"
                    : k === "early"
                      ? locale === "pl"
                        ? "Lot rano"
                        : "Early flight"
                      : "Zakopane"}
              </Link>
            ))}
        </nav>
      </div>
      <TransportPlanner
        key={`${locale}:${kind}`}
        initial={initial}
        locale={locale}
        kind={kind}
        availablePlaces={availablePlaces}
        initialConnection={
          typeof values.connection === "string" &&
          values.connection.length <= 600
            ? values.connection
            : ""
        }
      />
      <section
        className="transport-help"
        aria-label={
          locale === "pl" ? "Przydatne informacje" : "Useful information"
        }
      >
        {copy.faq.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
