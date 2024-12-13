// api/proxy/weather/metar.ts
import { NextResponse } from 'next/server';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const CHECKWX_API_KEY = process.env.NEXT_PUBLIC_CHECKWX_API_KEY;
  const AIRPORT = 'EPKK';

  try {
    const response = await fetch(`https://api.checkwx.com/metar/${AIRPORT}/decoded`, {
      headers: { 
        'X-API-Key': CHECKWX_API_KEY ?? '',
      },
    });

    const data = await response.json();

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      },
    });
  } catch (error) {
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch weather data' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });
  }
}
