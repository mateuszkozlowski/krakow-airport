// src/lib/types/weather.ts

export interface WindInfo {
  degrees: number;
  speed_kts: number;
  gust_kts?: number;
}

export interface CloudInfo {
  coverage: 'SKC' | 'FEW' | 'SCT' | 'BKN' | 'OVC';
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
  level: 1 | 2 | 3 | 4;
  title: string;
  message: string;
  explanation?: string;
  color: 'red' | 'orange' | 'yellow' | 'green';
  operationalImpacts?: string[];
  warning?: {
    message: string;
    time: Date;
    severity: number;
  };
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
  
  // Freezing conditions (with de-icing indicators)
  FZRA: '🌧️❄️ Freezing Rain (De-icing Required)',
  FZDZ: '💧❄️ Freezing Drizzle (De-icing Required)',
  FZFG: '🌫️❄️ Freezing Fog (De-icing Possible)',
  FZ: '🌨️❄️ Freezing Conditions (De-icing Required)',
  
  // Add combined freezing conditions
  'FZRA FZFG': '🌧️❄️ Freezing Rain with Fog (De-icing Required)',
  'FZDZ FZFG': '💧❄️ Freezing Drizzle with Fog (De-icing Required)',
  
  // Snow conditions with intensity
  'SN': '🌨️ Snow',
  '-SN': '🌨️ Light Snow',
  '+SN': '🌨️ Heavy Snow (De-icing Required)',
  'SHSN': '🌨️ Snow Showers (De-icing Possible)',
  '-SHSN': '🌨️ Light Snow Showers',
  '+SHSN': '🌨️ Heavy Snow Showers (De-icing Required)',
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

export interface OpenMeteoHourlyData {
  time: string[];
  temperature_2m: number[];
  dew_point_2m: number[];
  precipitation_probability: number[];
  precipitation: number[];
  rain: number[];
  showers: number[];
  snowfall: number[];
  snow_depth: number[];
  weather_code: number[];
  cloud_cover: number[];
  visibility: number[];
  wind_speed_10m: number[];
  wind_direction_10m: number[];
  wind_gusts_10m: number[];
}

export interface OpenMeteoForecast {
  hourly: OpenMeteoHourlyData;
  hourly_units: Record<string, string>;
}

export const WMO_WEATHER_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail"
};
