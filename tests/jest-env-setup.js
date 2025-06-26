// Jest environment setup file
// This file is loaded before any tests run
// Single source of truth for all test configuration

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read from centralized test config
const configFile = path.join(__dirname, 'test-config.json');

let config;

// Function to detect Redis container dynamically
function detectRedisContainer() {
  try {
    const output = execSync('docker ps --filter name=docker-redis-test', { 
      encoding: 'utf8'
    });
    
    // Parse port mapping from docker ps output
    const portMatch = output.match(/0\.0\.0\.0:(\d+)->6379\/tcp/);
    
    if (portMatch) {
      const port = parseInt(portMatch[1]);
      return {
        url: `redis://localhost:${port}`,
        port: port
      };
    }
    return null;
  } catch (error) {
    console.warn('Failed to detect Redis container:', error.message);
    return null;
  }
}

// Read base config
if (!fs.existsSync(configFile)) {
  throw new Error('Test configuration not found. Please ensure test-config.json exists.');
}

try {
  config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  
  // Dynamically detect Redis container
  const redisInfo = detectRedisContainer();
  if (redisInfo) {
    config.redis.url = redisInfo.url;
    config.redis.port = redisInfo.port;
    config.redis.host = 'localhost';
    config.redis.database = 1;
  } else {
    throw new Error('No Redis test container found. Please run "npm run test:setup" first to start Redis for testing.');
  }
} catch (error) {
  throw new Error(`Failed to read test configuration: ${error.message}`);
}

// Set environment variables from config
Object.entries(config.environment).forEach(([key, value]) => {
  process.env[key] = value;
});

// Set Redis-specific environment variables
process.env.TEST_REDIS_URL = config.redis.url;
process.env.REDIS_URL = config.redis.url;
process.env.REDIS_TEST_PORT = config.redis.port.toString();

// Global test configuration
global.testTimeout = 30000;

// Suppress console warnings during tests
const originalWarn = console.warn;
console.warn = (...args) => {
  // Only show warnings that are not related to deprecation
  if (!args[0]?.includes?.('deprecated')) {
    originalWarn.apply(console, args);
  }
};