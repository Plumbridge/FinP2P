import { createClient, RedisClientType } from 'redis';
import { getTestRedisConfig } from './test-config';

/**
 * Create a Redis client for testing using centralized configuration
 */
export async function createTestRedisClient(): Promise<RedisClientType> {
  const config = await getTestRedisConfig();
  const client = createClient(config);

  client.on('error', (err) => {
    console.error('Test Redis Client Error:', err);
  });

  await client.connect();
  return client as RedisClientType;
}

/**
 * Clean up Redis data for tests
 */
export async function cleanupRedis(): Promise<void> {
  const config = await getTestRedisConfig();
  const client = createClient(config);
  
  try {
    await client.connect();
    await client.flushDb(); // Clear current database
    await client.quit();
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