import type { TomorrowIOValues, OpenMeteoDataPoint } from '@/lib/types/weather';
import type { TransformedMetar } from '@/app/api/weather/types';

// Data quality weights for different sources (out of 1.0)
const DATA_QUALITY_WEIGHTS = {
  METAR: {
    wind: 1.0,
    visibility: 1.0,
    ceiling: 1.0,
    temperature: 0.9,
    phenomena: 1.0,
    pressure: 1.0
  },
  TOMORROW_IO: {
    wind: 0.7,
    visibility: 0.6,
    ceiling: 0.6,
    temperature: 0.8,
    phenomena: 0.7,
    pressure: 0.8,
    precipitation: 0.9,
    uvIndex: 1.0,
    cloudCover: 0.8
  },
  OPEN_METEO: {
    wind: 0.6,
    visibility: 0.5,
    ceiling: 0.5,
    temperature: 0.7,
    phenomena: 0.6,
    precipitation: 0.8,
    cloudCover: 0.7
  }
} as const;

// Time-based confidence degradation factors (minutes)
const CONFIDENCE_DEGRADATION = {
  METAR: {
    FRESH: 0,     // 0-15 minutes: no degradation
    RECENT: 15,   // 15-30 minutes: slight degradation
    STALE: 30,    // 30-60 minutes: significant degradation
    EXPIRED: 60   // >60 minutes: maximum degradation
  },
  TOMORROW_IO: {
    FRESH: 5,     // 0-5 minutes: no degradation
    RECENT: 10,   // 5-10 minutes: slight degradation
    STALE: 15,    // 15-30 minutes: significant degradation
    EXPIRED: 30   // >30 minutes: maximum degradation
  },
  OPEN_METEO: {
    FRESH: 10,    // 0-10 minutes: no degradation
    RECENT: 20,   // 10-20 minutes: slight degradation
    STALE: 30,    // 30-45 minutes: significant degradation
    EXPIRED: 45   // >45 minutes: maximum degradation
  }
} as const;

// Helper function to calculate time-based confidence degradation
function calculateTimeDegradation(timestamp: string, source: 'METAR' | 'TOMORROW_IO' | 'OPEN_METEO'): number {
  const ageInMinutes = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60);
  const thresholds = CONFIDENCE_DEGRADATION[source];
  
  if (ageInMinutes <= thresholds.FRESH) return 1.0;
  if (ageInMinutes <= thresholds.RECENT) return 0.9;
  if (ageInMinutes <= thresholds.STALE) return 0.7;
  if (ageInMinutes <= thresholds.EXPIRED) return 0.4;
  return 0.2;
}

// Helper function to get confidence with time degradation
function getConfidenceWithDegradation(
  baseConfidence: number,
  timestamp: string,
  source: 'METAR' | 'TOMORROW_IO' | 'OPEN_METEO'
): number {
  const degradation = calculateTimeDegradation(timestamp, source);
  return baseConfidence * degradation;
}

interface PropertyBreakdown {
  property: string;
  source: 'METAR' | 'TOMORROW_IO' | 'OPEN_METEO';
  timestamp: string;
}

interface LastUpdated {
  METAR: {
    observed: string;
    lastUpdate: string;
    affectedProperties: string[];
  };
  TOMORROW_IO: {
    observed: string;
    lastUpdate: string;
    affectedProperties: string[];
  } | null;
  OPEN_METEO: {
    observed: string;
    lastUpdate: string;
    affectedProperties: string[];
  } | null;
  mostRecent: string;
  propertiesBreakdown: PropertyBreakdown[];
}

export function processCurrentConditions(
  metarData: TransformedMetar,
  tomorrowData?: { data: { time: string; values: TomorrowIOValues } },
  openMeteoData?: { current: OpenMeteoDataPoint }
) {
  console.log('=== processCurrentConditions START ===');
  
  // Log input data
  console.log('Raw Input Data:', {
    metar: {
      observed: metarData.observed,
      data: metarData
    },
    tomorrow: {
      time: tomorrowData?.data?.time,
      values: tomorrowData?.data?.values
    },
    openMeteo: {
      time: openMeteoData?.current?.time,
      data: openMeteoData?.current
    }
  });

  // Initialize lastUpdated structure with METAR data
  const lastUpdated: LastUpdated = {
    METAR: {
      observed: metarData.observed,
      lastUpdate: metarData.observed,
      affectedProperties: ['temperature', 'dewPoint', 'humidity', 'visibility', 'wind', 'ceiling', 'pressure', 'phenomena']
    },
    TOMORROW_IO: tomorrowData ? {
      observed: tomorrowData.data.time,
      lastUpdate: tomorrowData.data.time,
      affectedProperties: ['precipitation', 'cloudCover', 'uvIndex']
    } : null,
    OPEN_METEO: openMeteoData ? {
      observed: openMeteoData.current.time,
      lastUpdate: openMeteoData.current.time,
      affectedProperties: ['precipitation', 'cloudCover']
    } : null,
    mostRecent: metarData.observed,
    propertiesBreakdown: []
  };

  console.log('Initialized lastUpdated:', JSON.stringify(lastUpdated, null, 2));

  // Update propertiesBreakdown
  lastUpdated.propertiesBreakdown = Object.entries({
    temperature: 'METAR',
    dewPoint: 'METAR',
    humidity: 'METAR',
    visibility: 'METAR',
    wind: 'METAR',
    ceiling: 'METAR',
    pressure: 'METAR',
    precipitation: tomorrowData ? 'TOMORROW_IO' : (openMeteoData ? 'OPEN_METEO' : undefined),
    cloudCover: tomorrowData ? 'TOMORROW_IO' : (openMeteoData ? 'OPEN_METEO' : undefined),
    uvIndex: tomorrowData ? 'TOMORROW_IO' : undefined,
    phenomena: 'METAR'
  }).filter(([_prop, source]) => source !== undefined)
    .map(([prop, source]) => ({
      property: prop,
      source: source as 'METAR' | 'TOMORROW_IO' | 'OPEN_METEO',
      timestamp: source === 'METAR' ? metarData.observed :
                source === 'TOMORROW_IO' && tomorrowData?.data.time ? tomorrowData.data.time :
                openMeteoData?.current?.time ?? metarData.observed
    }));

  // Update mostRecent based on the latest timestamp
  const timestamps = [
    metarData.observed,
    tomorrowData?.data.time,
    openMeteoData?.current.time
  ].filter(Boolean) as string[];

  lastUpdated.mostRecent = timestamps.reduce((latest, current) => {
    return new Date(current) > new Date(latest) ? current : latest;
  }, timestamps[0]);

  interface CurrentConditions {
    temperature: number;
    dewPoint: number;
    humidity: number;
    visibility: number;
    wind: {
      speed: number;
      direction: number;
      gust: number | null;
    };
    ceiling: { feet: number } | null;
    pressure: number;
    precipitation?: {
      probability: number;
      intensity: number;
    };
    cloudCover?: number;
    uvIndex?: number;
    lastUpdated: typeof lastUpdated;
  }

  const currentConditions: CurrentConditions = {
    temperature: metarData.temp_air,
    dewPoint: metarData.temp_dewpoint,
    humidity: calculateHumidity(metarData.temp_air, metarData.temp_dewpoint),
    visibility: metarData.visibility,
    wind: {
      speed: metarData.wind.speed_kts,
      direction: metarData.wind.direction,
      gust: metarData.wind.gust_kts || null
    },
    ceiling: metarData.ceiling,
    pressure: metarData.pressure,
    lastUpdated
  };

  // Consider Tomorrow.io data if available and fresh enough
  if (tomorrowData?.data?.values && lastUpdated.TOMORROW_IO) {
    const tomorrowValues = tomorrowData.data.values;
    const tomorrowConfidence = {
      temperature: getConfidenceWithDegradation(DATA_QUALITY_WEIGHTS.TOMORROW_IO.temperature, lastUpdated.TOMORROW_IO.observed, 'TOMORROW_IO'),
      visibility: getConfidenceWithDegradation(DATA_QUALITY_WEIGHTS.TOMORROW_IO.visibility, lastUpdated.TOMORROW_IO.observed, 'TOMORROW_IO'),
      wind: getConfidenceWithDegradation(DATA_QUALITY_WEIGHTS.TOMORROW_IO.wind, lastUpdated.TOMORROW_IO.observed, 'TOMORROW_IO'),
      ceiling: getConfidenceWithDegradation(DATA_QUALITY_WEIGHTS.TOMORROW_IO.ceiling, lastUpdated.TOMORROW_IO.observed, 'TOMORROW_IO'),
      pressure: getConfidenceWithDegradation(DATA_QUALITY_WEIGHTS.TOMORROW_IO.pressure, lastUpdated.TOMORROW_IO.observed, 'TOMORROW_IO')
    };

    const metarConfidence = {
      temperature: getConfidenceWithDegradation(DATA_QUALITY_WEIGHTS.METAR.temperature, lastUpdated.METAR.observed, 'METAR'),
      visibility: getConfidenceWithDegradation(DATA_QUALITY_WEIGHTS.METAR.visibility, lastUpdated.METAR.observed, 'METAR'),
      wind: getConfidenceWithDegradation(DATA_QUALITY_WEIGHTS.METAR.wind, lastUpdated.METAR.observed, 'METAR'),
      ceiling: getConfidenceWithDegradation(DATA_QUALITY_WEIGHTS.METAR.ceiling, lastUpdated.METAR.observed, 'METAR'),
      pressure: getConfidenceWithDegradation(DATA_QUALITY_WEIGHTS.METAR.pressure, lastUpdated.METAR.observed, 'METAR')
    };

    // Update values if Tomorrow.io data has higher confidence
    if (tomorrowConfidence.temperature > metarConfidence.temperature * 1.5) {
      currentConditions.temperature = tomorrowValues.temperature;
      lastUpdated.propertiesBreakdown.find(item => item.property === 'temperature')!.source = 'TOMORROW_IO';
    }

    if (tomorrowConfidence.visibility > metarConfidence.visibility * 1.5) {
      currentConditions.visibility = tomorrowValues.visibility;
      lastUpdated.propertiesBreakdown.find(item => item.property === 'visibility')!.source = 'TOMORROW_IO';
    }

    if (tomorrowConfidence.wind > metarConfidence.wind * 1.5) {
      currentConditions.wind = {
        speed: convertToKnots(tomorrowValues.windSpeed),
        direction: tomorrowValues.windDirection,
        gust: tomorrowValues.windGust ? convertToKnots(tomorrowValues.windGust) : null
      };
      lastUpdated.propertiesBreakdown.find(item => item.property === 'wind')!.source = 'TOMORROW_IO';
    }

    // Add Tomorrow.io specific data
    if (tomorrowValues.precipitationProbability !== undefined) {
      currentConditions.precipitation = {
        probability: tomorrowValues.precipitationProbability,
        intensity: tomorrowValues.precipitationIntensity || 0
      };
      lastUpdated.propertiesBreakdown.find(item => item.property === 'precipitation')!.source = 'TOMORROW_IO';
    }

    if (tomorrowValues.cloudCover !== undefined) {
      currentConditions.cloudCover = tomorrowValues.cloudCover;
      lastUpdated.propertiesBreakdown.find(item => item.property === 'cloudCover')!.source = 'TOMORROW_IO';
    }

    if (tomorrowValues.uvIndex !== undefined) {
      currentConditions.uvIndex = tomorrowValues.uvIndex;
      lastUpdated.propertiesBreakdown.find(item => item.property === 'uvIndex')!.source = 'TOMORROW_IO';
    }
  }

  // Consider OpenMeteo data if available and fresh enough
  if (openMeteoData?.current && lastUpdated.OPEN_METEO) {
    const openMeteoValues = openMeteoData.current;
    const openMeteoConfidence = {
      temperature: getConfidenceWithDegradation(DATA_QUALITY_WEIGHTS.OPEN_METEO.temperature, lastUpdated.OPEN_METEO.observed, 'OPEN_METEO'),
      visibility: getConfidenceWithDegradation(DATA_QUALITY_WEIGHTS.OPEN_METEO.visibility, lastUpdated.OPEN_METEO.observed, 'OPEN_METEO'),
      wind: getConfidenceWithDegradation(DATA_QUALITY_WEIGHTS.OPEN_METEO.wind, lastUpdated.OPEN_METEO.observed, 'OPEN_METEO')
    };

    const currentConfidence = {
      temperature: getConfidenceWithDegradation(
        DATA_QUALITY_WEIGHTS[lastUpdated.propertiesBreakdown.find(item => item.property === 'temperature')!.source === 'TOMORROW_IO' ? 'TOMORROW_IO' : 'METAR'].temperature,
        lastUpdated.propertiesBreakdown.find(item => item.property === 'temperature')!.timestamp,
        lastUpdated.propertiesBreakdown.find(item => item.property === 'temperature')!.source === 'TOMORROW_IO' ? 'TOMORROW_IO' : 'METAR'
      ),
      visibility: getConfidenceWithDegradation(
        DATA_QUALITY_WEIGHTS[lastUpdated.propertiesBreakdown.find(item => item.property === 'visibility')!.source === 'TOMORROW_IO' ? 'TOMORROW_IO' : 'METAR'].visibility,
        lastUpdated.propertiesBreakdown.find(item => item.property === 'visibility')!.timestamp,
        lastUpdated.propertiesBreakdown.find(item => item.property === 'visibility')!.source === 'TOMORROW_IO' ? 'TOMORROW_IO' : 'METAR'
      ),
      wind: getConfidenceWithDegradation(
        DATA_QUALITY_WEIGHTS[lastUpdated.propertiesBreakdown.find(item => item.property === 'wind')!.source === 'TOMORROW_IO' ? 'TOMORROW_IO' : 'METAR'].wind,
        lastUpdated.propertiesBreakdown.find(item => item.property === 'wind')!.timestamp,
        lastUpdated.propertiesBreakdown.find(item => item.property === 'wind')!.source === 'TOMORROW_IO' ? 'TOMORROW_IO' : 'METAR'
      )
    };

    // Update values if OpenMeteo data has higher confidence
    if (openMeteoConfidence.temperature > currentConfidence.temperature * 1.5) {
      currentConditions.temperature = openMeteoValues.temperature;
      lastUpdated.propertiesBreakdown.find(item => item.property === 'temperature')!.source = 'OPEN_METEO';
    }

    if (openMeteoConfidence.visibility > currentConfidence.visibility * 1.5) {
      currentConditions.visibility = openMeteoValues.visibility;
      lastUpdated.propertiesBreakdown.find(item => item.property === 'visibility')!.source = 'OPEN_METEO';
    }

    if (openMeteoConfidence.wind > currentConfidence.wind * 1.5) {
      currentConditions.wind = {
        speed: convertToKnots(openMeteoValues.windSpeed),
        direction: openMeteoValues.windDirection,
        gust: openMeteoValues.windGusts ? convertToKnots(openMeteoValues.windGusts) : null
      };
      lastUpdated.propertiesBreakdown.find(item => item.property === 'wind')!.source = 'OPEN_METEO';
    }
  }

  // Before returning, log the final state
  console.log('=== processCurrentConditions END ===');
  console.log('Final lastUpdated state:', JSON.stringify(lastUpdated, null, 2));
  console.log('Final currentConditions state:', JSON.stringify(currentConditions, null, 2));

  return currentConditions;
}

// Helper functions
function calculateHumidity(tempC: number, dewPointC: number): number {
  return Math.round(100 * Math.exp((17.625 * dewPointC) / (243.04 + dewPointC)) / Math.exp((17.625 * tempC) / (243.04 + tempC)));
}

function convertToKnots(speedMS: number): number {
  return Math.round(speedMS * 1.944); // Convert m/s to knots
} 