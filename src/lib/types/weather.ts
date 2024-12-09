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
}

export interface ForecastPeriod extends WeatherData {
  timestamp?: WeatherTimestamp;
  change_indicator?: 'TEMPO' | 'BECMG' | 'PERSISTENT';
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
  temperature?: string;
  wind: string;
  visibility: string;
  clouds: string;
  phenomena?: string[];
}

export interface ForecastChange {
  timeDescription: string;
  from: Date;
  to: Date;
  conditions: ProcessedConditions;
  riskLevel: RiskAssessment;
  changeType: 'TEMPO' | 'BECMG' | 'PERSISTENT';
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

// Re-export weather phenomena for type safety
export const WEATHER_PHENOMENA = {
  // Severe conditions
  TS: '⛈️ Thunderstorms',
  TSRA: '⛈️ Thunderstorms with rain',
  FZRA: '❄️ Freezing rain',
  FZFG: '❄️ Freezing fog',
  // Moderate conditions
  BR: '🌫️ Mist',
  RA: '🌧️ Rain',
  SN: '🌨️ Snow',
  FG: '🌫️ Heavy fog',
  // Light conditions
  '-RA': '🌧️ Light rain',
  '+RA': '🌧️ Heavy rain',
  DZ: '🌧️ Drizzle',
  '-SN': '🌨️ Light snow',
  '+SN': '🌨️ Heavy snow',
  // Cloud conditions
  SCT: '⛅️ Scattered clouds',
  BKN: '☁️ Broken clouds',
  OVC: '☁️ Overcast'
} as const;