import { TwitterApi } from 'twitter-api-v2';
import { RiskAssessment } from './types/weather';
import { translations } from './translations';

// Initialize Twitter client
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY || '',
  appSecret: process.env.TWITTER_API_SECRET || '',
  accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
  accessSecret: process.env.TWITTER_ACCESS_SECRET || '',
});

let lastPostedRiskLevel: number | null = null;

export async function postWeatherAlert(
  assessment: RiskAssessment,
  language: 'en' | 'pl' = 'pl',
  isFuturePeriod: boolean = false
): Promise<void> {
  if (!process.env.TWITTER_API_KEY) {
    console.log('Twitter API credentials not configured, skipping tweet');
    return;
  }

  const t = translations[language];
  const { level, title, message, operationalImpacts } = assessment;

  // Only post for risk levels 3 and 4
  if (level < 3) {
    lastPostedRiskLevel = null;
    return;
  }

  // Don't post if we already posted about the same risk level
  if (lastPostedRiskLevel === level) {
    return;
  }

  // Prepare the tweet text
  let tweetText = '';
  const emoji = level === 4 ? '🔴' : '🟠';

  if (isFuturePeriod) {
    tweetText = language === 'pl' 
      ? `${emoji} PROGNOZA: ${title}\n${message}`
      : `${emoji} FORECAST: ${title}\n${message}`;
  } else {
    tweetText = `${emoji} ${title}\n${message}`;
  }

  // Add operational impacts if any
  if (operationalImpacts && operationalImpacts.length > 0) {
    tweetText += '\n\n' + operationalImpacts[0];
  }

  // Add airport hashtag
  tweetText += '\n\n#KRK #KrakowAirport';

  try {
    await twitterClient.v2.tweet(tweetText);
    lastPostedRiskLevel = level;
    console.log('Weather alert tweet posted successfully');
  } catch (error) {
    console.error('Error posting weather alert tweet:', error);
  }
}

export async function postAlertDismissal(language: 'en' | 'pl' = 'pl'): Promise<void> {
  if (!lastPostedRiskLevel || !process.env.TWITTER_API_KEY) {
    return;
  }

  const t = translations[language];
  const tweetText = language === 'pl'
    ? '✅ Warunki pogodowe uległy poprawie. Operacje lotnicze wracają do normy.\n\n#KRK #KrakowAirport'
    : '✅ Weather conditions have improved. Flight operations returning to normal.\n\n#KRK #KrakowAirport';

  try {
    await twitterClient.v2.tweet(tweetText);
    lastPostedRiskLevel = null;
    console.log('Alert dismissal tweet posted successfully');
  } catch (error) {
    console.error('Error posting alert dismissal tweet:', error);
  }
} 