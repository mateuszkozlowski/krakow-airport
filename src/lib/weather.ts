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
    isTemporary: f.isTemporary,
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

  // Process each hour from OpenMeteo
  for (let i = 0; i < openMeteoData.hourly.time.length; i++) {
    const time = new Date(openMeteoData.hourly.time[i]);
    const weatherCode = openMeteoData.hourly.weather_code[i];
    const visibility = openMeteoData.hourly.visibility[i];
    const windSpeed = openMeteoData.hourly.wind_speed_10m[i];
    const windGusts = openMeteoData.hourly.wind_gusts_10m[i];
    const precipProb = openMeteoData.hourly.precipitation_probability[i];
    const rain = openMeteoData.hourly.rain[i];
    const snow = openMeteoData.hourly.snowfall[i];

    console.log(`Processing OpenMeteo hour ${time.toLocaleString('en-GB', { timeZone: 'Europe/Warsaw' })}:`, {
      visibility: `${visibility}m`,
      belowMinimums: visibility < MINIMUMS.VISIBILITY,
      weatherCode,
      precipProb,
      conditions: getOpenMeteoConditions({
        weatherCode,
        visibility,
        windSpeed,
        windGusts,
        precipProb,
        rain,
        snow
      })
    });

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
  const newPeriods: ForecastChange[] = [];

  for (const period of combined) {
    if (period.isTemporary) {
      newPeriods.push(period);
      continue;
    }

    let currentStart = period.from;
    let currentConditions = new Set<string>();
    let currentRisk = period.riskLevel.level;
    let currentVisibility = period.visibility?.meters;
    
    const periodEnd = period.to;
    let hourToCheck = new Date(currentStart);

    while (hourToCheck <= periodEnd) {
      const timeKey = hourToCheck.getTime();
      const hourData = hourlyConditions.get(timeKey);

      if (hourData) {
        // Merge conditions intelligently
        const newConditions = new Set<string>();
        
        // Add visibility condition first (only the most severe one)
        if (hourData.visibility && hourData.visibility < MINIMUMS.VISIBILITY) {
          newConditions.add("👁️ Visibility Below Minimums");
        } else if (hourData.visibility && hourData.visibility < 1000) {
          newConditions.add("👁️ Poor Visibility");
        } else if (hourData.visibility && hourData.visibility < 3000) {
          newConditions.add("👁️ Reduced Visibility");
        }

        // Add precipitation (only the most severe one)
        const precipConditions = [...currentConditions, ...hourData.conditions]
          .filter(c => c.includes('🌧️') || c.includes('🌨️') || c.includes('⛈️'));
        if (precipConditions.length > 0) {
          // Order by severity
          const severityOrder = [
            '⛈️', // Thunderstorm first
            '🌨️ Heavy', // Heavy snow
            '🌨️', // Snow
            '🌧️ Heavy', // Heavy rain/drizzle
            '🌧️', // Rain/drizzle
            '🌧️ Light', // Light rain/drizzle
          ];
          const mostSevere = precipConditions.sort((a, b) => {
            const aIndex = severityOrder.findIndex(s => a.includes(s));
            const bIndex = severityOrder.findIndex(s => b.includes(s));
            return aIndex - bIndex;
          })[0];
          newConditions.add(mostSevere);
        }

        // Add wind condition (only the most severe one)
        const windConditions = [...currentConditions, ...hourData.conditions]
          .filter(c => c.includes('💨'));
        if (windConditions.length > 0) {
          const severityOrder = [
            '💨 Strong Wind Gusts',
            '💨 Strong Winds',
            '💨 Moderate Winds'
          ];
          const mostSevere = windConditions.sort((a, b) => {
            const aIndex = severityOrder.indexOf(a);
            const bIndex = severityOrder.indexOf(b);
            return aIndex - bIndex;
          })[0];
          newConditions.add(mostSevere);
        }

        // Check if we need to split the period
        const shouldSplit = 
          Math.abs(hourData.risk - currentRisk) >= 1 || 
          (hourData.visibility && hourData.visibility < MINIMUMS.VISIBILITY && 
           (!currentVisibility || currentVisibility >= MINIMUMS.VISIBILITY)) ||
          (currentVisibility && currentVisibility < MINIMUMS.VISIBILITY && 
           hourData.visibility && hourData.visibility >= MINIMUMS.VISIBILITY);

        if (shouldSplit && hourToCheck > currentStart) {
          // Create new period
          newPeriods.push({
            ...period,
            from: currentStart,
            to: hourToCheck,
            conditions: {
              phenomena: Array.from(currentConditions)
            },
            visibility: currentVisibility ? { meters: currentVisibility } : undefined,
            riskLevel: {
              ...period.riskLevel,
              level: currentRisk as 1 | 2 | 3 | 4,
              color: currentRisk >= 4 ? 'red' : currentRisk >= 3 ? 'orange' : 'green',
              title: currentRisk >= 4 ? 'Major Weather Impact' : 
                     currentRisk >= 3 ? 'Weather Advisory' : 
                     currentRisk >= 2 ? 'Minor Weather Impact' : 
                     'Good Flying Conditions'
            }
          });

          // Start new period
          currentStart = hourToCheck;
          currentConditions = newConditions;
          currentRisk = hourData.risk as 1 | 2 | 3 | 4;
          currentVisibility = hourData.visibility;
        } else {
          // Update current conditions
          currentConditions = newConditions;
          currentRisk = Math.max(currentRisk, hourData.risk) as 1 | 2 | 3 | 4;
          if (hourData.visibility && hourData.visibility < (currentVisibility || Infinity)) {
            currentVisibility = hourData.visibility;
          }
        }
      }

      hourToCheck = new Date(hourToCheck.getTime() + 60 * 60 * 1000);
    }

    // Add final period
    if (currentStart < periodEnd) {
      newPeriods.push({
        ...period,
        from: currentStart,
        to: periodEnd,
        conditions: {
          phenomena: Array.from(currentConditions)
        },
        visibility: currentVisibility ? { meters: currentVisibility } : undefined,
        riskLevel: {
          ...period.riskLevel,
          level: currentRisk as 1 | 2 | 3 | 4
        }
      });
    }
  }

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
}): string[] {
  const conditions: string[] = [];

  // Add visibility condition first with correct thresholds
  // visibility is in meters from OpenMeteo
  if (visibility < MINIMUMS.VISIBILITY) { // MINIMUMS.VISIBILITY is 550m
    conditions.push("👁️ Visibility Below Minimums");
  } else if (visibility < 1000) {
    conditions.push("👁️ Poor Visibility");
  } else if (visibility < 3000) {
    conditions.push("👁️ Reduced Visibility");
  }

  // Standardize precipitation descriptions with probability check
  const getPrecipitationDescription = (code: number, probability: number): string | null => {
    // Only add precipitation if probability is significant (>40%)
    if (probability < 40) return null;

    const precipMap: Record<number, string> = {
      51: '🌧️ Light Drizzle',
      53: '🌧️ Moderate Drizzle',
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

  // Add weather condition with probability check
  if (weatherCode >= 45) {
    const precipDescription = getPrecipitationDescription(weatherCode, precipProb);
    if (precipDescription) {
      conditions.push(precipDescription);
    }
  }

  // Add standardized wind condition
  const windDesc = getStandardizedWindDescription(windSpeed, windGusts);
  if (windDesc) {
    conditions.push(windDesc);
  }

  console.log('OpenMeteo conditions generated:', {
    weatherCode,
    visibility: `${visibility}m`,
    belowMinimums: visibility < MINIMUMS.VISIBILITY,
    minimums: MINIMUMS.VISIBILITY,
    precipProb,
    conditions
  });

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
  if (!taf || !taf.forecast) return [];

  // Log the raw TAF text and data
  console.log('Raw TAF:', {
    raw_text: taf.raw_text,
    forecast: taf.forecast.map(p => ({
      type: p.change?.indicator?.code || 'BASE',
      conditions: p.conditions,
      visibility: p.visibility?.meters,
      clouds: p.clouds,
      wind: p.wind,
      timestamp: p.timestamp,
      raw: JSON.stringify(p)
    }))
  });

  const changes: ForecastChange[] = [];
  let prevailingConditions: string[] = [];

  // Process each period
  taf.forecast.forEach((period, index) => {
    if (!period.timestamp) return;

    // Log TEMPO period details
    if (period.change?.indicator?.code === 'TEMPO') {
      console.log('\nTEMPO period raw data:', {
        conditions: period.conditions,
        visibility: period.visibility,
        clouds: period.clouds,
        timestamp: period.timestamp,
        raw: JSON.stringify(period)
      });
    }

    const fromDate = new Date(period.timestamp.from);
    const toDate = new Date(period.timestamp.to);
    const from = adjustToWarsawTime(fromDate);
    const to = adjustToWarsawTime(toDate);
    const assessment = assessWeatherRisk(period);
      
    // Process all weather conditions
    const currentConditions: string[] = [];

    // Process weather phenomena first
    if (period.conditions) {
      console.log('Processing conditions for', period.change?.indicator?.code || 'BASE');
      for (const condition of period.conditions) {
        console.log('  - Condition:', {
          code: condition.code,
          mapped: WEATHER_PHENOMENA[condition.code as WeatherPhenomenon],
          isTemporary: period.change?.indicator?.code === 'TEMPO'
        });
        const phenomenon = WEATHER_PHENOMENA[condition.code as WeatherPhenomenon];
        if (phenomenon) {
          currentConditions.push(phenomenon);
          console.log('    Added:', phenomenon);
        }
      }
    }
    // Process cloud conditions
    if (period.clouds && period.clouds.length > 0 && period.change?.indicator?.code !== 'TEMPO') {  // Skip for TEMPO
      const significantCloud = period.clouds
        .filter(cloud => cloud.code === 'BKN' || cloud.code === 'OVC')
        .sort((a, b) => (a.base_feet_agl || 0) - (b.base_feet_agl || 0))[0];

      if (significantCloud && significantCloud.base_feet_agl) {
        const cloudDesc = `☁️ ${significantCloud.code} ${significantCloud.base_feet_agl}ft`;
        currentConditions.push(cloudDesc);
        console.log('Added cloud condition:', cloudDesc);
      }
    }

    // Add wind if significant
    const windDesc = period.wind ? 
      getStandardizedWindDescription(period.wind.speed_kts, period.wind.gust_kts) : 
      null;
    if (windDesc) {
      currentConditions.push(windDesc);
      console.log('Added wind condition:', windDesc);
    }

    // Add visibility if reduced
    if (period.visibility?.meters && period.visibility.meters < 5000) {
      const visDesc = getStandardizedVisibilityDescription(period.visibility.meters);
      currentConditions.push(visDesc);
      console.log('Added visibility condition:', visDesc);
    }

    // Log before creating the change object
    if (period.change?.indicator?.code === 'TEMPO') {
      console.log('TEMPO period before creating change:', {
        currentConditions,
        prevailingConditions,
        from: from.toISOString(),
        to: to.toISOString()
      });
    }

    changes.push({
      timeDescription: formatTimeDescription(from, to),
      from,
      to,
      conditions: {
        phenomena: currentConditions
      },
      riskLevel: assessment,
      changeType: period.change?.indicator?.code || 'PERSISTENT',
      visibility: period.visibility,
      ceiling: period.ceiling,
      isTemporary: period.change?.indicator?.code === 'TEMPO',
      probability: period.change?.probability,
      wind: period.wind
    });

    // Log after pushing the change
    if (period.change?.indicator?.code === 'TEMPO') {
      console.log('TEMPO period after pushing change:', {
        phenomena: changes[changes.length - 1].conditions.phenomena,
        isTemporary: changes[changes.length - 1].isTemporary
      });
    }

    // For first period or BECMG, update prevailing conditions
    if (index === 0 || period.change?.indicator?.code === 'BECMG') {
      prevailingConditions = [...currentConditions];
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
  
  // Time-based risk factors
  const hour = new Date(weather.observed).getHours();
  const month = new Date(weather.observed).getMonth();
  
  let timeRiskMultiplier = 1.0;
  
  // Early morning risk factor (3-7 AM)
  if (hour >= 3 && hour <= 7) {
    timeRiskMultiplier = 1.3;
    reasons.push("⏰ Early morning high-risk period");
  }
  
  // Winter season risk factor (Oct-Feb)
    if (month >= 9 || month <= 1) {
    timeRiskMultiplier *= 1.2;
    reasons.push("❄️ Winter season risk factor");
  }

  // De-icing risk
  const { score: deicingScore, reason: deicingReason } = calculateDeicingRisk(weather);
  if (deicingScore > 0) {
    totalScore += deicingScore;
    if (deicingReason) reasons.push(deicingReason);
  }

  // Existing risk calculations...
  if (weather.conditions) {
    for (const condition of weather.conditions) {
      // Add your existing condition checks here
      // Use the new RISK_WEIGHTS values
    }
  }

  // Apply time-based multiplier
  totalScore *= timeRiskMultiplier;

  return { score: totalScore, reasons };
}

function getWeatherDescription(reasons: string[], impacts: string[]): string {
  if (!reasons.length && !impacts.length) {
      return "☀️ Clear skies and good visibility";
    }
    
    // Combine weather reasons with operational impacts
    const allImpacts = [...impacts];
  if (reasons.length > 0) {
    const primaryReason = reasons[0];
      const description = Object.entries(weatherDescriptions).find(
        ([condition]) => primaryReason.includes(condition)
      );
      if (description) {
        allImpacts.unshift(description[1]);
      }
    }
    
    return allImpacts.join(" • ");
}

function assessWeatherRisk(weather: WeatherData): RiskAssessment {
  const { score, reasons } = calculateRiskScore(weather);
  const operationalImpacts = assessOperationalImpacts(weather);

  // Check for visibility below minimums (highest risk) - expanded check
  if ((weather.visibility && weather.visibility.meters < MINIMUMS.VISIBILITY) || 
      (weather.conditions?.some(c => c.code === 'FZFG' || c.code === 'FG'))) {
    return {
      level: 4,
      title: "Severe Weather Impact",
      message: "Operations significantly affected due to visibility below minimums",
      explanation: getWeatherDescription([
        "👁️ Visibility below landing minimums",
        ...reasons
      ], operationalImpacts),
      color: "red",
      operationalImpacts: [
        "Visibility below safe landing requirements",
        "High chance of flight diversions",
        "Significant delays likely",
        ...operationalImpacts
      ]
    };
  }

  // Only escalate to Minor Weather Impact for heavy precipitation
  if (weather.conditions?.some(c => 
    (c.code.includes('RA') || c.code.includes('DZ')) && c.code.startsWith('+')
  )) {
    return {
      level: 2,
      title: "Minor Weather Impact",
      message: "Some delays possible due to heavy precipitation.",
      explanation: getWeatherDescription(reasons, operationalImpacts),
      color: "orange",
      operationalImpacts
    };
  }

  // Default return for good conditions (including light/moderate rain)
    return {
      level: 1,
      title: "Good Flying Conditions",
      message: "Weather conditions are favorable for normal operations.",
      explanation: getWeatherDescription(reasons, operationalImpacts),
      color: "green",
      operationalImpacts
    };
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

// Add the de-icing risk calculation
function calculateDeicingRisk(weather: WeatherData): { score: number; reason?: string } {
  if (!weather.temperature?.celsius) {
    return { score: 0 };
  }

  const temp = weather.temperature.celsius;
  let deicingScore = 0;
  let reason = '';

  // Temperature-based assessment
  if (temp <= RISK_WEIGHTS.DEICING.TEMPERATURE_THRESHOLDS.SEVERE) {
    deicingScore = RISK_WEIGHTS.DEICING.BASE_SCORES.CERTAIN;
    reason = "❄️ Severe icing conditions";
  } else if (temp <= RISK_WEIGHTS.DEICING.TEMPERATURE_THRESHOLDS.HIGH_RISK) {
    deicingScore = RISK_WEIGHTS.DEICING.BASE_SCORES.LIKELY;
    reason = "❄️ High icing risk";
  } else if (temp <= RISK_WEIGHTS.DEICING.TEMPERATURE_THRESHOLDS.BELOW_ZERO) {
    deicingScore = RISK_WEIGHTS.DEICING.BASE_SCORES.POSSIBLE;
    reason = "❄️ Possible icing conditions";
  }

  // Increase risk if precipitation present in cold temperatures
  if (deicingScore > 0 && weather.conditions) {
    const hasPrecipitation = weather.conditions.some(c => 
      ['RA', 'SN', 'FZRA', 'FZDZ', 'SHSN', 'SHRA'].some(code => 
        c.code.includes(code)
      )
    );
    if (hasPrecipitation) {
      deicingScore *= 1.5;  // 50% increase if precipitation present
      reason += " with active precipitation";
    }
  }

  return { score: deicingScore, reason };
}