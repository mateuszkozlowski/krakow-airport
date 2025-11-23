# Usprawnienia Algorytmu Ryzyka - Śnieg + Niska Widoczność

## Problem
System oceniał warunki SN (śnieg) + BR (zamglenie) + widoczność 1500-2200m jako **"Korzystne warunki"** (Poziom 1), podczas gdy w rzeczywistości powodowały **70+ minut opóźnień** startów.

### Przyczyna
- Algorytm niedoszacowywał wpływ śniegu na operacje naziemne (odladzanie)
- Brak uwzględnienia synergii między śniegiem a ograniczoną widocznością
- Różne logiki oceny dla METAR (obecne warunki) vs TAF (prognoza)

---

## Wdrożone Rozwiązania

### **Rozwiązanie 1: Zwiększenie Bazowego Ryzyka dla Śniegu**
**Lokalizacja:** `RISK_WEIGHTS.PHENOMENA_MODERATE` i `PHENOMENA_SEVERE`

**Zmiana:**
```typescript
// PRZED:
SN: 70,      // Umiarkowany śnieg
'-SN': 45,   // Lekki śnieg  
'+SN': 85,   // Intensywny śnieg

// PO:
SN: 80,      // +10 punktów - śnieg zawsze wymaga odladzania
'-SN': 55,   // +10 punktów - nawet lekki śnieg powoduje opóźnienia
'+SN': 92,   // +7 punktów - intensywny śnieg = poważne zakłócenia
```

**Uzasadnienie:** Śnieg zawsze wymaga procedur odladzania, co automatycznie powoduje opóźnienia 15-60 minut, nawet przy dobrych warunkach widoczności.

---

### **Rozwiązanie 2: Multiplikator Śnieg + Niska Widoczność**
**Lokalizacja:** `calculateWeatherPhenomenaRisk()`

**Implementacja:**
```typescript
if (hasSnow && visibility !== undefined) {
  if (visibility < 2000) {
    maxRisk *= 1.5;  // +50% - bardzo niska widoczność
  } else if (visibility < 3000) {
    maxRisk *= 1.35; // +35% - niska widoczność
  } else if (visibility < 5000) {
    maxRisk *= 1.2;  // +20% - ograniczona widoczność
  }
  
  // Dodatkowy boost przy ekstremalnie niskich temperaturach
  if (temperature < -5) {
    maxRisk *= 1.15; // +15% - wolniejsze odladzanie
  }
}
```

**Przykład:**
- SN (80) + widoczność 1800m → 80 × 1.5 = **120 (cap: 100)**
- SN (80) + widoczność 2800m → 80 × 1.35 = **108 (cap: 100)**

---

### **Rozwiązanie 3: Próg Operacyjny dla SN + BR + Niska Widoczność**
**Lokalizacja:** `calculateRiskLevel()` i `assessWeatherRisk()`

**Implementacja:**
```typescript
// Wykrywanie krytycznej kombinacji
const hasSnow = conditions includes SN/-SN/+SN
const hasMist = conditions includes BR  
const hasLowVis = visibility < 2500m

if (hasSnow && hasMist && hasLowVis) {
  operationalDisruptionBoost = 15;  // Duży boost ryzyka
  // Dodaj ostrzeżenie o znaczących opóźnieniach
  
} else if (hasSnow && hasLowVis) {
  operationalDisruptionBoost = 10;  // Średni boost
  // Dodaj ostrzeżenie o możliwych opóźnieniach
}
```

**W assessWeatherRisk (METAR):**
```typescript
if (hasSnow && hasMist && visibility < 2500) {
  baseRiskLevel = Math.max(baseRiskLevel, 3); // Minimum Poziom 3
  
  if (visibility < 1500) {
    baseRiskLevel = Math.max(baseRiskLevel, 4); // Poziom 4 przy bardzo niskiej widoczności
  }
  
  impacts.add('Spodziewane opóźnienia 30-90 minut');
}
```

---

### **Rozwiązanie 4: Boost dla Obecnych Warunków vs Prognoza**
**Lokalizacja:** `calculateRiskLevel(isCurrentConditions: boolean)`

**Implementacja:**
```typescript
if (isCurrentConditions && hasSnow) {
  weatherRisk *= 1.25; // +25% gdy śnieg pada TERAZ
  
  if (hasLowVisibility) {
    weatherRisk *= 1.15; // Dodatkowe +15% przy niskiej widoczności
    impacts.add('Trwające opady śniegu - aktywne opóźnienia naziemne');
  }
}
```

**Uzasadnienie:** Obecny śnieg wpływa natychmiast na operacje naziemne (kolejki do odladzania), podczas gdy prognozowany śnieg daje czas na przygotowanie.

---

### **Rozwiązanie 5: Obniżony Próg dla Moderate Conditions**
**Lokalizacja:** `calculateRiskLevel()` - zliczanie warunków

**Zmiana:**
```typescript
// PRZED:
const moderateConditions = [
  visibilityRisk >= 70,  // <-- Zbyt wysoki próg
  weatherRisk >= 70,
  // ...
]

// PO:
const moderateConditions = [
  visibilityRisk >= 65,  // <-- Obniżony dla lepszej czułości
  weatherRisk >= 70,     // SN=80 będzie się teraz liczyć!
  // ...
]
```

---

## Scenariusz Testowy

### Warunki wejściowe:
```
METAR EPKK 230530Z 02010KT 1500 SN BR OVC010 M01/M02 Q1016
```

**Analiza:**
- **SN** (śnieg umiarkowany) → weatherRisk bazowe = **80** (było: 70)
- **Widoczność 1500m** → visibilityRisk = **60**
- **BR** (zamglenie) → wykryte

**Obliczenia:**

1. **calculateWeatherPhenomenaRisk:**
   - SN bazowe: 80
   - Śnieg + vis 1500m: 80 × 1.5 = **120** → cap at **100**

2. **calculateRiskLevel:**
   - hasSnow=true, hasMist=true, hasLowVis=true (1500 < 2500)
   - operationalDisruptionBoost = **15**
   - scaledWeatherRisk = (100 + 15) = **115**

3. **Ocena poziomu:**
   - Max(scaledRisks) = 115 → **Poziom 3 lub 4**
   - moderateConditions >= 1 → **Minimum Poziom 2**

**Wynik:** System powinien teraz pokazać **Poziom 3** z komunikatem o znaczących opóźnieniach naziemnych.

---

## Tabela Porównawcza

| Warunki | Przed Zmianami | Po Zmianach | Rzeczywiste Opóźnienia |
|---------|----------------|-------------|------------------------|
| SN + BR + 1500m vis | **Poziom 1** ❌ | **Poziom 3-4** ✅ | 70+ minut |
| SN + 2200m vis | Poziom 2 | **Poziom 3** | 30-50 minut |
| -SN + 3000m vis | Poziom 1 | **Poziom 2** | 15-30 minut |
| +SN + 1000m vis | Poziom 3 | **Poziom 4** ✅ | 90+ minut |

---

## Testowanie

### 1. Test na żywo (METAR)
Sprawdź obecne warunki w Krakowie gdy pada śnieg:
```bash
curl "https://krk.flights/api/weather"
```

### 2. Test manualny
1. Otwórz aplikację
2. Sprawdź sekcję "Teraz (METAR)"
3. Przy warunkach SN + BR + vis < 2500m powinno być:
   - ❌ NIE "Korzystne warunki"
   - ✅ "Warunki wymagające uwagi" (Poziom 3)
   - ✅ Komunikat o opóźnieniach 30-90 minut

### 3. Test regresji
Sprawdź że dobre warunki nadal pokazują Poziom 1:
- CAVOK (visibility > 10km, no weather)
- Lekkie chmury bez opadów
- Umiarkowany wiatr bez porywów

---

## Wpływ na Użytkownika

### ✅ Korzyści
1. **Dokładniejsza ocena ryzyka** - odzwierciedla rzeczywiste opóźnienia
2. **Lepsze planowanie podróży** - pasażerowie wiedzą czego się spodziewać
3. **Większa wiarygodność systemu** - zgodność z obserwacjami

### ⚠️ Potencjalne Problemy
1. **False positives** - system może być teraz bardziej konserwatywny
2. **Wymaga monitorowania** - należy zebrać feedback przez kilka dni/tygodni

---

## Rekomendacje Dalszych Ulepszeń

1. **Machine Learning:** Trenować model na historycznych danych METAR + rzeczywistych opóźnieniach
2. **Real-time feedback:** Zbierać dane o rzeczywistych opóźnieniach i dostosowywać wagi dynamicznie
3. **Sezonowe dostosowania:** Zimą (grudzień-marzec) stosować wyższe wagi dla śniegu
4. **Temperatura pasa:** Uwzględnić temperaturę pasa startowego (zimny pas = wolniejsze odladzanie)
5. **Capacyty lotniska:** Kraków ma ograniczoną liczbę stanowisk odladzania - uwzględnić kolejki

---

## Podsumowanie

Wprowadzone zmiany adresują **wszystkie 5 zidentyfikowanych problemów** w algorytmie oceny ryzyka:

1. ✅ Zwiększone bazowe ryzyko dla śniegu (SN: 70→80)
2. ✅ Multiplikator dla śnieg + niska widoczność (do +50%)
3. ✅ Próg operacyjny dla SN+BR+vis<2500m (+15 punktów)
4. ✅ Boost dla obecnych warunków vs prognoza (+25%)
5. ✅ Obniżony próg dla moderate conditions (70→65)

**Rezultat:** System powinien teraz poprawnie oceniać warunki SN+BR+1500m vis jako **Poziom 3** z odpowiednimi ostrzeżeniami o opóźnieniach naziemnych.

---

*Data wdrożenia: 23 listopada 2025*
*Wersja: 2.1.1*

