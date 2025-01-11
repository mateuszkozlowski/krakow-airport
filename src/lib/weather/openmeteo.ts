import type { OpenMeteoDataPoint } from '@/lib/types/weather';

const KRAKOW_COORDS = {
  latitude: 50.07778,
  longitude: 19.78472
};

export async function fetchOpenMeteoForecast() {
  console.log('=== OpenMeteo Weather Request Started ===');
  console.log('OpenMeteo Request URL:', {
    latitude: KRAKOW_COORDS.latitude,
    longitude: KRAKOW_COORDS.longitude
  });

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${KRAKOW_COORDS.latitude}&longitude=${KRAKOW_COORDS.longitude}&current=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility&wind_speed_unit=kn`;
  
  console.log('Attempting OpenMeteo API call...');
  
  try {
    const response = await fetch(url);
    
    // Log response status
    console.log('OpenMeteo API response status:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Open-Meteo data');
    }

    const data = await response.json();
    
    // Debug log raw response with more detail
    console.log('OpenMeteo Raw Response:', {
      currentTime: data.current?.time,
      currentData: !!data.current,
      availableKeys: data.current ? Object.keys(data.current) : [],
      rawTime: data.current?.time
    });
    
    // Ensure we have a timestamp
    const timestamp = data.current?.time || new Date().toISOString();
    if (!data.current?.time) {
      console.log('OpenMeteo: No timestamp in response, using current time');
    }
    
    const result = {
      current: {
        time: timestamp,
        temperature: data.current.temperature_2m,
        dewPoint: data.current.dew_point_2m,
        precipitation: data.current.precipitation,
        precipitationProbability: 0, // OpenMeteo doesn't provide this in current weather
        weatherCode: data.current.weather_code,
        cloudCover: data.current.cloud_cover,
        visibility: data.current.visibility,
        windSpeed: data.current.wind_speed_10m,
        windDirection: data.current.wind_direction_10m,
        windGusts: data.current.wind_gusts_10m
      } as OpenMeteoDataPoint
    };

    // Debug log processed result with more detail
    console.log('OpenMeteo Processed Result:', {
      timestamp: result.current.time,
      hasData: !!result.current,
      dataFields: Object.keys(result.current)
    });

    return result;
  } catch (error) {
    console.error('Error fetching Open-Meteo data:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
} 