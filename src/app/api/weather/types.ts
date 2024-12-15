// AeroAPI Types
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

// Transformed Types
export interface TransformedCloud {
  altitude: number;
  symbol: string;
  type: string;
}

export interface TransformedWind {
  speed_kts: number;
  direction: number;
  gust_kts: number | null;
}

export interface TransformedVisibility {
  meters: number;
}

export interface TransformedCeiling {
  feet: number;
}

export interface TransformedCondition {
  code: string;
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
  visibility: number;
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