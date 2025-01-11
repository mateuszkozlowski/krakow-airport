import { TomorrowIOResponse } from '../types/weather';
import { getCacheOrFetch } from '@/lib/cache';

const TOMORROW_API_KEY = process.env.TOMORROW_API_KEY;
const KRAKOW_COORDS = '50.078,19.785';

async function fetchTomorrowWeather(): Promise<TomorrowIOResponse> {
  // Check if API key exists and log its status (without revealing the key)
  console.log('Tomorrow.io API key status:', {
    exists: !!TOMORROW_API_KEY,
    length: TOMORROW_API_KEY?.length || 0
  });

  if (!TOMORROW_API_KEY) {
    throw new Error('TOMORROW_API_KEY is not set in environment variables');
  }

  const url = `https://api.tomorrow.io/v4/weather/realtime?location=${KRAKOW_COORDS}&apikey=${TOMORROW_API_KEY}`;
  
  try {
    console.log('Attempting Tomorrow.io API call...');
    const response = await fetch(url);
    
    // Log response status
    console.log('Tomorrow.io API response status:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Debug log raw response
    console.log('Tomorrow.io Raw Response:', {
      hasData: !!data.data,
      time: data.data?.time,
      values: !!data.data?.values,
      dataKeys: data.data ? Object.keys(data.data) : []
    });
    
    // Ensure the response includes a timestamp
    if (!data.data?.time) {
      console.log('Tomorrow.io: No timestamp in response, adding current time');
      data.data = {
        ...data.data,
        time: new Date().toISOString()
      };
    }
    
    // Debug log processed data
    console.log('Tomorrow.io Processed Data:', {
      time: data.data.time,
      hasValues: !!data.data.values,
      valueKeys: data.data.values ? Object.keys(data.data.values) : []
    });
    
    return data as TomorrowIOResponse;
  } catch (error) {
    console.error('Error fetching Tomorrow.io weather data:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

export async function getCurrentWeather(): Promise<TomorrowIOResponse | null> {
  console.log('=== Tomorrow.io Weather Request Started ===');
  console.log('Tomorrow.io API key status:', {
    exists: !!TOMORROW_API_KEY,
    length: TOMORROW_API_KEY?.length || 0,
    isDefined: typeof TOMORROW_API_KEY !== 'undefined'
  });

  try {
    const { data, age } = await getCacheOrFetch<TomorrowIOResponse>(
      'tomorrow-weather',
      fetchTomorrowWeather,
      {
        staleDuration: 60,   // 1 minute
        cacheDuration: 120   // 2 minutes
      }
    );
    
    // Debug log cache result
    console.log('Tomorrow.io Cache Result:', {
      hasData: !!data,
      dataTime: data?.data?.time,
      age
    });
    
    // If we have data but no timestamp, add it with the correct age
    if (data && data.data && !data.data.time) {
      const timestamp = new Date(Date.now() - (age || 0) * 1000).toISOString();
      data.data = {
        ...data.data,
        time: timestamp
      };
    }
    
    // Debug log final data
    console.log('Tomorrow.io Final Data:', {
      hasData: !!data,
      time: data?.data?.time,
      hasValues: !!data?.data?.values
    });
    
    return data;
  } catch (error) {
    console.error('Error in getCurrentWeather:', error);
    return null;
  }
} 