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
  explanation?: string;
  color: 'red' | 'orange' | 'green';
}

export interface ProcessedConditions {
  phenomena: string[];  // No longer optional
}

export interface ForecastChange {
  timeDescription: string;
  from: Date;
  to: Date;
  conditions: ProcessedConditions;
  riskLevel: RiskAssessment;
  changeType: 'TEMPO' | 'BECMG' | 'PERSISTENT';
  wind?: {
    speed_kts: number;
    direction?: number;
    gust_kts?: number;
  };
  visibility?: {
    meters: number;
  };
  ceiling?: {
    feet: number;
  };
  isTemporary?: boolean;
  probability?: number;
}

// Example for ProcessedConditions
export interface ProcessedConditions {
  phenomena: string[]; // List of weather phenomena
  description?: string; // Optional description of conditions
}

// Example for RiskAssessment
export interface RiskAssessment {
  level: 1 | 2 | 3; 
  title: string;
  message: string; // Make this required
  explanation?: string;
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
  // Thunderstorm conditions
  TS: '⛈️ Thunderstorm',
  TSRA: '⛈️ Thunderstorm with Rain',
  
  // Freezing conditions
  FZRA: '🌧️❄️ Freezing Rain',
  FZDZ: '💧❄️ Freezing Drizzle',
  FZFG: '🌫️❄️ Freezing Fog',
  FZ: '🌨️❄️ Freezing',
  
  // Snow conditions with intensity
  'SN': '🌨️ Snow',
  '-SN': '🌨️ Light Snow',
  '+SN': '🌨️ Heavy Snow',
  'SHSN': '🌨️ Snow Showers',
  '-SHSN': '🌨️ Light Snow Showers',
  '+SHSN': '🌨️ Heavy Snow Showers',
  'BLSN': '🌨️ Blowing Snow',
  '+SHSN BLSN': '🌨️ Heavy Snow Showers with Blowing Snow',
  'SHSN BLSN': '🌨️ Snow Showers with Blowing Snow',
  'SH': '🌨️ Showers',
  
  // Rain conditions with intensity
  RA: '🌧️ Rain',
  '-RA': '🌧️ Light Rain',
  '+RA': '🌧️ Heavy Rain',
  SHRA: '🌧️ Rain Showers',
  '-SHRA': '🌧️ Light Rain Showers',
  '+SHRA': '🌧️ Heavy Rain Showers',
  
  // Mixed precipitation
  RASN: '🌨️ Rain and Snow',
  '-RASN': '🌨️ Light Rain and Snow',
  '+RASN': '🌨️ Heavy Rain and Snow',
  
  // Other precipitation types
  GR: '🌨️ Hail',
  GS: '🌨️ Small Hail',
  SG: '🌨️ Snow Grains',
  DZ: '💧 Drizzle',
  '-DZ': '💧 Light Drizzle',
  '+DZ': '💧 Heavy Drizzle',
  
  // Visibility conditions
  FG: '🌫️ Fog',
  BR: '🌫️ Mist',
  HZ: '🌫️ Haze',
  
  // Severe conditions
  FC: '🌪️ Funnel Cloud',
  SS: '🏜️ Sandstorm',
  
  // Cloud coverage
  SCT: '⛅ Scattered Clouds',
  BKN: '☁️ Broken Clouds',
  OVC: '☁️ Overcast'
} as const;
