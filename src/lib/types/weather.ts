// src/lib/types/weather.ts

export interface WindInfo {
  degrees: number;
  speed_kts: number;
  gust_kts?: number;
}

export interface CloudInfo {
  code: 'SCT' | 'BKN' | 'OVC' | 'FEW' | 'CLR';
  base_feet_agl: number;
}

export interface Visibility {
  meters: number;
}

export interface WeatherCondition {
  code: keyof typeof WEATHER_PHENOMENA;
}

export interface WeatherTimestamp {
  from: string;
  to: string;
}

export interface ChangeIndicator {
  code: 'TEMPO' | 'BECMG';
  text: string;
  desc: string;
}

export interface Change {
  probability?: number;
  indicator?: ChangeIndicator;
}

export interface WeatherData {
  temperature?: {
    celsius: number;
  };
  wind?: WindInfo;
  visibility?: Visibility;
  clouds?: CloudInfo[];
  ceiling?: {
    feet: number;
  };
  conditions?: WeatherCondition[];
  raw_text: string;
  observed: string;
  change?: Change;
}

export interface ForecastPeriod extends WeatherData {
  timestamp?: WeatherTimestamp;
  change_indicator?: 'TEMPO' | 'BECMG' | 'PERSISTENT';
  change?: Change;
}

export interface TAFData {
  forecast: ForecastPeriod[];
  raw_text: string;
}

export interface RiskAssessment {
  level: 1 | 2 | 3;
  title: string;
  message: string;
  explanation: string;
  color: 'red' | 'orange' | 'green';
}

export interface ProcessedConditions {
  phenomena: string[];  // No longer optional
}

export interface ForecastChange {
  from: Date; // Start time of the forecast period
  to: Date; // End time of the forecast period
  timeDescription: string; // Human-readable description of the time range
  changeType?: "TEMPO" | "PERM"; // Optional change type for temporary or permanent changes
  riskLevel: {
    level: 1 | 2 | 3; // Severity level of the risk (1: Low, 2: Moderate, 3: High)
    title: string; // Title or label for the risk level
    message?: string; // Optional message providing further explanation of the risk
    explanation?: string; // Optional detailed explanation of the risk level
  };
  conditions: {
    phenomena: string[]; // Array of weather phenomena (e.g., ["Rain", "Fog"])
  };
  wind?: {
    speed_kts: number; // Wind speed in knots
    direction: number; // Wind direction in degrees (0-360)
    gust_kts?: number; // Optional gust speed in knots
  };
  visibility?: {
    meters: number; // Visibility distance in meters
  };
  ceiling?: {
    feet: number; // Ceiling height in feet (for aviation)
  };
  probability?: number; // Probability of the event occurring (optional)
  isTemporary?: boolean; // Indicates if the forecast period is temporary (optional)
}





export interface WeatherResponse {
  current: {
    riskLevel: RiskAssessment;
    conditions: ProcessedConditions;
    raw: string;
    observed: string;
  };
  forecast: ForecastChange[];
  raw_taf: string;
}

export const WEATHER_PHENOMENA = {
  TS: '⛈️ Thunderstorm',
  TSRA: '⛈️🌧️ Thunderstorm with Heavy Rain',
  FC: '🌪️ Tornado/Waterspout',
  SQ: '💨 Violent Squall',
  SS: '🏜️ Severe Sandstorm',

  FZRA: '🌧️❄️ Freezing Rain',
  FZDZ: '💧❄️ Freezing Drizzle',
  FZFG: '🌫️❄️ Freezing Fog',

  RA: '🌧️ Rain',
  SN: '❄️ Snow',
  GR: '🌨️ Hail',
  GS: '🌨️ Small Hail/Snow Pellets',
  PL: '🧊 Ice Pellets',
  IC: '❄️ Ice Crystals',
  SG: '🌨️ Snow Grains',
  DZ: '💧 Drizzle',
  '-RA': '🌦️ Light Rain',
  '-SN': '🌨️ Light Snow',
  '+RA': '🌧️⚠️ Heavy Rain',
  '+SN': '❄️⚠️ Heavy Snow',

  FG: '🌫️ Dense Fog',
  BR: '🌫️ Mist',
  HZ: '🌫️ Haze',
  FU: '🔥 Smoke',
  VA: '🌋 Volcanic Ash',
  DU: '💨 Dust',
  SA: '🏜️ Blowing Sand',
  PO: '💨 Dust/Sand Whirls',
  DS: '🏜️ Duststorm',

  SCT: '⛅ Scattered Clouds',
  BKN: '☁️ Broken Clouds',
  OVC: '☁️ Overcast'
} as const;
