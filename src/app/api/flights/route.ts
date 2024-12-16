// src/app/api/flights/route.ts
import { NextResponse } from 'next/server';
import { getCacheKey, getFromCache, setCache } from '@/lib/cache';

export const runtime = 'edge';

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      
      if (response.status === 503) {
        console.log(`Attempt ${i + 1}/${retries} failed with 503, retrying...`);
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        continue;
      }
      
      throw new Error(`API responded with status: ${response.status}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Attempt ${i + 1}/${retries} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
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
    const cachedData = getFromCache(cacheKey);
    
    if (cachedData) {
      console.log('Serving flights from cache:', { type, start, end });
      return NextResponse.json(cachedData);
    }

    console.log('Fetching flights data:', { start, end });

    const endpoint = type === 'departures' ? 'departures' : 'arrivals';
    const response = await fetchWithRetry(
      `https://aeroapi.flightaware.com/aeroapi/airports/${AIRPORT}/flights/${endpoint}?start=${start}&end=${end}&type=Airline&max_pages=10`,
      {
        headers: {
          'x-apikey': API_KEY!,
          'Accept': 'application/json; charset=UTF-8',
        }
      }
    );

    const data = await response.json();
    setCache(cacheKey, data);
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=600'
      }
    });
  } catch (error) {
    console.error('Detailed error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });

    // If we have cached data, return it on error
    const cacheKey = getCacheKey('flights', `${type}-${start}-${end}`);
    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
      console.log('Serving stale cache after error');
      return NextResponse.json(cachedData, {
        headers: {
          'X-Served-From': 'stale-cache'
        }
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch flight data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}