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

export const WEATHER_PHENOMENA = {
  // Severe & Dangerous Conditions
  TS: '⛈️ Thunderstorm',
  TSRA: '⛈️ ⚠️ Thunderstorm with Heavy Rain',
  FC: '🌪️ ⚠️ Tornado/Waterspout',
  SQ: '🌪️ ⚠️ Violent Squall',
  SS: '🌪️ 🏜️ Severe Sandstorm',
  
  // Freezing Conditions
  FZRA: '🌧️ ⚠️ Freezing Rain',
  FZDZ: '💧 ⚠️ Freezing Drizzle',
  FZFG: '🌫️ ⚠️ Freezing Fog',
  
  // Moderate Precipitation
  RA: '🌧️ Rain',
  SN: '❄️ Snow',
  GR: '🌨️ ⚠️ Hail',
  GS: '🌨️ Small Hail/Snow Pellets',
  PL: '🧊 Ice Pellets',
  IC: '❄️ Ice Crystals',
  SG: '🌨️ Snow Grains',
  
  // Light Conditions
  DZ: '💧 Drizzle',
  '-RA': '🌧️ Light Rain',
  '-SN': '❄️ Light Snow',
  
  // Heavy Conditions
  '+RA': '🌧️ ⚠️ Heavy Rain',
  '+SN': '🌨️ ⚠️ Heavy Snow',
  
  // Visibility Hazards
  FG: '🌫️ Dense Fog',
  BR: '🌫️ Mist',
  HZ: '🌫️ Haze',
  FU: '💨 Smoke',
  VA: '🌋 💨 Volcanic Ash - Engine Hazard',
  DU: '💨 Widespread Dust',
  SA: '🏜️ Blowing Sand',
  PO: '💨 Dust/Sand Whirls',
  DS: '🌪️ 🏜️ Duststorm',
  
  // Cloud Coverage
  SCT: '⛅ Scattered Clouds',
  BKN: '☁️ Broken Clouds',
  OVC: '☁️ ☁️ Complete Overcast'
} as const;