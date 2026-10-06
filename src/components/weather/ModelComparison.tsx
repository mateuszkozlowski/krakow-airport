import type { Locale } from "@/lib/weather/model";
import type { evaluateShadow } from "@/lib/weather/shadow-quality";

type Comparison = ReturnType<typeof evaluateShadow> & { available: boolean };
export function ModelComparison({
  quality,
  locale,
}: {
  quality: Comparison;
  locale: Locale;
}) {
  const pl = locale === "pl";
  const paired = quality.paired.model;
  return (
    <details className="explanation model-comparison">
      <summary>
        {pl ? "Sprawdzanie modelu mgły" : "Testing the fog model"}
      </summary>
      <p>
        {pl
          ? "Model przewiduje widzialność poniżej 550 m za 2 godziny od ostatniej obserwacji. Porównujemy go z prognozą lotniskową i utrzymaniem ostatniego pomiaru dla tych samych godzin. Nie zmienia ocen ani powiadomień dla pasażerów."
          : "The model predicts visibility below 550 m two hours after the latest observation. We compare it with the airport forecast and persistence of the latest reading at exactly the same times. It does not change passenger assessments or notifications."}
      </p>
      <p>
        {!quality.available
          ? pl
            ? "Pomiar wymaga dostępnej historii i regularnego zapisywania prognoz. Brak wyniku."
            : "Evaluation requires available history and regular forecast collection. No result is available."
          : paired.samples === 0
            ? pl
              ? "Czekamy na prognozy zapisane przed docelową godziną i późniejsze pomiary."
              : "Waiting for forecasts recorded before their target time and subsequent observations."
            : `${pl ? "Wspólne odczyty" : "Paired readings"}: ${paired.samples}. ${pl ? "Z widzialnością poniżej 550 m" : "With visibility below 550 m"}: ${paired.positiveReadings}.`}
      </p>
      {quality.missingNumericTaf > 0 && (
        <p className="muted small">
          {pl
            ? `${quality.missingNumericTaf} dopasowanych odczytów nie ma liczbowej szansy w TAF-ie. Nie wliczamy ich do wspólnego porównania.`
            : `${quality.missingNumericTaf} matched readings have no numeric TAF probability. They are excluded from the paired comparison.`}
        </p>
      )}
      {paired.samples >= 30 ? (
        <div className="comparison-table-scroll">
          <table>
            <caption>
              {pl
                ? "Błąd prawdopodobieństw — niższy wynik jest lepszy"
                : "Probability error — lower is better"}
            </caption>
            <thead>
              <tr>
                <th scope="col">{pl ? "Prognoza" : "Forecast"}</th>
                <th scope="col">Brier</th>
                <th scope="col">{pl ? "Fałszywe wskazania" : "False alarms"}</th>
                <th scope="col">{pl ? "Pominięte odczyty" : "Missed readings"}</th>
              </tr>
            </thead>
            <tbody>
              {(["model", "taf", "persistence"] as const).map((source) => {
                const score = quality.paired[source];
                return (
                  <tr key={source}>
                    <th scope="row">
                      {source === "model"
                        ? pl ? "Model badawczy" : "Research model"
                        : source === "taf"
                          ? pl ? "Prognoza lotniskowa" : "Airport forecast"
                          : pl ? "Ostatni pomiar" : "Latest reading"}
                    </th>
                    <td>{score.brier?.toFixed(4) ?? "—"}</td>
                    <td>{score.falseAlarms}</td>
                    <td>{score.misses}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted small">
          {pl
            ? "Porównanie pokażemy po 30 wspólnych odczytach. Taka próba nie dowodzi jeszcze skuteczności w różnych sezonach."
            : "The comparison is shown after 30 paired readings. This does not yet demonstrate performance across seasons."}
        </p>
      )}
      <p className="muted small">
        {pl
          ? "Próg wskazania: 30%. Liczymy odczyty, nie odwołane loty ani wysłane ostrzeżenia. Czas od zapisu do celu jest krótszy, jeśli ostatni METAR jest starszy. Kolejne odczyty z tego samego epizodu nie są niezależne."
          : "Indication threshold: 30%. We count readings, not cancelled flights or sent alerts. Time from recording to target is shorter when the latest METAR is older. Successive readings in one episode are not independent."}
      </p>
    </details>
  );
}
