# KRK.flights

Niekomercyjny serwis o pogodzie na lotnisku Kraków-Balice (EPKK). Ocena warunków jest osobna dla przylotów i odlotów. Użytkownik wybiera godzinę podróży; aplikacja nie korzysta z płatnego API rozkładu i nie deklaruje statusu konkretnego lotu.

Planer dojazdu `/pl/dojazd` i `/en/transport` łączy bezpłatne rozkłady KMŁ, ZTP i FlixBusa z godziną lotu oraz prognozą pogody. Obsługuje kursy po północy, dojazd na odprawę, przesiadki i dalszą podróż. PLK uzupełnia istniejące pociągi o opóźnienia, po aktywacji prywatnego klucza; nie tworzy drugiej listy tych samych kursów.

Wersja 2 korzysta z surowych METAR/TAF NOAA, pełnego parsera, bezpłatnego Open-Meteo dla obecnego zastosowania niekomercyjnego oraz opcjonalnego CheckWX. Dane i sekrety pozostają na serwerze. Polskie i angielskie strony renderują treść po stronie serwera, również przy awarii źródła.

```bash
npm ci
npm run dev
npm test
npm run typecheck
npm run lint
npm run build
npm start
```

- [Uruchomienie, konfiguracja, historia i powiadomienia](DEPLOYMENT.md)
- [Research konkurencji, źródła danych i proponowana nisza](RESEARCH-AND-ROADMAP.md)
- [Wyniki badawczego modelu mgły](docs/model-research-results.md)
- [Niezależny test 2025 i kalibracja](docs/model-holdout-2025.md)
- [20 dodatkowych wariantów i sprawdzenie na 2026](docs/model-iterations-2026.md)
- [Stabilność modelu i przyszłe porównanie z TAF](docs/model-polish-and-shadow.md)
- [Przegląd UX i poprawki timeline](docs/timeline-ux-review.md)
- [Oś z ikonami i graficzną oceną warunków](docs/timeline-icons.md)
- [Mikroklimat Balic: cechy lokalne, wyniki i nowe źródła](docs/local-weather-context.md)
- [Które dodatkowe dane mają sens](docs/additional-weather-data.md)
- [Planer dojazdu: dane, aktualizacja, pogoda i ograniczenia](docs/airport-transport.md)

Główne moduły: `src/lib/weather/parse.ts` (normalizacja i scenariusze), `engine.ts` (wspólna ocena), `service.ts` (źródła serwerowe), `history.ts` / `quality.ts` (pomiar bez odtwarzania prognoz po fakcie). Pobieranie pogody nie publikuje powiadomień; robi to tylko chroniony collector, po odpowiedniej konfiguracji.

Przypomnienie kalendarzowe działa bez kluczy. Web push wymaga Redis, sekretu i regularnego zadania cyklicznego. Model badawczy nie jest podłączony do oceny publicznej. Zestaw testowy obejmuje parser, nakładające się prognozy, wiatr, RVR, zmianę czasu, awarie cache i autoryzację collectora.

Starsze dokumenty `*-IMPROVEMENTS.md`, `TAF-*.md` i `*-SUMMARY.md` opisują poprzednią implementację i nie potwierdzają działania wersji 2. Aktualnym punktem odniesienia są powyższe dokumenty, kod i testy.

Zamrożony model 2 h jest gotowy do osobnego pomiaru przez collector: zapisuje przewidywanie dla widzialności <550 m razem z TAF-em i ostatnim pomiarem dla tej samej godziny. Wymaga świeżych danych i historii 24 h. Nie wpływa na oceny ani powiadomienia dla pasażerów. Porównanie pojawia się na stronie jakości po zebraniu wspólnych odczytów.
