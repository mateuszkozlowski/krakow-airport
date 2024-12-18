// lib/cache.ts
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

interface CacheData {
  metar?: unknown;
  taf?: unknown;
  arrivals?: unknown;
  departures?: unknown;
  [key: string]: unknown;
}

const CACHE_TTL = 10 * 60; // 10 minutes cache (in seconds for Redis)

export function getCacheKey(type: string, params: string): string {
  return `${type}-${params}`;
}

export async function getFromCache(key: string): Promise<CacheData | null> {
  try {
    const data = await redis.get(key);
    return data as CacheData | null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

export async function setCache(key: string, data: CacheData): Promise<void> {
  try {
    await redis.set(key, data, { ex: CACHE_TTL });
  } catch (error) {
    console.error('Cache set error:', error);
  }
}