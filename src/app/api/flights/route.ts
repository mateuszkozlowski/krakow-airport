// src/app/api/flights/route.ts
import { NextResponse } from 'next/server';
import { getCacheKey, getFromCache, setCache } from '@/lib/cache';

export const runtime = 'edge';

async function fetchWithRetry(url: string, options: RequestInit, retries = 5, baseDelay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.ok) {
        return response;
      }
      
      // Handle rate limiting (429)
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter 
          ? parseInt(retryAfter) * 1000 
          : Math.min(baseDelay * Math.pow(2, i), 10000); // Cap at 10 seconds
        
        console.log(`Rate limited, waiting ${waitTime/1000}s before retry ${i + 1}/${retries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // Other server errors
      if (response.status >= 500) {
        const waitTime = Math.min(baseDelay * Math.pow(2, i), 5000);
        console.log(`Server error ${response.status}, retrying in ${waitTime/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      throw new Error(`API responded with status: ${response.status}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      const waitTime = Math.min(baseDelay * Math.pow(2, i), 5000);
      console.log(`Network error on attempt ${i + 1}/${retries}, retrying in ${waitTime/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  throw new Error('All retry attempts failed');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const type = searchParams.get('type') || 'arrivals';
  const API_KEY = process.env.NEXT_PUBLIC_FLIGHTAWARE_API_KEY;
  const AIRPORT = 'EPKK';

  try {
    // Check cache first
    const cacheKey = getCacheKey('flights', `${type}-${start}-${end}`);
    const cachedData = await getFromCache(cacheKey);
    
    if (cachedData) {
      console.log('Serving flights from cache:', { type, start, end });
      return NextResponse.json(cachedData);
    }

    console.log('Fetching flights data:', { start, end });

    const endpoint = type === 'departures' ? 'departures' : 'arrivals';
    const response = await fetchWithRetry(
      `https://aeroapi.flightaware.com/aeroapi/airports/${AIRPORT}/flights/${endpoint}?start=${start}&end=${end}&type=Airline&max_pages=2`,
      {
        headers: {
          'x-apikey': API_KEY!,
          'Accept': 'application/json; charset=UTF-8',
        }
      }
    );

    const data = await response.json();
    
    // Validate data structure
    if (!data || (type === 'arrivals' && !Array.isArray(data.arrivals)) || 
        (type === 'departures' && !Array.isArray(data.departures))) {
      console.error('Invalid API response structure:', data);
      throw new Error(`Invalid API response structure for ${type}`);
    }

    // Log data structure for debugging
    console.log(`${type} data structure:`, {
      hasData: !!data,
      dataKeys: Object.keys(data),
      flightsCount: data[type]?.length,
      sampleFlight: data[type]?.[0]
    });

    await setCache(cacheKey, data);
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=600'
      }
    });
  } catch (error) {
    console.error('Detailed flight error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      params: { type, start, end },
      error
    });

    // Try to serve stale cache on error
    const cacheKey = getCacheKey('flights', `${type}-${start}-${end}`);
    const cachedData = await getFromCache(cacheKey);
    if (cachedData) {
      console.log('Serving stale flight data from cache after error');
      return NextResponse.json(cachedData, {
        headers: {
          'X-Served-From': 'stale-cache'
        }
      });
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch flight data', 
        details: error instanceof Error ? error.message : 'Unknown error',
        type,
        start,
        end
      },
      { status: 500 }
    );
  }
}