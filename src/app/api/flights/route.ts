// src/app/api/flights/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const API_KEY = process.env.NEXT_PUBLIC_FLIGHTAWARE_API_KEY;
    const AIRPORT = 'EPKK';

    if (!API_KEY) {
      return NextResponse.json(
        { error: 'FlightAware API key not configured' },
        { status: 500 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const startTime = searchParams.get('start');
    const endTime = searchParams.get('end');
    const flightType = searchParams.get('type') || 'Airline';

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required time parameters' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://aeroapi.flightaware.com/aeroapi/airports/${AIRPORT}/flights/departures?start=${startTime}&end=${endTime}&type=${flightType}`,
      {
        headers: {
          'x-apikey': API_KEY,
          'Accept': 'application/json; charset=UTF-8',
        },
      }
    );

    if (!response.ok) {
      console.error('FlightAware API Error:', await response.text());
      throw new Error('Failed to fetch flight data');
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=60',
        'Vary': 'Accept-Encoding',
      }
    });
  } catch (error) {
    console.error('Flights API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flight data' },
      { status: 500 }
    );
  }
}