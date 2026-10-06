import Link from "next/link";
import type { Locale } from "@/lib/weather/model";
import type { getQuality } from "@/lib/weather/history";
import fogModel from "@/lib/weather/artifacts/fog-2h-v1.json";
import { slugs } from "@/lib/weather/copy";
import { ModelComparison } from "./ModelComparison";

type Quality = Awaited<ReturnType<typeof getQuality>>;

export function FogModelGuide({
  locale,
  quality,
}: {
  locale: Locale;
  quality: Quality;
}) {
  const pl = locale === "pl";
  const samples = fogModel.training.samples.toLocaleString(
    pl ? "pl-PL" : "en-GB",
  );
  return (
    <>
      <p className="intro">
        {pl
          ? "Uczymy model rozpoznawać sytuacje, w których widzialność w Balicach spadnie poniżej 550 metrów dwie godziny po ostatnim pomiarze. Uczył się na historii lotniska. Teraz sprawdzamy jego prognozy względem nowych pomiarów."
          : "We train a model to recognise when visibility at Kraków Airport will fall below 550 metres two hours after the latest observation. It learned from the airport’s history. We now check its forecasts against new observations."}
      </p>
      <p className="model-stage">
        <strong>{pl ? "Na etapie testów. " : "Still being tested. "}</strong>
        {pl
          ? "Oś korzysta z pomiarów, prognozy lotniskowej i prognozy dla okolicy. Nasz model mgły jeszcze nie zmienia ocen ani powiadomień."
          : "The timeline uses observations, the airport forecast and the area forecast. Our fog model does not yet change assessments or notifications."}
      </p>
      <h2>
        {pl
          ? "Czego model szuka w pomiarach?"
          : "What does the model look for?"}
      </h2>
      <ul className="explanation-steps">
        <li>
          <strong>
            {pl ? "Wilgoci i ochładzania." : "Moisture and cooling."}
          </strong>{" "}
          {pl
            ? "Sprawdza różnicę między temperaturą a punktem rosy — temperaturą, przy której wilgoć zaczyna się skraplać. Liczy się również to, czy ta różnica maleje."
            : "It checks the gap between temperature and dew point, the temperature at which moisture starts to condense. It also considers whether that gap is closing."}
        </li>
        <li>
          <strong>
            {pl ? "Wiatru i widzialności." : "Wind and visibility."}
          </strong>{" "}
          {pl
            ? "Bierze pod uwagę siłę wiatru, ostatnią widzialność i zmiany w kolejnych pomiarach. Pojedynczy odczyt nie opisuje całego rozwoju pogody."
            : "It considers wind speed, the latest visibility and changes across recent readings. One observation cannot describe the whole weather trend."}
        </li>
        <li>
          <strong>
            {pl
              ? "Pory dnia, sezonu i wcześniejszej pogody."
              : "Time of day, season and recent weather."}
          </strong>{" "}
          {pl
            ? "Godzina, miesiąc i historia pomiarów, w tym opadu, pomagają odróżnić jesienną noc od letniego popołudnia."
            : "The hour, month and recent observations, including precipitation, help distinguish an autumn night from a summer afternoon."}
        </li>
      </ul>
      <h2>{pl ? "Na czym się uczył?" : "What did it learn from?"}</h2>
      <p>
        {pl
          ? `Na ${samples} przykładach z lat 2018–2023, przygotowanych z pomiarów METAR dla EPKK. Każdy przykład łączy wcześniejszą pogodę z widzialnością zmierzoną później. Przy tworzeniu prognozy model dostaje wyłącznie dane, które były już dostępne w danym momencie.`
          : `On ${samples} examples from 2018–2023, prepared from EPKK METAR observations. Each example connects earlier weather with visibility measured later. A prediction uses only information already available at that time.`}
      </p>
      <p>
        {pl
          ? "Osobne dane z 2024 roku posłużyły do dopasowania przewidywanych szans do rzeczywistej częstości zdarzeń. To inny etap niż uczenie na wcześniejszych latach. Test na nowych pomiarach ma sprawdzić, czy wynik utrzymuje się także teraz."
          : "Separate 2024 data were used to adjust predicted probabilities to the observed event frequency. This is a different stage from training on earlier years. Testing against new observations checks whether performance holds today."}
      </p>
      <h2>
        {pl
          ? "Dlaczego właśnie dane z Balic?"
          : "Why use Kraków Airport’s own data?"}
      </h2>
      <p>
        {pl
          ? "Pogoda na lotnisku może różnić się od pogody w centrum Krakowa. Teren, nocne wychładzanie i cieplejsza zabudowa wpływają na te różnice. Historia Balic pozwala uczyć się lokalnych zależności, bez założenia, że warunki w całym mieście są takie same."
          : "Airport weather can differ from central Kraków. Terrain, night-time cooling and warmer urban areas contribute to those differences. The airport’s history allows local patterns to be learned without assuming identical weather across the city."}
      </p>
      <p>
        {pl
          ? "Osobno sprawdzamy dodatkowe informacje o położeniu słońca, tempie ochładzania i kierunku wiatru. Więcej danych nie zawsze poprawia wynik. Nie zwiększamy oceny automatycznie tylko dlatego, że lotnisko leży w dolinie lub blisko miasta."
          : "We separately test extra information about the sun’s position, cooling rate and wind direction. More data do not always improve a model. We do not automatically increase the assessment because the airport lies in a valley or near a city."}
      </p>
      <ModelComparison quality={quality.shadow} locale={locale} />
      <h2>
        {pl
          ? "Kiedy zacznie pomagać na osi?"
          : "When will it help on the timeline?"}
      </h2>
      <p>
        {pl
          ? "Gdy wykaże przewagę nad prognozą lotniskową i założeniem niezmiennej pogody. Sprawdzamy zarówno pominięte pogorszenia, jak i niepotrzebne ostrzeżenia, szczególnie podczas mgły i w różnych sezonach. Krótka seria dobrych wyników nie wystarczy."
          : "When it demonstrates an advantage over the airport forecast and unchanged-weather prediction. We check both missed poor conditions and unnecessary warnings, especially during fog and across seasons. A short run of good results is not enough."}
      </p>
      <p>
        {pl
          ? "Model przewiduje widzialność ogólną, a nie widoczność wzdłuż pasa. Próg 550 m nie mówi, czy konkretny samolot wyląduje, ani nie wyznacza szansy odwołania lotu."
          : "The model predicts general visibility, not runway visibility. The 550 m threshold does not determine whether a particular aircraft can land or the chance of a cancellation."}{" "}
        <Link href={`/${locale}/${slugs[locale].methodology}`}>
          {pl
            ? "Zobacz, jak powstaje ocena pogody →"
            : "See how weather is assessed →"}
        </Link>
      </p>
      <details className="explanation">
        <summary>
          {pl
            ? "Osobny pomiar jakości prognozy lotniskowej"
            : "Separate evaluation of the airport forecast"}
        </summary>
        <p>
          {pl
            ? "Mierzymy też naszą interpretację prognozy lotniskowej dla widzialności poniżej 1000 m. To osobny pomiar: inny próg i inne pytanie niż test modelu mgły dla 550 m. Nie jest miarą trafności statusów lotów."
            : "We also evaluate our interpretation of the airport forecast for visibility below 1000 m. This is a separate evaluation with a different threshold and question from the 550 m fog-model test. It does not measure flight-status accuracy."}
        </p>
        <p>
          {!quality.available
            ? pl
              ? "Historia pomiaru jest chwilowo niedostępna."
              : "Evaluation history is temporarily unavailable."
            : pl
              ? `Dopasowane prognozy: ${quality.matched}. Z liczbową prognozą widzialności: ${quality.scored}.`
              : `Matched forecasts: ${quality.matched}. With a numeric visibility forecast: ${quality.scored}.`}
        </p>
        {quality.scored >= 30 && (
          <p>
            {pl ? "Błąd prognozy" : "Forecast error"} (Brier):{" "}
            {quality.brier?.toFixed(3) ?? "—"}.{" "}
            {pl ? "Trafione pogorszenia" : "Hits"}: {quality.hits};{" "}
            {pl ? "pominięcia" : "misses"}: {quality.misses};{" "}
            {pl ? "fałszywe wskazania" : "false alarms"}: {quality.falseAlarms};{" "}
            {pl ? "poprawne braki pogorszenia" : "correct negatives"}:{" "}
            {quality.correctNegatives}.
          </p>
        )}
      </details>
      <details className="explanation">
        <summary>
          {pl
            ? "Dane i badania o lokalnej pogodzie"
            : "Data and research on local weather"}
        </summary>
        <ul>
          <li>
            <a href="https://mesonet.agron.iastate.edu/request/download.phtml">
              Iowa Environmental Mesonet —{" "}
              {pl
                ? "archiwum pomiarów lotniskowych"
                : "airport observation archive"}
            </a>
          </li>
          <li>
            <a href="https://link.springer.com/article/10.1007/s00704-015-1577-9">
              {pl ? "Bokwa i in., 2015" : "Bokwa et al., 2015"} —{" "}
              {pl
                ? "teren i miejska wyspa ciepła w Krakowie"
                : "terrain and Kraków’s urban heat island"}
            </a>
          </li>
          <li>
            <a href="https://aaqr.org/articles/aaqr-16-12-fog-0581.pdf">
              Bokwa, Wypych, Hajto, 2018 —{" "}
              {pl
                ? "mgła na lotnisku i w mieście"
                : "fog at the airport and in the city"}
            </a>
          </li>
        </ul>
      </details>
    </>
  );
}
