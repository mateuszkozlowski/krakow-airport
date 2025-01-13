import { getAirportWeather } from '@/lib/weather';

export const config = {
  runtime: 'edge',
};

// This function will be called by Vercel Cron
export default async function handler(req: Request) {
  try {
    console.log('🔄 Weather alerts endpoint triggered:', {
      method: req.method,
      timestamp: new Date().toISOString()
    });

    // Allow both GET and POST requests from Vercel Cron
    if (req.method !== 'POST' && req.method !== 'GET') {
      console.warn('❌ Invalid method:', req.method);
      return new Response('Method not allowed', { status: 405 });
    }

    // Verify the request is from Vercel Cron
    const authHeader = req.headers.get('authorization');
    const isAuthorized = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    console.log('🔑 Authorization check:', {
      hasAuthHeader: !!authHeader,
      isAuthorized,
      timestamp: new Date().toISOString()
    });

    if (!isAuthorized) {
      console.warn('❌ Unauthorized request:', {
        authHeader: authHeader ? 'present' : 'missing',
        timestamp: new Date().toISOString()
      });
      return new Response('Unauthorized', { status: 401 });
    }

    console.log('🔄 Starting weather alerts processing');

    // Get weather data and post alerts if needed
    // The alerts are handled within getAirportWeather
    console.log('🌍 Processing Polish alerts...');
    await getAirportWeather('pl', true);  // Polish alerts with Twitter enabled
    console.log('🌍 Processing English alerts...');
    await getAirportWeather('en', true);  // English alerts with Twitter enabled

    console.log('✅ Weather alerts processing completed', {
      timestamp: new Date().toISOString()
    });
    return new Response('Weather alerts processed successfully', { status: 200 });
  } catch (error) {
    console.error('❌ Error processing weather alerts:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return new Response('Internal Server Error', { status: 500 });
  }
} 