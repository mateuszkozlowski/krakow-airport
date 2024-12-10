// src/lib/weather.ts

import {
  WeatherData,
  TAFData,
  RiskAssessment,
  ForecastChange,
  WeatherResponse,
  WeatherCondition,
} from './types/weather';

// Import WEATHER_PHENOMENA as a value, not a type
import { WEATHER_PHENOMENA } from './types/weather';

type WeatherPhenomenonValue = typeof WEATHER_PHENOMENA[keyof typeof WEATHER_PHENOMENA];

const CHECKWX_API_KEY = process.env.NEXT_PUBLIC_CHECKWX_API_KEY;
const AIRPORT = 'EPKK';

// CAT I approach minimums for EPKK
const MINIMUMS = {
  VISIBILITY: 550,  // meters
  CEILING: 200     // feet
} as const;

export async function getAirportWeather(): Promise<WeatherResponse | null> {
  try {
    // Fetch both METAR and TAF
    const [metarResponse, tafResponse] = await Promise.all([
      fetch(`https://api.checkwx.com/metar/${AIRPORT}/decoded`, {
        headers: { 'X-API-Key': CHECKWX_API_KEY ?? '' }
      }),
      fetch(`https://api.checkwx.com/taf/${AIRPORT}/decoded`, {
        headers: { 'X-API-Key': CHECKWX_API_KEY ?? '' }
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

function formatTimeDescription(start: Date, end: Date): string {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Warsaw'
    });
  };

  const now = new Date();
  if (start < now) {
    return `Until ${formatTime(end)}`;
  }

  return `${formatTime(start)} - ${formatTime(end)}`;
}

function processForecast(taf: TAFData | null): ForecastChange[] {
  if (!taf || !taf.forecast) return [];

  const changes: ForecastChange[] = [];
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  taf.forecast.forEach(period => {
    const periodStart = new Date(period.timestamp?.from ?? '');
    const periodEnd = new Date(period.timestamp?.to ?? '');
    
    // Only include future periods and today's periods
    if (periodEnd > now && periodStart < endOfDay) {
      const timeDescription = formatTimeDescription(periodStart, periodEnd);
      const assessment = assessWeatherRisk(period);
      const phenomena = processWeatherPhenomena(period.conditions);

      changes.push({
        timeDescription,
        from: periodStart,
        to: periodEnd,
        conditions: {
          phenomena
        },
        riskLevel: assessment,
        changeType: period.change_indicator || 'PERSISTENT'
      });
    }
  });

  // Sort changes by start time
  return changes.sort((a, b) => a.from.getTime() - b.from.getTime());
}

function processWeatherPhenomena(conditions?: WeatherCondition[]): WeatherPhenomenonValue[] {
  if (!conditions) return [];
  
  return conditions
    .map(c => WEATHER_PHENOMENA[c.code])
    .filter((p): p is WeatherPhenomenonValue => 
      p !== undefined && shouldShowPhenomenon(p)
    );
}

function shouldShowPhenomenon(phenomenon: WeatherPhenomenonValue): boolean {
  // Hide certain phenomena that are less relevant for passengers
  const hiddenPhenomena = ['⛅ Scattered Clouds', '☁️ Broken Clouds', '☁️ ☁️ Complete Overcast'];
  return !hiddenPhenomena.includes(phenomenon);
}

function assessWeatherRisk(weather: WeatherData): RiskAssessment {
  const reasons: string[] = [];
  let level: 1 | 2 | 3 = 1; // default: no risk

  // Check visibility
  if (weather.visibility?.meters && weather.visibility.meters < MINIMUMS.VISIBILITY) {
    reasons.push("Visibility is below landing minimums");
    level = 3;
  } else if (weather.visibility?.meters && weather.visibility.meters < 1500) {
    reasons.push("Low visibility conditions");
    level = Math.max(level, 2) as 1 | 2 | 3;
  }

  // Check ceiling
  if (weather.ceiling?.feet && weather.ceiling.feet < MINIMUMS.CEILING) {
    reasons.push("Cloud ceiling is too low for landings");
    level = 3;
  } else if (weather.ceiling?.feet && weather.ceiling.feet < 500) {
    reasons.push("Low cloud ceiling");
    level = Math.max(level, 2) as 1 | 2 | 3;
  }

  // Check wind
  if (weather.wind?.speed_kts && weather.wind.speed_kts >= 25) {
    reasons.push(`Strong winds (${weather.wind.speed_kts}kt)`);
    level = Math.max(level, 2) as 1 | 2 | 3;
  }

  // Check weather phenomena
  if (weather.conditions) {
    for (const condition of weather.conditions) {
      const phenomenon = WEATHER_PHENOMENA[condition.code];
      if (phenomenon && shouldShowPhenomenon(phenomenon)) {
        reasons.push(phenomenon);
        // Severe weather conditions
        if (['TS', 'TSRA', 'FZRA', 'FZFG'].includes(condition.code)) {
          level = 3;
        }
        // Moderate weather conditions
        else if (['BR', 'RA', 'SN', 'FG'].includes(condition.code)) {
          level = Math.max(level, 2) as 1 | 2 | 3;
        }
      }
    }
  }

  // Return assessment based on level
  switch (level) {
    case 3:
      return {
        level,
        title: "High risk of disruptions",
        message: "Flights may be cancelled or diverted",
        explanation: reasons.length > 0 
          ? `Current conditions that may affect flights:\n• ${reasons.join('\n• ')}\n\nCheck with your airline before traveling to the airport.`
          : "Severe weather conditions expected. Check with your airline before traveling to the airport.",
        color: "red"
      };

    case 2:
      return {
        level,
        title: "Some delays possible",
        message: "Weather might affect flight schedules",
        explanation: reasons.length > 0
          ? `Current conditions that may cause delays:\n• ${reasons.join('\n• ')}\n\nAllow extra time for your journey.`
          : "Weather conditions might cause some delays. Allow extra time for your journey.",
        color: "orange"
      };

    default:
      return {
        level,
        title: "No disruptions expected",
        message: "Weather conditions are suitable for flying",
        explanation: "Current weather conditions at the airport are good for flying. ✈️",
        color: "green"
      };
  }
}