import { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';

let redis: Redis | null = null;

export async function initializeRedis(): Promise<void> {
  try {
    // Use Redis in all environments for better performance
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    if (!redis) {
      redis = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxLoadingTimeout: 5000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        // Connection pool settings
        family: 4,
        keepAlive: true,
        // Performance optimizations
        enableOfflineQueue: false,
        enableAutoPipelining: true,
        // Error handling
        onError: (error: Error) => {
          logger.error('Redis error:', error);
        },
        onConnect: () => {
          logger.info('Redis connected successfully');
        },
        onReady: () => {
          logger.info('Redis ready for operations');
        },
        onReconnecting: () => {
          logger.warn('Redis reconnecting...');
        },
        onClose: () => {
          logger.warn('Redis connection closed');
        },
      });

      await redis.connect();
      
      // Test connection
      await redis.ping();
      logger.info('Redis connection test successful');
    }
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    // Don't throw error - app should work without Redis
    redis = null;
  }
}

export function getRedis(): Redis | null {
  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
      logger.info('Redis connection closed gracefully');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    } finally {
      redis = null;
    }
  }
}

// Cache utility functions
export class CacheService {
  private static instance: CacheService;
  private redis: Redis | null;

  private constructor() {
    this.redis = getRedis();
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<boolean> {
    if (!this.redis) return false;
    
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.redis) return false;
    
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.redis) return false;
    
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async flushPattern(pattern: string): Promise<boolean> {
    if (!this.redis) return false;
    
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return true;
    } catch (error) {
      logger.error(`Cache flush pattern error for ${pattern}:`, error);
      return false;
    }
  }

  // Cache key generators
  static getUserKey(userId: string): string {
    return `user:${userId}`;
  }

  static getJobKey(jobId: string): string {
    return `job:${jobId}`;
  }

  static getJobsListKey(filters: any): string {
    const filterStr = JSON.stringify(filters);
    return `jobs:list:${Buffer.from(filterStr).toString('base64')}`;
  }

  static getSocialFeedKey(userId: string, page: number): string {
    return `social:feed:${userId}:${page}`;
  }

  static getTrainingContentKey(contentId: string): string {
    return `training:content:${contentId}`;
  }

  static getChatKey(chatId: string): string {
    return `chat:${chatId}`;
  }

  static getMessagesKey(chatId: string, page: number): string {
    return `messages:${chatId}:${page}`;
  }
}

// Cache decorator for GraphQL resolvers
export function Cacheable(ttlSeconds: number = 3600, keyGenerator?: (args: any) => string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cache = CacheService.getInstance();
      
      if (!cache.redis) {
        return method.apply(this, args);
      }

      const cacheKey = keyGenerator ? keyGenerator(args) : `${propertyName}:${JSON.stringify(args)}`;
      
      // Try to get from cache first
      const cached = await cache.get(cacheKey);
      if (cached !== null) {
        logger.debug(`Cache hit for ${cacheKey}`);
        return cached;
      }

      // Execute method and cache result
      const result = await method.apply(this, args);
      await cache.set(cacheKey, result, ttlSeconds);
      logger.debug(`Cache set for ${cacheKey}`);
      
      return result;
    };
  };
}