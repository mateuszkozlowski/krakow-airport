// src/app/api/flights/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return new NextResponse(JSON.stringify({ error: 'Missing start or end parameters' }), { 
        status: 400 
      });
    }

    const API_KEY = process.env.NEXT_PUBLIC_FLIGHTAWARE_API_KEY;
    const AIRPORT = 'EPKK';

    const response = await fetch(
      `https://aeroapi.flightaware.com/aeroapi/airports/${AIRPORT}/flights/departures?start=${start}&end=${end}&type=Airline`,
      {
        headers: {
          'x-apikey': API_KEY!,
          'Accept': 'application/json; charset=UTF-8',
        }
      }
    );

    if (!response.ok) {
      throw new Error('FlightAware API responded with an error');
    }

    const data = await response.json();

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  } catch (error) {
    console.error('Flights API error:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch flight data' }), { 
      status: 500 
    });
  }
}