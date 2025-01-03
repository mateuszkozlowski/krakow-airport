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

// CAT I approach minimums for EPKK
const MINIMUMS = {
  VISIBILITY: 550,   // meters
  CEILING: 200     // feet
} as const;

// Risk weights for different conditions tailored to Kraków's usual conditions
const RISK_WEIGHTS = {
  // Severe phenomena (immediate impact)
  PHENOMENA_SEVERE: {
    TS: 80,     // Thunderstorm - reduced from 100 as modern aircraft can handle them better
    TSRA: 85,   // Thunderstorm with rain - slightly higher due to combined effect
    FZRA: 90,   // Freezing rain - increased as it's more dangerous than thunderstorms
    FZDZ: 70,   // Freezing drizzle
    FZFG: 80,   // Freezing fog - increased due to impact on ground operations
    FC: 100,    // Funnel cloud - kept at maximum (tornado risk)
    SS: 60      // Sandstorm - lowered as it's rare and less severe in Poland
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
    '+RA': 35,  // Heavy rain
    '+SN': 60   // Heavy snow - increased due to ground operations impact
  },
  
  // Visibility weights (adjusted for operational reality)
  VISIBILITY: {
    BELOW_MINIMUM: 100,  // Below landing minimum - automatic no-go
    VERY_LOW: 80,        // Below 1000m - increased as it's critical
    LOW: 50,             // Below 1500m
    MODERATE: 30         // Below 3000m - increased as it affects operations
  },
  
  // Ceiling weights (adjusted for operational reality)
  CEILING: {
    BELOW_MINIMUM: 100,  // Below landing minimum - automatic no-go
    VERY_LOW: 80,        // Below 300ft - increased as it's critical
    LOW: 50,             // Below 500ft - increased
    MODERATE: 30         // Below 1000ft - increased
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
    const { metar, taf } = data;

    const currentWeather: WeatherData = metar.data[0];
    const forecast: TAFData = taf.data[0];

    const currentAssessment = assessWeatherRisk(currentWeather);
    const forecastPeriods = processForecast(forecast);

    return {
      current: {
        riskLevel: currentAssessment,
        conditions: {
          phenomena: [
            // Weather phenomena
            ...(currentWeather.conditions?.map(c => 
              WEATHER_PHENOMENA[c.code as WeatherPhenomenon]
            ).filter((p): p is WeatherPhenomenonValue => p !== undefined) || []),
            // Wind with severity-based description
            ...(currentWeather.wind ? [
              currentWeather.wind.gust_kts && currentWeather.wind.gust_kts >= 35 ? "💨 Strong gusts" :
              currentWeather.wind.gust_kts && currentWeather.wind.gust_kts >= 25 || currentWeather.wind.speed_kts >= 25 ? "💨 Strong winds" :
              currentWeather.wind.speed_kts >= 15 ? "💨 Moderate winds" :
              null
            ].filter((p): p is string => p !== null) : []),
            // Visibility
            ...(currentWeather.visibility?.meters && currentWeather.visibility.meters < 3000 ? 
              [`👁️ Visibility ${currentWeather.visibility.meters}m${currentWeather.visibility.meters < MINIMUMS.VISIBILITY ? ' (below minimums)' : ''}`] : 
              []),
            // Ceiling
            ...(currentWeather.ceiling?.feet && currentWeather.ceiling.feet < 1000 ? 
              [`☁️ Ceiling ${currentWeather.ceiling.feet}ft${currentWeather.ceiling.feet < MINIMUMS.CEILING ? ' (below minimums)' : ''}`] : 
              [])
          ]
        },
        raw: currentWeather.raw_text,
        observed: currentWeather.observed
      },
      forecast: forecastPeriods,
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

function calculateRiskScore(weather: WeatherData): { score: number; reasons: string[] } {
  let totalScore = 0;
  const reasons: string[] = [];
  
  // Check visibility
  if (weather.visibility?.meters) {
    if (weather.visibility.meters < MINIMUMS.VISIBILITY) {
      totalScore += RISK_WEIGHTS.VISIBILITY.BELOW_MINIMUM;
      reasons.push("Visibility below landing minimums");
    } else if (weather.visibility.meters < 1000) {
      totalScore += RISK_WEIGHTS.VISIBILITY.VERY_LOW;
      reasons.push("Very low visibility");
    } else if (weather.visibility.meters < 1500) {
      totalScore += RISK_WEIGHTS.VISIBILITY.LOW;
      reasons.push("Low visibility");
    } else if (weather.visibility.meters < 3000) {
      totalScore += RISK_WEIGHTS.VISIBILITY.MODERATE;
      reasons.push("Reduced visibility");
    }
  }

  // Check ceiling
  if (weather.ceiling?.feet) {
    if (weather.ceiling.feet < MINIMUMS.CEILING) {
      totalScore += RISK_WEIGHTS.CEILING.BELOW_MINIMUM;
      reasons.push("Ceiling below landing minimums");
    } else if (weather.ceiling.feet < 300) {
      totalScore += RISK_WEIGHTS.CEILING.VERY_LOW;
      reasons.push("Very low ceiling");
    } else if (weather.ceiling.feet < 500) {
      totalScore += RISK_WEIGHTS.CEILING.LOW;
      reasons.push("Low ceiling");
    } else if (weather.ceiling.feet < 1000) {
      totalScore += RISK_WEIGHTS.CEILING.MODERATE;
      reasons.push("Moderate ceiling");
    }
  }

  // Check winds
  if (weather.wind?.speed_kts) {
    if (weather.wind.gust_kts && weather.wind.gust_kts >= 35) {
      totalScore += RISK_WEIGHTS.WIND.STRONG_GUSTS;
      reasons.push(`💨 Strong gusts`);
    } else if (weather.wind.speed_kts >= 25 || (weather.wind.gust_kts && weather.wind.gust_kts >= 25)) {
      totalScore += RISK_WEIGHTS.WIND.STRONG;
      reasons.push(`💨 Strong winds`);
    } else if (weather.wind.speed_kts >= 15) {
      totalScore += RISK_WEIGHTS.WIND.MODERATE;
      reasons.push(`💨 Moderate winds`);
    }
  }

  // Check weather phenomena
  if (weather.conditions) {
    for (const condition of weather.conditions) {
      if (condition.code in RISK_WEIGHTS.PHENOMENA_SEVERE) {
        totalScore += RISK_WEIGHTS.PHENOMENA_SEVERE[condition.code as keyof typeof RISK_WEIGHTS.PHENOMENA_SEVERE];
        reasons.push(WEATHER_PHENOMENA[condition.code]);
      }
      else if (condition.code in RISK_WEIGHTS.PHENOMENA_MODERATE) {
        totalScore += RISK_WEIGHTS.PHENOMENA_MODERATE[condition.code as keyof typeof RISK_WEIGHTS.PHENOMENA_MODERATE];
        reasons.push(WEATHER_PHENOMENA[condition.code]);
      }
    }
  }

  return { score: totalScore, reasons };
}

function assessWeatherRisk(weather: WeatherData): RiskAssessment {
  const { score, reasons } = calculateRiskScore(weather);
  
// Map weather conditions to friendly descriptions with emojis
  const weatherDescriptions = {
    // Thunderstorm conditions
    TS: "⛈️ Thunderstorm",
    TSRA: "⛈️ Thunderstorm with Rain",
    
    // Freezing conditions
    FZRA: "🌧️❄️ Freezing Rain",
    FZDZ: "💧❄️ Freezing Drizzle",
    FZFG: "🌫️❄️ Freezing Fog",
    
    // Snow conditions with intensity
    SN: "🌨️ Snow",
    "-SN": "🌨️ Light Snow",
    "+SN": "🌨️ Heavy Snow",
    SHSN: "🌨️ Snow Showers",
    "-SHSN": "🌨️ Light Snow Showers",
    "+SHSN": "🌨️ Heavy Snow Showers",
    
    // Rain conditions with intensity
    RA: "🌧️ Rain",
    "-RA": "🌧️ Light Rain",
    "+RA": "🌧️ Heavy Rain",
    SHRA: "🌧️ Rain Showers",
    "-SHRA": "🌧️ Light Rain Showers",
    "+SHRA": "🌧️ Heavy Rain Showers",
    
    // Mixed precipitation
    RASN: "🌨️ Rain and Snow",
    "-RASN": "🌨️ Light Rain and Snow",
    "+RASN": "🌨️ Heavy Rain and Snow",
    
    // Other precipitation types
    GR: "🌨️ Hail",
    GS: "🌨️ Small Hail",
    SG: "🌨️ Snow Grains",
    DZ: "💧 Drizzle",
    "-DZ": "💧 Light Drizzle",
    "+DZ": "💧 Heavy Drizzle",
    
    // Visibility conditions
    FG: "🌫️ Fog",
    BR: "🌫️ Mist",
    HZ: "🌫️ Haze",
    
    // Severe conditions
    FC: "🌪️ Funnel Cloud",
    SS: "🏜️ Sandstorm",
    
    // Cloud coverage
    SCT: "⛅ Scattered Clouds",
    BKN: "☁️ Broken Clouds",
    OVC: "☁️ Overcast",
    
    // Wind conditions (these are derived, not METAR codes)
    "Strong wind gusts": "💨 Strong wind gusts (≥35kt)",
    "Strong winds": "💨 Strong winds (≥25kt)",
    "Moderate winds": "💨 Moderate winds",
    
    // Visibility conditions (these are derived, not METAR codes)
    "Very low visibility": "🌫️ Very low visibility",
    "Low visibility": "🌫️ Poor visibility",
    "Reduced visibility": "🌫️ Reduced visibility",
    
    // Ceiling conditions (these are derived, not METAR codes)
    "Very low ceiling": "☁️ Very low clouds",
    "Low ceiling": "☁️ Low clouds",
    "Moderate ceiling": "☁️ Moderate cloud base"
  };

const getWeatherDescription = (reasonList: string[]): string => {
    if (!reasonList.length) return "☀️ Perfect weather";
    
    const primaryReason = reasonList[0];
    for (const [condition, description] of Object.entries(weatherDescriptions)) {
      if (primaryReason.includes(condition)) {
        return description;
      }
    }
    return "⚠️ Poor weather";
  };

  if (score >= 120) {
    return {
      level: 3,
      title: "Extremely high risk of disruptions",
      message: "Contact your airline",
      explanation: getWeatherDescription(reasons),
      color: "red"
    };
  }
  else if (score >= 70) {
    return {
      level: 3,
      title: "High risk of disruptions",
      message: "Check your flight status urgently with your airline or at the airport",
      explanation: getWeatherDescription(reasons),
      color: "red"
    };
  }
  else if (score >= 40) {
    return {
      level: 2,
      title: "Some delays possible",
      message: "It is recommended to check flight status with your airline or at the airport",
      explanation: getWeatherDescription(reasons),
      color: "orange"
    };
  }
  else {
    return {
      level: 1,
      title: "No disruptions expected",
      message: "Current weather is good for flying.",
      explanation: getWeatherDescription(reasons),
      color: "green"
    };
  }
}