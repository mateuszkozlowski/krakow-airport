// src/lib/weather.ts

import type {
  WeatherData,
  TAFData,
  RiskAssessment,
  ForecastChange,
  WeatherResponse,
  OpenMeteoForecast,
} from './types/weather';

// Import WEATHER_PHENOMENA and WMO_WEATHER_CODES as values
import { WEATHER_PHENOMENA, WMO_WEATHER_CODES } from './types/weather';
import { adjustToWarsawTime } from '@/lib/utils/time';

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
    BELOW_ZERO: 3,      // Temperature threshold in Celsius
    HIGH_RISK: 0,       // High risk threshold
    SEVERE: -5         // Severe conditions threshold
  },
  PHENOMENA: new Set([
    'FZRA',    // Freezing rain
    'FZDZ',    // Freezing drizzle
    'FZFG',    // Freezing fog
    '+SN',     // Heavy snow
    'SN',      // Snow
    'SHSN'     // Snow showers
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

// Add this function to fetch Open-Meteo data
async function fetchOpenMeteoForecast(): Promise<OpenMeteoForecast | null> {
  try {
    const response = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=50.07778&longitude=19.78472&hourly=temperature_2m,dew_point_2m,precipitation_probability,precipitation,rain,showers,snowfall,snow_depth,weather_code,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kn&forecast_days=3'
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

// Add this function to combine forecasts
function combineForecasts(tafForecast: ForecastChange[], openMeteoData: OpenMeteoForecast): ForecastChange[] {
  console.log('\n=== Starting Forecast Combination ===');
  console.log('TAF Forecast periods:', tafForecast.map(f => ({
    time: f.timeDescription,
    phenomena: f.conditions.phenomena,
    risk: f.riskLevel.level
  })));

  const combined: ForecastChange[] = [...tafForecast];
  
  // First pass: collect hourly conditions
  const hourlyConditions = new Map<number, {
    conditions: string[];
    risk: number;
    visibility?: number;
    wind?: { speed: number; gusts?: number };
  }>();

  // Helper function to get the most severe precipitation from a set of conditions
  const getMostSeverePrecipitation = (conditions: string[]): string | null => {
    const precipOrder = [
      '⛈️ Severe Thunderstorm',
      '⛈️ Thunderstorm with Hail',
      '⛈️ Thunderstorm',
      '🌨️ Heavy Snow',
      '🌨️ Snow',
      '🌨️ Light Snow',
      '🌧️ Heavy Rain',
      '🌧️ Rain',
      '🌧️ Light Rain',
      '🌧️ Heavy Drizzle',
      '🌧️ Drizzle',
      '🌧️ Light Drizzle'
    ];

    const precipConditions = conditions.filter(c => 
      c.includes('🌧️') || c.includes('🌨️') || c.includes('⛈️')
    );

    if (precipConditions.length === 0) return null;

    return precipConditions.sort((a, b) => 
      precipOrder.indexOf(a) - precipOrder.indexOf(b)
    )[0];
  };

  // Helper function to get the most severe wind condition
  const getMostSevereWind = (conditions: string[]): string | null => {
    const windOrder = [
      '💨 Strong Wind Gusts',
      '💨 Strong Winds',
      '💨 Moderate Winds',
      '💨 Light Winds'
    ];

    const windConditions = conditions.filter(c => c.includes('💨'));
    if (windConditions.length === 0) return null;

    return windConditions.sort((a, b) => 
      windOrder.indexOf(a) - windOrder.indexOf(b)
    )[0];
  };

  // Rest of the hourly conditions collection remains the same...
  for (let i = 0; i < openMeteoData.hourly.time.length; i++) {
    const time = new Date(openMeteoData.hourly.time[i]);
    console.log(`\nProcessing OpenMeteo hour ${time.toLocaleString('en-GB', { timeZone: 'Europe/Warsaw' })}:`, {
      temperature: openMeteoData.hourly.temperature_2m[i] + '°C',
      weather: WMO_WEATHER_CODES[openMeteoData.hourly.weather_code[i]],
      visibility: (openMeteoData.hourly.visibility[i] / 1000).toFixed(1) + 'km',
      wind: `${openMeteoData.hourly.wind_speed_10m[i]}kt${openMeteoData.hourly.wind_gusts_10m[i] ? ` (gusts ${openMeteoData.hourly.wind_gusts_10m[i]}kt)` : ''}`,
      precipitation: `${openMeteoData.hourly.precipitation_probability[i]}% chance${openMeteoData.hourly.rain[i] > 0 ? `, rain ${openMeteoData.hourly.rain[i]}mm` : ''}${openMeteoData.hourly.snowfall[i] > 0 ? `, snow ${openMeteoData.hourly.snowfall[i]}cm` : ''}`
    });

    const weatherCode = openMeteoData.hourly.weather_code[i];
    const visibility = openMeteoData.hourly.visibility[i];
    const windSpeed = openMeteoData.hourly.wind_speed_10m[i];
    const windGusts = openMeteoData.hourly.wind_gusts_10m[i];
    const precipProb = openMeteoData.hourly.precipitation_probability[i];
    const rain = openMeteoData.hourly.rain[i];
    const snow = openMeteoData.hourly.snowfall[i];

    const risk = calculateOpenMeteoRisk({
      weatherCode,
      visibility,
      windSpeed,
      windGusts,
      precipProb,
      rain,
      snow
    });

    const conditions = getOpenMeteoConditions({
      weatherCode,
      visibility,
      windSpeed,
      windGusts,
      precipProb,
      rain,
      snow
    });

    hourlyConditions.set(time.getTime(), {
      conditions,
      risk,
      visibility,
      wind: { speed: windSpeed, gusts: windGusts }
    });
  }

  // Second pass: split periods based on significant changes
  console.log('\n=== Processing Combined Forecast ===');
  const newPeriods: ForecastChange[] = [];

  for (const period of combined) {
    console.log(`\nProcessing period: ${period.timeDescription}`);
    let currentStart = period.from;
    let currentConditions = new Set<string>();
    let currentRisk = period.riskLevel.level;
    
    const periodEnd = period.to;
    let hourToCheck = new Date(currentStart);

    while (hourToCheck <= periodEnd) {
      const timeKey = hourToCheck.getTime();
      const hourData = hourlyConditions.get(timeKey);

      if (hourData) {
        // Merge conditions intelligently
        const allConditions = new Set([...currentConditions, ...hourData.conditions]);
        const mergedConditions = new Set<string>();

        // Add the most severe precipitation if any
        const severePrecip = getMostSeverePrecipitation(Array.from(allConditions));
        if (severePrecip) mergedConditions.add(severePrecip);

        // Add the most severe wind if any
        const severeWind = getMostSevereWind(Array.from(allConditions));
        if (severeWind) mergedConditions.add(severeWind);

        // Add visibility if present
        const visibilityCondition = Array.from(allConditions).find(c => c.includes('👁️'));
        if (visibilityCondition) mergedConditions.add(visibilityCondition);

        // Add any other non-precipitation, non-wind conditions
        allConditions.forEach(condition => {
          if (!condition.includes('🌧️') && 
              !condition.includes('🌨️') && 
              !condition.includes('⛈️') && 
              !condition.includes('💨') && 
              !condition.includes('👁️')) {
            mergedConditions.add(condition);
          }
        });

        const shouldSplit = 
          Math.abs(hourData.risk - currentRisk) >= 1 || // Risk level changed significantly
          (hourData.visibility && hourData.visibility < 3000 && 
            !Array.from(currentConditions).some(c => c.includes('Visibility'))) || // Only split if visibility newly became poor
          (hourData.wind?.gusts && hourData.wind.gusts >= 25 && 
            !Array.from(currentConditions).some(c => c.includes('Strong'))); // Only split if wind newly became strong

        if (shouldSplit && hourToCheck > currentStart) {
          console.log('\nSplitting period at:', hourToCheck.toLocaleString('en-GB', { timeZone: 'Europe/Warsaw' }));
          console.log('Previous conditions:', Array.from(currentConditions));
          console.log('Previous risk:', currentRisk);
          console.log('New conditions:', Array.from(mergedConditions));
          console.log('Hour data risk:', hourData.risk);
          console.log('Wind data:', hourData.wind);
          console.log('Visibility:', hourData.visibility);
          console.log('Split reason:', {
            riskChange: Math.abs(hourData.risk - currentRisk) >= 1,
            newPoorVisibility: hourData.visibility && hourData.visibility < 3000 && 
              !Array.from(currentConditions).some(c => c.includes('Visibility')),
            newStrongWind: hourData.wind?.gusts && hourData.wind.gusts >= 25 && 
              !Array.from(currentConditions).some(c => c.includes('Strong'))
          });
          // Create new period with merged conditions
          newPeriods.push({
            ...period,
            from: currentStart,
            to: hourToCheck,
            conditions: {
              phenomena: Array.from(mergedConditions)
            },
            riskLevel: {
              ...period.riskLevel,
              level: currentRisk as 1 | 2 | 3 | 4,
              color: currentRisk > 2 ? 'red' : currentRisk > 1 ? 'orange' : 'green',
              title: currentRisk > 2 ? 'Major Weather Impact' : 
                     currentRisk > 1 ? 'Minor Weather Impact' : 
                     'Good Flying Conditions'
            }
          });

          // Start new period
          currentStart = hourToCheck;
          currentConditions = mergedConditions;
          currentRisk = (hourData.risk >= 4 ? 4 : hourData.risk >= 3 ? 3 : hourData.risk >= 2 ? 2 : 1) as 1 | 2 | 3 | 4;
        } else {
          // Update current conditions
          currentConditions = mergedConditions;
          const newRisk = Math.max(currentRisk, hourData.risk);
          currentRisk = (newRisk >= 4 ? 4 : newRisk >= 3 ? 3 : newRisk >= 2 ? 2 : 1) as 1 | 2 | 3 | 4;
        }
      }

      // Move to next hour
      hourToCheck = new Date(hourToCheck.getTime() + 60 * 60 * 1000);
    }

    // Add final period with merged conditions
    if (currentStart < periodEnd) {
      newPeriods.push({
        ...period,
        from: currentStart,
        to: periodEnd,
        conditions: {
          phenomena: Array.from(currentConditions)
        },
        riskLevel: {
          ...period.riskLevel,
          level: currentRisk as 1 | 2 | 3 | 4,
          color: currentRisk > 2 ? 'red' : currentRisk > 1 ? 'orange' : 'green',
          title: currentRisk > 2 ? 'Major Weather Impact' : 
                 currentRisk > 1 ? 'Minor Weather Impact' : 
                 'Good Flying Conditions'
        }
      });
    }
  }

  console.log('\nFinal combined forecast:', newPeriods.map(f => ({
    time: f.timeDescription,
    phenomena: f.conditions.phenomena,
    risk: f.riskLevel.level
  })));

  return newPeriods;
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
  let totalScore = 0;

  // Assess winds
  if (windGusts >= 35 || windSpeed >= MINIMUMS.MAX_WIND) {
    totalScore += 100; // Critical - exceeds limits
  } else if (windGusts >= 25 || windSpeed >= 25) {
    totalScore += 80; // Severe wind conditions
  } else if (windSpeed >= 15) {
    totalScore += 40; // Moderate wind conditions
  }

  // Assess precipitation with probability and intensity
  const precipScore = getWeatherScore(weatherCode);
  if (precipScore > 0) {
    // Adjust score based on precipitation probability
    if (precipProb > 75) {
      totalScore += precipScore; // Full score for high probability
    } else if (precipProb > 50) {
      totalScore += precipScore * 0.7; // Reduced score for medium probability
    } else if (precipProb > 25) {
      totalScore += precipScore * 0.4; // Further reduced for low probability
    }

    // Additional adjustment based on precipitation intensity
    if (rain > 3 || snow > 1) {
      totalScore *= 1.2; // 20% increase for heavy precipitation
    }
  }

  // Combined conditions multiplier
  if (windSpeed >= 25 && precipScore > 0 && precipProb > 50) {
    totalScore *= 1.2; // 20% increase for strong winds + likely precipitation
  }

  // Visibility assessment
  if (visibility < MINIMUMS.VISIBILITY) {
    totalScore += 100;
  } else if (visibility < 800) {
    totalScore += 90;
  } else if (visibility < 1500) {
    totalScore += 60;
  } else if (visibility < 3000) {
    totalScore += 40;
  }

  // Convert score to risk level
  const riskLevel = 
    totalScore >= 100 ? 4 :
    totalScore >= 80 ? 3 :
    totalScore >= 40 ? 2 :
    1;
    
  return riskLevel as 1 | 2 | 3 | 4;
}

// Helper function to get standardized visibility description
function getStandardizedVisibilityDescription(meters: number): string {
  if (meters < MINIMUMS.VISIBILITY) return `👁️ Visibility ${meters}m (below minimums)`;
  if (meters < 1000) return `👁️ Visibility ${meters}m`;
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
}): string[] {
  const conditions: string[] = [];

  // Standardize precipitation descriptions
  const getPrecipitationDescription = (code: number): string | null => {
    const precipMap: Record<number, string> = {
      51: '🌧️ Light Drizzle',
      53: '🌧️ Drizzle',
      55: '🌧️ Heavy Drizzle',
      61: '🌧️ Light Rain',
      63: '🌧️ Rain',
      65: '🌧️ Heavy Rain',
      71: '🌨️ Light Snow',
      73: '🌨️ Snow',
      75: '🌨️ Heavy Snow',
      95: '⛈️ Thunderstorm',
      96: '⛈️ Thunderstorm with Hail',
      99: '⛈️ Severe Thunderstorm'
    };
    return precipMap[code] || null;
  };

  // Add weather condition with standardized description
  if (weatherCode >= 45) {
    const precipDescription = getPrecipitationDescription(weatherCode);
    if (precipDescription) {
      conditions.push(precipDescription);
    } else if (WMO_WEATHER_CODES[weatherCode]) {
      conditions.push(WMO_WEATHER_CODES[weatherCode]
        .replace(/slight|moderate|dense/i, '')
        .replace(/mainly|partly/i, '')
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
      );
    }
  }

  // Add visibility condition using standardized description
  const visibilityDesc = getStandardizedVisibilityDescription(visibility);
  if (visibilityDesc) {
    conditions.push(visibilityDesc);
  }

  // Add standardized wind condition
  const windDesc = getStandardizedWindDescription(windSpeed, windGusts);
  if (windDesc) {
    conditions.push(windDesc);
  }

  return conditions;
}

// Helper function to get standardized wind description
function getStandardizedWindDescription(speed: number, gusts?: number): string {
  if (gusts && gusts >= 35) return "💨 Strong Wind Gusts";
  if (gusts && gusts >= 25 || speed >= 25) return "💨 Strong Winds";
  if (speed >= 15) return "💨 Moderate Winds";
  // Remove light and very light wind descriptions
  return "";
}

// Update the getAirportWeather function
export async function getAirportWeather(): Promise<WeatherResponse | null> {
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
      fetchOpenMeteoForecast()
    ]);

    if (!weatherResponse.ok) {
      throw new Error('Weather data fetch failed');
    }

    const data = await weatherResponse.json();
    const { metar, taf } = data;

    const currentWeather: WeatherData = metar.data[0];
    const forecast: TAFData = taf.data[0];

    const currentAssessment = assessWeatherRisk(currentWeather);
    const allForecastPeriods = processForecast(forecast);
    const filteredForecast = filterForecastPeriods(allForecastPeriods);

    // Combine forecasts if Open-Meteo data is available
    const combinedForecast = openMeteoData 
      ? combineForecasts(filteredForecast, openMeteoData)
      : filteredForecast;

    // Rest of the function remains the same...
    // Return the combined forecast instead of filtered forecast
    return {
      current: {
        riskLevel: currentAssessment,
        conditions: {
          phenomena: [
            // Weather phenomena
            ...((() => {
              const phenomena = currentWeather.conditions?.map(c => {
                return WEATHER_PHENOMENA[c.code as WeatherPhenomenon];
              }).filter((p): p is WeatherPhenomenonValue => p !== undefined) || [];
              return phenomena;
            })()),
            // Wind with standardized description
            ...((() => {
              if (currentWeather.wind) {
                const windDesc = getStandardizedWindDescription(
                  currentWeather.wind.speed_kts,
                  currentWeather.wind.gust_kts
                );
                return windDesc ? [windDesc] : [];
              }
              return [];
            })()),
            // Visibility with standardized description
            ...((() => {
              if (currentWeather.visibility?.meters) {
                const visDesc = getStandardizedVisibilityDescription(
                  currentWeather.visibility.meters
                );
                return visDesc ? [visDesc] : [];
              }
              return [];
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
      forecast: combinedForecast,
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
      // Create Date objects from the timestamps
      const fromDate = new Date(period.timestamp.from);
      const toDate = new Date(period.timestamp.to);
      
      // Adjust times considering the specific timestamps for DST calculation
      const from = adjustToWarsawTime(fromDate);
      const to = adjustToWarsawTime(toDate);
      
      const periodTime = formatTimeDescription(from, to);
      const assessment = assessWeatherRisk(period);
      
      console.log(`\n=== Processing Period ${index + 1}: ${periodTime} ===`);

      // Process weather phenomena
      const weatherPhenomena = period.conditions?.map(c => {
        if (c.code === 'NSW' as WeatherPhenomenon) return undefined;
        return WEATHER_PHENOMENA[c.code as WeatherPhenomenon];
      }).filter((p): p is WeatherPhenomenonValue => p !== undefined) || [];

      // Process wind phenomena using standardized description
      const windPhenomena = period.wind ? [
        getStandardizedWindDescription(period.wind.speed_kts, period.wind.gust_kts)
      ].filter(Boolean) : [];

      // Combine all phenomena
      const allPhenomena = [
        ...weatherPhenomena,
        ...windPhenomena
      ].filter((p): p is string => p !== null);

      changes.push({
        timeDescription: formatTimeDescription(from, to),
        from,
        to,
        conditions: {
          phenomena: allPhenomena
        },
        riskLevel: assessment,
        changeType: period.change?.indicator?.code || 'PERSISTENT',
        visibility: period.visibility,
        ceiling: period.ceiling,
        isTemporary: period.change?.indicator?.code === 'TEMPO',
        probability: period.change?.probability,
        wind: period.wind
      });
    }
  });

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
  const { score, reasons } = calculateRiskScore(weather);
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