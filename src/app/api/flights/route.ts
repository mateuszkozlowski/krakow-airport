// src/app/api/flights/route.ts
import { NextResponse } from 'next/server';
import { getCacheOrFetch } from '@/lib/cache';

export const runtime = 'edge';

const AERO_API_KEY = process.env.NEXT_PUBLIC_FLIGHTAWARE_API_KEY;
const BASE_URL = 'https://aeroapi.flightaware.com/aeroapi';
const AIRPORT = 'EPKK';

async function fetchFlightData(type: string, start: string | null, end: string | null) {
  const endpoint = type === 'departures' ? 'departures' : 'arrivals';
  const url = `${BASE_URL}/airports/${AIRPORT}/flights/${endpoint}?start=${start}&end=${end}&type=Airline&max_pages=2`;
  
  const response = await fetch(url, {
    headers: {
      'x-apikey': AERO_API_KEY ?? '',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`AeroAPI responded with status ${response.status}`);
  }

  return response.json();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const type = searchParams.get('type') || 'arrivals';
  
  try {
    const { data, fromCache } = await getCacheOrFetch(
      `flights-${type}-${start}-${end}`,
      async () => {
        const response = await fetchFlightData(type, start, end);
        if (!response || !Array.isArray(response[type])) {
          throw new Error('Invalid flight data structure');
        }
        return response;
      }
    );

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=1200',
        ...(fromCache && { 'X-Served-From': 'cache' })
      }
    });

  } catch (error) {
    console.error('Flight API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flight data' },
      { status: 500 }
    );
  }
}