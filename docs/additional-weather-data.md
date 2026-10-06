# Dodatkowe dane: co pomaga pasażerowi

Przegląd 6 października 2026. Główny ekran ma odpowiadać „kiedy i co może przeszkodzić”. Dodatkowe dane mają sens wtedy, gdy zmieniają tę odpowiedź.

| Dane | Decyzja | Dlaczego / ograniczenie |
|---|---|---|
| Ostatnie pomiary widzialności | Dodane: krótki trend i rozwijana historia | Widać, czy trudne warunki nasilają się lub poprawiają. Wymagane >=3 odczyty przez >=1 h, bez luk >45 min, świeży pomiar. Nie ekstrapolujemy końca mgły. Przy samych dobrych warunkach >=5 km blok się nie pokazuje. |
| Okno poprawy z TAF | Wyróżnione tuż pod osią przy trudnych warunkach teraz | Istniejąca logika wymaga >=2 h kolejnych mniej trudnych warunków i sprawdza scenariusze. To poprawa pogody, nie godzina wznowienia operacji. |
| Widoczność wzdłuż pasa i jej trend | Już dostępne, gdy raport podaje RVR | Cenniejsze od samej ogólnej widzialności. Nie znamy aktywnego pasa, uprawnień załogi ani wyposażenia konkretnego samolotu. |
| Wilgotność, niskie chmury, wilgotność gruntu z modelu | Kandydat do eksperymentu, nie nowe kafelki | Fizycznie przydatny kontekst mgły. Nie ma jeszcze dowodu dodatkowej skuteczności dla EPKK; archiwalne prognozy muszą być dostępne przed czasem oceny. |
| Profil wilgotności i wysokość warstwy mieszania | Sprawdzić osobną rodzinę modeli i brakujące dane | Próbne zapytanie ICON zwróciło same null dla wysokości warstwy. Nie zamieniać ich na zero. |
| Radar/opady i wyładowania | Następny kierunek dla burz, warunkowy widok | Najbardziej użyteczne dla krótkiego horyzontu letniego. Nie wyjaśniają mgły. Na razie link do oficjalnej mapy zamiast niepotwierdzonej integracji danych. |
| Ostrzeżenia obszarowe | Kontekst, nie poziom lotniska | Powiatowe ostrzeżenie może dotyczyć innej części obszaru; wymaga geometrii, daty i rodzaju zjawiska. |
| PM10, CAPE, punkt rosy jako kolejne liczby | Nie dodawać do głównego widoku | Nie przekładają się bezpośrednio na działanie pasażera. PM10 pozostaje hipotezą dla modelu, a CAPE samo nie potwierdza burzy przy lotnisku. |
| Wschód słońca | Nie traktować jako końca mgły | Wspiera kontekst fizyczny, ale mgła może trwać wiele godzin po wschodzie. |
| Faktyczne opóźnienia, przekierowania, stan pasa | Brak potwierdzonego źródła w aplikacji | Nie wyliczać z pogody ani zgadywać konkretnego alternatywnego lotniska. Oficjalna tablica pozostaje linkiem. |

## Sprawdzone źródła

- [NOAA AviationWeather API](https://aviationweather.gov/data/api/) podaje METAR i TAF worldwide; aplikacja już korzysta z historii pomiarów. Te dane nie są rozkładem/statusami lotów.
- [Open-Meteo](https://open-meteo.com/en/docs) i [Single Runs API](https://open-meteo.com/en/docs/single-runs-api) pozwalają rozważyć zachmurzenie/wilgotność z konkretnych przebiegów prognozy. Nie zastępować ich reanalizą z wiedzą o przyszłości. Sam archiwalny szereg „historical forecast” nie dowodzi, kiedy konkretny punkt był dostępny.
- Test dla 50.078/19.785 z `models=icon_seamless` i czterema polami: wilgotność, niskie chmury i wilgotność 0–1 cm gruntu miały 24 odczyty, `boundary_layer_height` miało 24 null. Zwrócony punkt siatki 50.0625/19.8125, wysokość 238 m. To test dostępności, nie jakości przewidywania mgły. ICON seamless nie oznacza lokalnego ICON-D2.
- [IMGW mapy radarowe](https://meteo.imgw.pl/dyn/?group=radar&loc=50.078,19.785,8&param=cmax&perun=true) pokazują opad i wyładowania; [dane publiczne](https://danepubliczne.imgw.pl/) opisują dostęp do danych. Nie zweryfikowano tu gotowego API/licencji do redystrybucji kafelków, więc nie pobierano ani nie integrowano obrazów map.

Najpierw trend pomiarów i uczciwe scenariusze na osi. Kolejny większy zysk: zachowane w chwili wydania prognozy do porównania modeli, następnie krótkoterminowe dane burzowe. Dokładanie wielu wskaźników do interfejsu nie zastępuje kalibracji.
