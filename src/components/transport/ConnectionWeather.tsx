import type { Locale } from "@/lib/weather/model";
import { text } from "@/lib/weather/copy";
import { clock } from "@/lib/transport/display";
import type {
  ConnectionWeather as Weather,
  TripQuery,
} from "@/lib/transport/model";
import { Icon } from "../weather/Icon";
import { queryString } from "@/lib/transport/query";
export function ConnectionWeather({
  weather,
  query,
  locale,
  flightAt,
  path,
  onChange,
}: {
  weather: Weather;
  query: TripQuery;
  locale: Locale;
  flightAt: string;
  path: string;
  onChange: (value: TripQuery["weather"]) => void;
}) {
  const pl = locale === "pl";
  const weatherUrl = `/${locale}?at=${encodeURIComponent(weather.at ?? flightAt)}&operation=${query.direction === "from-airport" ? "arrival" : "departure"}`;
  if (!weather.source)
    return (
      <p className="transport-weather-unknown">
        {pl
          ? "Brak aktualnej prognozy dla tej godziny."
          : "No current forecast for this time."}{" "}
        <a href={weatherUrl}>{pl ? "Pogoda" : "Weather"} ↗</a>
      </p>
    );
  const knownLabel =
    weather.label &&
    !["clear", "goodVisibility", "unspecified"].includes(weather.label)
      ? text[locale].weatherNames[
          weather.label as keyof typeof text.pl.weatherNames
        ]
      : null;
  const caution = (weather.level ?? 0) >= 3;
  return (
    <div className={`connection-weather${caution ? " caution" : ""}`}>
      <Icon name={weather.icon} />
      <div>
        <a href={weatherUrl}>
          {knownLabel
            ? `${knownLabel}${weather.possible ? (pl ? " · możliwe pogorszenie" : " · possible deterioration") : ""}`
            : pl
              ? "Pogoda na godzinę lotu"
              : "Weather at flight time"}{" "}
          <span>{clock(weather.at ?? flightAt, locale)} ↗</span>
        </a>
        {weather.extraMinutes > 0 && (
          <small>
            {pl
              ? `Dodano ${weather.extraMinutes} min zapasu po przylocie · minimum ${Math.max(query.transfer, weather.minTransfer)} min na przesiadkę.`
              : `Added ${weather.extraMinutes} min after landing · at least ${Math.max(query.transfer, weather.minTransfer)} min to change.`}
          </small>
        )}
        {weather.suggestedMinutes > 0 && weather.extraMinutes === 0 && (
          <small>
            {pl
              ? `Prognoza sugeruje dodatkowe ${weather.suggestedMinutes} min zapasu.`
              : `The forecast suggests an extra ${weather.suggestedMinutes} min allowance.`}
          </small>
        )}
        {caution && query.direction === "to-airport" && (
          <small>
            {pl
              ? "Przyjedź na odprawę według godziny na bilecie."
              : "Arrive for check-in based on the time on your ticket."}
          </small>
        )}
      </div>
      {weather.suggestedMinutes > 0 && (
        <a
          className="weather-toggle"
          href={`${path}?${queryString({ ...query, weather: weather.extraMinutes > 0 ? "off" : "auto" })}`}
          aria-label={
            weather.extraMinutes > 0
              ? pl
                ? "Wyłącz dodatkowy zapas na pogodę"
                : "Turn off the extra weather allowance"
              : pl
                ? "Dodaj zapas na pogodę"
                : "Add a weather allowance"
          }
          onClick={(event) => {
            event.preventDefault();
            onChange(weather.extraMinutes > 0 ? "off" : "auto");
          }}
        >
          {weather.extraMinutes > 0
            ? pl
              ? "Wyłącz"
              : "Turn off"
            : pl
              ? "Dodaj zapas"
              : "Add time"}
        </a>
      )}
    </div>
  );
}
