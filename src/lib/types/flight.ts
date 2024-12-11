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

// Add these new interfaces for the API response
export interface FlightAwareResponse {
  arrivals: FlightAwareArrival[];
}

export interface FlightAwareArrival {
  ident: string;
  operator: string;
  cancelled: boolean;
  diverted: boolean;
  scheduled_in: string;
  estimated_in: string;
  origin?: {
    code: string;
    name?: string;
  };
}