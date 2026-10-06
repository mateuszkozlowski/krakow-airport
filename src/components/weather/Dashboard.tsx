"use client";
import { useEffect, useState } from "react";
import type {
  Assessment,
  Locale,
  Operation,
  Period,
  Snapshot,
} from "@/lib/weather/model";
import { text, reasons, levelLabel } from "@/lib/weather/copy";
import { formatTime, localInput, warsawToUtc } from "@/lib/weather/time";
import { Reminder } from "./Reminder";
import { WeatherDetails as Details } from "./WeatherDetails";
import { Icon } from "./Icon";
import { scenarioDescription, weatherSymbol } from "@/lib/weather/presentation";
import { Timeline } from "./Timeline";
import { VisibilityTrend } from "./VisibilityTrend";

export function Risk({
  assessment,
  locale,
}: {
  assessment: Assessment;
  locale: Locale;
}) {
  return (
    <span className={`risk risk-${assessment.level ?? "unknown"}`}>
      {levelLabel(assessment.level, locale)}
    </span>
  );
}
function ReasonList({
  assessment,
  locale,
  codes = assessment.reasons,
}: {
  assessment: Assessment;
  locale: Locale;
  codes?: string[];
}) {
  return codes.length ? (
    <ul className="reasons">
      {codes.map((r) => (
        <li key={r}>
          {reasons[locale][r] ??
            (locale === "pl"
              ? "Inne utrudnienie pogodowe"
              : "Other weather disruption")}
        </li>
      ))}
    </ul>
  ) : null;
}
function Scenarios({
  period,
  operation,
  locale,
  compact = false,
}: {
  period: Period;
  operation: Operation;
  locale: Locale;
  compact?: boolean;
}) {
  const t = text[locale];
  const scenarios = compact
    ? period.scenarios.filter(
        (s) =>
          s[operation].level === null ||
          s[operation].level !== period[operation].level ||
          s[operation].reasons.some(
            (reason) => !period[operation].reasons.includes(reason),
          ),
      )
    : period.scenarios;
  return scenarios.length ? (
    <div className={`scenarios${compact ? " scenarios-compact" : ""}`}>
      {!compact && <strong>{t.temporary}</strong>}
      {scenarios.map((s, i) => (
        <div key={i}>
          <p>
            <Icon name={s.kind === "BECMG" ? "change" : "temporary"} />
            <strong>{scenarioDescription(s, locale)}</strong>
          </p>
          {!compact && (
            <>
              <p className="muted small">
                {s.probability !== null
                  ? t.scenarioChanceNote
                  : s.kind === "BECMG"
                    ? t.transition
                    : t.tempo}
              </p>
              <Risk assessment={s[operation]} locale={locale} />
            </>
          )}
          {compact && <Details conditions={s.conditions} locale={locale} />}
          <ReasonList assessment={s[operation]} locale={locale} />
        </div>
      ))}
    </div>
  ) : null;
}
function improvement(snapshot: Snapshot, operation: Operation) {
  const current = snapshot.current[operation].level;
  if (current === null || current < 3) return null;
  for (let i = 0; i < snapshot.forecast.length; i++) {
    const first = snapshot.forecast[i];
    if (
      first.source !== "TAF" ||
      first[operation].level === null ||
      first[operation].level! >= 3 ||
      first.scenarios.some(
        (s) => s[operation].level === null || s[operation].level! >= 3,
      )
    )
      continue;
    let end = Date.parse(first.end);
    for (let j = i + 1; j < snapshot.forecast.length; j++) {
      const p = snapshot.forecast[j];
      if (
        Date.parse(p.start) !== end ||
        p.source !== "TAF" ||
        p[operation].level === null ||
        p[operation].level! >= 3 ||
        p.scenarios.some(
          (s) => s[operation].level === null || s[operation].level! >= 3,
        )
      )
        break;
      end = Date.parse(p.end);
    }
    if (end - Date.parse(first.start) >= 2 * 3600000) return first.start;
  }
  return null;
}
export function Dashboard({
  initial,
  locale,
  initialTrip,
}: {
  initial: Snapshot;
  locale: Locale;
  initialTrip: { at: string | null; operation: Operation };
}) {
  const t = text[locale];
  const [snapshot, setSnapshot] = useState(initial);
  const [operation, setOperation] = useState<Operation>(initialTrip.operation);
  const [input, setInput] = useState(
    localInput(
      initialTrip.at ??
        new Date(Date.parse(initial.generatedAt) + 3 * 3600000).toISOString(),
    ),
  );
  const [selected, setSelected] = useState<string | null>(initialTrip.at);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch("/api/weather", {
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (data.version !== 2) throw new Error();
      setSnapshot(data);
      setError("");
    } catch {
      setError(t.failed);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 5 * 60000);
    return () => window.clearInterval(timer);
    // A locale navigation remounts the dashboard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);
  function check(e: React.FormEvent) {
    e.preventDefault();
    setShareMessage("");
    try {
      const at = warsawToUtc(input);
      if (Date.parse(at) < Date.now()) {
        setError(t.pastTime);
        setSelected(null);
        return;
      }
      setSelected(at);
      setError("");
      requestAnimationFrame(() =>
        document.getElementById("trip-result")?.focus(),
      );
      const url = new URL(window.location.href);
      url.searchParams.set("at", at);
      url.searchParams.set("operation", operation);
      window.history.replaceState(null, "", url);
    } catch {
      setSelected(null);
      setError(t.invalidTime);
    }
  }
  function chooseOperation(op: Operation) {
    setOperation(op);
    setShareMessage("");
    if (selected) {
      const url = new URL(window.location.href);
      url.searchParams.set("operation", op);
      window.history.replaceState(null, "", url);
    }
  }
  function chooseTimelineTime(at: string) {
    setSelected(at);
    setInput(localInput(at));
    setError("");
    setShareMessage("");
    const url = new URL(window.location.href);
    url.searchParams.set("at", at);
    url.searchParams.set("operation", operation);
    window.history.replaceState(null, "", url);
  }
  const slot = selected
    ? snapshot.forecast.find(
        (p) =>
          Date.parse(p.start) <= Date.parse(selected) &&
          Date.parse(p.end) > Date.parse(selected),
      )
    : null;
  const better = improvement(snapshot, operation);
  const currentReasons = [
    ...new Set([
      ...snapshot.current.arrival.reasons,
      ...snapshot.current.departure.reasons,
    ]),
  ];
  const ensemble = selected
    ? snapshot.ensemble.find(
        (p) => Math.abs(Date.parse(p.at) - Date.parse(selected)) <= 30 * 60000,
      )
    : null;
  const renderPeriod = (p: Period) => (
    <details className="forecast-row" key={p.start}>
      <summary>
        <span className="forecast-time">
          {formatTime(p.start, locale, true)} – {formatTime(p.end, locale)}
        </span>
        <span>
          <span className="small">
            <Icon name="arrival" />
            {t.arrival}
          </span>{" "}
          <Risk assessment={p.arrival} locale={locale} />
        </span>
        <span>
          <span className="small">
            <Icon name="departure" />
            {t.departure}
          </span>{" "}
          <Risk assessment={p.departure} locale={locale} />
        </span>
        {p.scenarios.length > 0 && (
          <span className="scenario-tag">
            {p.scenarios.map((s, i) => (
              <span className="scenario-item" key={i}>
                <Icon name={s.kind === "BECMG" ? "change" : "temporary"} />
                <span>
                  {t[operation]} · {scenarioDescription(s, locale)}
                </span>
                {s[operation].level !== p[operation].level && (
                  <Risk assessment={s[operation]} locale={locale} />
                )}
              </span>
            ))}
          </span>
        )}
      </summary>
      <div className="forecast-detail">
        <p className="muted">{p.source === "TAF" ? t.taf : t.model}</p>
        <h3>
          <Icon name={operation} />
          {t[operation]}
        </h3>
        <Details conditions={p.conditions} locale={locale} />
        <ReasonList assessment={p[operation]} locale={locale} />
        <Scenarios period={p} operation={operation} locale={locale} />
      </div>
    </details>
  );
  return (
    <>
      <Timeline
        periods={snapshot.forecast}
        locale={locale}
        operation={operation}
        selected={selected}
        onOperation={chooseOperation}
        onSelect={chooseTimelineTime}
      >
        {selected && (
          <section
            id="trip-result"
            className="trip-result"
            aria-labelledby="trip-result-title"
            aria-live="polite"
            tabIndex={-1}
          >
            <div className="trip-heading">
              <h3 id="trip-result-title">
                <Icon name={operation} />
                {t[operation]} · {formatTime(selected, locale, true)}
              </h3>
              {slot && (
                <span className="muted small">
                  {slot.source === "TAF" ? t.taf : t.model}
                </span>
              )}
            </div>
            {slot ? (
              <>
                <Details conditions={slot.conditions} locale={locale} />
                <ReasonList assessment={slot[operation]} locale={locale} />
                <Scenarios
                  period={slot}
                  operation={operation}
                  locale={locale}
                  compact
                />
                {ensemble && (
                  <details className="explanation">
                    <summary>{t.ensembleTitle}</summary>
                    <p className="small">
                      {locale === "pl"
                        ? `${ensemble.favourable} z ${ensemble.members} wariantów prognozy wskazuje wilgotne powietrze i słaby wiatr blisko tej godziny.`
                        : `${ensemble.favourable} of ${ensemble.members} forecast variants indicate humid air and light wind near this time.`}{" "}
                      {t.ensembleNote}
                    </p>
                  </details>
                )}
              </>
            ) : (
              <p>{t.noSlot}</p>
            )}
            <div className="trip-tools">
              <button
                className="trip-share"
                aria-label={t.share}
                onClick={async () => {
                  try {
                    const u = new URL(window.location.href);
                    u.searchParams.set("at", selected);
                    u.searchParams.set("operation", operation);
                    await navigator.clipboard.writeText(u.toString());
                    setShareMessage(t.copied);
                  } catch {
                    setShareMessage(t.copyFailed);
                  }
                }}
              >
                <Icon name="link" />
                {locale === "pl" ? "Skopiuj link" : "Copy link"}
              </button>
              <p role="status" className="small status-message">
                {shareMessage}
              </p>
              {Date.parse(selected) > Date.parse(snapshot.generatedAt) ? (
                <Reminder
                  at={selected}
                  operation={operation}
                  locale={locale}
                  compact
                />
              ) : (
                <p>{t.pastTime}</p>
              )}
            </div>
          </section>
        )}
      </Timeline>
      {better && (
        <p className="notice">
          {t.improvement} <strong>{formatTime(better, locale, true)}</strong>{" "}
          {t.improvementNote}
        </p>
      )}
      <div className="dashboard-top">
        <section className="planner" aria-labelledby="planner-title">
          <span id="planner-hint" className="sr-only">
            {locale === "pl" ? "Czas w Krakowie" : "Kraków local time"}
          </span>
          <form onSubmit={check}>
            <label>
              <span id="planner-title">{t.planner}</span>
              <input
                type="datetime-local"
                aria-describedby="planner-hint"
                aria-invalid={
                  error === t.invalidTime || error === t.pastTime || undefined
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                required
              />
            </label>
            <button className="button" aria-label={t.check} title={t.check}>
              <span className="planner-action-label">{t.check}</span>
              <Icon name="right" />
            </button>
          </form>
          {error && (
            <p role="status" className="notice">
              {error}
            </p>
          )}
        </section>
        <section className="current-section" aria-label={t.now}>
          <div className="current-toolbar">
            <details className="current-observation">
              <summary>
                <span className="current-heading">
                  <span>{t.now}</span>
                  <span className="muted small">
                    {snapshot.observed
                      ? formatTime(
                          snapshot.observed.at,
                          locale,
                          snapshot.sources.metar.state !== "fresh",
                        )
                      : t.unavailable}
                    {snapshot.sources.metar.state !== "fresh"
                      ? ` · ${t[snapshot.sources.metar.state]}`
                      : ""}
                  </span>
                </span>
                {snapshot.observed && (
                  <span className="current-reading muted small">
                    <Icon
                      name={weatherSymbol(snapshot.observed.conditions).icon}
                    />
                    {t.visibility}:{" "}
                    {snapshot.observed.conditions.visibility === null
                      ? "—"
                      : snapshot.observed.conditions.visibility >= 9999
                        ? "≥ 10 km"
                        : `${Math.round(snapshot.observed.conditions.visibility)} m`}
                  </span>
                )}
              </summary>
              {snapshot.observed && (
                <Details
                  conditions={snapshot.observed.conditions}
                  locale={locale}
                />
              )}
              <div className="risk-pair">
                {(["arrival", "departure"] as const).map((op) => (
                  <div className="risk-card" key={op}>
                    <h3>
                      <Icon name={op} />
                      {t[op]}
                    </h3>
                    <Risk assessment={snapshot.current[op]} locale={locale} />
                  </div>
                ))}
              </div>
            </details>
            <button
              className="button secondary"
              onClick={refresh}
              disabled={loading}
              aria-label={loading ? t.refreshing : t.refresh}
              title={t.refresh}
            >
              <Icon name="refresh" />
            </button>
          </div>
          <ReasonList
            assessment={snapshot.current[operation]}
            codes={currentReasons}
            locale={locale}
          />
          <VisibilityTrend snapshot={snapshot} locale={locale} />
          {snapshot.fogSignal &&
            !snapshot.observed?.conditions.weather.some((w) =>
              w.includes("FG"),
            ) && (
              <p className="notice">
                {snapshot.fogSignal === "increasing"
                  ? t.fogIncreasing
                  : t.fogPossible}
              </p>
            )}
        </section>
      </div>
      <p className="flight-status-link">
        {t.caution}{" "}
        <a
          href={`https://krakowairport.pl/${locale}#nav-${operation === "arrival" ? "arrivals" : "departures"}`}
        >
          {t.statusLink} ↗
        </a>
      </p>
      <details className="panel source-panel">
        <summary>{t.sources}</summary>
        <details className="forecast-details">
          <summary>
            {t.forecast}{" "}
            <span className="muted small">({snapshot.forecast.length})</span>
          </summary>
          {snapshot.forecast.length === 0 ? (
            <p>{t.unavailable}</p>
          ) : (
            <div className="forecast-list">
              {snapshot.forecast.map(renderPeriod)}
            </div>
          )}
          <p className="muted small">{t.limitNote}</p>
        </details>
        <ul className="source-list">
          {Object.entries(snapshot.sources).map(([key, s]) => (
            <li key={key}>
              <strong>
                {t.sourceNames[key as keyof typeof t.sourceNames]}
              </strong>{" "}
              · {t[s.state]}
              {s.fetchedAt ? ` · ${formatTime(s.fetchedAt, locale, true)}` : ""}
            </li>
          ))}
        </ul>
        <p className="muted small">{t.rvrNote}</p>
        <p className="muted small">
          {locale === "pl"
            ? "METAR to pomiar na lotnisku, a TAF to prognoza lotniskowa. TEMPO oznacza okresowe zmiany pogody, BECMG — stopniową zmianę, PROB30/40 — 30% lub 40% szans na dane warunki. Prognoza dla okolicy lotniska pochodzi z Open-Meteo i uzupełnia godziny bez prognozy lotniskowej. Nie zawiera widoczności na pasie ani podstawy chmur."
            : "METAR is an airport measurement and TAF is an airport forecast. TEMPO means temporary weather changes, BECMG a gradual change, and PROB30/40 a 30% or 40% chance of the weather. The forecast for the airport area comes from Open-Meteo and fills hours without an airport forecast. It has no runway visibility or cloud base."}
        </p>
        <details>
          <summary>{t.raw}</summary>
          <pre>{snapshot.observed?.raw ?? "—"}</pre>
          <pre>{snapshot.taf?.raw ?? "—"}</pre>
        </details>
      </details>
    </>
  );
}
