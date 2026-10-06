import type { Locale } from "../weather/model";

export type SourceId = "rail" | "city" | "coach";
export type Direction = "from-airport" | "to-airport";
export type Mode = "train" | "bus" | "coach" | "replacement-bus";
export interface Place {
  id: string;
  name: Record<Locale, string>;
  group: "krakow" | "region";
  aliases: Partial<Record<SourceId, string[]>>;
}
export interface TransitStop {
  id: string;
  name: string;
  place: string;
  lat: number;
  lon: number;
  code: string;
}
// Seconds from the GTFS service-day anchor, not a wall-clock date.
export type StopTime = [
  stop: string,
  arrival: number,
  departure: number,
  sequence: number,
  pickup: boolean,
  dropoff: boolean,
  platform: string,
];
export interface ServiceDays {
  start: string;
  end: string;
  weekdays: number[];
  added: string[];
  removed: string[];
}
export interface TransitTrip {
  id: string;
  service: string;
  route: string;
  number: string;
  headsign: string;
  mode: Mode;
  times: StopTime[];
}
export interface TransitFeed {
  version: 1;
  source: SourceId;
  checkedAt: string;
  sourceUpdatedAt: string | null;
  validFrom: string;
  validUntil: string;
  maxSeconds: number;
  stops: Record<string, TransitStop>;
  services: Record<string, ServiceDays>;
  trips: TransitTrip[];
  quality: { trips: number; stops: number; skippedTimes: number };
}
export interface TripQuery {
  direction: Direction;
  place: string;
  date: string;
  time: string;
  buffer: number;
  delay: number;
  transfer: number;
  fold: "auto" | "first" | "second";
  weather: "auto" | "off";
}
export interface ConnectionWeather {
  at: string | null;
  source: "TAF" | "model" | "METAR" | null;
  level: number | null;
  possible: boolean;
  label: string | null;
  icon: "storm" | "rain" | "snow" | "fog" | "visibility" | "cloud" | "wind";
  extraMinutes: number;
  suggestedMinutes: number;
  minTransfer: number;
}
export type QueryIssue = "invalid-date" | "invalid-time" | "dst-time" | "past";
export interface Leg {
  source: SourceId;
  mode: Mode;
  tripId: string;
  serviceDate: string;
  route: string;
  number: string;
  headsign: string;
  from: TransitStop;
  to: TransitStop;
  departure: string;
  arrival: string;
  plannedDeparture: string;
  plannedArrival: string;
  platform: string;
  live: boolean;
  departureDelay: number | null;
  arrivalDelay: number | null;
  arrivalEstimated: boolean;
}
export interface Journey {
  id: string;
  legs: Leg[];
  departure: string;
  arrival: string;
  durationMinutes: number;
  waitMinutes: number;
  spareMinutes: number | null;
  transferMinutes: number | null;
  overnight: boolean;
}
export interface FeedStatus {
  source: SourceId;
  state: "fresh" | "cached" | "unavailable" | "outside-range";
  checkedAt: string | null;
  validUntil: string | null;
}
export interface RealtimeStatus {
  source: "city" | "plk";
  state: "fresh" | "unavailable" | "inactive" | "stale";
  updatedAt: string | null;
}
export interface TripUpdate {
  source: SourceId;
  tripId: string;
  serviceDate: string;
  cancelled: boolean;
  stops: Record<
    string,
    {
      skipped?: boolean;
      departure?: number;
      arrival?: number;
      departureDelay?: number;
      arrivalDelay?: number;
    }
  >;
}
export interface RealtimeData {
  updates: TripUpdate[];
  statuses: RealtimeStatus[];
}
export interface PlannerResult {
  version: 1;
  query: TripQuery;
  generatedAt: string;
  flightAt: string | null;
  readyAt: string | null;
  issue: QueryIssue | null;
  journeys: Journey[];
  feeds: FeedStatus[];
  realtime: RealtimeStatus[];
  cancelled: number;
  weather: ConnectionWeather;
}
