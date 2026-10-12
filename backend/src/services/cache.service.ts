import { getRedis } from '../database/redis';

export const CacheKeys = {
  LIVE_CAMPAIGNS: 'campaigns:live',
} as const;

/**
 * Cache-aside helpers over Redis. Every failure falls back to the loader, so a Redis outage
 * only makes reads slower, never wrong.
 */
export const cacheService = {
  async getOrLoad<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
    const redis = getRedis();
    if (!redis) return load();

    try {
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached) as T;
    } catch (err) {
      console.warn(`Cache read failed for ${key}:`, (err as Error).message);
    }

    const value = await load();
    redis.set(key, JSON.stringify(value), 'EX', ttlSeconds).catch((err: Error) => {
      console.warn(`Cache write failed for ${key}:`, err.message);
    });
    return value;
  },

  async invalidate(key: string): Promise<void> {
    await getRedis()
      ?.del(key)
      .catch((err: Error) => console.warn(`Cache invalidation failed for ${key}:`, err.message));
  },
};
