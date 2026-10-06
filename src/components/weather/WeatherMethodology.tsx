import Link from "next/link";
import type { Locale } from "@/lib/weather/model";
import { slugs } from "@/lib/weather/copy";

export function WeatherMethodology({ locale }: { locale: Locale }) {
  const pl = locale === "pl";
  return (
    <>
      <p className="intro">
        {pl
          ? "Wybierasz godzinę przylotu lub odlotu. Łączymy pomiary i prognozy dla Balic, żeby pokazać widzialność, chmury, wiatr i warunki, które mogą utrudnić lot."
          : "Choose an arrival or departure time. We combine Kraków Airport observations and forecasts to show visibility, clouds, wind and weather that could affect flying."}
      </p>
      <h2>
        {pl
          ? "Skąd są dane na osi?"
          : "Where does the timeline data come from?"}
      </h2>
      <ol className="explanation-steps">
        <li>
          <strong>{pl ? "Pomiar na lotnisku" : "Airport observation"}</strong>
          <p>
            {pl
              ? "Pokazuje, co dzieje się teraz w Balicach. Kolejne pomiary pozwalają sprawdzić, czy widoczność się poprawia, a powietrze staje się bardziej wilgotne. Ten komunikat nazywa się METAR."
              : "Shows what is happening at Kraków Airport now. Recent observations reveal whether visibility is improving and the air is becoming more humid. This report is called a METAR."}
          </p>
        </li>
        <li>
          <strong>{pl ? "Prognoza lotniskowa" : "Airport forecast"}</strong>
          <p>
            {pl
              ? "To prognoza przygotowana przez synoptyka dla tego lotniska. Jest głównym źródłem na osi, gdy obejmuje wybraną godzinę i jest aktualna. Uwzględniamy również zapisane w niej możliwe zmiany. Ten komunikat to TAF."
              : "A forecaster prepares this forecast specifically for the airport. It is the timeline’s main source when it is current and covers your time. We also preserve its possible weather changes. The report is called a TAF."}
          </p>
        </li>
        <li>
          <strong>
            {pl
              ? "Prognoza dla okolicy lotniska"
              : "Forecast for the airport area"}
          </strong>
          <p>
            {pl
              ? "Uzupełnia godziny bez dostępnej prognozy lotniskowej. Open-Meteo dostarcza przewidywania z modeli pogody dla współrzędnych Balic. Modele opisują warunki na większym obszarze; nie podają nam widoczności wzdłuż pasa ani podstawy chmur. Takie brakujące dane pokazujemy wprost."
              : "Fills hours without an available airport forecast. Open-Meteo supplies weather-model predictions for Kraków Airport’s coordinates. These models represent a wider area and do not provide runway visibility or cloud base in our data. We show these gaps explicitly."}
          </p>
        </li>
      </ol>
      <h2>{pl ? "Co wpływa na ocenę?" : "What affects the assessment?"}</h2>
      <dl className="explanation-factors">
        <div>
          <dt>{pl ? "Widzialność" : "Visibility"}</dt>
          <dd>
            {pl
              ? "Mgła i słaba widoczność mogą utrudnić podejście. Jeśli mamy pomiar wzdłuż pasa, pokazujemy go osobno — ogólna widzialność i widoczność na pasie to różne pomiary."
              : "Fog and poor visibility can make approaches harder. When available, runway visibility is shown separately: it differs from general visibility."}
          </dd>
        </div>
        <div>
          <dt>{pl ? "Niskie chmury" : "Low clouds"}</dt>
          <dd>
            {pl
              ? "Sprawdzamy podstawę warstwy chmur, która zasłania większość nieba. Pojedyncze nisko wiszące chmury nie oznaczają takiego samego ograniczenia."
              : "We consider the base of a cloud layer covering most of the sky. A few low clouds do not imply the same restriction."}
          </dd>
        </div>
        <div>
          <dt>{pl ? "Wiatr" : "Wind"}</dt>
          <dd>
            {pl
              ? "Liczy się kierunek względem pasa, a nie sama prędkość. Uwzględniamy składową boczną, porywy i zmienny kierunek. Silny wiatr w osi pasa może mieć inną ocenę niż wiatr wiejący w poprzek."
              : "Direction relative to the runway matters, not just speed. We consider crosswind, gusts and changing direction. Strong wind along the runway can receive a different assessment from wind blowing across it."}
          </dd>
        </div>
        <div>
          <dt>
            {pl ? "Burze i warunki zimowe" : "Thunderstorms and winter weather"}
          </dt>
          <dd>
            {pl
              ? "Burza lub marznący opad mogą spowolnić albo przerwać obsługę. Śnieg i odladzanie mogą wydłużyć oczekiwanie. Sam kod zjawiska nie daje podstaw do ogłoszenia zamknięcia lotniska."
              : "Thunderstorms or freezing precipitation can slow or interrupt handling. Snow and deicing can increase waiting times. A weather code alone does not establish that the airport is closed."}
          </dd>
        </div>
      </dl>
      <h2>
        {pl
          ? "Jak czytać możliwe zmiany?"
          : "How should I read possible changes?"}
      </h2>
      <p>
        {pl
          ? "Wypełnione pasmo pokazuje podstawową prognozę. Przerywany obrys oznacza możliwe gorsze warunki. Po wybraniu godziny zobaczysz je oddzielnie, żeby nie pomylić podstawowej prognozy z dodatkowym scenariuszem."
          : "The filled band shows the prevailing forecast. A dashed outline marks possible worse conditions. Select a time to see them separately, so the main forecast and an additional scenario stay distinct."}
      </p>
      <p>
        {pl
          ? "40% szans na mgłę oznacza szansę na takie warunki pogodowe. Nie oznacza 40% szans na odwołanie lotu. Gdy prognoza mówi tylko o zmianach okresowych lub stopniowych, nie dopisujemy jej wymyślonego procentu."
          : "A 40% chance of fog describes the weather, not a 40% chance of cancellation. When a forecast only describes temporary or gradual changes, we do not invent a percentage."}
      </p>
      <h2>{pl ? "A nasz model mgły?" : "What about our fog model?"}</h2>
      <p>
        {pl
          ? "Osobno testujemy model uczony na historii pomiarów z Balic. Sprawdzamy, czy potrafi przewidzieć bardzo słabą widzialność dwie godziny po ostatnim pomiarze. Na razie jego wynik nie zmienia ocen na osi ani powiadomień."
          : "We separately test a model trained on historical Kraków Airport observations. It predicts very poor visibility two hours after the latest reading. Its output does not yet change timeline assessments or notifications."}{" "}
        <Link href={`/${locale}/${slugs[locale].accuracy}`}>
          {pl
            ? "Zobacz, jak go uczymy i sprawdzamy →"
            : "See how we train and test it →"}
        </Link>
      </p>
      <details className="explanation">
        <summary>
          {pl
            ? "Progi i terminy dla zainteresowanych"
            : "Thresholds and terms explained"}
        </summary>
        <p>
          {pl
            ? "Cztery poziomy na osi wynikają z reguł oceny pogody. Nie są procentowym prawdopodobieństwem opóźnienia. Domyślne pasma ostrzegawcze widoczności na pasie (RVR) to 550 m dla przylotu i 300 m dla odlotu; podstawa chmur dla przylotu to 200 ft, czyli około 61 m. Progi są konfigurowalne i nie są minimami konkretnego samolotu lub załogi."
            : "The timeline’s four levels come from weather-assessment rules, not percentage probabilities of delay. Default runway visibility (RVR) advisory bands are 550 m for arrivals and 300 m for departures; the arrival cloud-base band is 200 ft, about 61 m. Thresholds are configurable and are not aircraft or crew-specific minima."}
        </p>
        <p>
          {pl
            ? "TEMPO oznacza okresowe zmiany, BECMG stopniową zmianę w podanym przedziale, a FM nowe warunki od wskazanej godziny. Podczas stopniowej zmiany zachowujemy wcześniejsze warunki i pokazujemy możliwy stan po zmianie. Pułap wyznaczają warstwy BKN/OVC lub widzialność pionowa; FEW/SCT nie są pułapem."
            : "TEMPO means temporary changes, BECMG a gradual transition during a stated interval, and FM new conditions from a stated time. During a gradual transition we retain the earlier weather and show the possible later conditions. BKN/OVC layers or vertical visibility define a ceiling; FEW/SCT do not."}
        </p>
        <p>
          {pl
            ? "Pomiar starszy niż 90 minut nie daje bieżącej oceny. Prognoza lotniskowa musi obejmować wybraną godzinę i być wydana nie dawniej niż 12 godzin temu. Nie znamy aktywnego kierunku pasa, stanu nawierzchni ani wyposażenia i uprawnień konkretnego lotu. Braki danych pozostają brakami, a status lotu sprawdzisz u przewoźnika."
            : "An observation older than 90 minutes cannot produce a current assessment. The airport forecast must cover the selected time and be no more than 12 hours old. The active runway direction, surface condition and a flight’s equipment and qualifications are unknown. Missing data remain missing; your airline provides flight status."}
        </p>
      </details>
    </>
  );
}
