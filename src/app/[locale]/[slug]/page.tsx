import { notFound } from "next/navigation";
import Link from "next/link";
import { seo } from "@/lib/seo";
import { slugs, text } from "@/lib/weather/copy";
import { getQuality } from "@/lib/weather/history";
import type { Locale } from "@/lib/weather/model";
import { ModelComparison } from "@/components/weather/ModelComparison";
type Params = { locale: string; slug: string };
function resolve({ locale, slug }: Params): {
  locale: Locale;
  key: keyof typeof slugs.pl;
} {
  if (locale !== "pl" && locale !== "en") notFound();
  const key = Object.entries(slugs[locale]).find(
    ([, value]) => value === slug,
  )?.[0] as keyof typeof slugs.pl | undefined;
  if (!key) notFound();
  return { locale, key };
}
const titles = {
  pl: {
    fog: "Mgła w Balicach: loty, widzialność i przygotowanie do podróży",
    methodology: "Jak oceniamy pogodę i ryzyko utrudnień",
    rights: "Prawa pasażera przy opóźnieniu lub odwołaniu lotu",
    accuracy: "Jakość prognozy: dane i ograniczenia",
  },
  en: {
    fog: "Fog at Kraków Airport: flights, visibility and travel advice",
    methodology: "How we assess weather and disruption risk",
    rights: "Passenger rights for delayed or cancelled flights",
    accuracy: "Forecast quality: data and limitations",
  },
};
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, key } = resolve(await params);
  return seo(
    locale,
    titles[locale][key],
    locale === "pl"
      ? "Praktyczne informacje dla podróżujących z Krakowa: źródła danych, niepewność prognozy i następne kroki."
      : "Practical information for Kraków travellers: data sources, forecast uncertainty and next steps.",
    { pl: `/pl/${slugs.pl[key]}`, en: `/en/${slugs.en[key]}` },
  );
}
export default async function Article({ params }: { params: Promise<Params> }) {
  const { locale, key } = resolve(await params);
  const pl = locale === "pl";
  const quality = key === "accuracy" ? await getQuality() : null;
  return (
    <article className="article">
      <p className="eyebrow">KRK.FLIGHTS / EPKK</p>
      <h1>{titles[locale][key]}</h1>
      {key === "fog" &&
        (pl ? (
          <>
            <p>
              Mgła na lotnisku Kraków-Balice może utrudnić podejście do
              lądowania, zwiększyć odstępy między samolotami i spowolnić ruch.
              Sama informacja o mgle nie oznacza zamknięcia lotniska ani
              odwołania Twojego lotu.
            </p>
            <h2>Mam lot rano. Co sprawdzić?</h2>
            <ol>
              <li>
                Wybierz na stronie głównej godzinę przylotu lub odlotu w czasie
                krakowskim.
              </li>
              <li>
                Sprawdź ocenę dla swojej godziny i możliwe zmiany pogody.
                Zobacz, czy to prognoza lotniskowa, czy komputerowa.
              </li>
              <li>
                Przeczytaj wiadomość od linii lotniczej i sprawdź oficjalną
                tablicę lotów. Przyjedź na odprawę zgodnie z zaleceniem
                przewoźnika.
              </li>
              <li>
                Zapisz przypomnienie, żeby wrócić do aktualnej prognozy
                wieczorem przed podróżą.
              </li>
            </ol>
            <h2>Dlaczego jeden samolot ląduje, a drugi nie?</h2>
            <p>
              Znaczenie mają widoczność wzdłuż pasa, wysokość chmur, dostępna
              procedura podejścia, wyposażenie samolotu, kwalifikacje załogi i
              sytuacja operacyjna. Widoczność ogólna z pomiaru na lotnisku nie
              jest tym samym co widoczność wzdłuż pasa.
            </p>
            <h2>Kiedy mgła ustąpi?</h2>
            <p>
              Prognoza lotniskowa może wskazywać okres poprawy, ale zmiana bywa
              stopniowa, a gorsze warunki mogą powracać na krótko. Wschód słońca
              nie gwarantuje zaniku mgły. Słaby wiatr, wilgoć i warunki terenowe
              mogą utrzymać ją dłużej. Wskazany okres poprawy pogody nie jest
              godziną wznowienia lotów.
            </p>
            <h2>Co z ILS CAT II?</h2>
            <p>
              PAŻP informuje o planowanym wdrożeniu CAT II w I kwartale 2027 po
              certyfikacji i spełnieniu wymagań lotniska. Nie zmieniamy progów
              automatycznie z nadejściem daty. Nowy ILS uzyskał dopuszczenie do
              pracy operacyjnej w 2026 roku; dostępność procedur należy
              sprawdzać w bieżącej informacji lotniczej.
            </p>
            <p>
              <a href="https://www.pansa.pl/nowy-ils-w-krakowie-uzyskal-dopuszczenie-do-pracy-operacyjnej/">
                Informacja PAŻP o ILS i planie CAT II
              </a>
            </p>
          </>
        ) : (
          <>
            <p>
              Fog at Kraków Airport can complicate landing approaches, increase
              aircraft spacing and slow operations. Fog alone does not mean the
              airport is closed or your flight is cancelled.
            </p>
            <h2>Flying in the morning? What to check</h2>
            <ol>
              <li>
                Select your arrival or departure time on the home page in Kraków
                local time.
              </li>
              <li>
                Read the assessment for your time and any possible changes.
                Check whether the source is an airport or a computer forecast.
              </li>
              <li>
                Check your airline message and the official airport flight
                board. Arrive for check-in as instructed by your airline.
              </li>
              <li>
                Save a reminder to check the updated forecast on the evening
                before travelling.
              </li>
            </ol>
            <h2>Why can one aircraft land while another cannot?</h2>
            <p>
              Runway visibility, cloud height, the available approach procedure,
              aircraft equipment, crew qualifications and operational conditions
              all matter. General airport visibility is different from
              visibility along the runway.
            </p>
            <h2>When will the fog clear?</h2>
            <p>
              The airport forecast can indicate an improvement window. A change
              may be gradual, and worse conditions may return briefly. Sunrise
              does not guarantee that fog clears. Light wind, moisture and local
              terrain can keep it in place. Weather improvement is not a time
              when flights resume.
            </p>
            <h2>What about ILS CAT II?</h2>
            <p>
              PANSA plans CAT II operation in the first quarter of 2027
              following certification and airport requirements. We do not change
              thresholds automatically on a calendar date. The new ILS obtained
              approval for operational use in 2026; current procedure
              availability must be checked in aviation information.
            </p>
            <p>
              <a href="https://www.pansa.pl/nowy-ils-w-krakowie-uzyskal-dopuszczenie-do-pracy-operacyjnej/">
                PANSA update on ILS and CAT II
              </a>
            </p>
          </>
        ))}
      {key === "methodology" &&
        (pl ? (
          <>
            <p>
              Pokazujemy warunki pogodowe i możliwe utrudnienia. Bez rozkładu i
              rzeczywistych wyników lotów nie przewidujemy odwołania ani
              przekierowania konkretnego samolotu. Cztery poziomy są oceną
              ekspercką, a nie wyuczonym prawdopodobieństwem.
            </p>
            <h2>Jakie dane bierzemy pod uwagę?</h2>
            <ul>
              <li>
                METAR EPKK: ostatnia obserwacja oraz historia do oceny trendu.
                Dane starsze niż 90 minut nie dają bieżącej oceny.
              </li>
              <li>
                TAF EPKK: podstawowa prognoza i osobne scenariusze FM, BECMG,
                TEMPO, PROB30/40. Używamy ważnego komunikatu wydanego do 12
                godzin temu.
              </li>
              <li>
                Open-Meteo: uzupełnia okres poza ważnym TAF-em. To mniej pewna
                wskazówka modelowa, bez prognozy RVR i pułapu. Brakujące
                wartości nie oznaczają dobrej pogody.
              </li>
            </ul>
            <h2>RVR, widzialność i wiatr</h2>
            <p>
              RVR nie jest widzialnością ogólną. Jeśli jest raportowany,
              pokazujemy go osobno i ostrożnie uwzględniamy najniższą wartość.
              Pułap wyznaczają BKN, OVC i widzialność pionowa; niskie FEW/SCT
              nie są pułapem. Wiatr analizujemy względem osi pasa w stopniach
              względem północy geograficznej, uwzględniając porywy i zmienność.
            </p>
            <p>
              Podstawowe pasma ostrzegawcze RVR wynoszą 550 m dla przylotu i 300
              m dla odlotu, a pułapu 200 ft dla przylotu. Są konfigurowalne. Nie
              są wiążącymi minimami konkretnego lotu. Stan nawierzchni i aktywny
              kierunek pasa nie są dostępne; nie deklarujemy bezpieczeństwa
              startu lub lądowania.
            </p>
            <h2>Co oznacza 40% w TAF-ie?</h2>
            <p>
              PROB40 oznacza szansę wystąpienia opisanych warunków, nie 40%
              szans odwołania lotu. TEMPO nie ma arbitralnej wartości 30%:
              pokazujemy je jako okresowe warunki dodatkowe. W okresie BECMG
              prezentujemy warunki przed zmianą i możliwy stan po zmianie,
              zamiast udawać, że zmiana następuje natychmiast.
            </p>
            <h2>Mgła i obsługa zimowa</h2>
            <p>
              Mała różnica temperatury i punktu rosy przy słabym wietrze jest
              sygnałem sprzyjającym mgle. Trend METAR może go wzmacniać, lecz
              nie wyznacza pewnej godziny początku. Marznąca mgła, śnieg i
              odladzanie nie są automatycznym komunikatem o zawieszeniu
              operacji. Nie podajemy wymyślonych minut opóźnienia.
            </p>
          </>
        ) : (
          <>
            <p>
              We show weather conditions and possible disruption. Without
              schedules and actual flight outcomes, we do not predict
              cancellation or diversion of an individual aircraft. The four
              levels are expert weather guidance, not a trained probability.
            </p>
            <h2>Which data do we use?</h2>
            <ul>
              <li>
                EPKK METAR: the latest observation and recent history for
                trends. Observations older than 90 minutes cannot produce a
                current assessment.
              </li>
              <li>
                EPKK TAF: prevailing conditions and separate FM, BECMG, TEMPO
                and PROB30/40 scenarios. We use a valid report issued within the
                last 12 hours.
              </li>
              <li>
                Open-Meteo: fills the period beyond the valid TAF. This is less
                certain model guidance without an RVR or ceiling forecast.
                Missing values do not mean good weather.
              </li>
            </ul>
            <h2>RVR, visibility and wind</h2>
            <p>
              RVR is different from general visibility. When reported, we
              display it separately and cautiously consider the lowest reading.
              The ceiling comes from BKN, OVC or vertical visibility; low
              FEW/SCT clouds are not a ceiling. We analyse wind relative to the
              runway's true heading, including gusts and directional
              variability.
            </p>
            <p>
              Default RVR advisory bands are 550 m for arrivals and 300 m for
              departures; the arrival ceiling band is 200 ft. These are
              configurable and are not binding minima for a particular flight.
              The runway surface and active direction are unknown; we do not
              declare take-off or landing safe.
            </p>
            <h2>What does 40% in a TAF mean?</h2>
            <p>
              PROB40 describes the chance of the stated weather, not a 40%
              cancellation probability. TEMPO is shown as temporary additional
              conditions without an invented 30% figure. During BECMG we show
              the conditions before the transition and the possible conditions
              after it, rather than treating the change as instantaneous.
            </p>
            <h2>Fog and winter handling</h2>
            <p>
              A small temperature–dewpoint spread in light wind favours fog. A
              METAR trend can strengthen the signal, but it does not provide a
              certain onset time. Freezing fog, snow and deicing do not
              automatically suspend operations. We do not invent delay
              durations.
            </p>
          </>
        ))}
      {key === "rights" &&
        (pl ? (
          <>
            <p>
              Przy wylocie z Krakowa obowiązują zasady UE dotyczące praw
              pasażera. Poniższe informacje są ogólne; wynik konkretnej sprawy
              zależy od okoliczności.
            </p>
            <h2>Opieka przy opóźnieniu</h2>
            <p>
              Posiłki i napoje odpowiednie do czasu oczekiwania oraz możliwość
              kontaktu przysługują od 2 godzin dla lotów do 1500 km, od 3 godzin
              dla lotów wewnątrz UE powyżej 1500 km oraz innych lotów 1500–3500
              km, i od 4 godzin dla pozostałych lotów. Przy koniecznym noclegu
              przewoźnik zapewnia hotel i transport. Prawo do opieki obowiązuje
              także przy złej pogodzie.
            </p>
            <h2>Odwołanie lub bardzo długie oczekiwanie</h2>
            <p>
              Przy odwołaniu możesz wybrać zwrot kosztu biletu albo zmianę trasy
              na warunkach określonych przepisami. Przy opóźnieniu co najmniej 5
              godzin możesz zrezygnować z podróży i żądać zwrotu odpowiednich
              części biletu, a w razie potrzeby powrotu do pierwszego miejsca
              odlotu.
            </p>
            <h2>Odszkodowanie to osobne uprawnienie</h2>
            <p>
              Opóźnienie przylotu co najmniej 3 godziny może dawać prawo do
              odszkodowania: 250 EUR do 1500 km, 400 EUR dla lotów wewnątrz UE
              powyżej 1500 km i innych 1500–3500 km, oraz 600 EUR dla
              pozostałych lotów powyżej 3500 km. Dla tej ostatniej grupy przy
              opóźnieniu 3–4 godziny kwota może wynosić 300 EUR. Istnieją
              wyjątki i zasady obniżenia kwoty.
            </p>
            <p>
              Warunki pogodowe uniemożliwiające wykonanie lotu mogą stanowić
              nadzwyczajną okoliczność. Linia musi wykazać ich wpływ i podjęcie
              rozsądnych środków. Sam komunikat „zła pogoda” lub poziom ryzyka
              na tej stronie nie rozstrzyga roszczenia. Opieka i odpowiednie
              prawa do zwrotu lub zmiany trasy pozostają niezależne od
              odszkodowania.
            </p>
            <h2>Co zachować?</h2>
            <p>
              Zachowaj rezerwację, komunikaty linii, rachunki i rzeczywistą
              godzinę przylotu. Złóż reklamację u przewoźnika. Korzystaj z
              oficjalnych informacji UE i ULC.
            </p>
          </>
        ) : (
          <>
            <p>
              EU passenger-rights rules apply to departures from Kraków. This is
              general information; the outcome of an individual claim depends on
              its circumstances.
            </p>
            <h2>Care during delays</h2>
            <p>
              Meals and refreshments appropriate to the wait, and communication
              facilities, are due after 2 hours for flights up to 1500 km, after
              3 hours for intra-EU flights over 1500 km and other flights of
              1500–3500 km, and after 4 hours for other flights. Where an
              overnight stay is necessary, the airline provides a hotel and
              transport. Care rights also apply in bad weather.
            </p>
            <h2>Cancellation or a very long wait</h2>
            <p>
              For a cancellation, you can choose reimbursement or rerouting
              under the applicable rules. After a delay of at least 5 hours, you
              can abandon the trip and request reimbursement of relevant ticket
              parts, with a return to the first departure point where necessary.
            </p>
            <h2>Compensation is a separate right</h2>
            <p>
              Arrival at least 3 hours late can qualify for compensation: EUR
              250 up to 1500 km, EUR 400 for intra-EU flights over 1500 km and
              other flights of 1500–3500 km, and EUR 600 for other flights over
              3500 km. In that last category, a 3–4 hour delay can mean EUR 300.
              Exceptions and reduction rules apply.
            </p>
            <p>
              Weather preventing a flight can be an extraordinary circumstance.
              The airline must demonstrate its impact and that reasonable
              measures were taken. A “bad weather” message or this site's risk
              level does not decide a claim. Care and applicable reimbursement
              or rerouting rights remain separate from compensation.
            </p>
            <h2>What should I keep?</h2>
            <p>
              Keep your booking, airline messages, receipts and actual arrival
              time. Complain to the airline first. Use official EU and Polish
              Civil Aviation Authority information.
            </p>
          </>
        ))}
      {key === "rights" && (
        <p>
          <a href="https://europa.eu/youreurope/citizens/travel/passenger-rights/air/index_en.htm">
            Your Europe · EU passenger rights
          </a>{" "}
          ·{" "}
          <a href="https://pasazerlotniczy.ulc.gov.pl/prawa-pasazera">
            ULC · prawa pasażera
          </a>
        </p>
      )}
      {key === "accuracy" && quality && (
        <>
          <p>
            {pl
              ? "Nie deklarujemy skuteczności w przewidywaniu odwołań lotów: nie mamy danych o faktycznych odwołaniach i przekierowaniach. Pierwszy pomiar sprawdza prognozę widzialności poniżej 1000 m względem późniejszego METAR-u EPKK."
              : "We do not claim accuracy for flight cancellations: actual cancellation and diversion outcomes are unavailable. The first evaluation compares forecasts of visibility below 1000 m with subsequent EPKK METARs."}
          </p>
          <div className="panel">
            <h2>{pl ? "Stan pomiaru" : "Evaluation status"}</h2>
            <p>
              {!quality.available
                ? pl
                  ? "Magazyn historii jest niedostępny. Nie ma zweryfikowanego wyniku."
                  : "Historical storage is unavailable. No verified result is available."
                : quality.matched === 0
                  ? pl
                    ? "Zbieramy historię. Brak dopasowanych prognoz i późniejszych obserwacji."
                    : "Collecting history. No forecasts have yet been matched to later observations."
                  : `${pl ? "Dopasowane prognozy" : "Matched forecasts"}: ${quality.matched}`}
            </p>
            <p>
              {pl
                ? "Próbki z liczbową prognozą widzialności"
                : "Samples with a numeric visibility forecast"}
              : {quality.scored}
            </p>
            {quality.scored >= 30 ? (
              <p>
                Brier score: {quality.brier?.toFixed(3)} ·{" "}
                {pl ? "niższy wynik jest lepszy" : "lower is better"}
              </p>
            ) : (
              <p>
                {pl
                  ? "Wynik Brier pokażemy od 30 dopasowanych próbek. To wciąż mała próba; nie dowodzi jakości modelu w różnych sezonach."
                  : "Brier score is displayed after 30 matched samples. This is still a small sample and does not demonstrate performance across seasons."}
              </p>
            )}
          </div>
          <h2>{pl ? "Jak działa pomiar?" : "How does evaluation work?"}</h2>
          <p>
            {pl
              ? "Zadanie cykliczne zapisuje prognozę raz na godzinę, z wyprzedzeniem 2–3 godzin. Nie odtwarzamy przewidywań po poznaniu wyniku. Obserwacja musi być oddalona od docelowej godziny o najwyżej 15 minut. Zmiany TEMPO/BECMG bez liczbowej szansy są wyłączane z punktowej oceny Brier, jeśli wpływają na zdarzenie. Braki danych nie są zaliczane jako dobra pogoda."
              : "A scheduled job freezes one forecast per hour, 2–3 hours ahead. Predictions are not reconstructed after the outcome is known. The verifying observation must be within 15 minutes of the target time. TEMPO/BECMG changes without a numeric probability are excluded from point Brier scoring when they affect the event. Missing data are not counted as good weather."}
          </p>
          <p>
            {pl
              ? "Obecny wynik opisuje interpretację TAF-u, nie poprawę względem TAF-u ani trafność statusu lotów. Przed uruchomieniem modelu uczonego potrzebne są sezonowe dane, oddzielny test na późniejszych okresach i porównanie z TAF-em oraz utrzymaniem ostatniej obserwacji."
              : "The current score evaluates our TAF interpretation, not improvement over TAF or flight-status accuracy. A trained model requires seasonal data, an independent later-period test, and comparison against TAF and persistence of the latest observation."}
          </p>
          {quality.scored >= 30 && (
            <div className="panel">
              <p>
                {pl ? "Trafione pogorszenia" : "Hits"}: {quality.hits} ·{" "}
                {pl ? "Pominięte pogorszenia" : "Misses"}: {quality.misses} ·{" "}
                {pl ? "Fałszywe alarmy" : "False alarms"}: {quality.falseAlarms}{" "}
                · {pl ? "Poprawne braki pogorszenia" : "Correct negatives"}:{" "}
                {quality.correctNegatives}
              </p>
            </div>
          )}
          <ModelComparison quality={quality.shadow} locale={locale} />
        </>
      )}
      <p>
        <Link className="button" href={`/${locale}`}>
          {pl
            ? "Sprawdź pogodę na swoją podróż"
            : "Check weather for your trip"}
        </Link>
      </p>
      {key === "methodology" && (
        <p>
          <Link href={`/${locale}/${slugs[locale].accuracy}`}>
            {text[locale].accuracy} →
          </Link>
        </p>
      )}
    </article>
  );
}
