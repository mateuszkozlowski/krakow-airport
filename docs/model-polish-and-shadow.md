# Dopracowanie modelu i pomiar na przyszłych danych

Dodatkowe porównanie po sugestii o mikroklimacie: [położenie słońca, nocne chłodzenie, kierunki i źródła miejskich pomiarów](local-weather-context.md). Zamrożonego modelu opisanego poniżej nie zmieniono.

6 października 2026. Gotowe w kodzie: model 2 h, zgodność Python/TypeScript, zapis prognoz przed wynikiem i wspólna ocena modelu/TAF/ostatniego pomiaru. Model nie zmienia publicznych ocen utrudnień ani powiadomień. Ciągły pomiar wymaga wdrożenia oraz skonfigurowanego collectora; obecnie Redis jest dostępny, ale `CRON_SECRET` nie jest ustawiony.

## Kolejne porównanie

[Protokół](model-polish-protocol.md) ustalono przed przebiegiem. Dwie rodziny — model globalny i osobne modele dla aktualnie dobrej/słabej widzialności — sprawdzono dla 2/6 h w trzech okresach. Łącznie 12 wyników rodzin, 18 dopasowań klasyfikatorów z osobnymi kalibratorami. Parametry były stałe; nie przeszukiwano kolejnej siatki ani progów alarmu.

Sprawdzenia 2022/2023/2024 korzystają odpowiednio z uczenia 2018–2020/2021/2022 i kalibracji na kolejnym roku. Lata 2025/2026 są wyłączone. To wcześniej użyte dane rozwojowe, więc nie jest to nowy niezależny test. Zdarzenie oznacza przeważającą widzialność METAR <550 m, nie RVR lub wynik lotu. Źródło: [IEM](https://mesonet.agron.iastate.edu/request/download.phtml); przygotowanie i wykluczenia opisuje [poprzednia iteracja](model-iterations-2026.md).

| Horyzont / rok | Brier globalny ↓ | Brier osobnych modeli ↓ |
|---|---:|---:|
| 2 h / 2022 | 0,009044 | 0,008721 |
| 2 h / 2023 | 0,006524 | 0,006666 |
| 2 h / 2024 | 0,011693 | 0,011967 |
| 6 h / 2022 | 0,010726 | 0,010985 |
| 6 h / 2023 | 0,008599 | 0,008585 |
| 6 h / 2024 | 0,018261 | 0,018783 |

Podział nie daje stabilnej poprawy. Zachowano wcześniejszą, zamrożoną regresję 2 h z kalibracją sigmoid do przyszłego pomiaru. Nowych wariantów nie oceniano ponownie na obejrzanym 2026 ani nie aktywowano w ocenach pasażerskich. Model 6 h pozostaje badawczy.

## Początki pogorszenia i fałszywe wskazania

Potwierdzony początek: pierwszy odczyt <550 m po odczycie >=550 m, przy odstępie <=45 min. Początek zbioru i luki nie tworzą fikcyjnych początków. Wykrycie wymaga wskazania wydanego **przed** początkiem, przy dobrej bieżącej widzialności, z późniejszym dodatnim celem w epizodzie.

Model 2 h, ustalony próg 30%:

| Rok | Globalny: wykryte / epizody z prognozą | Osobne: wykryte / epizody z prognozą | Ciągi fałszywych wskazań: globalny / osobne |
|---|---:|---:|---:|
| 2022 | 10 / 50 | 16 / 50 | 11 / 24 |
| 2023 | 9 / 44 | 13 / 44 | 13 / 34 |
| 2024 | 4 / 58 | 9 / 58 | 12 / 20 |

Więcej wykrytych początków okupiono dodatkowymi fałszywymi wskazaniami. To nie liczby wysłanych powiadomień ani odwołanych lotów. Potwierdzonych początków było 54/45/61; część nie ma predykcji wydanej wcześniej. Mediany wyprzedzenia globalnego modelu dla wykrytych epizodów: 90/90/30 min. Prognoza odczytu za 2 h nie oznacza ostrzeżenia o początku mgły zawsze 2 h wcześniej.

[Pełne wyniki](fog-polish-results.json): oba horyzonty, progi 10/30/50%, osobne grupy dobrej/słabej widzialności, log loss, average precision, liczby próbek i hashe. Nie dobierano progu do tych wyników. Pierwszy przebieg zatrzymał się przed oceną wskutek granicy daty bez strefy czasowej; poprawiono format UTC bez zmiany protokołu. Końcowy zapis predykcji zawiera także czas celu i bieżący stan widzialności, aby umożliwić kontrolę obliczeń.

## Gotowy model do pomiaru

`src/lib/weather/artifacts/fog-2h-v1.json` zawiera wcześniej wybrane, niezmienione współczynniki, skalowanie i kalibrator. Eksport sprawdza hashe źródeł/protokołu. Model działa wyłącznie na serwerze, bez Pythona i nowych zależności w działającej stronie.

[Kontrola zgodności](fog-shadow-parity.json): 13 089 zachowanych predykcji, maksymalna różnica Python/TypeScript **5,55×10⁻¹⁶**, tolerancja 10⁻¹². To sprawdzenie implementacji tych samych predykcji, nie dodatkowa walidacja skuteczności.

Wejście wymaga świeżego METAR-u nie późniejszego niż zapis, wieku <=45 min i dostępnej temperatury, punktu rosy, wiatru i widzialności. Kontekst 6/24 h musi być kompletny według istniejących flag przerw i mieć >=80% oczekiwanych odczytów. Pojedynczy METAR z awaryjnego źródła nie wystarcza. Braki nie tworzą fikcyjnej prognozy; zwykły TAF pozostaje dostępny.

## Zapis i ocena

- Najwyżej jedna predykcja modelu na godzinę UTC, atomowo. Ponowienie lub zmiana TAF-u nie zastępuje pierwszego zapisu.
- Cel: czas obserwacji +2 h. Czas powstania predykcji pochodzi z działania collectora po pobraniu źródeł. Faktyczne wyprzedzenie 75–120 min przy dopuszczonym wieku obserwacji jest raportowane osobno.
- Ten sam cel dla modelu, utrzymania pomiaru i TAF-u znanego w chwili zapisu. Zachowane wejścia modelu i treść/czas wydania TAF-u. Wpływające na zdarzenie TEMPO/BECMG bez liczbowej szansy oznacza brak liczbowego TAF-u, nie 0%.
- Osobny zbiór 550 m; nie mieszamy go ze starszym pomiarem TAF-u dla 1000 m. Porównanie trzech źródeł używa wspólnych godzin z liczbowymi prognozami. Pozostałe odczyty mają odrębne wyniki i licznik braku TAF-u.
- Późniejszy METAR: tolerancja ±15 min. Sprzeczne rewizje i najbliższy odczyt z brakującą widzialnością pozostają nieznanym wynikiem. Indeks wyszukuje wynik bez przeglądania całej historii dla każdej prognozy. 4320 obserwacji / 2160 wyszukań: około 9 ms w jednym sprawdzeniu w tym środowisku; nie jest to benchmark całego API.
- Stały próg wskazania 30%. Brier i liczby trafionych/pominiętych/fałszywych odczytów, także osobno przy dobrej aktualnej widzialności. Odczyty w epizodzie nie są niezależne.
- Publiczna strona jakości: osobne rozwijane porównanie PL/EN po 30 wspólnych odczytach, z zastrzeżeniem małej próby. API zwraca agregaty i identyfikator modelu, bez surowych wejść lub współczynników.
- Awaria jednej części odczytu nie ukrywa drugiej. Retencja 90 dni, blokada powtórnego zapisu 91 dni.

Konfiguracja: [DEPLOYMENT.md](../DEPLOYMENT.md). Chroniony endpoint bez skonfigurowanego sekretu zwraca 503, bez poprawnego sekretu — 401. Podczas testów nie wywoływano go z autoryzacją: zapis/awarie sprawdzono z mockiem, bez prawdziwych powiadomień, publikacji i sztucznych danych w rzeczywistym Redis.

## Kontrola i odtworzenie

```bash
OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 python scripts/polish-fog.py --inputs data/iterations2h.jsonl data/iterations6h.jsonl --output docs/fog-polish-results.json
python scripts/export-fog-shadow.py
node --conditions=react-server --import tsx scripts/verify-fog-shadow.ts
python -m unittest discover -s tests -p '*_test.py'
npm test
npm run lint
npm run build
```

Wejścia odtwarza poprzednia iteracja. Sprawdzono hashe, ścisłe granice okresów i niezależnie przeliczono 18 Brier z zapisanych predykcji. Testy metryk obejmują cenzurowane początki, luki, spóźnione wskazania i ciągi fałszywych odczytów. Przeszły 52 testy aplikacji, 4 testy metryk, lint i build z kontrolą TypeScript. Do oceny pełnego sezonu potrzebne są przyszłe obserwacje i TAF-y zachowane na bieżąco. Wyniki nie potwierdzają trafności odwołań lotów.
