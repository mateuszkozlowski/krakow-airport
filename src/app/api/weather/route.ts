// src/app/api/weather/route.ts
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export const runtime = 'edge';

interface WeatherAPIError {
  error: string;
  details?: string;
}

// AeroAPI METAR Types
interface AeroAPICloud {
  altitude: number;
  symbol: string;
  type: string;
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
interface AeroAPITAFCondition {
  text: string;
  time_from: string;
  time_to: string;
  visibility: number;
  visibility_units: string;
  wind_direction: number;
  wind_speed: number;
  wind_units: string;
  change_indicator?: 'TEMPO' | 'BECMG' | 'PROB30' | 'PROB40';
}

interface AeroAPITAFForecast {
  conditions: AeroAPITAFCondition[];
  raw_data: string;
  time: string;
}

interface AeroAPITAFResponse {
  forecast: AeroAPITAFForecast;
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        next: { revalidate: 60 }, // Cache for 1 minute
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

export async function GET() {
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
      // Using Promise.allSettled to handle partial failures
      const [metarResult, tafResult] = await Promise.allSettled([
        // Get last 24 hours of METAR observations
        fetchWithRetry(
          `https://aeroapi.flightaware.com/aeroapi/airports/${AIRPORT}/weather/observations`,
          { headers: requestHeaders }
        ),
        // Get TAF data
        fetchWithRetry(
          `https://aeroapi.flightaware.com/aeroapi/airports/${AIRPORT}/weather/forecast`,
          { headers: requestHeaders }
        ),
      ]);

      // Handle potential partial failures
      if (metarResult.status === 'rejected' && tafResult.status === 'rejected') {
        throw new Error('Both METAR and TAF requests failed');
      }

      const metarData: AeroAPIMetarResponse | null = metarResult.status === 'fulfilled' ? await metarResult.value.json() : null;
      const tafData: AeroAPITAFResponse | null = tafResult.status === 'fulfilled' ? await tafResult.value.json() : null;

      const latestObs = metarData?.observations[0];
      const ceilingCloud = latestObs?.clouds?.find((c: AeroAPICloud) => c.type === 'BKN' || c.type === 'OVC');

      // Transform the data to match the expected structure
      const transformedData = {
        metar: {
          data: [{
            raw_text: latestObs?.raw_data,
            observed: latestObs?.time,
            visibility: {
              meters: latestObs?.visibility
            },
            ceiling: {
              feet: ceilingCloud?.altitude ? ceilingCloud.altitude * 100 : undefined
            },
            wind: {
              speed_kts: latestObs?.wind_speed,
              gust_kts: latestObs?.wind_speed_gust,
              degrees: latestObs?.wind_direction
            },
            conditions: latestObs?.conditions ? 
              latestObs.conditions.split(' ').map(code => ({
                code: code.replace(/^[+-]/, ''), // Remove intensity indicators
                prefix: code.startsWith('+') ? '+' : code.startsWith('-') ? '-' : null
              })) : []
          }]
        },
        taf: {
          data: [{
            raw_text: tafData?.forecast?.raw_data,
            forecast: tafData?.forecast?.conditions?.map((period: AeroAPITAFCondition) => ({
              timestamp: {
                from: period.time_from,
                to: period.time_to
              },
              conditions: period.text?.split(' ').map(code => ({
                code: code.replace(/^[+-]/, ''),
                prefix: code.startsWith('+') ? '+' : code.startsWith('-') ? '-' : null
              })),
              visibility: {
                meters: period.visibility
              },
              wind: {
                speed_kts: period.wind_speed,
                degrees: period.wind_direction
              },
              change: period.change_indicator ? {
                indicator: {
                  code: period.change_indicator,
                  desc: period.change_indicator === 'TEMPO' ? 'Temporary' : 'Becoming',
                  text: period.change_indicator === 'TEMPO' ? 'Temporary' : 'Becoming'
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
            'Cache-Control': 'public, max-age=60', // Cache for 1 minute
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