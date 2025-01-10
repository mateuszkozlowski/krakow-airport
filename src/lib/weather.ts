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
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';

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

// Add a constant for "close to minimums" threshold
const NEAR_MINIMUMS = {
  CEILING: MINIMUMS.CEILING * 1.5, // 300ft for CAT I minimums of 200ft
  VISIBILITY: MINIMUMS.VISIBILITY * 1.5 // 825m for CAT I minimums of 550m
} as const;

// Risk weights for different conditions tailored to Kraków's usual conditions
const RISK_WEIGHTS = {
  // Severe phenomena
  PHENOMENA_SEVERE: {
    TS: 85,      // Increased due to EPKK patterns
    TSRA: 90,    // Increased for combined effect
    FZRA: 95,    // Critical for EPKK winter ops
    FZDZ: 80,    // Increased for winter ops
    FZFG: 90,    // Higher due to river proximity
    FC: 100,     // Maximum (safety critical)
    '+SN': 70,   // Important for EPKK winter ops
    '+SHSN': 75  // Important for EPKK winter ops
  },
  
  // Moderate phenomena
  PHENOMENA_MODERATE: {
    SN: 60,     // Higher weight for EPKK
    BR: 40,     // Increased due to local conditions
    FG: 80,     // Higher due to geographical location
    RA: 20,     // Slightly increased from paper findings
    SHRA: 30,   // Adjusted based on local patterns
    GR: 85,     // Increased due to aircraft impact
    GS: 50,     // Moderate impact
    '+RA': 40   // Increased from paper findings
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
function assessOperationalImpacts(weather: WeatherData, language: 'en' | 'pl'): string[] {
  const t = translations[language].operationalImpactMessages;
  const impacts: string[] = [];
  const temp = weather.temperature?.celsius ?? 0;
  
  // De-icing assessment based on temperature
  if (temp <= DEICING_CONDITIONS.TEMPERATURE.BELOW_ZERO) {
    if (temp <= DEICING_CONDITIONS.TEMPERATURE.SEVERE) {
      impacts.push(t.deicingDelay);
    } else if (temp <= DEICING_CONDITIONS.TEMPERATURE.HIGH_RISK) {
      impacts.push(t.likelyDeicing);
    } else {
      impacts.push(t.possibleDeicing);
    }
  }

  // Check for precipitation requiring de-icing
  if (weather.conditions?.some(c => DEICING_CONDITIONS.PHENOMENA.has(c.code))) {
    impacts.push(t.activeDeicing);
  }

  // Ground operations impacts for snow conditions
  if (weather.conditions?.some(c => ['+SN', '+SHSN'].includes(c.code))) {
    impacts.push(t.runwayClearing);
    impacts.push(t.deicingDelay);
    impacts.push(t.reducedCapacity);
  } else if (weather.conditions?.some(c => ['SN', 'SHSN'].includes(c.code))) {
    impacts.push(t.runwayClearing);
    impacts.push(t.likelyDeicing);
    impacts.push(t.reducedCapacity);
  } else if (weather.conditions?.some(c => ['-SN', '-SHSN'].includes(c.code))) {
    impacts.push(t.possibleDeicing);
    impacts.push(t.reducedCapacity);
  }

  // Low visibility procedures
  if (weather.visibility?.meters && weather.visibility.meters < 1500) {
    impacts.push(t.reducedCapacity);
  }

  // Strong winds impact
  if (weather.wind?.speed_kts && weather.wind.speed_kts >= 20) {
    impacts.push(t.singleRunway);
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

  // Helper function to get TAF weight based on condition and age
  const getTafWeight = (phenomena: string[], tafTime: Date): number => {
    let baseWeight = SOURCE_WEIGHTS.TAF_PRIORITY.default;
    
    // Find the highest priority phenomenon
    for (const phenomenon of phenomena) {
      for (const [code, weight] of Object.entries(SOURCE_WEIGHTS.TAF_PRIORITY)) {
        if (phenomenon.includes(code) && weight > baseWeight) {
          baseWeight = weight;
        }
      }
    }

    // Adjust weight based on TAF age
    return adjustWeightForAge(
      baseWeight,
      tafTime,
      SOURCE_WEIGHTS.UPDATE_INTERVALS.TAF
    );
  };

  // Helper function to get OpenMeteo weight based on condition type and age
  const getOpenMeteoWeight = (
    condition: keyof typeof SOURCE_WEIGHTS.OPENMETEO_PRIORITY,
    dataTime: Date
  ): number => {
    const baseWeight = SOURCE_WEIGHTS.OPENMETEO_PRIORITY[condition] || 
                      SOURCE_WEIGHTS.OPENMETEO_PRIORITY.default;
    
    return adjustWeightForAge(
      baseWeight,
      dataTime,
      SOURCE_WEIGHTS.UPDATE_INTERVALS.OPENMETEO
    );
  };

  // Helper function to calculate wind-specific risk
  const calculateWindRisk = (conditions: HourlyCondition | undefined): 1 | 2 | 3 | 4 => {
    if (!conditions) return 1;
    
    const { windSpeed, windGusts } = conditions;
    
    if (windGusts >= 35 || windSpeed >= MINIMUMS.MAX_WIND) return 4;
    if (windGusts >= 25 || windSpeed >= 25) return 3;
    if (windSpeed >= 15) return 2;
    return 1;
  };

  // Helper function to calculate precipitation-specific risk
  const calculatePrecipitationRisk = (conditions: HourlyCondition | undefined): 1 | 2 | 3 | 4 => {
    if (!conditions) return 1;
    
    const { precipProb, rain, snow } = conditions;
    
    if (snow > 5 || rain > 10) return 4;
    if (snow > 2 || rain > 5) return 3;
    if ((snow > 0 || rain > 0) && precipProb > 70) return 2;
    return 1;
  };

  return tafForecast.map(period => {
    if (period.isTemporary) return period;

    const periodStart = period.from.toISOString().split('.')[0];
    const openMeteoHour = hourlyConditions.get(periodStart);

    if (!openMeteoHour) return period;

    // Calculate weights based on conditions present and data age
    const tafWeight = getTafWeight(period.conditions.phenomena, period.from);
    
    // Calculate weighted risk level for different aspects
    const riskLevels = {
      taf: period.riskLevel.level,
      openMeteo: calculateOpenMeteoRisk(openMeteoHour)
    };

    // Calculate separate weighted risks for different condition types
    const windWeight = getOpenMeteoWeight('wind_speed', new Date(periodStart));
    const tempWeight = getOpenMeteoWeight('temperature', new Date(periodStart));
    const precipWeight = getOpenMeteoWeight('precipitation', new Date(periodStart));

    // Combine risks with appropriate weights
    const finalRiskLevel = Math.max(
      // Base TAF risk
      period.riskLevel.level,
      
      // Wind risk (weighted)
      Math.round(
        riskLevels.taf * (1 - windWeight) +
        calculateWindRisk(openMeteoHour) * windWeight
      ),
      
      // Precipitation risk (weighted)
      Math.round(
        riskLevels.taf * (1 - precipWeight) +
        calculatePrecipitationRisk(openMeteoHour) * precipWeight
      )
    ) as 1 | 2 | 3 | 4;

    // Update the period with weighted risk level
    if (finalRiskLevel > period.riskLevel.level) {
      period.riskLevel = {
        ...period.riskLevel,
        level: finalRiskLevel,
        title: getRiskTitle(finalRiskLevel, language),
        message: getRiskMessage(finalRiskLevel, language)
      };
    }

    return period;
  });
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
    if (probability < 40) return null;

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
export async function getAirportWeather(language: 'en' | 'pl' = 'en'): Promise<WeatherResponse | null> {
  try {
    // Fetch both TAF and Open-Meteo data
    const [weatherResponse, openMeteoData] = await Promise.all([
      fetch('/api/weather', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
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
    
    const tafPeriods = processForecast(forecast, language);
    console.log('Processed TAF periods:', tafPeriods.map(p => ({
      from: p.from,
      to: p.to,
      isTemporary: p.isTemporary,
      probability: p.probability,
      changeType: p.changeType,
      phenomena: p.conditions.phenomena
    })));

    // Merge TAF with OpenMeteo data
    const enhancedForecast = mergeTafWithOpenMeteo(tafPeriods, openMeteoData);
    console.log('Enhanced forecast after OpenMeteo merge:', enhancedForecast.map(p => ({
      from: p.from,
      to: p.to,
      isTemporary: p.isTemporary,
      probability: p.probability,
      changeType: p.changeType,
      phenomena: p.conditions.phenomena
    })));
    
    // First merge overlapping periods
    const mergedOverlapping = mergeOverlappingPeriods(enhancedForecast);
    console.log('Forecast after merging overlapping periods:', mergedOverlapping.map(p => ({
      from: p.from,
      to: p.to,
      isTemporary: p.isTemporary,
      probability: p.probability,
      changeType: p.changeType,
      phenomena: p.conditions.phenomena
    })));
    
    // Then merge consecutive similar periods
    const mergedForecast = mergeConsecutiveSimilarPeriods(mergedOverlapping);
    console.log('Final merged forecast:', mergedForecast.map(p => ({
      from: p.from,
      to: p.to,
      isTemporary: p.isTemporary,
      probability: p.probability,
      changeType: p.changeType,
      phenomena: p.conditions.phenomena
    })));

    const currentAssessment = assessWeatherRisk(currentWeather, language);
    
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
  }[];
  wind?: {
    speed_kts: number;
    gust_kts?: number;
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
}

interface GroupedPeriod {
  conditions: string[];
  riskLevel: number;
  timeDescription: string;
  from: Date;
  to: Date;
}

function processForecast(taf: TAFData | null, language: 'en' | 'pl'): ForecastChange[] {
  if (!taf || !taf.forecast) return [];

  console.log('Processing TAF data:', {
    raw: taf.raw_text,
    forecast: taf.forecast.map(p => ({
      from: p.timestamp?.from,
      to: p.timestamp?.to,
      conditions: p.conditions,
      change: p.change
    }))
  });

  const t = translations[language];
  const warnings = t.operationalWarnings;
  const changes: ForecastChange[] = [];
  
  // First, get all valid periods and sort them
  const validPeriods = taf.forecast
    .filter(period => period.timestamp)
    .map(period => {
      const mappedPeriod = {
        ...period,
        from: adjustToWarsawTime(new Date(period.timestamp!.from)),
        to: adjustToWarsawTime(new Date(period.timestamp!.to))
      };
      console.log('Mapped period:', {
        from: mappedPeriod.from,
        to: mappedPeriod.to,
        isTemporary: period.change?.indicator?.code === 'TEMPO',
        probability: period.change?.probability,
        changeType: period.change?.indicator?.code,
        conditions: period.conditions
      });
      return mappedPeriod;
    })
    .sort((a, b) => a.from.getTime() - b.from.getTime());

  if (validPeriods.length === 0) return [];

  // Process base periods (non-TEMPO) including BECMG
  const basePeriods = validPeriods.filter(p => 
    !p.change?.indicator?.code || p.change.indicator.code === 'BECMG'
  );

  // Process each base period
  basePeriods.forEach((period, index) => {
    const conditions = new Set<string>();
    console.log(`Processing base period ${index}:`, {
      from: period.from,
      to: period.to,
      isTemporary: false,
      probability: undefined,
      changeType: period.change?.indicator?.code || 'PERSISTENT'
    });

    // Process visibility
    if (period.visibility?.meters) {
      const visDesc = formatVisibility(period.visibility.meters, language);
      if (visDesc) conditions.add(visDesc);
    }

    // Process ceiling/clouds
    if (period.clouds && period.clouds.length > 0) {
      const significantCloud = period.clouds
        .filter(cloud => cloud.code === 'BKN' || cloud.code === 'OVC')
        .sort((a, b) => (a.base_feet_agl || 0) - (b.base_feet_agl || 0))[0];

      if (significantCloud && significantCloud.base_feet_agl) {
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

    // Calculate risk level and operational impacts
    const riskLevel = calculateRiskLevel(period, language, warnings);
    const operationalImpacts = calculateOperationalImpacts(period, language, warnings);

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
      operationalImpacts
    };

    console.log('Created base forecast change:', {
      timeDescription: forecastChange.timeDescription,
      isTemporary: forecastChange.isTemporary,
      probability: forecastChange.probability,
      changeType: forecastChange.changeType,
      phenomena: forecastChange.conditions.phenomena
    });

    changes.push(forecastChange);
  });

  // Group TEMPO periods by probability and overlapping time ranges
  const tempoPeriods = validPeriods.filter(p => p.change?.indicator?.code === 'TEMPO' || p.change?.probability);
  const tempoGroups = new Map<string, WeatherPeriod[]>();
  
  tempoPeriods.forEach(period => {
    const key = `${period.change?.probability || 'none'}-${period.from.getTime()}`;
    if (!tempoGroups.has(key)) {
      tempoGroups.set(key, []);
    }
    tempoGroups.get(key)!.push(period);
  });

  // Process each group of TEMPO periods
  tempoGroups.forEach((group) => {
    // Sort periods in group by time
    group.sort((a, b) => a.from.getTime() - b.from.getTime());

    // Merge consecutive periods with same conditions
    let currentPeriod = group[0];
    const mergedGroup: WeatherPeriod[] = [];

    for (let i = 1; i < group.length; i++) {
      const nextPeriod = group[i];
      if (areWeatherPeriodsSimilar(currentPeriod, nextPeriod) && 
          currentPeriod.to.getTime() === nextPeriod.from.getTime()) {
        // Merge by extending end time
        currentPeriod = {
          ...currentPeriod,
          to: nextPeriod.to
        };
      } else {
        mergedGroup.push(currentPeriod);
        currentPeriod = nextPeriod;
      }
    }
    mergedGroup.push(currentPeriod);

    // Process each merged TEMPO period
    mergedGroup.forEach(period => {
      const conditions = new Set<string>();
      console.log('Processing merged TEMPO period:', {
        from: period.from,
        to: period.to,
        probability: period.change?.probability,
        changeType: period.change?.indicator?.code
      });

      // Process visibility
      if (period.visibility?.meters) {
        const visDesc = formatVisibility(period.visibility.meters, language);
        if (visDesc) conditions.add(visDesc);
      }

      // Process ceiling/clouds
      if (period.clouds && period.clouds.length > 0) {
        const significantCloud = period.clouds
          .filter(cloud => cloud.code === 'BKN' || cloud.code === 'OVC')
          .sort((a, b) => (a.base_feet_agl || 0) - (b.base_feet_agl || 0))[0];

        if (significantCloud && significantCloud.base_feet_agl) {
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

      // Calculate risk level and operational impacts
      const riskLevel = calculateRiskLevel(period, language, warnings);
      const operationalImpacts = calculateOperationalImpacts(period, language, warnings);

      // Add period
      const phenomena = Array.from(conditions);

      const forecastChange = {
        timeDescription: formatTimeDescription(period.from, period.to, language),
        from: period.from,
        to: period.to,
        conditions: {
          phenomena
        },
        riskLevel,
        changeType: (period.change?.indicator?.code || 'TEMPO') as 'TEMPO' | 'BECMG' | 'PERSISTENT',
        visibility: period.visibility,
        ceiling: period.ceiling,
        isTemporary: true,
        probability: period.change?.probability,
        wind: period.wind,
        operationalImpacts
      };

      console.log('Created TEMPO forecast change:', {
        timeDescription: forecastChange.timeDescription,
        isTemporary: forecastChange.isTemporary,
        probability: forecastChange.probability,
        changeType: forecastChange.changeType,
        phenomena: forecastChange.conditions.phenomena
      });

      changes.push(forecastChange);
    });
  });

  // Sort changes by start time, end time, and risk level
  const sortedChanges = changes.sort((a, b) => {
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

  console.log('Final sorted changes:', sortedChanges.map(change => ({
    timeDescription: change.timeDescription,
    isTemporary: change.isTemporary,
    probability: change.probability,
    changeType: change.changeType,
    phenomena: change.conditions.phenomena,
    riskLevel: change.riskLevel.level
  })));

  return sortedChanges;
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

// Helper function to calculate risk level
function calculateRiskLevel(period: WeatherPeriod, language: 'en' | 'pl', warnings: Record<string, string>): RiskLevel {
  const t = translations[language];

  // Default to good conditions
  let riskLevel: RiskLevel = {
    level: 1,
    title: t.riskLevel1Title,
    message: t.riskLevel1Message,
    statusMessage: t.riskLevel1Status,
    color: "green"
  };

  // Check for snow showers and heavy snow FIRST
  if (period.conditions?.some((c: { code: string }) => c.code === '+SHSN')) {
    riskLevel = {
      level: 4,
      title: t.riskLevel4Title,
      message: t.riskLevel4Message,
      statusMessage: t.riskLevel4Status,
      color: "red"
    };
    return riskLevel; // Return immediately for severe conditions
  }

  // Check for severe conditions
  if (period.visibility?.meters && period.visibility.meters < MINIMUMS.VISIBILITY) {
    riskLevel = {
      level: 4,
      title: t.riskLevel4Title,
      message: t.riskLevel4Message,
      statusMessage: t.riskLevel4Status,
      color: "red"
    };
    return riskLevel; // Return immediately for severe conditions
  } else if (period.conditions?.some((c: { code: string }) => ['FZFG', 'FZRA', 'FZDZ'].includes(c.code))) {
    riskLevel = {
      level: 4,
      title: t.riskLevel4Title,
      message: t.riskLevel4Message,
      statusMessage: t.riskLevel4Status,
      color: "red"
    };
    return riskLevel; // Return immediately for severe conditions
  }

  // For non-severe conditions, accumulate the highest risk level
  if (period.visibility?.meters && period.visibility.meters < 2000) {
    riskLevel = {
      level: Math.max(riskLevel.level, 3) as 1 | 2 | 3 | 4,
      title: t.riskLevel3Title,
      message: t.riskLevel3Message,
      statusMessage: t.riskLevel3Status,
      color: "red"  // Changed from orange to red
    };
  }

  // Check for moderate snow conditions
  if (period.conditions?.some((c: { code: string }) => c.code === 'SHSN')) {
    riskLevel = {
      level: Math.max(riskLevel.level, 3) as 1 | 2 | 3 | 4,
      title: t.riskLevel3Title,
      message: t.riskLevel3Message,
      statusMessage: t.riskLevel3Status,
      color: "red"  // Changed from orange to red
    };
  } else if (period.conditions?.some((c: { code: string }) => c.code === '-SHSN')) {
    riskLevel = {
      level: Math.max(riskLevel.level, 2) as 1 | 2 | 3 | 4,
      title: t.riskLevel2Title,
      message: t.riskLevel2Message,
      statusMessage: t.riskLevel2Status,
      color: "orange"  // Changed from yellow to orange
    };
  }

  // Check for low ceiling with CB
  if (period.clouds?.some(cloud => 
    (cloud.code === 'BKN' || cloud.code === 'OVC') && 
    cloud.base_feet_agl && 
    cloud.base_feet_agl <= 400 && 
    cloud.type === 'CB'
  )) {
    riskLevel = {
      level: Math.max(riskLevel.level, 3) as 1 | 2 | 3 | 4,
      title: t.riskLevel3Title,
      message: t.riskLevel3Message,
      statusMessage: t.riskLevel3Status,
      color: "red"  // Changed from orange to red
    };
  } else if (period.clouds?.some(cloud => 
    (cloud.code === 'BKN' || cloud.code === 'OVC') && 
    cloud.base_feet_agl && 
    cloud.base_feet_agl < MINIMUMS.CEILING
  )) {
    riskLevel = {
      level: Math.max(riskLevel.level, 2) as 1 | 2 | 3 | 4,
      title: t.riskLevel2Title,
      message: t.riskLevel2Message,
      statusMessage: t.riskLevel2Status,
      color: "orange"  // Changed from yellow to orange
    };
  }

  // Assess wind risk
  if (period.wind) {
    const { speed_kts, gust_kts } = period.wind;
    let windRiskLevel = 1;
    
    if (speed_kts >= 35 || (gust_kts && gust_kts >= 40)) {
      windRiskLevel = 4;
    } else if (gust_kts && gust_kts >= 35) {
      windRiskLevel = 3;
    } else if (speed_kts >= 25 || (gust_kts && gust_kts >= 25)) {
      windRiskLevel = 2;
    }

    // If we have both snow and strong winds, increase the risk level
    if (period.conditions?.some((c: { code: string }) => ['SHSN', '-SHSN'].includes(c.code)) && windRiskLevel >= 2) {
      windRiskLevel = Math.min(4, windRiskLevel + 1);
    }

    // Apply the wind risk level
    if (windRiskLevel > riskLevel.level) {
      const riskMapping = {
        4: {
          level: 4 as const,
          title: t.riskLevel4Title,
          message: t.riskLevel4Message,
          statusMessage: t.riskLevel4Status,
          color: "red" as const
        },
        3: {
          level: 3 as const,
          title: t.riskLevel3Title,
          message: t.riskLevel3Message,
          statusMessage: t.riskLevel3Status,
          color: "red" as const
        },
        2: {
          level: 2 as const,
          title: t.riskLevel2Title,
          message: t.riskLevel2Message,
          statusMessage: t.riskLevel2Status,
          color: "orange" as const
        }
      };
      riskLevel = riskMapping[windRiskLevel as 2 | 3 | 4] as RiskLevel;
    }
  }

  return riskLevel;
}

// Helper function to calculate operational impacts
function calculateOperationalImpacts(period: WeatherPeriod, language: 'en' | 'pl', warnings: Record<string, string>): string[] {
  const impacts: string[] = [];

  if (period.visibility?.meters && period.visibility.meters < MINIMUMS.VISIBILITY) {
    impacts.push(warnings.operationsSuspended, warnings.diversionsLikely);
  } else if (period.conditions?.some((c: { code: string }) => ['FZFG', 'FZRA', 'FZDZ'].includes(c.code))) {
    impacts.push(
      warnings.operationsSuspended,
      warnings.deicingRequired,
      warnings.diversionsLikely
    );
  } else if (period.visibility?.meters && period.visibility.meters < 2000) {
    impacts.push(
      warnings.possibleDelays,
      warnings.someFlightsMayDivert
    );
  }

  if (period.wind) {
    const { speed_kts, gust_kts } = period.wind;
    
    if (speed_kts >= 35 || (gust_kts && gust_kts >= 40)) {
      impacts.push(warnings.dangerousGusts, warnings.diversionsLikely);
    } else if (gust_kts && gust_kts >= 35) {
      impacts.push(
        warnings.strongGustsOperations,
        warnings.extendedDelays,
        warnings.diversionsLikely
      );
    } else if (speed_kts >= 25 || (gust_kts && gust_kts >= 25)) {
      impacts.push(
        warnings.strongWindsApproaches,
        warnings.minorDelaysPossible
      );
    }
  }

  return impacts;
}

function formatTimeDescription(start: Date, end: Date, language: 'en' | 'pl'): string {
  const t = translations[language];
  
  const formatTime = (date: Date) => {
    if (language === 'pl') {
      const time = date.toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Warsaw'
      });
      return `${time}`;
    }
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
    // Angielski format (bez zmian)
    if (start.getDate() === end.getDate()) {
      const prefix = start.getDate() === today.getDate() ? t.today : t.tomorrow;
      return `${prefix} ${startTime} - ${endTime}`;
    }
    
    const startPrefix = start.getDate() === today.getDate() ? t.today : t.tomorrow;
    const endPrefix = end.getDate() === tomorrow.getDate() ? t.tomorrow : t.nextDay;
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

function assessWeatherRisk(weather: WeatherData, language: 'en' | 'pl'): RiskAssessment {
  const t = translations[language];
  const warnings = t.operationalWarnings;
  const operationalImpactsSet = new Set<string>();
  const reasons: string[] = [];
  
  // Time-based risk factors
  const hour = new Date(weather.observed).getHours();
  const month = new Date(weather.observed).getMonth();
  let timeRiskMultiplier = 1.0;
  
  // Early morning risk factor (3-7 AM)
  if (hour >= 3 && hour <= 7) {
    timeRiskMultiplier *= 1.3;
    operationalImpactsSet.add(warnings.reducedVisibilityMorning);
  }
  
  // Winter season risk factor (Oct-Feb)
  if (month >= 9 || month <= 1) {
    timeRiskMultiplier *= 1.2;
    operationalImpactsSet.add(warnings.winterDeicing);
  }

  // Base risk calculation
  let baseRiskLevel = 1;

  // Check for severe conditions first
  if (weather.conditions?.some(c => c.code === '+SHSN')) {
    baseRiskLevel = 4;
    operationalImpactsSet.clear(); // Clear previous impacts
    operationalImpactsSet.add(warnings.operationsSuspended);
    operationalImpactsSet.add(warnings.deicingRequired);
  } else if (weather.visibility?.meters && weather.visibility.meters < MINIMUMS.VISIBILITY) {
    baseRiskLevel = 4;
    operationalImpactsSet.clear(); // Clear previous impacts
    operationalImpactsSet.add(warnings.operationsSuspended);
    operationalImpactsSet.add(warnings.diversionsLikely);
  } else if (weather.conditions?.some(c => ['FZFG', 'FZRA', 'FZDZ'].includes(c.code))) {
    baseRiskLevel = 4;
    operationalImpactsSet.clear(); // Clear previous impacts
    operationalImpactsSet.add(warnings.operationsSuspended);
    operationalImpactsSet.add(warnings.deicingRequired);
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

  // Check for poor visibility
  if (weather.visibility?.meters && weather.visibility.meters < 2000) {
    baseRiskLevel = Math.max(baseRiskLevel, 3);
    operationalImpactsSet.add(warnings.poorVisibilityOps);
  }

  // Check for moderate impacts
  if ((weather.visibility?.meters && weather.visibility.meters < 3000) ||
      (weather.clouds?.some(cloud => 
        (cloud.code === 'BKN' || cloud.code === 'OVC') && 
        cloud.base_feet_agl && 
        cloud.base_feet_agl < MINIMUMS.CEILING
      ))) {
    baseRiskLevel = Math.max(baseRiskLevel, 2);
    operationalImpactsSet.add(warnings.marginalConditions);
  }

  // Wind assessment
  if (weather.wind?.gust_kts && weather.wind.gust_kts >= 40) {
    baseRiskLevel = 4;
    operationalImpactsSet.clear(); // Clear previous impacts
    operationalImpactsSet.add(warnings.dangerousGusts);
    return {
      level: 4,
      title: t.riskLevel4Title,
      message: t.riskLevel4Message,
      statusMessage: t.riskLevel4Status,
      color: "red",
      operationalImpacts: Array.from(operationalImpactsSet)
    };
  } else if (weather.wind?.gust_kts && weather.wind.gust_kts >= 35) {
    baseRiskLevel = Math.max(baseRiskLevel, 3);
    operationalImpactsSet.add(warnings.strongGustsOperations);
  } else if (weather.wind?.speed_kts && weather.wind.speed_kts >= 25 || 
             (weather.wind?.gust_kts && weather.wind.gust_kts >= 25)) {
    baseRiskLevel = Math.max(baseRiskLevel, 2);
    operationalImpactsSet.add(warnings.windDelays);
  }

  // Apply time-based risk multiplier
  let finalRiskLevel = baseRiskLevel;
  if (timeRiskMultiplier > 1.0) {
    // Increase risk level based on multiplier, but never exceed 4
    const adjustedRisk = Math.min(4, Math.ceil(baseRiskLevel * timeRiskMultiplier));
    if (adjustedRisk > baseRiskLevel) {
      finalRiskLevel = adjustedRisk;
      // Clear previous impacts if risk level increased significantly
      if (adjustedRisk - baseRiskLevel >= 2) {
        operationalImpactsSet.clear();
      }
    }
  }

  // Update time-based risk messaging
  if (timeRiskMultiplier > 1.0) {
    const timeFactors = [];
    if (hour >= 3 && hour <= 7) {
      timeFactors.push(warnings.reducedVisibilityMorning);
    }
    if (month >= 9 || month <= 1) {
      timeFactors.push(warnings.winterWeatherWarning);
    }
    
    if (timeFactors.length > 0) {
      const message = timeFactors.join(". ");
      if (operationalImpactsSet.size === 0) {
        operationalImpactsSet.add(`${t.additionalConsideration}${message}`);
      }
    }
  }

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

  return {
    level: finalRiskLevel as 1 | 2 | 3 | 4,
    title: riskDetails.title,
    message: `${riskDetails.message}${cleanedReasons.length ? ` - ${cleanedReasons[0]}` : ''}`,
    statusMessage: riskDetails.statusMessage,
    color: riskDetails.color,
    operationalImpacts: Array.from(operationalImpactsSet)
  };
}

// Helper function to describe visibility trends
function getVisibilityTrendDescription(current: number, previous: number, language: 'en' | 'pl'): string {
  const t = translations[language].operationalWarnings;
  const change = current - previous;
  const percentChange = Math.abs(change / previous * 100);
  
  if (percentChange < 10) return '';
  
  if (change < 0) {
    return t.visibilityDecreasing;
  } else {
    return t.visibilityImproving;
  }
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

// Add the de-icing risk calculation
function calculateDeicingRisk(weather: WeatherData, language: 'en' | 'pl'): { score: number; reason?: string } {
  const t = translations[language].weatherConditionMessages;
  
  if (!weather.temperature?.celsius) {
    return { score: 0 };
  }

  const temp = weather.temperature.celsius;
  let deicingScore = 0;
  let reason = '';

  if (temp <= RISK_WEIGHTS.DEICING.TEMPERATURE_THRESHOLDS.SEVERE) {
    deicingScore = RISK_WEIGHTS.DEICING.BASE_SCORES.CERTAIN;
    reason = t.severeIcing;
  } else if (temp <= RISK_WEIGHTS.DEICING.TEMPERATURE_THRESHOLDS.HIGH_RISK) {
    deicingScore = RISK_WEIGHTS.DEICING.BASE_SCORES.LIKELY;
    reason = t.highIcingRisk;
  } else if (temp <= RISK_WEIGHTS.DEICING.TEMPERATURE_THRESHOLDS.BELOW_ZERO) {
    deicingScore = RISK_WEIGHTS.DEICING.BASE_SCORES.POSSIBLE;
    reason = t.possibleIcing;
  }

  if (deicingScore > 0 && weather.conditions) {
    const hasPrecipitation = weather.conditions.some(c => 
      ['RA', 'SN', 'FZRA', 'FZDZ', 'SHSN', 'SHRA'].some(code => 
        c.code.includes(code)
      )
    );
    if (hasPrecipitation) {
      deicingScore *= 1.5;
      reason += t.withPrecipitation;
    }
  }

  return { score: deicingScore, reason };
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
interface WarningMessages {
  dangerousGusts: string;
  diversionsLikely: string;
  strongGustsOperations: string;
  extendedDelays: string;
  strongWindsApproaches: string;
  minorDelaysPossible: string;
  [key: string]: string; // For other warning messages
}

// Update the function with proper typing
function getWindImpacts(
  wind: { speed_kts: number; gust_kts?: number }, 
  warnings: WarningMessages
): string[] {
  const impacts: string[] = [];
  
  if (wind.gust_kts && wind.gust_kts >= 40) {
    impacts.push(warnings.dangerousGusts);
    impacts.push(warnings.diversionsLikely);
  } else if (wind.gust_kts && wind.gust_kts >= 35) {
    impacts.push(warnings.strongGustsOperations);
    impacts.push(warnings.extendedDelays);
  } else if (wind.speed_kts >= 25 || (wind.gust_kts && wind.gust_kts >= 25)) {
    impacts.push(warnings.strongWindsApproaches);
    impacts.push(warnings.minorDelaysPossible);
  }
  
  return impacts;
}

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

function mergeTafWithOpenMeteo(tafPeriods: ForecastChange[], openMeteoData: OpenMeteoResponse): ForecastChange[] {
  console.log('Merging TAF with OpenMeteo:', {
    tafPeriods: tafPeriods.map(p => ({
      from: p.from,
      to: p.to,
      isTemporary: p.isTemporary,
      probability: p.probability,
      changeType: p.changeType,
      phenomena: p.conditions.phenomena
    })),
    openMeteoDataPoints: openMeteoData.hourly.time.length
  });

  const mergedPeriods = tafPeriods.map(period => {
    // ... existing merge logic ...
    console.log('Merged period:', {
      from: period.from,
      to: period.to,
      isTemporary: period.isTemporary,
      probability: period.probability,
      changeType: period.changeType,
      phenomena: period.conditions.phenomena
    });
    return period;
  });

  return mergedPeriods;
}

async function getTafData(): Promise<TAFData> {
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
  return data.taf.data[0];
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

interface ForecastPeriod {
  from: Date;
  to: Date;
  isTemporary?: boolean;
  changeType: 'TEMPO' | 'BECMG' | 'PERSISTENT';
  probability?: number;
  operationalImpacts?: string[];
  timeDescription: string;
  conditions: {
    phenomena: string[];
  };
  riskLevel: RiskLevel;
  phenomena?: string[];
}

interface TimelineEvent {
  time: Date;
  type: 'start' | 'end';
  period: ForecastPeriod;
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
          to: event.time
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

function getRiskColor(level: number): 'red' | 'orange' | 'yellow' | 'green' {
  switch (level) {
    case 4: return "red";
    case 3: return "orange";
    case 2: return "yellow";
    default: return "green";
  }
}

// Update the function signature to match usage
function mergeConsecutiveSimilarPeriods(periods: ForecastChange[]): ForecastChange[] {
  if (periods.length <= 1) return periods;
  
  const result: ForecastChange[] = [];
  let currentPeriod = periods[0];
  const language = 'en'; // or get this from your app's context
  
  for (let i = 1; i < periods.length; i++) {
    const nextPeriod = periods[i];
    
    if (arePeriodsSimilar(currentPeriod, nextPeriod) && 
        arePeriodsConsecutive(currentPeriod, nextPeriod)) {
      currentPeriod = {
        ...currentPeriod,
        to: nextPeriod.to,
        riskLevel: {
          level: currentPeriod.riskLevel.level,
          title: getRiskTitle(currentPeriod.riskLevel.level, language),
          message: getRiskMessage(currentPeriod.riskLevel.level, language),
          statusMessage: getRiskStatus(currentPeriod.riskLevel.level, language),
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

// Add type conversion helper if needed
function convertToForecastChange(period: ForecastPeriod): ForecastChange {
  const language = 'en'; // or get this from your app's context
  
  // Convert changeType to the correct type
  let changeType: 'TEMPO' | 'BECMG' | 'PERSISTENT' = 'PERSISTENT';
  if (period.changeType === 'TEMPO') changeType = 'TEMPO';
  if (period.changeType === 'BECMG') changeType = 'BECMG';

  return {
    ...period,
    changeType, // Ensure changeType is one of the allowed literals
    timeDescription: period.timeDescription || '',
    conditions: {
      phenomena: period.phenomena || []
    },
    riskLevel: {
      level: 1,
      title: getRiskTitle(1, language),
      message: getRiskMessage(1, language),
      statusMessage: getRiskStatus(1, language),
      color: getRiskColor(1)
    }
  };
}

function arePeriodsConsecutive(a: ForecastChange, b: ForecastChange): boolean {
  // Allow for 1-minute gap to handle potential rounding
  return Math.abs(b.from.getTime() - a.to.getTime()) <= 60000;
}

// Helper function to check if two forecast changes can be merged
function arePeriodsSimilar(a: ForecastChange, b: ForecastChange): boolean {
  // Check risk levels
  if (a.riskLevel.level !== b.riskLevel.level) return false;
  
  // Check if both are temporary or both are not
  if (a.isTemporary !== b.isTemporary) return false;
  
  // Check if both have the same probability
  if (a.probability !== b.probability) return false;
  
  // Check if both have the same change type
  if (a.changeType !== b.changeType) return false;

  // Check phenomena (including no phenomena case)
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