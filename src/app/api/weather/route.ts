// src/app/api/weather/route.ts
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export const runtime = 'edge';

interface WeatherAPIError {
  error: string;
  details?: string;
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
  const headersList = headers();
  const userAgent = headersList.has('user-agent') 
    ? headersList.get('user-agent')
    : 'Weather-App/1.0';
  
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

      const metarData = metarResult.status === 'fulfilled' ? await metarResult.value.json() : null;
      const tafData = tafResult.status === 'fulfilled' ? await tafResult.value.json() : null;

      // Transform the data to match the expected structure
      const transformedData = {
        metar: {
          data: [{
            // Take the most recent observation
            raw_text: metarData?.observations[0]?.raw_data,
            observed: metarData?.observations[0]?.time,
            visibility: {
              meters: metarData?.observations[0]?.visibility
            },
            ceiling: {
              feet: metarData?.observations[0]?.clouds.find(c => c.type === 'BKN' || c.type === 'OVC')?.altitude * 100
            },
            wind: {
              speed_kts: metarData?.observations[0]?.wind_speed,
              gust_kts: metarData?.observations[0]?.wind_speed_gust,
              degrees: metarData?.observations[0]?.wind_direction
            },
            conditions: metarData?.observations[0]?.conditions ? 
              metarData.observations[0].conditions.split(' ').map(code => ({
                code: code.replace(/^[+-]/, ''), // Remove intensity indicators
                prefix: code.startsWith('+') ? '+' : code.startsWith('-') ? '-' : null
              })) : []
          }]
        },
        taf: {
          data: [{
            raw_text: tafData?.forecast?.raw_data,
            forecast: tafData?.forecast?.conditions?.map(period => ({
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