// lib/flights.ts
import { FlightStats, FlightAwareResponse, FlightAwareArrival } from "./types/flight";
import { AIRPORT_NAMES } from './airports';
import { AIRLINES } from './airlines';
import { withRetry } from './utils/retry';

async function fetchFlightData(type: 'arrivals' | 'departures'): Promise<FlightStats> {
  return withRetry(async () => {
    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    const startTime = sixHoursAgo.toISOString().split('.')[0] + 'Z';
    const endTime = fourHoursFromNow.toISOString().split('.')[0] + 'Z';

    console.log(`Requesting ${type} for:`, { startTime, endTime });

    const response = await fetch(
      `/api/flights?type=${type}&start=${startTime}&end=${endTime}`,
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch flight data');
    }

    const data: FlightAwareResponse = await response.json();
    const flights = type === 'arrivals' ? data.arrivals : data.departures;

    if (!flights || !Array.isArray(flights)) {
      throw new Error('Invalid flight data structure');
    }

    const stats: FlightStats = {
      delayed: 0,
      cancelled: 0,
      diverted: 0,
      affectedFlights: [],
    };

    flights.forEach((flight: FlightAwareArrival) => {
      const originCode = type === 'arrivals' ? flight.origin?.code : flight.destination?.code;
      const airlineCode = flight.operator;
      const airportName = originCode ? AIRPORT_NAMES[originCode] : undefined;
      const airlineName = airlineCode ? AIRLINES[airlineCode] : undefined;
      const displayAirport = airportName || originCode || "Unknown";
      const displayAirline = airlineName || airlineCode || "Unknown";

      if (flight.cancelled) {
        stats.cancelled++;
        stats.affectedFlights.push({
          flightNumber: flight.ident,
          status: "CANCELLED",
          scheduledTime: (type === 'arrivals' ? flight.scheduled_in : flight.scheduled_out) ?? new Date().toISOString(),
          airline: displayAirline,
          origin: displayAirport,
        });
      } else if (flight.diverted) {
        stats.diverted++;
        stats.affectedFlights.push({
          flightNumber: flight.ident,
          status: "DIVERTED",
          scheduledTime: (type === 'arrivals' ? flight.scheduled_in : flight.scheduled_out) ?? new Date().toISOString(),
          airline: displayAirline,
          origin: displayAirport,
          divertedTo: flight.diverted_airport
        });
      } else {
        const scheduledTime = type === 'arrivals' ? flight.scheduled_in : flight.scheduled_out;
        const estimatedTime = type === 'arrivals' ? flight.estimated_in : flight.estimated_out;
        
        if (scheduledTime && estimatedTime) {
          const delay = new Date(estimatedTime).getTime() - new Date(scheduledTime).getTime();
          if (delay > 20 * 60 * 1000) { // 20 minutes delay threshold
            stats.delayed++;
            stats.affectedFlights.push({
              flightNumber: flight.ident,
              status: "DELAYED",
              scheduledTime,
              airline: displayAirline,
              origin: displayAirport,
              delayMinutes: Math.floor(delay / (1000 * 60)),
            });
          }
        }
      }
    });

    return stats;
  });
}

export async function getFlightStats(): Promise<{ arrivals: FlightStats; departures: FlightStats; } | null> {
  try {
    // Fetch arrivals first, then departures sequentially
    const arrivals = await fetchFlightData('arrivals');
    // Add a small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
    const departures = await fetchFlightData('departures');

    return {
      arrivals,
      departures
    };
  } catch (error) {
    console.error('Error fetching flight stats:', error);
    return null;
  }
}