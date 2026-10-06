# Uruchomienie wersji 2

## Lokalnie

Node 20.9+ (zalecany Node 22/24), `npm ci`, `npm run dev`. Do produkcji: `npm run build` i `npm start`. Aplikacja korzysta z tras serwerowych; publikowanie katalogu `out` przez gh-pages nie obsłuży tej wersji.

`npm test`, `npm run typecheck`, `npm run lint` sprawdzają algorytm i kod. Build i typecheck uruchamiaj kolejno, ponieważ Next generuje pliki typów.

## Dane pogodowe

- NOAA METAR/TAF działa bez klucza.
- Open-Meteo jest domyślnie włączone dla niekomercyjnej strony, zgodnie z deklaracją właściciela. Ustaw `SITE_COMMERCIAL=true` przed dodaniem reklam, afiliacji lub płatnego dostępu. Wtedy do API modelowego potrzebny jest `OPEN_METEO_API_KEY`; bez niego model zostaje wyłączony. `OPEN_METEO_DISABLED=true` wyłącza model i ensemble; `ENSEMBLE_DISABLED=true` wyłącza tylko ensemble.
- Opcjonalnie `CHECKWX_API_KEY` zapewnia źródło awaryjne. Stara zmienna `NEXT_PUBLIC_CHECKWX_API_KEY` jest przejściowo odczytywana tylko na serwerze. Przenieś ją do prywatnej nazwy w panelu hostingu i odśwież klucz, jeżeli był wcześniej publicznie dostępny. Nowe moduły serwerowe nie mogą być importowane przez klienta.
- Redis jest opcjonalny dla wyświetlania pogody: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, wyłącznie prywatne nazwy. Bez Redis działa pamięć podręczna procesu; historia i push wymagają trwałego magazynu. Błędy zapisu cache nie kasują świeżych danych.
- Minima ostrzegawcze są konfigurowalne: `AIRPORT_ARRIVAL_RVR_ADVISORY_M` (domyślnie 550), `AIRPORT_DEPARTURE_RVR_ADVISORY_M` (300), `AIRPORT_CEILING_ADVISORY_FT` (200), `AIRPORT_RUNWAY_TRUE_HEADING` (78). To wskazówki pogodowe, nie zatwierdzone minima lotu. Nie przełączać CAT II przed potwierdzeniem bieżących procedur i certyfikacji.

## Dojazd do i z lotniska

Rozkłady KMŁ, ZTP i FlixBusa nie wymagają kluczy. Build pobiera bieżące GTFS; po wdrożeniu nowe wersje zapisują się w istniejącym Redis, a osobny dzienny cron `/api/transport/refresh` o 05:15 UTC wymaga `CRON_SECRET`. Brak konfiguracji Redis nie blokuje datowanego zestawu z builda, lecz utrudnia trwałe aktualizacje między instancjami. Nie oferujemy rozkładów niesprawdzonych od ponad siedmiu dni.

Opcjonalny prywatny `PLK_API_KEY` uzupełnia pociągi o opóźnienia po aktywacji u PLK. Nie używać nazwy `NEXT_PUBLIC_*`. Błąd aktywacji zachowuje godzinę z rozkładu i nie staje się opóźnieniem zero. Globalna blokada ogranicza odświeżanie do jednej próby na trzy minuty. Nie trzeba ponownie wdrażać kodu po przyjęciu już ustawionego klucza przez PLK.

Reguły połączeń, licencje, ograniczenia danych i zapas zależny od pogody opisano w [dokumentacji dojazdu](docs/airport-transport.md).

## Historia i powiadomienia

1. Ustaw prywatny `CRON_SECRET` jako losowy długi sekret. Bez niego collector zwraca 503, a powiadomienia są wyłączone. `Bearer undefined` nigdy nie jest autoryzacją.
2. `GET /api/weather/collect` wymaga `Authorization: Bearer <CRON_SECRET>`. Pobiera jedną wspólną prognozę, zbiera obserwacje i zamraża ocenę raz na godzinę. Tylko ten endpoint wysyła zapisane przez użytkowników powiadomienia. Wyświetlanie strony ani `/api/weather` nie wysyła wiadomości.
3. `vercel.json` ma bezpłatne zadanie dzienne o 18:00 UTC jako podstawę zbierania historii. Dla przypomnień i monitorowania pogorszeń potrzebny jest collector co 30 minut. Vercel Hobby nie obsługuje tak częstego zadania; nie zakładamy płatnego planu.
4. Przygotowany workflow GitHub Actions jest **wyłączony**, dopóki zmienna repozytorium `WEATHER_COLLECT_ENABLED` nie ma wartości `true`. Ustaw `WEATHER_COLLECT_URL=https://www.krk.flights/api/weather/collect` oraz sekret `CRON_SECRET`. Można też użyć własnego schedulera z nagłówkiem autoryzacji. GitHub Actions może się opóźniać i ma limity oraz zasady zależne od repozytorium; nie zapewnia dostarczenia w konkretnej minucie.
5. Dopiero po potwierdzeniu regularnego collectora ustaw `WEB_PUSH_ENABLED=true`. Klucze VAPID powstają automatycznie i są trwale przechowywane w prywatnym Redis. Nie zmieniaj ich przy każdym deployu. Endpoint przyjmuje wyłącznie znane domeny usług push i sprawdza subskrypcję, termin oraz limit żądań.
6. Subskrypcje dotyczą jednej podróży do 48 h w przyszłości i wygasają po niej. Strona przechowuje lokalnie token potrzebny do ich usunięcia. Wieczorne przypomnienie jest wysyłane w oknie od 18:00 do 00:00 poprzedniego dnia w Krakowie; kolejny alert przy wzroście oceny do poziomu ≥3. Nie jest to status rzeczywistego lotu. Nieaktywne endpointy 404/410 są usuwane.
7. Kalendarz `.ics` działa od razu, bez Redis, tokenów ani schedulera. Nie aktualizuje pogody i zależy od obsługi przypomnień w aplikacji kalendarza.

Collector pobiera subskrypcje w małych paczkach. Nie zapisuje ponownie niezmienionej oceny, a po osiągnięciu budżetu czasu odkłada pozostałe rekordy i zapamiętuje miejsce kontynuacji. Pole `notifications.deferred` informuje o liczbie rekordów pozostałych do następnego wywołania. Regularny scheduler jest niezbędny również przy rosnącej liczbie subskrypcji.

Historia prognoz zachowuje także czas wydania i surowy TAF, żeby późniejsze porównania mogły korzystać z komunikatu dostępnego przed zdarzeniem, a nie z nowszej prognozy pobranej po fakcie.

## Walidacja po wdrożeniu

Sprawdź `/pl` i `/en` bez JavaScriptu: HTML zawiera nagłówek, aktualne dane lub uczciwy komunikat o ich braku oraz opis prognozy. `lang`, canonical i hreflang muszą wskazywać poprawny język i domenę z www. Sprawdź sitemapę, oba poradniki, prawa pasażera oraz `/api/og?lang=pl`. Zapytania z godziną podróży mają canonical do głównej strony językowej.

Zweryfikuj METAR timestamp i stany źródeł. Celowo wyłącz model, a następnie sprawdź, że TAF nadal działa. Zapytanie do collectora bez nagłówka musi dać 401 (lub 503 przy braku konfiguracji). Pierwsze uruchomienie autoryzowanego collectora zapisze historię; nie uruchamiaj go tylko dla testu, gdy istnieją rzeczywiste subskrypcje powiadomień.

Strona jakości mierzy pogodę, nie odwołania. Brier jest pokazywany od 30 dopasowanych próbek i nie stanowi jeszcze sezonowej walidacji.

Dotychczasowy adres `/api/weather-alerts` pozostał jako alias chronionego collectora. Integracja X jest wyłącznie serwerowa i domyślnie wyłączona. Wymaga `X_ALERTS_ENABLED=true` oraz czterech prywatnych zmiennych OAuth: `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_SECRET`. Collector może publikować zmianę oceny pogody (do 90 wiadomości miesięcznie, najwyżej raz na 15 minut), nigdy stwierdzenie o zamknięciu lotniska na podstawie METAR-u. Testy nie wysyłają rzeczywistych wiadomości.

## Badawczy model mgły

Uczony model nie zastępuje publicznej oceny pogody. Zamrożony wariant 2 h jest obliczany osobno przez skonfigurowany collector wyłącznie do pomiaru jakości. Skrypty umożliwiają pobranie bezpłatnej historii EPKK, wykorzystanie tego samego parsera co strona i chronologiczny test regresji logistycznej:

```bash
python scripts/download-history.py --start 2023-01-01 --end 2025-01-01 --output data/metars.jsonl
node --import tsx scripts/prepare-training.ts data/metars.jsonl data/training.jsonl 2
python -m pip install -r scripts/requirements-research.txt
python scripts/train-fog.py --input data/training.jsonl --output data/fog-model.json
```

Sprawdź zakres dat, błędy parsera, przerwy w danych i liczby przypadków pozytywnych. Skrypt porównuje z utrzymaniem ostatniej obserwacji, raportuje Brier i kalibrację oraz usuwa nakładanie się horyzontów na granicy zbiorów. Bez porównania z archiwalnymi TAF-ami i testów sezonowych artefakt zawsze ma `deployment_eligible=false`. Sama regresja na historii nie uprawnia do publikowania procentu odwołań lotów.

W środowisku z obowiązkowym proxy sieciowym na Node 24 uruchamiaj serwer z `NODE_USE_ENV_PROXY=1`, zachowując dostarczone zmienne proxy i zaufanie certyfikatom. Nie wyłączaj weryfikacji TLS.

## Prospektywne porównanie modelu 2 h

Po wdrożeniu i konfiguracji `CRON_SECRET`, Redis i zadania co 30 minut według powyższych kroków collector zapisuje najwyżej jedną prognozę modelu na godzinę UTC. Nie potrzeba dodatkowego klucza API, procesu Python ani flagi aktywującej model. Potrzebny jest świeży METAR i wystarczająca historia 6/24 h; pojedynczy odczyt z awaryjnego źródła nie tworzy predykcji. Model nie wysyła powiadomień i nie podnosi ryzyka w timeline.

Osobny klucz `krk:v2:shadow-predictions` zachowuje model, TAF i utrzymanie pomiaru dla tego samego czasu i progu 550 m. `/api/weather/quality` zwraca agregaty w polu `shadow`, w tym wspólny podzbiór do porównania. Starszy wynik TAF-u dla 1000 m pozostaje oddzielny. Stan można odczytać bez wywołania collectora. Surowe cechy modelu i TAF nie są zwracane przez publiczny endpoint jakości.

Przy testowaniu zapisu używaj mocka magazynu (`tests/fog-shadow.test.ts`). Chroniony collector obejmuje też istniejące powiadomienia/publikację; nie wywołuj go dla samego testu, jeśli te funkcje są aktywne. Szczegóły modelu, granice walidacji i odtworzenie: [dopracowanie modelu](docs/model-polish-and-shadow.md).
