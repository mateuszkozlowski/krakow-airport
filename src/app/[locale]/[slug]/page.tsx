import { notFound } from "next/navigation";
import Link from "next/link";
import { seo } from "@/lib/seo";
import { slugs } from "@/lib/weather/copy";
import { getQuality } from "@/lib/weather/history";
import type { Locale } from "@/lib/weather/model";
import { WeatherMethodology } from "@/components/weather/WeatherMethodology";
import { FogModelGuide } from "@/components/weather/FogModelGuide";
import { TransportPage } from "@/components/transport/TransportPage";
import { transportKind, transportPath } from "@/lib/transport/paths";
import { pageCopy } from "@/lib/transport/copy";
import type { QueryValues } from "@/lib/transport/query";
export const maxDuration = 60;
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
    methodology: "Skąd bierze się prognoza pogody",
    rights: "Prawa pasażera przy opóźnieniu lub odwołaniu lotu",
    accuracy: "Nasz model mgły: jak działa",
  },
  en: {
    fog: "Fog at Kraków Airport: flights, visibility and travel advice",
    methodology: "Where the weather forecast comes from",
    rights: "Passenger rights for delayed or cancelled flights",
    accuracy: "Our fog model: how it works",
  },
};
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const values = await params;
  if (values.locale === "pl" || values.locale === "en") {
    const kind = transportKind(values.locale, values.slug);
    if (kind) {
      const copy = pageCopy[values.locale][kind];
      return seo(
        values.locale,
        copy.seoTitle,
        copy.description,
        { pl: transportPath("pl", kind), en: transportPath("en", kind) },
        "transport",
      );
    }
  }
  const { locale, key } = resolve(values);
  return seo(
    locale,
    titles[locale][key],
    locale === "pl"
      ? "Praktyczne informacje dla podróżujących z Krakowa: źródła danych, niepewność prognozy i następne kroki."
      : "Practical information for Kraków travellers: data sources, forecast uncertainty and next steps.",
    { pl: `/pl/${slugs.pl[key]}`, en: `/en/${slugs.en[key]}` },
  );
}
export default async function Article({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<QueryValues>;
}) {
  const values = await params;
  if (values.locale === "pl" || values.locale === "en") {
    const kind = transportKind(values.locale, values.slug);
    if (kind)
      return (
        <TransportPage
          locale={values.locale}
          kind={kind}
          values={await searchParams}
        />
      );
  }
  const { locale, key } = resolve(values);
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
                Zobacz, czy pochodzi z prognozy lotniskowej, czy z prognozy dla
                okolicy.
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
                Check whether it comes from the airport forecast or the area
                forecast.
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
      {key === "methodology" && <WeatherMethodology locale={locale} />}
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
        <FogModelGuide locale={locale} quality={quality} />
      )}
      <p>
        <Link className="button" href={`/${locale}`}>
          {pl ? "Wróć do prognozy" : "Back to the forecast"}
        </Link>
      </p>
    </article>
  );
}
