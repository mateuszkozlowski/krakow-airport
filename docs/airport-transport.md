# Planer dojazdu do i z Balic

Implementacja z 6 października 2026. Główne trasy: `/pl/dojazd`, `/en/transport`; poradniki z działającym planerem dla nocnego przylotu, porannego odlotu i Zakopanego. Treść i początkowy wynik są renderowane na serwerze, z canonical, hreflang, sitemapą i osobnym obrazem OG. Formularz GET działa również bez JavaScriptu.

## Źródła i zakres

| Źródło                                                                                                                        | Rozkład                               | Dane operacyjne                                       | Warunki ponownego użycia                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Koleje Małopolskie](https://www.kolejemalopolskie.com.pl/pl/rozklady-jazdy/gtfs)                                             | Publiczny `kml-ska-gtfs.zip`          | PLK po aktywacji klucza                               | [KMŁ publikuje GTFS jako otwarte dane do planowania](https://kolejemalopolskie.com.pl/pl/aktualnosci/9581_jak-wprowdzic-rozklady-jazdy-do-google-maps); nie przypisujemy nieopublikowanej licencji CC. |
| [ZTP Kraków](https://ztp.krakow.pl/dane-otwarte)                                                                              | `GTFS_KRK_A.zip`, linie 209, 300, 902 | `TripUpdates_A.pb`                                    | Oficjalne dane otwarte; atrybucja ZTP / MPK.                                                                                                                                                           |
| [FlixMobility Tech GmbH](https://transport.data.gouv.fr/datasets/flixbus-horaires-theoriques-du-reseau-europeen-1/?locale=en) | `gtfs_generic_eu.zip`                 | Brak informacji o miejscach i rzeczywistych odjazdach | ODbL 1.0. Filtrowany i normalizowany zestaw jest osobno dostępny przez `/api/transport/data`, z atrybucją, źródłem i licencją. Nie przypisujemy tej licencji danym innych dostawców.                   |
| [PLK](https://www.plk-sa.pl/klienci-i-kontrahenci/api-otwarte-dane)                                                           | Nie dubluje KMŁ                       | `/api/v1/operations?fullRoutes=true&withPlanned=true` | Bezpłatny klucz po rejestracji i aktywacji; prywatny `PLK_API_KEY`, nagłówek `X-API-Key`, atrybucja Polskie Linie Kolejowe S.A.                                                                        |

Zestaw startowy zawiera 1252 warianty kursów KMŁ, 726 miejskich i 868 autokarowych, po filtrowaniu do wybranych przystanków. To nie liczba odjazdów każdego dnia. Kalendarze usług i wyjątki wyznaczają, które warianty rzeczywiście kursują. Lista miejsc pokazuje tylko miejscowości obecne w pobranych danych. Nie obejmujemy całej polskiej kolei, prywatnych busów ani wszystkich miejskich przesiadek; wynik to przejazd od wskazanej stacji do wskazanego przystanku.

## Aktualizacja i awarie

`npm run transport:update` pobiera publiczne ZIP-y i zapisuje małe, osobne artefakty w `src/lib/transport/artifacts`. `prebuild` wykonuje tę aktualizację automatycznie. Nieudane pobranie zachowuje poprzedni artefakt i jego oryginalny czas sprawdzenia; nie nadaje mu nowej daty.

Na serwerze `readFeeds` odczytuje nowszą, skompresowaną wersję z Redis. Każda strona lub zapytanie może zlecić przez `after()` aktualizację danych starszych niż sześć godzin. Blokada Redis ogranicza równoległe pobieranie tego samego źródła. Vercel ma osobny dzienny cron `/api/transport/refresh` o 05:15 UTC, chroniony tym samym `CRON_SECRET` co collector pogody. Nie wywołuje powiadomień ani publikacji. Endpoint zwraca 401 bez poprawnej autoryzacji lub 503 bez konfiguracji.

Bez Redis działa pamięć procesu i datowany zestaw z builda. Ostatnia kontrola starsza niż dobę jest oznaczana w źródłach, a starsza niż siedem dni wyklucza rozkład z wyników. Zakres dat wynika z aktywnych kalendarzy, nie samego dalekiego `feed_end_date`. Podróż poza dostępnym zakresem nie jest opisywana jako brak transportu.

Pobrania i dekompresja mają limity rozmiaru oraz czasu. Import pomija geometrię tras. Całe feedy i klucze pozostają na serwerze; przeglądarka dostaje tylko wybrane połączenia.

## Czas, połączenia i dane na żywo

- Czas pasażera: Europe/Warsaw; powtórzona godzina przy zmianie czasu wymaga wyboru pierwszego lub drugiego wystąpienia, a nieistniejąca godzina jest odrzucana.
- Czas GTFS: lokalne południe dnia kursowania minus 12 rzeczywistych godzin, zgodnie ze specyfikacją. Godziny 25:00 lub 35:25 nie są obcinane do tego samego dnia. Wyszukiwanie obejmuje odpowiednie poprzednie dni kursowania i ostatni dzień ważności wraz z jego nocną częścią.
- Sprawdzane są wyjątki kalendarza, kolejność czasów, prawo wsiadania/wysiadania i rzeczywiste identyfikatory przystanków. Zapisy ZKA pozostają autobusami zastępczymi, nawet gdy GTFS używa `route_type=2`.
- Dostępne są kursy bezpośrednie i jedna przesiadka przy Krakowie Głównym. Stacja kolejowa, MDA oraz Dworzec Główny Wschód są osobnymi miejscami w szczegółach. Domyślnie przewidujemy minimum 20 minut na przejście; pasażer może zmienić ten czas. Różne pojazdy prowadzące do tego samego dalszego kursu nie wypełniają listy powtarzającymi się wariantami.
- PLK jest dopasowywane po dniu kursowania i minimum dwóch zgodnych stacjach oraz ich planowych czasach. Niejednoznaczne dopasowanie jest pomijane. Nie dopasowujemy wyłącznie po numerze pociągu ani nie tworzymy dodatkowego „pociągu PLK”.
- Brak wartości opóźnienia nie staje się zerem. Protobuf może udostępniać odziedziczone wartości domyślne; parser wymaga pól faktycznie obecnych w komunikacie. Nieświeży, uszkodzony lub pozbawiony daty kursowania GTFS-RT nie może oznaczyć kursu jako „na żywo”.
- Odwołane kursy oraz pomijane przystanki są wykluczane. Opóźniony odjazd bez danych przyjazdu daje jawnie oznaczony szacunek przyjazdu; nie może posłużyć do obietnicy przesiadki. Perony są opisane jako rozkładowe.
- Informacje PLK są odświeżane najwyżej raz na trzy minuty z globalną blokadą Redis, co mieści podstawowy limit 100 żądań/h. Słownik stacji jest przechowywany przez tydzień. Odpowiedź 401/403 jest przejściowo cache'owana jako brak aktywacji; przyjęcie klucza przez dostawcę zostanie wykryte przy następnej próbie.

Podczas pracy 6 października pobrania GTFS-RT ZTP w tym środowisku kończyły się uciętym payloadem. Rozkład działał, a adapter bezpiecznie pozostał przy godzinach planowych. Nie potwierdzono rzeczywistego pokrycia opóźnień na liniach lotniskowych. PLK wymaga aktywacji po stronie dostawcy; testy nie używają jego rzeczywistych kluczy.

## Prognoza a zapas na przesiadkę

Plan korzysta z tej samej prognozy i oceny pogody co oś na stronie głównej. Sprawdza świeży okres dla godziny przylotu (z uwzględnieniem ręcznie wybranego późniejszego lądowania) lub odlotu. Scenariusze TAF pozostają możliwościami, nie pewnymi zmianami. Z dala od dostępnej prognozy stan to „brak prognozy”, nie dobra pogoda.

Dodatkowy zapas jest **regułą planowania**, nie wyuczonym prawdopodobieństwem opóźnienia lotu:

| Warunki dla przylotu                      | Dodatkowy czas po przylocie                         | Minimum na przesiadkę                    |
| ----------------------------------------- | --------------------------------------------------- | ---------------------------------------- |
| Ocena 1–2 lub brak świeżej prognozy       | 0 min; nadal obowiązuje czas wybrany przez pasażera | Wybrane przez pasażera, domyślnie 20 min |
| Ocena 3 albo możliwy scenariusz oceny 3–4 | 30 min                                              | Co najmniej 30 min                       |
| Ocena 4 w głównej prognozie               | 60 min                                              | Co najmniej 45 min                       |

Pasażer widzi dodatkowy czas i może go wyłączyć. PROB30 nie staje się „30% szans na opóźnienie”. Reguła nie korzysta z niezwalidowanego modelu badawczego mgły. Pogoda nie przesuwa godziny odprawy przy odlocie. Ten zapas nie zabezpiecza przed wielogodzinnym opóźnieniem lub przekierowaniem; dostępne są także ręczne scenariusze +15–180 minut. Nie deklarujemy gwarancji przesiadki ani dostępności biletu.

## Weryfikacja

`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. Testy dojazdu obejmują CSV, wyjątki i zakres dat, nocne godziny, obie zmiany czasu, uprawnienia wsiadania/wysiadania, duplikaty, PLK, odwołania, szacowane przyjazdy, minimalny czas przesiadki, stare dane, strukturę rzeczywistych feedów, eksport ICS i reguły zapasu pogodowego. Testy powiadomień używają mocków; nie kontaktują się z pasażerami.

Kontrola przeglądarkowa obejmuje PL/EN przy 320, 390 i 1280 px, natychmiastowe szczegóły trasy, zmianę godziny i scenariusza opóźnienia, wybór alternatywy, kalendarz, zachowanie planu przy zmianie języka, formularz bez JavaScriptu i istniejącą oś pogody. Linki biletowe są do oficjalnych kanałów, bez afiliacji; nie kopiujemy cen, które mogą się zdezaktualizować.
