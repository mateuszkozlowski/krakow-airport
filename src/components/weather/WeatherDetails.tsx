import type { Conditions, Locale } from "@/lib/weather/model";
import { text } from "@/lib/weather/copy";
import {
  runwayTrend,
  runwayVisibility,
  windDescription,
  windSpeed,
} from "@/lib/weather/presentation";
import { Icon } from "./Icon";

export function WeatherDetails({
  conditions: c,
  locale,
}: {
  conditions: Conditions;
  locale: Locale;
}) {
  const t = text[locale];
  return (
    <dl className="weather-values">
      <div>
        <dt>
          <Icon name="visibility" />
          {t.visibility}
        </dt>
        <dd>
          {c.visibility === null
            ? "—"
            : c.visibility >= 9999
              ? "≥ 10 km"
              : `${Math.round(c.visibility)} m`}
        </dd>
      </div>
      <div>
        <dt>
          <Icon name="cloud" />
          {t.ceiling}
        </dt>
        <dd>
          {c.ceiling === null
            ? c.cavok
              ? t.noLowCloud
              : "—"
            : `${Math.round(c.ceiling * 0.3048)} m`}
        </dd>
        <span className="metric-note">
          {c.ceiling === null ? (c.cavok ? "" : t.notReported) : t.aboveGround}
        </span>
      </div>
      <div>
        <dt>
          <Icon
            name={
              c.wind?.variable ||
              c.wind?.direction === null ||
              c.wind?.from !== undefined
                ? "variable"
                : "wind"
            }
          />
          {t.wind}
        </dt>
        <dd>{c.wind ? windSpeed(c.wind.speed) : "—"}</dd>
        <span className="metric-note">
          {windDescription(c.wind, locale)}
          {c.wind?.gust ? ` · ${t.gusts} ${windSpeed(c.wind.gust)}` : ""}
        </span>
      </div>
      {c.rvr.map((r) => (
        <div key={r.runway}>
          <dt>
            <Icon name="runway" />
            {t.runway} {r.runway}
          </dt>
          <dd>{runwayVisibility(r, locale)}</dd>
          <span className="metric-note">{runwayTrend(r.trend, locale)}</span>
        </div>
      ))}
    </dl>
  );
}
