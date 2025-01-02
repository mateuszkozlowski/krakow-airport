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
    SN: 40,     // Snow
    SG: 40,     // Snow grains
    BR: 25,     // Mist
    FG: 55,     // Fog
    RA: 20,     // Rain
    SHRA: 30,   // Shower rain
    GR: 70,     // Hail
    GS: 55,     // Small hail
    '+RA': 40,  // Heavy rain
    '+SN': 50   // Heavy snow
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
  
  // Wind weights (adjusted to be more realistic)
  WIND: {
    STRONG_GUSTS: 100,    // Gusts >= 35kt
    STRONG: 70,           // >= 25kt
    MODERATE: 20          // >= 20kt (increased from 15kt)
  }
} as const;

// Add this mapping at the top of the file
const CONDITION_CODE_MAP: Record<string, keyof typeof WEATHER_PHENOMENA> = {
  'light': '-RA',
  'rain': 'RA',
  'rain,': 'RA',
  'rain_showers': 'SHRA',
  'mist': 'BR',
  'fog': 'FG',
  'snow': 'SN',
  'thunderstorm': 'TS',
  // Add more mappings as needed
};

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

  let changes: ForecastChange[] = [];

  taf.forecast.forEach((period) => {
    if (period.timestamp) {
      console.log('Processing period:', {
        conditions: period.conditions,
        raw: period?.raw_text,
        change: period.change
      });
      
      const periodStart = new Date(period.timestamp.from);
      const periodEnd = new Date(period.timestamp.to);
      
      const timeDescription = formatTimeDescription(periodStart, periodEnd);
      const assessment = assessWeatherRisk(period);
      
      const phenomena = period.conditions?.map(c => {
        const mappedCode = CONDITION_CODE_MAP[c.code] || c.code;
        console.log('Processing condition:', c.code, '→', mappedCode, WEATHER_PHENOMENA[mappedCode]);
        return WEATHER_PHENOMENA[mappedCode];
      })
      .filter((p): p is WeatherPhenomenonValue => p !== undefined) || [];

      console.log('Processed phenomena:', phenomena);

      const isTemporary = period.change?.indicator?.code === 'TEMPO';
      const probability = period.change?.probability;

      changes.push({
        timeDescription,
        from: periodStart,
        to: periodEnd,
        conditions: {
          phenomena
        },
        riskLevel: assessment,
        changeType: period.change?.indicator?.code || 'PERSISTENT',
        wind: period.wind,
        visibility: period.visibility,
        ceiling: period.ceiling,
        isTemporary,
        probability
      });
    }
  });

  // Before returning, split overlapping periods
  const splitPeriods: ForecastChange[] = [];
  
  changes.forEach(mainPeriod => {
    if (mainPeriod.isTemporary) {
      // Add temporary periods as-is
      splitPeriods.push({
        ...mainPeriod,
        timeDescription: formatTimeDescription(mainPeriod.from, mainPeriod.to)
      });
      return;
    }

    // Find all temporary periods that overlap with this main period
    const overlapping = changes.filter(p => 
      p.isTemporary && 
      p.from.getTime() >= mainPeriod.from.getTime() && 
      p.to.getTime() <= mainPeriod.to.getTime()
    ).sort((a, b) => a.from.getTime() - b.from.getTime());

    if (overlapping.length === 0) {
      // If no overlapping temporary periods, add the main period as-is
      splitPeriods.push({
        ...mainPeriod,
        timeDescription: formatTimeDescription(mainPeriod.from, mainPeriod.to)
      });
    } else {
      // Split the main period into segments
      
      // Add segment before first temporary period if exists
      if (overlapping[0].from.getTime() > mainPeriod.from.getTime()) {
        splitPeriods.push({
          ...mainPeriod,
          to: overlapping[0].from,
          timeDescription: formatTimeDescription(mainPeriod.from, overlapping[0].from)
        });
      }

      // Add temporary periods and gaps between them
      overlapping.forEach((temp, index) => {
        splitPeriods.push({
          ...temp,
          timeDescription: formatTimeDescription(temp.from, temp.to)
        });

        // Add gap after temporary period if there is one
        const nextTemp = overlapping[index + 1];
        if (nextTemp && temp.to.getTime() < nextTemp.from.getTime()) {
          splitPeriods.push({
            ...mainPeriod,
            from: temp.to,
            to: nextTemp.from,
            timeDescription: formatTimeDescription(temp.to, nextTemp.from)
          });
        }
      });

      // Add segment after last temporary period if exists
      const lastTemp = overlapping[overlapping.length - 1];
      if (lastTemp.to.getTime() < mainPeriod.to.getTime()) {
        splitPeriods.push({
          ...mainPeriod,
          from: lastTemp.to,
          to: mainPeriod.to,
          timeDescription: formatTimeDescription(lastTemp.to, mainPeriod.to)
        });
      }
    }
  });

  return splitPeriods.sort((a, b) => a.from.getTime() - b.from.getTime());
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
  } else if (start.getDate() === tomorrow.getDate() && end.getDate() === tomorrow.getDate()) {
    return `Tomorrow ${startTime} - ${endTime}`;
  } else if (start.getDate() === tomorrow.getDate()) {
    const endDay = end.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
    return `Tomorrow ${startTime} - ${endDay} ${endTime}`;
  }

  const startDay = start.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
  const endDay = end.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
  
  if (startDay === endDay) {
    return `${startDay} ${startTime} - ${endTime}`;
  }
  
  return `${startDay} ${startTime} - ${endDay} ${endTime}`;
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

  // Check winds with adjusted thresholds
  if (weather.wind?.speed_kts) {
    if (weather.wind.gust_kts && weather.wind.gust_kts >= 35) {
      totalScore += RISK_WEIGHTS.WIND.STRONG_GUSTS;
      reasons.push(`💨 Strong gusts`);
    } else if (weather.wind.speed_kts >= 25 || (weather.wind.gust_kts && weather.wind.gust_kts >= 25)) {
      totalScore += RISK_WEIGHTS.WIND.STRONG;
      reasons.push(`💨 Strong winds`);
    } else if (weather.wind.speed_kts >= 20) {  // Increased from 15
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
  
  const currentPhenomena = [
    // Weather phenomena
    ...(weather.conditions?.map(c => WEATHER_PHENOMENA[c.code]) || []),
    
    // Always include wind conditions
    ...(weather.wind ? [
      weather.wind.gust_kts && weather.wind.gust_kts >= 35 ? "💨 Strong gusts" :
      weather.wind.gust_kts && weather.wind.gust_kts >= 25 || weather.wind.speed_kts >= 25 ? "💨 Strong winds" :
      weather.wind.speed_kts >= 20 ? "💨 Moderate winds" :
      "💨 Light winds"  // Always show wind condition
    ] : []),
    
    // Visibility conditions
    ...(weather.visibility?.meters && weather.visibility.meters < 5000 ? ["👁️ Poor visibility"] : []),
  ].filter(Boolean);

  // No need for the "No significant weather" fallback anymore
  const phenomena = currentPhenomena;

  if (score >= 120) {
    return {
      level: 3,
      title: "Extremely high risk of disruptions",
      message: "Contact your airline",
      explanation: phenomena.join(", "),
      color: "red"
    };
  }
  else if (score >= 70) {
    return {
      level: 3,
      title: "High risk of disruptions",
      message: "Check your flight status urgently with your airline or at the airport",
      explanation: phenomena.join(", "),
      color: "red"
    };
  }
  else if (score >= 40) {
    return {
      level: 2,
      title: "Some delays possible",
      message: "It is recommended to check flight status with your airline or at the airport",
      explanation: phenomena.join(", "),
      color: "orange"
    };
  }
  else {
    return {
      level: 1,
      title: "No disruptions expected",
      message: "Current weather is good for flying.",
      explanation: phenomena.join(", "),
      color: "green"
    };
  }
}

const getWindDescription = (speed: number, gusts?: number): string => {
  if (gusts && gusts >= 35) return "💨 Strong gusts";
  if (gusts && gusts >= 25 || speed >= 25) return "💨 Strong winds";
  if (speed >= 15) return "💨 Moderate winds";
  return "💨 Light winds";
};