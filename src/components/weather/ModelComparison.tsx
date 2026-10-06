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
    <section className="model-comparison" aria-labelledby="model-test-title">
      <h2 id="model-test-title">
        {pl ? "Bieżący test: co już wiemy?" : "The live test: what do we know?"}
      </h2>
      <p>
        {pl
          ? "Porównujemy nasz model, prognozę synoptyka i prostą prognozę zakładającą, że obecne warunki się utrzymają. Wszystkie trzy sprawdzamy względem tych samych późniejszych pomiarów. Same godziny z dobrą widzialnością nie wystarczą — potrzebujemy również przypadków jej pogorszenia."
          : "We compare our model, the airport forecaster’s prediction and a simple forecast that keeps the current conditions unchanged. All three are checked against the same later observations. Good-visibility hours alone are not enough: we also need cases of worsening visibility."}
      </p>
      <p>
        {!quality.available
          ? pl
            ? "Historia bieżącego testu jest chwilowo niedostępna. Nie możemy pokazać zweryfikowanego wyniku."
            : "The live-test history is temporarily unavailable. We cannot show a verified result."
          : paired.samples === 0
            ? pl
              ? "Test dopiero się zaczyna. Czekamy na prognozy zapisane przed docelową godziną oraz późniejsze pomiary, które pozwolą porównać wszystkie trzy źródła."
              : "The test is just starting. We are waiting for forecasts saved before their target time and later observations that allow all three sources to be compared."
            : pl
              ? `Porównaliśmy ${paired.samples} prognoz z późniejszym pomiarem. W ${paired.positiveReadings} przypadkach widzialność spadła poniżej 550 m.`
              : `We compared ${paired.samples} forecasts with later observations. Visibility was below 550 m in ${paired.positiveReadings} cases.`}
      </p>
      {paired.samples >= 30 ? (
        <div className="comparison-table-scroll">
          <table>
            <caption>
              {pl
                ? "Porównanie prognoz — mniejszy błąd jest lepszy"
                : "Forecast comparison — lower error is better"}
            </caption>
            <thead>
              <tr>
                <th scope="col">{pl ? "Źródło" : "Source"}</th>
                <th scope="col">{pl ? "Błąd" : "Error"}</th>
                <th scope="col">{pl ? "Fałszywe alarmy" : "False alarms"}</th>
                <th scope="col">{pl ? "Pominięcia" : "Misses"}</th>
              </tr>
            </thead>
            <tbody>
              {(["model", "taf", "persistence"] as const).map((source) => {
                const score = quality.paired[source];
                return (
                  <tr key={source}>
                    <th scope="row">
                      {source === "model"
                        ? pl
                          ? "Model mgły"
                          : "Fog model"
                        : source === "taf"
                          ? pl
                            ? "Synoptyk"
                            : "Forecaster"
                          : pl
                            ? "Bez zmian"
                            : "Unchanged"}
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
            ? "Tabelę pokażemy po 30 wspólnych porównaniach. To próg wyświetlenia wyników, a nie dowód skuteczności. Do oceny modelu potrzeba większej próby, dni z mgłą i różnych pór roku."
            : "The table appears after 30 paired comparisons. This is a display threshold, not evidence of accuracy. Evaluating the model requires a larger sample, foggy days and different seasons."}
        </p>
      )}
      <details className="explanation">
        <summary>
          {pl
            ? "Jak liczymy i czytamy wyniki?"
            : "How are the results calculated?"}
        </summary>
        <p>
          {pl
            ? "Błąd prognozy to Brier score: porównuje przewidywane szanse z tym, co później zmierzono. Zero oznacza idealne prognozy; wynik 0,01 nie oznacza 99% trafności. Fałszywe wskazania i pominięcia liczymy przy progu 30% szans na widzialność poniżej 550 m. Liczymy pomiary pogody, nie odwołane loty ani wysłane ostrzeżenia."
            : "Forecast error is the Brier score: it compares predicted probabilities with later observations. Zero means perfect forecasts; a score of 0.01 does not mean 99% accuracy. False alarms and misses use a 30% probability threshold for visibility below 550 m. We count weather observations, not cancelled flights or sent alerts."}
        </p>
        <p>
          {pl
            ? "Cel to dwie godziny po ostatnim pomiarze. Jeśli pomiar ma już 30 minut, do celu pozostaje 90 minut. Późniejszy pomiar musi przypadać najwyżej 15 minut przed lub po docelowej godzinie. Kolejne pomiary z tej samej mgły nie są niezależnymi przypadkami."
            : "The target is two hours after the latest observation. If that observation is already 30 minutes old, 90 minutes remain. Verification must be within 15 minutes of the target time. Successive observations from the same fog episode are not independent cases."}
        </p>
        <p>
          {pl
            ? "Prognoza lotniskowa nie zawsze podaje liczbową szansę zmiany. Gdy takie okresowe lub stopniowe zmiany wpływają na oceniane zdarzenie, wyłączamy dany przypadek ze wspólnego porównania. Brak danych nie staje się prognozą dobrej pogody."
            : "The airport forecast does not always assign a numeric probability to a change. When such temporary or gradual changes affect the event being evaluated, we exclude that case from the paired comparison. Missing data do not become a good-weather forecast."}
        </p>
        {quality.missingNumericTaf > 0 && (
          <p className="muted small">
            {pl
              ? `${quality.missingNumericTaf} dodatkowych dopasowanych pomiarów nie ma liczbowej szansy w prognozie lotniskowej. Nie wliczamy ich do tabeli.`
              : `${quality.missingNumericTaf} additional matched observations lack a numeric airport-forecast probability. They are excluded from the table.`}
          </p>
        )}
      </details>
    </section>
  );
}
