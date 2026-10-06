# Przegląd UX/UI timeline i wykonane poprawki

Nowsza aktualizacja: [oś z ikonami, bez podpisów pogody](timeline-icons.md). Ten dokument zachowuje przegląd sprzed ich usunięcia.

6 października 2026. Zakres: czytanie przebiegu pogody, objaśnienia, wybór czasu oraz rozróżnienie braków danych i możliwego pogorszenia. Aktualne zrzuty wykonano przed zmianami i po nich w lokalnym Chromium przez Playwright, obejrzano je i wykorzystano do oceny. Natywne narzędzie Browser nie było dostępne. Końcowe sprawdzenie dotyczy builda produkcyjnego na `localhost:3009`, nie wdrożenia publicznego.

Pełny katalog dowodów: `docs/ux-review-timeline/`. Zrzuty 01–05 pokazują stan początkowy; 06–09 są pośrednimi iteracjami; 10–16 pokazują końcowy stan. `verification.json` zapisuje zakres końcowego sprawdzenia. Zrzuty krótkich zmian, luki i zmiany czasu korzystają z **kontrolowanych danych testowych, nie rzeczywistej prognozy lotniska**.

## 1. Odczyt godzin i warunków — poprawiony

Zachowana mocna strona: ciągła oś i proporcjonalna długość pasm pomagają znaleźć okres pogorszenia. To główny widok strony, bez siatki kart godzinowych. Pozostaje jedna powierzchnia z delikatnym rozmyciem tła i jasną krawędzią.

**P1: opisy krótkich zmian nachodziły na sąsiednie okresy.** Przedziały 5, 10 i 15 minut odtworzyły nakładanie nazw pogody i ocen ryzyka. Etykieta ryzyka wystawała około 44 px poza swój odcinek. Przy przesunięciu osi na lewej krawędzi zostawały końcówki słów. To mogło przypisywać ocenę niewłaściwej godzinie.

Przed: [krótkie zmiany](ux-review-timeline/04-short-before.png). Po: [krótkie zmiany po poprawce](ux-review-timeline/13-rapid-mobile-final.png).

Opisy mieszczą się teraz w części swojego odcinka widocznej w oknie osi. Wąskie odcinki zachowują rzeczywistą długość i kolor; gdy tekst nie ma miejsca, pełna nazwa pojawia się w podsumowaniu pod osią. Nie wydłużamy pięciominutowej zmiany dla etykiety. Drobne znaczniki rozdzielają krótkie zmiany. Nazwa dla technologii asystujących nadal obejmuje pełny zakres, pogodę, ocenę, scenariusze i źródło.

**P2: urwane godziny przy brzegu przewijanej osi.** Godziny dostały więcej przestrzeni. Niekompletna etykieta jest ukrywana przy krawędzi po aktualizacji przewijania, a linia siatki pozostaje na swojej pozycji. Godziny, pasma i marker nadal korzystają ze wspólnej skali czasu. Data nad osią aktualizuje się podczas przewijania.

Końcowy widok z pobranymi danymi: [desktop](ux-review-timeline/10-desktop-final.png), [telefon](ux-review-timeline/11-mobile-final.png).

## 2. Objaśnienia — dostępne bez zasłaniania osi

**P1: rozwinięta legenda na telefonie zakrywała prawie cały wykres.** Wysoka, absolutnie pozycjonowana treść nakładała się na godziny i pasma; miała własne przewijanie. Porównanie: [przed](ux-review-timeline/03-help-before.png), [po](ux-review-timeline/12-help-final.png).

Objaśnienia pozostają domyślnie zamknięte. Natywny element `details` rozwija je w układzie strony przed osią. Tekst jest krótszy: cztery poziomy, przerywane pasmo, brak danych i odczyt krótkich zmian. Cały nagłówek z ikoną informacji otwiera pomoc. Enter/Space otwierają i zamykają; Escape przy fokusie w pomocy zamyka ją po uruchomieniu JS i przywraca fokus nagłówka. Treść jest dostępna także bez JavaScript.

Po rozwinięciu wykres przesuwa się niżej i na małym ekranie może wymagać przewinięcia strony. To koszt zachowania czytelności; zamknięcie przywraca krótki widok. Nie wprowadzono stałej legendy ani kolejnej warstwy kart.

## 3. Wybranie krótkiego przedziału — działa dotykiem i klawiaturą

**P2: krótki odcinek był za wąski do wygodnego wyboru.** Pięć minut ma około 8 px na telefonie przy prawdziwej skali osi. Samego pasma nie powiększamy, ponieważ zmieniłoby sens danych.

Jeśli oś zawiera krótkie wewnętrzne zmiany, pod wykresem dostępne są przyciski poprzedniego i następnego przedziału, minimum 44×44 px. Wybrany odcinek ma marker, pełną nazwę i ocenę. Przykład: [wybrany 10-minutowy marznący opad](ux-review-timeline/14-selected-short-final.png).

Jeden punkt Tab w osi, strzałki do kolejnych przedziałów, Home/End do krańców, Enter do wyboru. Normalny Tab opuszcza wykres. Fokus i najechanie dają podgląd bez zmiany adresu; wybór czasu aktualizuje URL i pozwala przejść do szczegółów. Pełne nazwy dostępne programowo zastępują rozbudowane natywne dymki, które zasłaniały wykres.

## 4. Niepewność, luka i zmiana zegarów — rozróżnione

Zachowane: osobne oceny przylotu i odlotu, przerywane pasmo możliwego pogorszenia i ostrożne komunikaty o pogodzie. Krótkie zmiany nie zamieniają wariantu PROB/TEMPO w pewną prognozę podstawową.

Szara luka jest wybieralna i ma pełny zakres pod osią. Podsumowanie i szczegóły mówią o braku prognozy; nie pojawia się zielona ocena: [wybrana luka](ux-review-timeline/15-gap-final.png). Czas poza zakresem ma ostrzeżenie, bez starego podsumowania i markera. Okres z nieznaną oceną pozostaje szary; brak całej prognozy nie tworzy pustego „dobrego” wykresu.

Jesienna zmiana czasu: obie godziny 02:00 pozostają na osi z różnymi oznaczeniami strefy na osobnym wierszu: [przykład](ux-review-timeline/16-dst-final.png). Nazwa strefy nie wypycha godziny na kolejny przedział.

## Weryfikacja i pozostałe ograniczenia

- PL/EN, szerokości 320/390/768/1280 px, przewijanie w siedmiu pozycjach na każdej szerokości. Granice widocznych opisów i godzin sprawdzone względem odcinka i okna przewijania; brak poziomego przewijania całej strony.
- Pomoc domyślnie zamknięta, otwieranie/zamykanie klawiaturą, geometria bez nakładania na oś. Krótkie zmiany, duże przyciski, wybór luki, marker, URL i jeden punkt Tab działają w obu językach. Sprawdzono powtarzającą się godzinę zmiany czasu, brak oceny i czas poza prognozą.
- Zero błędów JavaScript w końcowym przebiegu. Bez JS: treść SSR, wykres i natywne objaśnienia dostępne. Dynamiczny podgląd, wybór czasu i dopasowanie etykiet do przewiniętego okna wymagają JS.
- 45 istniejących testów funkcjonalnych przeszło; końcowe lintowanie i build z kontrolą TypeScript również przeszły.

Nadal potrzebne są badania z pasażerami, test na fizycznym telefonie i czytniku ekranu oraz pełna ocena kontrastu i dostępności. Przegląd nie potwierdza pełnej zgodności WCAG ani wzrostu ruchu. Długi horyzont wymaga przewijania; paski i małe ikony nie zastępują pełnego opisu wybranego czasu. Wdrożenia publicznego nie wykonano.
