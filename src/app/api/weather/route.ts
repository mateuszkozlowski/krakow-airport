// src/app/api/weather/route.ts
import { NextResponse } from 'next/server';
import { getCacheOrFetch } from '@/lib/cache';
import type {
  TransformedMetarResponse,
  TransformedTafResponse,
  Cloud,
  ForecastLine
} from './types';
import { WEATHER_PHENOMENA_TRANSLATIONS } from '@/lib/types/weather';
import { getCurrentWeather } from '@/lib/weather/tomorrow';
import { processCurrentConditions } from '@/lib/weather/process';
import { fetchOpenMeteoForecast } from '../../../lib/weather/openmeteo';

export const runtime = 'edge';

export interface WeatherTimestamps {
  metar: string | undefined;
  tomorrow: string | undefined;
  openMeteo: string | undefined;
}

const BASE_URL = 'https://api.checkwx.com';
const CHECKWX_API_KEY = process.env.NEXT_PUBLIC_CHECKWX_API_KEY;
const AIRPORT = 'EPKK';

async function fetchFromCheckWX<T>(endpoint: string) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'X-API-Key': CHECKWX_API_KEY || '',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`CheckWX API responded with status ${response.status}`);
  }

  const data = await response.json() as T;
  return { data };
}

// Fix the any types
interface WeatherCondition {
  code: string;
  text?: string;
}

// Update the type definitions to match CheckWX API response
interface CheckWXMetarResponse {
  results: number;
  data: [{
    conditions: WeatherCondition[];
    icao: string;
    barometer: {
      hg: number;
      hpa: number;
      kpa: number;
      mb: number;
    };
    ceiling: {
      feet: number;
      meters: number;
    };
    clouds: Array<{
      base_feet_agl: number;
      base_meters_agl: number;
      code: string;
      text: string;
      feet: number;
      meters: number;
    }>;
    dewpoint: {
      celsius: number;
      fahrenheit: number;
    };
    temperature: {
      celsius: number;
      fahrenheit: number;
    };
    visibility: {
      miles: string;
      miles_float: number;
      meters: string;
      meters_float: number;
    };
    wind: {
      degrees: number;
      speed_kts: number;
      gust_kts?: number;
    };
    raw_text: string;
    observed: string;
  }];
}

interface CheckWXTafResponse {
  results: number;
  data: [{
    icao: string;
    raw_text: string;
    forecast: Array<{
      clouds: Array<{
        base_feet_agl: number;
        base_meters_agl: number;
        code: string;
        text: string;
        feet: number;
        meters: number;
      }>;
      conditions?: Array<{
        code: string;
        text: string;
      }>;
      timestamp: {
        from: string;
        to: string;
      };
      visibility?: {
        meters_float: number;
      };
      wind?: {
        degrees: number;
        speed_kts: number;
        gust_kts?: number;
      };
      change?: {
        indicator: {
          code: string;
          text: string;
          desc: string;
        };
      };
    }>;
  }];
}

function transformMetarData(checkwxData: CheckWXMetarResponse): TransformedMetarResponse | null {
  if (!checkwxData.data?.length) return null;
  
  const observation = checkwxData.data[0];
  const clouds: Cloud[] = (observation.clouds || []).map(cloud => ({
    altitude: cloud.feet,
    symbol: cloud.code + String(cloud.base_feet_agl).padStart(3, '0'),
    type: cloud.code
  }));

  return {
    data: [{
      airport_code: observation.icao,
      clouds,
      conditions: observation.conditions?.map((c: WeatherCondition) => {
        // Handle intensity prefixes for weather phenomena
        const code = c.code;
        const hasIntensityPrefix = code.startsWith('+') || code.startsWith('-');
        const phenomenonCode = hasIntensityPrefix ? code : c.code;
        
        return {
          code: phenomenonCode,
          text: WEATHER_PHENOMENA_TRANSLATIONS.en[phenomenonCode as keyof typeof WEATHER_PHENOMENA_TRANSLATIONS.en] || phenomenonCode
        };
      }) || [],
      pressure: observation.barometer.mb,
      pressure_units: 'mb',
      raw_text: observation.raw_text,
      temp_air: observation.temperature.celsius,
      temp_dewpoint: observation.dewpoint.celsius,
      visibility: observation.visibility.meters_float,
      visibility_units: 'meters',
      wind: {
        speed_kts: observation.wind?.speed_kts || 0,
        direction: observation.wind?.degrees || 0,
        gust_kts: observation.wind?.gust_kts || null
      },
      ceiling: observation.ceiling ? {
        feet: observation.ceiling.feet
      } : null,
      observed: observation.observed
    }]
  };
}

function transformTafData(checkwxData: CheckWXTafResponse): TransformedTafResponse | null {
  if (!checkwxData.data?.[0]?.forecast) return null;

  const forecast = checkwxData.data[0].forecast.map(period => {
    // Log the raw period data
    console.log('Transforming TAF period:', {
      type: period.change?.indicator?.code || 'BASE',
      conditions: period.conditions,
      visibility: period.visibility,
      clouds: period.clouds
    });

    return {
      timestamp: period.timestamp ? {
        from: period.timestamp.from,
        to: period.timestamp.to
      } : null,
      change: period.change ? {
        indicator: {
          code: period.change.indicator.code,
          text: period.change.indicator.text,
          desc: period.change.indicator.desc,
          probability: period.change.indicator.code === 'TEMPO' ? 30 : undefined
        }
      } : undefined,
      conditions: period.conditions?.map(c => {
        // Handle intensity prefixes for weather phenomena
        const code = c.code;
        const hasIntensityPrefix = code.startsWith('+') || code.startsWith('-');
        const phenomenonCode = hasIntensityPrefix ? code : c.code;
        
        return {
          code: phenomenonCode,
          text: WEATHER_PHENOMENA_TRANSLATIONS.en[phenomenonCode as keyof typeof WEATHER_PHENOMENA_TRANSLATIONS.en] || phenomenonCode
        };
      }) || [],
      clouds: period.clouds?.map(c => ({
        code: c.code,
        base_feet_agl: c.base_feet_agl,
        feet: c.feet
      })) || [],
      wind: period.wind ? {
        speed_kts: period.wind.speed_kts,
        direction: period.wind.degrees,
        gust_kts: period.wind.gust_kts
      } : null,
      visibility: period.visibility ? {
        meters: period.visibility.meters_float
      } : null,
      ceiling: period.clouds?.length ? {
        feet: Math.min(...period.clouds.map(cloud => cloud.feet))
      } : null
    };
  });

  return {
    data: [{
      airport_code: checkwxData.data[0].icao,
      forecast: forecast as ForecastLine[],
      raw_text: checkwxData.data[0].raw_text
    }]
  };
}

export async function fetchWeatherData() {
  console.log('=== Fetch Weather Data Started ===');
  
  // First, try to fetch Tomorrow.io data separately to see if it works
  let tomorrowPreCheck = null;
  try {
    tomorrowPreCheck = await getCurrentWeather();
    console.log('Tomorrow.io pre-check:', {
      success: !!tomorrowPreCheck,
      hasData: !!tomorrowPreCheck?.data,
      timestamp: tomorrowPreCheck?.data?.time
    });
  } catch (error) {
    console.error('Tomorrow.io pre-check failed:', error);
  }

  // Then try OpenMeteo separately
  let openMeteoPreCheck = null;
  try {
    openMeteoPreCheck = await fetchOpenMeteoForecast();
    console.log('OpenMeteo pre-check:', {
      success: !!openMeteoPreCheck,
      hasData: !!openMeteoPreCheck?.current,
      timestamp: openMeteoPreCheck?.current?.time
    });
  } catch (error) {
    console.error('OpenMeteo pre-check failed:', error);
  }

  const [metarResponse, tafResponse, tomorrowResponse, openMeteoResponse] = await Promise.all([
    fetchFromCheckWX<CheckWXMetarResponse>(`/metar/${AIRPORT}/decoded`),
    fetchFromCheckWX<CheckWXTafResponse>(`/taf/${AIRPORT}/decoded`),
    getCurrentWeather().catch((error: Error) => {
      console.error('Error fetching Tomorrow.io data:', error);
      return null;
    }),
    fetchOpenMeteoForecast().catch((error: Error) => {
      console.error('Error fetching OpenMeteo data:', error);
      return null;
    })
  ]);

  console.log('All API responses received:', {
    hasMETAR: !!metarResponse?.data?.data?.length,
    hasTAF: !!tafResponse?.data?.data?.length,
    hasTomorrow: !!tomorrowResponse?.data,
    hasOpenMeteo: !!openMeteoResponse?.current
  });

  // Debug log raw responses with more detail
  console.log('Raw API Response Details:', {
    metar: {
      observed: metarResponse?.data?.data?.[0]?.observed,
      hasData: !!metarResponse?.data?.data?.[0]
    },
    tomorrow: {
      time: tomorrowResponse?.data?.time,
      hasData: !!tomorrowResponse?.data,
      hasValues: !!tomorrowResponse?.data?.values
    },
    openMeteo: {
      time: openMeteoResponse?.current?.time,
      hasData: !!openMeteoResponse?.current
    }
  });

  if (!metarResponse.data?.data?.length || !tafResponse.data?.data?.length) {
    throw new Error('Incomplete weather data received');
  }

  const transformedMetar = transformMetarData(metarResponse.data);
  const transformedTaf = transformTafData(tafResponse.data);

  if (!transformedMetar || !transformedTaf) {
    throw new Error('Failed to transform weather data');
  }

  // Debug log transformed data with more detail
  console.log('Transformed Data Details:', {
    metar: {
      observed: transformedMetar.data[0].observed,
      hasData: !!transformedMetar.data[0]
    },
    tomorrow: {
      time: tomorrowResponse?.data?.time,
      hasData: !!tomorrowResponse?.data?.values
    },
    openMeteo: {
      time: openMeteoResponse?.current?.time,
      hasData: !!openMeteoResponse?.current
    }
  });

  // Process current conditions using both METAR and Tomorrow.io data
  console.log('=== Before processCurrentConditions ===');
  console.log('METAR data:', transformedMetar.data[0]);
  console.log('Tomorrow.io data:', tomorrowResponse ? {
    time: tomorrowResponse.data.time,
    values: tomorrowResponse.data.values
  } : 'null');
  console.log('OpenMeteo data:', openMeteoResponse ? {
    time: openMeteoResponse.current.time,
    data: openMeteoResponse.current
  } : 'null');

  const currentConditions = processCurrentConditions(
    transformedMetar.data[0],
    tomorrowResponse ? { 
      data: { 
        time: tomorrowResponse.data.time, 
        values: tomorrowResponse.data.values 
      } 
    } : undefined,
    openMeteoResponse ? { 
      current: openMeteoResponse.current 
    } : undefined
  );

  console.log('=== After processCurrentConditions ===');
  console.log('Current conditions:', JSON.stringify(currentConditions, null, 2));

  console.log('=== Fetch Weather Data Completed ===', {
    metarObserved: metarResponse?.data?.data?.[0]?.observed,
    tomorrowTime: tomorrowResponse?.data?.time,
    openMeteoTime: openMeteoResponse?.current?.time
  });

  return { 
    metar: transformedMetar,
    taf: transformedTaf,
    currentConditions,
    timestamps: {
      metar: metarResponse?.data?.data?.[0]?.observed,
      tomorrow: tomorrowResponse?.data?.time,
      openMeteo: openMeteoResponse?.current?.time
    }
  };
}

export async function GET(request: Request) {
  console.log('=== Weather API Request Started ===', new Date().toISOString());
  
  // Check for force refresh
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.has('force');
  console.log('Request details:', { url: request.url, forceRefresh });
  
  try {
    const { data, fromCache, age } = await getCacheOrFetch(
      `weather-${AIRPORT}`,
      fetchWeatherData,
      {
        staleDuration: forceRefresh ? 0 : 60,    // Force stale if requested
        cacheDuration: 120    // Expire after 2 minutes
      }
    );

    console.log('=== Weather API Request Details ===', {
      fromCache,
      cacheAge: age,
      hasMETAR: !!data?.metar,
      hasTAF: !!data?.taf,
      hasCurrentConditions: !!data?.currentConditions,
      currentConditionsLastUpdated: data?.currentConditions?.lastUpdated
    });

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=180',
        ...(fromCache && { 'X-Served-From': 'cache' })
      }
    });

  } catch (error) {
    console.error('Weather API error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      error
    });

    return NextResponse.json(
      { 
        error: 'Failed to fetch weather data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function getWeatherTimestamps(): Promise<WeatherTimestamps> {
  const { data } = await getCacheOrFetch(
    `weather-${AIRPORT}`,
    fetchWeatherData,
    {
      staleDuration: 60,
      cacheDuration: 120
    }
  );
  
  return data.timestamps;
}