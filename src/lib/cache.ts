// lib/cache.ts
interface CacheData {
  metar?: unknown;
  taf?: unknown;
  arrivals?: unknown;
  departures?: unknown;
  [key: string]: unknown;
}

type CacheEntry = {
  data: CacheData;
  timestamp: number;
};

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

export function getCacheKey(type: string, params: string): string {
  return `${type}-${params}`;
}

export function getFromCache(key: string): CacheData | null {
  const entry = cache.get(key);
  if (!entry) return null;

  // Check if cache is still valid
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

export function setCache(key: string, data: CacheData): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}