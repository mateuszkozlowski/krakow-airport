# Dodatkowe znaleziska - Kombinacje zjawisk pogodowych

## ❌ Kombinacje zjawisk BEZ WAG ryzyka

### Zdefiniowane kombinacje w `WEATHER_PHENOMENA`:

#### 1. **'FZRA FZFG'** (Freezing Rain + Freezing Fog)
- **Status:** ❌ BRAK WAGI
- **Definicja:** ✅ Tak
- **Tłumaczenia:** ✅ Tak ("Deszcz i mgła marznąca")
- **Proponowana waga:** `100` (SEVERE - maksymalne ryzyko)
- **Uzasadnienie:** 
  - FZRA: 100
  - FZFG: 100
  - Kombinacja = maksymalne ryzyko oblodzenia + zerowa widoczność

#### 2. **'FZDZ FZFG'** (Freezing Drizzle + Freezing Fog)
- **Status:** ❌ BRAK WAGI
- **Definicja:** ✅ Tak
- **Tłumaczenia:** ✅ Tak ("Mżawka i mgła marznąca")
- **Proponowana waga:** `100` (SEVERE - maksymalne ryzyko)
- **Uzasadnienie:**
  - FZDZ: 90
  - FZFG: 100
  - Kombinacja = maksymalne ryzyko

#### 3. **'+SHSN BLSN'** (Heavy Snow Showers + Blowing Snow)
- **Status:** ❌ BRAK WAGI
- **Definicja:** ✅ Tak
- **Tłumaczenia:** ✅ Tak ("Intensywne opady śniegu z silnym wiatrem")
- **Proponowana waga:** `95` (SEVERE)
- **Uzasadnienie:**
  - +SHSN: 90
  - BLSN: 85
  - Kombinacja = wyższa niż każde z osobna

#### 4. **'SHSN BLSN'** (Snow Showers + Blowing Snow)
- **Status:** ❌ BRAK WAGI
- **Definicja:** ✅ Tak
- **Tłumaczenia:** ✅ Tak ("Przelotne opady śniegu z silnym wiatrem")
- **Proponowana waga:** `88` (SEVERE)
- **Uzasadnienie:**
  - SHSN: 80
  - BLSN: 85
  - Kombinacja = średnia + bonus

---

## 🔍 Jak są obecnie obsługiwane?

Sprawdzenie w `calculateWeatherPhenomenaRisk()`:

```typescript
conditions.forEach(condition => {
  const risk = RISK_WEIGHTS.PHENOMENA_SEVERE[condition.code] ||
              RISK_WEIGHTS.PHENOMENA_MODERATE[condition.code] ||
              0;
  // ...
});
```

**Problem:** Jeśli `condition.code === 'FZRA FZFG'`, to:
- Kod szuka `RISK_WEIGHTS.PHENOMENA_SEVERE['FZRA FZFG']`
- Nie znajduje (brak definicji)
- Zwraca `0` ❌

**JEDNAK:** CheckWX może zwracać to jako:
- Dwa oddzielne kody: `{ code: 'FZRA' }, { code: 'FZFG' }`
- Jeden kod: `{ code: 'FZRA FZFG' }`

Jeśli jako **dwa oddzielne**, to działa ✅ (bierze max):
- FZRA: 100
- FZFG: 100
- Max = 100 ✅

Jeśli jako **jeden kod**, to nie działa ❌:
- 'FZRA FZFG': 0 ❌

---

## 🔧 Proponowane rozwiązanie

### Wariant 1: Dodaj wagi dla kombinacji (najprostszy)

```typescript
const RISK_WEIGHTS = {
  PHENOMENA_SEVERE: {
    TS: 90,
    TSRA: 95,
    FZRA: 100,
    FZDZ: 90,
    FZFG: 100,
    FC: 100,
    '+SN': 85,
    '+SHSN': 90,
    'SHSN': 80,
    'BLSN': 85,
    'FZ': 85,
    
    // Kombinacje ↓
    'FZRA FZFG': 100,    // ← DODAJ
    'FZDZ FZFG': 100,    // ← DODAJ
    '+SHSN BLSN': 95,    // ← DODAJ
    'SHSN BLSN': 88      // ← DODAJ
  },
  // ...
}
```

### Wariant 2: Rozdziel spacje i znajdź max (bardziej elastyczny)

```typescript
async function calculateWeatherPhenomenaRisk(conditions: { code: string }[] | undefined): Promise<number> {
  if (!conditions) return 0;
  
  let maxRisk = 0;
  let severeCount = 0;
  
  conditions.forEach(condition => {
    // Rozdziel kod po spacji (dla kombinacji jak 'FZRA FZFG')
    const codes = condition.code.split(' ');
    
    codes.forEach(code => {
      const risk = RISK_WEIGHTS.PHENOMENA_SEVERE[code as keyof typeof RISK_WEIGHTS.PHENOMENA_SEVERE] ||
                  RISK_WEIGHTS.PHENOMENA_MODERATE[code as keyof typeof RISK_WEIGHTS.PHENOMENA_MODERATE] ||
                  0;
      
      if (risk >= 70) severeCount++;
      maxRisk = Math.max(maxRisk, risk);
    });
  });
  
  // ... reszta funkcji
}
```

**Zalety Wariantu 2:**
- Automatycznie obsługuje wszystkie kombinacje
- Nie wymaga dodawania każdej kombinacji
- Elastyczny dla przyszłych kombinacji

**Wady Wariantu 2:**
- Nie bierze pod uwagę synergii (kombinacja może być gorsza niż suma)

---

## 🧪 Test kombinacji

### Test 1: FZRA FZFG (jako jeden kod)
```
TAF: EPKK ... TEMPO 0600/0900 FZRA FZFG
```

**Obecnie:**
- Kod: 'FZRA FZFG'
- Ryzyko: **0** ❌
- Poziom: Może być **1** (błąd!)

**Po naprawie (Wariant 1):**
- Kod: 'FZRA FZFG'
- Ryzyko: **100** ✅
- Poziom: **4** (krytyczne)

**Po naprawie (Wariant 2):**
- Kody: ['FZRA', 'FZFG']
- Ryzyko: max(100, 100) = **100** ✅
- Poziom: **4** (krytyczne)

### Test 2: SHSN BLSN (jako dwa kody)
```
TAF: EPKK ... TEMPO 1200/1500 SHSN BLSN 25020G35KT
```

**Jeśli CheckWX zwraca jako dwa oddzielne:**
- conditions: [{ code: 'SHSN' }, { code: 'BLSN' }]
- Ryzyko SHSN: 80
- Ryzyko BLSN: 85
- Max: **85** ✅
- Poziom: **3-4** (w zależności od wiatru)

**Jeśli CheckWX zwraca jako jeden:**
- conditions: [{ code: 'SHSN BLSN' }]
- Ryzyko: **0** obecnie ❌ → **88** po naprawie ✅

---

## 📊 Rekomendacje

### ✅ Zaimplementuj WARIANT 2 (split + max):
1. Automatycznie obsługuje kombinacje
2. Nie wymaga ręcznego dodawania każdej kombinacji
3. Działa dla obecnych i przyszłych przypadków

### ✅ OPCJONALNIE dodaj bonus synergii:
Jeśli wykryjesz kombinację (len(codes) > 1), dodaj bonus:

```typescript
// Jeśli to kombinacja, dodaj bonus synergii
if (codes.length > 1 && maxRisk >= 80) {
  maxRisk = Math.min(100, maxRisk * 1.1); // +10% za kombinację
}
```

---

## 🔍 Modyfikatory TAF/METAR (dodatkowe sprawdzenie)

### Nie znalazłem definicji dla:

#### Modyfikatory proximity (w pobliżu):
- **VC** (Vicinity) - np. VCSH (deszcz w pobliżu), VCTS (burza w pobliżu)
  - **Częstotliwość:** Średnia
  - **Proponowana obsługa:** Zmniejszona waga (×0.5) dla zjawiska
  - **Przykład:** VCTS = TS × 0.5 = 90 × 0.5 = 45

#### Modyfikatory recent (niedawno):
- **RE** (Recent) - np. RETS (niedawna burza)
  - **Częstotliwość:** Niska
  - **Proponowana obsługa:** Informacyjne (ryzyko 0, ale pokaż w opisie)

#### Inne prefiksy:
- **MI** (Shallow / Płytka) - np. MIFG (płytka mgła)
- **BC** (Patches / Miejscami) - np. BCFG (mgła miejscami)
- **PR** (Partial / Częściowa)
- **DR** (Low Drifting) - już mamy DRSN ✅
- **BL** (Blowing) - już mamy BLSN ✅

**Status:** Te są rzadkie i mniej krytyczne. Można dodać później.

---

## 📝 Podsumowanie dodatkowych znalezisk

### Nowe problemy:
1. ❌ **4 kombinacje zjawisk** nie mają wag (FZRA FZFG, FZDZ FZFG, +SHSN BLSN, SHSN BLSN)
2. ⚠️ Brak obsługi modyfikatorów **VC**, **RE**, **MI**, **BC**
3. ⚠️ `calculateWeatherPhenomenaRisk()` nie rozdziela kodów ze spacjami

### Wpływ:
- TAF z kombinacją `FZRA FZFG` jako jeden kod może mieć **ryzyko 0** zamiast 100
- Bardzo krytyczny błąd dla warunków oblodzenia!

### Priorytet:
🔴 **KRYTYCZNY** - Zaimplementuj split kodów po spacji w `calculateWeatherPhenomenaRisk()`

