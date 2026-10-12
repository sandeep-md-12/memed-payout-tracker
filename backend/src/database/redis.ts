import Redis from 'ioredis';

let client: Redis | null = null;

/**
 * Redis is optional: it only caches the live-campaign list. With no URL, or while Redis is down,
 * the app keeps working straight from MongoDB.
 */
export function connectRedis(url: string | undefined): void {
  if (!url) {
    console.log('REDIS_URL not set: campaign list cache disabled');
    return;
  }
  client = new Redis(url, {
    // Fail fast instead of queueing commands while Redis is unreachable.
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  });
  client.on('ready', () => console.log('Redis connected: campaign list cache enabled'));
  client.on('error', (err) => console.warn(`Redis unavailable (${err.message}); serving without cache`));
}

/** The client when it's ready to use, otherwise null. */
export function getRedis(): Redis | null {
  return client?.status === 'ready' ? client : null;
}

export async function disconnectRedis(): Promise<void> {
  await client?.quit().catch(() => undefined);
  client = null;
}
