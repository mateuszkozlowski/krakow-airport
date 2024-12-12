// app/api/flights/[type]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AIRPORT_NAMES } from '@/lib/airports';
import { AIRLINES } from '@/lib/airlines';

export const revalidate = 0;
const AIRPORT = 'EPKK';
const API_KEY = process.env.FLIGHTAWARE_API_KEY;

async function fetchFlightData(endpoint: string, start: string, end: string) {
  const url = `https://aeroapi.flightaware.com/aeroapi${endpoint}?start=${start}&end=${end}`;
  console.log('Fetching from:', url);

  const response = await fetch(url, {
    headers: {
      'x-apikey': API_KEY!,
      'Accept': 'application/json; charset=UTF-8',
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    console.error(`API error for ${endpoint}:`, response.status);
    return [];
  }

  const data = await response.json();
  return data;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json({ error: 'Missing start or end parameters' }, { status: 400 });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    const now = new Date();

    // Fetch from both endpoints
    const scheduledEndpoint = `/airports/${AIRPORT}/flights/scheduled_${params.type}`;
    const actualEndpoint = `/airports/${AIRPORT}/flights/${params.type}`;

    const [scheduledData, actualData] = await Promise.all([
      fetchFlightData(scheduledEndpoint, start, end),
      fetchFlightData(actualEndpoint, start, end)
    ]);

    // Extract flights from both responses
    const scheduledFlights = scheduledData[`scheduled_${params.type}`] || [];
    const actualFlights = actualData[params.type] || [];

    console.log(`Got ${scheduledFlights.length} scheduled and ${actualFlights.length} actual flights`);

    // Combine flights and remove duplicates
    const allFlights = [...scheduledFlights, ...actualFlights];
    const uniqueFlights = Array.from(new Map(allFlights.map(flight => [flight.ident, flight])).values());

    // Process the flights
    const processedFlights = uniqueFlights
      .map(flight => {
        try {
          const locationCode = params.type === 'departures' ? flight.destination?.code : flight.origin?.code;
          const airlineCode = flight.operator;
          const locationName = locationCode ? AIRPORT_NAMES[locationCode] : undefined;
          const airlineName = airlineCode ? AIRLINES[airlineCode] : undefined;
          const displayLocation = locationName || locationCode || 'Unknown';
          const displayAirline = airlineName || airlineCode || 'Unknown';

          const scheduledTime = params.type === 'departures' ? flight.scheduled_out : flight.scheduled_in;
          const estimatedTime = params.type === 'departures' ? flight.estimated_out : flight.estimated_in;
          const actualTime = params.type === 'departures' ? flight.actual_out : flight.actual_in;
          
          let status = 'ON TIME';
          let delayMinutes;

          if (flight.cancelled) {
            status = 'CANCELLED';
          } else if (flight.diverted) {
            status = 'DIVERTED';
          } else if (flight.progress_percent > 0) {
            status = 'EN ROUTE';
          } else if (actualTime) {
            const actualDate = new Date(actualTime);
            if (actualDate < now) {
              status = params.type === 'departures' ? 'DEPARTED' : 'ARRIVED';
            }
            const delay = actualDate.getTime() - new Date(scheduledTime).getTime();
            if (delay > 30 * 60 * 1000) {
              delayMinutes = Math.floor(delay / (1000 * 60));
            }
          } else if (scheduledTime && estimatedTime) {
            const delay = new Date(estimatedTime).getTime() - new Date(scheduledTime).getTime();
            if (delay > 30 * 60 * 1000) {
              status = 'DELAYED';
              delayMinutes = Math.floor(delay / (1000 * 60));
            }
          }

          return {
            flightNumber: flight.ident,
            status,
            scheduledTime,
            actualTime,
            airline: displayAirline,
            destination: displayLocation,
            ...(delayMinutes && { delayMinutes }),
          };
        } catch (err) {
          console.error('Error processing flight:', err);
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json(processedFlights);
    
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json([]);
  }
}