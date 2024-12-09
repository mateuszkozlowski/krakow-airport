// src/lib/weather.js

const CHECKWX_API_KEY = process.env.CHECKWX_API_KEY;
const AIRPORT = 'EPKK';

// Weather phenomena with emojis
const WEATHER_PHENOMENA = {
  // Severe conditions
  TS: '⛈️ Thunderstorms', 
  TSRA: '⛈️ Thunderstorms with rain',
  FZRA: '❄️ Freezing rain',
  FZFG: '❄️ Freezing fog',
  // Moderate conditions
  BR: '🌫️ Mist',
  RA: '🌧️ Rain',
  SN: '🌨️ Snow',
  FG: '🌫️ Heavy fog',
  // Light conditions
  '-RA': '🌧️ Light rain',
  '+RA': '🌧️ Heavy rain',
  DZ: '🌧️ Drizzle',
  '-SN': '🌨️ Light snow',
  '+SN': '🌨️ Heavy snow',
  // Cloud conditions
  SCT: '⛅️ Scattered clouds',
  BKN: '☁️ Broken clouds',
  OVC: '☁️ Overcast'
};

const CLOUD_DESCRIPTIONS = {
  SCT: '⛅️ Scattered clouds',
  BKN: '☁️ Broken clouds',
  OVC: '☁️ Overcast',
  FEW: '🌤️ Few clouds',
  CLR: 'Clear skies'
};

// CAT I approach minimums for EPKK
const MINIMUMS = {
  VISIBILITY: 550,  // meters
  CEILING: 200     // feet
};

export async function getAirportWeather() {
  try {
    // Fetch both METAR and TAF
    const [metarResponse, tafResponse] = await Promise.all([
      fetch(`https://api.checkwx.com/metar/${AIRPORT}/decoded`, {
        headers: { 'X-API-Key': CHECKWX_API_KEY }
      }),
      fetch(`https://api.checkwx.com/taf/${AIRPORT}/decoded`, {
        headers: { 'X-API-Key': CHECKWX_API_KEY }
      })
    ]);

    if (!metarResponse.ok || !tafResponse.ok) {
      throw new Error('Weather data fetch failed');
    }

    const metarData = await metarResponse.json();
    const tafData = await tafResponse.json();

    const currentWeather = metarData.data[0];
    const forecast = tafData.data[0];

    const currentAssessment = assessWeatherRisk(currentWeather);
    const forecastPeriods = processForecast(forecast);

    return {
      current: {
        riskLevel: currentAssessment,
        conditions: {
          temperature: `${currentWeather.temperature?.celsius}°C`,
          wind: getFormattedWind(currentWeather.wind),
          visibility: getFormattedVisibility(currentWeather.visibility?.meters),
          clouds: getFormattedClouds(currentWeather.clouds),
          phenomena: currentWeather.conditions?.map(c => 
            WEATHER_PHENOMENA[c.code] || c.code
          ).filter(Boolean)
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

function processForecast(taf) {
  if (!taf || !taf.forecast) return [];

  // Create timeline of changes
  let changes = [];
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  taf.forecast.forEach(period => {
    const periodStart = new Date(period.timestamp?.from);
    const periodEnd = new Date(period.timestamp?.to);
    
    // Only include future periods and today's periods
    if (periodEnd > now && periodStart < endOfDay) {
      // Format as a change in conditions
      const timeDescription = formatTimeDescription(periodStart, periodEnd);
      const assessment = assessWeatherRisk(period);

      changes.push({
        timeDescription,
        from: periodStart,
        to: periodEnd,
        conditions: {
          wind: getFormattedWind(period.wind),
          visibility: getFormattedVisibility(period.visibility?.meters),
          clouds: getFormattedClouds(period.clouds),
          phenomena: period.conditions?.map(c => 
            WEATHER_PHENOMENA[c.code] || c.code
          ).filter(Boolean)
        },
        riskLevel: assessment,
        // Add a type to indicate if it's a temporary change
        changeType: period.change_indicator || 'PERSISTENT'
      });
    }
  });

  // Sort changes by start time
  changes.sort((a, b) => a.from - b.from);

  return changes;
}

function formatTimeDescription(start, end) {
  const now = new Date();
  const startTime = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const endTime = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (start < now) {
    return `Until ${endTime}`;
  }

  // If period is less than 2 hours
  if ((end - start) <= 2 * 60 * 60 * 1000) {
    return `Around ${startTime}`;
  }

  // If it's a TEMPO (temporary change)
  if (start.getDate() === end.getDate()) {
    return `${startTime} - ${endTime}`;
  }

  // For longer periods
  return `From ${startTime}`;
}

function getFormattedWind(wind) {
  if (!wind) return 'No wind data';
  return `${wind.degrees}° at ${wind.speed_kts}kt${wind.gust_kts ? ` gusting ${wind.gust_kts}kt` : ''}`;
}

function getFormattedVisibility(meters) {
  if (!meters || isNaN(meters)) return 'No visibility data';
  const kilometers = meters / 1000;
  return `${kilometers.toFixed(1)}km`;
}

function getFormattedClouds(clouds) {
  if (!clouds || clouds.length === 0) return 'Clear skies';
  return clouds.map(cloud => {
    const description = CLOUD_DESCRIPTIONS[cloud.code] || cloud.code; // Fallback to the code if no description exists
    return `${description} at ${cloud.base_feet_agl}ft`;
  }).join(', ');
}

function assessWeatherRisk(weather) {
  const reasons = [];
  let level = 1; // default: no risk

  // Check visibility
  if (weather.visibility?.meters < MINIMUMS.VISIBILITY) {
    reasons.push("Visibility is below landing minimums");
    level = 3;
  } else if (weather.visibility?.meters < 1500) {
    reasons.push("Low visibility conditions");
    level = Math.max(level, 2);
  }

  // Check ceiling
  if (weather.ceiling?.feet < MINIMUMS.CEILING) {
    reasons.push("Cloud ceiling is too low for landings");
    level = 3;
  } else if (weather.ceiling?.feet < 500) {
    reasons.push("Low cloud ceiling");
    level = Math.max(level, 2);
  }

  // Check wind
  if (weather.wind?.speed_kts >= 25) {
    reasons.push(`Strong winds (${weather.wind.speed_kts}kt)`);
    level = Math.max(level, 2);
  }

  // Check weather phenomena
  if (weather.conditions) {
    for (const condition of weather.conditions) {
      if (Object.keys(WEATHER_PHENOMENA).includes(condition.code)) {
        reasons.push(WEATHER_PHENOMENA[condition.code]);
        // Severe weather conditions
        if (['TS', 'TSRA', 'FZRA', 'FZFG'].includes(condition.code)) {
          level = 3;
        }
        // Moderate weather conditions
        else if (['BR', 'RA', 'SN', 'FG'].includes(condition.code)) {
          level = Math.max(level, 2);
        }
      }
    }
  }

  // Return assessment based on level
  switch (level) {
    case 3:
      return {
        level: 3,
        title: "High risk of disruptions",
        message: "Flights may be cancelled or diverted",
        explanation: `Current conditions that may affect flights:
          • ${reasons.join('\n• ')}
          
          Check with your airline before traveling to the airport.`,
        color: "red"
      };

    case 2:
      return {
        level: 2,
        title: "Some delays are possible",
        message: "Weather might affect flight schedules",
        explanation: `Current conditions that may cause delays:
          • ${reasons.join('\n• ')}
          
          Allow extra time for your journey.`,
        color: "orange"
      };

    default:
      return {
        level: 1,
        title: "No weather-related disruptions expected",
        message: "Weather conditions are suitable for flying",
        explanation: "Current weather conditions at the airport are good for flying. ✈️",
        color: "green"
      };
  }
}