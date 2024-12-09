// lib/types/flight.ts
export interface FlightAwareResponse {
  arrivals: FlightAwareArrival[];
  links?: {
    next?: string;
    previous?: string;
  };
  num_pages?: number;
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
  // Add any other fields if needed
}

export interface FlightStats {
  delayed: number;
  cancelled: 0;
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