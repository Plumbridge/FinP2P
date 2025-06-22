import { createClient, RedisClientType } from 'redis';

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
export async function createTestRedisClient(): Promise<RedisClientType> {
  const client = createClient({
    ...TEST_REDIS_CONFIG,
    url: `${TEST_REDIS_CONFIG.url}/${TEST_REDIS_CONFIG.database}`
  });

  client.on('error', (err) => {
    console.error('Test Redis Client Error:', err);
  });

  await client.connect();
  return client as RedisClientType;
}

/**
 * Clean up test data in Redis
 */
export async function cleanupRedis(client: RedisClientType): Promise<void> {
  try {
    // Clear all keys in the test database
    await client.flushDb();
  } catch (error) {
    console.warn('Failed to cleanup Redis:', error);
  }
}

/**
 * Close Redis connection
 */
export async function closeRedisConnection(client: RedisClientType): Promise<void> {
  try {
    await client.quit();
  } catch (error) {
    console.warn('Failed to close Redis connection:', error);
  }
}