// src/lib/weather.ts

import type {
  WeatherData,
  TAFData,
  RiskAssessment,
  ForecastChange,
  WeatherResponse,
} from './types/weather';

// Import WEATHER_PHENOMENA as a value, not a type
import { WEATHER_PHENOMENA } from './types/weather';

type WeatherPhenomenonValue = typeof WEATHER_PHENOMENA[keyof typeof WEATHER_PHENOMENA];
type WeatherPhenomenon = keyof typeof WEATHER_PHENOMENA;

// CAT I approach minimums for EPKK with enhanced parameters
const MINIMUMS = {
  VISIBILITY: 550,    // meters
  CEILING: 200,       // feet
  RVR: 550,          // meters
  VERTICAL_VISIBILITY: 200,  // feet
  MAX_WIND: 30,      // knots
  CROSSWIND: 20      // knots
} as const;

// Add NO_FLY_PHENOMENA
const NO_FLY_PHENOMENA = new Set([
  '+TSRA', 'TSGR', '+SHSN', '+SN', 'FC', 'DS', 'SS'
]);

// Risk weights for different conditions tailored to Kraków's usual conditions
const RISK_WEIGHTS = {
  // Severe phenomena (immediate impact)
  PHENOMENA_SEVERE: {
    TS: 75,      // Decreased as less common in Kraków
    TSRA: 85,    // Decreased but still severe
    FZRA: 95,    // Increased due to EPKK winter operations
    FZDZ: 80,    // Increased due to impact on ground ops
    FZFG: 90,    // Increased due to river proximity
    FC: 100,     // Keep maximum (safety critical)
    SS: 40,      // Decreased (very rare in Poland)
    '+SN': 70,   // Increased for EPKK winter operations
    '+SHSN': 75  // Increased for EPKK winter operations
  },
  
  // Moderate phenomena (adjusted for local conditions)
  PHENOMENA_MODERATE: {
    SN: 50,     // Snow - increased due to impact on ground operations
    SG: 35,     // Snow grains - less severe than snow
    BR: 30,     // Mist - slightly increased
    FG: 70,     // Fog - significantly increased as it's a major factor
    RA: 15,     // Rain - reduced as it's generally manageable
    SHRA: 25,   // Shower rain
    GR: 80,     // Hail - increased due to potential aircraft damage
    GS: 45,     // Small hail - reduced as less damaging
    '+RA': 35  // Heavy rain
  },
  
  // Visibility weights (adjusted for EPKK CAT I)
  VISIBILITY: {
    BELOW_MINIMUM: 100,  // Automatic no-go
    VERY_LOW: 90,        // Increased from 80
    LOW: 60,             // Increased from 50
    MODERATE: 40         // Increased from 30
  },
  
  // Ceiling weights (adjusted for EPKK CAT I)
  CEILING: {
    BELOW_MINIMUM: 100,  // Automatic no-go
    VERY_LOW: 90,        // Increased from 80
    LOW: 60,             // Increased from 50
    MODERATE: 40         // Increased from 30
  },
  
  // Wind weights (adjusted based on typical aircraft limitations)
  WIND: {
    STRONG_GUSTS: 90,    // Gusts >= 35kt - reduced slightly as modern aircraft handle it
    STRONG: 60,          // >= 25kt - reduced
    MODERATE: 30         // >= 15kt - reduced as it's common
  }
} as const;

// Update the condition code map to include gusts
const CONDITION_CODE_MAP: Record<string, keyof typeof WEATHER_PHENOMENA> = {
  'light': 'RA', // Changed to valid code since '-' is not a valid value
  'heavy': 'RA', // Changed to valid code since '+' is not a valid value
  'rain': 'RA',
  'rain,': 'RA', 
  'snow': 'SN',
  'rain_snow': 'RASN',
  'shower': 'SH',
  'shower_snow': 'SHSN',
  'shower_rain': 'SHRA',
  'mist': 'BR',
  'fog': 'FG',
  'thunderstorm': 'TS',
  'drizzle': 'DZ',
  'freezing': 'FZ',
  'freezing_rain': 'FZRA',
  'freezing_drizzle': 'FZDZ',
  // Remove 'gusting' as it's handled separately in wind processing
};

// Add this helper function to combine weather condition codes
function combineWeatherCodes(conditions: string[]): string {
  let result = '';
  let intensity = '';
  
  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i].toLowerCase();
    
    // Handle intensity modifiers
    if (condition === 'light') {
      intensity = '-';
      continue;
    }
    if (condition === 'heavy') {
      intensity = '+';
      continue;
    }
    
    // Handle shower combinations
    if (condition === 'shower') {
      const nextCondition = conditions[i + 1]?.toLowerCase();
      if (nextCondition === 'snow') {
        result = 'SHSN';
        i++; // Skip the next word
      } else if (nextCondition === 'rain') {
        result = 'SHRA';
        i++; // Skip the next word
      }
      continue;
    }
    
    // Handle rain and snow combination
    if (condition === 'rain' && conditions[i + 1]?.toLowerCase() === 'snow') {
      result = 'RASN';
      i++; // Skip the next word
      continue;
    }
    
    // Handle basic conditions
    const mappedCode = CONDITION_CODE_MAP[condition];
    if (mappedCode) {
      result = mappedCode;
    }
  }
  
  // Combine intensity with the weather code
  return intensity + result;
}

// Add the weatherDescriptions object
const weatherDescriptions: Record<string, string> = {
  // Thunderstorm conditions
  TS: "⛈️ Thunderstorm",
  TSRA: "⛈️ Thunderstorm with Rain",
  
  // Freezing conditions
  FZRA: "🌧️❄️ Freezing Rain",
  FZDZ: "💧❄️ Freezing Drizzle",
  FZFG: "🌫️❄️ Freezing Fog",
  
  // Snow conditions
  SN: "🌨️ Snow",
  "-SN": "🌨️ Light Snow",
  "+SN": "🌨️ Heavy Snow",
  SHSN: "🌨️ Snow Showers",
  
  // Rain conditions
  RA: "🌧️ Rain",
  "-RA": "🌧️ Light Rain",
  "+RA": "🌧️ Heavy Rain",
  SHRA: "🌧️ Rain Showers",
  
  // Visibility conditions
  FG: "🌫️ Fog",
  BR: "🌫️ Mist",
  HZ: "🌫️ Haze",
  
  // Wind conditions
  "Strong wind gusts": "💨 Strong wind gusts",
  "Strong winds": "💨 Strong winds",
  "Moderate winds": "💨 Moderate winds",
  
  // Visibility descriptions
  "Very low visibility": "🌫️ Very low visibility",
  "Low visibility": "🌫️ Poor visibility",
  "Reduced visibility": "🌫️ Reduced visibility",
  
  // Ceiling descriptions
  "Very low ceiling": "☁️ Very low clouds",
  "Low ceiling": "☁️ Low clouds",
  "Moderate ceiling": "☁️ Moderate cloud base"
};

// Add de-icing conditions check
const DEICING_CONDITIONS = {
  TEMPERATURE: {
    BELOW_ZERO: 0,     // Celsius
    HIGH_RISK: -3,     // High risk of frost/ice formation
    SEVERE: -8         // Severe icing conditions
  },
  PHENOMENA: new Set([
    'FZRA', 'FZDZ',    // Freezing precipitation
    'SN', '+SN',       // Any snow
    'SHSN', '+SHSN',   // Snow showers
    'RASN',            // Rain and snow mix
    'FZFG'             // Freezing fog
  ])
} as const;

// Add a visibility trend tracker
let previousVisibilityReading: {
  visibility: number;
  timestamp: number;
} | null = null;

// Add operational impact assessment
function assessOperationalImpacts(weather: WeatherData): string[] {
  const impacts: string[] = [];
  const temp = weather.temperature?.celsius ?? 0;
  
  // De-icing assessment
  if (temp <= DEICING_CONDITIONS.TEMPERATURE.BELOW_ZERO) {
    if (temp <= DEICING_CONDITIONS.TEMPERATURE.SEVERE) {
      impacts.push("❄️ Mandatory de-icing, expect 30-45 min delay");
    } else if (temp <= DEICING_CONDITIONS.TEMPERATURE.HIGH_RISK) {
      impacts.push("❄️ Likely de-icing required, expect 20-30 min delay");
    } else {
      impacts.push("❄️ Possible de-icing, expect 15-20 min delay");
    }
  }

  // Check for precipitation requiring de-icing
  if (weather.conditions?.some(c => DEICING_CONDITIONS.PHENOMENA.has(c.code))) {
    impacts.push("🧊 Active precipitation requiring de-icing procedures");
  }

  // Ground operations impacts
  if (weather.conditions?.some(c => c.code === 'SN' || c.code === '+SN')) {
    impacts.push("🚜 Runway/taxiway snow clearing in progress");
  }

  // Low visibility procedures
  if (weather.visibility?.meters && weather.visibility.meters < 1500) {
    impacts.push("👁️ Low Visibility Procedures active - reduced airport capacity");
  }

  // Strong winds impact
  if (weather.wind?.speed_kts && weather.wind.speed_kts >= 20) {
    impacts.push("💨 Single runway operations possible - reduced capacity");
  }

  return impacts;
}

// Add time-based forecast analysis
function analyzeUpcomingConditions(forecast: ForecastChange[]): {
  isDeterioration: boolean;
  nextSignificantChange?: {
    time: Date;
    conditions: string[];
    riskLevel: number;
  };
} {
  const now = new Date();
  const next6Hours = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  
  // Filter for upcoming periods only
  const upcomingPeriods = forecast
    .filter(period => {
      const periodStart = new Date(period.from);
      const periodEnd = new Date(period.to);
      // Only include periods that haven't ended yet
      return periodEnd > now;
    })
    .sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime());

  if (upcomingPeriods.length === 0) {
    return { isDeterioration: false };
  }

  // Find the next significant change
  const nextChange = upcomingPeriods.find(period => {
    // Consider a period significant if:
    // 1. Risk level increases
    // 2. Has severe weather phenomena
    // 3. Visibility drops significantly
    // 4. Ceiling drops significantly
    return (
      period.riskLevel.level > 1 ||
      period.conditions.phenomena.some(p => p.includes("FG") || p.includes("FZRA") || p.includes("SN")) ||
      (period.visibility?.meters && period.visibility.meters < 1500) ||
      (period.ceiling?.feet && period.ceiling.feet < 500)
    );
  });

  if (!nextChange) {
    return { isDeterioration: false };
  }

  return {
    isDeterioration: true,
    nextSignificantChange: {
      time: new Date(nextChange.from),
      conditions: nextChange.conditions.phenomena,
      riskLevel: nextChange.riskLevel.level
    }
  };
}

// Add a function to filter forecast periods
function filterForecastPeriods(forecast: ForecastChange[]): ForecastChange[] {
  const now = new Date();
  
  return forecast
    .filter(period => {
      const periodEnd = new Date(period.to);
      // Only include periods that haven't ended yet
      return periodEnd > now;
    })
    .map(period => {
      // If period has started but not ended, adjust the start time to now
      const periodStart = new Date(period.from);
      if (periodStart < now) {
        return {
          ...period,
          from: now,
          timeDescription: formatTimeDescription(now, new Date(period.to))
        };
      }
      return period;
    });
}

// Update getAirportWeather to use filtered forecast
export async function getAirportWeather(): Promise<WeatherResponse | null> {
  try {
    const response = await fetch('/api/weather', {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('Weather data fetch failed');
    }

    const data = await response.json();
    console.log('=== Raw API Response ===');
    console.log('METAR:', JSON.stringify(data.metar, null, 2));
    console.log('TAF:', JSON.stringify(data.taf, null, 2));

    const { metar, taf } = data;

    const currentWeather: WeatherData = metar.data[0];
    const forecast: TAFData = taf.data[0];

    console.log('\n=== Processed Current Weather ===');
    console.log(JSON.stringify(currentWeather, null, 2));

    const currentAssessment = assessWeatherRisk(currentWeather);
    const allForecastPeriods = processForecast(forecast);
    
    // Filter out past periods
    const filteredForecast = filterForecastPeriods(allForecastPeriods);
    
    // Analyze only upcoming conditions
    const upcomingConditions = analyzeUpcomingConditions(filteredForecast);

    // Add deterioration warning if needed
    if (currentAssessment.level === 1 && upcomingConditions.isDeterioration && upcomingConditions.nextSignificantChange) {
      const warningTime = upcomingConditions.nextSignificantChange.time;
      // Only add warning if we have a valid time
      if (warningTime) {
        currentAssessment.warning = {
          message: `Weather conditions expected to deteriorate ${formatTimeDescription(warningTime, warningTime)}. ${
            upcomingConditions.nextSignificantChange.conditions.join(", ")
          }`,
          time: warningTime,
          severity: upcomingConditions.nextSignificantChange.riskLevel || 2
        };
      }
    }

    return {
      current: {
        riskLevel: currentAssessment,
        conditions: {
          phenomena: [
            // Weather phenomena
            ...((() => {
              const phenomena = currentWeather.conditions?.map(c => {
                console.log('Processing current weather code:', {
                  code: c.code,
                  fullCode: c,
                  mappedPhenomenon: WEATHER_PHENOMENA[c.code as WeatherPhenomenon]
                });
                return WEATHER_PHENOMENA[c.code as WeatherPhenomenon];
              }).filter((p): p is WeatherPhenomenonValue => p !== undefined) || [];
              console.log('Current weather phenomena:', phenomena);
              return phenomena;
            })()),
            // Wind with severity-based description
            ...((() => {
              const windDesc = currentWeather.wind ? [
                currentWeather.wind.gust_kts && currentWeather.wind.gust_kts >= 35 ? "💨 Strong gusts" :
                currentWeather.wind.gust_kts && currentWeather.wind.gust_kts >= 25 || currentWeather.wind.speed_kts >= 25 ? "💨 Strong winds" :
                currentWeather.wind.speed_kts >= 15 ? "💨 Moderate winds" :
                null
              ].filter((p): p is string => p !== null) : [];
              console.log('Current wind phenomena:', windDesc);
              return windDesc;
            })()),
            // Visibility
            ...((() => {
              const visDesc = currentWeather.visibility?.meters && currentWeather.visibility.meters < 3000 ? 
                [`👁️ Visibility ${currentWeather.visibility.meters}m${currentWeather.visibility.meters < MINIMUMS.VISIBILITY ? ' (below minimums)' : ''}`] : 
                [];
              console.log('Current visibility phenomena:', visDesc);
              return visDesc;
            })()),
            // Ceiling
            ...((() => {
              const ceilingDesc = currentWeather.ceiling?.feet && currentWeather.ceiling.feet < 1000 ? 
                [`☁️ Ceiling ${currentWeather.ceiling.feet}ft${currentWeather.ceiling.feet < MINIMUMS.CEILING ? ' (below minimums)' : ''}`] : 
                [];
              console.log('Current ceiling phenomena:', ceilingDesc);
              return ceilingDesc;
            })()),
            // Add visibility trend if significant
            ...(previousVisibilityReading && currentWeather.visibility?.meters 
              ? [getVisibilityTrendDescription(
                  currentWeather.visibility.meters, 
                  previousVisibilityReading.visibility
                )]
              : []
            )
          ]
        },
        raw: currentWeather.raw_text,
        observed: currentWeather.observed
      },
      forecast: filteredForecast,  // Use filtered forecast
      raw_taf: forecast.raw_text
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    return null;
  }
}

function processForecast(taf: TAFData | null): ForecastChange[] {
  if (!taf || !taf.forecast) {
    console.log('No TAF data to process');
    return [];
  }

  console.log('Processing full TAF:', taf.raw_text);
  const changes: ForecastChange[] = [];

  taf.forecast.forEach((period, index) => {
    if (period.timestamp) {
      const periodTime = formatTimeDescription(new Date(period.timestamp.from), new Date(period.timestamp.to));
      
      console.log(`\n=== Processing Period ${index + 1}: ${periodTime} ===`);
      console.log('Raw period data:', {
        from: period.timestamp.from,
        to: period.timestamp.to,
        wind: period.wind,
        change: period.change,
        conditions: period.conditions,
        visibility: period.visibility,
        ceiling: period.ceiling,
        raw_text: period.raw_text
      });

      const periodStart = new Date(period.timestamp.from);
      const periodEnd = new Date(period.timestamp.to);
      
      const timeDescription = formatTimeDescription(periodStart, periodEnd);
      const assessment = assessWeatherRisk(period);
      
      // Process weather phenomena first
      const weatherPhenomena = period.conditions?.map(c => {
        if (c.code === 'NSW' as WeatherPhenomenon) return undefined;
        
        // First try to find combined phenomena
        if (period.conditions && period.conditions.length > 1) {
          const combinedCode = period.conditions
            .map(cond => cond.code)
            .sort()
            .join(' ') as WeatherPhenomenon;
          
          const combinedPhenomenon = WEATHER_PHENOMENA[combinedCode];
          if (combinedPhenomenon) {
            return combinedPhenomenon;
          }
        }
        
        // If no combined match, try individual code
        return WEATHER_PHENOMENA[c.code as WeatherPhenomenon];
      }).filter((p): p is WeatherPhenomenonValue => p !== undefined) || [];
      console.log('Weather phenomena:', weatherPhenomena);

      // Process wind separately
      const windPhenomena = period.wind ? [
        // Only show one wind description based on severity
        period.wind.gust_kts && period.wind.gust_kts >= 35 ? "💨 Strong gusts" :
        period.wind.gust_kts && period.wind.gust_kts >= 25 || period.wind.speed_kts >= 25 ? "💨 Strong winds" :
        period.wind.speed_kts >= 15 ? "💨 Moderate winds" :
        null
      ].filter(Boolean) : [];
      console.log('Wind phenomena:', windPhenomena);

      // Process visibility
      const visibilityPhenomena = period.visibility?.meters ? [
        period.visibility.meters < MINIMUMS.VISIBILITY ? "👁️ Visibility below minimums" :
        period.visibility.meters < 1000 ? "👁️ Very poor visibility" :
        period.visibility.meters < 1500 ? "👁️ Poor visibility" :
        []
      ].filter(Boolean) : [];
      console.log('Visibility phenomena:', visibilityPhenomena);

      // Process ceiling
      const ceilingPhenomena = period.ceiling?.feet ? [
        period.ceiling.feet < MINIMUMS.CEILING ? "☁️ Ceiling below minimums" :
        period.ceiling.feet < 300 ? "☁️ Very low ceiling" :
        period.ceiling.feet < 500 ? "☁️ Low ceiling" :
        []
      ].filter(Boolean) : [];
      console.log('Ceiling phenomena:', ceilingPhenomena);

      // Combine all phenomena
      const allPhenomena = [
        ...weatherPhenomena,
        ...windPhenomena,
        ...visibilityPhenomena,
        ...ceilingPhenomena
      ];

      console.log('Final phenomena for period:', allPhenomena);

      changes.push({
        timeDescription,
        from: periodStart,
        to: periodEnd,
        conditions: {
          phenomena: allPhenomena.filter((p): p is string => p !== null && !Array.isArray(p))
        },
        riskLevel: assessment,
        changeType: period.change?.indicator?.code || 'PERSISTENT',
        visibility: period.visibility,
        ceiling: period.ceiling,
        isTemporary: period.change?.indicator?.code === 'TEMPO',
        probability: period.change?.probability
      });
    }
  });

  console.log('\nFinal changes array:', changes.map(c => ({
    time: c.timeDescription,
    isTemporary: c.isTemporary,
    phenomena: c.conditions.phenomena
  })));

  return changes;
}

function formatTimeDescription(start: Date, end: Date): string {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Warsaw'
    });
  };

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const startTime = formatTime(start);
  const endTime = formatTime(end);

  // Same day
  if (start.getDate() === end.getDate()) {
    const prefix = start.getDate() === today.getDate() ? 'Today' : 'Tomorrow';
    return `${prefix} ${startTime} - ${endTime}`;
  }
  
  // Crosses midnight
  const startPrefix = start.getDate() === today.getDate() ? 'Today' : 'Tomorrow';
  const endPrefix = end.getDate() === tomorrow.getDate() ? 'Tomorrow' : 'Next day';
  return `${startPrefix} ${startTime} - ${endPrefix} ${endTime}`;
}

function calculateRiskScore(weather: WeatherData, isEPKK: boolean = true): { score: number; reasons: string[] } {
  let totalScore = 0;
  const reasons: string[] = [];
  
  // Get current hour and month for time-based adjustments
  const date = new Date(weather.observed);
  const hour = date.getHours();
  const month = date.getMonth();

  // Check visibility with trend analysis
  if (weather.visibility?.meters) {
    const currentTime = new Date(weather.observed).getTime();
    
    // Check for rapid visibility changes (within last 30 minutes)
    if (previousVisibilityReading && 
        (currentTime - previousVisibilityReading.timestamp) <= 30 * 60 * 1000) {
      
      const visibilityChange = Math.abs(weather.visibility.meters - previousVisibilityReading.visibility);
      const changeRate = visibilityChange / ((currentTime - previousVisibilityReading.timestamp) / (60 * 1000)); // meters per minute
      
      if (changeRate > 50) { // More than 50 meters per minute
        totalScore += 30;
        reasons.push("🌫️ Rapidly changing visibility conditions");
        
        if (weather.visibility.meters < previousVisibilityReading.visibility) {
          reasons[reasons.length - 1] += " (deteriorating)";
        } else {
          reasons[reasons.length - 1] += " (improving)";
        }
      }
    }
    
    // Update previous visibility reading
    previousVisibilityReading = {
      visibility: weather.visibility.meters,
      timestamp: currentTime
    };

    // Regular visibility checks continue as before...
    if (weather.visibility.meters < MINIMUMS.VISIBILITY) {
      totalScore += RISK_WEIGHTS.VISIBILITY.BELOW_MINIMUM;
      reasons.push("Visibility below CAT I landing minimums");
    } else if (weather.visibility.meters < 800) {
      totalScore += RISK_WEIGHTS.VISIBILITY.VERY_LOW;
      reasons.push("Very low visibility - approach may be challenging");
    } else if (weather.visibility.meters < 1200) {
      totalScore += RISK_WEIGHTS.VISIBILITY.LOW;
      reasons.push("Reduced visibility conditions");
    } else if (weather.visibility.meters < 3000) {
      totalScore += RISK_WEIGHTS.VISIBILITY.MODERATE;
      reasons.push("Moderate visibility conditions");
    }

    // Apply seasonal adjustment (October-February)
    if (month >= 9 || month <= 1) {
      totalScore *= 1.2; // 20% increase during fog-prone months
      reasons.push("Increased risk due to seasonal conditions");
    }

    // Apply time-of-day adjustment
    if (hour >= 3 && hour <= 7) {
      totalScore *= 1.3; // 30% increase during fog-prone hours
      reasons.push("Early morning visibility risk");
    }
  }

  // Check ceiling with enhanced EPKK considerations
  if (weather.ceiling?.feet) {
    if (weather.ceiling.feet < MINIMUMS.CEILING) {
      totalScore += RISK_WEIGHTS.CEILING.BELOW_MINIMUM;
      reasons.push("Ceiling below CAT I minimums");
    } else if (weather.ceiling.feet < 300) {
      totalScore += RISK_WEIGHTS.CEILING.VERY_LOW;
      reasons.push("Very low ceiling - approach challenging");
    } else if (weather.ceiling.feet < 500) {
      totalScore += RISK_WEIGHTS.CEILING.LOW;
      reasons.push("Low ceiling conditions");
    }
  }

  // Enhanced wind assessment for EPKK
  if (weather.wind?.speed_kts) {
    if (weather.wind.speed_kts > MINIMUMS.MAX_WIND) {
      totalScore += 100; // Automatic high risk
      reasons.push("Wind exceeds maximum limits");
    } else if (weather.wind.gust_kts && weather.wind.gust_kts >= 35) {
      totalScore += 90;
      reasons.push("Strong wind gusts");
    } else if (weather.wind.speed_kts >= 25) {
      totalScore += 70;
      reasons.push("Strong winds");
    }
  }

  // Check weather phenomena with EPKK-specific weights
  if (weather.conditions) {
    for (const condition of weather.conditions) {
      if (condition.code in RISK_WEIGHTS.PHENOMENA_SEVERE) {
        totalScore += RISK_WEIGHTS.PHENOMENA_SEVERE[condition.code as keyof typeof RISK_WEIGHTS.PHENOMENA_SEVERE];
        reasons.push(WEATHER_PHENOMENA[condition.code]);
      }
    }
  }

  return { score: totalScore, reasons };
}

function assessWeatherRisk(weather: WeatherData): RiskAssessment {
  const { score, reasons } = calculateRiskScore(weather, true);
  const operationalImpacts = assessOperationalImpacts(weather);
  
  const getWeatherDescription = (reasonList: string[], impacts: string[]): string => {
    if (!reasonList.length && !impacts.length) {
      return "☀️ Clear skies and good visibility";
    }
    
    // Combine weather reasons with operational impacts
    const allImpacts = [...impacts];
    if (reasonList.length > 0) {
      const primaryReason = reasonList[0];
      const description = Object.entries(weatherDescriptions).find(
        ([condition]) => primaryReason.includes(condition)
      );
      if (description) {
        allImpacts.unshift(description[1]);
      }
    }
    
    return allImpacts.join(" • ");
  };

  if (score >= 999) {
    return {
      level: 4,
      title: "Airport Operations Suspended",
      message: "Weather conditions are beyond safe operating limits. Contact your airline for flight status.",
      explanation: getWeatherDescription(reasons, operationalImpacts),
      color: "red",
      operationalImpacts
    };
  }
  else if (score >= 160) {
    return {
      level: 3,
      title: "Major Weather Impact",
      message: "Significant disruptions likely. Check flight status with your airline immediately.",
      explanation: getWeatherDescription(reasons, operationalImpacts),
      color: "red",
      operationalImpacts
    };
  }
  else if (score >= 100) {
    return {
      level: 3,
      title: "Weather Advisory",
      message: "Delays and changes likely. Monitor flight status closely.",
      explanation: getWeatherDescription(reasons, operationalImpacts),
      color: "red",
      operationalImpacts
    };
  }
  else if (score > 50) {
    return {
      level: 2,
      title: "Minor Weather Impact",
      message: "Some delays possible. Check flight status before leaving.",
      explanation: getWeatherDescription(reasons, operationalImpacts),
      color: "orange",
      operationalImpacts
    };
  }
  else {
    return {
      level: 1,
      title: "Good Flying Conditions",
      message: "Weather conditions are favorable for normal operations.",
      explanation: getWeatherDescription(reasons, operationalImpacts),
      color: "green",
      operationalImpacts
    };
  }
}

// Helper function to describe visibility trends
function getVisibilityTrendDescription(current: number, previous: number): string {
  const change = current - previous;
  const percentChange = Math.abs(change / previous * 100);
  
  if (percentChange < 10) return ''; // No significant change
  
  if (change < 0) {
    return '📉 Visibility decreasing';
  } else {
    return '📈 Visibility improving';
  }
}