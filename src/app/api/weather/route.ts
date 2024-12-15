// src/app/api/weather/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'edge';

const AERO_API_KEY = process.env.NEXT_PUBLIC_FLIGHTAWARE_API_KEY;
const BASE_URL = 'https://aeroapi.flightaware.com/aeroapi';

interface AeroAPIResponse {
  data?: any;
  error?: string;
}

async function fetchFromAeroAPI(endpoint: string): Promise<AeroAPIResponse> {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'x-apikey': AERO_API_KEY ?? '',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`AeroAPI responded with status ${response.status}`);
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error(`Error fetching from ${endpoint}:`, error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function transformMetarData(aeroData: any) {
  // Extract the latest observation
  const observation = aeroData.observations[0];
  
  if (!observation) return null;

  // Transform clouds array to match existing format
  const clouds = observation.clouds?.map((cloud: any) => ({
    altitude: cloud.altitude * 100, // Convert to feet
    symbol: cloud.type + String(cloud.altitude).padStart(3, '0'),
    type: cloud.type
  }));

  return {
    data: [{
      airport_code: observation.airport_code,
      clouds,
      conditions: observation.conditions,
      pressure: observation.pressure,
      pressure_units: observation.pressure_units,
      raw_text: observation.raw_data,
      temp_air: observation.temp_air,
      temp_dewpoint: observation.temp_dewpoint,
      visibility: observation.visibility,
      visibility_units: observation.visibility_units,
      wind: {
        speed_kts: observation.wind_speed,
        direction: observation.wind_direction,
        gust_kts: observation.wind_speed_gust || null
      },
      ceiling: clouds?.length ? {
        feet: Math.min(...clouds.map(c => c.altitude))
      } : null,
      observed: observation.time
    }]
  };
}

function transformTafData(aeroData: any) {
  if (!aeroData.decoded_forecast) return null;

  const forecast = aeroData.decoded_forecast.lines.map((line: any) => {
    // Transform each forecast line to match existing format
    const conditions = [];
    if (line.significant_weather) {
      conditions.push({
        code: line.significant_weather
          .replace('light ', '-')
          .replace('heavy ', '+')
          .split(', ')[0]
          .toUpperCase()
      });
    }

    return {
      timestamp: line.start && line.end ? {
        from: line.start,
        to: line.end
      } : null,
      change: {
        indicator: {
          code: line.type.toUpperCase()
        },
        probability: line.type === 'tempo' ? 30 : undefined
      },
      conditions,
      wind: line.winds ? {
        speed_kts: line.winds.speed,
        direction: parseInt(line.winds.direction),
        gust_kts: line.winds.peak_gusts
      } : null,
      visibility: line.visibility ? {
        meters: line.visibility.visibility === 'unlimited' ? 9999 : 
                parseInt(line.visibility.visibility)
      } : null,
      ceiling: line.clouds?.length ? {
        feet: Math.min(...line.clouds.map((c: any) => parseInt(c.altitude)))
      } : null
    };
  });

  return {
    data: [{
      airport_code: aeroData.airport_code,
      forecast,
      raw_text: aeroData.raw_forecast.join(' ')
    }]
  };
}

export async function GET() {
  try {
    const AIRPORT = 'EPKK';

    // Fetch both METAR and TAF data
    const [metarResponse, tafResponse] = await Promise.all([
      fetchFromAeroAPI(`/airports/${AIRPORT}/weather/observations`),
      fetchFromAeroAPI(`/airports/${AIRPORT}/weather/forecast`)
    ]);

    if (metarResponse.error || tafResponse.error) {
      throw new Error('Failed to fetch weather data');
    }

    // Transform the data to match existing format
    const transformedMetar = transformMetarData(metarResponse.data);
    const transformedTaf = transformTafData(tafResponse.data);

    if (!transformedMetar || !transformedTaf) {
      throw new Error('Failed to transform weather data');
    }

    return NextResponse.json(
      { 
        metar: transformedMetar, 
        taf: transformedTaf 
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}