// src/lib/weather.ts

import type {
  WeatherData,
  TAFData,
  RiskAssessment,
  ForecastChange,
  WeatherResponse,
  OpenMeteoForecast,
  RiskLevel,
  OpenMeteoResponse,
} from './types/weather';

// Import WEATHER_PHENOMENA, WEATHER_PHENOMENA_TRANSLATIONS i WMO_WEATHER_CODES jako wartości
import { 
  WEATHER_PHENOMENA, 
  WEATHER_PHENOMENA_TRANSLATIONS,
  WMO_WEATHER_CODES 
} from './types/weather';
import { adjustToWarsawTime } from '@/lib/utils/time';
import { translations } from '@/lib/translations';
import { useLanguage } from '@/contexts/LanguageContext';
import { redis, validateRedisConnection } from '@/lib/cache';
import { postWeatherAlert, postAlertDismissal } from './twitter';

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

// EPKK runway configuration for crosswind calculations
const EPKK_RUNWAYS = {
  '07': { heading: 69, opposite: '25' },
  '25': { heading: 249, opposite: '07' }
} as const;

// Add a constant for "close to minimums" threshold
const NEAR_MINIMUMS = {
  CEILING: MINIMUMS.CEILING * 1.5, // 300ft for CAT I minimums of 200ft
  VISIBILITY: MINIMUMS.VISIBILITY * 1.5 // 825m for CAT I minimums of 550m
} as const;

// Risk weights for different conditions tailored to Kraków's usual conditions
const RISK_WEIGHTS = {
  // Severe phenomena
  PHENOMENA_SEVERE: {
    TS: 90,      
    TSRA: 95,    
    FZRA: 100,   
    FZDZ: 90,    
    FZFG: 100,   // Increased from 95 to 100 - freezing fog is extremely dangerous
    FC: 100,     
    '+SN': 85,   
    '+SHSN': 90, 
    'SHSN': 80   
  },
  
  // Moderate phenomena
  PHENOMENA_MODERATE: {
    SN: 70,     
    BR: 60,     // Increased from 50 to 60 - mist is more significant
    FG: 85,     
    RA: 30,     
    SHRA: 40,   
    GR: 90,     
    GS: 60,     
    '+RA': 50   
  },
  
  // De-icing risk based on temperature and conditions
  DEICING: {
    TEMPERATURE_THRESHOLDS: {
      BELOW_ZERO: 3,    // Risk starts at +3°C
      HIGH_RISK: 0,     // Higher risk at 0°C
      SEVERE: -5        // Severe conditions below -5°C
    },
    BASE_SCORES: {
      POSSIBLE: 20,     // Basic de-icing risk
      LIKELY: 40,       // Higher probability
      CERTAIN: 60       // Guaranteed de-icing need
    }
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
  console.log('Combining weather codes:', conditions);
  let result = '';
  let intensity = '';
  
  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i].toLowerCase();
    console.log('Processing condition:', condition);
    
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
  const finalResult = intensity + result;
  console.log('Combined result:', finalResult);
  return finalResult;
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
    BELOW_ZERO: 3,      // Temperature threshold in Celsius
    HIGH_RISK: 0,       // High risk threshold
    SEVERE: -5         // Severe conditions threshold
  },
  PHENOMENA: new Set([
    'FZRA',    // Freezing rain
    'FZDZ',    // Freezing drizzle
    'FZFG',    // Freezing fog
    '+SN',     // Heavy snow
    '+SHSN',   // Heavy snow showers
    'SN',      // Snow
    'SHSN',    // Snow showers
    '-SN',     // Light snow
    '-SHSN'    // Light snow showers
  ])
} as const;

// Add a visibility trend tracker
const previousVisibilityReading: {
  visibility: number;
  timestamp: number;
} | null = null;

// Add operational impact assessment
async function assessOperationalImpacts(weather: WeatherData, language: 'en' | 'pl'): Promise<string[]> {
  const t = translations[language].operationalImpactMessages;
  const impacts: string[] = [];
  
  // Update snow tracking based on current weather (METAR) - this is the only place where snow state is updated
  // Other functions (like calculateWeatherPhenomenaRisk) only READ the state, not update it
  await updateSnowTracking(weather.conditions);
  
  // Ground operations impacts for snow conditions with duration consideration
  const snowInfo = await getSnowDurationInfo();
  if (snowInfo.duration > 0) {
    const duration = snowInfo.duration;
    
    if (weather.conditions?.some(c => ['+SN', '+SHSN'].includes(c.code))) {
      impacts.push(t.runwayClearing);
      impacts.push(t.deicingDelay);
      impacts.push(t.reducedCapacity);
      
      if (duration >= SNOW_DURATION.THRESHOLDS.PROLONGED) {
      impacts.push(t.prolongedSnowOperations);
      }
    } else if (weather.conditions?.some(c => ['SN', 'SHSN'].includes(c.code))) {
      impacts.push(t.runwayClearing);
      impacts.push(t.likelyDeicing);
      impacts.push(t.reducedCapacity);
      
      if (duration >= SNOW_DURATION.THRESHOLDS.EXTENDED) {
      impacts.push(t.extendedSnowOperations);
      }
    } else if (weather.conditions?.some(c => ['-SN', '-SHSN'].includes(c.code))) {
      // For light snow, only add minimal impacts
      impacts.push(t.possibleDeicing);
      // Don't add reduced capacity for light snow - airport can handle it
    }
  }

  // Low visibility procedures
  if (weather.visibility?.meters && weather.visibility.meters < 1500) {
    impacts.push(t.reducedCapacity);
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
  const now = adjustToWarsawTime(new Date());
  const MINIMUM_DURATION = 5 * 60 * 1000;
  
  const upcomingPeriods = forecast
    .filter(period => {
      const periodEnd = adjustToWarsawTime(period.to);
      const periodStart = adjustToWarsawTime(period.from);
      
      return periodStart < periodEnd && 
             periodEnd.getTime() - now.getTime() > MINIMUM_DURATION &&
             periodStart.getTime() > now.getTime();
    })
    .sort((a, b) => adjustToWarsawTime(a.from).getTime() - adjustToWarsawTime(b.from).getTime());

  if (upcomingPeriods.length === 0) {
    return { isDeterioration: false };
  }

  // Find the next significant change
  const nextChange = upcomingPeriods.find(period => {
    // Consider a period significant if:
    // 1. Has severe weather phenomena
    // 2. Visibility below or near minimums
    // 3. Ceiling below or near minimums
    return (
      period.conditions.phenomena.some(p => 
        p.includes("⛈️") || // Thunderstorm
        p.includes("❄️") || // Freezing conditions
        p.includes("🌨️") || // Snow
        p.includes("👁️ Visibility Below Minimums") // Poor visibility
      ) ||
      (period.visibility?.meters && period.visibility.meters < NEAR_MINIMUMS.VISIBILITY) ||
      (period.ceiling?.feet && period.ceiling.feet < NEAR_MINIMUMS.CEILING)
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
function filterForecastPeriods(forecast: ForecastChange[], language: 'en' | 'pl'): ForecastChange[] {
  const now = new Date();
  const MINIMUM_DURATION = 5 * 60 * 1000; // 5 minutes
  
  // First, combine any overlapping periods that have the same conditions
  const combinedForecast = forecast.reduce((acc, period) => {
    const lastPeriod = acc[acc.length - 1];
    
    if (lastPeriod && 
        period.from <= lastPeriod.to && 
        JSON.stringify(period.conditions) === JSON.stringify(lastPeriod.conditions)) {
      lastPeriod.to = period.to;
      return acc;
    }
    
    acc.push(period);
    return acc;
  }, [] as ForecastChange[]);
  
  return combinedForecast
    .filter(period => {
      const periodEnd = period.to;
      const periodStart = period.from;
      
      // Remove any period that:
      // 1. Has already ended
      // 2. Is too short
      // 3. Is a current period with no phenomena
      if (periodStart < now) {
        return periodEnd.getTime() - now.getTime() > MINIMUM_DURATION &&
               (period.conditions.phenomena.length > 0 || period.isTemporary);
      }
      return periodStart < periodEnd;
    })
    .map(period => {
      const periodStart = period.from;
      if (periodStart < now) {
        return {
          ...period,
          from: now,
          timeDescription: formatTimeDescription(now, period.to, language)
        };
      }
      return period;
    });
}

// Add this function to fetch Open-Meteo data
async function fetchOpenMeteoForecast(): Promise<OpenMeteoForecast | null> {
  try {
    const response = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=50.07778&longitude=19.78472&hourly=temperature_2m,dew_point_2m,precipitation_probability,precipitation,rain,showers,snowfall,snow_depth,weather_code,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kn&forecast_days=2'
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Open-Meteo data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching Open-Meteo data:', error);
    return null;
  }
}

interface HourlyCondition {
    visibility: number;
    weatherCode: number;
    precipProb: number;
    windSpeed: number;
    windGusts: number;
    rain: number;
    snow: number;
    trend?: 'improving' | 'deteriorating' | 'stable';
}

type WeightValue = 0.9 | 0.85 | 0.8 | 0.7 | 0.5 | 0.4 | 0.3;

interface SourceWeights {
  TAF_PRIORITY: {
    TS: WeightValue;
    TSRA: WeightValue;
    FC: WeightValue;
    FZRA: WeightValue;
    FZDZ: WeightValue;
    FZFG: WeightValue;
    FG: WeightValue;
    MIFG: WeightValue;
    BR: WeightValue;
    ceiling: WeightValue;
    default: WeightValue;
  };
  OPENMETEO_PRIORITY: {
    temperature: WeightValue;
    precipitation: WeightValue;
    wind_speed: WeightValue;
    wind_gusts: WeightValue;
    default: WeightValue;
  };
  UPDATE_INTERVALS: {
    TAF: number;
    OPENMETEO: number;
  };
}

const SOURCE_WEIGHTS: SourceWeights = {
  // TAF has higher priority for these conditions
  TAF_PRIORITY: {
    // Thunderstorms and severe conditions
    TS: 0.9,    // Thunderstorms
    TSRA: 0.9,  // Thunderstorms with rain
    FC: 0.9,    // Funnel cloud
    
    // Freezing conditions
    FZRA: 0.9,  // Freezing rain
    FZDZ: 0.9,  // Freezing drizzle
    FZFG: 0.9,  // Freezing fog
    
    // Visibility phenomena
    FG: 0.85,   // Fog
    MIFG: 0.85, // Shallow fog
    BR: 0.8,    // Mist
    
    // Ceiling
    ceiling: 0.85,
    
    // Default weight for other TAF phenomena
    default: 0.7
  },
  
  // OpenMeteo has higher priority for these conditions
  OPENMETEO_PRIORITY: {
    temperature: 0.5,     // Temperature predictions
    precipitation: 0.4,   // Rain/snow amount
    wind_speed: 0.4,      // Wind speed
    wind_gusts: 0.4,      // Wind gusts
    default: 0.3         // Default weight for other conditions
  },

  // Update intervals in milliseconds
  UPDATE_INTERVALS: {
    TAF: 3.5 * 60 * 60 * 1000,  // 3.5 hours
    OPENMETEO: 60 * 60 * 1000    // 1 hour
  }
};

// Update the combine forecasts function
function combineForecasts(tafForecast: ForecastChange[], openMeteoData: OpenMeteoForecast, language: 'en' | 'pl'): ForecastChange[] {
  // First, process OpenMeteo data into hourly conditions
  const hourlyConditions = new Map<string, HourlyCondition>();

  // Process OpenMeteo data and calculate trends
  for (let i = 0; i < openMeteoData.hourly.time.length; i++) {
    const time = openMeteoData.hourly.time[i];
    const prevHour = i > 0 ? {
      visibility: openMeteoData.hourly.visibility[i-1],
      windSpeed: openMeteoData.hourly.wind_speed_10m[i-1]
    } : null;
    
    const currentHour = {
      visibility: openMeteoData.hourly.visibility[i],
      weatherCode: openMeteoData.hourly.weather_code[i],
      precipProb: openMeteoData.hourly.precipitation_probability[i],
      windSpeed: openMeteoData.hourly.wind_speed_10m[i],
      windGusts: openMeteoData.hourly.wind_gusts_10m[i],
      rain: openMeteoData.hourly.rain[i],
      snow: openMeteoData.hourly.snowfall[i]
    };

    // Calculate trend for internal use
    let trend: 'improving' | 'deteriorating' | 'stable' | undefined;
    if (prevHour) {
      const visibilityChange = currentHour.visibility - prevHour.visibility;
      const windChange = currentHour.windSpeed - prevHour.windSpeed;
      
      if (visibilityChange > 1000 || windChange < -5) {
        trend = 'improving';
      } else if (visibilityChange < -1000 || windChange > 5) {
        trend = 'deteriorating';
    } else {
        trend = 'stable';
      }
    }

    hourlyConditions.set(time, { ...currentHour, trend });
  }

  // Helper function to adjust weight based on data age
  const adjustWeightForAge = (baseWeight: number, lastUpdate: Date, updateInterval: number): number => {
    const age = Date.now() - lastUpdate.getTime();
    const intervalsPassed = age / updateInterval;
    
    // Reduce weight by 10% for each interval passed
    const ageFactor = Math.max(0.5, 1 - (intervalsPassed * 0.1));
    return baseWeight * ageFactor;
  };

  return tafForecast.map(period => {
    if (period.isTemporary) return period;

    const periodStart = period.from.toISOString().split('.')[0];
    const openMeteoHour = hourlyConditions.get(periodStart);

    if (!openMeteoHour) return period;

    // Calculate OpenMeteo confidence based on data age and trend stability
    const dataAge = Date.now() - new Date(periodStart).getTime();
    const openMeteoConfidence = Math.max(0.5, 1 - (dataAge / (12 * 60 * 60 * 1000))); // Decreases over 12 hours
    
    // Calculate weighted risk level for different aspects
    const openMeteoRisk = calculateOpenMeteoRisk(openMeteoHour);

    // Calculate separate weighted risks for different condition types
    const windWeight = getOpenMeteoWeight('wind_speed', new Date(periodStart));
    const tempWeight = getOpenMeteoWeight('temperature', new Date(periodStart));
    const precipWeight = getOpenMeteoWeight('precipitation', new Date(periodStart));

    // Calculate OpenMeteo-based risks
    const windRisk = calculateWindRisk(openMeteoHour);
    const precipRisk = calculatePrecipitationRisk(openMeteoHour);
    const visibilityRisk = calculateVisibilityRisk(openMeteoHour.visibility);

    // Determine if OpenMeteo shows better or worse conditions
    const openMeteoMaxRisk = Math.max(windRisk, precipRisk, visibilityRisk);
    const tafRisk = period.riskLevel.level;

    // Allow risk adjustment in both directions based on confidence
    let adjustedRiskLevel = tafRisk;
    
    if (openMeteoMaxRisk > tafRisk && openMeteoConfidence > 0.7) {
      // Increase risk if OpenMeteo shows worse conditions with high confidence
      adjustedRiskLevel = Math.min(4, openMeteoMaxRisk) as 1 | 2 | 3 | 4;
    } else if (openMeteoMaxRisk < tafRisk && openMeteoConfidence > 0.8) {
      // Decrease risk if OpenMeteo shows better conditions with very high confidence
      // Require higher confidence for risk reduction to be conservative
      adjustedRiskLevel = Math.max(1, openMeteoMaxRisk) as 1 | 2 | 3 | 4;
    }

    // Only update if risk level changed
    if (adjustedRiskLevel !== tafRisk) {
      period.riskLevel = {
        level: adjustedRiskLevel,
        title: getRiskTitle(adjustedRiskLevel, language),
        message: getRiskMessage(adjustedRiskLevel, language),
        statusMessage: getRiskStatus(adjustedRiskLevel, language),
        color: getRiskColor(adjustedRiskLevel)
      };
    }

    return period;
  });
}

// Helper function to calculate crosswind component for EPKK runways
function calculateCrosswind(windDirection: number, windSpeed: number, gustKts?: number): {
  crosswind: number;
  runway: string;
  headwind: number;
} {
  const runways = [
    { name: '07', heading: 69 },
    { name: '25', heading: 249 }
  ];
  
  let maxCrosswind = 0;
  let maxHeadwind = 0;
  let affectedRunway = '07';
  
  for (const rwy of runways) {
    // Calculate angle between wind and runway
    let angleDiff = windDirection - rwy.heading;
    
    // Normalize to -180 to +180 range
    while (angleDiff > 180) angleDiff -= 360;
    while (angleDiff < -180) angleDiff += 360;
    
    const windSpeedToUse = gustKts || windSpeed;
    
    // Crosswind component = wind speed × sin(angle)
    const crosswind = Math.abs(windSpeedToUse * Math.sin(angleDiff * Math.PI / 180));
    
    // Headwind component = wind speed × cos(angle) (negative = tailwind)
    const headwind = windSpeedToUse * Math.cos(angleDiff * Math.PI / 180);
    
    if (crosswind > Math.abs(maxCrosswind)) {
      maxCrosswind = crosswind;
      maxHeadwind = headwind;
      affectedRunway = rwy.name;
    }
  }
  
  return {
    crosswind: Math.round(maxCrosswind),
    runway: affectedRunway,
    headwind: Math.round(maxHeadwind)
  };
}

// Helper function to calculate wind risk from both OpenMeteo and TAF data
function calculateWindRisk(wind: HourlyCondition | { speed_kts: number; gust_kts?: number; direction?: number } | undefined): 1 | 2 | 3 | 4 {
  if (!wind) return 1; // Return lowest risk level when no wind data

  // Handle OpenMeteo data
  if ('windSpeed' in wind && 'windGusts' in wind) {
    const { windSpeed, windGusts } = wind;
    if (windGusts >= 35 || windSpeed >= MINIMUMS.MAX_WIND) return 4;
    if (windGusts >= 25 || windSpeed >= 25) return 3;
    if (windSpeed >= 15) return 2;
    return 1;
  }

  // Handle TAF/METAR data
  const { speed_kts, gust_kts, direction } = wind;
  
  // Calculate crosswind risk if we have direction
  let crosswindRisk = 0;
  if (direction !== undefined) {
    const { crosswind } = calculateCrosswind(direction, speed_kts, gust_kts);
    
    if (crosswind >= MINIMUMS.CROSSWIND) {
      crosswindRisk = 4; // Exceeds crosswind limit
    } else if (crosswind >= MINIMUMS.CROSSWIND * 0.8) {
      crosswindRisk = 3; // Near crosswind limit
    } else if (crosswind >= MINIMUMS.CROSSWIND * 0.6) {
      crosswindRisk = 2; // Moderate crosswind
    }
  }
  
  // Base wind risk
  let baseRisk = 1;
  if (gust_kts && gust_kts >= 40 || speed_kts >= 35) baseRisk = 4;
  else if (gust_kts && gust_kts >= 35) baseRisk = 3;
  else if (speed_kts >= 25 || (gust_kts && gust_kts >= 25)) baseRisk = 3;
  else if (speed_kts >= 15) baseRisk = 2;
  
  // Return maximum of base wind risk and crosswind risk
  return Math.max(baseRisk, crosswindRisk) as 1 | 2 | 3 | 4;
}

// Helper function to calculate precipitation-specific risk from OpenMeteo data
function calculatePrecipitationRisk(conditions: HourlyCondition): 1 | 2 | 3 | 4 {
  const { precipProb, rain, snow } = conditions;
  
  if (snow > 5 || rain > 10) return 4;
  if (snow > 2 || rain > 5) return 3;
  if ((snow > 0 || rain > 0) && precipProb > 70) return 2;
  return 1;
}

// Helper functions to get risk titles and messages
function getRiskTitle(level: 1 | 2 | 3 | 4, language: 'en' | 'pl'): string {
  const t = translations[language];
  switch (level) {
    case 4: return t.riskLevel4Title;
    case 3: return t.riskLevel3Title;
    case 2: return t.riskLevel2Title;
    default: return t.riskLevel1Title;
  }
}

function getRiskMessage(level: 1 | 2 | 3 | 4, language: 'en' | 'pl'): string {
  const t = translations[language];
  switch (level) {
    case 4: return t.riskLevel4Message;
    case 3: return t.riskLevel3Message;
    case 2: return t.riskLevel2Message;
    default: return t.riskLevel1Message;
  }
}

function calculateOpenMeteoRisk({
  weatherCode,
  visibility,
  windSpeed,
  windGusts,
  precipProb,
  rain,
  snow
}: {
  weatherCode: number;
  visibility: number;
  windSpeed: number;
  windGusts: number;
  precipProb: number;
  rain: number;
  snow: number;
}): 1 | 2 | 3 | 4 {
  // Visibility assessment - immediately return highest risk if below minimums
  if (visibility < MINIMUMS.VISIBILITY) {
    console.log('Risk 4 due to visibility below minimums:', {
      visibility,
      minimum: MINIMUMS.VISIBILITY
    });
    return 4;
  }

  let totalScore = 0;

  // Assess winds
  if (windGusts >= 35 || windSpeed >= MINIMUMS.MAX_WIND) {
    totalScore += 100; // Critical - exceeds limits
  } else if (windGusts >= 25 || windSpeed >= 25) {
    totalScore += 80; // Severe wind conditions
  } else if (windSpeed >= 15) {
    totalScore += 40; // Moderate wind conditions
  }

  // Assess precipitation with probability
  const precipScore = getWeatherScore(weatherCode);
  if (precipScore > 0 && precipProb > 40) {
    totalScore += precipScore * (precipProb / 100);
  }

  // Visibility assessment for non-critical cases
  if (visibility < 1000) {
    totalScore += 80;  // Very poor visibility
  } else if (visibility < 3000) {
    totalScore += 40;  // Poor visibility
  }

  console.log('Risk calculation:', {
    visibility,
    belowMinimums: visibility < MINIMUMS.VISIBILITY,
    totalScore,
    windScore: windGusts >= 35 ? 100 : windGusts >= 25 ? 80 : windSpeed >= 15 ? 40 : 0,
    precipScore: precipScore * (precipProb / 100),
    finalRisk: totalScore >= 100 ? 4 : totalScore >= 80 ? 3 : totalScore >= 40 ? 2 : 1
  });

  // Convert score to risk level
  return totalScore >= 100 ? 4 :
         totalScore >= 80 ? 3 :
         totalScore >= 40 ? 2 :
         1;
}

// Helper function to get standardized visibility description
function getStandardizedVisibilityDescription(meters: number): string {
  if (meters < MINIMUMS.VISIBILITY) {
    return `👁️ Very Poor Visibility`;
  }
  if (meters < 1000) {
    return `👁️ Poor Visibility`;
  }
  if (meters < 3000) {
    return `👁️ Reduced Visibility`;
  }
  if (meters < 5000) {
    return `👁️ Moderate Visibility`;
  }
  return "";
}

function getOpenMeteoConditions({
  weatherCode,
  visibility,
  windSpeed,
  windGusts,
  precipProb,
  rain,
  snow
}: {
  weatherCode: number;
  visibility: number;
  windSpeed: number;
  windGusts: number;
  precipProb: number;
  rain: number;
  snow: number;
}, language: 'en' | 'pl'): string[] {
  const t = translations[language].weatherConditionMessages;
  const conditions: string[] = [];

  // Add visibility condition first with correct thresholds
  if (visibility < MINIMUMS.VISIBILITY) {
    conditions.push(t.visibilityBelowMinimums);
  } else if (visibility < 1000) {
    conditions.push(t.veryPoorVisibilityMeters.replace('{meters}', visibility.toString()));
  } else if (visibility < 3000) {
    conditions.push(t.poorVisibility);
  } else if (visibility < 5000) {
    conditions.push(t.reducedVisibilitySimple);
  }

  // Standardize precipitation descriptions with probability check
  const getPrecipitationDescription = (code: number, probability: number): string | null => {
    // Only add precipitation if probability is significant (>40%)
    if (probability < 30) return null;

    const precipMap: Record<number, string> = {
      51: t.lightDrizzle || '🌧️ Light Drizzle',
      53: t.moderateDrizzle || '🌧️ Moderate Drizzle',
      55: t.heavyDrizzle || '🌧️ Heavy Drizzle',
      61: t.lightRain || '🌧️ Light Rain',
      63: t.rain || '🌧️ Rain',
      65: t.heavyRain || '🌧️ Heavy Rain',
      71: t.lightSnow || '🌨️ Light Snow',
      73: t.snow || '🌨️ Snow',
      75: t.heavySnow || '🌨️ Heavy Snow',
      95: t.thunderstorm || '⛈️ Thunderstorm',
      96: t.thunderstormWithHail || '⛈️ Thunderstorm with Hail',
      99: t.severeThunderstorm || '⛈️ Severe Thunderstorm'
    };
    return precipMap[code] || null;
  };

  // Add weather condition with probability check
  if (weatherCode >= 45) {
    const precipDescription = getPrecipitationDescription(weatherCode, precipProb);
    if (precipDescription) {
      conditions.push(precipDescription);
    }
  }

  // Add standardized wind condition
  const windDesc = getStandardizedWindDescription(windSpeed, language, windGusts);
  if (windDesc) {
    conditions.push(windDesc);
  }

  return conditions;
}

// Helper function to get standardized wind description
export function getStandardizedWindDescription(speed: number, language: 'en' | 'pl', gusts?: number): string {
  const t = translations[language].weatherConditionMessages;
  
  if (gusts && gusts >= 35) return t.veryStrongWindGusts;  // "💨 Very Strong Wind Gusts" | "💨 Bardzo silne porywy wiatru"
  if (gusts && gusts >= 25 || speed >= 25) return t.strongWinds;  // "💨 Strong Winds" | "💨 Silny wiatr"
  if (speed >= 15) return t.moderateWinds;  // "💨 Moderate Winds" | "💨 Umiarkowany wiatr"
  return ""; // Don't show light winds
}

// Update the getAirportWeather function
export async function getAirportWeather(language: 'en' | 'pl' = 'en', isTwitterCron: boolean = false): Promise<WeatherResponse | null> {
  try {
    // Use absolute URL only for Twitter cron job
    const weatherUrl = isTwitterCron 
      ? `${process.env.NEXT_PUBLIC_API_URL || 'https://krk.flights'}/api/weather`
      : '/api/weather';
    
    // Fetch both TAF and Open-Meteo data
    const [weatherResponse, openMeteoData] = await Promise.all([
      fetch(weatherUrl, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }),
      getOpenMeteoData()
    ]);

    if (!weatherResponse.ok) {
      throw new Error('Weather data fetch failed');
    }

    const data = await weatherResponse.json();
    const { metar, taf } = data;

    const currentWeather: WeatherData = metar.data[0];
    const forecast: TAFData = taf.data[0];

    // First process TAF data
    console.log('Processing TAF data:', {
      raw: forecast.raw_text,
      periods: forecast.forecast?.length
    });
    
    const tafPeriods = await processForecast(forecast, language);
    console.log('Processed TAF periods:', tafPeriods.length);

    // Merge TAF with OpenMeteo data
    const enhancedForecast = mergeTafWithOpenMeteo(tafPeriods, openMeteoData, language);
    
    // Fill ALL gaps (including within TAF coverage) with Open-Meteo data for complete 48h coverage
    const extendedForecast = extendForecastWithOpenMeteo(enhancedForecast, openMeteoData, language);
    
    // First merge overlapping periods
    const mergedOverlapping = mergeOverlappingPeriods(extendedForecast);
    console.log('Forecast after merging overlapping periods:', mergedOverlapping.length);
    
    // Then merge consecutive similar periods
    const mergedForecast = mergeConsecutiveSimilarPeriods(mergedOverlapping);
    console.log('Final merged forecast:', mergedForecast.length);

    const currentAssessment = assessWeatherRisk(currentWeather, language);
    
    // Post alert for current conditions if needed
    await postWeatherAlert(currentAssessment, language, [{
      start: new Date().toISOString(),
      end: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // Current conditions valid for 30 minutes
      level: currentAssessment.level
    }]);

    // Check future periods for high risk conditions
    const highRiskPeriods = mergedForecast
      .filter(period => period.riskLevel.level >= 3)
      .map(period => ({
        start: period.from.toISOString(),
        end: period.to.toISOString(),
        level: period.riskLevel.level
      }));

    if (highRiskPeriods.length > 0) {
      await postWeatherAlert(mergedForecast[0].riskLevel, language, highRiskPeriods);
    }

    // Check if conditions improved
    if (currentAssessment.level < 3) {
      await postAlertDismissal(language);
    }

    return {
      current: {
        riskLevel: currentAssessment,
        conditions: {
          phenomena: [
            ...(currentWeather.conditions?.map(c => {
              return getWeatherPhenomenonDescription(c.code, language);
            }).filter(Boolean) || []),
            ...(currentWeather.wind ? 
              [getStandardizedWindDescription(
                currentWeather.wind.speed_kts,
                language,
                currentWeather.wind.gust_kts
              )].filter(Boolean) : 
              []
            ),
            ...(currentWeather.visibility ? 
              [formatVisibility(currentWeather.visibility.meters, language)].filter(Boolean) : 
              []
            ),
            ...(currentWeather.ceiling ? 
              [formatCeiling(currentWeather.ceiling.feet, language)].filter(Boolean) : 
              []
            )
          ].filter(Boolean)
        },
        raw: currentWeather.raw_text,
        observed: currentWeather.observed
      },
      forecast: mergedForecast,
      raw_taf: forecast.raw_text
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
}

// Add these interfaces at the top of the file
interface WeatherPeriod {
  from: Date;
  to: Date;
  conditions?: {
    code: string;
  }[];
  visibility?: {
    meters: number;
  };
  clouds?: {
    code: string;
    base_feet_agl?: number;
    type?: string;
    cloudType?: 'CB' | 'TCU';
  }[];
  wind?: {
    speed_kts: number;
    gust_kts?: number;
    direction?: number;
  };
  change?: {
    probability?: number;
    indicator?: {
      code: string;
    };
  };
  ceiling?: {
    feet: number;
  };
  temperature?: {
    celsius: number;
  };
}

interface GroupedPeriod {
  conditions: string[];
  riskLevel: number;
  timeDescription: string;
  from: Date;
  to: Date;
}

// Update the processForecast function to use the new risk assessment
async function processForecast(taf: TAFData | null, language: 'en' | 'pl'): Promise<ForecastChange[]> {
  if (!taf || !taf.forecast) return [];

  // Log only basic info to reduce console spam
  console.log('Processing TAF data:', {
    raw: taf.raw_text,
    periods: taf.forecast.length
  });

  const t = translations[language];
  const changes: ForecastChange[] = [];
  
  // First, get all valid periods and sort them
  const validPeriods = taf.forecast
    .filter(period => period.timestamp)
    .map(period => {
      const mappedPeriod = {
        ...period,
        from: adjustToWarsawTime(new Date(period.timestamp!.from)),
        to: adjustToWarsawTime(new Date(period.timestamp!.to)),
        language // Add language to each period
      };
      return mappedPeriod;
    })
    .sort((a, b) => a.from.getTime() - b.from.getTime());

  if (validPeriods.length === 0) return [];

  // Process base periods (non-TEMPO) including BECMG
  const basePeriods = validPeriods.filter(p => 
    !p.change?.indicator?.code || p.change.indicator.code === 'BECMG'
  );

  // Process each base period (now with async/await)
  for (const [index, period] of basePeriods.entries()) {
    const conditions = new Set<string>();

    // Process visibility (FIX: use !== undefined to handle 0m!)
    if (period.visibility?.meters !== undefined) {
      const visDesc = formatVisibility(period.visibility.meters, language);
      if (visDesc) conditions.add(visDesc);
    }

    // Process ceiling/clouds (FIX: use !== undefined to handle 0ft!)
    if (period.clouds && period.clouds.length > 0) {
      const significantCloud = period.clouds
        .filter(cloud => cloud.code === 'BKN' || cloud.code === 'OVC')
        .sort((a, b) => (a.base_feet_agl ?? 99999) - (b.base_feet_agl ?? 99999))[0];

      if (significantCloud && significantCloud.base_feet_agl !== undefined) {
        const ceilingDesc = formatCeiling(significantCloud.base_feet_agl, language);
        if (ceilingDesc) conditions.add(ceilingDesc);
      }
    }

    // Process weather phenomena
    if (period.conditions) {
      for (const condition of period.conditions) {
        const translatedPhenomenon = getWeatherPhenomenonDescription(condition.code, language);
        if (translatedPhenomenon) conditions.add(translatedPhenomenon);
      }
    }

    // Add wind if significant
    const windDesc = period.wind ? 
      getStandardizedWindDescription(period.wind.speed_kts, language, period.wind.gust_kts) : 
      null;
    if (windDesc) conditions.add(windDesc);

    // Calculate risk level using the new sophisticated system (now with await)
    const riskLevel = await calculateRiskLevel(period, language, t.operationalWarnings);

    // Add period
    const phenomena = Array.from(conditions);

    const forecastChange = {
      timeDescription: formatTimeDescription(period.from, period.to, language),
      from: period.from,
      to: period.to,
      conditions: {
        phenomena: phenomena.length === 0 && riskLevel.level === 1
          ? [getWeatherPhenomenonDescription('NSW', language)]
          : phenomena
      },
      riskLevel,
      changeType: (period.change?.indicator?.code || 'PERSISTENT') as 'TEMPO' | 'BECMG' | 'PERSISTENT',
      visibility: period.visibility,
      ceiling: period.ceiling,
      isTemporary: false,
      probability: undefined,
      wind: period.wind,
      operationalImpacts: riskLevel.operationalImpacts,
      language // Add language to the forecast change
    };

    changes.push(forecastChange);
  }

  // Process TEMPO periods (including PROB30, PROB40) with the new risk assessment (now with async/await)
  const tempoPeriods = validPeriods.filter(p => {
    const code = p.change?.indicator?.code;
    return code === 'TEMPO' || code?.startsWith('PROB');
  });
  
  for (const period of tempoPeriods) {
    const conditions = new Set<string>();
    const probability = period.change?.probability;

    // Process conditions similar to base periods (FIX: use !== undefined to handle 0m!)
    if (period.visibility?.meters !== undefined) {
      const visDesc = formatVisibility(period.visibility.meters, language);
      if (visDesc) conditions.add(visDesc);
    }

    if (period.clouds && period.clouds.length > 0) {
      const significantCloud = period.clouds
        .filter(cloud => cloud.code === 'BKN' || cloud.code === 'OVC')
        .sort((a, b) => (a.base_feet_agl ?? 99999) - (b.base_feet_agl ?? 99999))[0];

      if (significantCloud && significantCloud.base_feet_agl !== undefined) {
        const ceilingDesc = formatCeiling(significantCloud.base_feet_agl, language);
        if (ceilingDesc) conditions.add(ceilingDesc);
      }
    }

    if (period.conditions) {
      for (const condition of period.conditions) {
        const translatedPhenomenon = getWeatherPhenomenonDescription(condition.code, language);
        if (translatedPhenomenon) conditions.add(translatedPhenomenon);
      }
    }

    const windDesc = period.wind ? 
      getStandardizedWindDescription(period.wind.speed_kts, language, period.wind.gust_kts) : 
      null;
    if (windDesc) conditions.add(windDesc);

    // Calculate risk level using the new sophisticated system (now with await)
    const riskLevel = await calculateRiskLevel(period, language, t.operationalWarnings);

    const phenomena = Array.from(conditions);

    // Skip TEMPO periods that don't have any significant changes
    if (phenomena.length === 0 && riskLevel.level === 1) {
      console.log('Skipping empty TEMPO period:', {
        from: period.from,
        to: period.to,
        probability,
        language
      });
      continue;
    }

    const forecastChange = {
      timeDescription: formatTimeDescription(period.from, period.to, language),
      from: period.from,
      to: period.to,
      conditions: {
        phenomena
      },
      riskLevel,
      changeType: 'TEMPO' as const,
      visibility: period.visibility,
      ceiling: period.ceiling,
      isTemporary: true,
      probability,
      wind: period.wind,
      operationalImpacts: riskLevel.operationalImpacts,
      language // Add language to the forecast change
    };

    changes.push(forecastChange);
  }

  // Sort changes by start time, end time, and risk level
  return changes.sort((a, b) => {
    // First sort by start time
    const startTimeCompare = a.from.getTime() - b.from.getTime();
    if (startTimeCompare !== 0) return startTimeCompare;
    
    // If same start time, sort by end time
    const endTimeCompare = a.to.getTime() - b.to.getTime();
    if (endTimeCompare !== 0) return endTimeCompare;
    
    // If same time range, TEMPO/PROB periods go after base periods
    if (a.isTemporary !== b.isTemporary) {
      return a.isTemporary ? 1 : -1;
    }
    
    // If both are TEMPO/PROB or both are base, higher risk level goes first
    return b.riskLevel.level - a.riskLevel.level;
  });
}

// Helper function to check if two weather periods can be merged
function areWeatherPeriodsSimilar(a: WeatherPeriod, b: WeatherPeriod): boolean {
  // Don't merge if they have different probabilities
  if (a.change?.probability !== b.change?.probability) return false;
  
  // Don't merge if they have different change types
  if (a.change?.indicator?.code !== b.change?.indicator?.code) return false;
  
  // Compare conditions
  const aConditions = new Set(a.conditions?.map(c => c.code) || []);
  const bConditions = new Set(b.conditions?.map(c => c.code) || []);
  
  if (aConditions.size !== bConditions.size) return false;
  
  return Array.from(aConditions).every(code => bConditions.has(code));
}


// Helper function to calculate operational impacts
async function calculateOperationalImpacts(period: WeatherPeriod, language: 'en' | 'pl', warnings: Record<string, string>): Promise<string[]> {
  const impacts: string[] = [];
  const riskScore = await calculateRiskScore(period);

  // Calculate base risks (await async ones)
  const visibilityRisk = calculateVisibilityRisk(period.visibility?.meters);
  const windRisk = calculateWindRisk(period.wind);
  const weatherRisk = await calculateWeatherPhenomenaRisk(period.conditions);
  const ceilingRisk = calculateCeilingRisk(period.clouds, period.conditions);

  // Calculate compound effects (no time multiplier)
  let compoundMultiplier = 1;
  if (period.wind?.speed_kts && period.wind.speed_kts >= COMPOUND_EFFECTS.THRESHOLDS.WIND_SPEED) {
    if (period.visibility?.meters && period.visibility.meters < COMPOUND_EFFECTS.THRESHOLDS.VIS_METERS) {
      compoundMultiplier *= COMPOUND_EFFECTS.SYNERGY.WIND_VIS;
      impacts.push(warnings.combinedWindVisibility);
    }
    if (period.conditions?.some(c => ['RA', 'SN', 'RASN'].includes(c.code))) {
      compoundMultiplier *= COMPOUND_EFFECTS.SYNERGY.WIND_PRECIP;
      impacts.push(warnings.combinedWindPrecipitation);
    }
  }

  // Add visibility impacts
  if (visibilityRisk >= 80) {
    impacts.push(warnings.operationsSuspended, warnings.diversionsLikely);
  } else if (visibilityRisk >= 40) {
    impacts.push(warnings.possibleDelays, warnings.someFlightsMayDivert);
  }

  // Add wind impacts
  if (windRisk >= 80) {
    impacts.push(warnings.dangerousGusts, warnings.diversionsLikely);
  } else if (windRisk >= 60) {
    impacts.push(
      warnings.strongGustsOperations,
      warnings.extendedDelays,
      warnings.diversionsLikely
    );
  } else if (windRisk >= 30) {
    impacts.push(
      warnings.strongWindsApproaches,
      warnings.minorDelaysPossible
    );
  }

  // Add weather phenomena impacts
  if (weatherRisk >= 80) {
    impacts.push(warnings.severeWeather, warnings.operationsSuspended);
  } else if (weatherRisk >= 60) {
    impacts.push(warnings.significantWeather, warnings.possibleDelays);
  }

  // Add ceiling impacts
  if (ceilingRisk >= 80) {
    impacts.push(warnings.lowCeilingOperations);
  } else if (ceilingRisk >= 40) {
    impacts.push(warnings.reducedApproachOptions);
  }

  // Add compound effect impacts
  if (compoundMultiplier > 1.3) {
    impacts.push(warnings.multipleConditions);
  }

  // Remove duplicates and sort by severity
  return Array.from(new Set(impacts)).sort((a, b) => {
    const severityA = a.includes('suspended') ? 3 : a.includes('restricted') ? 2 : 1;
    const severityB = b.includes('suspended') ? 3 : b.includes('restricted') ? 2 : 1;
    return severityB - severityA;
  });
}

// Helper function to calculate overall risk score
async function calculateRiskScore(period: WeatherPeriod): Promise<number> {
  const visibilityRisk = calculateVisibilityRisk(period.visibility?.meters);
  const windRisk = calculateWindRisk(period.wind);
  const weatherRisk = await calculateWeatherPhenomenaRisk(period.conditions);
  const ceilingRisk = calculateCeilingRisk(period.clouds, period.conditions);

  // Calculate compound effects (no time multiplier)
  let compoundMultiplier = 1;
  if (period.wind?.speed_kts && period.wind.speed_kts >= COMPOUND_EFFECTS.THRESHOLDS.WIND_SPEED) {
    // FIX: use !== undefined to handle 0m visibility!
    if (period.visibility?.meters !== undefined && period.visibility.meters < COMPOUND_EFFECTS.THRESHOLDS.VIS_METERS) {
      compoundMultiplier *= COMPOUND_EFFECTS.SYNERGY.WIND_VIS;
    }
    if (period.conditions?.some(c => ['RA', 'SN', 'RASN'].includes(c.code))) {
      compoundMultiplier *= COMPOUND_EFFECTS.SYNERGY.WIND_PRECIP;
    }
  }

  // Count number of severe conditions (risks >= 80)
  const severeConditions = [
    visibilityRisk >= 80,
    windRisk >= 80,
    weatherRisk >= 80,
    ceilingRisk >= 80
  ].filter(Boolean).length;

  // Count number of moderate conditions (risks >= 60)
  const moderateConditions = [
    visibilityRisk >= 60,
    windRisk >= 60,
    weatherRisk >= 60,
    ceilingRisk >= 60
  ].filter(Boolean).length;

  // If we have 2 or more severe conditions, or 3 or more moderate conditions, return maximum risk
  if (severeConditions >= 2 || moderateConditions >= 3) {
    return 100 * compoundMultiplier;
  }

  // For TEMPO periods with probability, adjust the risk
  if (period.change?.indicator?.code === 'TEMPO' && period.change?.probability) {
    const baseRisk = Math.max(
      visibilityRisk,
      windRisk,
      weatherRisk,
      ceilingRisk
    );
    
    // For high probability (>= 40%) of severe conditions, increase risk
    if (period.change.probability >= 40 && baseRisk >= 80) {
      return 100 * compoundMultiplier;
    }
    
    // For moderate probability (30-40%) of severe conditions, ensure at least high risk
    if (period.change.probability >= 30 && baseRisk >= 80) {
      return Math.max(80, baseRisk) * compoundMultiplier;
    }
  }

  // For TEMPO periods without probability, use the maximum risk approach
  if (period.change?.indicator?.code === 'TEMPO') {
    return Math.max(
      visibilityRisk,
      windRisk,
      weatherRisk,
      ceilingRisk
    ) * compoundMultiplier;
  }

  // For base periods, use weighted average
  return (
    visibilityRisk * 0.3 +
    windRisk * 0.25 +
    weatherRisk * 0.25 +
    ceilingRisk * 0.2
  ) * compoundMultiplier;
}

function formatTimeDescription(start: Date, end: Date, language: 'en' | 'pl'): string {
  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const startTime = formatTime(start);
  const endTime = formatTime(end);

  if (language === 'pl') {
    // Polski format
    if (start.getDate() === end.getDate()) {
      // Ten sam dzień
      const dayPrefix = start.getDate() === today.getDate() ? 'Dziś' : 'Jutro';
      return `${dayPrefix} ${startTime} - ${endTime}`;
    }
    
    // Przechodzi przez północ
    const startPrefix = start.getDate() === today.getDate() ? 'Dziś' : 'Jutro';
    const endPrefix = end.getDate() === tomorrow.getDate() ? 'jutro' : 'pojutrze';
    
    // Jeśli kończy się o północy, użyj specjalnego formatu
    if (endTime === '00:00') {
      return `do ${endPrefix} ${endTime}`;
    }
    
    // Standardowy format dla różnych dni
    return `${startPrefix} ${startTime} do ${endPrefix} ${endTime}`;
  } else {
    // English format
    if (start.getDate() === end.getDate()) {
      const prefix = start.getDate() === today.getDate() ? 'Today' : 'Tomorrow';
      return `${prefix} ${startTime} - ${endTime}`;
    }
    
    const startPrefix = start.getDate() === today.getDate() ? 'Today' : 'Tomorrow';
    const endPrefix = end.getDate() === tomorrow.getDate() ? 'Tomorrow' : 'Next day';
    return `${startPrefix} ${startTime} - ${endPrefix} ${endTime}`;
  }
}

function getWeatherDescription(reasons: string[], impacts: string[], language: 'en' | 'pl'): string {
  const t = translations[language].weatherConditionMessages;
  
  if (!reasons.length && !impacts.length) {
    return t.clearSkies;
  }
    
  // Combine weather reasons with operational impacts
  const allImpacts = [...impacts];
  if (reasons.length > 0) {
    const primaryReason = reasons[0];
    const description = getDetailedDescription(primaryReason, language);
    if (description) {
      allImpacts.unshift(description);
    }
  }
    
  return allImpacts.join(" • ");
}

export function assessWeatherRisk(weather: WeatherData, language: 'en' | 'pl'): RiskAssessment {
  const t = translations[language];
  
  console.log('Debug - Weather Risk Assessment:', {
    language,
    visibility: weather.visibility?.meters,
    conditions: weather.conditions?.map(c => c.code),
    ceiling: weather.ceiling?.feet,
    wind: weather.wind,
    translations: {
      level4: {
        title: t.riskLevel4Title,
        message: t.riskLevel4Message,
        status: t.riskLevel4Status
      },
      level3: {
        title: t.riskLevel3Title,
        message: t.riskLevel3Message,
        status: t.riskLevel3Status
      },
      level2: {
        title: t.riskLevel2Title,
        message: t.riskLevel2Message,
        status: t.riskLevel2Status
      },
      level1: {
        title: t.riskLevel1Title,
        message: t.riskLevel1Message,
        status: t.riskLevel1Status
      }
    }
  });

  const operationalImpactsSet = new Set<string>();
  const reasons: string[] = [];

  // Base risk calculation
  let baseRiskLevel = 1;

  // Check for severe conditions first with descriptive operational impacts
  if (weather.conditions?.some(c => c.code === '+SHSN')) {
    baseRiskLevel = 4;
    operationalImpactsSet.clear();
    operationalImpactsSet.add(language === 'pl' 
      ? '🚫 Operacje lotnicze zawieszone - intensywne opady śniegu'
      : '🚫 Flight operations suspended - heavy snow showers');
    operationalImpactsSet.add(language === 'pl'
      ? '✈️ Lądowania i starty niemożliwe - pasy startowe zamknięte'
      : '✈️ Landings and takeoffs impossible - runways closed');
    operationalImpactsSet.add(language === 'pl'
      ? '📞 Skontaktuj się z przewoźnikiem w sprawie statusu lotu'
      : '📞 Contact your airline regarding flight status');
    reasons.push('Heavy snow showers');
  } else if (weather.visibility?.meters !== undefined && weather.visibility.meters < MINIMUMS.VISIBILITY) {
    const percentBelow = Math.round(((MINIMUMS.VISIBILITY - weather.visibility.meters) / MINIMUMS.VISIBILITY) * 100);
    baseRiskLevel = 4;
    operationalImpactsSet.clear();
    operationalImpactsSet.add(language === 'pl' 
      ? `🚫 Widoczność ${weather.visibility.meters}m - znacznie poniżej minimum (${MINIMUMS.VISIBILITY}m)`
      : `🚫 Visibility ${weather.visibility.meters}m - significantly below minimum (${MINIMUMS.VISIBILITY}m)`);
    operationalImpactsSet.add(language === 'pl'
      ? `✈️ Operacje zawieszone - przekroczenie minimów o ${percentBelow}%`
      : `✈️ Operations suspended - ${percentBelow}% below minimums`);
    operationalImpactsSet.add(language === 'pl'
      ? '🔄 Prawdopodobne przekierowania i odwołania lotów'
      : '🔄 Diversions and cancellations likely');
    operationalImpactsSet.add(language === 'pl'
      ? '📞 Sprawdź status lotu bezpośrednio u przewoźnika'
      : '📞 Check flight status directly with your airline');
    reasons.push(`Horizontal visibility (${weather.visibility.meters}m) below minimums (${MINIMUMS.VISIBILITY}m)`);
  } else if (weather.vertical_visibility?.feet !== undefined && weather.vertical_visibility.feet < MINIMUMS.VERTICAL_VISIBILITY) {
    baseRiskLevel = 4;
    operationalImpactsSet.clear();
    operationalImpactsSet.add(language === 'pl'
      ? `☁️ Widoczność pionowa ${weather.vertical_visibility.feet}ft - poniżej minimum (${MINIMUMS.VERTICAL_VISIBILITY}ft)`
      : `☁️ Vertical visibility ${weather.vertical_visibility.feet}ft - below minimum (${MINIMUMS.VERTICAL_VISIBILITY}ft)`);
    operationalImpactsSet.add(language === 'pl'
      ? `✈️ Operacje zawieszone - niemożliwe określenie podstawy chmur`
      : `✈️ Operations suspended - cloud base cannot be determined`);
    operationalImpactsSet.add(language === 'pl'
      ? '🔄 Przekierowania i odwołania lotów'
      : '🔄 Diversions and cancellations');
    reasons.push(`Vertical visibility (${weather.vertical_visibility.feet}ft) below minimums (${MINIMUMS.VERTICAL_VISIBILITY}ft)`);
  } else if (weather.conditions?.some(c => ['FZFG', 'FZRA', 'FZDZ'].includes(c.code))) {
    baseRiskLevel = 4;
    operationalImpactsSet.clear();
    const freezingCondition = weather.conditions.find(c => ['FZFG', 'FZRA', 'FZDZ'].includes(c.code));
    operationalImpactsSet.add(language === 'pl'
      ? `❄️ Warunki zamarzające (${freezingCondition?.code}) - ekstremalne ryzyko`
      : `❄️ Freezing conditions (${freezingCondition?.code}) - extreme risk`);
    operationalImpactsSet.add(language === 'pl'
      ? '✈️ Operacje lotnicze zawieszone - oblodzenie krytyczne'
      : '✈️ Flight operations suspended - critical icing');
    operationalImpactsSet.add(language === 'pl'
      ? '⚠️ Wszystkie samoloty wymagają procedur antyoblodzeniowych'
      : '⚠️ All aircraft require anti-icing procedures');
    reasons.push(`Freezing conditions (${freezingCondition?.code})`);
  }

  // If we already have severe conditions, return early
  if (baseRiskLevel === 4) {
    return {
      level: 4,
      title: t.riskLevel4Title,
      message: t.riskLevel4Message,
      statusMessage: t.riskLevel4Status,
      color: "red",
      operationalImpacts: Array.from(operationalImpactsSet)
    };
  }

  // Check for poor visibility - more granular assessment with descriptive impacts (FIX: !== undefined to handle 0m!)
  if (weather.visibility?.meters !== undefined) {
    if (weather.visibility.meters < 1000) {
      baseRiskLevel = Math.max(baseRiskLevel, 3);
      const percentOfMinimum = Math.round((weather.visibility.meters / MINIMUMS.VISIBILITY) * 100);
      operationalImpactsSet.add(language === 'pl'
        ? `⚠️ Bardzo niska widoczność: ${weather.visibility.meters}m (${percentOfMinimum}% minimum)`
        : `⚠️ Very low visibility: ${weather.visibility.meters}m (${percentOfMinimum}% of minimum)`);
      operationalImpactsSet.add(language === 'pl'
        ? '✈️ Ograniczone operacje - możliwe znaczne opóźnienia'
        : '✈️ Restricted operations - significant delays possible');
      operationalImpactsSet.add(language === 'pl'
        ? '🕐 Wydłużony czas oczekiwania na podejście do lądowania'
        : '🕐 Extended holding times for landing approaches');
    } else if (weather.visibility.meters < 3000) {
      baseRiskLevel = Math.max(baseRiskLevel, 2);
      operationalImpactsSet.add(language === 'pl'
        ? `👁️ Ograniczona widoczność: ${weather.visibility.meters}m`
        : `👁️ Reduced visibility: ${weather.visibility.meters}m`);
      operationalImpactsSet.add(language === 'pl'
        ? '✈️ Możliwe opóźnienia 10-30 minut'
        : '✈️ Possible delays of 10-30 minutes');
    }
  }

  // Check ceiling against minimums with descriptive details (FIX: use !== undefined to handle 0ft ceiling!)
  if (weather.ceiling?.feet !== undefined && weather.ceiling.feet < MINIMUMS.CEILING) {
    // Special handling for BKN000/OVC000 - clouds at ground level!
    if (weather.ceiling.feet === 0) {
      baseRiskLevel = 4;
      operationalImpactsSet.clear();
      operationalImpactsSet.add(language === 'pl'
        ? '🚫 CHMURY NA ZIEMI (BKN000/OVC000) - ekstremalne warunki!'
        : '🚫 CLOUDS AT GROUND LEVEL (BKN000/OVC000) - extreme conditions!');
      operationalImpactsSet.add(language === 'pl'
        ? '✈️ Operacje lotnicze NIEMOŻLIWE - zero widoczności pionowej'
        : '✈️ Flight operations IMPOSSIBLE - zero vertical visibility');
      operationalImpactsSet.add(language === 'pl'
        ? '🔄 Wszystkie loty przekierowane lub odwołane'
        : '🔄 All flights diverted or cancelled');
      operationalImpactsSet.add(language === 'pl'
        ? '📞 NATYCHMIAST skontaktuj się z przewoźnikiem'
        : '📞 Contact your airline IMMEDIATELY');
    } else {
      baseRiskLevel = Math.max(baseRiskLevel, 3);
      operationalImpactsSet.add(language === 'pl'
        ? `☁️ Podstawa chmur poniżej minimów: ${weather.ceiling.feet}ft (minimum: ${MINIMUMS.CEILING}ft)`
        : `☁️ Cloud base below minimums: ${weather.ceiling.feet}ft (minimum: ${MINIMUMS.CEILING}ft)`);
      operationalImpactsSet.add(language === 'pl'
        ? '✈️ Tylko podejścia precyzyjne (ILS) - ograniczona przepustowość'
        : '✈️ Only precision approaches (ILS) - reduced capacity');
    }
  } else if (weather.clouds?.some(cloud => 
    (cloud.code === 'BKN' || cloud.code === 'OVC') && 
    cloud.base_feet_agl !== undefined &&
    cloud.base_feet_agl < NEAR_MINIMUMS.CEILING
  )) {
    const lowestCeiling = Math.min(...weather.clouds
      .filter(c => (c.code === 'BKN' || c.code === 'OVC') && c.base_feet_agl !== undefined)
      .map(c => c.base_feet_agl!));
    baseRiskLevel = Math.max(baseRiskLevel, 2);
    operationalImpactsSet.add(language === 'pl'
      ? `☁️ Niska podstawa chmur: ${lowestCeiling}ft`
      : `☁️ Low cloud base: ${lowestCeiling}ft`);
    operationalImpactsSet.add(language === 'pl'
      ? '✈️ Niewielkie opóźnienia możliwe'
      : '✈️ Minor delays possible');
  }

  // Wind assessment with descriptive details (FIX: !== undefined)
  if (weather.wind?.gust_kts !== undefined && weather.wind.gust_kts >= 40) {
    baseRiskLevel = 4;
    operationalImpactsSet.clear();
    operationalImpactsSet.add(language === 'pl'
      ? `💨 Niebezpieczne porywy wiatru: ${weather.wind.gust_kts}kt (limit: 40kt)`
      : `💨 Dangerous wind gusts: ${weather.wind.gust_kts}kt (limit: 40kt)`);
    operationalImpactsSet.add(language === 'pl'
      ? '✈️ Operacje zawieszone - przekroczenie limitów operacyjnych'
      : '✈️ Operations suspended - operational limits exceeded');
    operationalImpactsSet.add(language === 'pl'
      ? '🔄 Przekierowania i odwołania lotów'
      : '🔄 Diversions and cancellations');
    reasons.push(`Dangerous wind gusts (${weather.wind.gust_kts}kt)`);
    return {
      level: 4,
      title: t.riskLevel4Title,
      message: t.riskLevel4Message,
      statusMessage: t.riskLevel4Status,
      color: "red",
      operationalImpacts: Array.from(operationalImpactsSet)
    };
  } else if (weather.wind?.gust_kts !== undefined && weather.wind.gust_kts >= 35) {
    baseRiskLevel = Math.max(baseRiskLevel, 3);
    operationalImpactsSet.add(language === 'pl'
      ? `💨 Silne porywy wiatru: ${weather.wind.gust_kts}kt`
      : `💨 Strong wind gusts: ${weather.wind.gust_kts}kt`);
    operationalImpactsSet.add(language === 'pl'
      ? '✈️ Utrudnione lądowania - możliwe przekierowania'
      : '✈️ Difficult landings - possible diversions');
  } else if ((weather.wind?.speed_kts !== undefined && weather.wind.speed_kts >= 25) || 
             (weather.wind?.gust_kts !== undefined && weather.wind.gust_kts >= 25)) {
    baseRiskLevel = Math.max(baseRiskLevel, 2);
    const windSpeed = weather.wind.gust_kts || weather.wind.speed_kts;
    operationalImpactsSet.add(language === 'pl'
      ? `💨 Umiarkowany wiatr: ${windSpeed}kt`
      : `💨 Moderate winds: ${windSpeed}kt`);
    operationalImpactsSet.add(language === 'pl'
      ? '✈️ Możliwe niewielkie opóźnienia przy lądowaniu'
      : '✈️ Minor delays possible during landing');
  }

  // Final risk level (no time-based multipliers)
  const finalRiskLevel = baseRiskLevel;

  const riskMappings = {
    4: {
      title: t.riskLevel4Title,
      message: t.riskLevel4Message,
      statusMessage: t.riskLevel4Status,
      color: "red" as const
    },
    3: {
      title: t.riskLevel3Title,
      message: t.riskLevel3Message,
      statusMessage: t.riskLevel3Status,
      color: "red" as const  // Changed from orange to red to match UI
    },
    2: {
      title: t.riskLevel2Title,
      message: t.riskLevel2Message,
      statusMessage: t.riskLevel2Status,
      color: "orange" as const  // Changed from yellow to orange to match UI
    },
    1: {
      title: t.riskLevel1Title,
      message: t.riskLevel1Message,
      statusMessage: t.riskLevel1Status,
      color: "green" as const
    }
  };

  const riskDetails = riskMappings[finalRiskLevel as keyof typeof riskMappings];

  // Remove the "Additional consideration" prefix from reasons
  const cleanedReasons = reasons.map(reason => 
    reason.replace("Additional consideration: ", "")
  );

  // Ensure we always have operational impacts, even for level 1 (FIX: !== undefined)
  if (operationalImpactsSet.size === 0 && finalRiskLevel === 1) {
    if (weather.visibility?.meters !== undefined && weather.visibility.meters >= 5000) {
      operationalImpactsSet.add(language === 'pl'
        ? `✅ Doskonała widoczność: ${weather.visibility.meters}m`
        : `✅ Excellent visibility: ${weather.visibility.meters}m`);
    }
    if (weather.ceiling?.feet !== undefined && weather.ceiling.feet >= 1000) {
      operationalImpactsSet.add(language === 'pl'
        ? `✅ Wysoka podstawa chmur: ${weather.ceiling.feet}ft`
        : `✅ High cloud base: ${weather.ceiling.feet}ft`);
    }
    if (weather.wind?.speed_kts !== undefined && weather.wind.speed_kts < 15) {
      operationalImpactsSet.add(language === 'pl'
        ? `✅ Łagodny wiatr: ${weather.wind.speed_kts}kt`
        : `✅ Light winds: ${weather.wind.speed_kts}kt`);
    }
    
    // If still empty, add generic good conditions message
    if (operationalImpactsSet.size === 0) {
      operationalImpactsSet.add(language === 'pl'
        ? '✅ Operacje normalne - warunki sprzyjające'
        : '✅ Normal operations - favorable conditions');
      operationalImpactsSet.add(language === 'pl'
        ? '✈️ Loty wykonywane zgodnie z rozkładem'
        : '✈️ Flights operating on schedule');
    }
  }

  return {
    level: finalRiskLevel as 1 | 2 | 3 | 4,
    title: riskDetails.title,
    message: `${riskDetails.message}${cleanedReasons.length ? ` - ${cleanedReasons[0]}` : ''}`,
    statusMessage: riskDetails.statusMessage,
    color: riskDetails.color,
    operationalImpacts: Array.from(operationalImpactsSet),
    explanation: cleanedReasons.length > 0 ? cleanedReasons.join('. ') : undefined
  };
}


// Add this helper function to get weather score based on WMO code
function getWeatherScore(code: number): number {
  // Thunderstorm conditions
  if ([95, 96, 99].includes(code)) return RISK_WEIGHTS.PHENOMENA_SEVERE.TS;
  
  // Snow conditions
  if (code === 75) return RISK_WEIGHTS.PHENOMENA_SEVERE['+SN'];
  if (code === 73) return RISK_WEIGHTS.PHENOMENA_MODERATE.SN;
  if (code === 71) return RISK_WEIGHTS.PHENOMENA_MODERATE.SN * 0.7;
  
  // Rain conditions
  if (code === 65) return RISK_WEIGHTS.PHENOMENA_MODERATE['+RA'];
  if (code === 63) return RISK_WEIGHTS.PHENOMENA_MODERATE.RA;
  if (code === 61) return RISK_WEIGHTS.PHENOMENA_MODERATE.RA * 0.7;
  
  // Drizzle (treat as light rain)
  if ([51, 53, 55].includes(code)) return RISK_WEIGHTS.PHENOMENA_MODERATE.RA * 0.5;
  
  // Fog conditions
  if (code === 45) return RISK_WEIGHTS.PHENOMENA_MODERATE.FG;
  if (code === 48) return RISK_WEIGHTS.PHENOMENA_SEVERE.FZFG;

  return 0;
}


// Add this helper function for formatting visibility
function formatVisibility(meters: number, language: 'en' | 'pl'): string {
  const t = translations[language].weatherConditionMessages;
  
  if (meters < MINIMUMS.VISIBILITY) {
    return t.visibilityBelowMinimumsMeters.replace('{meters}', meters.toString());
  }
  if (meters < 1000) {
    return t.veryPoorVisibilityMeters.replace('{meters}', meters.toString());
  }
  if (meters < 3000) {
    return t.poorVisibility;
  }
  if (meters < 5000) {
    return t.reducedVisibilitySimple;
  }
  return '';
}

// Add this helper function for formatting ceiling
function formatCeiling(feet: number, language: 'en' | 'pl'): string {
  const t = translations[language].weatherConditionMessages;
  
  if (feet < MINIMUMS.CEILING) {
    return t.ceilingBelowMinimums;
  }
  if (feet < 500) {
    return t.veryLowCeiling;
  }
  return '';
}

function getDetailedDescription(condition: string, language: 'en' | 'pl'): string {
  const t = translations[language].weatherDescriptions;
  
  if (condition.includes('Strong Winds') || condition.includes('Strong Wind Gusts')) {
    return t.strongWinds;
  }
  if (condition.includes('Rain') && condition.includes('Strong')) {
    return t.rainAndWind;
  }
  if (condition.includes('Snow')) {
    return t.snowConditions;
  }
  return condition;
}

// Add this interface for warnings

function getWeatherPhenomenonDescription(code: string, language: 'en' | 'pl'): string {
  return WEATHER_PHENOMENA_TRANSLATIONS[language][code as keyof typeof WEATHER_PHENOMENA] || code;
}

export function formatBannerText(forecast: ForecastChange[], language: 'en' | 'pl'): string {
  const t = translations[language].banner;
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(language === 'pl' ? 'pl-PL' : 'en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Warsaw'
    });
  };

  const period = forecast[0];
  if (!period) return '';

  const phenomena = period.conditions.phenomena.join(', ').toLowerCase();
  const startTime = formatTime(period.from);
  const endTime = formatTime(period.to);

  if (language === 'pl') {
    return `${t.significantDisruptions} ${t.between} ${startTime} ${t.and} ${endTime} ${t.dueTo} ${phenomena} ${t.thatMayOccur}. ${t.temporaryConditions}. ${t.checkStatus}.`;
  } else {
    return `${t.significantDisruptions} ${t.between} ${startTime} ${t.and} ${endTime} ${t.dueTo} ${phenomena} ${t.thatMayOccur}. ${t.temporaryConditions}. ${t.checkStatus}.`;
  }
}

function mergeTafWithOpenMeteo(tafPeriods: ForecastChange[], openMeteoData: OpenMeteoResponse, language: 'en' | 'pl'): ForecastChange[] {
  const t = translations[language];

  const mergedPeriods = tafPeriods.map(period => {
    // Preserve the original risk level and translations
    const originalRiskLevel = period.riskLevel;
    
    // ... existing merge logic ...
    
    // Get translations for the risk level
    const riskTranslations = {
      1: {
        title: t.riskLevel1Title,
        message: t.riskLevel1Message,
        status: t.riskLevel1Status
      },
      2: {
        title: t.riskLevel2Title,
        message: t.riskLevel2Message,
        status: t.riskLevel2Status
      },
      3: {
        title: t.riskLevel3Title,
        message: t.riskLevel3Message,
        status: t.riskLevel3Status
      },
      4: {
        title: t.riskLevel4Title,
        message: t.riskLevel4Message,
        status: t.riskLevel4Status
      }
    };
    
    // Ensure we keep the original translations if risk level hasn't changed
    if (period.riskLevel.level === originalRiskLevel.level) {
      period.riskLevel = originalRiskLevel;
    } else {
      // If risk level has changed, get new translations
      period.riskLevel = {
        ...period.riskLevel,
        title: riskTranslations[period.riskLevel.level].title,
        message: riskTranslations[period.riskLevel.level].message,
        statusMessage: riskTranslations[period.riskLevel.level].status
      };
    }
    
    return period;
  });

  return mergedPeriods;
}

/**
 * Fill ALL gaps in forecast with Open-Meteo data
 * This creates complete 48h coverage using real Open-Meteo data for missing periods
 */
function extendForecastWithOpenMeteo(
  tafPeriods: ForecastChange[], 
  openMeteoData: OpenMeteoResponse, 
  language: 'en' | 'pl'
): ForecastChange[] {
  const t = translations[language];
  const now = new Date();
  
  // Create a map of hours that are covered by TAF
  const tafCoverage = new Set<string>();
  tafPeriods.forEach(period => {
    const start = new Date(period.from);
    const end = new Date(period.to);
    
    for (let time = start.getTime(); time < end.getTime(); time += 60 * 60 * 1000) {
      const hourKey = new Date(time).toISOString().split(':')[0]; // "2024-01-20T14"
      tafCoverage.add(hourKey);
    }
  });
  
  // Create hourly periods from Open-Meteo for ALL gaps (not just after TAF)
  const openMeteoPeriods: ForecastChange[] = [];
  
  for (let i = 0; i < openMeteoData.hourly.time.length; i++) {
    const hourTime = new Date(openMeteoData.hourly.time[i]);
    const hourKey = hourTime.toISOString().split(':')[0];
    
    // Only create periods for gaps and within 48h from now
    const hoursFromNow = (hourTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (tafCoverage.has(hourKey) || hoursFromNow > 48 || hoursFromNow < 0) {
      continue;
    }
    
    // Get Open-Meteo data for this hour
    const temp = openMeteoData.hourly.temperature_2m[i];
    const windSpeedMs = openMeteoData.hourly.wind_speed_10m[i]; // m/s
    const windGustsMs = openMeteoData.hourly.wind_gusts_10m[i]; // m/s
    const visibility = openMeteoData.hourly.visibility[i];
    const precipitation = openMeteoData.hourly.precipitation[i];
    
    // Convert wind from m/s to knots (1 m/s = 1.94384 knots)
    const windSpeed = Math.round(windSpeedMs * 1.94384);
    const windGusts = Math.round(windGustsMs * 1.94384);
    
    // Calculate risk level from Open-Meteo data
    const windRisk = calculateWindRisk({ speed_kts: windSpeed, gust_kts: windGusts });
    const visibilityRisk = calculateVisibilityRisk(visibility);
    
    // Simple precipitation risk from Open-Meteo data
    let precipRisk: 1 | 2 | 3 | 4 = 1;
    if (precipitation > 10) precipRisk = 4;
    else if (precipitation > 5) precipRisk = 3;
    else if (precipitation > 1) precipRisk = 2;
    
    const riskLevel = Math.max(windRisk, visibilityRisk, precipRisk) as 1 | 2 | 3 | 4;
    
    // Generate phenomena based on Open-Meteo data
    const phenomena: string[] = [];
    
    // Precipitation phenomena
    if (precipitation > 0.5) {
      if (temp <= 0) {
        phenomena.push(language === 'pl' ? 'Śnieg' : 'Snow');
      } else if (temp < 4 && precipitation > 2) {
        phenomena.push(language === 'pl' ? 'Marznący deszcz' : 'Freezing rain');
      } else {
        phenomena.push(language === 'pl' ? 'Deszcz' : 'Rain');
      }
    }
    
    // Visibility phenomena
    if (visibility < 5000) {
      if (temp <= 0 && visibility < 1000) {
        phenomena.push(language === 'pl' ? 'Mgła marznąca' : 'Freezing fog');
      } else if (visibility < 1000) {
        phenomena.push(language === 'pl' ? 'Mgła' : 'Fog');
      } else {
        phenomena.push(language === 'pl' ? 'Zamglenie' : 'Mist');
      }
    }
    
    // Wind phenomena
    if (windGusts > 35) {
      phenomena.push(language === 'pl' ? 'Silne podmuchy wiatru' : 'Strong wind gusts');
    } else if (windSpeed > 25) {
      phenomena.push(language === 'pl' ? 'Silny wiatr' : 'Strong winds');
    }
    
    // Generate operational impacts
    const operationalImpacts: string[] = [];
    
    if (visibility < 550) {
      const deviation = Math.round(((550 - visibility) / 550) * 100);
      operationalImpacts.push(
        language === 'pl'
          ? `Widoczność ${visibility}m - ${deviation}% poniżej minimum (550m)`
          : `Visibility ${visibility}m - ${deviation}% below minimum (550m)`
      );
    }
    
    if (windGusts > 20) {
      operationalImpacts.push(
        language === 'pl'
          ? `Podmuchy wiatru ${Math.round(windGusts)}kt mogą wpłynąć na operacje naziemne`
          : `Wind gusts ${Math.round(windGusts)}kt may affect ground operations`
      );
    }
    
    // Create the period (hourly)
    const periodEnd = new Date(hourTime);
    periodEnd.setHours(periodEnd.getHours() + 1);
    
    openMeteoPeriods.push({
      timeDescription: `${hourTime.getHours()}:00`,
      from: hourTime,
      to: periodEnd,
      changeType: 'PERSISTENT',
      conditions: {
        visibility: {
          meters: Math.round(visibility)
        },
        phenomena: phenomena.length > 0 ? phenomena : []
      },
      wind: {
        speed_kts: Math.round(windSpeed),
        gust_kts: windGusts ? Math.round(windGusts) : undefined
      },
      visibility: {
        meters: Math.round(visibility)
      },
      riskLevel: {
        level: riskLevel,
        title: t[`riskLevel${riskLevel}Title` as keyof typeof t] as string,
        message: t[`riskLevel${riskLevel}Message` as keyof typeof t] as string,
        statusMessage: t[`riskLevel${riskLevel}Status` as keyof typeof t] as string,
        color: getRiskColor(riskLevel)
      },
      operationalImpacts: operationalImpacts.length > 0 ? operationalImpacts : undefined,
      isTemporary: false,
      probability: undefined,
      language: language
    });
  }
  
  // Combine TAF and Open-Meteo periods and sort chronologically
  return [...tafPeriods, ...openMeteoPeriods].sort((a, b) => a.from.getTime() - b.from.getTime());
}


async function getOpenMeteoData(): Promise<OpenMeteoResponse> {
  const data = await fetchOpenMeteoForecast();
  if (!data) {
    throw new Error('Failed to fetch OpenMeteo data');
  }
  return {
    hourly: {
      time: data.hourly.time,
      temperature_2m: data.hourly.temperature_2m,
      wind_speed_10m: data.hourly.wind_speed_10m,
      wind_gusts_10m: data.hourly.wind_gusts_10m,
      visibility: data.hourly.visibility,
      precipitation: data.hourly.precipitation
    }
  };
}

function mergeOverlappingPeriods(periods: ForecastChange[]): ForecastChange[] {
  // Create timeline events
  const events: { time: Date; type: 'start' | 'end'; period: ForecastChange }[] = [];
  periods.forEach(period => {
    events.push({ time: period.from, type: 'start', period });
    events.push({ time: period.to, type: 'end', period });
  });

  // Sort events chronologically
  events.sort((a, b) => {
    const timeCompare = a.time.getTime() - b.time.getTime();
    if (timeCompare === 0) {
      // If times are equal, process 'end' before 'start'
      return a.type === 'end' ? -1 : 1;
    }
    return timeCompare;
  });

  const result: ForecastChange[] = [];
  let activeTempo: ForecastChange | null = null;
  let activeBase: ForecastChange | null = null;
  let lastTime: Date | null = null;

  events.forEach(event => {
    // If we have a previous time and active period, add the interval
    if (lastTime && (activeTempo || activeBase)) {
      const activePeriod = activeTempo || activeBase;
      if (activePeriod && lastTime < event.time) {
        result.push({
          ...activePeriod,
          from: lastTime,
          to: event.time,
          language: activePeriod.language
        });
      }
    }

    // Update active periods
    if (event.type === 'start') {
      if (event.period.isTemporary) {
        activeTempo = event.period;
      } else {
        activeBase = event.period;
      }
    } else { // 'end'
      if (event.period.isTemporary) {
        activeTempo = null;
      } else {
        activeBase = null;
      }
    }

    lastTime = event.time;
  });

  // Sort final results by start time
  return result.sort((a, b) => a.from.getTime() - b.from.getTime());
}

// Add this interface if it doesn't exist


// Add these helper functions if they don't exist
function getRiskStatus(level: number, language: 'en' | 'pl'): string {
  const t = translations[language];
  switch (level) {
    case 4: return t.riskLevel4Status;
    case 3: return t.riskLevel3Status;
    case 2: return t.riskLevel2Status;
    default: return t.riskLevel1Status;
  }
}

function getRiskColor(level: number): 'red' | 'orange' | 'green' {
  switch (level) {
    case 4: return "red";
    case 3: return "red";  // Changed from orange to match UI
    case 2: return "orange";  // Changed from yellow to match UI
    default: return "green";
  }
}

// Update the function signature to match usage
function mergeConsecutiveSimilarPeriods(periods: ForecastChange[]): ForecastChange[] {
  if (periods.length <= 1) return periods;
  
  const result: ForecastChange[] = [];
  let currentPeriod = periods[0];
  
  for (let i = 1; i < periods.length; i++) {
    const nextPeriod = periods[i];
    
    if (arePeriodsSimilar(currentPeriod, nextPeriod) && 
        arePeriodsConsecutive(currentPeriod, nextPeriod)) {
      currentPeriod = {
        ...currentPeriod,
        to: nextPeriod.to,
        riskLevel: {
          level: currentPeriod.riskLevel.level,
          title: getRiskTitle(currentPeriod.riskLevel.level, currentPeriod.language),
          message: getRiskMessage(currentPeriod.riskLevel.level, currentPeriod.language),
          statusMessage: getRiskStatus(currentPeriod.riskLevel.level, currentPeriod.language),
          color: getRiskColor(currentPeriod.riskLevel.level)
        }
      };
    } else {
      result.push(currentPeriod);
      currentPeriod = nextPeriod;
    }
  }
  
  result.push(currentPeriod);
  return result;
}


function arePeriodsConsecutive(a: ForecastChange, b: ForecastChange): boolean {
  // Allow for 1-minute gap to handle potential rounding
  return Math.abs(b.from.getTime() - a.to.getTime()) <= 60000;
}

// Helper function to check if two forecast changes can be merged
function arePeriodsSimilar(a: ForecastChange, b: ForecastChange): boolean {
  // Don't merge if they have different risk levels
  if (a.riskLevel.level !== b.riskLevel.level) return false;
  
  // Don't merge temporary with non-temporary periods
  if (a.isTemporary !== b.isTemporary) return false;
  
  // Don't merge if they have different probabilities
  if (a.probability !== b.probability) return false;
  
  // Don't merge if they have different change types
  if (a.changeType !== b.changeType) return false;

  // Don't merge if they have significantly different visibility
  // FIX: use !== undefined to handle 0m visibility!
  if (a.visibility?.meters !== undefined && b.visibility?.meters !== undefined) {
    const visDiff = Math.abs(a.visibility.meters - b.visibility.meters);
    // Don't merge if visibility differs by more than 1000m
    if (visDiff > 1000) return false;
  } else if ((a.visibility?.meters ?? null) !== (b.visibility?.meters ?? null)) {
    // One has visibility, the other doesn't - don't merge
    return false;
  }

  // Don't merge if they have significantly different ceiling
  // FIX: use !== undefined to handle 0ft ceiling!
  if (a.ceiling?.feet !== undefined && b.ceiling?.feet !== undefined) {
    const ceilingDiff = Math.abs(a.ceiling.feet - b.ceiling.feet);
    // Don't merge if ceiling differs by more than 500ft
    if (ceilingDiff > 500) return false;
  } else if ((a.ceiling?.feet ?? null) !== (b.ceiling?.feet ?? null)) {
    // One has ceiling, the other doesn't - don't merge
    return false;
  }

  // Compare phenomena
  const aPhenomena = new Set(a.conditions.phenomena.filter(p => 
    !p.includes('Brak szczególnych zjawisk') && 
    !p.includes('No significant weather')
  ));
  const bPhenomena = new Set(b.conditions.phenomena.filter(p => 
    !p.includes('Brak szczególnych zjawisk') && 
    !p.includes('No significant weather')
  ));
  
  // If either period has phenomena, compare them exactly
  if (aPhenomena.size > 0 || bPhenomena.size > 0) {
    if (aPhenomena.size !== bPhenomena.size) return false;
    return Array.from(aPhenomena).every(p => bPhenomena.has(p)) &&
           Array.from(bPhenomena).every(p => aPhenomena.has(p));
  }
  
  // If neither has phenomena, they can be merged only if they have the same risk level
  return a.riskLevel.level === b.riskLevel.level;
}

// Update type definitions for multipliers
// Update compound effect calculations to be less aggressive
const COMPOUND_EFFECTS = {
  // Synergistic effects between different weather phenomena
  SYNERGY: {
    WIND_PRECIP: 1.3,   // Decreased from 1.6
    WIND_VIS: 1.3,      // Decreased from 1.5
    PRECIP_VIS: 1.2,    // Decreased from 1.4
    WIND_TEMP: 1.15,    // Decreased from 1.3
    FULL_STORM: 1.5     // Decreased from 1.8
  },
  // Threshold adjustments for compound effects
  THRESHOLDS: {
    WIND_SPEED: 15,     // Increased from 12 knots
    PRECIP_RATE: 2.0,   // Increased from 1.5 mm/hr
    VIS_METERS: 3000,   // Decreased from 3500 meters
    TEMP_C: 3          // Decreased from 5 Celsius
  }
} as const;

// Update calculateRiskLevel function to handle both automatic conditions and temporary conditions
export async function calculateRiskLevel(
  period: WeatherPeriod, 
  language: 'en' | 'pl', 
  warnings: Record<string, string>
): Promise<RiskLevel> {
  const t = translations[language];
  
  // Calculate base risks (await the async ones)
  const visibilityRisk = calculateVisibilityRisk(period.visibility?.meters);
  const windRisk = calculateWindRisk(period.wind);
  const weatherRisk = await calculateWeatherPhenomenaRisk(period.conditions);
  const ceilingRisk = calculateCeilingRisk(period.clouds, period.conditions);

  // Get probability from TAF
  const probability = period.change?.probability || 100;
  
  // Calculate initial operational impacts (await the async function)
  const impacts = await calculateOperationalImpacts(period, language, warnings);

  // Probability scaling (no time-based adjustments)
  const probabilityFactor = getProbabilityFactor(probability);

  // Apply probability scaling to risks
  const scaledVisibilityRisk = visibilityRisk * probabilityFactor;
  const scaledWindRisk = windRisk * probabilityFactor;
  const scaledWeatherRisk = weatherRisk * probabilityFactor;
  const scaledCeilingRisk = ceilingRisk * probabilityFactor;

  // Count severe and moderate conditions using base risks (before adjustments)
  const severeConditions = [
    visibilityRisk >= 85,
    windRisk >= 85,
    weatherRisk >= 85,
    ceilingRisk >= 85
  ].filter(Boolean).length;

  const moderateConditions = [
    visibilityRisk >= 70,
    windRisk >= 70,
    weatherRisk >= 70,
    ceilingRisk >= 70
  ].filter(Boolean).length;

  // Calculate compound effect for multiple severe conditions
  if (severeConditions >= 3) {
    // Three or more severe conditions - extreme compound effect
    impacts.push(t.operationalImpactMessages.multipleConditions);
  } else if (severeConditions === 2) {
    // Two severe conditions - strong compound effect
    impacts.push(t.operationalImpactMessages.combinedConditions);
  }

  // Special handling for freezing conditions with temperature enhancement
  const hasExtremeFreezing = period.conditions?.some(c => 
    c.code === 'FZFG' || c.code === 'FZRA' || c.code === 'FZDZ'
  );
  const hasFreezing = period.conditions?.some(c => 
    c.code.includes('FZ') // Any freezing condition
  );

  // Temperature-enhanced icing risk multiplier
  let icingMultiplier = 1.0;
  if (hasExtremeFreezing && period.temperature?.celsius !== undefined) {
    const temp = period.temperature.celsius;
    
    if (temp <= -5) {
      icingMultiplier = 1.3;  // Severe icing: instant freeze
      impacts.push(
        language === 'pl'
          ? `❄️ Ekstremalne ryzyko oblodzenia przy temperaturze ${temp}°C - natychmiastowe zamarzanie`
          : `❄️ Extreme icing risk at ${temp}°C - instant freezing`
      );
    } else if (temp <= 0) {
      icingMultiplier = 1.2;  // High icing: rapid accumulation
      impacts.push(
        language === 'pl'
          ? `❄️ Wysokie ryzyko oblodzenia przy temperaturze ${temp}°C - szybka akumulacja`
          : `❄️ High icing risk at ${temp}°C - rapid accumulation`
      );
    } else if (temp <= 3) {
      icingMultiplier = 1.1;  // Moderate icing: possible accumulation
      impacts.push(
        language === 'pl'
          ? `❄️ Umiarkowane ryzyko oblodzenia przy temperaturze ${temp}°C`
          : `❄️ Moderate icing risk at ${temp}°C`
      );
    }
  }

  // Apply icing multiplier to weather risk if we have freezing conditions
  const adjustedWeatherRisk = hasExtremeFreezing ? weatherRisk * icingMultiplier : weatherRisk;

  // Determine risk level
  let riskLevel: 1 | 2 | 3 | 4;

  // Edge case: Extreme conditions - automatic level 4
  // 1. Extreme low visibility (< 200m) - FIX: use !== undefined to handle 0m!
  if (period.visibility?.meters !== undefined && period.visibility.meters < 200) {
    riskLevel = 4;
    impacts.push(t.operationalImpactMessages.operationsSuspended);
  }
  // 2. Extreme winds (gusts >= 50kt or sustained >= 40kt)
  else if ((period.wind?.gust_kts && period.wind.gust_kts >= 50) || 
           (period.wind?.speed_kts && period.wind.speed_kts >= 40)) {
    riskLevel = 4;
    impacts.push(t.operationalImpactMessages.dangerousGusts);
  }
  // 3. Extreme low temperature with precipitation (< -20°C + snow/rain)
  else if (period.temperature?.celsius !== undefined && 
           period.temperature.celsius < -20 && 
           period.conditions?.some(c => c.code.includes('SN') || c.code.includes('RA'))) {
    riskLevel = 4;
    impacts.push(t.operationalImpactMessages.severeIcingRisk);
  }
  // 4. Multiple freezing phenomena (FZRA + FZFG, etc.)
  else if ((period.conditions?.filter(c => c.code.includes('FZ')).length ?? 0) >= 2) {
    riskLevel = 4;
    impacts.push(t.operationalImpactMessages.severeFreezing);
  }
  // 5. Thunderstorm with multiple severe phenomena
  else if (period.conditions?.some(c => c.code.includes('TS')) && 
           (adjustedWeatherRisk >= 90 || severeConditions >= 2)) {
    riskLevel = 4;
    impacts.push(t.operationalImpactMessages.severeThunderstorm);
  }
  // Automatic level 4 conditions
  else if (
    (hasExtremeFreezing && probability >= 30) || // FZFG/FZRA/FZDZ are extremely dangerous - lower threshold
    (severeConditions >= 2 && probability >= 30) ||
    (period.conditions?.some(c => 
      c.code.includes('TS') && 
      period.clouds?.some(cloud => cloud.type === 'CB' || cloud.cloudType === 'CB')
    ) && probability >= 30) ||
    (period.conditions?.some(c => 
      (c.code.includes('+SN') || c.code.includes('FZRA')) &&
      period.temperature?.celsius !== undefined && 
      period.temperature.celsius <= 0
    ) && probability >= 30) ||
    (period.visibility?.meters !== undefined && 
     period.visibility.meters <= MINIMUMS.VISIBILITY && 
     probability >= 30) ||
    (period.clouds?.some(c => 
      c.base_feet_agl !== undefined && 
      c.base_feet_agl <= MINIMUMS.CEILING
    ) && probability >= 30)
  ) {
    riskLevel = 4;
  }
  // Level 3 conditions
  else if (
    (severeConditions >= 1 && probability >= 30) ||
    (moderateConditions >= 2 && probability >= 40) || // More sensitive to multiple moderate conditions
    (period.visibility?.meters !== undefined && period.visibility.meters <= 1000 && probability >= 40) || // More sensitive to very low visibility - FIX: !== undefined for 0m!
    Math.max(scaledVisibilityRisk, scaledWindRisk, scaledWeatherRisk, scaledCeilingRisk) >= 85
  ) {
    riskLevel = 3;
  }
  // Level 2 conditions
  else if (
    (moderateConditions >= 1 && probability >= 30) ||
    (period.visibility?.meters !== undefined && period.visibility.meters <= 3000) || // Any visibility <= 3000m is at least level 2 - FIX: !== undefined for 0m!
    Math.max(scaledVisibilityRisk, scaledWindRisk, scaledWeatherRisk, scaledCeilingRisk) >= 70
  ) {
    riskLevel = 2;
  }
  // Level 1 - good conditions
  else {
    riskLevel = 1;
  }

  // Add additional operational impacts based on specific conditions - FIX: !== undefined for 0m!
  if (period.visibility?.meters !== undefined && period.visibility.meters < 1500) {
    impacts.push(t.operationalImpactMessages.reducedCapacity);
  }

  if (period.conditions?.some(c => ['SN', 'SHSN'].includes(c.code))) {
    impacts.push(t.operationalImpactMessages.runwayClearing);
  }

  // Check for CB (Cumulonimbus) clouds
  if (period.clouds?.some(c => c.cloudType === 'CB' || c.type === 'CB')) {
    impacts.push(t.operationalImpactMessages.cumulonimbusDetected);
  }

  // Check for TCU (Towering Cumulus) clouds
  if (period.clouds?.some(c => c.cloudType === 'TCU' || c.type === 'TCU')) {
    impacts.push(t.operationalImpactMessages.toweringCumulusDetected);
  }

  // Check for very low FEW/SCT clouds (< 200ft) - but only if NOT in fog/mist
  // In fog, low scattered clouds are part of the fog layer, not a separate concern
  const hasFogOrMist = period.conditions?.some(c => c.code === 'FG' || c.code === 'BR' || c.code === 'MIFG');
  
  if (!hasFogOrMist && period.clouds?.some(c => 
    (c.code === 'FEW' || c.code === 'SCT') && 
    c.base_feet_agl !== undefined && 
    c.base_feet_agl < 200
  )) {
    impacts.push(t.operationalImpactMessages.veryLowScatteredClouds);
  }

  // Crosswind operational impacts for EPKK runways
  if (period.wind?.direction !== undefined && period.wind?.speed_kts) {
    const { crosswind, runway } = calculateCrosswind(
      period.wind.direction,
      period.wind.speed_kts,
      period.wind.gust_kts
    );
    
    // Only show warning when crosswind exceeds operational limits
    if (crosswind >= MINIMUMS.CROSSWIND) {
      impacts.push(
        language === 'pl'
          ? `💨 Wiatr boczny ${crosswind}kt przekracza limit (${MINIMUMS.CROSSWIND}kt) dla pasa ${runway}`
          : `💨 Crosswind ${crosswind}kt exceeds limit (${MINIMUMS.CROSSWIND}kt) for runway ${runway}`
      );
      // Ensure at least risk level 3 for crosswind exceedance
      riskLevel = Math.max(riskLevel, 3) as 1 | 2 | 3 | 4;
    }
  }

  // Get translations for the risk level
  const riskTranslations = {
    1: {
      title: t.riskLevel1Title,
      message: t.riskLevel1Message,
      status: t.riskLevel1Status
    },
    2: {
      title: t.riskLevel2Title,
      message: t.riskLevel2Message,
      status: t.riskLevel2Status
    },
    3: {
      title: t.riskLevel3Title,
      message: t.riskLevel3Message,
      status: t.riskLevel3Status
    },
    4: {
      title: t.riskLevel4Title,
      message: t.riskLevel4Message,
      status: t.riskLevel4Status
    }
  };

  return {
    level: riskLevel,
    title: riskTranslations[riskLevel].title,
    message: riskTranslations[riskLevel].message,
    statusMessage: riskTranslations[riskLevel].status,
    color: getRiskColor(riskLevel),
    operationalImpacts: impacts
  };
}

// Add helper function for visibility risk calculation
function calculateVisibilityRisk(meters: number | undefined): number {
  // FIX: use !== undefined to handle 0m visibility!
  if (meters === undefined) return 0;
  if (meters < MINIMUMS.VISIBILITY) return 100;
  
  // Use exponential scaling for better sensitivity to near-minimums
  const visibilityRatio = meters / MINIMUMS.VISIBILITY;
  if (visibilityRatio < 2.0) {
    return Math.min(100, 100 * Math.exp(-visibilityRatio + 1)); // Use exponential function
  }
  
  // Adjust base risks for visibility
  if (meters < 1000) return 90;
  if (meters < 3000) return 60;
  if (meters < 5000) return 30;
  return 0;
}


// Add helper function for weather phenomena risk calculation
async function calculateWeatherPhenomenaRisk(conditions: { code: string }[] | undefined): Promise<number> {
  if (!conditions) return 0;
  
  // Note: Snow tracking is updated only in assessOperationalImpacts() for current weather (METAR)
  // This function is called for forecast periods, so we only READ the snow state, not update it
  
  let maxRisk = 0;
  let severeCount = 0;
  
  conditions.forEach(condition => {
    const risk = RISK_WEIGHTS.PHENOMENA_SEVERE[condition.code as keyof typeof RISK_WEIGHTS.PHENOMENA_SEVERE] ||
                RISK_WEIGHTS.PHENOMENA_MODERATE[condition.code as keyof typeof RISK_WEIGHTS.PHENOMENA_MODERATE] ||
                0;
    
    if (risk >= 70) severeCount++;
    maxRisk = Math.max(maxRisk, risk);
  });
  
  // Apply snow duration multiplier if applicable (only read state, don't update)
  const snowInfo = await getSnowDurationInfo();
  if (snowInfo.duration > 0) {
    maxRisk = Math.min(100, maxRisk * snowInfo.riskMultiplier);
  }
  
  // Increase risk if multiple severe conditions
  if (severeCount > 1) {
    maxRisk = Math.min(100, maxRisk * (1 + (severeCount - 1) * 0.2));
  }
  
  return maxRisk;
}

// Add helper function for ceiling risk calculation
function calculateCeilingRisk(
  clouds: { code: string; base_feet_agl?: number; type?: string; cloudType?: 'CB' | 'TCU' }[] | undefined,
  conditions?: { code: string }[]
): number {
  if (!clouds) return 0;
  
  // Check if there's an active thunderstorm (TS) at the airport
  const hasActiveThunderstorm = conditions?.some(c => c.code.includes('TS'));
  
  let maxRisk = 0;
  clouds.forEach(cloud => {
    // Check for CB (Cumulonimbus) - risk varies by coverage and activity
    if (cloud.cloudType === 'CB' || cloud.type === 'CB') {
      let cbRisk = 0;
      
      // Base risk depends on coverage: isolated CB vs multiple cells
      if (cloud.code === 'FEW') {
        // FEW CB - isolated cell, can often be avoided
        cbRisk = 75;
        console.log(`⚠️ Isolated CB at ${cloud.base_feet_agl}ft - thunderstorm cell nearby`);
      } else if (cloud.code === 'SCT') {
        // SCT CB - scattered cells, harder to avoid
        cbRisk = 85;
        console.log(`⚠️ Scattered CB at ${cloud.base_feet_agl}ft - multiple thunderstorm cells`);
      } else {
        // BKN/OVC CB - organized system, very dangerous
        cbRisk = 95;
        console.log(`⚠️ Broken/Overcast CB at ${cloud.base_feet_agl}ft - organized thunderstorm system`);
      }
      
      // Boost risk if there's an active TS code (thunderstorm AT the airport)
      if (hasActiveThunderstorm && cbRisk < 95) {
        cbRisk = Math.min(95, cbRisk + 10);
        console.log(`⚠️ Active thunderstorm (TS) with CB - increased risk to ${cbRisk}`);
      }
      
      maxRisk = Math.max(maxRisk, cbRisk);
    }
    
    // Check for TCU (Towering Cumulus) - developing weather
    if (cloud.cloudType === 'TCU' || cloud.type === 'TCU') {
      // TCU indicates developing convection - high risk
      maxRisk = Math.max(maxRisk, 80);
      console.log(`⚠️ TCU (Towering Cumulus) detected at ${cloud.base_feet_agl}ft - Developing weather!`);
    }
    
    // Check very low FEW/SCT clouds - but only if NOT in fog/mist
    // In fog (FG/BR), low scattered clouds are part of the fog layer, not a separate concern
    // Note: Kraków (EPKK) ILS minimums ~200ft, so only very low scattered clouds are concerning
    const hasFogOrMist = conditions?.some(c => c.code === 'FG' || c.code === 'BR' || c.code === 'MIFG');
    
    if ((cloud.code === 'FEW' || cloud.code === 'SCT') && cloud.base_feet_agl !== undefined && !hasFogOrMist) {
      if (cloud.base_feet_agl < 200) {
        // Extremely low scattered clouds WITHOUT fog - possible deterioration
        maxRisk = Math.max(maxRisk, 50);
        console.log(`⚠️ Very low ${cloud.code} clouds at ${cloud.base_feet_agl}ft without fog - Watch for deterioration`);
      } else if (cloud.base_feet_agl < 300) {
        // Low scattered clouds - monitor for deterioration
        maxRisk = Math.max(maxRisk, 30);
        console.log(`⚠️ Low ${cloud.code} clouds at ${cloud.base_feet_agl}ft - Monitoring conditions`);
      }
    }
    
    // Standard ceiling calculation for BKN/OVC
    // FIX: use !== undefined to handle 0ft ceiling (BKN000/OVC000)!
    if ((cloud.code === 'BKN' || cloud.code === 'OVC') && cloud.base_feet_agl !== undefined) {
      if (cloud.base_feet_agl < MINIMUMS.CEILING) {
        maxRisk = Math.max(maxRisk, 100);
      } else {
        // Use exponential scaling for better sensitivity to near-minimums
        const ceilingRatio = cloud.base_feet_agl / MINIMUMS.CEILING;
        if (ceilingRatio < 2.5) {
          maxRisk = Math.max(maxRisk, Math.min(100, 100 * Math.exp(-ceilingRatio + 1))); // Use exponential function
        } else if (cloud.base_feet_agl < 500) {
          maxRisk = Math.max(maxRisk, 80);
        } else if (cloud.base_feet_agl < 1000) {
          maxRisk = Math.max(maxRisk, 50);
        }
      }
      
      // Additional risk multiplier for CB clouds in BKN/OVC layers
      if (cloud.cloudType === 'CB' || cloud.type === 'CB') {
        maxRisk = Math.min(100, maxRisk * 1.2); // Additional boost for ceiling + CB
      }
    }
  });
  
  return maxRisk;
}


// Add helper function to get OpenMeteo weight based on condition type and age
function getOpenMeteoWeight(
  condition: keyof typeof SOURCE_WEIGHTS.OPENMETEO_PRIORITY,
  dataTime: Date
): number {
  const baseWeight = SOURCE_WEIGHTS.OPENMETEO_PRIORITY[condition] || 
                    SOURCE_WEIGHTS.OPENMETEO_PRIORITY.default;
  
  const age = Date.now() - dataTime.getTime();
  const intervalsPassed = age / SOURCE_WEIGHTS.UPDATE_INTERVALS.OPENMETEO;
  
  // Reduce weight by 10% for each interval passed
  const ageFactor = Math.max(0.5, 1 - (intervalsPassed * 0.1));
  return baseWeight * ageFactor;
}

// Fine-tune probability factor to ensure PROB40 is more impactful
function getProbabilityFactor(probability: number): number {
  if (probability >= 80) return 1.0;     
  if (probability >= 60) return 0.95;    
  if (probability >= 40) return 0.85;    // Slightly reduced from 0.9 to 0.85 for better balance
  if (probability >= 30) return 0.7;     
  return 0.5;                            
}


// Add snow duration thresholds
const SNOW_DURATION = {
  THRESHOLDS: {
    PROLONGED: 6 * 60 * 60 * 1000,  // 6 hours in milliseconds
    EXTENDED: 3 * 60 * 60 * 1000,   // 3 hours in milliseconds
    MODERATE: 1 * 60 * 60 * 1000    // 1 hour in milliseconds
  },
  RISK_MULTIPLIERS: {
    PROLONGED: {
      HEAVY: 1.5,     // 50% increase for prolonged heavy snow
      MODERATE: 1.3,  // 30% increase for prolonged moderate snow
      LIGHT: 1.0      // No increase for prolonged light snow - airport can handle it
    },
    EXTENDED: {
      HEAVY: 1.3,     // 30% increase for extended heavy snow
      MODERATE: 1.2,  // 20% increase for extended moderate snow
      LIGHT: 1.0      // No increase for extended light snow - airport can handle it
    },
    MODERATE: {
      HEAVY: 1.2,     // 20% increase for moderate duration heavy snow
      MODERATE: 1.1,  // 10% increase for moderate duration moderate snow
      LIGHT: 1.0      // No increase for moderate duration light snow - airport can handle it
    }
  }
} as const;

// Update recovery durations to be more intensity-dependent
const SNOW_RECOVERY = {
  DURATION: {
    HEAVY: 90 * 60 * 1000,    // 90 minutes recovery after heavy snow
    MODERATE: 45 * 60 * 1000, // 45 minutes recovery after moderate snow
    LIGHT: 10 * 60 * 1000     // Only 10 minutes recovery after light snow - airport is well prepared
  },
  RISK_REDUCTION: {
    INITIAL_RETAIN: {
      HEAVY: 0.8,    // Retain 80% of risk initially after heavy snow
      MODERATE: 0.6, // Retain 60% of risk initially after moderate snow
      LIGHT: 0.2     // Retain only 20% of risk initially after light snow - minimal impact
    },
    FINAL_RETAIN: {
      HEAVY: 0.2,    // Retain 20% of risk at end of recovery after heavy snow
      MODERATE: 0.1, // Retain 10% of risk at end of recovery after moderate snow
      LIGHT: 0.0     // No risk retention at end of recovery after light snow
    }
  }
} as const;

// Snow tracking state interface
interface SnowTrackingState {
  startTime: number | null;
  intensity: 'HEAVY' | 'MODERATE' | 'LIGHT' | null;
  lastUpdate: number;
  recoveryStartTime: number | null;
}

const SNOW_TRACKING_KEY = 'snow_tracking_state_epkk';

// In-memory cache to avoid repeated Redis calls during forecast processing
let snowStateCache: { state: SnowTrackingState; timestamp: number } | null = null;
const CACHE_TTL = 1000; // 1 second - enough to avoid repeated calls during single forecast processing

// Helper function to get snow tracking state from Redis (with caching)
async function getSnowTrackingState(): Promise<SnowTrackingState> {
  const now = Date.now();
  
  // Return cached state if it's fresh (less than 1 second old)
  if (snowStateCache && (now - snowStateCache.timestamp) < CACHE_TTL) {
    // Cache hit - no logging to reduce spam
    return snowStateCache.state;
  }

  const defaultState: SnowTrackingState = {
    startTime: null,
    intensity: null,
    lastUpdate: now,
    recoveryStartTime: null
  };

  try {
    // First check if Redis is available
    if (!redis) {
      console.warn('⚠️ Redis not initialized, using in-memory state');
      snowStateCache = { state: defaultState, timestamp: now };
      return defaultState;
    }

    if (!await validateRedisConnection()) {
      console.warn('⚠️ Redis connection failed, using in-memory state');
      snowStateCache = { state: defaultState, timestamp: now };
      return defaultState;
    }

    // Try to get the state (actual Redis call)
    const state = await redis.get<SnowTrackingState>(SNOW_TRACKING_KEY);
    
    // Validate the state structure
    if (state && 
        typeof state === 'object' && 
        ('startTime' in state) && 
        ('intensity' in state) && 
        ('lastUpdate' in state) && 
        ('recoveryStartTime' in state)) {
      // Only log actual Redis fetches
      console.log('✅ Retrieved snow tracking state from Redis (cached for 1s)');
      // Cache the state
      snowStateCache = { state, timestamp: now };
      return state;
    }

    console.warn('⚠️ Invalid state in Redis, using default state');
    snowStateCache = { state: defaultState, timestamp: now };
    return defaultState;
  } catch (error) {
    console.error('Failed to get snow tracking state from Redis:', error);
    snowStateCache = { state: defaultState, timestamp: now };
    return defaultState;
  }
}

// Helper function to update snow tracking state in Redis
async function setSnowTrackingState(state: SnowTrackingState): Promise<void> {
  try {
    // First check if Redis is available
    if (!redis) {
      console.warn('⚠️ Redis not initialized, state update skipped');
      return;
    }

    if (!await validateRedisConnection()) {
      console.warn('⚠️ Redis connection failed, state update skipped');
      return;
    }

    // Validate state before saving
    if (!state || typeof state !== 'object') {
      console.error('Invalid state object:', state);
      return;
    }

    await redis.set(SNOW_TRACKING_KEY, state, { ex: 24 * 60 * 60 }); // 24 hour expiry
    console.log('✅ Updated snow tracking state in Redis:', state);
    
    // Invalidate cache so next read gets fresh data
    snowStateCache = { state, timestamp: Date.now() };
  } catch (error) {
    console.error('Failed to update snow tracking state in Redis:', error);
  }
}

// Add debounce constant at the top with other constants
const SNOW_TRACKING_DEBOUNCE = 5000; // 5 seconds
let lastSnowTrackingUpdate = 0;

// Add lock key constant
const SNOW_TRACKING_LOCK_KEY = 'snow_tracking_lock_epkk';

// Add lock helper functions
async function acquireLock(): Promise<boolean> {
  if (!redis || !await validateRedisConnection()) {
    return true; // If no Redis, proceed without lock
  }
  
  try {
    const lockAcquired = await redis.set(SNOW_TRACKING_LOCK_KEY, 'locked', {
      nx: true, // Only set if key doesn't exist
      ex: 10 // 10 second expiry
    });
    return !!lockAcquired;
  } catch (error) {
    console.error('Error acquiring lock:', error);
    return false;
  }
}

async function releaseLock(): Promise<void> {
  if (!redis || !await validateRedisConnection()) {
    return;
  }
  
  try {
    await redis.del(SNOW_TRACKING_LOCK_KEY);
  } catch (error) {
    console.error('Error releasing lock:', error);
  }
}

// Update the snow tracking function to use locking
async function updateSnowTracking(conditions: { code: string }[] | undefined): Promise<void> {
  if (!conditions) {
    return;
  }

  const now = Date.now();
  
  // Get current state first to check if update is needed
  const currentState = await getSnowTrackingState();
  const hasSnow = conditions.some(c => 
    ['+SN', 'SN', '-SN', '+SHSN', 'SHSN', '-SHSN'].some(code => c.code.includes(code))
  );

  // Determine if we need to update based on current conditions
  const needsUpdate = (
    // Start snow event
    (hasSnow && !currentState.startTime) ||
    // Stop snow event
    (!hasSnow && currentState.startTime && !currentState.recoveryStartTime) ||
    // Check recovery completion
    (!hasSnow && !currentState.startTime && currentState.recoveryStartTime)
  );

  if (!needsUpdate) {
    return;
  }

  // Add debounce check
  if (now - lastSnowTrackingUpdate < SNOW_TRACKING_DEBOUNCE) {
    return;
  }

  // Try to acquire lock
  const lockAcquired = await acquireLock();
  if (!lockAcquired) {
    return;
  }

  try {
    // Re-fetch state after acquiring lock to ensure we have latest data
    const lockedState = await getSnowTrackingState();

    let newState = { ...lockedState };
    let stateChanged = false;

    if (hasSnow) {
      // Determine snow intensity
      const intensity = conditions.some(c => ['+SN', '+SHSN'].includes(c.code)) ? 'HEAVY' :
                       conditions.some(c => ['-SN', '-SHSN'].includes(c.code)) ? 'LIGHT' :
                       conditions.some(c => ['SN', 'SHSN'].includes(c.code)) ? 'MODERATE' :
                       null;

      // Only start new snow event if we're not already tracking one
      if (!lockedState.startTime) {
        console.log('🆕 Starting new snow event:', { intensity });
        newState = {
          startTime: now,
          intensity,
          lastUpdate: now,
          recoveryStartTime: null
        };
        stateChanged = true;
      } else if (lockedState.intensity !== intensity) {
        // Update intensity if it changed
        console.log('📈 Updating snow intensity:', {
          from: lockedState.intensity,
          to: intensity
        });
        newState.intensity = intensity;
        stateChanged = true;
      }
    } else if (lockedState.startTime && !lockedState.recoveryStartTime) {
      // Snow has just stopped - start recovery period
      console.log('🔚 Snow has stopped, starting recovery period');
      newState = {
        startTime: null,
        intensity: lockedState.intensity,  // Keep the last known intensity for recovery calculation
        lastUpdate: now,
        recoveryStartTime: now
      };
      stateChanged = true;
    } else if (!lockedState.startTime && !hasSnow && lockedState.recoveryStartTime) {
      // In recovery period - check if it's complete
      const recoveryDuration = SNOW_RECOVERY.DURATION[lockedState.intensity ?? 'MODERATE'];
      const timeInRecovery = now - lockedState.recoveryStartTime;

      if (timeInRecovery >= recoveryDuration) {
        console.log('✅ Recovery period complete, resetting state');
        newState = {
          startTime: null,
          intensity: null,
          lastUpdate: now,
          recoveryStartTime: null
        };
        stateChanged = true;
      }
    }

    // Only update lastUpdate if other changes occurred
    if (stateChanged) {
      newState.lastUpdate = now;
      
      console.log('💾 Snow tracking state updated:', {
        timestamp: new Date(now).toISOString(),
        startTime: newState.startTime ? new Date(newState.startTime).toISOString() : null,
        intensity: newState.intensity,
        recoveryStartTime: newState.recoveryStartTime ? new Date(newState.recoveryStartTime).toISOString() : null
      });

      await setSnowTrackingState(newState);
      lastSnowTrackingUpdate = now;
    }
  } catch (error) {
    console.error('❌ Error in updateSnowTracking:', error);
  } finally {
    // Always release the lock
    await releaseLock();
  }
}

// Helper function to get current snow duration and risk multiplier
async function getSnowDurationInfo(): Promise<{
  duration: number;
  riskMultiplier: number;
  isInRecovery: boolean;
  recoveryProgress: number;
}> {
  const state = await getSnowTrackingState();
  const now = Date.now();

  if (state.startTime) {
    // Active snow event
    const duration = now - state.startTime;
    const intensity = state.intensity ?? 'MODERATE';
    
    let multiplierCategory: keyof typeof SNOW_DURATION.RISK_MULTIPLIERS;
    if (duration >= SNOW_DURATION.THRESHOLDS.PROLONGED) {
      multiplierCategory = 'PROLONGED';
    } else if (duration >= SNOW_DURATION.THRESHOLDS.EXTENDED) {
      multiplierCategory = 'EXTENDED';
    } else {
      multiplierCategory = 'MODERATE';
    }

    return {
      duration,
      riskMultiplier: SNOW_DURATION.RISK_MULTIPLIERS[multiplierCategory][intensity],
      isInRecovery: false,
      recoveryProgress: 0
    };
  } else if (state.recoveryStartTime) {
    // In recovery period
    const intensity = state.intensity ?? 'MODERATE';
    const recoveryDuration = SNOW_RECOVERY.DURATION[intensity];
    const timeInRecovery = now - state.recoveryStartTime;
    const recoveryProgress = Math.min(1, timeInRecovery / recoveryDuration);
    
    // Calculate risk multiplier during recovery
    const initialRetain = SNOW_RECOVERY.RISK_REDUCTION.INITIAL_RETAIN[intensity];
    const finalRetain = SNOW_RECOVERY.RISK_REDUCTION.FINAL_RETAIN[intensity];
    const currentRetain = initialRetain - (initialRetain - finalRetain) * recoveryProgress;

    return {
      duration: 0,
      riskMultiplier: currentRetain,
      isInRecovery: true,
      recoveryProgress
    };
  }

  // No active snow or recovery
  return {
    duration: 0,
    riskMultiplier: 1,
    isInRecovery: false,
    recoveryProgress: 0
  };
}