// Jest environment setup file
// This file is loaded before any tests run
// Single source of truth for all test configuration

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Read from centralized test config
const configFile = path.join(__dirname, 'test-config.json');

let config;

// Function to detect Redis container dynamically
function detectRedisContainer() {
  try {
    // Look for any container with redis-test in the name
    const output = execSync('docker ps --filter "name=redis-test" --format "{{.Names}} {{.Ports}}"', { 
      encoding: 'utf8'
    });
    
    if (!output) {
      return null;
    }
    
    // Split by lines to handle multiple containers
    const lines = output.trim().split('\n');
    
    for (const line of lines) {
      // Parse port mapping - looking for format like "0.0.0.0:6381->6379/tcp"
      const portMatch = line.match(/0\.0\.0\.0:(\d+)->6379\/tcp/);
      
      if (portMatch) {
        const port = parseInt(portMatch[1]);
        console.log(`✅ Found Redis test container on port ${port}`);
        console.log(`Redis container info: ${line}`);
        return {
          url: `redis://localhost:${port}`,
          port: port
        };
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to detect Redis container:', error.message);
    return null;
  }
}

// Function to read dynamic config if available
function readDynamicConfig() {
  const dynamicConfigFile = path.join(__dirname, '..', '.test-redis-config.json');
  if (fs.existsSync(dynamicConfigFile)) {
    try {
      const dynamicConfig = JSON.parse(fs.readFileSync(dynamicConfigFile, 'utf8'));
      console.log(`📍 Using dynamic Redis config: ${dynamicConfig.url}`);
      return dynamicConfig;
    } catch (error) {
      console.warn('Failed to read dynamic config:', error.message);
    }
  }
  return null;
}

// Read base config
if (!fs.existsSync(configFile)) {
  throw new Error('Test configuration not found. Please ensure test-config.json exists.');
}

try {
  config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  
  // First try to read dynamic config from setup script
  const dynamicConfig = readDynamicConfig();
  
  if (dynamicConfig) {
    config.redis.url = dynamicConfig.url;
    config.redis.port = dynamicConfig.port;
    config.redis.host = 'localhost';
    config.redis.database = 1;
  } else {
    // Fallback to detecting Redis container
    const redisInfo = detectRedisContainer();
    if (redisInfo) {
      config.redis.url = redisInfo.url;
      config.redis.port = redisInfo.port;
      config.redis.host = 'localhost';
      config.redis.database = 1;
    } else {
      throw new Error('No Redis test container found. Please run "npm run test:setup" first to start Redis for testing.');
    }
  }
  
  console.log(`🔧 Test Redis URL: ${config.redis.url}`);
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