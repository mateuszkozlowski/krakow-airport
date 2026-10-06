"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import type { Locale } from "@/lib/weather/model";
import type {
  Journey,
  Leg,
  PlannerResult,
  TripQuery,
} from "@/lib/transport/model";
import { places, sources } from "@/lib/transport/catalog";
import {
  clock,
  dateLabel,
  duration,
  routeLabel,
  stopLabel,
  walkingLink,
} from "@/lib/transport/display";
import { queryString, parseQuery } from "@/lib/transport/query";
import { transportPath, type TransportPageKind } from "@/lib/transport/paths";
import { journeyCalendar } from "@/lib/transport/calendar";
import { TransportIcon } from "./TransportIcon";
import { ConnectionWeather } from "./ConnectionWeather";

const savedKey = "krk:transport:plan:v1";
function delayLabel(leg: Leg, pl: boolean) {
  if (!leg.live) return pl ? "Rozkład" : "Scheduled";
  if (leg.departureDelay === 0)
    return pl ? "Zgodnie z rozkładem · dane na żywo" : "On time · live data";
  return `${leg.departureDelay! > 0 ? "+" : ""}${leg.departureDelay} min · ${pl ? "dane na żywo" : "live data"}`;
}
function JourneySummary({
  journey,
  locale,
}: {
  journey: Journey;
  locale: Locale;
}) {
  const pl = locale === "pl",
    first = journey.legs[0],
    last = journey.legs.at(-1)!;
  return (
    <>
      <span className="journey-time">
        <strong>{clock(journey.departure, locale)}</strong>
        <small>{dateLabel(journey.departure, locale)}</small>
      </span>
      <span className="journey-line">
        <span>
          {journey.legs.map((l, i) => (
            <span key={i}>
              <TransportIcon kind={l.mode} />
              <span>
                {l.mode === "bus"
                  ? l.route
                  : l.mode === "coach"
                    ? "FlixBus"
                    : l.mode === "replacement-bus"
                      ? pl
                        ? "Zastępczy"
                        : "Replacement"
                      : "KMŁ"}
              </span>
            </span>
          ))}
        </span>
        <span className="journey-line-rule" />
        <small>
          {duration(journey.durationMinutes, locale)} ·{" "}
          {journey.legs.length === 1
            ? pl
              ? "bez przesiadki"
              : "direct"
            : pl
              ? "1 przesiadka"
              : "1 change"}
        </small>
      </span>
      <span className="journey-time">
        <strong>
          {last.arrivalEstimated ? "~" : ""}
          {clock(journey.arrival, locale)}
        </strong>
        <small>{dateLabel(journey.arrival, locale)}</small>
      </span>
      <span className="sr-only">
        {stopLabel(first.from, locale)} → {stopLabel(last.to, locale)}.{" "}
        {delayLabel(first, pl)}
      </span>
    </>
  );
}
function JourneyDetails({
  journey,
  query,
  locale,
}: {
  journey: Journey;
  query: TripQuery;
  locale: Locale;
}) {
  const pl = locale === "pl";
  const ticketSources = [...new Set(journey.legs.map((l) => l.source))];
  return (
    <div className="journey-details">
      <ol className="journey-steps">
        {journey.legs.map((leg, i) => (
          <li key={`${leg.tripId}:${i}`}>
            {i > 0 && (
              <div className="journey-transfer">
                <TransportIcon kind="walk" />
                <div>
                  <strong>
                    {pl
                      ? "Przesiadka przy Krakowie Głównym"
                      : "Change at Kraków Główny"}
                  </strong>
                  <span>
                    {duration(journey.transferMinutes!, locale)} ·{" "}
                    {pl
                      ? `w tym co najmniej ${query.transfer} min na przejście`
                      : `including at least ${query.transfer} min to walk`}
                  </span>
                  <span>
                    {stopLabel(journey.legs[i - 1].to, locale)} →{" "}
                    {stopLabel(leg.from, locale)}
                  </span>
                </div>
              </div>
            )}
            <div className="journey-leg-heading">
              <span>
                <TransportIcon kind={leg.mode} />
                <strong>{routeLabel(leg, locale)}</strong>
              </span>
              <span className={leg.live ? "live-service" : "scheduled-service"}>
                {delayLabel(leg, pl)}
              </span>
            </div>
            {leg.headsign && (
              <p className="journey-headsign">
                {pl ? "Kierunek:" : "Towards:"}{" "}
                {leg.headsign === leg.headsign.toUpperCase()
                  ? leg.headsign
                      .toLocaleLowerCase("pl-PL")
                      .replace(/(^|[\s-])\p{L}/gu, (s) =>
                        s.toLocaleUpperCase("pl-PL"),
                      )
                  : leg.headsign}
              </p>
            )}
            <div className="journey-stop">
              <time dateTime={leg.departure}>
                {clock(leg.departure, locale)}
              </time>
              <div>
                <a
                  href={walkingLink(leg.from)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {stopLabel(leg.from, locale)}{" "}
                  <span aria-hidden="true">↗</span>
                  <span className="sr-only">
                    {pl ? " — mapa, nowa karta" : " — map, new tab"}
                  </span>
                </a>
                <small>
                  {dateLabel(leg.departure, locale)}
                  {leg.number ? ` · ${leg.number}` : ""}
                </small>
                {leg.platform && (
                  <small>
                    {pl
                      ? `W rozkładzie: ${leg.platform}`
                      : `Scheduled: ${leg.platform.replace(/peron/gi, "platform").replace(/tor/gi, "track")}`}
                  </small>
                )}
              </div>
            </div>
            <div className="journey-stop arrival-stop">
              <time dateTime={leg.arrival}>
                {leg.arrivalEstimated ? "~" : ""}
                {clock(leg.arrival, locale)}
              </time>
              <div>
                <a
                  href={walkingLink(leg.to)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {stopLabel(leg.to, locale)} <span aria-hidden="true">↗</span>
                  <span className="sr-only">
                    {pl ? " — mapa, nowa karta" : " — map, new tab"}
                  </span>
                </a>
                <small>
                  {dateLabel(leg.arrival, locale)}
                  {leg.arrivalEstimated
                    ? ` · ${pl ? "szacunek na podstawie opóźnienia odjazdu" : "estimated from departure delay"}`
                    : ""}
                </small>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className="journey-ticket-links">
        <span>{pl ? "Bilety:" : "Tickets:"}</span>
        {ticketSources.map((source) => (
          <a
            key={source}
            href={
              source === "coach" && !pl
                ? "https://www.flixbus.com/"
                : sources[source].ticket
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            {source === "rail"
              ? "KMŁ"
              : source === "city"
                ? "ZTP · MPK"
                : "FlixBus"}{" "}
            ↗
            <span className="sr-only">
              {pl ? " — nowa karta" : " — new tab"}
            </span>
          </a>
        ))}
      </div>
      {ticketSources.includes("coach") && (
        <p className="transport-note">
          {pl
            ? "Miejsca i cenę FlixBusa sprawdź przed wyborem połączenia."
            : "Check FlixBus seats and prices before choosing this connection."}
        </p>
      )}
    </div>
  );
}
export function TransportPlanner({
  initial,
  locale,
  kind,
  availablePlaces,
  initialConnection = "",
}: {
  initial: PlannerResult;
  locale: Locale;
  kind: TransportPageKind;
  availablePlaces: string[];
  initialConnection?: string;
}) {
  const pl = locale === "pl";
  const [query, setQuery] = useState(initial.query);
  const [result, setResult] = useState(initial);
  const [selectedId, setSelectedId] = useState(initialConnection);
  const selectedRef = useRef(initialConnection);
  const journeyRef = useRef<HTMLDivElement>(null);
  const weatherFocus = useRef(false);
  const [more, setMore] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState("");
  const [saved, setSaved] = useState<TripQuery | null>(null);
  const initialKey = useRef(queryString(initial.query));
  const key = queryString(query);
  const current = queryString(result.query) === key ? result : null;
  const chosen =
    current?.journeys.find((j) => j.id === selectedId) ?? current?.journeys[0];
  const path = transportPath(locale, kind);
  const populatedPlaces = places.filter((p) => availablePlaces.includes(p.id));

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem(savedKey) ?? "null");
      if (
        data &&
        typeof data === "object" &&
        typeof data.date === "string" &&
        data.date >= new Date().toISOString().slice(0, 10)
      ) {
        const parsed = parseQuery(
          Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)]),
          ),
        );
        // Offer the saved plan explicitly; a shared link always wins.
        queueMicrotask(() => setSaved(parsed));
      }
    } catch {
      /* Storage is optional, including private browsing. */
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true,
      running = false;
    const load = async (scheduled: boolean) => {
      if (running) return;
      running = true;
      try {
        if (scheduled) {
          const response = await fetch(`/api/transport?${key}`, {
            signal: controller.signal,
            cache: "no-store",
          });
          if (!response.ok) throw new Error("Timetable unavailable");
          const data = (await response.json()) as PlannerResult;
          if (!active) return;
          setResult(data);
          setError(false);
          initialKey.current = key;
          window.history.replaceState(
            null,
            "",
            `${path}?${key}${selectedRef.current ? "&connection=" + encodeURIComponent(selectedRef.current) : ""}`,
          );
          track("transport_search", {
            direction: data.query.direction,
            place: data.query.place,
            results: data.journeys.length,
            locale,
          });
          if (data.issue) return;
        }
        const response = await fetch(`/api/transport?${key}&live=1`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.ok) {
          const data = (await response.json()) as PlannerResult;
          if (active) setResult(data);
        }
      } catch {
        if (active && scheduled) setError(true);
      } finally {
        running = false;
      }
    };
    const timer = setTimeout(() => {
      void load(key !== initialKey.current || revision > 0);
    }, 350);
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 60000);
    return () => {
      active = false;
      clearTimeout(timer);
      clearInterval(poll);
      controller.abort();
    };
  }, [key, path, locale, revision]);
  useEffect(() => {
    if (!current || !weatherFocus.current) return;
    weatherFocus.current = false;
    const target =
      document.querySelector<HTMLAnchorElement>(".weather-toggle") ??
      journeyRef.current;
    target?.focus({ preventScroll: true });
  }, [current]);
  function change(patch: Partial<TripQuery>) {
    weatherFocus.current =
      patch.weather !== undefined &&
      !!document.activeElement?.classList.contains("weather-toggle");
    selectedRef.current = "";
    setQuery((previous) => ({ ...previous, ...patch }));
    setSelectedId("");
    setMore(false);
    setStatus("");
    setError(false);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    setRevision((n) => n + 1);
  }
  async function share() {
    const url = `${window.location.origin}${path}?${key}${chosen ? "&connection=" + encodeURIComponent(chosen.id) : ""}`;
    try {
      if (navigator.share)
        await navigator.share({
          title: pl ? "Dojazd · Kraków Balice" : "Kraków Airport transport",
          url,
        });
      else {
        await navigator.clipboard.writeText(url);
        setStatus(pl ? "Link skopiowany." : "Link copied.");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setStatus(
          pl
            ? "Udostępnianie jest niedostępne. Skopiuj adres strony z paska przeglądarki."
            : "Sharing is unavailable. Copy the page address from your browser.",
        );
    }
  }
  function chooseConnection(j: Journey) {
    setSelectedId(j.id);
    selectedRef.current = j.id;
    window.history.replaceState(
      null,
      "",
      `${path}?${key}&connection=${encodeURIComponent(j.id)}`,
    );
    requestAnimationFrame(() => {
      journeyRef.current?.focus({ preventScroll: true });
      journeyRef.current?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    });
    track("transport_connection", {
      mode: j.legs.map((l) => l.mode).join("+"),
      transfer: j.legs.length > 1,
    });
  }
  function save() {
    try {
      localStorage.setItem(savedKey, JSON.stringify(query));
      setSaved(query);
      setStatus(
        pl ? "Plan zapisany na tym urządzeniu." : "Plan saved on this device.",
      );
    } catch {
      setStatus(
        pl
          ? "Przeglądarka nie pozwala zapisać planu. Możesz skopiować link."
          : "This browser cannot save the plan. You can copy its link.",
      );
    }
  }
  function calendar() {
    if (!chosen) return;
    const url = URL.createObjectURL(
      new Blob([journeyCalendar(chosen, query, locale)], {
        type: "text/calendar;charset=utf-8",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "krk-dojazd.ics";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const issue = current?.issue;
  const issueText =
    issue === "dst-time"
      ? pl
        ? "Ta godzina przypada na zmianę czasu. Wybierz jej pierwsze lub drugie wystąpienie poniżej; jeśli godzina nie istnieje, popraw ją."
        : "This time falls on a clock change. Choose its first or second occurrence below; if the time does not exist, correct it."
      : issue === "past"
        ? pl
          ? "Ten czas już minął. Wybierz późniejszą godzinę lotu."
          : "This time has passed. Choose a later flight time."
        : issue
          ? pl
            ? "Sprawdź datę i godzinę na bilecie."
            : "Check the date and time on your ticket."
          : null;
  return (
    <section
      className="transport-planner"
      aria-label={pl ? "Planer dojazdu" : "Journey planner"}
    >
      <form
        id="transport-form"
        className="transport-form"
        action={path}
        method="get"
        onSubmit={submit}
      >
        <fieldset className="transport-direction">
          <legend className="sr-only">
            {pl ? "Kierunek podróży" : "Journey direction"}
          </legend>
          {(["from-airport", "to-airport"] as const).map((direction) => (
            <label key={direction}>
              <input
                type="radio"
                name="direction"
                value={direction}
                checked={query.direction === direction}
                onChange={() =>
                  change({
                    direction,
                    buffer: direction === "to-airport" ? 120 : 45,
                    delay: 0,
                  })
                }
              />
              <span>
                {direction === "from-airport"
                  ? pl
                    ? "Po przylocie"
                    : "After landing"
                  : pl
                    ? "Na odlot"
                    : "Before flying"}
              </span>
            </label>
          ))}
        </fieldset>
        <div className="transport-fields">
          <label className="transport-place">
            {query.direction === "from-airport"
              ? pl
                ? "Dokąd jedziesz?"
                : "Where are you going?"
              : pl
                ? "Skąd jedziesz?"
                : "Where are you starting?"}
            <select
              name="place"
              value={query.place}
              onChange={(e) => change({ place: e.target.value })}
            >
              {(["krakow", "region"] as const).map((group) => (
                <optgroup
                  key={group}
                  label={
                    group === "krakow"
                      ? "Kraków"
                      : pl
                        ? "Dalsza podróż"
                        : "Further afield"
                  }
                >
                  {populatedPlaces
                    .filter((p) => p.group === group)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name[locale]}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>
            {pl ? "Data lotu" : "Flight date"}
            <input
              type="date"
              required
              name="date"
              value={query.date}
              onChange={(e) => change({ date: e.target.value, fold: "auto" })}
            />
          </label>
          <label>
            {query.direction === "from-airport"
              ? pl
                ? "Przylot na bilecie"
                : "Landing time on ticket"
              : pl
                ? "Odlot na bilecie"
                : "Departure time on ticket"}
            <input
              type="time"
              required
              name="time"
              value={query.time}
              onChange={(e) => change({ time: e.target.value, fold: "auto" })}
            />
          </label>
        </div>
        <div className="transport-margins">
          <label>
            {query.direction === "from-airport"
              ? pl
                ? "Na bagaż i wyjście"
                : "For luggage and exit"
              : pl
                ? "Na lotnisku przed odlotem"
                : "At the airport before flying"}
            <select
              name="buffer"
              value={query.buffer}
              onChange={(e) => change({ buffer: +e.target.value })}
            >
              {[
                ...new Set([
                  ...(query.direction === "from-airport"
                    ? [20, 30, 45, 60, 90, 120]
                    : [60, 90, 120, 150, 180]),
                  query.buffer,
                ]),
              ]
                .sort((a, b) => a - b)
                .map((n) => (
                  <option key={n} value={n}>
                    {duration(n, locale)}
                  </option>
                ))}
            </select>
          </label>
          {query.direction === "from-airport" && (
            <label>
              {pl ? "A jeśli wyląduję później?" : "What if I land later?"}
              <select
                name="delay"
                value={query.delay}
                onChange={(e) => change({ delay: +e.target.value })}
              >
                {[...new Set([0, 15, 30, 60, 90, 120, 180, query.delay])]
                  .sort((a, b) => a - b)
                  .map((n) => (
                    <option key={n} value={n}>
                      {n === 0
                        ? pl
                          ? "O czasie"
                          : "As scheduled"
                        : `+${duration(n, locale)}`}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <details className="transport-adjustments">
            <summary>{pl ? "Czas na przesiadkę" : "Time to change"}</summary>
            <label className="sr-only" htmlFor="transfer-time">
              {pl
                ? "Minimum na przejście przy przesiadce"
                : "Minimum walking time for a change"}
            </label>
            <select
              id="transfer-time"
              name="transfer"
              value={query.transfer}
              onChange={(e) => change({ transfer: +e.target.value })}
            >
              {[...new Set([10, 15, 20, 30, 45, 60, query.transfer])]
                .sort((a, b) => a - b)
                .map((n) => (
                  <option key={n} value={n}>
                    {n} min
                  </option>
                ))}
            </select>
          </details>
          <button className="button transport-submit" type="submit">
            {pl ? "Sprawdź" : "Check"}
            <TransportIcon kind="arrow" />
          </button>
        </div>
        {issue === "dst-time" ? (
          <label className="transport-fold">
            {pl
              ? "Która godzina po zmianie czasu?"
              : "Which occurrence on the clock-change night?"}
            <select
              name="fold"
              value={query.fold}
              onChange={(e) =>
                change({ fold: e.target.value as TripQuery["fold"] })
              }
            >
              <option value="auto">{pl ? "Wybierz" : "Choose"}</option>
              <option value="first">
                {pl ? "Pierwsza · czas letni" : "First · summer time"}
              </option>
              <option value="second">
                {pl ? "Druga · czas zimowy" : "Second · winter time"}
              </option>
            </select>
          </label>
        ) : (
          <input type="hidden" name="fold" value={query.fold} />
        )}
        <input type="hidden" name="weather" value={query.weather} />
        <p className="transport-form-note">
          {pl
            ? "Godziny lokalne w Krakowie. Plan zaczyna się na wskazanej stacji lub przystanku."
            : "Kraków local time. Your plan starts at the selected station or stop."}
        </p>
      </form>
      {saved && queryString(saved) !== key && (
        <div className="transport-saved">
          <button onClick={() => change(saved)}>
            {pl ? "Wczytaj zapisany plan" : "Load saved plan"} · {saved.date}
          </button>
          <button
            aria-label={pl ? "Usuń zapisany plan" : "Remove saved plan"}
            onClick={() => {
              try {
                localStorage.removeItem(savedKey);
              } catch {}
              setSaved(null);
            }}
          >
            ×
          </button>
        </div>
      )}
      <div className="transport-result" aria-busy={!current && !error}>
        <div className="transport-result-heading">
          <h2>{pl ? "Twój dojazd" : "Your journey"}</h2>
          <span>
            {current?.readyAt && !issue ? (
              <>
                {query.direction === "from-airport"
                  ? pl
                    ? "Odjazdy od"
                    : "Departures from"
                  : pl
                    ? "Na lotnisku do"
                    : "At airport by"}{" "}
                <strong>{clock(current.readyAt, locale)}</strong> ·{" "}
                {dateLabel(current.readyAt, locale)}
              </>
            ) : (
              ""
            )}
          </span>
        </div>
        {!current && !error && (
          <div className="transport-loading" role="status">
            {pl ? "Sprawdzam połączenia…" : "Checking connections…"}
          </div>
        )}
        {error && (
          <p className="transport-empty" role="alert">
            {pl
              ? "Nie udało się odświeżyć połączeń. Spróbuj ponownie."
              : "Could not refresh connections. Please try again."}{" "}
            <button onClick={() => setRevision((n) => n + 1)}>
              {pl ? "Odśwież" : "Retry"}
            </button>
          </p>
        )}
        {issueText && (
          <p className="transport-empty" role="alert">
            {issueText}
          </p>
        )}
        {current?.flightAt && !issue && (
          <ConnectionWeather
            weather={current.weather}
            query={query}
            flightAt={current.flightAt}
            path={path}
            locale={locale}
            onChange={(weather) => change({ weather })}
          />
        )}
        {current && !issue && chosen && (
          <>
            <div
              className="journey-primary"
              ref={journeyRef}
              tabIndex={-1}
              role="group"
              aria-label={
                pl
                  ? "Wybrane połączenie — trasa i godziny"
                  : "Selected connection — route and times"
              }
            >
              <div className="journey-primary-label">
                <span>
                  {chosen.id !== current.journeys[0]?.id
                    ? pl
                      ? "Wybrane połączenie"
                      : "Selected connection"
                    : query.direction === "from-airport"
                      ? pl
                        ? "Najwcześniej na miejscu"
                        : "Earliest arrival"
                      : pl
                        ? "Późniejszy wyjazd z zapasem"
                        : "Later departure with time to spare"}
                </span>
                <span>
                  {query.direction === "from-airport"
                    ? `${pl ? "Od wyjścia do odjazdu:" : "From exit to departure:"} ${duration(chosen.waitMinutes, locale)}`
                    : `${pl ? "Dodatkowy zapas:" : "Extra time:"} ${duration(chosen.spareMinutes!, locale)}`}
                </span>
              </div>
              <div className="journey-summary">
                <JourneySummary journey={chosen} locale={locale} />
              </div>
              <JourneyDetails
                journey={chosen}
                query={{
                  ...query,
                  transfer: Math.max(
                    query.transfer,
                    current.weather.minTransfer,
                  ),
                }}
                locale={locale}
              />
            </div>
            {chosen.waitMinutes > 180 && (
              <p className="transport-note transport-long-wait">
                {pl
                  ? "Długie oczekiwanie. Sprawdź też innych przewoźników lub transport indywidualny."
                  : "A long wait. Consider other operators or private transport as well."}
              </p>
            )}
            {chosen.spareMinutes !== null && chosen.spareMinutes > 180 && (
              <p className="transport-note transport-long-wait">
                {pl
                  ? "To dojazd znacznie wcześniej niż potrzebujesz. Sprawdź też inne możliwości podróży w nocy."
                  : "This arrives much earlier than needed. Consider other ways to travel at night too."}
              </p>
            )}
            {current.journeys.length > 1 && (
              <div className="journey-alternatives">
                <h3>{pl ? "Inne połączenia" : "Other connections"}</h3>
                {current.journeys
                  .filter((j) => j.id !== chosen.id)
                  .slice(0, more ? 7 : 3)
                  .map((j) => (
                    <button
                      key={j.id}
                      type="submit"
                      form="transport-form"
                      name="connection"
                      value={j.id}
                      aria-label={`${pl ? "Wybierz połączenie" : "Choose connection"} ${clock(j.departure, locale)}, ${dateLabel(j.departure, locale)} → ${clock(j.arrival, locale)}, ${dateLabel(j.arrival, locale)}, ${j.legs.map((l) => routeLabel(l, locale)).join(" + ")}`}
                      onClick={(event) => {
                        event.preventDefault();
                        chooseConnection(j);
                      }}
                    >
                      <JourneySummary journey={j} locale={locale} />
                    </button>
                  ))}
              </div>
            )}
            {current.journeys.length > 4 && (
              <button
                className="transport-more"
                type="button"
                aria-expanded={more}
                onClick={() => setMore((value) => !value)}
              >
                {more
                  ? pl
                    ? "Pokaż mniej"
                    : "Show less"
                  : pl
                    ? "Kolejne połączenia"
                    : "More connections"}
              </button>
            )}
            <div className="transport-tools">
              <button onClick={share}>{pl ? "Udostępnij" : "Share"}</button>
              <button onClick={save}>{pl ? "Zapisz plan" : "Save plan"}</button>
              <button onClick={calendar}>
                {pl ? "Do kalendarza" : "Add to calendar"}
              </button>
            </div>
          </>
        )}
        {current && !issue && !chosen && (
          <p className="transport-empty">
            {current.feeds.every((f) =>
              ["outside-range", "unavailable"].includes(f.state),
            )
              ? pl
                ? "Nie mamy jeszcze rozkładu na tę datę. Sprawdź u przewoźnika."
                : "Timetables for this date are not available here yet. Check with the operator."
              : pl
                ? "Nie znaleźliśmy pasującego połączenia w dostępnych rozkładach. Sprawdź innych przewoźników lub zmień czas i miejsce podróży."
                : "No matching connection in the available timetables. Check other operators or adjust your time and destination."}
          </p>
        )}
        <p className="transport-status" role="status" aria-live="polite">
          {status}
        </p>
        {current && !issue && (
          <p className="transport-note">
            {pl
              ? "Godziny z rozkładu, chyba że przy kursie zaznaczono dane na żywo. Przy przesiadce bilety mogą być osobne."
              : "Times are scheduled unless a service is marked as live. Separate tickets may be needed for a change."}
          </p>
        )}
      </div>
      <details className="transport-sources">
        <summary>
          {pl ? "Rozkłady i źródła danych" : "Timetables and data sources"}
        </summary>
        <ul>
          {(current ?? result).feeds.map((feed) => (
            <li key={feed.source}>
              <a href={sources[feed.source].page}>
                {sources[feed.source].name}
              </a>
              <span>
                {feed.checkedAt
                  ? `${pl ? "Sprawdzono" : "Checked"} ${dateLabel(feed.checkedAt, locale)}, ${clock(feed.checkedAt, locale)}`
                  : pl
                    ? "Brak rozkładu"
                    : "No timetable"}
                {feed.validUntil
                  ? ` · ${pl ? "kursy do" : "services through"} ${feed.validUntil}`
                  : ""}
                {feed.state === "outside-range"
                  ? ` · ${pl ? "poza zakresem wybranej daty" : "outside your selected date"}`
                  : feed.state === "unavailable"
                    ? ` · ${pl ? "źródło niedostępne" : "source unavailable"}`
                    : feed.state === "cached"
                      ? ` · ${pl ? "starszy zapis" : "older snapshot"}`
                      : ""}
              </span>
            </li>
          ))}
        </ul>
        <p>
          {pl
            ? "Opóźnienia autobusów: ZTP. Opóźnienia pociągów: Polskie Linie Kolejowe S.A. PLK uzupełnia ten sam kurs KMŁ; nie jest osobnym przewoźnikiem."
            : "Bus delays: ZTP. Train delays: Polskie Linie Kolejowe S.A. PLK enriches the same KMŁ service; it is not a separate operator."}
        </p>
        {current?.realtime.find((s) => s.source === "plk")?.state ===
          "inactive" && (
          <p>
            {pl
              ? "Połączenie z PLK czeka na aktywację. Pociągi pokazujemy według rozkładu KMŁ."
              : "The PLK connection is awaiting activation. Trains use the KMŁ timetable."}
          </p>
        )}
        <p>
          {pl
            ? "Rozkłady sprawdzamy automatycznie. Uwzględniamy KMŁ, linie miejskie 209, 300 i 902 oraz wybrane połączenia FlixBusa. Inni przewoźnicy mogą oferować dodatkowe kursy."
            : "Timetables are checked automatically. Coverage includes KMŁ, city routes 209, 300 and 902, and selected FlixBus services. Other operators may offer additional departures."}
        </p>
        <p>
          FlixMobility Tech GmbH ·{" "}
          <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL 1.0</a>{" "}
          ·{" "}
          <Link
            href="/api/transport/data"
            prefetch={false}
            download="krk-flixbus-odbl.json"
          >
            {pl
              ? "Pobierz używany zestaw danych FlixBusa"
              : "Download the FlixBus dataset used here"}
          </Link>
        </p>
      </details>
    </section>
  );
}
