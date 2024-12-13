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

const CHECKWX_API_KEY = process.env.NEXT_PUBLIC_CHECKWX_API_KEY;
const AIRPORT = 'EPKK';

// CAT I approach minimums for EPKK
const MINIMUMS = {
  VISIBILITY: 550,   // meters
  CEILING: 200     // feet
} as const;

// Risk weights for different conditions tailored to Kraków's usual conditions
const RISK_WEIGHTS = {
  // Severe phenomena (immediate impact)
  PHENOMENA_SEVERE: {
    TS: 100,    // Thunderstorm
    TSRA: 100,  // Thunderstorm with rain
    FZRA: 70,   // Freezing rain
    FZDZ: 50,   // Freezing drizzle
    FZFG: 50,   // Freezing fog
    FC: 100,    // Funnel cloud
    SS: 90      // Sandstorm (rare but kept high)
  },
  
  // Moderate phenomena (adjusted for local conditions)
  PHENOMENA_MODERATE: {
    SN: 40,     // Snow (further lowered)
    SG: 40,     // Snow grains (further lowered)
    BR: 25,     // Mist (kept low)
    FG: 55,     // Fog (common but still impactful)
    RA: 20,     // Rain (reduced significantly for routine tolerance)
    GR: 70,     // Hail (unchanged, still significant)
    GS: 55,     // Small hail (unchanged)
    '+RA': 40,  // Heavy rain (reduced for familiarity)
    '+SN': 50   // Heavy snow (lowered further)
  },
  
  // Visibility weights (adjusted for operational tolerance)
  VISIBILITY: {
    BELOW_MINIMUM: 100,  // Below landing minimum
    VERY_LOW: 60,        // Below 1000m (slightly lowered)
    LOW: 40,             // Below 1500m (adjusted for routine tolerance)
    MODERATE: 20         // Below 3000m (minimal impact in Kraków)
  },
  
  // Ceiling weights (adjusted for operational tolerance)
  CEILING: {
    BELOW_MINIMUM: 100,  // Below landing minimum
    VERY_LOW: 60,        // Below 300ft (slightly lowered)
    LOW: 40,             // Below 500ft (adjusted)
    MODERATE: 20         // Below 1000ft (minimal impact)
  },
  
  // Wind weights (unchanged as wind impacts are universal)
  WIND: {
    STRONG_GUSTS: 80,    // Gusts >= 35kt
    STRONG: 60,          // >= 25kt
    MODERATE: 40         // >= 15kt
  }
} as const;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://krk.flights';

export async function getAirportWeather(): Promise<WeatherResponse | null> {
  try {
    const timestamp = new Date().getTime();
    
    const [metarResponse, tafResponse] = await Promise.all([
      fetch(`${API_URL}/api/proxy/weather/metar`, {
        headers: { 
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      }),
      fetch(`${API_URL}/api/proxy/weather/taf`, {
        headers: { 
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      })
    ]);


    if (!metarResponse.ok || !tafResponse.ok) {
      throw new Error('Weather data fetch failed');
    }


    const metarData = await metarResponse.json();
    const tafData = await tafResponse.json();

    const currentWeather: WeatherData = metarData.data[0];
    const forecast: TAFData = tafData.data[0];

    const currentAssessment = assessWeatherRisk(currentWeather);
    const forecastPeriods = processForecast(forecast);

    return {
      current: {
        riskLevel: currentAssessment,
        conditions: {
          phenomena: currentWeather.conditions?.map(c => 
            WEATHER_PHENOMENA[c.code]
          ).filter((p): p is WeatherPhenomenonValue => p !== undefined) || []
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

  const changes: ForecastChange[] = [];

  taf.forecast.forEach((period) => {
    if (period.timestamp) {
      const periodStart = new Date(period.timestamp.from);
      const periodEnd = new Date(period.timestamp.to);
      
      const timeDescription = formatTimeDescription(periodStart, periodEnd);
      const assessment = assessWeatherRisk(period);
      
      const phenomena = period.conditions?.map(c => WEATHER_PHENOMENA[c.code])
        .filter((p): p is WeatherPhenomenonValue => p !== undefined) || [];

      let description = timeDescription;
      if (period.change?.probability) {
        description = `${timeDescription} (${period.change.probability}% probability)`;
      }

      changes.push({
        timeDescription: description,
        from: periodStart,
        to: periodEnd,
        conditions: {
          phenomena
        },
        riskLevel: assessment,
        changeType: period.change?.indicator?.code || 'PERSISTENT'
      });
    }
  });

  return changes.sort((a, b) => {
    const timeCompare = a.from.getTime() - b.from.getTime();
    if (timeCompare === 0) {
      if (a.changeType === 'BECMG' && b.changeType === 'TEMPO') return -1;
      if (a.changeType === 'TEMPO' && b.changeType === 'BECMG') return 1;
    }
    return timeCompare;
  });
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

  if (start.getDate() === today.getDate() && end.getDate() === today.getDate()) {
    return `Today ${startTime} - ${endTime}`;
  } else if (start.getDate() === today.getDate()) {
    return `Today ${startTime} - Tomorrow ${endTime}`;
  } else if (start.getDate() === tomorrow.getDate()) {
    return `Tomorrow ${startTime} - ${endTime}`;
  }

  return `${startTime} - ${endTime}`;
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
      reasons.push(`Strong wind gusts (${weather.wind.gust_kts}kt)`);
    } else if (weather.wind.speed_kts >= 25) {
      totalScore += RISK_WEIGHTS.WIND.STRONG;
      reasons.push(`Strong winds (${weather.wind.speed_kts}kt)`);
    } else if (weather.wind.speed_kts >= 15) {
      totalScore += RISK_WEIGHTS.WIND.MODERATE;
      reasons.push(`Moderate winds (${weather.wind.speed_kts}kt)`);
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
  
  if (score >= 150) {
    return {
      level: 3,
      title: "High risk of disruptions",
      message: "Flights may be cancelled or diverted",
      explanation: `Multiple severe weather conditions (Risk score: ${score}):\n• ${reasons.join('\n• ')}\n\nCheck with your airline before traveling.`,
      color: "red"
    };
  }
  else if (score >= 80) {
    return {
      level: 3,
      title: "High risk of disruptions",
      message: "Flights may be cancelled or diverted",
      explanation: `Severe weather conditions (Risk score: ${score}):\n• ${reasons.join('\n• ')}\n\nCheck with your airline before traveling.`,
      color: "red"
    };
  }
  else if (score >= 40) {
    return {
      level: 2,
      title: "Some delays possible",
      message: "Weather might affect schedules",
      explanation: `Weather conditions that may cause delays (Risk score: ${score}):\n• ${reasons.join('\n• ')}\n\nCheck flight status before traveling.`,
      color: "orange"
    };
  }
  else {
    return {
      level: 1,
      title: "No disruptions expected",
      message: "Good flying conditions",
      explanation: score > 0 
        ? `Minor weather conditions present (Risk score: ${score}):\n• ${reasons.join('\n• ')}\n\nNo significant impact expected.`
        : "Current weather conditions are favorable for flying. ✈️",
      color: "green"
    };
  }
}