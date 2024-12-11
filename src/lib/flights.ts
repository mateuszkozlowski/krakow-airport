// lib/flights.ts
import { FlightStats, FlightAwareResponse, FlightAwareArrival } from "./types/flight";
import { AIRPORT_NAMES } from './airports';

const API_KEY = process.env.NEXT_PUBLIC_FLIGHTAWARE_API_KEY;
const AIRPORT = 'EPKK'; // Kraków Airport ICAO code

export async function getFlightStats(): Promise<FlightStats> {
  try {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - (3 * 60 * 60 * 1000));
    
    const startTime = threeHoursAgo.toISOString().split('.')[0] + 'Z';
    const endTime = now.toISOString().split('.')[0] + 'Z';

    const response = await fetch(
      `https://aeroapi.flightaware.com/aeroapi/airports/${AIRPORT}/flights/arrivals?start=${startTime}&end=${endTime}&type=Airline`,
      {
        headers: {
          'x-apikey': API_KEY!,
          'Accept': 'application/json; charset=UTF-8'
        }
      }
    );

    if (!response.ok) {
      console.error('API Error:', await response.text());
      throw new Error('Failed to fetch flight data');
    }

    const data: FlightAwareResponse = await response.json();
    console.log('FlightAware data:', data);

    const stats: FlightStats = {
      delayed: 0,
      cancelled: 0,
      diverted: 0,
      affectedFlights: []
    };

    // Process arrivals with proper typing and null checks
    data.arrivals.forEach((flight: FlightAwareArrival) => {
      const originCode = flight.origin?.code;
      const airportName = originCode ? AIRPORT_NAMES[originCode] : undefined;
      const displayOrigin = airportName || originCode || 'Unknown';

      if (flight.cancelled) {
        stats.cancelled++;
        stats.affectedFlights.push({
          flightNumber: flight.ident,
          status: 'CANCELLED',
          scheduledTime: flight.scheduled_in,
          airline: flight.operator || 'Unknown Airline',
          origin: displayOrigin
        });
      } else if (flight.diverted) {
        stats.diverted++;
        stats.affectedFlights.push({
          flightNumber: flight.ident,
          status: 'DIVERTED',
          scheduledTime: flight.scheduled_in,
          airline: flight.operator || 'Unknown Airline',
          origin: displayOrigin
        });
      } else if (flight.scheduled_in && flight.estimated_in) {
        const delay = new Date(flight.estimated_in).getTime() - 
                     new Date(flight.scheduled_in).getTime();
        if (delay > 30 * 60 * 1000) {
          stats.delayed++;
          stats.affectedFlights.push({
            flightNumber: flight.ident,
            status: 'DELAYED',
            scheduledTime: flight.scheduled_in,
            airline: flight.operator || 'Unknown Airline',
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