// lib/cache.ts
import { Redis } from '@upstash/redis'

const ENV_DEBUG = {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  HAS_URL: !!process.env.UPSTASH_REDIS_REST_URL,
  HAS_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
  URL_PREFIX: process.env.UPSTASH_REDIS_REST_URL?.substring(0, 20) + '...',
};

console.log('🔍 Environment Debug:', ENV_DEBUG);

// Validate Redis configuration
function validateRedisConfig() {
  // Get environment variables
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  console.log('🔍 Redis Config Check:', {
    hasUrl: !!url,
    hasToken: !!token,
    urlPrefix: url?.substring(0, 20) + '...',
    env: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV
  });

  if (!url || !token) {
    console.error('❌ Redis configuration missing:', {
      url: url ? 'present' : 'missing',
      token: token ? 'present' : 'missing',
      env: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    });
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    if (!parsedUrl.protocol.startsWith('https')) {
      console.error('❌ Redis URL must use HTTPS protocol');
      return false;
    }
    console.log('✅ Redis URL format valid:', parsedUrl.origin);
    return true;
  } catch (error) {
    console.error('❌ Invalid Redis URL format:', error);
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

// Add a fallback in-memory cache for when Redis is unavailable
const memoryCache = new Map<string, CacheData>();

export async function getCacheOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  config: Partial<CacheConfig> = {}
): Promise<{ data: T, fromCache: boolean, age?: number }> {
  const { staleDuration, cacheDuration } = { ...DEFAULT_CACHE_CONFIG, ...config };

  try {
    // If Redis is available, try to use it
    if (redis && await validateRedisConnection()) {
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
    } else {
      // Fallback to in-memory cache
      console.log('⚠️ Using in-memory cache fallback');
      const cached = memoryCache.get(key);
      
      if (cached) {
        const age = Math.floor(Date.now() / 1000) - cached.timestamp;
        if (age < staleDuration) {
          return { data: cached.data as T, fromCache: true, age };
        }
      }

      // Fetch fresh data
      const freshData = await fetchFn();
      memoryCache.set(key, {
        data: freshData,
        timestamp: Math.floor(Date.now() / 1000)
      });

      return { data: freshData, fromCache: false, age: 0 };
    }
  } catch (error) {
    console.error(`❌ Cache error for ${key}:`, error);
    
    // Try memory cache as last resort
    const cached = memoryCache.get(key);
    if (cached) {
      const age = Math.floor(Date.now() / 1000) - cached.timestamp;
      return { data: cached.data as T, fromCache: true, age };
    }

    // If all else fails, just fetch fresh data
    const freshData = await fetchFn();
    return { data: freshData, fromCache: false };
  }
}