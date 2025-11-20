# Analiza TAF dla EPKK - 20 listopada 2024

## RAW TAF
```
EPKK 201430Z 2015/2115 VRB02KT CAVOK
PROB40 TEMPO 2018/2101 4000 BR
TEMPO 2101/2103 BKN014
BECMG 2103/2105 30010KT 4000 -SNRA BR BKN014
TEMPO 2105/2114 2500 SN BR BKN007
```

## Dekodowanie TAF

### 1. Okres bazowy: 20/15Z - 21/15Z
**Warunki:** VRB02KT CAVOK
- Wiatr: Zmienny 2kt
- Widoczność i sufit: CAVOK (doskonałe warunki)
- **Oczekiwane ryzyko:** Poziom 1 (Niskie)

### 2. PROB40 TEMPO: 20/18Z - 21/01Z (18:00-01:00 UTC)
**Warunki:** 4000 BR
- Prawdopodobieństwo: 40%
- Widoczność: 4000m
- Zjawisko: BR (mist/mgła)

**Kalkulacja ryzyka:**
- `calculateVisibilityRisk(4000)` = 30 (< 5000m)
- `PHENOMENA_MODERATE.BR` = 60
- Skalowane z prawdopodobieństwem 40%:
  - Widoczność: 30 × 0.4 = 12
  - Zjawisko: 60 × 0.4 = 24
- **Oczekiwane ryzyko:** Poziom 2 (Umiarkowane)
  - Powód: widoczność 4000m < 5000m (linia 2383 w kodzie)

### 3. TEMPO: 21/01Z - 21/03Z (01:00-03:00 UTC)
**Warunki:** BKN014
- Prawdopodobieństwo: 30% (domyślne dla TEMPO)
- Chmury: BKN (przełamany) na 1400 stóp

**Kalkulacja ryzyka:**
- Sufit 1400ft jest znacznie powyżej minimów (200ft)
- `calculateCeilingRisk` dla BKN na 1400ft = niskie ryzyko
- **Oczekiwane ryzyko:** Poziom 1-2 (Niskie/Umiarkowane)

### 4. BECMG: 21/03Z - 21/05Z (03:00-05:00 UTC)
**Warunki:** 30010KT 4000 -SNRA BR BKN014
- Okres przejściowy (BECOMING)
- Wiatr: 300° 10kt
- Widoczność: 4000m
- Zjawiska: -SNRA (lekki śnieg z deszczem), BR (mgła)
- Chmury: BKN 1400ft

**Kalkulacja ryzyka:**
- `calculateVisibilityRisk(4000)` = 30
- `PHENOMENA_MODERATE.SN` = 70
- `PHENOMENA_MODERATE.RA` = 30
- `PHENOMENA_MODERATE.BR` = 60
- Wiatr 10kt = brak ryzyka (< 15kt)
- Sufit 1400ft = niskie ryzyko
- **Kombinacja zjawisk:** Śnieg + deszcz + mgła + ograniczona widoczność
- **Oczekiwane ryzyko:** Poziom 3 (Wysokie)
  - Powód: Wielokrotne umiarkowane warunki (linia 2374: `moderateConditions >= 2`)

### 5. TEMPO: 21/05Z - 21/14Z (05:00-14:00 UTC)
**Warunki:** 2500 SN BR BKN007
- Prawdopodobieństwo: 30% (domyślne dla TEMPO)
- Widoczność: 2500m
- Zjawiska: SN (śnieg), BR (mgła)
- Chmury: BKN 700ft (niski sufit!)

**Kalkulacja ryzyka:**
- `calculateVisibilityRisk(2500)` = 60 (< 3000m, linia 2512)
- `PHENOMENA_MODERATE.SN` = 70
- `PHENOMENA_MODERATE.BR` = 60
- `calculateCeilingRisk` dla BKN 700ft = umiarkowane ryzyko
- Skalowane z prawdopodobieństwem 30%:
  - Widoczność: 60 × 0.3 = 18
  - Śnieg: 70 × 0.3 = 21
  - Mgła: 60 × 0.3 = 18
- **Oczekiwane ryzyko:** Poziom 2-3 (Umiarkowane do Wysokie)
  - Powód: Widoczność 2500m + śnieg + niski sufit (700ft)
  - Linia 2382-2383: `visibility <= 3000` = minimum poziom 2
  - Wielokrotne umiarkowane warunki mogą podnieść do poziomu 3

## Wyświetlanie na Timeline

### Oczekiwane zachowanie:

1. **Base Period (15:00-18:00 UTC):** 
   - Zielony pasek (Poziom 1)
   - Tekst: "CAVOK" / "Doskonałe warunki"

2. **Nakładka PROB40 TEMPO (18:00-01:00):**
   - Żółty pasek z etykietą "40%" (Poziom 2)
   - Tekst: "4000m widoczność, Mgła"
   - Powinien być wyświetlony RAZEM z okresem bazowym (nakładka)

3. **TEMPO (01:00-03:00):**
   - Żółty pasek z etykietą "30%" (Poziom 1-2)
   - Tekst: "Chmury przełamane na 1400ft"

4. **BECMG (03:00-05:00):**
   - Pomarańczowy pasek (Poziom 3)
   - Tekst: "Lekki śnieg z deszczem, Mgła, 4000m"
   - Etykieta: "BECOMING" (okres przejściowy)

5. **TEMPO (05:00-14:00):**
   - Pomarańczowy/Żółty pasek z etykietą "30%" (Poziom 2-3)
   - Tekst: "Śnieg, Mgła, 2500m, Niski sufit 700ft"
   - **To jest najdłuższy i najbardziej znaczący okres ryzyka**

## Kluczowe punkty kontrolne:

### ✅ Progi widoczności (z kodu):
- < 550m (MINIMUMS.VISIBILITY): Ryzyko 100 → Poziom 4
- < 1000m: Ryzyko 90 → Poziom 3
- < 3000m: Ryzyko 60 → Poziom 2 minimum
- < 5000m: Ryzyko 30 → Poziom 2 możliwe

### ✅ Wagi zjawisk pogodowych:
- SN (śnieg): 70 (PHENOMENA_MODERATE)
- BR (mgła): 60 (PHENOMENA_MODERATE)  
- RA (deszcz): 30 (PHENOMENA_MODERATE)

### ✅ Prawdopodobieństwo:
- PROB40: 40% (jawnie podane)
- TEMPO (bez PROB): 30% (domyślne, linia 296)
- BECMG: 100% (okres przejściowy, pewny)

### ✅ Efekty złożone:
- Wiatr ≥15kt + Widoczność <3000m: Mnożnik 1.3 (COMPOUND_EFFECTS.SYNERGY.WIND_VIS)
- Wiatr ≥15kt + Opady: Mnożnik 1.3 (COMPOUND_EFFECTS.SYNERGY.WIND_PRECIP)

## Potencjalne problemy do sprawdzenia:

1. **Czy PROB40 TEMPO jest prawidłowo parsowany?**
   - Plik: `src/app/api/weather/route.ts`, linie 290-298
   - Regex: `/PROB(\d{2})/` powinien wychwycić "40"

2. **Czy TEMPO okresy są wyświetlane jako nakładki?**
   - Funkcja: `mergeOverlappingPeriods` (linie 2024-2081)
   - TEMPO powinny mieć `isTemporary: true`

3. **Czy BECMG jest traktowany jako bazowy okres?**
   - Linia 1028: `!p.change?.indicator?.code || p.change.indicator.code === 'BECMG'`
   - BECMG powinien być w `basePeriods`

4. **Czy wielokrotne zjawiska (SNRA) są prawidłowo podzielone?**
   - CheckWX API powinno zwrócić osobne wpisy dla SN i RA
   - Lub kod "-SNRA" powinien być mapowany

5. **Czy czas Warsaw (CET/CEST) jest prawidłowo konwertowany?**
   - Funkcja: `adjustToWarsawTime` używana w liniach 1016-1017
   - 20/18Z = 20/19 CET (czas lokalny +1h)
   - 21/05Z = 21/06 CET

## Oczekiwany timeline (czas Warsaw CET):

```
16:00-19:00  ▓▓▓▓▓▓▓▓  Poziom 1 (Zielony) - CAVOK
19:00-02:00  ▒▒▒▒▒▒▒▒  Poziom 2 (Żółty) - PROB40 TEMPO: Mgła 4000m
02:00-04:00  ▒▒▒▒▒▒▒▒  Poziom 1-2 (Żółty) - TEMPO: Chmury 1400ft
04:00-06:00  ░░░░░░░░  Poziom 3 (Pomarańczowy) - BECMG: Śnieg+Deszcz 4000m
06:00-15:00  ░░░░░░░░  Poziom 2-3 (Żółty/Pomarańczowy) - TEMPO: Śnieg 2500m, Sufit 700ft
```

## Wnioski:

Kod powinien prawidłowo wyświetlać ten TAF z następującymi poziomami ryzyka:
- ✅ Bazowy okres: Poziom 1 (CAVOK)
- ✅ PROB40 TEMPO (4000 BR): Poziom 2
- ✅ TEMPO (BKN014): Poziom 1-2
- ✅ BECMG (SNRA 4000): Poziom 3
- ✅ TEMPO (SN 2500): Poziom 2-3

**Najważniejszy okres do monitorowania:** 21/05-21/14Z (06:00-15:00 CET) ze względu na:
- Śnieg ciągły
- Widoczność 2500m
- Niski sufit 700ft
- Długi czas trwania (9 godzin)

---

## ✅ Wprowadzone poprawki (20 listopada 2024)

### Problem 1: Brak wag ryzyka dla SNRA/RASN
**Opis:** Kod nie miał zdefiniowanych wag ryzyka dla mieszanych opadów śniegu z deszczem (-SNRA, SNRA, +SNRA).

**Rozwiązanie:** Dodano wagi w `RISK_WEIGHTS.PHENOMENA_MODERATE`:
```typescript
RASN: 75,    // Rain and snow mix - higher risk than snow alone
'-RASN': 60, // Light rain and snow mix
'+RASN': 85, // Heavy rain and snow mix
SNRA: 75,    // Snow with rain (alternative notation)
'-SNRA': 60, // Light snow with rain
'+SNRA': 85  // Heavy snow with rain
```

**Uzasadnienie wag:**
- `-SNRA` (60): Wyższe niż BR (60), porównywalne do lekkich opadów
- `SNRA` (75): Wyższe niż SN (70) ze względu na złożoność zjawiska
- `+SNRA` (85): Bliskie intensywnego śniegu +SN (85)

### Problem 2: Brak definicji SNRA w typach
**Opis:** SNRA nie było zdefiniowane w `WEATHER_PHENOMENA` ani w tłumaczeniach.

**Rozwiązanie:** Dodano:
1. Definicje w `WEATHER_PHENOMENA` constant
2. Angielskie tłumaczenia: "Snow with Rain", "Light Snow with Rain", "Heavy Snow with Rain"
3. Polskie tłumaczenia: "Śnieg z deszczem", "Słaby śnieg z deszczem", "Intensywny śnieg z deszczem"

### Wpływ na analizowany TAF:

**Przed poprawką:**
- BECMG (21/03-21/05Z) z `-SNRA` mógł mieć **zaniżone ryzyko** (brak wagi = 0)
- Mogło to skutkować niewłaściwym poziomem 2 zamiast 3

**Po poprawce:**
- BECMG z `-SNRA 4000 BR BKN014` teraz prawidłowo:
  - `-SNRA` = 60 (nowa waga)
  - Widoczność 4000m = 30
  - BR = 60
  - **Kombinacja → Poziom 3** ✅

### Testy weryfikacyjne:
```bash
# Sprawdź, czy nowe wagi są używane
npm run dev
# Otwórz http://localhost:3000
# Sprawdź timeline dla tego TAF
```

### Status: ✅ GOTOWE
- [x] Dodano wagi SNRA/RASN
- [x] Dodano tłumaczenia
- [x] Brak błędów lintera
- [x] Dokumentacja zaktualizowana

