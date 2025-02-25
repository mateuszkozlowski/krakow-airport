interface BaseCloud {
  altitude: number;
  type: string;
}

// Transformed (output) interfaces
export interface TransformedCondition {
  code: string;
}

export interface Cloud extends BaseCloud {
  symbol: string;
}

export interface Wind {
  speed_kts: number;
  direction: number;
  gust_kts: number | null;
}

export interface Ceiling {
  feet: number;
}

export interface TransformedMetar {
  airport_code: string;
  clouds: Cloud[];
  conditions: TransformedCondition[];
  pressure: number;
  pressure_units: string;
  raw_text: string;
  temp_air: number;
  temp_dewpoint: number;
  visibility: number;
  visibility_units: string;
  wind: Wind;
  ceiling: Ceiling | null;
  vertical_visibility: { feet: number } | null;
  observed: string;
}

export interface TransformedMetarResponse {
  data: TransformedMetar[];
}

export interface ForecastTimestamp {
  from: string;
  to: string;
}

export interface ChangeIndicator {
  code: string;
  probability?: number;
}

export interface Visibility {
  meters: number;
}

export interface WeatherCondition {
  code: string;
  text?: string;
}

export interface ForecastLine {
  timestamp: {
    from: string;
    to: string;
  } | null;
  change?: {
    indicator: {
      code: string;
      text?: string;
      desc?: string;
      probability?: number;
    };
  };
  conditions: WeatherCondition[];
  clouds?: {
    code: string;
    base_feet_agl: number;
  }[];
  wind: {
    speed_kts: number;
    direction: number;
    gust_kts?: number;
  } | null;
  visibility?: {
    meters: number;
  };
  ceiling?: {
    feet: number;
  };
}

export interface TransformedTaf {
  airport_code: string;
  forecast: ForecastLine[];
  raw_text: string;
}

export interface TransformedTafResponse {
  data: TransformedTaf[];
}

// AeroAPI (input) interfaces
export interface AeroAPIWinds {
  speed: number;
  direction: string;
  peak_gusts: number | null;
}

export interface AeroAPICloud {
  altitude: number;
  type: string;
}

export interface AeroAPIVisibility {
  visibility: string | number;
}

export interface AeroAPIForecastCloud {
  symbol: string;
  coverage: string;
  altitude: string;
  special: string | null;
}

export interface AeroAPIObservation {
  airport_code: string;
  clouds: AeroAPICloud[];
  conditions: string | null;
  pressure: number;
  pressure_units: string;
  raw_data: string;
  temp_air: number;
  temp_dewpoint: number;
  visibility: number;
  visibility_units: string;
  wind_speed: number;
  wind_direction: number;
  wind_speed_gust: number;
  time: string;
}

export interface AeroAPIObservationsResponse {
  observations: AeroAPIObservation[];
}

export interface AeroAPIForecastLine {
  start: string | null;
  end: string | null;
  type: string;
  significant_weather: string | null;
  winds: AeroAPIWinds | null;
  visibility: AeroAPIVisibility | null;
  clouds: AeroAPIForecastCloud[];
}

export interface AeroAPIForecastResponse {
  airport_code: string;
  decoded_forecast: {
    lines: AeroAPIForecastLine[];
  };
  raw_forecast: string[];
}