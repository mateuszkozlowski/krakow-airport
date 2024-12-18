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
  let cached: CacheData | null = null;

  try {
    console.log(`🔍 Checking cache for key: ${key}`);
    
    // Test Redis connection
    try {
      await redis.ping();
      console.log('✅ Redis connection successful');
    } catch (redisError) {
      console.error('❌ Redis connection failed:', redisError);
      throw redisError;
    }

    // Try to get from cache first
    cached = await redis.get<CacheData>(key);
    console.log(`Cache status for ${key}:`, cached ? 'HIT' : 'MISS');

    if (cached) {
      const age = Date.now() / 1000 - cached.timestamp;
      console.log(`Cache age: ${Math.round(age)} seconds (stale after ${STALE_AFTER} seconds)`);
      
      if (age < STALE_AFTER) {
        console.log(`✅ Serving fresh cache for ${key}`);
        return { data: cached.data as T, fromCache: true };
      } else {
        console.log(`⚠️ Cache is stale for ${key}`);
      }
    }

    console.log(`🔄 Fetching fresh data for ${key}`);
    const freshData = await fetchFn();

    console.log(`💾 Saving to cache: ${key}`);
    await redis.set(key, {
      data: freshData,
      timestamp: Math.floor(Date.now() / 1000)
    }, { ex: CACHE_TTL });
    console.log(`✅ Cache updated for ${key}`);

    return { data: freshData, fromCache: false };

  } catch (error) {
    console.error(`❌ Error in getCacheOrFetch for ${key}:`, error);

    if (cached) {
      console.log(`⚠️ Serving stale cache for ${key} after error`);
      return { data: cached.data as T, fromCache: true };
    }

    throw error;
  }
}