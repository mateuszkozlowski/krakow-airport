// lib/flights.ts
import { FlightStats, FlightAwareResponse, FlightAwareArrival } from "./types/flight";
import { AIRPORT_NAMES } from './airports';
import { AIRLINES } from './airlines';

export async function getFlightStats(): Promise<FlightStats> {
  try {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const fourHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);

    const startTime = twoHoursAgo.toISOString().split('.')[0] + 'Z';
    const endTime = fourHoursFromNow.toISOString().split('.')[0] + 'Z';

    console.log('Requesting flights for:', { startTime, endTime });

    const response = await fetch(
      `/api/flights?start=${startTime}&end=${endTime}`,
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
    console.log('Received flight data:', data);

    // Check if data.arrivals exists and is an array
    if (!data.arrivals || !Array.isArray(data.arrivals)) {
      console.error('Invalid flight data structure:', data);
      throw new Error('Invalid flight data structure');
    }

    const stats: FlightStats = {
      delayed: 0,
      cancelled: 0,
      diverted: 0,
      affectedFlights: [],
    };

    data.arrivals.forEach((flight: FlightAwareArrival) => {
      const originCode = flight.origin?.code;
      const airlineCode = flight.operator;
      const airportName = originCode ? AIRPORT_NAMES[originCode] : undefined;
      const airlineName = airlineCode ? AIRLINES[airlineCode] : undefined;
      const displayOrigin = airportName || originCode || "Unknown";
      const displayAirline = airlineName || airlineCode || "Unknown";

      if (flight.cancelled) {
        stats.cancelled++;
        stats.affectedFlights.push({
          flightNumber: flight.ident,
          status: "CANCELLED",
          scheduledTime: flight.scheduled_in,
          airline: displayAirline,
          origin: displayOrigin,
        });
      } else if (flight.diverted) {
        stats.diverted++;
        stats.affectedFlights.push({
          flightNumber: flight.ident,
          status: "DIVERTED",
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
            status: "DELAYED",
            scheduledTime: flight.scheduled_in,
            airline: displayAirline,
            origin: displayOrigin,
            delayMinutes: Math.floor(delay / (1000 * 60)),
          });
        }
      }
    });

    console.log('Processed flight stats:', stats);
    return stats;
  } catch (error) {
    console.error("Error fetching flight data:", error);
    return {
      delayed: 0,
      cancelled: 0,
      diverted: 0,
      affectedFlights: [],
    };
  }
}