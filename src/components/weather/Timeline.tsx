"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { levelLabel, text } from "@/lib/weather/copy";
import type { Locale, Operation, Period } from "@/lib/weather/model";
import { scenarioDescription, weatherSymbol } from "@/lib/weather/presentation";
import { formatTime, zone } from "@/lib/weather/time";
import { possibleWorsening, timelineSegments } from "@/lib/weather/timeline";
import { Icon } from "./Icon";
import { TimelineHelp } from "./TimelineHelp";

export function Timeline({
  periods,
  locale,
  operation,
  selected,
  onOperation,
  onSelect,
  children,
}: {
  periods: Period[];
  locale: Locale;
  operation: Operation;
  selected: string | null;
  onOperation: (operation: Operation) => void;
  onSelect: (at: string) => void;
  children?: ReactNode;
}) {
  const t = text[locale];
  const segments = timelineSegments(periods);
  const start = periods.length
    ? Math.min(...periods.map((p) => Date.parse(p.start)))
    : 0;
  const end = periods.length
    ? Math.max(...periods.map((p) => Date.parse(p.end)))
    : 0;
  const [preview, setPreview] = useState<string | null>(null);
  const [keyboardAt, setKeyboardAt] = useState<string | null>(null);
  const duration = Math.max(end - start, 1);
  const scroll = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<{
    left: boolean;
    right: boolean;
    at: number | null;
    until: number | null;
    millisecondsPerPixel: number | null;
  }>({
    left: false,
    right: true,
    at: null,
    until: null,
    millisecondsPerPixel: null,
  });
  const updateEdges = useCallback(() => {
    const node = scroll.current;
    if (node) {
      const width =
        (node.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
      setEdges({
        left: node.scrollLeft > 2,
        right: node.scrollLeft + node.clientWidth < node.scrollWidth - 2,
        at: width
          ? Math.min(end - 1, start + (node.scrollLeft / width) * duration)
          : start,
        until: width
          ? Math.min(
              end,
              start + ((node.scrollLeft + node.clientWidth) / width) * duration,
            )
          : end,
        millisecondsPerPixel: width ? duration / width : null,
      });
    }
  }, [start, end, duration]);
  useEffect(() => {
    const node = scroll.current;
    if (!node) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(node);
    return () => observer.disconnect();
  }, [updateEdges]);
  useEffect(() => {
    const node = scroll.current;
    const chosen = node?.querySelector<HTMLButtonElement>(
      "button[aria-pressed=true]",
    );
    if (
      node &&
      chosen &&
      (chosen.offsetLeft < node.scrollLeft ||
        chosen.offsetLeft + chosen.offsetWidth >
          node.scrollLeft + node.clientWidth)
    )
      node.scrollTo({
        left: Math.max(0, chosen.offsetLeft - node.clientWidth / 3),
        behavior: "auto",
      });
  }, [selected, start]);
  const move = (direction: number) => {
    const node = scroll.current;
    if (node)
      node.scrollBy({
        left: direction * node.clientWidth * 0.75,
        behavior: "auto",
      });
  };
  const percent = (at: string | number) =>
    (((typeof at === "number" ? at : Date.parse(at)) - start) / duration) * 100;
  const ticks: number[] = [];
  for (let at = Math.ceil(start / 3600000) * 3600000; at < end; at += 3600000)
    ticks.push(at);
  const date = new Intl.DateTimeFormat(locale === "pl" ? "pl-PL" : "en-GB", {
    timeZone: zone,
    day: "numeric",
    month: "short",
  });
  const timeWithZone = new Intl.DateTimeFormat(
    locale === "pl" ? "pl-PL" : "en-GB",
    {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    },
  );
  const duplicateTimes = ticks.map((at) =>
    formatTime(new Date(at).toISOString(), locale, true),
  );
  const selectedSegment = selected
    ? segments.find(
        (s) =>
          Date.parse(s.start) <= Date.parse(selected) &&
          Date.parse(selected) < Date.parse(s.end),
      )
    : null;
  const validPreview =
    preview &&
    segments.some(
      (s) =>
        Date.parse(s.start) <= Date.parse(preview) &&
        Date.parse(preview) < Date.parse(s.end),
    )
      ? preview
      : null;
  const readoutAt =
    validPreview ??
    selected ??
    (segments.length ? new Date(edges.at ?? start).toISOString() : null);
  const showPreview = validPreview !== null && readoutAt !== selected;
  const readoutSegment = readoutAt
    ? segments.find(
        (s) =>
          Date.parse(s.start) <= Date.parse(readoutAt) &&
          Date.parse(readoutAt) < Date.parse(s.end),
      )
    : null;
  const readoutPeriod = readoutSegment?.period;
  const tabStop = segments.some((s) => s.start === keyboardAt)
    ? keyboardAt
    : (selectedSegment?.start ?? segments[0]?.start);
  const hasShortChanges = segments.some(
    (s, i) =>
      i > 0 &&
      i < segments.length - 1 &&
      Date.parse(s.end) - Date.parse(s.start) < 30 * 60000,
  );
  const readoutIndex = readoutSegment ? segments.indexOf(readoutSegment) : -1;
  const choose = (at: string, until: string, now: number) => {
    const value = Math.max(Date.parse(at), now + 1000);
    if (value < Date.parse(until)) onSelect(new Date(value).toISOString());
  };
  const navigate = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const buttons = [
      ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
        ".timeline-column, .timeline-gap",
      ),
    ];
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    if (index < 0) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : Math.max(
              0,
              Math.min(
                buttons.length - 1,
                index + (event.key === "ArrowRight" ? 1 : -1),
              ),
            );
    const button = buttons[next];
    button.focus({ preventScroll: true });
    const node = scroll.current;
    if (
      node &&
      (button.offsetLeft < node.scrollLeft ||
        button.offsetLeft + button.offsetWidth >
          node.scrollLeft + node.clientWidth)
    )
      node.scrollLeft = Math.max(0, button.offsetLeft - node.clientWidth / 3);
  };
  return (
    <section className="panel timeline" aria-labelledby="timeline-title">
      <div className="section-heading timeline-heading">
        <TimelineHelp locale={locale} />
        <div
          className="timeline-direction"
          role="group"
          aria-label={t.travelDirection}
        >
          {(["departure", "arrival"] as const).map((op) => (
            <button
              key={op}
              type="button"
              aria-pressed={op === operation}
              onClick={() => onOperation(op)}
            >
              <Icon name={op} />
              {t[op]}
            </button>
          ))}
        </div>
      </div>
      {!periods.length ? (
        <>
          <p>{t.unavailable}</p>
          {children}
        </>
      ) : (
        <div className="timeline-surface">
          <div className="timeline-navigation">
            <p>
              <span>{date.format(new Date(edges.at ?? start))}</span>
              <span className="muted">
                {locale === "pl" ? "Czas w Krakowie" : "Kraków local time"}
              </span>
            </p>
            <div>
              <button
                type="button"
                className="button secondary"
                aria-label={t.earlier}
                disabled={!edges.left}
                onClick={() => move(-1)}
              >
                <Icon name="left" />
              </button>
              <button
                type="button"
                className="button secondary"
                aria-label={t.later}
                disabled={!edges.right}
                onClick={() => move(1)}
              >
                <Icon name="right" />
              </button>
            </div>
          </div>
          <div
            className="timeline-scroll"
            ref={scroll}
            onScroll={updateEdges}
            onMouseLeave={() => setPreview(null)}
            onKeyDown={navigate}
            role="group"
            aria-label={
              locale === "pl"
                ? "Prognoza: strzałki zmieniają przedział, Enter wybiera czas"
                : "Forecast: arrow keys move between intervals, Enter selects a time"
            }
          >
            <div
              className="timeline-plot"
              style={{
                width: `calc(${duration / 3600000} * var(--hour-width))`,
              }}
            >
              <div className="timeline-axis" aria-hidden="true">
                {ticks.map((at, i) => {
                  const iso = new Date(at).toISOString();
                  const repeated =
                    duplicateTimes.indexOf(duplicateTimes[i]) !==
                    duplicateTimes.lastIndexOf(duplicateTimes[i]);
                  const dayStart =
                    new Intl.DateTimeFormat("en-GB", {
                      timeZone: zone,
                      hour: "2-digit",
                      hourCycle: "h23",
                    }).format(new Date(at)) === "00";
                  // Keep the grid visible, but never show a chopped hour at a
                  // scroll edge. 56 px covers the hour and its 6 px inset.
                  const hourVisible =
                    edges.at === null ||
                    edges.until === null ||
                    edges.millisecondsPerPixel === null ||
                    (at >= edges.at &&
                      at + 56 * edges.millisecondsPerPixel <= edges.until);
                  return (
                    <span
                      key={at}
                      className={`timeline-tick ${dayStart ? "day-start" : ""}`}
                      style={{ left: `${percent(at)}%` }}
                    >
                      <span
                        className="axis-hour"
                        style={{
                          visibility: hourVisible ? "visible" : "hidden",
                        }}
                      >
                        {formatTime(iso, locale)}
                      </span>
                      {repeated && (
                        <span
                          className={`axis-zone ${dayStart || i === 0 ? "with-date" : ""}`}
                          style={{
                            visibility: hourVisible ? "visible" : "hidden",
                          }}
                        >
                          {
                            timeWithZone
                              .formatToParts(new Date(at))
                              .find((p) => p.type === "timeZoneName")?.value
                          }
                        </span>
                      )}
                      {(dayStart || i === 0) && (
                        <span
                          className="axis-date"
                          style={{
                            visibility: hourVisible ? "visible" : "hidden",
                          }}
                        >
                          {date.format(new Date(at))}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
              {segments.map((segment) => {
                const p = segment.period;
                const position = {
                  left: `${percent(segment.start)}%`,
                  width: `${((Date.parse(segment.end) - Date.parse(segment.start)) / duration) * 100}%`,
                };
                if (!p)
                  return (
                    <button
                      type="button"
                      key={segment.start}
                      className={`timeline-gap ${selectedSegment === segment ? "selected" : ""}`}
                      style={position}
                      tabIndex={segment.start === tabStop ? 0 : -1}
                      aria-pressed={selectedSegment === segment}
                      aria-label={`${locale === "pl" ? "Brak prognozy" : "No forecast"}: ${formatTime(segment.start, locale, true)} – ${formatTime(segment.end, locale, true)}`}
                      onMouseEnter={() => setPreview(segment.start)}
                      onFocus={() => {
                        setKeyboardAt(segment.start);
                        setPreview(segment.start);
                      }}
                      onBlur={() => setPreview(null)}
                      onClick={() => {
                        setPreview(null);
                        choose(segment.start, segment.end, Date.now());
                      }}
                    >
                      <span>
                        {locale === "pl" ? "Brak prognozy" : "No forecast"}
                      </span>
                    </button>
                  );
                const symbol = weatherSymbol(p.conditions);
                const level = p[operation].level;
                const worse = possibleWorsening(p, operation);
                const active =
                  selected !== null &&
                  Date.parse(selected) >= Date.parse(p.start) &&
                  Date.parse(selected) < Date.parse(p.end);
                const partial =
                  Date.parse(p.end) - Date.parse(p.start) < 30 * 60000;
                const scenarios = p.scenarios
                  .map(
                    (s) =>
                      `${scenarioDescription(s, locale)}: ${levelLabel(s[operation].level, locale)}`,
                  )
                  .join(". ");
                const label = `${t[operation]}, ${date.format(new Date(p.start))}, ${timeWithZone.format(new Date(p.start))} – ${timeWithZone.format(new Date(p.end))}. ${t.weatherNames[symbol.key]}. ${levelLabel(level, locale)}. ${scenarios}. ${p.source === "TAF" ? t.taf : t.model}`;
                return (
                  <button
                    type="button"
                    className={`timeline-column ${active ? "selected" : ""} ${partial ? "partial" : ""}`}
                    key={p.start}
                    style={position}
                    tabIndex={p.start === tabStop ? 0 : -1}
                    onMouseEnter={() => setPreview(p.start)}
                    onFocus={() => {
                      setKeyboardAt(p.start);
                      setPreview(p.start);
                    }}
                    onBlur={() => setPreview(null)}
                    aria-pressed={active}
                    aria-label={label}
                    onClick={() => {
                      setPreview(null);
                      choose(p.start, p.end, Date.now());
                    }}
                  >
                    <span className="column-weather">
                      <Icon name={symbol.icon} />
                    </span>
                    <span
                      className={`column-band signal-${level ?? "unknown"}`}
                    />
                    {worse !== undefined && (
                      <span
                        className={`column-possible-band signal-${worse ?? "unknown"}`}
                      />
                    )}
                  </button>
                );
              })}
              {selected && selectedSegment && (
                <span
                  className="timeline-selection-line"
                  style={{ left: `${percent(selected)}%` }}
                  aria-hidden="true"
                />
              )}
            </div>
          </div>
          {segments.some((s) => s.period === null) && (
            <p className="muted small">
              {locale === "pl" ? "Brak prognozy: " : "No forecast: "}
              {segments
                .filter((s) => s.period === null)
                .map(
                  (s) =>
                    `${formatTime(s.start, locale, true)} – ${formatTime(s.end, locale, true)}`,
                )
                .join("; ")}
            </p>
          )}
          {readoutAt && readoutSegment && (showPreview || hasShortChanges) && (
            <div className="timeline-readout">
              {hasShortChanges && (
                <div
                  className="readout-controls"
                  role="group"
                  aria-label={
                    locale === "pl"
                      ? "Przejdź między zmianami warunków"
                      : "Move between changes in conditions"
                  }
                >
                  <span className="muted small">
                    {locale === "pl" ? "Zmiany" : "Changes"}
                  </span>
                  {([-1, 1] as const).map((direction) => (
                    <button
                      key={direction}
                      type="button"
                      className="button secondary"
                      disabled={
                        readoutIndex + direction < 0 ||
                        readoutIndex + direction >= segments.length
                      }
                      aria-label={
                        locale === "pl"
                          ? direction < 0
                            ? "Poprzedni przedział"
                            : "Następny przedział"
                          : direction < 0
                            ? "Previous interval"
                            : "Next interval"
                      }
                      onClick={() => {
                        const s = segments[readoutIndex + direction];
                        setPreview(null);
                        choose(s.start, s.end, Date.now());
                      }}
                    >
                      <Icon name={direction < 0 ? "left" : "right"} />
                    </button>
                  ))}
                </div>
              )}
              {showPreview && (
                <>
                  <span className="readout-time">
                    <Icon name={operation} />
                    {t[operation]} · {formatTime(readoutAt, locale, true)}
                    {readoutAt !== selected &&
                      ` – ${formatTime(readoutSegment.end, locale)}`}
                  </span>
                  {readoutPeriod ? (
                    <>
                      <span className="readout-weather">
                        {
                          t.weatherNames[
                            weatherSymbol(readoutPeriod.conditions).key
                          ]
                        }
                      </span>
                      {readoutPeriod.source === "model" && (
                        <span className="muted small">{t.model}</span>
                      )}
                    </>
                  ) : (
                    <span className="muted">
                      {locale === "pl" ? "Brak prognozy" : "No forecast"}
                    </span>
                  )}
                </>
              )}
            </div>
          )}
          {children}
        </div>
      )}
    </section>
  );
}
