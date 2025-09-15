import { Redis } from 'ioredis';

let redis: Redis | null = null;

export async function initializeRedis(): Promise<void> {
  // Skip Redis in development if URL not provided
  if (!process.env.REDIS_URL || process.env.NODE_ENV === 'development') {
    console.log('Redis disabled for development environment');
    return;
  }

  if (!redis) {
    redis = new Redis(process.env.REDIS_URL!, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });

    redis.on('connect', () => {
      console.log('Redis connected successfully');
    });

    redis.on('error', (error: Error) => {
      console.error('Redis connection error:', error);
    });

    await redis.connect();
  }
}

export function getRedis(): Redis | null {
  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
