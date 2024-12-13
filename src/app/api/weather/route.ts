// src/app/api/weather/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    const CHECKWX_API_KEY = process.env.NEXT_PUBLIC_CHECKWX_API_KEY;
    const AIRPORT = 'EPKK';

    const [metarResponse, tafResponse] = await Promise.all([
      fetch(`https://api.checkwx.com/metar/${AIRPORT}/decoded`, {
        headers: { 
          'X-API-Key': CHECKWX_API_KEY ?? '',
        },
      }),
      fetch(`https://api.checkwx.com/taf/${AIRPORT}/decoded`, {
        headers: { 
          'X-API-Key': CHECKWX_API_KEY ?? '',
        },
      })
    ]);

    if (!metarResponse.ok || !tafResponse.ok) {
      throw new Error('Weather API responded with an error');
    }

    const [metarData, tafData] = await Promise.all([
      metarResponse.json(),
      tafResponse.json()
    ]);

    return NextResponse.json(
      { metar: metarData, taf: tafData },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}