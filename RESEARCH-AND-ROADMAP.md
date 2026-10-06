# KRK.flights: research, nisza i decyzje

Research wykonany 6 października 2026. To porównanie publicznie dostępnych funkcji i dokumentacji, nie pomiar udziałów w rynku, ruchu ani konwersji konkurencji. Właściciel potwierdził, że strona nie ma działających reklam, afiliacji ani przychodu. Obecna wersja jest niekomercyjna; stare skrypty reklamowe i niedziałające odnośniki afiliacyjne usunięto.

## Proponowana nisza

**„Co pogoda w Balicach oznacza o godzinie mojej podróży, co jeszcze może się zmienić i kiedy warto sprawdzić ponownie?”**

Samo „czy jest mgła” już ma konkurencję. Przewaga powinna wynikać z czytelnej interpretacji przyszłych godzin, rozdzielenia przylotów i odlotów, przypomnień oraz uczciwego pokazywania źródeł i niepewności. Nie próbujemy zastąpić globalnego trackera lotów bez danych o rotacji samolotów, kontroli ruchu i faktycznych statusach. Ta nisza jest hipotezą do sprawdzenia z pasażerami, a nie dowodem unikalności.

## Konkurencja i inspiracje

| Serwis | Co oferuje według publicznych stron | Wniosek dla KRK.flights |
| --- | --- | --- |
| [jestmgla.pl](https://jestmgla.pl/) | Lokalne informacje o mgle, METAR, komunikat o sytuacji na lotnisku, tablice przylotów i odlotów, informacje o opóźnieniach i przekierowaniach, strony odpowiadające na lokalne zapytania. | Nie wyróżnimy się samym bieżącym stanem mgły. Potrzebna jest wygodna ocena przyszłej godziny i wyjaśnienie, co jest obserwacją, prognozą lub scenariuszem. Nie zakładamy prawa do kopiowania ich danych lotowych. |
| [Flighty](https://flighty.com/help/delay-predictions) | Przewidywanie opóźnień z użyciem m.in. poprzedniego lotu danego samolotu i trendów ATC; powiadomienia, rozbudowane śledzenie podróży. | Bez numeru rejestracyjnego i danych o rotacji nie obiecujemy podobnej predykcji opóźnienia. Można rozwiązać węższy problem pogodowy bez konta i płatnego rozkładu. |
| [FlightAware](https://www.flightaware.com/live/) / [Foresight](https://www.flightaware.com/commercial/foresight/) | Globalne śledzenie i prognozy wykorzystujące duże zbiory danych lotowych i pogodowych. [Pomoc FlightAware](https://support.flightaware.com/hc/en-us/articles/27638269763351-Why-Was-My-Flight-Delayed-Cancelled) zaznacza brak konkretnej przyczyny opóźnienia/odwołania. | Korelacja pogody z opóźnieniem nie dowodzi przyczyny. Wskaźnik pogody trzeba odróżnić od prawdopodobieństwa odwołania. |
| [Flightradar24 KRK](https://www.flightradar24.com/data/airports/krk/weather) | Loty, śledzenie samolotów i pogoda lotniskowa. | Uzupełniamy tracker praktyczną interpretacją, zamiast budować jego uboższą kopię. |
| [PilotHub EPKK](https://pilothub.pl/lotniska/epkk?lang=en), [Allmetsat EPKK](https://allmetsat.com/en/metar-taf/poland.php?icao=EPKK) | Informacje lotnicze i odkodowane METAR/TAF; PilotHub również informacje dla pilotów. | Pasażer potrzebuje prostego następnego kroku. Surowe komunikaty pozostają dostępne jako materiał do sprawdzenia. |
| [Kraków Airport](https://www.krakowairport.pl/) | Oficjalne informacje dla pasażerów i tablica lotów. | Status konkretnego lotu odsyłamy do lotniska lub przewoźnika. Nie pobieramy płatnego API ani nie obchodzimy ograniczeń publikowanej tablicy. |

## Źródła danych: co jest przydatne i co rzeczywiście działa

| Dane | Zastosowanie | Dostępność i ograniczenia | Decyzja |
| --- | --- | --- | --- |
| [NOAA AviationWeather API](https://aviationweather.gov/data/api/) METAR EPKK | Bieżący stan, RVR, trend widzialności, temperatura/punkt rosy, wiatr. | Bez klucza. Dokumentacja podaje historię do 30 dni. Zweryfikowano odpowiedź z historią EPKK. Wspólna pamięć podręczna ogranicza liczbę żądań; awaria jednego źródła nie blokuje innych. | Główne źródło; historia 30 h umożliwia również weryfikację po dziennym zadaniu. |
| NOAA TAF EPKK | Lotniskowa prognoza, FM, BECMG, TEMPO, PROB30/40. | Bez klucza. PROB dotyczy pogody, nie lotów. TEMPO nie oznacza stałej szansy 30%. | Główne źródło w swoim okresie ważności, pełny parser surowego tekstu. |
| CheckWX | Awaryjne METAR/TAF. | Wymaga klucza i limitów dostawcy. | Opcjonalny fallback wyłącznie po stronie serwera; aplikacja nie wymaga go do działania. |
| [Open-Meteo forecast](https://open-meteo.com/en/docs) | Dalszy horyzont, temperatura, punkt rosy, porywy, opad i modelowa widzialność. | `best_match` nie musi być modelem globalnym. Hosted free API jest dla zastosowań niekomercyjnych; [licencja API](https://open-meteo.com/en/terms) jest czymś innym niż CC BY 4.0 danych. | Włączone dla obecnej niekomercyjnej strony. Po wprowadzeniu monetyzacji ustawić `SITE_COMMERCIAL=true`; bez klucza model zostanie wyłączony. Wyniki modelowe są podpisane i nie zastępują TAF-u. |
| [ICON-D2](https://open-meteo.com/en/docs/dwd-api) / ICON-D2 EPS | Potencjalnie wysoka rozdzielczość. | Test zapytań dla 50.078, 19.785 zwrócił HTTP 400 „No data is available for this location”. | Nie wybierać w ciemno. Rozdzielczość modelu nie pomaga poza jego domeną. |
| [Ensemble Open-Meteo](https://open-meteo.com/en/docs/ensemble-api) | Rozrzut prognoz i warunki sprzyjające mgle. | Testy ICON-EU EPS, ICON Global EPS i ECMWF IFS 0.25°: brak niepustej widzialności. ICON-EU również nie zwrócił punktu rosy w badanym zapytaniu. ECMWF zwrócił temperaturę, punkt rosy i wiatr dla 51 przebiegów. To wynik sprawdzenia konkretnego API, nie gwarancja stałej dostępności. | Pokazujemy liczbę ważnych przebiegów ze spreadem ≤1°C i wiatrem ≤4 kt. To **nie jest prawdopodobieństwo mgły**, poniżej 10 ważnych przebiegów brak wyniku. Siatka około 25 km nie odwzorowuje dokładnie doliny. |
| [Iowa IEM ASOS](https://mesonet.agron.iastate.edu/request/download.phtml) | Długoterminowe uczenie i walidacja zdarzeń meteorologicznych. | Zweryfikowano EPKK w [sieci PL__ASOS](https://mesonet.agron.iastate.edu/geojson/network/PL__ASOS.geojson). Metadane początku archiwum nie dowodzą kompletności METAR-ów od tej daty. Trzeba zmierzyć braki, częstotliwość i zmiany czujników. Opadu godzinowego dla stacji poza USA nie wolno zakładać bez weryfikacji; API ostrzega o ograniczeniach. | Skrypt pobiera surowe METAR-y i tworzy powtarzalny test chronologiczny modelu mgły. Wynik nie uruchamia modelu w produkcji. |
| [Historyczne prognozy Open-Meteo](https://open-meteo.com/en/docs/historical-forecast-api) / [Single Runs](https://open-meteo.com/en/docs/single-runs-api) | Ocena tego, co model naprawdę przewidywał przed zdarzeniem. | Reanaliza po fakcie nie jest prognozą dostępną wtedy. Wybierać przebieg z czasem wydania wcześniejszym od prognozowanego zdarzenia. | Następny etap po sprawdzeniu kompletności historii. |
| [IMGW](https://dane.imgw.pl/) radar, ostrzeżenia, stacje | Burze, opad, napływ zjawisk, wilgotność gruntu. | Trzeba sprawdzić licencję, opóźnienie, pokrycie i różnicę między stacją w mieście a lotniskiem. Radar pokazuje opad, nie mgłę ani zamknięcie pasa. | Priorytet po wiarygodnym METAR/TAF; nie dokładamy słabego sygnału tylko dlatego, że API istnieje. |
| [PAŻP / AIP](https://www.pansa.pl/), NOTAM, stan pasa | Dostępność procedur, ILS, GRF/SNOWTAM, aktywny kierunek. | Brak zweryfikowanego w tej pracy bezpłatnego, stabilnego feedu dla pełnego stanu operacyjnego. Wartości obserwowane nie zastępują minimów operatora. | Konfiguracja progów, informacja o brakującym stanie pasa, oficjalne linki. Nie automatyzować decyzji operacyjnej. |
| [GIOŚ API](https://powietrze.gios.gov.pl/pjp/content/api?lang=en), [nowe API](https://dane.gios.gov.pl/) PM10 | Potencjalna cecha badawcza aerozoli i widzialności. | Dane bieżące bywają niezweryfikowane; braki, odległość stacji i sezonowy wspólny wpływ inwersji mogą dać pozorną korelację. Czas lokalny i CET archiwum trzeba rozdzielić. PM10 nie jest bezpośrednią miarą jąder kondensacji ani dowodem wystąpienia mgły. | Dopiero test przyrostu jakości względem temperatury, punktu rosy i wiatru. Nie nadajemy PM10 arbitralnej wagi w publicznym wyniku. |

## Ważne korekty propozycji

- „RVR 550 m” nie jest progiem, który można bezpośrednio porównywać z widzialnością ogólną i ogłaszać zamknięcie lotniska. Pasma w aplikacji są ostrzegawcze i konfigurowalne.
- PAŻP opublikowała [nowszą informację o dopuszczeniu nowego ILS](https://www.pansa.pl/nowy-ils-w-krakowie-uzyskal-dopuszczenie-do-pracy-operacyjnej/). CAT II pozostaje planem na I kwartał 2027 po certyfikacji i spełnieniu wymagań. Sam upływ czasu nie przełącza minimów.
- Wiatr METAR jest względem północy geograficznej. Oś 078°/258° pochodzi z [OurAirports runways.csv](https://github.com/davidmegginson/ourairports-data/blob/main/runways.csv); jest konfigurowalna i powinna być sprawdzana z aktualnym AIP. Numer pasa nie jest dokładnym kursem geograficznym.
- Przyloty i odloty mają inne ograniczenia, ale nie istnieje jeden uniwersalny „limit 737/A320” dla wszystkich operatorów, mas, porywów i stanów nawierzchni.
- Lotniska nie wolno oznaczać jako „otwarte”, „zamknięte” lub „wszystkie loty przekierowane” na podstawie samych kodów pogody.
- Nie wdrażamy procentu odwołań ani wyuczonej predykcji bez weryfikacji na właściwych wynikach. Dostępne darmowe dane pozwalają mierzyć zdarzenia pogodowe.

## Co mierzyć i jak poprawiać model

1. Zapisywać prognozę **przed** zdarzeniem, z czasem wydania, źródłem i wersją. Collector zamraża prognozę raz na godzinę, z wyprzedzeniem 2–3 h; retencja wynosi 90 dni.
2. Weryfikować widzialność <1000 m z późniejszego METAR-u. Brak obserwacji nie jest wynikiem negatywnym. Dopuszczalne oddalenie od godziny celu to 15 minut.
3. Pokazywać liczbę próbek, Brier, trafienia, pominięcia i fałszywe alarmy. Warunków TEMPO/BECMG nie zmieniać w wymyśloną liczbową szansę. Publiczny wynik Brier pokazujemy od 30 próbek, z ostrzeżeniem o małej próbie.
4. Uczyć osobne cele: widzialność <550 m / <1000 m, pułap <200 ft oraz pogoda na ziemi. Temperatura–punkt rosy, trend spreadu, wiatr/porywy, pora dnia i sezon są pierwszymi cechami. Zachmurzenie niskie, opad poprzedniej doby i aerosole dodawać tylko po teście przyrostu jakości.
5. Podział chronologiczny po całych epizodach, nie losowanie sąsiednich METAR-ów. Osobno mgły jesienne i zimowe, lato/burze, 0–2 h / 2–12 h / 12–48 h. Warto mierzyć zarówno początek, jak i koniec epizodu oraz błąd czasu poprawy.
6. Porównywać na tych samych godzinach z TAF-em i utrzymaniem ostatniej obserwacji. Model nie wchodzi do publicznej oceny, dopóki nie przejdzie takiego porównania i kontroli kalibracji. Skrypt badawczy porównuje obecnie z utrzymaniem obserwacji; historyczny TAF wymaga osobnego zbioru.

## Rozwój produktu i pozyskiwanie ruchu

Wdrożona wersja odpowiada na godzinę podróży bez płatnego rozkładu, oferuje polskie/angielskie URL-e z canonical i hreflang, stronę o mgle, źródła/metodologię, przypomnienie kalendarzowe i dynamiczny obrazek udostępniania. Powiadomienia web push wymagają włączenia kolektora i konfiguracji po stronie wdrożenia.

Kolejne eksperymenty:

- Krótkie rozmowy z 5–10 pasażerami: czy rozumieją podstawę wyniku i scenariusze, czy po przeczytaniu wiedzą, co sprawdzić? Wysoki poziom nie powinien skłaniać do pominięcia odprawy.
- Search Console: osobno wyświetlenia, CTR i wejścia dla „mgła Balice loty”, „pogoda Balice rano”, „fog Krakow airport tomorrow”; po wdrożeniu zgłosić sitemapę. Nie generować setek cienkich podstron z datami.
- Mierzyć odsetek sprawdzonych godzin podróży, zapisanych przypomnień, udostępnionych linków i powrotów z przypomnienia. Same odsłony w mgliste dni nie pokazują przydatności.
- Przygotować krótką stronę „dla mediów” z opisem ograniczeń i linkiem do aktualnej prognozy. Udostępniać linki w grupach dopiero za zgodą ich zasad; nie automatyzować spamu.
- Po udowodnieniu jakości można rozszerzać o kolejne lotniska z częstą mgłą. Najpierw konfiguracja pasa, pokrycie danych i lokalna walidacja, potem publiczna strona.

## Co nie jest jeszcze potwierdzone

Nie znamy spadku ruchu ani jego przyczyny: nie analizowano Search Console i historii analityki. SSR/SEO naprawia wykryty problem techniczny, ale nie gwarantuje wzrostu wejść. Nie mamy jeszcze reprezentatywnego wyniku kalibracji, wiarygodnych wyników rzeczywistych lotów ani źródła bieżącego stanu pasa. Nie zadeklarowano działających pushy bez konfiguracji zadania cyklicznego. Badanie rynku nie obejmuje pełnego audytu wszystkich konkurentów.
