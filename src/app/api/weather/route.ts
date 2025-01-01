// src/app/api/weather/route.ts
import { NextResponse } from 'next/server';
import { getCacheOrFetch } from '@/lib/cache';
import type {
  AeroAPIObservationsResponse,
  AeroAPIForecastResponse,
  TransformedMetarResponse,
  TransformedTafResponse,
  TransformedCondition,
  Cloud
} from './types';

export const runtime = 'edge';

const BASE_URL = 'https://api.checkwx.com';
const CHECKWX_API_KEY = process.env.NEXT_PUBLIC_CHECKWX_API_KEY;
const AIRPORT = 'EPKK';

async function fetchFromCheckWX<T>(endpoint: string) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'X-API-Key': CHECKWX_API_KEY,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`CheckWX API responded with status ${response.status}`);
  }

  const data = await response.json() as T;
  return { data };
}

function parseConditions(conditionsStr: string | null): TransformedCondition[] {
  if (!conditionsStr) return [];
  
  return conditionsStr.split(' ').map(code => ({
    code
  }));
}

// Update the type definitions to match CheckWX API response
interface CheckWXMetarResponse {
  results: number;
  data: [{
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
      conditions: observation.conditions?.map(c => ({
        code: c.code
      })) || [],
      pressure: observation.barometer.mb,
      pressure_units: 'mb',
      raw_text: observation.raw_text,
      temp_air: observation.temperature.celsius,
      temp_dewpoint: observation.dewpoint.celsius,
      visibility: {
        meters: observation.visibility.meters_float
      },
      visibility_units: 'meters',
      wind: {
        speed_kts: observation.wind.speed_kts,
        direction: observation.wind.degrees,
        gust_kts: observation.wind.gust_kts || null
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

  const forecast = checkwxData.data[0].forecast.map(period => ({
    timestamp: period.timestamp ? {
      from: period.timestamp.from,
      to: period.timestamp.to
    } : null,
    change: period.change ? {
      indicator: {
        code: period.change.indicator.code,
        probability: period.change.indicator.code === 'TEMPO' ? 30 : undefined
      }
    } : undefined,
    conditions: period.conditions?.map(c => ({
      code: c.code
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
  }));

  return {
    data: [{
      airport_code: checkwxData.data[0].icao,
      forecast,
      raw_text: checkwxData.data[0].raw_text
    }]
  };
}

async function fetchWeatherData() {
  const [metarResponse, tafResponse] = await Promise.all([
    fetchFromCheckWX<CheckWXMetarResponse>(`/metar/${AIRPORT}/decoded`),
    fetchFromCheckWX<CheckWXTafResponse>(`/taf/${AIRPORT}/decoded`)
  ]);

  if (!metarResponse.data?.data?.length || !tafResponse.data?.data?.length) {
    throw new Error('Incomplete weather data received');
  }

  const transformedMetar = transformMetarData(metarResponse.data);
  const transformedTaf = transformTafData(tafResponse.data);

  if (!transformedMetar || !transformedTaf) {
    throw new Error('Failed to transform weather data');
  }

  return { 
    metar: transformedMetar, 
    taf: transformedTaf 
  };
}

export async function GET() {
  try {
    const { data, fromCache } = await getCacheOrFetch(
      `weather-${AIRPORT}`,
      fetchWeatherData
    );

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=1200',
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