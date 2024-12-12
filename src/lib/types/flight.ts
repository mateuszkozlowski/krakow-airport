// lib/types/flight.ts
export interface FlightAwareResponse {
  departures: FlightAwareArrival[];
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
  scheduled_out?: string;
  scheduled_in?: string;
  estimated_out?: string;
  estimated_in?: string;
  destination?: {
    code: string;
    name?: string;
  };
  origin?: {
    code: string;
    name?: string;
  };
}

export interface FlightStats {
  delayed: number;
  cancelled: number;
  diverted: number;
  onTime: number;
  affectedFlights: {
    departures: AffectedFlight[];
    arrivals: AffectedFlight[];
  };
}

export interface AffectedFlight {
  flightNumber: string;
  status: 'CANCELLED' | 'DIVERTED' | 'DELAYED' | 'ON TIME';
  scheduledTime: string;
  airline: string;
  destination?: string;
  origin?: string;
  delayMinutes?: number;
}