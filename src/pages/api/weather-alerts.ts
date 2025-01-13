import { getAirportWeather } from '@/lib/weather';

export const config = {
  runtime: 'edge',
};

// This function will be called by Vercel Cron
export default async function handler(req: Request) {
  try {
    // Only allow POST requests from Vercel Cron
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Verify the request is from Vercel Cron
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Get weather data and post alerts if needed
    // The alerts are handled within getAirportWeather
    await getAirportWeather('pl');  // Polish alerts
    await getAirportWeather('en');  // English alerts

    return new Response('Weather alerts processed successfully', { status: 200 });
  } catch (error) {
    console.error('Error processing weather alerts:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 