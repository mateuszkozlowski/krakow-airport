// src/lib/types/weather.ts

export interface AeroAPICloud {
  type: string;
  altitude: number;
}

export interface AeroAPIWinds {
  symbol: string;
  direction: string;
  speed: number;
  units: string;
  peak_gusts: number | null;
}

export interface AeroAPIVisibility {
  symbol: string;
  visibility: string | number;
  units: string | null;
}

export interface AeroAPIObservation {
  airport_code: string;
  cloud_friendly: string;
  clouds: AeroAPICloud[];
  conditions: string | null;
  pressure: number;
  pressure_units: string;
  raw_data: string;
  temp_air: number;
  temp_dewpoint: number;
  temp_perceived: number;
  relative_humidity: number;
  time: string;
  visibility: number;
  visibility_units: string;
  wind_direction: number;
  wind_friendly: string;
  wind_speed: number;
  wind_speed_gust: number;
  wind_units: string;
}

export interface AeroAPIObservationsResponse {
  observations: AeroAPIObservation[];
  links: {
    next?: string;
  };
  num_pages: number;
}

export interface AeroAPIForecastLine {
  type: string;
  start: string | null;
  end: string | null;
  significant_weather: string | null;
  winds: AeroAPIWinds | null;
  visibility: AeroAPIVisibility | null;
  clouds: Array<{
    symbol: string;
    coverage: string;
    altitude: string;
    special: string | null;
  }>;
}

export interface AeroAPIForecastResponse {
  airport_code: string;
  raw_forecast: string[];
  decoded_forecast: {
    start: string;
    end: string;
    lines: AeroAPIForecastLine[];
  };
}

export interface TransformedCloud {
  altitude: number;
  symbol: string;
  type: string;
}

// Basic weather types
export interface WeatherData {
  temperature?: {
    celsius: number;
  };
  wind?: TransformedWind;
  visibility?: TransformedVisibility;
  clouds?: TransformedCloud[];
  ceiling?: TransformedCeiling;
  conditions?: TransformedCondition[];
  raw_text: string;
  observed: string;
  change?: Change;
}

// wind types
export interface TransformedWind {
  speed_kts: number;
  direction: number;
  gust_kts?: number | undefined;
}

export interface TransformedVisibility {
  meters: number;
}

export interface TransformedCeiling {
  feet: number;
}

export interface TransformedCondition {
  code: keyof typeof WEATHER_PHENOMENA;
}

export interface TransformedMetarData {
  airport_code: string;
  clouds: TransformedCloud[];
  conditions: TransformedCondition[];
  pressure: number;
  pressure_units: string;
  raw_text: string;
  temp_air: number;
  temp_dewpoint: number;
  visibility: TransformedVisibility;
  visibility_units: string;
  wind: TransformedWind;
  ceiling: TransformedCeiling | null;
  observed: string;
}

export interface TransformedForecastPeriod {
  timestamp: {
    from: string;
    to: string;
  } | null;
  change: {
    indicator: {
      code: string;
    };
    probability?: number;
  };
  conditions: TransformedCondition[];
  wind: TransformedWind | null;
  visibility: TransformedVisibility | null;
  ceiling: TransformedCeiling | null;
}

export interface TransformedMetarResponse {
  data: TransformedMetarData[];
}

export interface TransformedTafResponse {
  data: Array<{
    airport_code: string;
    forecast: TransformedForecastPeriod[];
    raw_text: string;
  }>;
}

export interface WeatherResponse {
  current: {
    riskLevel: RiskAssessment;
    conditions: ProcessedConditions;
    raw: string;
    observed: string;
    wind?: TransformedWind;
    visibility?: TransformedVisibility;
    ceiling?: TransformedCeiling;
  };
  forecast: ForecastChange[];
  raw_taf: string;
}

export interface ProcessedConditions {
  phenomena: string[];
}

export interface RiskAssessment {
  level: 1 | 2 | 3;
  title: string;
  message: string;
  explanation?: string;
  color: 'red' | 'orange' | 'green';
}

export interface ForecastChange {
  timeDescription: string;
  from: Date;
  to: Date;
  conditions: ProcessedConditions;
  riskLevel: RiskAssessment;
  changeType: 'TEMPO' | 'BECMG' | 'PERSISTENT';
  wind?: TransformedWind;
  visibility?: TransformedVisibility;
  ceiling?: TransformedCeiling;
  isTemporary?: boolean;
  probability?: number;
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

export type WeatherPhenomenonValue = typeof WEATHER_PHENOMENA[keyof typeof WEATHER_PHENOMENA];