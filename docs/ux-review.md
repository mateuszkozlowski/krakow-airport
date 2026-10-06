# Przegląd UX: pogoda przed lotem w Balicach

Najnowsza aktualizacja: [przegląd etykiet, godzin, legendy i krótkich zmian na timeline](timeline-ux-review.md). Zawiera świeże zrzuty oraz weryfikację końcowego builda; poniższy dokument zachowuje wcześniejsze iteracje.

6 października 2026. Zakres: główna strona PL/EN, przegląd pogody, wybranie czasu przylotu lub odlotu i odczyt ryzyka. Punktem odniesienia jest bieżący kod i zrzuty z tego przeglądu. Capture: lokalny Chromium/Playwright, ponieważ natywny Browser nie jest dostępny w zestawie narzędzi tego zadania. Zrzuty zapisano i obejrzano przed wykorzystaniem.

## 1. Przegląd pogody — czytelny po zmianie

Przed zmianami: rozbudowany nagłówek, aktualne warunki i wyjaśnienie RVR poprzedzały wybór czasu. Godziny były listą; nie było szybkiego widoku przebiegu pogody. Zrzut: `/tmp/krk-design/01-before-desktop.png`.

Po zmianach timeline jest pierwszym elementem. Ikony i krótkie opisy pokazują pogodę, pasmo pokazuje ryzyko w całej dostępnej prognozie, a przewijana ciągła oś pozwala wybrać podróż. Osobne karty godzinowe zostały usunięte. Godziny u góry, pionowe linie i pasma korzystają z tych samych pozycji czasu; długość odcinka jest proporcjonalna do jego rzeczywistego trwania. Przylot i odlot mają wspólny przełącznik z formularzem. Zrzuty: `ux/desktop.png` i `ux/mobile.png`.

Mocna strona: można zobaczyć przebieg warunków przed wpisywaniem daty. Ryzyka UX: 48 godzin wymaga przewijania; dlatego są strzałki, podgląd całego okresu i widoczna następna częściowa kolumna. Dane pochodzące z prognozy komputerowej są opisane osobno. Pasmo brakujących godzin pozostaje szare, z podanym zakresem luki.

## 2. Wybranie godziny — działa w obu językach

Kliknięcie odcinka zaznacza godzinę pionowym markerem i pokazuje podsumowanie oraz link do szczegółów. Wprowadzenie dokładnej godziny działa w formularzu. Obie drogi aktualizują adres do udostępnienia. Zmiana języka zachowuje godzinę i kierunek podróży. Przypomnienie kalendarzowe i dodatkowe dane można rozwinąć.

Przed zmianami formularz znajdował się po technicznych pomiarach: `/tmp/krk-design/03-before-planner.png`. Po zmianach głównym wejściem do wyboru czasu jest timeline; formularz pozostaje poniżej osi, obok bieżących warunków na większym ekranie.

Zachowane mocne strony: oficjalna tablica lotów, konkretne daty danych i rozdzielenie przylotu/odlotu. Ikony mają opisy tekstowe, przyciski mają nazwy i stany wyboru. Zmiana języka, wybór z klawiatury, kalendarz i zakresy 320/390/768/1280 px zostały sprawdzone.

## 3. Odczyt prognozy i niepewności — wyjaśniony

Zamiast VRB: ikona i „Zmienny kierunek”; zamiast BECMG: „Stopniowa zmiana”; zamiast TEMPO: „Warunki chwilami”. PROB oznacza procentową szansę danych warunków pogodowych, z wyjaśnieniem, że nie jest szansą odwołania lotu. Wiatr jest w km/h; podstawa chmur w metrach. Kierunek opisuje, skąd wieje wiatr. Granice pomiarów widoczności na pasie pozostają zachowane jako „poniżej”/„ponad”. Brak pomiaru nie jest zastępowany dobrą pogodą.

Możliwe gorsze warunki mają osobne przerywane pasmo oraz opis w osi i w podsumowaniu wybranej godziny. Nie nadpisują prognozy podstawowej. Pełne scenariusze są w szczegółach. Kontrolowane przykłady, **nie rzeczywiste prognozy lotniska**: `/tmp/krk-design/10-simulated-fog.png`, `/tmp/krk-design/11-missing-data.png`, `/tmp/krk-design/12-final-scenario.png`. Aktualny ciągły wykres z kontrolowanym scenariuszem: `ux/simulated-fog.png`.

Wykres ma jedną szklaną powierzchnię: przezroczysty gradient, rozmycie tła i cienką jasną krawędź. Pozostałe sekcje mają otwarty układ, bez pełnych kart. Jest wersja bez rozmycia dla przeglądarek, które go nie obsługują. Nie dodano animacji. Kolorowi ryzyka towarzyszy tekst; oznaczenia źródeł i komunikaty lotnicze pozostają dostępne po rozwinięciu.

## Granice weryfikacji

Sprawdzono renderowanie, podstawowe interakcje, nazwy kontrolek, wybór z klawiatury, HTML bez JavaScript oraz widok w czterech szerokościach w Chromium. Nie przeprowadzono pełnego audytu WCAG, testu z czytnikiem ekranu, pomiaru kontrastu każdego stanu, badań z pasażerami ani testów fizycznych urządzeń. Nie ma dowodu, że sama zmiana UI zwiększy ruch. Wdrożenie publiczne nie zostało wykonane.


## Oś bez stałej legendy

Objaśnienia kolorów i przerywanych odcinków są domyślnie zamknięte pod ikoną informacji przy tytule. Działają Enter i Escape; treść nie wychodzi poza ekran przy 320/390/768/1280 px. Ikony pogody i krótkie oceny przy osi pozostają tekstowo opisane. Szare luki danych nadal mają widoczny zakres, ponieważ to informacja o braku prognozy, a nie legenda.

Sprawdzono zgodność pozycji pełnej godziny, pionowej linii i początku odpowiadającego odcinka prognozy (różnica poniżej 1 px). Data nad osią aktualizuje się podczas przejścia do następnego dnia. Powtarzająca się godzina 02:00 podczas jesiennej zmiany czasu ma różne oznaczenia strefy. Wybrany czas z formularza lub adresu jest przewijany do widoku w osi bez przewijania całej strony.

## Mniej tekstu — zweryfikowana aktualizacja

Najnowsze zrzuty `ux/desktop.png` / `ux/mobile.png` pochodzą z aktualnego builda produkcyjnego na localhost:3007. Zrzut przed tą zmianą zapisano i obejrzano: `/tmp/krk-design/before-noise.png`. Poprzednie kroki opisane wyżej pozostają historią przeglądu.

1. **Przegląd — czytelny.** Jeden opis pogody i ryzyka na ciągły odcinek; tekst pozostaje widoczny przy przewijaniu tego odcinka. Zachowano osobne godziny, ikony i pionowe linie. Każdy przycisk godziny nadal ma pełną nazwę dla technologii asystujących, źródło i opis scenariuszy. Długą listę powtarzającą oś domyślnie zwinięto.
2. **Wybór czasu — działa.** Krótszy nagłówek, instrukcja i opis formularza. Czas lokalny podany w jednym miejscu przy osi. Kliknięcie aktualizuje URL i pokazuje opis wybranych warunków. Legenda nadal domyślnie zamknięta; Enter/Escape działają.
3. **Niepewność — zachowana.** Przerywane pasmo pozostaje oddzielne, luki danych mają widoczny zakres. Okno poprawy z prognozy przeniesiono pod oś. Trend mierzonej widzialności pojawia się tylko przy wystarczającej, świeżej historii i istotnych dla pasażera odczytach; szczegóły domyślnie zwinięte. Nie wyznacza końca mgły. `ux/simulated-fog.png` i `ux/visibility-trend.png` używają **kontrolowanych danych testowych, nie rzeczywistej prognozy**.

Sprawdzono PL/EN, 320/390/768/1280 px, brak poziomego przewijania całej strony, nazwy/stan przycisków, wybór czasu, zwijanie szczegółów, trend PL/EN, ukrywanie trendu po oznaczeniu danych jako stare, scenariusz PROB40 bez nadpisania podstawowego poziomu oraz lukę prognozy. Świeży przebieg Chromium bez błędów JS. Przy wyłączonym JS treść SSR, oś, pomoc i szczegóły prognozy są dostępne. Granice audytu WCAG i fizycznych urządzeń opisane wcześniej nadal obowiązują. Wdrożenia publicznego nie wykonano.
