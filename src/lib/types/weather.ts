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
  timeDescription: string; // Short description of the forecast time
  from: Date; // Start of the forecast period
  to: Date; // End of the forecast period
  conditions: {
    phenomena: string[]; // Array of weather phenomena (e.g., "rain", "snow")
  };
  riskLevel: {
    level: 1 | 2 | 3; // Risk level (1: low, 2: moderate, 3: high)
    title: string; // Title of the risk level
  };
  changeType: 'TEMPO' | 'BECMG' | 'PERSISTENT'; // Type of forecast change
  isTemporary?: boolean; // Indicates if the forecast is temporary
  probability?: number; // Probability of the forecast event (e.g., 50%)
  wind?: { speed_kts: number; direction: number; gust_kts?: number }; // Wind data
  visibility?: { meters: number }; // Visibility in meters
  ceiling?: { feet: number }; // Ceiling height in feet
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
