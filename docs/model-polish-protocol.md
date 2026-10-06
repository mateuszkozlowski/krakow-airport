# Dopracowanie modelu: sprawdzenie stabilności i początków pogorszenia

6 października 2026. Przed uruchomieniem poniższego porównania.

- Cel bez zmian: widzialność METAR <550 m za 2/6 h, dopasowanie ±15 min. Nie RVR ani wynik lotu.
- Wyłącznie lata rozwojowe 2018–2024; 2025/2026 nie wolno używać do uczenia, kalibracji, doboru progów ani ponownej oceny nowych wariantów.
- Trzy przesuwane okresy: uczenie 2018–2020 / kalibracja 2021 / sprawdzenie 2022; uczenie 2018–2021 / kalibracja 2022 / sprawdzenie 2023; uczenie 2018–2022 / kalibracja 2023 / sprawdzenie 2024. Cele wymagają ścisłego bufora 2 h na granicy każdego okresu.
- Dwie ustalone rodziny: poprzedni globalny wariant oraz osobne modele dla aktualnej widzialności >=550 m i <550 m. Bez nowych wejść i przeszukiwania hiperparametrów. Algorytm 2 h: rozszerzona regresja C=0,01; 6 h: rozszerzony boosting 150 iteracji, 15 liści, minimum 60 odczytów w liściu, L2=10. Osobna kalibracja sigmoid, seed 42, brak oversamplingu i early stopping.
- Podmodel wymaga >=200 odczytów uczenia, >=30 dodatnich i >=30 ujemnych; kalibracja >=50 odczytów, >=10 dodatnich i >=10 ujemnych. W przeciwnym przypadku jawny powrót do modelu globalnego dla tej grupy.
- Pokazać Brier, log loss, average precision, częstości, próg 10/30/50%, oddzielnie aktualnie dobra i słaba widzialność, bez dobierania progu do sprawdzanego roku.
- Policzyć początki epizodów: pierwszy odczyt <550 m po odczycie >=550 m, przy odstępie <=45 min. Pierwszy zły odczyt w zbiorze i odczyty po lukach nie stanowią potwierdzonego początku. Ostrzeżenie wymaga predykcji wydanej przed początkiem, przy dobrej bieżącej widzialności i dodatnim przyszłym celu należącym do epizodu. Raportować liczbę epizodów z dostępną predykcją, liczbę wykrytych oraz wyprzedzenie. Fałszywe wskazania grupować w ciągi kolejnych odczytów z odstępem <=45 min; nie nazywać ich wysłanymi powiadomieniami.
- Te lata zostały już wykorzystane w poprzednim rozwoju. Wynik jest testem stabilności w czasie i porównaniem hipotezy, nie kolejną niezależną walidacją. Zachować wszystkie wyniki, nawet jeśli podział na modele zaszkodzi.
- Do pomiaru na przyszłych danych wyeksportować wyłącznie wcześniej zamrożony i sprawdzony model 2 h z artefaktu `fog-iterations-2026.json`. Nie wybierać nowego modelu do publicznych ocen na podstawie tego porównania. Porównać zgodność Python/TypeScript na zapisanych predykcjach. W collectorze rejestrować model, aktualny TAF i utrzymanie pomiaru dla tego samego celu 550 m, z czasem faktycznego zapisu. Brak liczbowego TAF-u ogranicza porównanie do wspólnego podzbioru; braki nie oznaczają dobrej pogody.
- Publiczna ocena utrudnień pozostaje oparta na jawnych warunkach/TAF. Eksperymentalne przewidywanie nie wysyła alarmów i nie oznacza odwołania lotu.
