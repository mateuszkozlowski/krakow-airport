// src/app/api/weather/route.ts
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export const runtime = 'edge';

// Error Types
interface WeatherAPIError {
  error: string;
  details?: string;
}

// AeroAPI METAR Types
interface AeroAPICloud {
  altitude: number;
  symbol: string;
  type: 'FEW' | 'SCT' | 'BKN' | 'OVC';
}

interface AeroAPIObservation {
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

interface AeroAPIMetarResponse {
  observations: AeroAPIObservation[];
  links?: {
    next?: string;
  };
  num_pages: number;
}

// AeroAPI TAF Types
interface AeroAPITAFCloud {
  symbol: string;
  coverage: string | null;
  altitude: string;
  special: string;
}

interface AeroAPITAFWind {
  symbol: string;
  direction: string;
  speed: number;
  units: string;
  peak_gusts: number;
}

interface AeroAPITAFWindshear {
  symbol: string;
  height: string;
  direction: string;
  speed: string;
  units: string;
}

interface AeroAPITAFVisibility {
  symbol: string;
  visibility: string;
  units: string;
}

type TAFLineType = 'FM' | 'TEMPO' | 'BECMG' | 'PROB30' | 'PROB40';

interface AeroAPITAFLine {
  type: TAFLineType;
  start: string;
  end: string;
  turbulence_layers: string;
  icing_layers: string;
  barometric_pressure: number;
  significant_weather: string;
  winds: AeroAPITAFWind;
  windshear: AeroAPITAFWindshear;
  visibility: AeroAPITAFVisibility;
  clouds: AeroAPITAFCloud[];
}

interface AeroAPITAFDecodedForecast {
  start: string;
  end: string;
  lines: AeroAPITAFLine[];
}

interface AeroAPITAFResponse {
  airport_code: string;
  raw_forecast: string[];
  time: string;
  decoded_forecast: AeroAPITAFDecodedForecast;
}

// Transformed Weather Types
interface WeatherCondition {
  code: string;
  prefix: '+' | '-' | null;
}

interface CloudInfo {
  code: string;
  base_feet_agl: number;
  text: string;
}

interface WindInfo {
  speed_kts: number;
  gust_kts?: number;
  degrees: number;
}

interface VisibilityInfo {
  meters: number;
}

interface ChangeIndicator {
  code: TAFLineType;
  desc: string;
  text: string;
}

interface ForecastPeriod {
  timestamp: {
    from: string;
    to: string;
  };
  conditions: WeatherCondition[];
  visibility: VisibilityInfo;
  wind: WindInfo;
  clouds: CloudInfo[];
  change?: {
    indicator: ChangeIndicator;
  };
}

interface TransformedResponse {
  metar: {
    data: Array<{
      raw_text: string;
      observed: string;
      visibility: VisibilityInfo;
      ceiling: {
        feet?: number;
      };
      wind: WindInfo;
      conditions: WeatherCondition[];
    }>;
  };
  taf: {
    data: Array<{
      raw_text: string;
      forecast: ForecastPeriod[];
    }>;
  };
  partial: boolean;
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        next: { revalidate: 60 },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  
  throw lastError;
}

export async function GET(): Promise<NextResponse<TransformedResponse | WeatherAPIError>> {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') ?? 'Weather-App/1.0';
  
  try {
    const API_KEY = process.env.NEXT_PUBLIC_FLIGHTAWARE_API_KEY;
    const AIRPORT = 'EPKK';

    if (!API_KEY) {
      return NextResponse.json(
        { error: 'AeroAPI key not configured' } as WeatherAPIError,
        { status: 500 }
      );
    }

    const requestHeaders = {
      'x-apikey': API_KEY,
      'Accept': 'application/json',
      'User-Agent': userAgent,
    };

    try {
      const [metarResult, tafResult] = await Promise.allSettled([
        fetchWithRetry(
          `https://aeroapi.flightaware.com/aeroapi/airports/${AIRPORT}/weather/observations`,
          { headers: requestHeaders }
        ),
        fetchWithRetry(
          `https://aeroapi.flightaware.com/aeroapi/airports/${AIRPORT}/weather/forecast`,
          { headers: requestHeaders }
        ),
      ]);

      if (metarResult.status === 'rejected' && tafResult.status === 'rejected') {
        throw new Error('Both METAR and TAF requests failed');
      }

      const metarData: AeroAPIMetarResponse | null = metarResult.status === 'fulfilled' ? await metarResult.value.json() : null;
      const tafData: AeroAPITAFResponse | null = tafResult.status === 'fulfilled' ? await tafResult.value.json() : null;

      const latestObs = metarData?.observations[0];
      const ceilingCloud = latestObs?.clouds?.find(c => c.type === 'BKN' || c.type === 'OVC');

      const transformedData: TransformedResponse = {
        metar: {
          data: [{
            raw_text: latestObs?.raw_data ?? '',
            observed: latestObs?.time ?? '',
            visibility: {
              meters: latestObs?.visibility ?? 0
            },
            ceiling: {
              feet: ceilingCloud?.altitude ? ceilingCloud.altitude * 100 : undefined
            },
            wind: {
              speed_kts: latestObs?.wind_speed ?? 0,
              gust_kts: latestObs?.wind_speed_gust,
              degrees: latestObs?.wind_direction ?? 0
            },
            conditions: latestObs?.conditions ? 
              latestObs.conditions.split(' ').map(code => ({
                code: code.replace(/^[+-]/, ''),
                prefix: (code.startsWith('+') ? '+' : code.startsWith('-') ? '-' : null) as ('+' | '-' | null)
              })) : []
          }]
        },
        taf: {
          data: [{
            raw_text: tafData?.raw_forecast?.[0] ?? '',
            forecast: tafData?.decoded_forecast?.lines?.map((line) => ({
              timestamp: {
                from: line.start,
                to: line.end
              },
              conditions: line.significant_weather ? 
                line.significant_weather.split(' ').map(code => ({
                  code: code.replace(/^[+-]/, ''),
                  prefix: (code.startsWith('+') ? '+' : code.startsWith('-') ? '-' : null) as ('+' | '-' | null)
                })) : [],
              visibility: {
                meters: parseInt(line.visibility.visibility) || 0
              },
              wind: {
                speed_kts: line.winds.speed,
                gust_kts: line.winds.peak_gusts,
                degrees: parseInt(line.winds.direction) || 0
              },
              clouds: line.clouds.map(cloud => ({
                code: cloud.coverage || '',
                base_feet_agl: parseInt(cloud.altitude) * 100,
                text: cloud.special || ''
              })),
              change: line.type !== 'FM' ? {
                indicator: {
                  code: line.type,
                  desc: line.type === 'TEMPO' ? 'Temporary' : 'Becoming',
                  text: line.type === 'TEMPO' ? 'Temporary' : 'Becoming'
                }
              } : undefined
            })) || []
          }]
        },
        partial: metarResult.status === 'rejected' || tafResult.status === 'rejected'
      };

      return NextResponse.json(
        transformedData,
        {
          headers: {
            'Cache-Control': 'public, max-age=60',
            'Vary': 'Accept-Encoding',
          }
        }
      );
    } catch (error) {
      console.error('API request error:', error);
      throw new Error(
        `API request failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  } catch (error) {
    console.error('Weather API error:', error);
    
    const errorResponse: WeatherAPIError = {
      error: 'Failed to fetch weather data',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    };

    return NextResponse.json(
      errorResponse,
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        }
      }
    );
  }
}