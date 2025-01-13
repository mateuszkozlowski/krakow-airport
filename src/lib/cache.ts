// lib/cache.ts
import { Redis } from '@upstash/redis'

// Validate Redis configuration
function validateRedisConfig() {
  // Get environment variables with fallback to .env.local
  const url = process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  console.log('Checking Redis configuration:', {
    hasUrl: !!url,
    hasToken: !!token,
    urlPrefix: url?.substring(0, 8),
    env: process.env.NODE_ENV
  });

  if (!url || !token) {
    console.error('❌ Redis configuration missing:', {
      UPSTASH_REDIS_REST_URL: url ? 'present' : 'missing',
      UPSTASH_REDIS_REST_TOKEN: token ? 'present' : 'missing',
      NODE_ENV: process.env.NODE_ENV
    });
    return false;
  }

  try {
    // Validate URL format
    const parsedUrl = new URL(url);
    if (!parsedUrl.protocol.startsWith('https')) {
      console.error('❌ Redis URL must use HTTPS protocol');
      return false;
    }
    console.log('✅ Redis URL format valid:', parsedUrl.origin);
    return true;
  } catch (error) {
    console.error('❌ Invalid Redis URL format. URL must be absolute with https:// prefix:', error);
    return false;
  }
}

// Initialize Redis only if configuration is valid
let redis: Redis | null = null;

try {
  if (validateRedisConfig()) {
    redis = new Redis({
      url: process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    console.log('✅ Redis client initialized');
  } else {
    console.error('❌ Redis initialization skipped due to invalid configuration');
  }
} catch (error) {
  console.error('❌ Failed to initialize Redis client:', error);
}

// Validate Redis connection
export async function validateRedisConnection(): Promise<boolean> {
  if (!redis) {
    console.error('❌ Redis not initialized due to invalid configuration');
    return false;
  }

  try {
    const pong = await redis.ping();
    if (pong === 'PONG') {
      console.log('✅ Redis connection successful');
      return true;
    }
    console.error('❌ Redis ping failed: unexpected response:', pong);
    return false;
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    return false;
  }
}

// Export Redis instance with type safety
export { redis };

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
  cacheDuration: 3 * 60,  // 3 minutes
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
    
    // Check if Redis is available
    if (!redis) {
      console.error('❌ Redis not initialized');
      throw new Error('Redis not initialized');
    }

    // Test Redis connection
    if (!await validateRedisConnection()) {
      throw new Error('Redis connection failed');
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