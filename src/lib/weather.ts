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
    'SN',      // Snow
    'SHSN'     // Snow showers
  ])
} as const;

// Add a visibility trend tracker
const previousVisibilityReading: {
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
function filterForecastPeriods(forecast: ForecastChange[]): ForecastChange[] {
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
          timeDescription: formatTimeDescription(now, period.to)
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
  const TAF_WEIGHT = 0.7;  // TAF is more authoritative
  const OPENMETEO_WEIGHT = 0.3;

  // First, process OpenMeteo data into hourly conditions
  const hourlyConditions = new Map<string, {
    visibility: number;
    weatherCode: number;
    precipProb: number;
    windSpeed: number;
    windGusts: number;
    rain: number;
    snow: number;
    trend?: 'improving' | 'deteriorating' | 'stable';
  }>();

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

  // Process each TAF period
  return tafForecast.map(period => {
    // For TEMPO periods, just return as is
    if (period.isTemporary) return period;

    // Get OpenMeteo data for this period's timeframe
    const periodStart = period.from.toISOString().split('.')[0];
    const openMeteoHour = hourlyConditions.get(periodStart);

    if (!openMeteoHour) return period;

    // Calculate weighted risk level
    const tafRisk = period.riskLevel.level;
    const openMeteoRisk = calculateOpenMeteoRisk(openMeteoHour);
    
    // Calculate combined risk level
    const weightedRisk = Math.round(
      (tafRisk * TAF_WEIGHT + openMeteoRisk * OPENMETEO_WEIGHT) as 1 | 2 | 3 | 4
    );

    // Only update risk level if OpenMeteo suggests significantly worse conditions
    if (weightedRisk > tafRisk) {
      // Update the risk level but keep the original messages
      period.riskLevel = {
        ...period.riskLevel,
        level: weightedRisk as 1 | 2 | 3 | 4,
        title: weightedRisk === 4 ? "Major Weather Impact" :
               weightedRisk === 3 ? "Weather Advisory" :
               weightedRisk === 2 ? "Minor Weather Impact" :
               "Good Flying Conditions"
      };
    }

    // Use trend to adjust risk level but don't show it in UI
    if (openMeteoHour.trend === 'deteriorating' && period.riskLevel.level < 4) {
      period.riskLevel.level = Math.min(4, period.riskLevel.level + 1) as 1 | 2 | 3 | 4;
    }

    return period;
  });
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

    // First process TAF data
    const tafPeriods = processForecast(forecast);

    // Then combine with OpenMeteo if available
    const combinedForecast = openMeteoData 
      ? combineForecasts(tafPeriods, openMeteoData)
      : tafPeriods;

    const currentAssessment = assessWeatherRisk(currentWeather);

    // Return the combined forecast
    return {
      current: {
        riskLevel: currentAssessment,
        conditions: {
          phenomena: [
            ...(currentWeather.conditions?.map(c => {
              const phenomenon = WEATHER_PHENOMENA[c.code as WeatherPhenomenon];
              return phenomenon;
            }).filter((p): p is typeof WEATHER_PHENOMENA[WeatherPhenomenon] => p !== undefined) || []),
            ...(currentWeather.wind ? 
              [getStandardizedWindDescription(
                currentWeather.wind.speed_kts,
                currentWeather.wind.gust_kts
              )].filter(Boolean) : 
              []
            ),
            ...(currentWeather.visibility ? 
              [formatVisibility(currentWeather.visibility.meters)].filter(Boolean) : 
              []
            ),
            ...(currentWeather.ceiling ? 
              [formatCeiling(currentWeather.ceiling.feet)].filter(Boolean) : 
              []
            )
          ].filter(Boolean)
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

  const changes: ForecastChange[] = [];
  
  // First, sort and validate periods
  const validPeriods = taf.forecast
    .filter(period => period.timestamp)
    .map(period => ({
      ...period,
      from: adjustToWarsawTime(new Date(period.timestamp!.from)),
      to: adjustToWarsawTime(new Date(period.timestamp!.to))
    }))
    .filter(period => 
      period.from < period.to && // Remove zero-duration periods
      period.from.getTime() !== period.to.getTime()
    )
    .sort((a, b) => a.from.getTime() - b.from.getTime());

  if (validPeriods.length === 0) return [];

  // Process each period
  validPeriods.forEach((period, index) => {
    const currentConditions = new Set<string>();

    // Process visibility first - it's critical!
    if (period.visibility?.meters) {
      const visDesc = formatVisibility(period.visibility.meters);
      if (visDesc) {
        currentConditions.add(visDesc);
      }
    }

    // Process ceiling/clouds next
    if (period.clouds && period.clouds.length > 0) {
      const significantCloud = period.clouds
        .filter(cloud => cloud.code === 'BKN' || cloud.code === 'OVC')
        .sort((a, b) => (a.base_feet_agl || 0) - (b.base_feet_agl || 0))[0];

      if (significantCloud && significantCloud.base_feet_agl) {
        if (significantCloud.base_feet_agl < 500) { // Only show if below 500ft
          const ceilingDesc = formatCeiling(significantCloud.base_feet_agl);
          if (ceilingDesc) {
            currentConditions.add(ceilingDesc);
          }
        }
      }
    }

    // Process weather phenomena
    if (period.conditions) {
      for (const condition of period.conditions) {
        const phenomenon = WEATHER_PHENOMENA[condition.code as WeatherPhenomenon];
        if (phenomenon) {
          currentConditions.add(phenomenon);
        }
      }
    }

    // Add wind if significant
    const windDesc = period.wind ? 
      getStandardizedWindDescription(period.wind.speed_kts, period.wind.gust_kts) : 
      null;
    if (windDesc) {
      currentConditions.add(windDesc);
    }

    // Determine risk level based on conditions
    let riskLevel: RiskAssessment;
    let operationalImpacts: string[] = [];

    // Check for severe conditions first
    if (period.visibility?.meters && period.visibility.meters < MINIMUMS.VISIBILITY) {
      riskLevel = {
        level: 4,
        title: "Major Weather Impact",
        message: `Operations suspended - visibility ${period.visibility.meters}m below minimums`,
        color: "red"
      };
      operationalImpacts = ["⛔ Operations suspended - below minimums", "✈️ Diversions likely"];
    } else if (period.conditions?.some(c => ['FZFG', 'FZRA', 'FZDZ'].includes(c.code))) {
      riskLevel = {
        level: 4,
        title: "Major Weather Impact",
        message: "Operations suspended - freezing conditions",
        color: "red"
      };
      operationalImpacts = ["⛔ Operations suspended", "❄️ De-icing required", "✈️ Diversions likely"];
    } else if (period.visibility?.meters && period.visibility.meters < 2000) {
      riskLevel = {
        level: 3,
        title: "Weather Advisory",
        message: "Operations restricted - poor visibility",
        color: "orange"
      };
      operationalImpacts = ["⚠️ Possible delays", "✈️ Some flights may divert"];
    } else if (
      (period.visibility?.meters && period.visibility.meters < 3000) ||
      (period.clouds?.some(cloud => 
        (cloud.code === 'BKN' || cloud.code === 'OVC') && 
        cloud.base_feet_agl && 
        cloud.base_feet_agl < MINIMUMS.CEILING
      ))
    ) {
      riskLevel = {
        level: 2,
        title: "Minor Weather Impact",
        message: "Minor operational impacts expected",
        color: "yellow"
      };
      operationalImpacts = ["⏳ Minor delays possible", "✈️ Operations continuing with caution"];
    } else {
      riskLevel = {
        level: 1,
        title: "Good Flying Conditions",
        message: "Normal operations",
        color: "green"
      };
      operationalImpacts = ["✈️ Normal operations"];
    }

    // Add probability to message if it exists
    if (period.change?.probability) {
      riskLevel.message = `${period.change.probability}% probability: ${riskLevel.message}`;
      operationalImpacts = operationalImpacts.map(impact => 
        `${period.change?.probability ?? 100}% probability: ${impact}`
      );
    }

    // Only create a period if there are conditions or it's a TEMPO/PROB period
    if (currentConditions.size > 0 || 
        (period.change && 
         (period.change.indicator?.code === 'TEMPO' || period.change.probability))
    ) {
      changes.push({
        timeDescription: formatTimeDescription(period.from, period.to),
        from: period.from,
        to: period.to,
        conditions: {
          phenomena: Array.from(currentConditions)
        },
        riskLevel,
        changeType: period.change?.indicator?.code || 'PERSISTENT',
        visibility: period.visibility,
        ceiling: period.ceiling,
        isTemporary: period.change?.indicator?.code === 'TEMPO',
        probability: period.change?.probability,
        wind: period.wind,
        operationalImpacts: operationalImpacts
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

  // Check for visibility or ceiling below minimums (highest risk)
  if ((weather.visibility && weather.visibility.meters < MINIMUMS.VISIBILITY) || 
      (weather.ceiling && weather.ceiling.feet < MINIMUMS.CEILING) ||
      (weather.conditions?.some(c => c.code === 'FZFG' || c.code === 'FG'))) {
    return {
      level: 4,
      title: "Severe Weather Impact",
      message: weather.ceiling && weather.ceiling.feet < MINIMUMS.CEILING
        ? "Operations significantly affected due to ceiling below minimums"
        : "Operations significantly affected due to visibility below minimums",
      explanation: getWeatherDescription([
        weather.ceiling && weather.ceiling.feet < MINIMUMS.CEILING
          ? "☁️ Ceiling below landing minimums"
          : "👁️ Visibility below landing minimums",
        ...reasons
      ], operationalImpacts),
      color: "red",
      operationalImpacts
    };
  }

  // Check for conditions close to minimums
  if ((weather.visibility && weather.visibility.meters < NEAR_MINIMUMS.VISIBILITY) ||
      (weather.ceiling && weather.ceiling.feet < NEAR_MINIMUMS.CEILING)) {
    const level = 2;
    const title = "Minor Weather Impact";
    
    const message = weather.ceiling && weather.ceiling.feet < NEAR_MINIMUMS.CEILING
      ? weather.visibility && weather.visibility.meters < NEAR_MINIMUMS.VISIBILITY
        ? "Ceiling and visibility close to minimums"
        : "Ceiling close to minimums"
      : "Visibility close to minimums";

    return {
      level,
      title,
      message,
      explanation: getWeatherDescription(reasons, operationalImpacts),
      color: "orange",
      operationalImpacts
    };
  }

  // Default return for good conditions
  const level = 1;
  const title = "Good Flying Conditions";
  return {
    level,
    title,
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

// Add this helper function for formatting visibility
function formatVisibility(meters: number): string {
  if (meters < MINIMUMS.VISIBILITY) {
    return `👁️ Visibility Below Minimums (${meters}m)`;
  }
  if (meters < 1000) {
    return `👁️ Very Poor Visibility (${meters}m)`;
  }
  if (meters < 3000) {
    return `👁️ Poor Visibility`;  // No specific value needed
  }
  if (meters < 5000) {
    return `👁️ Reduced Visibility`; // No specific value needed
  }
  return ''; // Don't show good visibility
}

// Add this helper function for formatting ceiling
function formatCeiling(feet: number): string {
  if (feet < MINIMUMS.CEILING) {
    return `☁️ Ceiling Below Minimums`;
  }
  if (feet < 500) {
    return `☁️ Very Low Ceiling`;
  }
  return ''; // Don't show ceiling if it's above 500ft
}