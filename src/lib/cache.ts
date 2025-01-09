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

interface CacheConfig {
  staleDuration: number;  // in seconds
  cacheDuration: number;  // in seconds
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  staleDuration: 3 * 60,  // 3 minutes
  cacheDuration: 3 * 60,  // 3 minutesa
};

export async function getCacheOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  config: Partial<CacheConfig> = {}
): Promise<{ data: T, fromCache: boolean, age?: number }> {
  const { staleDuration, cacheDuration } = { ...DEFAULT_CACHE_CONFIG, ...config };
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
      const age = Math.floor(Date.now() / 1000) - cached.timestamp;
      console.log(`Cache age: ${age} seconds (stale after ${staleDuration} seconds)`);
      
      if (age < staleDuration) {
        console.log(`✅ Serving fresh cache for ${key}`);
        return { data: cached.data as T, fromCache: true, age };
      } else {
        console.log(`⚠️ Cache is stale for ${key}, refreshing...`);
      }
    }

    console.log(`🔄 Fetching fresh data for ${key}`);
    const freshData = await fetchFn();

    console.log(`💾 Saving to cache: ${key}`);
    await redis.set(key, {
      data: freshData,
      timestamp: Math.floor(Date.now() / 1000)
    }, { ex: cacheDuration });
    console.log(`✅ Cache updated for ${key}`);

    return { data: freshData, fromCache: false, age: 0 };

  } catch (error) {
    console.error(`❌ Error in getCacheOrFetch for ${key}:`, error);

    if (cached) {
      const age = Math.floor(Date.now() / 1000) - cached.timestamp;
      console.log(`⚠️ Serving stale cache for ${key} after error`);
      return { data: cached.data as T, fromCache: true, age };
    }

    throw error;
  }
}