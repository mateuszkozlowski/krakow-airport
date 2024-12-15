// src/app/api/weather/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

interface WeatherError {
  error: string;
  details?: string;
}

interface WeatherSuccess {
  type: string;
  temp: number;
  visibility: number;
  conditions: string[];
  wind: {
    speed: number;
    direction: number;
  };
  raw_data: string;
}

export async function GET(request: NextRequest) {
  try {
    const API_KEY = process.env.NEXT_PUBLIC_FLIGHTAWARE_API_KEY;
    const AIRPORT = 'EPKK';

    if (!API_KEY) {
      return NextResponse.json(
        { error: 'FlightAware API key not configured' } as WeatherError,
        { status: 500 }
      );
    }

    const requestHeaders = {
      'x-apikey': API_KEY,
      'Accept': 'application/json; charset=UTF-8',
    };

    const response = await fetch(
      `https://aeroapi.flightaware.com/aeroapi/airports/${AIRPORT}/weather`,
      { headers: requestHeaders }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FlightAware Weather API Error:', errorText);
      throw new Error(`FlightAware API responded with status ${response.status}`);
    }

    const weatherData = await response.json();

    return NextResponse.json(weatherData, {
      headers: {
        'Cache-Control': 'public, max-age=60',
      }
    });
  } catch (error) {
    console.error('Weather API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch weather data',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      } as WeatherError,
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        }
      }
    );
  }
}