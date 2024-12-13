// lib/flights.ts
import { FlightStats, FlightAwareResponse, FlightAwareArrival } from "./types/flight";
import { AIRPORT_NAMES } from "./airports";
import { AIRLINES } from "./airlines";

export async function getFlightStats(): Promise<FlightStats> {
  try {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    const startTime = twoHoursAgo.toISOString().split('.')[0] + 'Z';
    const endTime = fourHoursFromNow.toISOString().split('.')[0] + 'Z';

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

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching flight data:', error);
    // Make sure this matches exactly with the FlightStats type
    return {
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
        if (delay > 20 * 60 * 1000) {
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
      } else {
        stats.onTime++;
      }
    });

    return stats;
  } catch (error) {
    console.error("Error fetching flight data:", error);
    return {
      delayed: 0,
      cancelled: 0,
      diverted: 0,
      onTime: 0,
      affectedFlights: [],
    };
  }
}
