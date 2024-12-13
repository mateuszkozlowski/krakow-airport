// lib/flights.ts
import { FlightStats, FlightAwareResponse, FlightAwareArrival } from "./types/flight";
import { AIRPORT_NAMES } from './airports';
import { AIRLINES } from './airlines';

const API_KEY = process.env.NEXT_PUBLIC_FLIGHTAWARE_API_KEY;
const AIRPORT = 'EPKK'; // Kraków Airport ICAO code

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://krk.flights';

export async function getFlightStats(): Promise<FlightStats> {
  try {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    const startTime = twoHoursAgo.toISOString().split('.')[0] + 'Z';
    const endTime = fourHoursFromNow.toISOString().split('.')[0] + 'Z';
    
    const response = await fetch(`${API_URL}/api/proxy/flights?start=${startTime}&end=${endTime}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch flight data');
    }

     const data: FlightAwareResponse = await response.json();
    console.log('FlightAware raw response:', data);  // Let's see what we actually get

    // Before processing, let's check what arrays we have
    console.log('Arrivals array:', data.arrivals?.length || 'no arrivals');

    const stats: FlightStats = {
      delayed: 0,
      cancelled: 0,
      diverted: 0,
      affectedFlights: []
    };

    // Process arrivals with proper typing and null checks
    data.arrivals.forEach((flight: FlightAwareArrival) => {
      const originCode = flight.origin?.code;      
      const airlineCode = flight.operator;
      const airportName = originCode ? AIRPORT_NAMES[originCode] : undefined;
      const airlineName = originCode ? AIRLINES[airlineCode] : undefined;
      const displayOrigin = airportName || originCode || 'Unknown';
      const displayAirline = airlineName  || airlineCode || 'Unknown';

      if (flight.cancelled) {
        stats.cancelled++;
        stats.affectedFlights.push({
          flightNumber: flight.ident,
          status: 'CANCELLED',
          scheduledTime: flight.scheduled_in,
          airline: displayAirline || 'Unknown Airline',
          origin: displayOrigin
        });
      } else if (flight.diverted) {
        stats.diverted++;
        stats.affectedFlights.push({
          flightNumber: flight.ident,
          status: 'DIVERTED',
          scheduledTime: flight.scheduled_in,
          airline: displayAirline || 'Unknown Airline',
          origin: displayOrigin
        });
      } else if (flight.scheduled_in && flight.estimated_in) {
        const delay = new Date(flight.estimated_in).getTime() - 
                     new Date(flight.scheduled_in).getTime();
        if (delay > 20 * 60 * 1000) {
          stats.delayed++;
          stats.affectedFlights.push({
            flightNumber: flight.ident,
            status: 'DELAYED',
            scheduledTime: flight.scheduled_in,
            airline: displayAirline || 'Unknown Airline',
            origin: displayOrigin,
            delayMinutes: Math.floor(delay / (1000 * 60))
          });
        }
      }
    });

    return stats;

  } catch (error) {
    console.error('Error fetching flight data:', error);
    return {
      delayed: 0,
      cancelled: 0,
      diverted: 0,
      affectedFlights: []
    };
  }
}