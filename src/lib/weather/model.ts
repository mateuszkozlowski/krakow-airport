export type Locale = "pl" | "en";
export type Operation = "arrival" | "departure";
export type Level = 1 | 2 | 3 | 4;
export interface Rvr {
  runway: string;
  min: number;
  max: number | null;
  minQualifier: "M" | "P" | null;
  maxQualifier: "M" | "P" | null;
  trend: string | null;
}
export interface Conditions {
  visibility: number | null;
  ceiling: number | null;
  wind: {
    direction: number | null;
    speed: number;
    gust: number | null;
    variable: boolean;
    from?: number;
    to?: number;
  } | null;
  weather: string[];
  temperature: number | null;
  dewpoint: number | null;
  rvr: Rvr[];
  cavok: boolean;
  windShear?: boolean;
  snowfallCm?: number | null;
  cape?: number | null;
}
export interface Assessment {
  level: Level | null;
  reasons: string[];
  crosswind: number | null;
  basis: "rvr" | "visibility" | "missing";
}
export interface Observation {
  at: string;
  raw: string;
  conditions: Conditions;
}
export interface Scenario {
  kind: string;
  probability: number | null;
  conditions: Conditions;
  arrival: Assessment;
  departure: Assessment;
}
export interface Period {
  start: string;
  end: string;
  conditions: Conditions;
  arrival: Assessment;
  departure: Assessment;
  scenarios: Scenario[];
  source: "TAF" | "model";
}
export interface SourceStatus {
  state: "fresh" | "stale" | "missing" | "disabled";
  fetchedAt: string | null;
  detail: string;
}
export interface Snapshot {
  version: 2;
  generatedAt: string;
  observed: Observation | null;
  history: Observation[];
  forecast: Period[];
  current: { arrival: Assessment; departure: Assessment };
  sources: {
    metar: SourceStatus;
    taf: SourceStatus;
    model: SourceStatus;
    ensemble: SourceStatus;
  };
  ensemble: { at: string; members: number; favourable: number }[];
  taf: { raw: string; issued: string; end: string } | null;
  fogSignal: "increasing" | "possible" | null;
}
