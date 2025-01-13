import { TwitterApi } from 'twitter-api-v2';
import { RiskAssessment } from './types/weather';
import { translations } from './translations';
import { redis, validateRedisConnection } from './cache';

// Initialize Twitter client
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY || '',
  appSecret: process.env.TWITTER_API_SECRET || '',
  accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
  accessSecret: process.env.TWITTER_ACCESS_SECRET || '',
});

const REDIS_KEYS = {
  LAST_POSTED_RISK: 'twitter_last_posted_risk',
  MONTHLY_POST_COUNT: 'twitter_monthly_post_count',
  LAST_POST_TIME: 'twitter_last_post_time'
} as const;

const POST_LIMITS = {
  MAX_MONTHLY_POSTS: 90, // Keep 10 posts as buffer
  MIN_POST_INTERVAL: 30 * 60 * 1000, // 30 minutes between posts
  RISK_CHANGE_THRESHOLD: 1 // Only post if risk level changes by this much
} as const;

async function getMonthlyPostCount(): Promise<number> {
  if (!redis || !await validateRedisConnection()) {
    console.warn('Redis not available, skipping post count check');
    return 0;
  }

  const count = await redis.get<number>(REDIS_KEYS.MONTHLY_POST_COUNT) || 0;
  return count;
}

async function incrementPostCount(): Promise<void> {
  if (!redis || !await validateRedisConnection()) {
    console.warn('Redis not available, skipping post count increment');
    return;
  }

  const now = new Date();
  const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const secondsUntilNextMonth = Math.floor((firstOfNextMonth.getTime() - now.getTime()) / 1000);

  await redis.incr(REDIS_KEYS.MONTHLY_POST_COUNT);
  // Reset counter at the start of next month
  await redis.expire(REDIS_KEYS.MONTHLY_POST_COUNT, secondsUntilNextMonth);
}

async function getLastPostedRisk(): Promise<number | null> {
  if (!redis || !await validateRedisConnection()) {
    console.warn('Redis not available, using in-memory last posted risk');
    return null;
  }

  return await redis.get<number>(REDIS_KEYS.LAST_POSTED_RISK);
}

async function setLastPostedRisk(level: number): Promise<void> {
  if (!redis || !await validateRedisConnection()) {
    console.warn('Redis not available, skipping last posted risk update');
    return;
  }

  await redis.set(REDIS_KEYS.LAST_POSTED_RISK, level);
}

async function getLastPostTime(): Promise<number | null> {
  if (!redis || !await validateRedisConnection()) {
    console.warn('Redis not available, using in-memory last post time');
    return null;
  }

  return await redis.get<number>(REDIS_KEYS.LAST_POST_TIME);
}

async function setLastPostTime(time: number): Promise<void> {
  if (!redis || !await validateRedisConnection()) {
    console.warn('Redis not available, skipping last post time update');
    return;
  }

  await redis.set(REDIS_KEYS.LAST_POST_TIME, time);
}

async function canPostTweet(): Promise<boolean> {
  const postCount = await getMonthlyPostCount();
  if (postCount >= POST_LIMITS.MAX_MONTHLY_POSTS) {
    console.log('Monthly post limit reached, skipping tweet');
    return false;
  }

  const lastPostTime = await getLastPostTime();
  if (lastPostTime && Date.now() - lastPostTime < POST_LIMITS.MIN_POST_INTERVAL) {
    console.log('Too soon since last post, skipping tweet');
    return false;
  }

  return true;
}

export async function postWeatherAlert(
  assessment: RiskAssessment,
  language: 'en' | 'pl' = 'pl',
  isFuturePeriod: boolean = false
): Promise<void> {
  if (!process.env.TWITTER_API_KEY) {
    console.log('Twitter API credentials not configured, skipping tweet');
    return;
  }

  const { level } = assessment;

  // Only post for risk levels 3 and 4
  if (level < 3) {
    return;
  }

  // Check if we can post
  if (!await canPostTweet()) {
    return;
  }

  // Check if risk level changed significantly
  const lastPostedRisk = await getLastPostedRisk();
  if (lastPostedRisk !== null && Math.abs(level - lastPostedRisk) < POST_LIMITS.RISK_CHANGE_THRESHOLD) {
    console.log('Risk level change not significant enough, skipping tweet');
    return;
  }

  const t = translations[language];
  const { title, message, operationalImpacts } = assessment;

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
    await incrementPostCount();
    await setLastPostedRisk(level);
    await setLastPostTime(Date.now());
    console.log('Weather alert tweet posted successfully');
  } catch (error) {
    console.error('Error posting weather alert tweet:', error);
  }
}

export async function postAlertDismissal(language: 'en' | 'pl' = 'pl'): Promise<void> {
  if (!process.env.TWITTER_API_KEY) {
    return;
  }

  const lastPostedRisk = await getLastPostedRisk();
  if (!lastPostedRisk || lastPostedRisk < 3) {
    return;
  }

  // Check if we can post
  if (!await canPostTweet()) {
    return;
  }

  const tweetText = language === 'pl'
    ? '✅ Warunki pogodowe uległy poprawie. Operacje lotnicze wracają do normy.\n\n#KRK #KrakowAirport'
    : '✅ Weather conditions have improved. Flight operations returning to normal.\n\n#KRK #KrakowAirport';

  try {
    await twitterClient.v2.tweet(tweetText);
    await incrementPostCount();
    await setLastPostedRisk(0);
    await setLastPostTime(Date.now());
    console.log('Alert dismissal tweet posted successfully');
  } catch (error) {
    console.error('Error posting alert dismissal tweet:', error);
  }
} 