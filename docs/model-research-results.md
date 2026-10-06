# Badawczy model mgły EPKK: wyniki

Eksperyment wykonany 6 października 2026. **Żaden model nie jest podłączony do publicznej oceny.** Cel: widzialność z METAR-u poniżej 550 m, nie odwołanie lotu ani RVR.

**Aktualizacja:** wykonano już [niezależny test 2025 i kalibrację](model-holdout-2025.md), opisane osobno. Poniżej zachowano wcześniejsze eksperymenty i ich ograniczenia.

Źródło: [Iowa Environmental Mesonet, PL__ASOS / EPKK](https://mesonet.agron.iastate.edu/request/download.phtml), od 2023-01-01 do 2025-01-01 (koniec wyłączony). Pobrano 35 080 unikalnych obserwacji; jeden odstęp między kolejnymi rekordami przekraczał godzinę. W tej próbce wspólny parser aplikacji odkodował wszystkie komunikaty.

Dla 2 h przygotowano 35 068 dopasowanych przykładów (12 bez dopasowanego wyniku); dla 6 h 35 060 (20 bez wyniku). Obserwacja weryfikująca jest oddalona od celu o najwyżej 15 minut.

Podział chronologiczny 80/20. Skalowanie regresji dopasowano tylko na treningu. Z treningu usunięto rekordy, których cele wchodzą w dwugodzinne okno przed początkiem testu. Model gradient boosting ma z góry ustalone parametry i wyłączony losowy podział early stopping. To eksperyment badawczy na jednym okresie, nie niezależna sezonowa walidacja ani test istotności.

| Horyzont | Model | Trening | Test | Przypadki <550 m w teście | Brier modelu ↓ | Brier utrzymania ostatniej obserwacji ↓ |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 2 h | logistic | 28046 | 7014 | 299 | 0.02770 | 0.02281 |
| 2 h | gradient-boosting | 28046 | 7014 | 299 | 0.02793 | 0.02281 |
| 6 h | logistic | 28032 | 7012 | 299 | 0.03954 | 0.05134 |
| 6 h | gradient-boosting | 28032 | 7012 | 299 | 0.03999 | 0.05134 |

## Interpretacja

- Przy 2 h obie metody są gorsze od utrzymania ostatniej obserwacji. Samo „ML” nie jest ulepszeniem.
- Przy 6 h obie metody są lepsze od tego punktu odniesienia. Regresja zmniejsza Brier o około 23% względem utrzymania obserwacji, ale **nie porównano jej z TAF-em**. To nie jest 23% poprawy trafności lotów ani dowód kalibracji w innym sezonie.
- Kolejny krok: osobny późniejszy okres, testy zimy/lata oraz porównanie z prognozami TAF wydanymi przed tymi samymi zdarzeniami. Nie dobierać modelu lub progu alarmu na tym samym zbiorze, na którym deklarujemy końcowy wynik.
- PM10, radar, opad poprzedniej doby i modelowa wilgotność gruntu nie weszły do tego eksperymentu. Nie deklarujemy ich dodatkowej skuteczności.

## Powtarzalność

Polecenia znajdują się w [DEPLOYMENT.md](../DEPLOYMENT.md). Dla horyzontu 6 h zmień ostatni argument przygotowania danych na `6`. `train-fog.py --model gradient-boosting` wybiera drugą metodę. Artefakty JSON zawierają przedziały kalibracji, macierz pomyłek i ustawienie `deployment_eligible=false`. Dane w `data/` są lokalne i ignorowane przez Git.

SHA-256 pobranego pliku METAR JSONL: `e4679612b7265db0f1232bc630579e80a5bba34bd85a2dda5823e94a2c6cd564`.


## Dalszy eksperyment: trzy kolejne kwartały

Wykonano `scripts/validate-fog.py` na tych samych danych, dla 2 h i 6 h. Trening rozszerza się przed każdym testowanym kwartałem (II, III, IV kwartał 2024). Cele treningowe muszą być wcześniejsze niż początek kwartału minus 2 godziny; cele testowe nie mogą wychodzić poza jego koniec. Granice kwartałów są w UTC. Parametry modeli pozostają takie jak wcześniej, bez strojenia na kwartalnych wynikach. To **ponowna analiza już oglądanych danych**, nie nowy niezależny zbiór testowy.

Dodano dwa proste porównania: stałą częstość zdarzeń na treningu i częstość według miesiąca oraz 6-godzinnej pory dnia docelowej godziny (czas krakowski, wygładzenie 50 obserwacjami z częstości treningowej). Obie metody korzystają wyłącznie z historii sprzed testowanego kwartału. Regresja i gradient boosting nadal mają dokładnie te same cechy wejściowe co poprzednio.

| Horyzont | Kwartał | Próbki testowe | Widzialność <550 m | Brier regresji ↓ | Brier gradient boosting ↓ | Brier utrzymania obserwacji ↓ |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 2 h | 2024-Q2 | 4364 | 21 | 0.00383 | 0.00381 | 0.00642 |
| 2 h | 2024-Q3 | 4412 | 37 | 0.00609 | 0.00644 | 0.01088 |
| 2 h | 2024-Q4 | 4404 | 281 | 0.04106 | 0.04166 | 0.03224 |
| 6 h | 2024-Q2 | 4356 | 21 | 0.00468 | 0.00427 | 0.00964 |
| 6 h | 2024-Q3 | 4404 | 37 | 0.00746 | 0.00785 | 0.01680 |
| 6 h | 2024-Q4 | 4396 | 281 | 0.05925 | 0.06057 | 0.07370 |

Łącznie w trzech kwartałach regresja dla 2 h ma Brier 0,01703, a utrzymanie obserwacji 0,01654. Dla 6 h: 0,02385 i 0,03344. Historyczna częstość daje odpowiednio 0,02535 i 0,02539; pora dnia/miesiąc: 0,02527 i 0,02532. Horyzonty różnią się nieznacznie liczbą próbek na granicach kwartałów, więc nie są bezpośrednim rankingiem tych samych celów.

**Najważniejsze ograniczenie to kalibracja.** W 6-godzinnych testach regresja przewiduje średnio 0,69% szans zdarzenia, podczas gdy wystąpiło ono w 2,58% próbek. W przedziale prognoz 1–5% (1507 próbek) zdarzenie wystąpiło w 7,50%. Te procenty są opisem badania, nie prawdopodobieństwami, które wolno pokazać podróżnemu. W IV kwartale dla 2 h regresja jest wyraźnie gorsza od utrzymania obserwacji. Poprawa średniej nie oznacza poprawy w każdym sezonie.

Różnice Brier sprawdzono w 1000 sparowanych losowaniach całych tygodni kalendarzowych (40 bloków; przechowujemy zależność obserwacji w obrębie tygodnia). Dla regresji 2 h względem utrzymania obserwacji przedział 95% wynosi [-0,00329; 0,00518] i obejmuje zero. Dla 6 h: [-0,01529; -0,00449]. Ujemna różnica oznacza niższy Brier modelu. To niepewność wyniku przy ustalonych predykcjach, bez ponownego trenowania; ponowne użycie danych, zależności między tygodniami i brak TAF-u ograniczają wnioski. 339 niskich odczytów nie oznacza 339 niezależnych epizodów mgły.

Zapisano także wyniki osobno dla sytuacji, gdy już jest widzialność <550 m, i gdy obecnie wynosi co najmniej 550 m. Nie należy mieszać utrzymywania istniejącej mgły z jej nowym wystąpieniem. Cel pozostaje meteorologiczny: słaba widzialność, nie każdy rodzaj mgły, RVR ani odwołanie lotu.

Pełne kwartalne wyniki, przedziały kalibracji, porównania i hashe danych: [fog-validation-results.json](fog-validation-results.json). Powtórzenie:

```bash
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=2 python3 scripts/validate-fog.py --inputs data/training.jsonl data/training6h.jsonl --output data/fog-validation.json
```

Następny eksperyment powinien użyć nowego, nieoglądanego roku. Ewentualną kalibrację należy dopasować na wcześniejszym wydzielonym okresie, a następnie zamrozić i sprawdzić na nowym roku razem z TAF-em wydanym przed zdarzeniami. **Modele pozostają odłączone od ocen na stronie (`deployment_eligible=false`).**
