import { RedisClientType } from 'redis';
/**
 * Create a Redis client for testing
 */
export declare function createTestRedisClient(): Promise<RedisClientType>;
/**
 * Clean up test data in Redis
 */
export declare function cleanupRedis(client: RedisClientType): Promise<void>;
/**
 * Close Redis connection
 */
export declare function closeRedisConnection(client: RedisClientType): Promise<void>;
//# sourceMappingURL=redis.d.ts.map