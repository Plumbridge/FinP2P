"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeRedisConnection = exports.cleanupRedis = exports.createTestRedisClient = void 0;
const redis_1 = require("redis");
// Test Redis configuration
const TEST_REDIS_CONFIG = {
    url: process.env.TEST_REDIS_URL || 'redis://localhost:6379',
    database: 1, // Use database 1 for tests to avoid conflicts
    socket: {
        connectTimeout: 5000,
        reconnectStrategy: false // Don't reconnect during tests
    }
};
/**
 * Create a Redis client for testing
 */
async function createTestRedisClient() {
    const client = (0, redis_1.createClient)({
        url: process.env.TEST_REDIS_URL || 'redis://localhost:6379',
        database: 1, // Use database 1 for tests
        socket: {
            connectTimeout: 5000,
            reconnectStrategy: false
        }
    });
    client.on('error', (err) => {
        console.error('Test Redis Client Error:', err);
    });
    await client.connect();
    return client;
}
exports.createTestRedisClient = createTestRedisClient;
/**
 * Clean up test data in Redis
 */
async function cleanupRedis(client) {
    try {
        // Clear all keys in the test database
        await client.flushDb();
    }
    catch (error) {
        console.warn('Failed to cleanup Redis:', error);
    }
}
exports.cleanupRedis = cleanupRedis;
/**
 * Close Redis connection
 */
async function closeRedisConnection(client) {
    try {
        await client.quit();
    }
    catch (error) {
        console.warn('Failed to close Redis connection:', error);
    }
}
exports.closeRedisConnection = closeRedisConnection;
//# sourceMappingURL=redis.js.map