# Oś z ikonami i graficzną oceną warunków

6 października 2026. Usunięto nazwy „Bez niskich chmur”, „Mgła” i inne podpisy pogody, a następnie etykiety „Niskie / średnie / wysokie ryzyko” oraz odznaki oceny pod wykresem. Zostały godziny, ikony i ciągły profil warunków na szklanej powierzchni.

Wysokość pasma rośnie wraz z oceną: 6 / 14 / 28 / 42 px. Kolor wzmacnia rozróżnienie; nie jest jedynym nośnikiem informacji. Pasma mają wspólną podstawę i rzeczywistą długość każdego przedziału. Wysokość jest oceną porządkową, nie procentem odwołań lotów. Możliwe pogorszenie ma wyższy przerywany kontur nad podstawowym pasmem. Nie zmienia oceny głównej ani nie wydłuża czasu zjawiska. Szare wzory wyróżniają brak oceny / luki danych. Scenariusz z brakującą oceną ma osobne szare pasmo pod profilem, aby główna ocena go nie zasłaniała i nie przypisywała mu poziomu.

Wykres ma 150 px wysokości także przy możliwym pogorszeniu. Pełna nazwa pogody pojawia się przy najechaniu, fokusie lub wyborze czasu. Po wyborze jest link do szczegółowego wyniku z oceną i jej przyczynami. Krótkie zmiany zachowują dodatkowe przyciski 44 px do wyboru pięciominutowego okresu.

Pełne nazwy programowe przycisków nadal obejmują pogodę, ocenę, scenariusz, czas i źródło. Domyślnie schowana pomoc objaśnia wysokość, kolory i przerywany kontur; rozwija się nad osią bez zasłaniania jej. SSR i natywna pomoc pozostają dostępne bez JS. To przegląd układu i podstawowych interakcji, nie pełna certyfikacja dostępności ani badanie rozumienia wykresu z pasażerami.

Końcowe zrzuty i weryfikacja: `docs/ux-profile/`, build produkcyjny `localhost:3014`. `10-desktop-final.png` i `11-mobile-final.png` korzystają z pobranej pogody. `09-profile-example.png` i przykłady 12–17 używają kontrolowanych danych testowych, nie rzeczywistej prognozy. Wcześniejszy wariant bez nazw pogody, lecz jeszcze z etykietami ryzyka, pozostaje w `docs/ux-icons/`.

Sprawdzono PL/EN, 320/390/768/1280 px, przewijanie, pozycje godzin, rozmiary pasm i odstęp od ikon, brak widocznych ocen, osobny kontur scenariusza, wspólną podstawę, wybór krótkich zmian/luki, klawiaturę, zmianę czasu i SSR bez JS. Bez błędów przeglądarki. Tabela modelu na stronie jakości przeszła wcześniejszą kontrolę obu języków i przewijania we własnym obszarze (`docs/ux-icons/verification.json`). [Pierwotny przegląd UX](timeline-ux-review.md) zachowuje dowody poprzednich problemów. Wdrożenia publicznego nie wykonano.
