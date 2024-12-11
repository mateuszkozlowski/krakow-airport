// lib/types/flight.ts
export interface FlightStats {
  delayed: number;
  cancelled: number;
  diverted: number;
  affectedFlights: AffectedFlight[];
}

export interface AffectedFlight {
  flightNumber: string;
  status: 'CANCELLED' | 'DIVERTED' | 'DELAYED';
  scheduledTime: string;
  airline: string;
  origin: string;
  delayMinutes?: number;
}