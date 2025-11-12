"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
exports.initializeRedis = initializeRedis;
exports.getRedis = getRedis;
exports.closeRedis = closeRedis;
exports.Cacheable = Cacheable;
const ioredis_1 = require("ioredis");
const logger_js_1 = require("../utils/logger.js");
let redis = null;
async function initializeRedis() {
    try {
        const isProduction = process.env.NODE_ENV === 'production';
        const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
        
        // Determine Redis URL based on environment
        let redisUrl = process.env.REDIS_URL;
        
        if (!redisUrl) {
            if (isProduction) {
                // In production, REDIS_URL is required
                const errorMsg = 'REDIS_URL environment variable is required in production. Please set it to your Redis service connection string (e.g., from Railway).';
                logger_js_1.logger.error(errorMsg);
                throw new Error(errorMsg);
            }
            else if (isDevelopment) {
                // Only use localhost fallback in development
                redisUrl = 'redis://localhost:6379';
                logger_js_1.logger.warn('REDIS_URL not set, using localhost fallback for development');
            }
            else {
                // For test or other environments, skip Redis
                logger_js_1.logger.warn('REDIS_URL not set and not in development mode, skipping Redis initialization');
                return;
            }
        }
        
        if (!redis) {
            logger_js_1.logger.info(`Initializing Redis connection to: ${redisUrl.replace(/:[^:@]+@/, ':****@')}`); // Mask password in logs
            redis = new ioredis_1.Redis(redisUrl, {
                lazyConnect: true,
                maxRetriesPerRequest: 3,
                enableReadyCheck: false,
                connectTimeout: 10000,
                commandTimeout: 5000,
                family: 4,
                keepAlive: 30000,
                enableOfflineQueue: false,
                enableAutoPipelining: true,
            });
            await redis.connect();
            // Test connection
            await redis.ping();
            logger_js_1.logger.info('Redis connection test successful');
        }
    }
    catch (error) {
        const isProduction = process.env.NODE_ENV === 'production';
        logger_js_1.logger.error('Failed to initialize Redis:', error);
        
        // In production, if REDIS_URL was required but connection failed, we should fail
        if (isProduction && !process.env.REDIS_URL) {
            throw error; // Re-throw if REDIS_URL was missing in production
        }
        
        // Otherwise, allow app to continue without Redis (graceful degradation)
        logger_js_1.logger.warn('Continuing without Redis - some features may be unavailable');
        redis = null;
    }
}
function getRedis() {
    return redis;
}
async function closeRedis() {
    if (redis) {
        try {
            await redis.quit();
            logger_js_1.logger.info('Redis connection closed gracefully');
        }
        catch (error) {
            logger_js_1.logger.error('Error closing Redis connection:', error);
        }
        finally {
            redis = null;
        }
    }
}
// Cache utility functions
class CacheService {
    static instance;
    redis;
    constructor() {
        this.redis = getRedis();
    }
    static getInstance() {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }
    async get(key) {
        if (!this.redis)
            return null;
        try {
            const value = await this.redis.get(key);
            return value ? JSON.parse(value) : null;
        }
        catch (error) {
            logger_js_1.logger.error(`Cache get error for key ${key}:`, error);
            return null;
        }
    }
    async set(key, value, ttlSeconds = 3600) {
        if (!this.redis)
            return false;
        try {
            await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
            return true;
        }
        catch (error) {
            logger_js_1.logger.error(`Cache set error for key ${key}:`, error);
            return false;
        }
    }
    async del(key) {
        if (!this.redis)
            return false;
        try {
            await this.redis.del(key);
            return true;
        }
        catch (error) {
            logger_js_1.logger.error(`Cache delete error for key ${key}:`, error);
            return false;
        }
    }
    async exists(key) {
        if (!this.redis)
            return false;
        try {
            const result = await this.redis.exists(key);
            return result === 1;
        }
        catch (error) {
            logger_js_1.logger.error(`Cache exists error for key ${key}:`, error);
            return false;
        }
    }
    async flushPattern(pattern) {
        if (!this.redis)
            return false;
        try {
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
            return true;
        }
        catch (error) {
            logger_js_1.logger.error(`Cache flush pattern error for ${pattern}:`, error);
            return false;
        }
    }
    // Cache key generators
    static getUserKey(userId) {
        return `user:${userId}`;
    }
    static getJobKey(jobId) {
        return `job:${jobId}`;
    }
    static getJobsListKey(filters) {
        const filterStr = JSON.stringify(filters);
        return `jobs:list:${Buffer.from(filterStr).toString('base64')}`;
    }
    static getSocialFeedKey(userId, page) {
        return `social:feed:${userId}:${page}`;
    }
    static getTrainingContentKey(contentId) {
        return `training:content:${contentId}`;
    }
    static getChatKey(chatId) {
        return `chat:${chatId}`;
    }
    static getMessagesKey(chatId, page) {
        return `messages:${chatId}:${page}`;
    }
}
exports.CacheService = CacheService;
// Cache decorator for GraphQL resolvers
function Cacheable(ttlSeconds = 3600, keyGenerator) {
    return function (target, propertyName, descriptor) {
        const method = descriptor.value;
        descriptor.value = async function (...args) {
            const cache = CacheService.getInstance();
            if (!cache.redis) {
                return method.apply(this, args);
            }
            const cacheKey = keyGenerator ? keyGenerator(args) : `${propertyName}:${JSON.stringify(args)}`;
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached !== null) {
                logger_js_1.logger.debug(`Cache hit for ${cacheKey}`);
                return cached;
            }
            // Execute method and cache result
            const result = await method.apply(this, args);
            await cache.set(cacheKey, result, ttlSeconds);
            logger_js_1.logger.debug(`Cache set for ${cacheKey}`);
            return result;
        };
    };
}
