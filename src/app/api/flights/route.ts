// src/app/api/flights/route.ts
import { NextResponse } from 'next/server';
import type { FlightStats, FlightAwareResponse } from '@/lib/types/flight';
import { AIRPORT_NAMES } from '@/lib/airports';
import { AIRLINES } from '@/lib/airlines';

export const runtime = 'edge';

const AIRPORT = 'EPKK';

export async function GET(request: Request) {
  try {
    const API_KEY = process.env.NEXT_PUBLIC_FLIGHTAWARE_API_KEY;
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'FlightAware API key not configured' },
        { status: 500 }
      );
    }

    // Get start and end times from query parameters
    const { searchParams } = new URL(request.url);
    const startTime = searchParams.get('start');
    const endTime = searchParams.get('end');

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing start or end time parameters' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://aeroapi.flightaware.com/aeroapi/airports/${AIRPORT}/flights/arrivals?start=${startTime}&end=${endTime}&type=Airline`,
      {
        headers: {
          'x-apikey': API_KEY,
          'Accept': 'application/json; charset=UTF-8',
        },
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FlightAware API Error:', errorText);
      throw new Error(`FlightAware API responded with status ${response.status}`);
    }

    const data: FlightAwareResponse = await response.json();

    if (!data.arrivals || !Array.isArray(data.arrivals)) {
      throw new Error('Invalid response structure from FlightAware API');
    }

    const stats: FlightStats = {
      delayed: 0,
      cancelled: 0,
      diverted: 0,
      affectedFlights: [],
    };

    data.arrivals.forEach((flight) => {
      const originCode = flight.origin?.code;
      const airlineCode = flight.operator;
      const airportName = originCode ? AIRPORT_NAMES[originCode] : undefined;
      const airlineName = airlineCode ? AIRLINES[airlineCode] : undefined;
      const displayOrigin = airportName || originCode || 'Unknown';
      const displayAirline = airlineName || airlineCode || 'Unknown';

      if (flight.cancelled) {
        stats.cancelled++;
        stats.affectedFlights.push({
          flightNumber: flight.ident,
          status: 'CANCELLED',
          scheduledTime: flight.scheduled_in,
          airline: displayAirline,
          origin: displayOrigin,
        });
      } else if (flight.diverted) {
        stats.diverted++;
        stats.affectedFlights.push({
          flightNumber: flight.ident,
          status: 'DIVERTED',
          scheduledTime: flight.scheduled_in,
          airline: displayAirline,
          origin: displayOrigin,
        });
      } else if (flight.scheduled_in && flight.estimated_in) {
        const delay =
          new Date(flight.estimated_in).getTime() -
          new Date(flight.scheduled_in).getTime();
        if (delay > 20 * 60 * 1000) { // 20 minutes delay threshold
          stats.delayed++;
          stats.affectedFlights.push({
            flightNumber: flight.ident,
            status: 'DELAYED',
            scheduledTime: flight.scheduled_in,
            airline: displayAirline,
            origin: displayOrigin,
            delayMinutes: Math.floor(delay / (1000 * 60)),
          });
        }
      }
    });

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Error fetching flight data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch flight data', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
          'Pragma': 'no-cache'
        }
      }
    );
  }
}