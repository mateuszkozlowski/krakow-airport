import { RiskAssessment } from './types/weather';
import { translations } from './translations';
import { redis, validateRedisConnection } from './cache';

const TWITTER_API_URL = 'https://api.twitter.com/2/tweets';

const REDIS_KEYS = {
  LAST_POSTED_RISK: 'twitter_last_posted_risk',
  MONTHLY_POST_COUNT: 'twitter_monthly_post_count',
  LAST_POST_TIME: 'twitter_last_post_time'
} as const;

const POST_LIMITS = {
  MAX_MONTHLY_POSTS: 90, // Keep 10 posts as buffer
  MIN_POST_INTERVAL: 15 * 60 * 1000, // 15 minutes between posts
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

async function postTweet(text: string): Promise<void> {
  // OAuth 1.0a parameters
  interface OAuthParams {
    oauth_consumer_key: string;
    oauth_token: string;
    oauth_signature_method: string;
    oauth_timestamp: string;
    oauth_nonce: string;
    oauth_version: string;
    oauth_signature?: string;
  }

  const oauth: OAuthParams = {
    oauth_consumer_key: process.env.TWITTER_API_KEY!,
    oauth_token: process.env.TWITTER_ACCESS_TOKEN!,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: Math.random().toString(36).substring(2),
    oauth_version: '1.0'
  };

  // Create signature base string
  const paramString = Object.entries(oauth)
    .filter(([_, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value!)}`)
    .join('&');

  const signatureBaseString = [
    'POST',
    encodeURIComponent(TWITTER_API_URL),
    encodeURIComponent(paramString)
  ].join('&');

  // Create signing key
  const signingKey = `${encodeURIComponent(process.env.TWITTER_API_SECRET!)}&${encodeURIComponent(process.env.TWITTER_ACCESS_SECRET!)}`;

  // Generate signature
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingKey),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signatureBaseString)
  );

  oauth.oauth_signature = btoa(String.fromCharCode(...new Uint8Array(signature)));

  // Create Authorization header
  const authHeader = 'OAuth ' + Object.entries(oauth)
    .filter(([_, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}="${encodeURIComponent(value!)}"`)
    .join(', ');

  // Send request
  const response = await fetch(TWITTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => response.text());
    console.error('Twitter API error details:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      error,
      signatureBaseString,
      paramString,
      authHeader: authHeader.replace(/oauth_consumer_key="[^"]+"/g, 'oauth_consumer_key="REDACTED"')
        .replace(/oauth_token="[^"]+"/g, 'oauth_token="REDACTED"')
        .replace(/oauth_signature="[^"]+"/g, 'oauth_signature="REDACTED"'),
      apiKey: process.env.TWITTER_API_KEY?.slice(0, 5) + '...',
      accessToken: process.env.TWITTER_ACCESS_TOKEN?.slice(0, 5) + '...'
    });
    throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
  }
}

interface AlertPeriod {
  start: Date;
  end: Date;
  level: number;
}

function formatTimeRange(periods: AlertPeriod[]): string {
  if (periods.length === 0) return '';
  
  // Group periods by day
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayPeriods = periods.filter(p => p.start >= today && p.start < tomorrow);
  const tomorrowPeriods = periods.filter(p => p.start >= tomorrow);

  const formatPeriod = (p: AlertPeriod) => {
    const startTime = p.start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const endTime = p.end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${startTime}–${endTime}`;
  };

  let timeText = '';
  if (todayPeriods.length > 0) {
    timeText += 'Dziś/Today: ';
    timeText += todayPeriods.map(formatPeriod).join(', ');
  }
  
  if (tomorrowPeriods.length > 0) {
    if (todayPeriods.length > 0) timeText += '\n';
    timeText += 'Jutro/Tomorrow: ';
    timeText += tomorrowPeriods.map(formatPeriod).join(', ');
  }

  return timeText;
}

function formatTwitterMessage(
  assessment: RiskAssessment,
  periods: { start: string; end: string; level: number }[],
  language: 'en' | 'pl'
): string {
  const emoji = assessment.level === 4 ? '⛔' : '⚠️';
  const timeRanges = periods
    .map(p => {
      const start = new Date(p.start);
      const end = new Date(p.end);
      return `${start.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
    })
    .join(', ');

  return `KRK.flights ALERT!\n${timeRanges}\n${emoji} ${assessment.message}\nWięcej/More: krk.flights`;
}

export async function postWeatherAlert(
  assessment: RiskAssessment,
  language: 'en' | 'pl',
  periods: { start: string; end: string; level: number }[]
): Promise<void> {
  try {
    console.log('�� Attempting to post Twitter alert:', {
      language,
      riskLevel: assessment.level,
      periodsCount: periods.length,
      timestamp: new Date().toISOString()
    });

    const t = translations[language].twitter;
    const message = formatTwitterMessage(assessment, periods, language);
    console.log('📝 Formatted Twitter message:', message);

    const response = await fetch('/api/twitter/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    const responseData = await response.json();
    console.log('🐦 Twitter API Response:', {
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      timestamp: new Date().toISOString()
    });

    if (!response.ok) {
      console.error('❌ Failed to post Twitter alert:', {
        status: response.status,
        statusText: response.statusText,
        error: responseData,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to post Twitter alert: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Successfully posted Twitter alert', {
      message,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error posting Twitter alert:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

export async function postAlertDismissal(language: 'en' | 'pl'): Promise<void> {
  try {
    console.log('🐦 Attempting to post Twitter dismissal:', {
      language,
      timestamp: new Date().toISOString()
    });

    const t = translations[language].twitter;
    const message = t.conditionsImproved;
    console.log('📝 Formatted dismissal message:', message);

    const response = await fetch('/api/twitter/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    const responseData = await response.json();
    console.log('🐦 Twitter API Response:', {
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      timestamp: new Date().toISOString()
    });

    if (!response.ok) {
      console.error('❌ Failed to post Twitter dismissal:', {
        status: response.status,
        statusText: response.statusText,
        error: responseData,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to post Twitter dismissal: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Successfully posted Twitter dismissal', {
      message,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error posting Twitter dismissal:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
} 