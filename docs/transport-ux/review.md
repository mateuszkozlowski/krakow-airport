# Kontrola dojazdu — 6 października 2026

Sprawdzono produkcyjny build w przeglądarce Chromium. Wersje PL i EN przy 320, 390 i 1280 px nie wychodzą poza ekran. Szczegóły wybranego połączenia są rozwinięte; kliknięcie alternatywy przenosi do jej trasy. Daty są widoczne przy godzinach, także po północy. Zrzuty [telefonu](mobile.png) i [komputera](desktop.png) pokazują rzeczywiste rozkłady, bez podmienionej pogody.

Sprawdzono scenariusz późniejszego przylotu, dojazd na odlot o 6:00, przesiadkę do Zakopanego, wybór kolejnego połączenia, zapis na urządzeniu, eksport kalendarza, zachowanie planu przy zmianie języka oraz formularz i wybór alternatywy bez JavaScriptu. Błędna lub niedostępna data nie udaje braku kursów. Szybka zmiana kierunku nie pozostawia wyniku wcześniejszego zapytania. [Wyniki](local-verification.json).

Osobny test używa syntetycznej prognozy mgły i rzeczywistych rozkładów. Potwierdza dodatkowe 30 minut, odsunięcie ciasnego połączenia, wyłączenie i ponowne włączenie zapasu, zachowanie fokusu klawiatury, stały termin odprawy przy odlocie oraz przekazanie wybranej godziny z osi pogody. Ten test nie opisuje rzeczywistej pogody z dnia sprawdzenia. [Wyniki testu z prognozą testową](weather-fixture-verification.json).

Ponownie sprawdzono istniejącą oś pogody w obu językach i trzech szerokościach. Hover nie zmienia wysokości osi, a wybór godziny pokazuje szczegóły bezpośrednio poniżej. Nie było błędów JavaScriptu. [Kontrola pogody](weather-regression-verification.json).

83 testy algorytmu i integracji, lint oraz build przeszły. Dodano też regresję dat skrótów nocnych i porannych przy północy i Nowym Roku. Kontrola przeglądarkowa nie potwierdza danych operacyjnych PLK przed aktywacją klucza. Bez świeżego dopasowania kurs pozostaje oznaczony jako rozkład.
