// src/app/api/flights/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const API_KEY = process.env.NEXT_PUBLIC_FLIGHTAWARE_API_KEY;
    const AIRPORT = 'EPKK';

    console.log('Fetching arrivals data:', { start, end }); // Debug log

    const response = await fetch(
      `https://aeroapi.flightaware.com/aeroapi/airports/${AIRPORT}/flights/arrivals?start=${start}&end=${end}&type=Airline`, // Changed to arrivals
      {
        headers: {
          'x-apikey': API_KEY!,
          'Accept': 'application/json; charset=UTF-8',
        }
      }
    );

    if (!response.ok) {
      console.error('FlightAware API error:', response.status);
      throw new Error(`FlightAware API responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log('FlightAware API response:', data); // Debug log

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Flights API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flight data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}