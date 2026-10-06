import type { Locale, Snapshot } from "@/lib/weather/model";
import { visibilityTrend } from "@/lib/weather/visibility-trend";
import { formatTime } from "@/lib/weather/time";

export function VisibilityTrend({
  snapshot,
  locale,
}: {
  snapshot: Snapshot;
  locale: Locale;
}) {
  const trend =
    snapshot.sources.metar.state === "fresh"
      ? visibilityTrend(
          snapshot.history,
          snapshot.observed,
          snapshot.generatedAt,
        )
      : null;
  if (!trend || trend.points.every((p) => p.conditions.visibility! >= 5000))
    return null;
  const labels =
    locale === "pl"
      ? {
          improving: "Widoczność poprawia się",
          worsening: "Widoczność pogarsza się",
          variable: "Widoczność waha się",
          steady: "Widoczność bez zmian",
        }
      : {
          improving: "Visibility improving",
          worsening: "Visibility worsening",
          variable: "Visibility fluctuating",
          steady: "Visibility steady",
        };
  const first = Date.parse(trend.points[0].at),
    end = Date.parse(trend.points.at(-1)!.at);
  const coordinates = trend.points
    .map(
      (p) =>
        `${((Date.parse(p.at) - first) / (end - first)) * 100},${27 - (Math.min(10000, p.conditions.visibility!) / 10000) * 24}`,
    )
    .join(" ");
  return (
    <details className="visibility-trend">
      <summary>
        <span>{labels[trend.direction]}</span>
        <svg viewBox="-2 0 104 30" aria-hidden="true">
          <polyline
            points={coordinates}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
        <span className="muted small">{trend.minutes} min</span>
      </summary>
      <p className="muted small">
        {locale === "pl"
          ? "Ostatnie pomiary, nie prognoza końca mgły."
          : "Recent measurements, not a forecast of when fog will clear."}
      </p>
      <dl>
        {trend.points.map((p) => (
          <div key={p.at}>
            <dt>{formatTime(p.at, locale)}</dt>
            <dd>
              {p.conditions.visibility! >= 9999
                ? "≥ 10 km"
                : `${Math.round(p.conditions.visibility!)} m`}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
