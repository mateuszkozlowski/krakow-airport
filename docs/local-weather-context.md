# Lokalny mikroklimat Balic: cechy i źródła

6 października 2026. Dodano oddzielny eksperyment z cechami lokalnymi. [Protokół](local-fog-protocol.md) zapisano przed dopasowaniem; [pełny wynik](local-fog-results.json) zawiera wszystkie rodziny, podziały, progi, schematy i hashe. Nie zmieniono publicznych ocen ani zamrożonego modelu do pomiaru.

## Jak wykorzystano położenie

Badania regionu opisują wspólny wpływ rzeźby terenu, gromadzenia chłodnego powietrza, inwersji i miejskiej wyspy ciepła. W badaniach mgły porównywano Balice i Ogród Botaniczny. To uzasadnia hipotezę lokalnych cech, lecz nie stały mnożnik ryzyka za bliskość miasta. Źródła pierwotne: [Bokwa i in., 2015](https://link.springer.com/article/10.1007/s00704-015-1577-9), [Bokwa, Wypych, Hajto, 2018](https://aaqr.org/articles/aaqr-16-12-fog-0581.pdf).

Model uczony wyłącznie na EPKK już odwzorowuje część lokalnego klimatu. Stała szerokość/długość, wysokość i odległość od miasta nie rozróżniają kolejnych odczytów tej stacji. Położenie wykorzystano do obliczenia zmieniającego się oświetlenia według [NOAA](https://gml.noaa.gov/grad/solcalc/solareqns.PDF). Punkt 50.078°N / 19.785°E jest zgodny z API strony. Przybliżenie ma płaski horyzont; nie mierzy zasłonięcia słońca przez wzgórza.

- Słońce: wysokość teraz / w chwili celu, jej zmiana, przybliżony udział nocy do celu, czas od zachodu / do wschodu, długość dnia i dzienny cel. Wszystko wynika z zegara i współrzędnych, bez przyszłych pomiarów pogody.
- Chłodzenie: noc × słaby wiatr × mała różnica temperatury i punktu rosy, w połączeniu ze znanym zachmurzeniem, wcześniejszym ochłodzeniem, zamykaniem różnicy i udziałem meldunków opadu. CAVOK/NSC nie oznaczają całkowicie bezchmurnego nieba; udział meldunków RA/DZ nie mierzy ilości opadu ani wilgotności gruntu.
- Kierunki: osiem sektorów w połączeniu z nocą, wilgocią i prędkością wiatru, bez ręcznego wyboru groźnego kierunku. VRB/cisza nie udają wiatru północnego. METAR nie mierzy spływu powietrza ze zboczy.

## Wyniki

Pięć rodzin, 2/6 h, trzy sprawdzenia czasowe: **30 dopasowań z oddzielną kalibracją**. Lata 2025/2026 wyłączono przed tworzeniem macierzy; parametry i progi 10/30/50% były stałe. Użyto wcześniejszych lat rozwojowych, więc nie jest to nowa niezależna walidacja. Cel: **widzialność METAR <550 m**, nie RVR, samo zjawisko mgły ani odwołania lotów.

| Rodzina | Nowe cechy | 2 h: Brier razem ↓ | 6 h: Brier razem ↓ |
|---|---:|---:|---:|
| Dotychczasowe wejścia | 0 | 0,009090 | 0,012534 |
| Położenie słońca | 8 | 0,008948 | 0,012844 |
| Słońce + chłodzenie | 14 | 0,008935 | 0,012873 |
| Słońce + kierunki | 16 | 0,008965 | 0,012822 |
| Wszystkie dodatki | 22 | 0,008933 | 0,012804 |

Wartości łączne są ważone liczbą odczytów: 52 556 dla 2 h i 52 531 dla 6 h.

| 2 h / rok | Dotychczasowy ↓ | Słońce ↓ | Słońce + chłodzenie ↓ |
|---|---:|---:|---:|
| 2022 | 0,009044 | 0,008908 | 0,008831 |
| 2023 | 0,006524 | 0,006452 | 0,006497 |
| 2024 | 0,011693 | 0,011477 | 0,011471 |

Słońce oraz słońce + chłodzenie poprawiają Brier całości i grupy obecnie dobrej widzialności w trzech latach. Względna poprawa łącznego Brier to **1,56% i 1,70%**. To zmiana błędu probabilistycznego, nie wzrost trafności prognoz odwołań. Przedziały 95% sparowanego bootstrapu po dniach (500 powtórzeń) obejmują zero dla słońca w 2022/2023 i dla chłodzenia we wszystkich latach. Dla słońca w 2024 różnica to −0,000216, przedział [−0,000459; −0,000022]. Kolejne dni też mogą być zależne; przedziały są przybliżeniem.

Wszystkie dodatki 6 h pogorszyły Brier w każdym sprawdzanym roku; łączne pogorszenie to 2,16–2,70%. Kierunki i pełny zestaw 2 h nie poprawiają obu wymaganych grup we wszystkich latach.

## Początki pogorszenia

Ustalony próg 30%, reguły przerw i cenzurowania z wcześniejszego protokołu. To nie liczby wysłanych powiadomień.

| Rok | Dotychczasowy: wykryte / dostępne początki | Słońce | Słońce + chłodzenie | Fałszywe ciągi: dotychczasowy / słońce / chłodzenie |
|---|---:|---:|---:|---:|
| 2022 | 10 / 50 | 11 / 50 | 13 / 50 | 11 / 15 / 24 |
| 2023 | 9 / 44 | 9 / 44 | 11 / 44 | 13 / 15 / 19 |
| 2024 | 4 / 58 | 5 / 58 | 5 / 58 | 12 / 11 / 10 |

Do przyszłego porównania najbardziej uzasadniony jest oszczędny wariant słoneczny 2 h. Interakcje chłodzenia nasilają fałszywe wskazania w dwóch latach. Nadal niska wykrywalność początku przy tym progu nie uzasadnia samodzielnego alarmowania pasażerów. Nie ponawiano oceny na 2026 ani nie dobierano nowego progu. Collector pozostaje na wcześniejszym modelu; nowy kandydat wymaga osobnej wersji i pomiaru na przyszłych danych względem tego samego TAF-u.

## Dodatkowe pomiary

| Sygnał | Warunek użycia |
|---|---|
| Temperatura miasta − temperatura lotniska | Dwa pomiary, zgodne czasy, kontrola wieku, znane położenie i wysokość czujników. Sama różnica nie izoluje wyspy ciepła od rzeźby terenu |
| Temperatura wzgórza − temperatura obniżenia | Sygnał inwersji wymaga pomiarów na różnych wysokościach lub profilu pionowego |
| Ciśnienie i jego wcześniejsza zmiana | Lokalne obserwacje z jednostkami i czasem dostępności mogą dostarczyć kontekstu synoptycznego |
| Śnieg / wilgoć gruntu / ilość wcześniejszego opadu | Pomiar lub prognoza znana w chwili ostrzeżenia; odpowiednia lokalizacja i rozdzielczość |
| Profil temperatury / warstwa mieszania | Prognoza wydana wcześniej. Reanaliza pomaga badać mechanizm, lecz nie zastępuje prognozy dostępnej w tamtej chwili |

Sprawdzono dwa bezpłatne archiwa IMGW, nie tylko katalog. [Balice 2018](https://danepubliczne.imgw.pl/data/dane_pomiarowo_obserwacyjne/dane_meteorologiczne/terminowe/synop/2018/2018_566_s.zip) zawiera 8760 godzinowych wierszy KRAKÓW-BALICE. [Styczeń 2018, klimat](https://danepubliczne.imgw.pl/data/dane_pomiarowo_obserwacyjne/dane_meteorologiczne/terminowe/klimat/2018/2018_01_k.zip) zawiera 93 wiersze KRAKÓW-OBSERWATORIUM o 06/12/18. [Kontrola źródeł](local-source-check.json) zachowuje hashe i strukturę. Nie potwierdza to bieżącego API miejskiej temperatury ani kompletnej serii 2018–2024. Tych danych nie dołączono: potrzebne są kontrola lokalizacji, flag jakości, pełnej historii i czasu publikacji. Przyszły pomiar lub minimum dobowe nie mogą być wejściem wcześniejszej prognozy.

## Odtworzenie i weryfikacja

```sh
OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 python scripts/evaluate-local-fog.py --inputs data/iterations2h.jsonl data/iterations6h.jsonl --output docs/local-fog-results.json
python -m unittest discover -s tests -p '*_test.py'
```

Przygotowanie wejść opisuje [poprzednia iteracja](model-iterations-2026.md). Nie zmieniono wcześniejszych cech, skryptów ani artefaktów. Predykcje: `data/local-predictions-{2,6}h.jsonl`, celowo poza repozytorium. Niezależnie przeliczono wszystkie 36 wartości Brier z predykcji; zgodność bazowego modelu z poprzednim przebiegiem do 10⁻¹². Sprawdzono hashe i chronologię. Testy Pythona: 11/11, w tym 7 nowych o astronomii, DST i brakach danych. Testy aplikacji: 52/52; lint i build produkcyjny z TypeScript przeszły. Wdrożenia publicznego i rzeczywistych powiadomień nie wykonano.
