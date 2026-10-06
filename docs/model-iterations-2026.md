# Kolejne iteracje modelu: wcześniejsze sezony i test 2026

Nowsza aktualizacja: [sprawdzenie stabilności oraz zapis prognoz do przyszłego porównania](model-polish-and-shadow.md). Poniższe wyniki pozostają zamrożone.

6 października 2026. Przeprowadzono 20 porównań kandydatów: po 10 dla horyzontu 2 i 6 godzin. Poszerzenie historii i wybór wariantu poprawiły wynik dla 2 h. Poprawa dla 6 h jest mniejsza i niepewna. Modele pozostają badawcze; nie zmieniają publicznej oceny pogody.

Cel nadal oznacza **widzialność przeważającą w METAR poniżej 550 m**, nie RVR, wystąpienie każdej mgły ani odwołanie lub przekierowanie lotu. Brier mierzy błąd prawdopodobieństw; niższy wynik jest lepszy. Spadek Brier o 12% nie oznacza wzrostu „trafności lotów” o 12 punktów procentowych.

## Jak oddzielono strojenie od sprawdzania

[Protokół](model-iterations-2026-protocol.md) zapisano przed oglądaniem wyników i etykiet 2026. Obejrzany wcześniej 2025 jest całkowicie wyłączony z nowego uczenia, kalibracji, wyboru i testu.

1. Uczenie wariantów na 2018–2021, osobna kalibracja sigmoid na 2022, wybór najniższego skalibrowanego Brier na 2023. To okres rozwojowy; jego wynik nie jest niezależną walidacją.
2. Wybrany wariant uczony ponownie na 2018–2023, kalibrator na 2024. Po dopasowaniu kalibratora klasyfikator pozostaje niezmieniony.
3. Zamrożone predykcje ocenione na styczeń–wrzesień 2026. Punktem odniesienia jest poprzednia prosta regresja uczona na 2023 i skalibrowana na 2024, z zachowanymi wcześniej parametrami. **Oba modele porównano na tych samych godzinach 2026**, nie poprzez zestawienie wyniku z 2025 z wynikiem innego sezonu.

Kandydaci: 17 cech bazowych albo 58 istniejących cech rozszerzonych, regresja logistyczna z C=0,01/0,1/1, boosting w dwóch ustalonych konfiguracjach. Łącznie 10 kandydatów na horyzont. Brak równoważenia klas, doboru progów alarmu na teście i automatycznego wcześniejszego zatrzymania. Seed 42. Pełne wyniki wszystkich kandydatów, również bez kalibracji, zachowano w artefakcie.

Rozszerzone cechy opisują wcześniejsze pomiary, m.in. trend różnicy temperatury i punktu rosy, widzialność i wiatr z poprzednich godzin, zachmurzenie, występowanie opadu oraz porę prognozowanego zdarzenia. Nie dołączono nowych źródeł PM10 ani archiwalnych modeli numerycznych. Żadna cecha pogodowa nie korzysta z pomiaru po chwili predykcji; przyszła pora doby jest znana z góry.

## Dane

IEM: 87 584 dodatkowe obserwacje z 2018–2022 i 13 097 z pierwszych trzech kwartałów 2026. Po połączeniu z wcześniejszą historią 2023–2024 i usunięciu 2025: 135 761 unikalnych surowych obserwacji. To obserwacje półgodzinne, nie niezależne zdarzenia pogodowe.

Parser odrzucił 5 starych raportów z 6 lutego 2021, 08:00–10:00 UTC, z historyczną grupą stanu pasa `R25/28//95`. Biblioteka nie obsłużyła jej kodu. Raportów nie poprawiano ręcznie po zobaczeniu wyniku; wykluczenie jest jawne. Zostało 135 756 sparsowanych obserwacji, 1 z brakującymi wymaganymi wejściami, oraz 73/108 brakujących dopasowań celu dla 2/6 h. Dopasowanie pomiaru weryfikującego: najbliższy w tolerancji ±15 min; rzeczywisty czas tego odczytu zachowany w danych.

Cele przecinające granice okresów usunięto z dodatkowym buforem 2 h. Przy kontroli znaleziono błąd porównywania tekstowych dat ISO na dokładnej granicy bufora: format `.000Z` i `Z` dawał niewłaściwą kolejność. Zmieniono porównanie na daty i powtórzono cały eksperyment z **tym samym protokołem, kandydatami i regułą wyboru**. Wybrane warianty pozostały te same. Ostateczny artefakt zawiera wyłącznie wyniki po tej poprawce; nie dostrajano parametrów do obejrzanego testu.

| Okres | Odczyty 2 h / poniżej 550 m | Odczyty 6 h / poniżej 550 m |
|---|---:|---:|
| Rozwojowe uczenie 2018–2021 | 70 009 / 1 464 | 69 986 / 1 459 |
| Rozwojowa kalibracja 2022 | 17 500 / 250 | 17 491 / 250 |
| Wybór wariantu 2023 | 17 504 / 157 | 17 496 / 157 |
| Końcowe uczenie 2018–2023 | 105 029 / 1 871 | 105 005 / 1 866 |
| Końcowa kalibracja 2024 | 17 552 / 394 | 17 544 / 394 |
| Test styczeń–wrzesień 2026 | 13 089 / 130 | 13 078 / 130 |

## Wynik na 2026

Dla 2 h wybrano rozszerzoną regresję C=0,01, z silniejszą regularyzacją. Dla 6 h: rozszerzony boosting, 150 iteracji, do 15 liści, minimum 60 odczytów w liściu, L2=10. Oba warianty używają kalibracji sigmoid z 2024.

| Metoda, te same godziny testowe | Brier 2 h ↓ | Brier 6 h ↓ |
|---|---:|---:|
| Poprzednia zamrożona regresja + sigmoid | 0,006770 | 0,008893 |
| Nowy wybrany model + sigmoid | **0,005945** | **0,008485** |
| Nowy wybrany model bez kalibracji | 0,006003 | 0,008631 |
| Utrzymanie aktualnej widzialności | 0,009626 | 0,018504 |
| Historyczna częstość według miesiąca/pory dnia | 0,009674 | 0,009681 |
| Stała częstość z danych treningowych | 0,009895 | 0,009903 |

Względem poprzedniego modelu: spadek Brier **12,2% dla 2 h i 4,6% dla 6 h**. Nie można przypisać zysku samym rozszerzonym cechom: zmieniły się też lata uczenia i wybrana konfiguracja. Wcześniejszy eksperyment z jednym rokiem uczenia i 157 dodatnimi odczytami nadal pokazuje, że te same rozszerzenia mogą zaszkodzić przy skromniejszej historii.

Tygodniowy sparowany bootstrap, 1000 losowań, 40 bloków. Przedział 95% różnicy Brier „nowy minus poprzedni”: 2 h **[-0,001706; -0,000140]**, 6 h **[-0,001047; +0,000216]**. Dla 2 h przemawia za poprawą w tym okresie; dla 6 h obejmuje zero. Nie obejmuje niepewności ponownego uczenia ani różnic między niezależnymi sezonami. Nie wykonano korekty na wielokrotne porównania.

Średnie prawdopodobieństwo nowego modelu: 1,06% / 1,05%, przy rzeczywistej częstości około 0,99%. To zgodność średnich, nie dowód poprawnej kalibracji każdego przedziału. Pełne przedziały kalibracji, wyniki kwartalne i osobne grupy „aktualnie >=550 m” / „aktualnie <550 m” znajdują się w JSON. Q1/Q2/Q3 zawierają odpowiednio 81/19/30 dodatnich odczytów. Podział według aktualnej widzialności nie jest detektorem niezależnych początków i końców epizodów mgły.

## Czy nadaje się do ostrzegania pasażerów

Jeszcze nie ma wystarczającego potwierdzenia. Przykładowe, ustalone z góry progi pokazują koszt fałszywych alarmów:

| Horyzont / próg | Trafne wskazania | Fałszywe wskazania | Pominięte odczyty <550 m | Odsetek trafnych wskazań | Wykryta część odczytów <550 m |
|---|---:|---:|---:|---:|---:|
| 2 h / 10% | 94 | 146 | 36 | 39,2% | 72,3% |
| 2 h / 30% | 65 | 39 | 65 | 62,5% | 50,0% |
| 6 h / 10% | 53 | 203 | 77 | 20,7% | 40,8% |
| 6 h / 30% | 21 | 26 | 109 | 44,7% | 16,2% |

Wiersze dotyczą półgodzinnych odczytów, nie liczby wysłanych powiadomień ani dotkniętych lotów. Przy progu 10% około 79% wskazań modelu 6 h jest fałszywych. Mniejszy średni błąd nie wystarcza do deklarowania użytecznego alarmu.

Brakuje Q4, czyli sezonu jesiennych mgieł, porównania z **TAF znanym w chwili prognozy**, oraz czasów rzeczywistego otrzymania historycznych METAR-ów. Nie ma etykiet odwołań/przekierowań. 2026 po tym porównaniu jest obejrzany; nie powinien służyć do kolejnego „niezależnego” testu po dostrojeniu do tych wyników.

Następny sprawdzian: zachować Q4 jako przyszły okres dla zamrożonych kandydatów, gromadzić wydane prognozy wraz z czasem ich dostępności, porównać TAF i model na tych samych momentach oraz oceniać fałszywe alarmy na epizodach i docelowym wyprzedzeniu. Osobny model początku i ustępowania mgły pozostaje hipotezą do kolejnego protokołu.

## Odtworzenie

Użyte wersje: Python 3.12.14, NumPy 2.3.5, scikit-learn 1.8.0.

```bash
python -m pip install -r scripts/requirements-research.txt
python scripts/download-history.py --start 2018-01-01 --end 2023-01-01 --output data/metars-2018-2022.jsonl
python scripts/download-history.py --start 2023-01-01 --end 2026-01-01 --output data/metars-2023-2025.jsonl
python scripts/download-history.py --start 2026-01-01 --end 2026-10-01 --output data/metars-2026-q3.jsonl
python - <<'PY'
import json
from pathlib import Path
records = {}
for name in ['metars-2018-2022', 'metars-2023-2025', 'metars-2026-q3']:
    for line in Path(f'data/{name}.jsonl').read_text().splitlines():
        row = json.loads(line)
        if not row['at'].startswith('2025'):
            records[row['at']] = row
Path('data/metars-iterations.jsonl').write_text(''.join(json.dumps(records[t]) + '\n' for t in sorted(records)))
PY
node --import tsx scripts/prepare-training.ts data/metars-iterations.jsonl data/iterations2h.jsonl 2 extended
node --import tsx scripts/prepare-training.ts data/metars-iterations.jsonl data/iterations6h.jsonl 6 extended
OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 python scripts/iterate-fog.py --inputs data/iterations2h.jsonl data/iterations6h.jsonl --output docs/fog-iterations-2026.json
```

[Pełny artefakt](fog-iterations-2026.json) zawiera hashe danych/implementacji/protokołu, wszystkie wyniki, liczbę obserwacji, granice podziałów, parametry modeli i kalibratorów oraz współczynniki wybranej regresji. Zamrożone predykcje są w ignorowanych `data/iteration-predictions-{2,6}h.jsonl`, wraz z hashami w artefakcie. Boosting można odtworzyć z ustalonych danych i parametrów; nie zapisano produkcyjnego modelu do wdrożenia. Ponowne pobranie zmienionego archiwum może dać inny hash.

Sprawdzono hashe wszystkich wejść i plików implementacji, ścisłe granice okresów, zgodność cech i czasu celu, wybór minimum spośród 10 kandydatów oraz niezależnie przeliczono wszystkie 6 końcowych wyników Brier z zapisanych predykcji dla obu horyzontów. Wyniki są gotowe do przeglądu bez ponownego uczenia.
