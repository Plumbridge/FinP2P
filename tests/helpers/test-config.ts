import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * Centralized test configuration interface
 */
export interface TestConfig {
  redis: {
    url: string;
    host: string;
    port: number;
    database: number;
  };
  router: {
    port: number;
  };
  environment: {
    [key: string]: string;
  };
}

let testConfig: TestConfig | null = null;

/**
 * Dynamically detect running Redis test containers
 */
export function detectRedisContainer(): { port: number; url: string } | null {
  try {
    // First try to read from .test-redis-config.json
    const redisConfigPath = path.join(__dirname, '..', '..', '.test-redis-config.json');
    if (fs.existsSync(redisConfigPath)) {
      const redisConfig = JSON.parse(fs.readFileSync(redisConfigPath, 'utf8'));
      return {
        url: redisConfig.url,
        port: redisConfig.port
      };
    }

    // Fallback to Docker container detection
    const output = execSync('docker ps --filter name=redis-test --format "table {{.Names}}\t{{.Ports}}"', { 
      encoding: 'utf8'
    }).trim();
    
    if (!output) {
      throw new Error('No Redis containers found');
    }
    
    const lines = output.split('\n').filter(line => line.includes('redis'));
    const portMatch = lines[0]?.match(/(\d+)->6379/);
    
    if (portMatch) {
      const port = parseInt(portMatch[1]);
      const url = `redis://localhost:${port}`;
      return { url, port };
    }

    throw new Error('Could not determine Redis port from container');
  } catch (error) {
    console.warn('🔍 [TS] Failed to detect Redis configuration:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Get the centralized test configuration
 * Reads from test-config.json with dynamic overrides from environment
 */
export async function getTestConfig(): Promise<TestConfig> {
  if (testConfig) {
    return testConfig;
  }

  const configFile = path.join(__dirname, '..', 'test-config.json');

  // Read base configuration
  if (!fs.existsSync(configFile)) {
    throw new Error('Test configuration file not found: test-config.json');
  }

  const baseConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));

  // Dynamically detect Redis container
  const redisInfo = detectRedisContainer();
  if (redisInfo) {
    baseConfig.redis.url = redisInfo.url;
    baseConfig.redis.port = redisInfo.port;
    baseConfig.redis.host = 'localhost';
    baseConfig.redis.database = 1;
  } else {
    throw new Error('No Redis test container found. Please run "npm run test:setup" first to start Redis for testing.');
  }

  testConfig = baseConfig;
  return testConfig as TestConfig;
}

/**
 * Reset test configuration (useful for test isolation)
 */
export function resetTestConfig(): void {
  testConfig = null;
}

/**
 * Get Redis URL for tests
 */
export async function getTestRedisUrl(): Promise<string> {
  const config = await getTestConfig();
  return config.redis.url;
}

/**
 * Get Redis configuration object for tests
 */
export async function getTestRedisConfig() {
  const config = await getTestConfig();
  return {
    ...config.redis,
    socket: {
      connectTimeout: 5000
    }
  };
}