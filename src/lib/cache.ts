// lib/cache.ts
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

interface CacheData {
  data: unknown;
  timestamp: number;
}

const CACHE_TTL = 60 * 60; // 1 hour cache (in seconds for Redis)
const STALE_AFTER = 20 * 60; // 20 minutes (in seconds)

export async function getCacheOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>
): Promise<{ data: T, fromCache: boolean }> {
  try {
    // Try to get from cache first
    const cached = await redis.get<CacheData>(key);

    // If we have valid cache that's not stale, return it
    if (cached && (Date.now() / 1000 - cached.timestamp) < STALE_AFTER) {
      console.log(`Serving fresh cache for ${key}`);
      return { data: cached.data as T, fromCache: true };
    }

    // If cache is stale or missing, fetch new data
    console.log(`Fetching fresh data for ${key}`);
    const freshData = await fetchFn();

    // Store in cache with timestamp
    await redis.set(key, {
      data: freshData,
      timestamp: Math.floor(Date.now() / 1000)
    }, { ex: CACHE_TTL });

    return { data: freshData, fromCache: false };

  } catch (error) {
    console.error(`Error in getCacheOrFetch for ${key}:`, error);

    // If fetch failed and we have stale cache, return it
    if (cached) {
      console.log(`Serving stale cache for ${key} after error`);
      return { data: cached.data as T, fromCache: true };
    }

    throw error;
  }
}