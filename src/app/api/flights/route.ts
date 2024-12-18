// src/app/api/flights/route.ts
import { NextResponse } from 'next/server';
import { getCacheOrFetch } from '@/lib/cache';

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
  
  try {
    const { data, fromCache } = await getCacheOrFetch(
      `flights-${type}-${start}-${end}`,
      async () => {
        const response = await fetchFlightData(type, start, end);
        if (!response || !Array.isArray(response[type])) {
          throw new Error('Invalid flight data structure');
        }
        return response;
      }
    );

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=1200',
        ...(fromCache && { 'X-Served-From': 'cache' })
      }
    });

  } catch (error) {
    console.error('Flight API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flight data' },
      { status: 500 }
    );
  }
}