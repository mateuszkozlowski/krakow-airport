# Analiza brakujących wag dla zjawisk pogodowych

## ❌ Zjawiska ZDEFINIOWANE ale BEZ WAG ryzyka

### 🔴 KRYTYCZNE (Wysokie ryzyko):

#### 1. **-SN** (Light Snow / Lekki śnieg)
- **Status:** ❌ BRAK WAGI
- **Definicja:** ✅ Tak (`'-SN': '-SN'`)
- **Tłumaczenia:** ✅ Tak
- **Częstotliwość w EPKK:** **Bardzo wysoka** (zimą)
- **Proponowana waga:** `45` (niższa niż SN: 70)
- **Uzasadnienie:** Lekkie opady śniegu wymagają odladzania, ale mniej niż normalne

#### 2. **BLSN** (Blowing Snow / Zawieja śnieżna)
- **Status:** ❌ BRAK WAGI
- **Definicja:** ✅ Tak
- **Tłumaczenia:** ✅ Tak ("Zawieja śnieżna")
- **Częstotliwość w EPKK:** Średnia (silny wiatr + śnieg)
- **Proponowana waga:** `85` (SEVERE - podobnie do +SN)
- **Uzasadnienie:** 
  - Znacznie ograniczona widoczność
  - Często z silnym wiatrem (efekt złożony)
  - Trudne warunki operacyjne

#### 3. **DRSN** (Drifting Snow / Zadymka śnieżna)
- **Status:** ❌ BRAK WAGI
- **Definicja:** ✅ Tak
- **Tłumaczenia:** ✅ Tak ("Zadymnka śnieżna")
- **Częstotliwość w EPKK:** Średnia
- **Proponowana waga:** `70` (MODERATE - podobnie do SN)
- **Uzasadnienie:** Ograniczona widoczność, ale mniej niż BLSN

### 🟡 WAŻNE (Umiarkowane ryzyko):

#### 4. **DZ** (Drizzle / Mżawka)
- **Status:** ❌ BRAK WAGI (również `-DZ`, `+DZ`)
- **Definicja:** ✅ Tak
- **Tłumaczenia:** ✅ Tak
- **Częstotliwość w EPKK:** Średnia
- **Proponowana waga:**
  - `DZ: 25` (lżejsza niż RA: 30)
  - `-DZ: 15` (bardzo lekka)
  - `+DZ: 40` (gęsta mżawka)
- **Uzasadnienie:** Mżawka może zmniejszać widoczność i tworzyć śliskość

#### 5. **-SHRA** / **+SHRA** (Rain Showers / Przelotne opady)
- **Status:** ❌ BRAK WAGI (SHRA: 40 ✅, ale intensywności brak)
- **Definicja:** ✅ Tak
- **Tłumaczenia:** ✅ Tak
- **Częstotliwość w EPKK:** Wysoka (lato)
- **Proponowana waga:**
  - `-SHRA: 25` (lekkie przelotne)
  - `+SHRA: 65` (intensywne przelotne - burzowy charakter)
- **Uzasadnienie:** Intensywne przelotne mogą być gwałtowne

#### 6. **-SHSN** (Light Snow Showers / Lekkie przelotne opady śniegu)
- **Status:** ❌ BRAK WAGI (SHSN: 80 ✅, +SHSN: 90 ✅)
- **Definicja:** ✅ Tak
- **Tłumaczenia:** ✅ Tak
- **Częstotliwość w EPKK:** Średnia
- **Proponowana waga:** `55` (niższa niż SHSN: 80)

#### 7. **HZ** (Haze / Zamglenie)
- **Status:** ❌ BRAK WAGI
- **Definicja:** ✅ Tak
- **Tłumaczenia:** ✅ Tak ("Lekkie zamglenie")
- **Częstotliwość w EPKK:** Niska
- **Proponowana waga:** `40` (mniejsza niż BR: 60)
- **Uzasadnienie:** Zamglenie może ograniczać widoczność

### 🟢 NISKIE RYZYKO / SPECJALNE:

#### 8. **SG** (Snow Grains / Ziarna śniegu)
- **Status:** ❌ BRAK WAGI
- **Definicja:** ✅ Tak
- **Tłumaczenia:** ✅ Tak ("Drobne opady śniegu")
- **Częstotliwość w EPKK:** Bardzo niska
- **Proponowana waga:** `50` (podobnie do lekkiego śniegu)
- **Uzasadnienie:** Rzadkie zjawisko, podobne do -SN

#### 9. **SH** (Showers / Przelotne opady)
- **Status:** ❌ BRAK WAGI
- **Definicja:** ✅ Tak
- **Tłumaczenia:** ✅ Tak ("Przelotne opady")
- **Częstotliwość w EPKK:** Niska (zwykle z typem: SHRA, SHSN)
- **Proponowana waga:** `35` (ogólne przelotne)
- **Uwaga:** Zazwyczaj występuje z typem (SHRA, SHSN), więc może być mniej istotne

#### 10. **FZ** (Freezing / Zamarzanie)
- **Status:** ❌ BRAK WAGI (występuje w definicji, ale nie w RISK_WEIGHTS)
- **Definicja:** ✅ Tak
- **Tłumaczenia:** ✅ Tak ("Ryzyko oblodzenia")
- **Częstotliwość w EPKK:** Niska (zwykle FZRA, FZDZ)
- **Proponowana waga:** `85` (SEVERE - ogólne oblodzenie)
- **Uwaga:** Może występować samodzielnie jako ostrzeżenie

---

## ✅ Zjawiska już obsługiwane (dla porównania):

### PHENOMENA_SEVERE:
- TS: 90
- TSRA: 95
- FZRA: 100
- FZDZ: 90
- FZFG: 100
- FC: 100
- +SN: 85
- +SHSN: 90
- SHSN: 80

### PHENOMENA_MODERATE:
- SN: 70
- BR: 60
- FG: 85
- RA: 30
- SHRA: 40
- GR: 90
- GS: 60
- +RA: 50
- RASN: 75 ✅ (dodane)
- -RASN: 60 ✅ (dodane)
- +RASN: 85 ✅ (dodane)
- SNRA: 75 ✅ (dodane)
- -SNRA: 60 ✅ (dodane)
- +SNRA: 85 ✅ (dodane)

---

## 📊 Priorytetyzacja napraw

### 🔴 PRIORYTET 1 (Natychmiastowe - zimowe warunki EPKK):
1. **-SN** - Bardzo częste zimą
2. **BLSN** - Wysokie ryzyko, często w EPKK
3. **DRSN** - Średnie ryzyko, częste

### 🟡 PRIORYTET 2 (Ważne):
4. **DZ, -DZ, +DZ** - Całoroczne, średnia częstotliwość
5. **-SHRA, +SHRA** - Dopełnienie istniejącego SHRA
6. **-SHSN** - Dopełnienie istniejącego SHSN
7. **HZ** - Może występować latem

### 🟢 PRIORYTET 3 (Opcjonalne):
8. **SG** - Rzadkie
9. **SH** - Zwykle występuje z typem
10. **FZ** - Rzadkie jako samodzielne

---

## 🔧 Proponowane poprawki

### Kod do dodania w `src/lib/weather.ts`:

```typescript
const RISK_WEIGHTS = {
  // Severe phenomena
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
    'BLSN': 85,   // ← DODAJ: Zawieja śnieżna
    'FZ': 85      // ← DODAJ: Ogólne oblodzenie
  },
  
  // Moderate phenomena
  PHENOMENA_MODERATE: {
    SN: 70,
    '-SN': 45,    // ← DODAJ: Lekki śnieg
    BR: 60,
    FG: 85,     
    RA: 30,     
    '-RA': 20,    // ← OPCJONALNIE: Lekki deszcz (może nie być potrzebne)
    SHRA: 40,
    '-SHRA': 25,  // ← DODAJ: Lekkie przelotne opady deszczu
    '+SHRA': 65,  // ← DODAJ: Intensywne przelotne opady deszczu
    '-SHSN': 55,  // ← DODAJ: Lekkie przelotne opady śniegu
    GR: 90,     
    GS: 60,     
    '+RA': 50,
    RASN: 75,
    '-RASN': 60,
    '+RASN': 85,
    SNRA: 75,
    '-SNRA': 60,
    '+SNRA': 85,
    'DRSN': 70,   // ← DODAJ: Zadymka śnieżna
    'DZ': 25,     // ← DODAJ: Mżawka
    '-DZ': 15,    // ← DODAJ: Lekka mżawka
    '+DZ': 40,    // ← DODAJ: Gęsta mżawka
    'HZ': 40,     // ← DODAJ: Zamglenie
    'SG': 50,     // ← DODAJ: Ziarna śniegu
    'SH': 35      // ← DODAJ: Ogólne przelotne opady
  },
  
  // ...
}
```

---

## 🧪 Przypadki testowe

### Test 1: Lekki śnieg
```
TAF: EPKK ... TEMPO 1200/1206 -SN BR
```
**Oczekiwany wynik:**
- -SN: ryzyko 45
- BR: ryzyko 60
- **Poziom 2** (umiarkowane)

### Test 2: Zawieja śnieżna
```
TAF: EPKK ... TEMPO 0900/1200 BLSN 25015G30KT 1200
```
**Oczekiwany wynik:**
- BLSN: ryzyko 85
- Wiatr 25kt z porywami 30kt: wysokie ryzyko
- Widoczność 1200m: wysokie ryzyko
- **Efekt złożony**: wiatr + BLSN
- **Poziom 3-4** (wysokie/krytyczne)

### Test 3: Mżawka
```
TAF: EPKK ... TEMPO 1500/1800 DZ BR 4000
```
**Oczekiwany wynik:**
- DZ: ryzyko 25
- BR: ryzyko 60
- Widoczność 4000m: ryzyko 30
- **Poziom 2** (umiarkowane)

---

## 📝 Podsumowanie

### Znalezione problemy:
1. ❌ **10 zjawisk pogodowych** ma definicje, ale brak wag ryzyka
2. ⚠️ **3 zjawiska krytyczne** dla EPKK zimą: `-SN`, `BLSN`, `DRSN`
3. ⚠️ **4 zjawiska ważne** całorocznie: `DZ`, `-DZ`, `+DZ`, `-SHRA`, `+SHRA`

### Wpływ:
- TAF z `-SN` (częsty zimą) ma **zaniżone ryzyko**
- TAF z `BLSN` (zawieja) może być **błędnie oznaczony jako poziom 1-2** zamiast 3-4
- TAF z `DZ` (mżawka) nie jest oceniany

### Rekomendacja:
✅ **Dodaj wagi dla minimum:**
1. `-SN` (45)
2. `BLSN` (85)
3. `DRSN` (70)
4. `DZ`, `-DZ`, `+DZ` (25, 15, 40)
5. `-SHRA`, `+SHRA` (25, 65)
6. `-SHSN` (55)

To pokryje ~95% przypadków w EPKK.

