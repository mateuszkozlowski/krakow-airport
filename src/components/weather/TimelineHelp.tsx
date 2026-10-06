import { levelLabel, text } from "@/lib/weather/copy";
import type { Locale } from "@/lib/weather/model";
import { Icon } from "./Icon";

export function TimelineHelp({ locale }: { locale: Locale }) {
  const t = text[locale];
  const notes =
    locale === "pl"
      ? [
          "Pogoda nie wskazuje istotnych utrudnień.",
          "Możliwa wolniejsza obsługa lub trudniejszy start i lądowanie.",
          "Pogoda może znacznie utrudnić start lub lądowanie.",
          "Warunki mogą mocno ograniczać loty.",
        ]
      : [
          "The weather does not indicate significant disruption.",
          "Slower ground handling or harder takeoff and landing are possible.",
          "The weather may significantly affect takeoff or landing.",
          "Conditions may severely restrict flights.",
        ];
  return (
    <details
      className="timeline-help"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary
        aria-label={
          locale === "pl"
            ? "Pogoda godzina po godzinie: objaśnienia"
            : "Weather hour by hour: explanation"
        }
      >
        <h2 id="timeline-title">{t.timeline}</h2>
        <span className="timeline-help-icon">
          <Icon name="info" />
        </span>
      </summary>
      <div className="timeline-help-content">
        <p>
          {locale === "pl"
            ? "Im wyższe pasmo, tym trudniejsze warunki. Kolor wzmacnia ocenę; wysokość nie oznacza procentowej szansy odwołania lotu. Przerywany kontur pokazuje możliwe pogorszenie."
            : "The taller the band, the more difficult the conditions. Colour reinforces the assessment; height is not the probability of a flight cancellation. A dashed outline shows possible worsening."}
        </p>
        <h3>{t.levels}</h3>
        <ul className="level-list">
          {([1, 2, 3, 4] as const).map((level) => (
            <li key={level}>
              <span className={`risk risk-${level}`}>
                {levelLabel(level, locale)}
              </span>
              <p>{notes[level - 1]}</p>
            </li>
          ))}
        </ul>
        <p>
          {locale === "pl"
            ? "Szary wzór oznacza brak danych lub oceny. Krótkie zmiany mają dokładną długość na osi; pełny opis zobaczysz po ich wybraniu. Strzałkami klawiatury przejdziesz do kolejnej zmiany, Enter wybiera czas."
            : "A grey pattern means missing data or assessment. Short changes keep their exact duration on the timeline; select one for its full description. Use the arrow keys to move between changes and Enter to select a time."}
        </p>
        <p>
          {locale === "pl"
            ? "Ocena dotyczy pogody. O statusie lotu informuje przewoźnik. Godziny bez prognozy lotniskowej uzupełnia prognoza dla okolicy; źródło zobaczysz przy wybranej godzinie."
            : "The assessment covers weather. Your airline provides flight status. The area forecast fills hours without an airport forecast; the source appears beside your selected time."}
        </p>
      </div>
    </details>
  );
}
