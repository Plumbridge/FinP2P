import { createClient, RedisClientType } from 'redis';
import { getTestRedisConfig } from './test-config';

/**
 * Create a Redis client for testing using centralized configuration
 */
export async function createTestRedisClient(): Promise<RedisClientType> {
  const config = await getTestRedisConfig();
  const client = createClient({ url: config.url });
  await client.connect();

  client.on('error', (err: Error) => {
    console.error('Test Redis Client Error:', err);
  });

  return client;
}

/**
 * Clean up Redis data for tests
 */
export async function cleanupRedis(existingClient?: RedisClientType): Promise<void> {
  let client: RedisClientType;
  let shouldClose = false;

  try {
    if (existingClient && existingClient.isOpen) {
      client = existingClient;
    } else {
      const config = await getTestRedisConfig();
      client = createClient({ url: config.url });
      await client.connect();
      shouldClose = true;
    }

    await client.flushDb();

    if (shouldClose) {
      await client.quit();
    }
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