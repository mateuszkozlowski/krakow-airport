import { getAirportWeather } from '@/lib/weather';

export const config = {
  runtime: 'edge',
};

// This function will be called by Vercel Cron
export default async function handler(req: Request) {
  try {
    // Allow both GET and POST requests from Vercel Cron
    if (req.method !== 'POST' && req.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Verify the request is from Vercel Cron
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Get weather data and post alerts if needed
    // The alerts are handled within getAirportWeather
    const plResult = await getAirportWeather('pl', true);  // Polish alerts
    const enResult = await getAirportWeather('en', true);  // English alerts

    // Check if tweets were needed based on risk levels
    const plCurrentRisk = plResult?.current?.riskLevel?.level || 0;
    const enCurrentRisk = enResult?.current?.riskLevel?.level || 0;
    const plHighRiskPeriods = plResult?.forecast?.filter(p => p.riskLevel.level >= 3) || [];
    const enHighRiskPeriods = enResult?.forecast?.filter(p => p.riskLevel.level >= 3) || [];

    const tweetDecision = {
      pl: {
        currentRisk: plCurrentRisk,
        highRiskPeriodsCount: plHighRiskPeriods.length,
        shouldTweet: plCurrentRisk >= 3 || plHighRiskPeriods.length > 0,
        reason: plCurrentRisk < 3 && plHighRiskPeriods.length === 0 ? 
          'Risk level too low (needs >= 3)' : 'Tweet may be sent if other conditions met'
      },
      en: {
        currentRisk: enCurrentRisk,
        highRiskPeriodsCount: enHighRiskPeriods.length,
        shouldTweet: enCurrentRisk >= 3 || enHighRiskPeriods.length > 0,
        reason: enCurrentRisk < 3 && enHighRiskPeriods.length === 0 ? 
          'Risk level too low (needs >= 3)' : 'Tweet may be sent if other conditions met'
      }
    };

    return new Response(JSON.stringify({
      status: 'success',
      message: 'Weather alerts processed successfully',
      results: {
        pl: plResult ? {
          current: {
            riskLevel: plResult.current.riskLevel,
            conditions: plResult.current.conditions
          }
        } : null,
        en: enResult ? {
          current: {
            riskLevel: enResult.current.riskLevel,
            conditions: enResult.current.conditions
          }
        } : null
      },
      tweetDecision
    }), { 
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error processing weather alerts:', error);
    return new Response(JSON.stringify({
      status: 'error',
      message: 'Internal Server Error',
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : String(error)
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 