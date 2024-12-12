// lib/flights.ts
import { FlightStats, FlightAwareResponse, FlightAwareArrival } from "./types/flight";
import { AIRPORT_NAMES } from './airports';
import { AIRLINES } from './airlines';

const API_KEY = process.env.NEXT_PUBLIC_FLIGHTAWARE_API_KEY;
const AIRPORT = 'EPKK';

export async function getFlightStats(): Promise<FlightStats> {
  try {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    const startTime = twoHoursAgo.toISOString().split('.')[0] + 'Z';
    const endTime = fourHoursFromNow.toISOString().split('.')[0] + 'Z';

    // Fetch both departures and arrivals
    const [departuresResponse, arrivalsResponse] = await Promise.all([
      fetch(
        `https://aeroapi.flightaware.com/aeroapi/airports/${AIRPORT}/flights/departures?start=${startTime}&end=${endTime}&type=Airline`,
        {
          headers: {
            'x-apikey': API_KEY!,
            'Accept': 'application/json; charset=UTF-8',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          cache: 'no-store'
        }
      ),
      fetch(
        `https://aeroapi.flightaware.com/aeroapi/airports/${AIRPORT}/flights/arrivals?start=${startTime}&end=${endTime}&type=Airline`,
        {
          headers: {
            'x-apikey': API_KEY!,
            'Accept': 'application/json; charset=UTF-8',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          cache: 'no-store'
        }
      )
    ]);

    if (!departuresResponse.ok || !arrivalsResponse.ok) {
      throw new Error('Failed to fetch flight data');
    }

    const departuresData: FlightAwareResponse = await departuresResponse.json();
    const arrivalsData: FlightAwareResponse = await arrivalsResponse.json();

    const stats: FlightStats = {
      delayed: 0,
      cancelled: 0,
      diverted: 0,
      onTime: 0,
      affectedFlights: {
        departures: [],
        arrivals: []
      }
    };

    // Process departures
    departuresData.departures.forEach((flight: FlightAwareArrival) => {
      const destinationCode = flight.destination?.code;
      const airlineCode = flight.operator;
      const airportName = destinationCode ? AIRPORT_NAMES[destinationCode] : undefined;
      const airlineName = airlineCode ? AIRLINES[airlineCode] : undefined;
      const displayDestination = airportName || destinationCode || 'Unknown';
      const displayAirline = airlineName || airlineCode || 'Unknown';

      if (flight.cancelled) {
        stats.cancelled++;
        stats.affectedFlights.departures.push({
          flightNumber: flight.ident,
          status: 'CANCELLED',
          scheduledTime: flight.scheduled_out!,
          airline: displayAirline,
          destination: displayDestination
        });
      } else if (flight.diverted) {
        stats.diverted++;
        stats.affectedFlights.departures.push({
          flightNumber: flight.ident,
          status: 'DIVERTED',
          scheduledTime: flight.scheduled_out!,
          airline: displayAirline,
          destination: displayDestination
        });
      } else if (flight.scheduled_out && flight.estimated_out) {
        const delay = new Date(flight.estimated_out).getTime() - new Date(flight.scheduled_out).getTime();
        if (delay > 30 * 60 * 1000) {
          stats.delayed++;
          stats.affectedFlights.departures.push({
            flightNumber: flight.ident,
            status: 'DELAYED',
            scheduledTime: flight.scheduled_out,
            airline: displayAirline,
            destination: displayDestination,
            delayMinutes: Math.floor(delay / (1000 * 60))
          });
        } else {
          stats.onTime++;
          stats.affectedFlights.departures.push({
            flightNumber: flight.ident,
            status: 'ON TIME',
            scheduledTime: flight.scheduled_out,
            airline: displayAirline,
            destination: displayDestination
          });
        }
      }
    });

    // Process arrivals
    arrivalsData.arrivals.forEach((flight: FlightAwareArrival) => {
      const originCode = flight.origin?.code;
      const airlineCode = flight.operator;
      const airportName = originCode ? AIRPORT_NAMES[originCode] : undefined;
      const airlineName = airlineCode ? AIRLINES[airlineCode] : undefined;
      const displayOrigin = airportName || originCode || 'Unknown';
      const displayAirline = airlineName || airlineCode || 'Unknown';

      if (flight.cancelled) {
        stats.cancelled++;
        stats.affectedFlights.arrivals.push({
          flightNumber: flight.ident,
          status: 'CANCELLED',
          scheduledTime: flight.scheduled_in!,
          airline: displayAirline,
          origin: displayOrigin
        });
      } else if (flight.diverted) {
        stats.diverted++;
        stats.affectedFlights.arrivals.push({
          flightNumber: flight.ident,
          status: 'DIVERTED',
          scheduledTime: flight.scheduled_in!,
          airline: displayAirline,
          origin: displayOrigin
        });
      } else if (flight.scheduled_in && flight.estimated_in) {
        const delay = new Date(flight.estimated_in).getTime() - new Date(flight.scheduled_in).getTime();
        if (delay > 30 * 60 * 1000) {
          stats.delayed++;
          stats.affectedFlights.arrivals.push({
            flightNumber: flight.ident,
            status: 'DELAYED',
            scheduledTime: flight.scheduled_in,
            airline: displayAirline,
            origin: displayOrigin,
            delayMinutes: Math.floor(delay / (1000 * 60))
          });
        } else {
          stats.onTime++;
          stats.affectedFlights.arrivals.push({
            flightNumber: flight.ident,
            status: 'ON TIME',
            scheduledTime: flight.scheduled_in,
            airline: displayAirline,
            origin: displayOrigin
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
      onTime: 0,
      affectedFlights: {
        departures: [],
        arrivals: []
      }
    };
  }
}