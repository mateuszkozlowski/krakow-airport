# Propozycje ulepszeń realizmu prognoz

## 🔍 Analiza obecnego stanu

### Co mamy dostępne:
1. ✅ **TAF (CheckWX)**: zjawiska pogodowe, widoczność, chmury, wiatr
2. ✅ **METAR (CheckWX)**: aktualne warunki, temperatura, punkt rosy
3. ✅ **Open-Meteo**: temperatura godzinowa, wiatr, widoczność, opady
4. ❌ **RVR (Runway Visual Range)**: zdefiniowane w types, ale nie używane
5. ❌ **Crosswind**: limity zdefiniowane, ale nie obliczane dla konkretnych pasów

### Co już działa dobrze:
- ✅ Risk levels oparte na rzeczywistych minimach CAT I
- ✅ Compound effects (wiatr + widoczność, wiatr + opady)
- ✅ Snow duration tracking z Redis
- ✅ Probability-based risk scaling dla TEMPO/PROB periods
- ✅ Ceiling risk dla CB/TCU clouds

---

## 🎯 Propozycje ulepszeń

### 1. **Temperature-Enhanced FZFG/FZRA Risk** ⭐⭐⭐
**Priorytet: WYSOKI** | **Realizm: ++++** | **Złożoność: Niska**

**Problem**: 
- FZFG ma fixed risk (100), niezależnie od temperatury
- Przy -1°C FZFG jest bardziej niebezpieczne niż przy +2°C

**Rozwiązanie**:
```typescript
// w calculateRiskLevel()
if (hasExtremeFreezing) {
  const temp = period.temperature?.celsius;
  
  // Boost risk if temperature is in critical range for icing
  let icingMultiplier = 1.0;
  
  if (temp !== undefined) {
    if (temp <= -5) {
      icingMultiplier = 1.3;  // Severe icing: instant freeze
    } else if (temp <= 0) {
      icingMultiplier = 1.2;  // High icing: rapid accumulation
    } else if (temp <= 3) {
      icingMultiplier = 1.1;  // Moderate icing: possible accumulation
    }
  }
  
  // Apply to weatherRisk
  const adjustedWeatherRisk = weatherRisk * icingMultiplier;
}
```

**Korzyści**:
- Bardziej precyzyjne ryzyko oblodzenia
- Wykorzystanie temperature z Open-Meteo dla okresów TAF
- Lepsze warnings dla załóg (np. "FZFG at -2°C: instant icing")

---

### 2. **Crosswind Calculation dla pasów EPKK** ⭐⭐⭐
**Priorytet: WYSOKI** | **Realizm: ++++** | **Złożoność: Średnia**

**Problem**:
- EPKK ma pasy: **07/25** (heading 069°/249°)
- Obecnie nie obliczamy faktycznego crosswind dla tych pasów
- Limit: 20kt crosswind (zdefiniowany, ale nie używany)

**Rozwiązanie**:
```typescript
const EPKK_RUNWAYS = {
  '07': { heading: 069, opposite: '25' },
  '25': { heading: 249, opposite: '07' }
} as const;

function calculateCrosswind(windDirection: number, windSpeed: number, gustKts?: number) {
  const runways = Object.values(EPKK_RUNWAYS);
  
  let maxCrosswind = 0;
  let affectedRunway = '';
  
  for (const rwy of runways) {
    const headingDiff = Math.abs(windDirection - rwy.heading);
    const normalizedDiff = headingDiff > 180 ? 360 - headingDiff : headingDiff;
    
    // Crosswind component = wind speed × sin(angle)
    const crosswind = (gustKts || windSpeed) * Math.sin(normalizedDiff * Math.PI / 180);
    
    if (Math.abs(crosswind) > Math.abs(maxCrosswind)) {
      maxCrosswind = crosswind;
      affectedRunway = rwy.heading.toString().padStart(3, '0');
    }
  }
  
  return { crosswind: Math.abs(maxCrosswind), runway: affectedRunway };
}

// W calculateRiskLevel():
if (period.wind) {
  const { crosswind, runway } = calculateCrosswind(
    period.wind.direction,
    period.wind.speed_kts,
    period.wind.gust_kts
  );
  
  if (crosswind > MINIMUMS.CROSSWIND) {
    impacts.push(
      language === 'pl' 
        ? `💨 Wiatr boczny ${Math.round(crosswind)}kt przekracza limit (${MINIMUMS.CROSSWIND}kt) dla pasa ${runway}`
        : `💨 Crosswind ${Math.round(crosswind)}kt exceeds limit (${MINIMUMS.CROSSWIND}kt) for runway ${runway}`
    );
    // Increase risk level
    riskLevel = Math.max(riskLevel, 3) as 1 | 2 | 3 | 4;
  } else if (crosswind > MINIMUMS.CROSSWIND * 0.8) {
    impacts.push(
      language === 'pl'
        ? `💨 Wysoki wiatr boczny ${Math.round(crosswind)}kt (blisko limitu ${MINIMUMS.CROSSWIND}kt)`
        : `💨 High crosswind ${Math.round(crosswind)}kt (near ${MINIMUMS.CROSSWIND}kt limit)`
    );
  }
}
```

**Korzyści**:
- Precyzyjne informacje o realnym ryzyku wiatru dla EPKK
- Pasażerowie wiedzą, dlaczego lądowanie może być trudne
- Zgodność z rzeczywistymi limitami operacyjnymi

---

### 3. **RVR (Runway Visual Range) Integration** ⭐⭐
**Priorytet: ŚREDNI** | **Realizm: +++** | **Złożoność: Niska**

**Problem**:
- RVR jest bardziej precyzyjny niż visibility dla operacji lotniskowych
- Jest w METAR dla EPKK, ale go nie używamy
- Typ jest zdefiniowany w `weather.ts`, ale nigdy nie populated

**Rozwiązanie**:
```typescript
// w transformMetarData() (route.ts):
// Extract RVR from raw METAR if present
// Format: R07/P2000 = Runway 07, visibility >2000m
// Format: R07/0400V0800 = Runway 07, visibility 400m varying to 800m
const rvr: RunwayVisualRange[] = [];
const rvrMatches = rawText.matchAll(/R(\d{2}[LCR]?)\/(P)?(\d{4})(V(\d{4}))?([UDN])?/g);

for (const match of rvrMatches) {
  const runway = match[1];
  const isAbove = match[2] === 'P';  // P = above maximum
  const vis1 = parseInt(match[3], 10);
  const vis2 = match[5] ? parseInt(match[5], 10) : undefined;
  const trend = match[6] as 'U' | 'D' | 'N' | undefined;
  
  rvr.push({
    runway,
    visibility: { meters: vis2 ? (vis1 + vis2) / 2 : vis1 },
    trend,
    isAbove,
    range: vis2 ? { min: vis1, max: vis2 } : undefined
  });
}

// W assessWeatherRisk():
if (weather.runway_visual_range) {
  for (const rvr of weather.runway_visual_range) {
    if (rvr.visibility.meters < MINIMUMS.RVR) {
      impacts.push(
        language === 'pl'
          ? `👁️ RVR pas ${rvr.runway}: ${rvr.visibility.meters}m (poniżej minimum ${MINIMUMS.RVR}m)`
          : `👁️ RVR runway ${rvr.runway}: ${rvr.visibility.meters}m (below minimum ${MINIMUMS.RVR}m)`
      );
      
      // RVR below minimums is critical
      if (rvr.visibility.meters < MINIMUMS.RVR) {
        baseRiskLevel = Math.max(baseRiskLevel, 4);
      }
    }
    
    // Add trend information
    if (rvr.trend === 'D') {
      impacts.push(
        language === 'pl'
          ? `📉 RVR pas ${rvr.runway}: pogorszenie widoczności`
          : `📉 RVR runway ${rvr.runway}: visibility deteriorating`
      );
    } else if (rvr.trend === 'U') {
      impacts.push(
        language === 'pl'
          ? `📈 RVR pas ${rvr.runway}: poprawa widoczności`
          : `📈 RVR runway ${rvr.runway}: visibility improving`
      );
    }
  }
}
```

**Korzyści**:
- Bardziej precyzyjne informacje o widoczności na pasach
- Informacja o trendach (poprawa/pogorszenie)
- Zgodność z procedurami lotniskowymi

---

### 4. **Enhanced PROB/TEMPO Overlap Handling** ⭐⭐
**Priorytet: ŚREDNI** | **Realizm: +++** | **Złożoność: Średnia**

**Problem**:
- `TEMPO 1901/1907 3000 BR` i `PROB30 1903/1907 0400 FZFG` nakładają się
- Obecnie system pokazuje oba jako oddzielne periods
- W rzeczywistości PROB30 FZFG modyfikuje TEMPO period

**Rozwiązanie**:
```typescript
function mergeProbWithTempo(periods: ForecastChange[]): ForecastChange[] {
  const result: ForecastChange[] = [];
  
  for (let i = 0; i < periods.length; i++) {
    const current = periods[i];
    const probCode = current.changeType.includes('PROB');
    
    if (probCode) {
      // Find overlapping TEMPO period
      const overlapping = periods.find(p => 
        p.changeType === 'TEMPO' &&
        p.from <= current.from && p.to >= current.to
      );
      
      if (overlapping) {
        // Create combined period showing both scenarios
        result.push({
          ...current,
          conditions: {
            ...current.conditions,
            description: language === 'pl'
              ? `Możliwe (${current.probability}%): ${current.conditions.phenomena.join(', ')}`
              : `Possible (${current.probability}%): ${current.conditions.phenomena.join(', ')}`
          },
          baseConditions: overlapping.conditions  // Show base TEMPO conditions too
        });
        continue;
      }
    }
    
    result.push(current);
  }
  
  return result;
}
```

**Korzyści**:
- Lepsze zrozumienie hierarchii prognoz
- Jasne: "Normally BR/3000m, but 30% chance of FZFG/400m"

---

### 5. **Dew Point Depression Analysis** ⭐
**Priorytet: NISKI** | **Realizm: ++** | **Złożoność: Niska**

**Problem**:
- Mamy temperature i dew point z METAR
- Depression (T - Td) wskazuje na ryzyko mgły
- Nie wykorzystujemy tego dla prognoz

**Rozwiązanie**:
```typescript
// W assessWeatherRisk():
if (weather.temperature?.celsius !== undefined && 
    weather.temp_dewpoint !== undefined) {
  
  const depression = weather.temperature.celsius - weather.temp_dewpoint;
  
  // Depression < 2°C: high fog/mist risk
  if (depression < 2 && !weather.conditions?.some(c => c.code === 'FG' || c.code === 'BR')) {
    impacts.push(
      language === 'pl'
        ? `🌫️ Wysokie ryzyko mgły (T-Td = ${depression.toFixed(1)}°C)`
        : `🌫️ High fog risk (T-Td = ${depression.toFixed(1)}°C)`
    );
    
    // Increase risk slightly for imminent fog
    baseRiskLevel = Math.max(baseRiskLevel, 2);
  }
}
```

**Korzyści**:
- Early warning dla mgły before it actually forms
- Bardziej proaktywne informacje

---

## 📊 Priorytet implementacji

### Implementować TERAZ (wysokie korzyści, niska złożoność):
1. ⭐⭐⭐ **Temperature-Enhanced FZFG Risk** - natychmiastowa poprawa realizmu dla FZFG
2. ⭐⭐⭐ **Crosswind Calculation** - konkretne informacje dla EPKK

### Implementować WKRÓTCE (średnie korzyści):
3. ⭐⭐ **RVR Integration** - wymaga testów z real METAR data
4. ⭐⭐ **PROB/TEMPO Overlap** - poprawa UX dla overlapping periods

### Nice to have (niski priorytet):
5. ⭐ **Dew Point Analysis** - dodatkowy early warning

---

## 🧪 Testowanie

Dla każdego ulepszenia:
1. Test z historical TAF/METAR z EPKK
2. Verify against actual airport operations
3. Check edge cases (missing data, extreme values)
4. Compare with official airport weather briefings

---

## 💡 Dodatkowe pomysły (na przyszłość)

### Windshear Detection
- Parse METAR for WS (windshear) codes
- Add extreme risk warnings

### Snow Accumulation Estimates
- Use snow_depth from Open-Meteo
- Estimate runway clearing time
- More precise de-icing duration estimates

### NOTAM Integration
- Runway closures
- Navaid outages
- Impact on approach procedures

### Historical Accuracy Tracking
- Log predictions vs actual conditions
- Adjust weights over time
- Machine learning for local patterns

