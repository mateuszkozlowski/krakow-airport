// src/lib/types/weather.ts

export interface WindInfo {
  degrees: number;
  speed_kts: number;
  gust_kts?: number;
}

export interface CloudInfo {
  code: string;
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
  statusMessage: string;
  explanation?: string;
  color: 'red' | 'orange' | 'yellow' | 'green';
  operationalImpacts?: string[];
}

export interface ProcessedConditions {
  phenomena: string[];
  temperature?: number;
  visibility?: {
    meters: number;
  };
  wind?: {
    speed_kts: number;
    direction?: number;
    gust_kts?: number;
  };
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
  operationalImpacts?: string[];
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
  TS: 'TS',
  TSRA: 'TSRA',
  
  // Freezing conditions
  FZRA: 'FZRA',
  FZDZ: 'FZDZ',
  FZFG: 'FZFG',
  FZ: 'FZ',
  
  // Combined freezing conditions
  'FZRA FZFG': 'FZRA FZFG',
  'FZDZ FZFG': 'FZDZ FZFG',
  
  // Snow conditions
  'SN': 'SN',
  '-SN': '-SN',
  '+SN': '+SN',
  'SHSN': 'SHSN',
  '-SHSN': '-SHSN',
  '+SHSN': '+SHSN',
  'BLSN': 'BLSN',
  '+SHSN BLSN': '+SHSN BLSN',
  'SHSN BLSN': 'SHSN BLSN',
  'SH': 'SH',
  
  // Rain conditions
  RA: 'RA',
  '-RA': '-RA',
  '+RA': '+RA',
  SHRA: 'SHRA',
  '-SHRA': '-SHRA',
  '+SHRA': '+SHRA',
  
  // Mixed precipitation
  RASN: 'RASN',
  '-RASN': '-RASN',
  '+RASN': '+RASN',
  
  // Other precipitation
  GR: 'GR',
  GS: 'GS',
  SG: 'SG',
  DZ: 'DZ',
  '-DZ': '-DZ',
  '+DZ': '+DZ',
  
  // Visibility conditions
  FG: 'FG',
  BR: 'BR',
  HZ: 'HZ',
  
  // Severe conditions
  FC: 'FC',
  SS: 'SS',
  
  // Cloud coverage
  SCT: 'SCT',
  BKN: 'BKN',
  OVC: 'OVC',
  
  // No significant weather
  NSW: 'NSW'
} as const;

export const WEATHER_PHENOMENA_TRANSLATIONS = {
  en: {
    // Thunderstorm conditions
    TS: '⛈️ Thunderstorm',
    TSRA: '⛈️ Thunderstorm with Rain',
    
    // Freezing conditions
    FZRA: '🌧️❄️ Freezing Rain (De-icing Required)',
    FZDZ: '💧❄️ Freezing Drizzle (De-icing Required)',
    FZFG: '🌫️❄️ Freezing Fog (De-icing Possible)',
    FZ: '🌨️❄️ Freezing Conditions (De-icing Required)',
    
    // Combined freezing conditions
    'FZRA FZFG': '🌧️❄️ Freezing Rain with Fog (De-icing Required)',
    'FZDZ FZFG': '💧❄️ Freezing Drizzle with Fog (De-icing Required)',
    
    // Snow conditions
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
    
    // Rain conditions
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
    
    // Other precipitation
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
    OVC: '☁️ Overcast',
    
    // No significant weather
    NSW: 'No significant weather phenomena'
  },
  pl: {
    // Thunderstorm conditions
    TS: '⛈️ Burza',
    TSRA: '⛈️ Burza z deszczem',
    
    // Freezing conditions
    FZRA: '🌧️❄️ Marznący deszcz',
    FZDZ: '💧❄️ Marznąca mżawka',
    FZFG: '🌫️❄️ Marznąca mgła',
    FZ: '🌨️❄️ Warunki marznące',
    
    // Combined freezing conditions
    'FZRA FZFG': '🌧️❄️ Marznący deszcz z mgłą',
    'FZDZ FZFG': '💧❄️ Marznąca mżawka z mgłą',
    
    // Snow conditions
    'SN': '🌨️ Śnieg',
    '-SN': '🌨️ Lekki śnieg',
    '+SN': '🌨️ Intensywny śnieg',
    'SHSN': '🌨️ Przelotny śnieg',
    '-SHSN': '🌨️ Lekki przelotny śnieg',
    '+SHSN': '🌨️ Intensywny przelotny śnieg',
    'BLSN': '🌨️ Zawieja śnieżna',
    '+SHSN BLSN': '🌨️ Intensywny przelotny śnieg z zawieją',
    'SHSN BLSN': '🌨️ Przelotny śnieg z zawieją',
    'SH': '🌨️ Przelotne opady',
    
    // Rain conditions
    RA: '🌧️ Deszcz',
    '-RA': '🌧️ Lekki deszcz',
    '+RA': '🌧️ Silny deszcz',
    SHRA: '🌧️ Przelotny deszcz',
    '-SHRA': '🌧️ Lekki przelotny deszcz',
    '+SHRA': '🌧️ Silny przelotny deszcz',
    
    // Mixed precipitation
    RASN: '🌨️ Deszcz ze śniegiem',
    '-RASN': '🌨️ Lekki deszcz ze śniegiem',
    '+RASN': '🌨️ Intensywny deszcz ze śniegiem',
    
    // Other precipitation
    GR: '🌨️ Grad',
    GS: '🌨️ Mały grad',
    SG: '🌨️ Ziarna śniegu',
    DZ: '💧 Mżawka',
    '-DZ': '💧 Lekka mżawka',
    '+DZ': '💧 Intensywna mżawka',
    
    // Visibility conditions
    FG: '🌫️ Mgła',
    BR: '🌫️ Zamglenie',
    HZ: '🌫️ Zmętnienie',
    
    // Severe conditions
    FC: '🌪️ Lej kondensacyjny',
    SS: '🏜️ Burza piaskowa',
    
    // Cloud coverage
    SCT: '⛅ Zachmurzenie małe',
    BKN: '☁️ Zachmurzenie umiarkowane',
    OVC: '☁️ Zachmurzenie całkowite',
    
    // No significant weather
    NSW: 'Brak szczególnych zjawisk pogodowych'
  }
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

export interface RiskLevel {
  level: 1 | 2 | 3 | 4;
  title: string;
  message: string;
  statusMessage: string;
  color: "green" | "orange" | "red";
}

export interface OpenMeteoHourly {
  time: string[];
  temperature_2m: number[];
  wind_speed_10m: number[];
  wind_gusts_10m: number[];
  visibility: number[];
  precipitation: number[];
}

export interface OpenMeteoResponse {
  hourly: OpenMeteoHourly;
}

export interface OpenMeteoDataPoint {
  time: Date;
  temperature: number;
  windSpeed: number;
  windGusts: number;
  visibility: number;
  precipitation: number;
}
