// lib/types/flight.ts
export interface FlightAwareResponse {
  departures?: FlightAwareArrival[];
  arrivals?: FlightAwareArrival[];
  links?: {
    next?: string;
    previous?: string;
  };
  num_pages?: number;
}

export interface FlightAwareArrival {
  ident: string;
  ident_icao: string;
  ident_iata: string;
  operator: string;
  cancelled?: boolean;
  diverted?: boolean;
  scheduled_in: string;
  estimated_in: string;
  actual_runway_off?: string;
  actual_runway_on?: string;
  origin?: {
    code: string;
    name?: string;
  };
}

export interface FlightStats {
  delayed: number;
  cancelled: number;
  diverted: number;
  affectedFlights: AffectedFlight[];
}

export interface AffectedFlight {
  flightNumber: string;
  status: 'CANCELLED' | 'DIVERTED' | 'DELAYED' | 'ON TIME';
  scheduledTime: string;
  airline: string;
  origin: string;
  delayMinutes?: number;
}