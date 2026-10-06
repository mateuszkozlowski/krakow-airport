# Weryfikacja wersji 2

6 października 2026, lokalny build produkcyjny Next.js 16.3.8 / React 19.3.0.

- `npm run lint`: bez błędów i ostrzeżeń.
- `npm test`: 45 testów przeszło. Parser, RVR, wiatr, monotoniczność pasm widzialności, dziedziczenie i nakładanie TAF, BECMG/FM/CAVOK, zmiana czasu, kalendarz, kontrolny przebieg ensemble i jednostki, brakujące dane, pomiar jakości, cache, ograniczenie rozmiaru żądań i autoryzacja collectora; dodatkowo przyczynowość cech badawczych i poprawność trendu pomiarów.
- Powiadomienia zweryfikowane z atrapami dostawcy i magazynu: niezmieniona ocena nie wysyła wiadomości, wzrost do wysokiej wysyła raz, przekroczenie budżetu czasu zachowuje miejsce kontynuacji. Nie wysłano rzeczywistych powiadomień ani postów X.
- `npm run build` i późniejszy `npm run typecheck`: przeszły.
- `npm audit --omit=dev`: zero zgłoszonych podatności w zależnościach produkcyjnych. To wynik audytu paczek, nie pełny test bezpieczeństwa aplikacji.
- `git diff --check`: bez błędów.

## Przeglądarka Chromium / Playwright

Sprawdzono działanie lokalnego serwera produkcyjnego z rzeczywistymi źródłami danych:

- polski i angielski HTML, nagłówki, `lang`, canonical;
- wybór godziny i kierunku, zachowanie adresu udostępniania przy zmianie języka;
- zachowanie odpowiadającego poradnika przy zmianie języka;
- widoczność głównej strony, aktualnej pogody i wybranej podróży przy **wyłączonym JavaScript**;
- pobranie poprawnego pliku `.ics` z alarmem;
- szerokość 390 px bez poziomego przewijania;
- obie wersje praw pasażera, metodologii i jakości prognozy;
- obrazek OG: HTTP 200, `image/png`;
- sitemap z www i odpowiednimi polskimi/angielskimi adresami;
- manifest aplikacji;
- brak konfiguracji collectora: HTTP 503, również pod dawnym adresem `/api/weather-alerts`;
- wyłączone powiadomienia bez konfiguracji;
- aktualne METAR, TAF, model i ensemble;
- HTTP 404 dla nieobsługiwanego języka i nieznanej podstrony;
- brak błędów JavaScript w aplikacji.

## Zakres i ograniczenia

Nie wykonano wdrożenia produkcyjnego, konfiguracji sekretów hostingu, rzeczywistego testu dostarczenia push na urządzeniu ani obciążeniowego testu usług zewnętrznych. Strona nie ma danych o rzeczywistych wynikach lotów ani zweryfikowanego bieżącego stanu nawierzchni pasa. Model badawczy pozostaje odłączony; wyniki i ograniczenia opisano w [model-research-results.md](model-research-results.md).

Badanie archiwum obejmuje 35 080 METAR-ów EPKK z lat 2023–2024; pełny parser nie zgłosił w tej próbce błędów. Nie jest to dowód kompletności danych w innych latach ani poprawności każdego wariantu komunikatu.


## Uproszczenie UX i timeline

Wykonano także lokalny build po zmianach UI. PL/EN mają proste opisy w głównym widoku; kody VRB/BKN/OVC/BECMG/TEMPO/PROB/RVR/kt/ft pozostają w rozwijanych szczegółach źródeł. Wiatr jest prezentowany w km/h, podstawa chmur w metrach; parser i silnik nadal używają swoich poprawnych jednostek.

Sprawdzono timeline: wybór godziny, przylot/odlot, zachowanie parametrów przy zmianie języka, kalendarz oraz szerokości 320/390/768/1280 px. Przewijanie poziome dotyczy osi godzin; strona nie wychodzi poza ekran. W kontrolowanych odpowiedziach API pokazano gęstą mgłę, 40% szans warunków chwilowych, lukę danych i brak wszystkich źródeł. Sprawdzono, że brak danych nie daje zielonej oceny, a możliwe pogorszenie jest osobne od prognozy podstawowej. Timeline i wynik wybranej podróży są obecne w HTML bez JavaScript. Nie wystąpiły błędy JavaScript. To podstawowa weryfikacja interfejsu w Chromium, nie pełny audyt WCAG ani test na fizycznym urządzeniu.

Przegląd ekranów: [ux-review.md](ux-review.md). Dalsze badanie 35 080 METAR-ów obejmuje trzy kwartalne testy, proste prognozy porównawcze oraz kalibrację; wyniki zapisano w [model-research-results.md](model-research-results.md). Nie włączono modelu ani nie wdrożono zmian na publicznej stronie.

Ostatni układ wykorzystuje ciągłą oś z pionowymi liniami czasu zamiast kart godzinowych. Objaśnienia są zamknięte pod ikoną informacji. Sprawdzono zgodność pozycji godziny i początku pasma (<1 px), widoczność efektu szkła, dzień po przewinięciu oraz dwie rozróżnione godziny 02:00 przy zmianie czasu. Zrzuty aktualnego wyglądu: `docs/ux/desktop.png`, `docs/ux/mobile.png`; `docs/ux/simulated-fog.png` jest kontrolowanym przykładem, nie rzeczywistą prognozą.
# Aktualizacja: uproszczenie tekstów i eksperyment 2025

6 października 2026: 45 testów jednostkowych, lint bez ostrzeżeń i produkcyjny build z kontrolą TypeScript zakończone poprawnie. Nowe testy obejmują przyczynowość cech modelu, jawne braki danych, rozróżnienie CAVOK od bezchmurnego nieba oraz świeżość/ciągłość/duplikaty trendu widzialności.

Nowy eksperyment opisano w `model-holdout-2025.md`; przeliczono Brier z zapisanych predykcji dla wszystkich metod i obu horyzontów, potwierdzono hashe protokołu i implementacji. Model pozostaje wyłącznie badawczy.

Przegląd przeglądarkowy bieżącego builda na porcie 3007: PL/EN, cztery szerokości, grupowane etykiety widoczne przy przewijaniu, klawiatura, wybrana godzina, zwinięta lista szczegółów, trend pomiarów, stare dane, szare luki, scenariusze i HTML bez JS. Szczegóły i granice w `ux-review.md`. Próbne uruchomienie builda przy domyślnej izolacji zwróciło puste wyjście procesu potomnego TypeScript; ponowny build z uprawnieniami sieciowymi środowiska zakończył się poprawnie bez zmiany konfiguracji i bez wyłączania kontroli typów.
