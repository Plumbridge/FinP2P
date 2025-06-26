#!/usr/bin/env node

const { spawn } = require('child_process');
const net = require('net');
const { promisify } = require('util');
const { exec } = require('child_process');

const execAsync = promisify(exec);

/**
 * Check if a port is available
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.close(() => {
        resolve(true);
      });
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Find an available port starting from a given port
 */
async function findAvailablePort(startPort = 6380, maxAttempts = 100) {
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found in range ${startPort}-${startPort + maxAttempts}`);
}

/**
 * Setup Redis test environment with dynamic port
 */
async function setupTestRedis() {
  try {
    console.log('🔍 Finding available port for Redis test...');
    const port = await findAvailablePort(6380);
    console.log(`✅ Found available port: ${port}`);
    
    // Write configuration to file for tests to read
  // Set environment variables for immediate use
  process.env.TEST_REDIS_URL = `redis://localhost:${port}`;
  process.env.REDIS_TEST_PORT = port.toString();
  process.env.REDIS_URL = `redis://localhost:${port}`;
    
    console.log(`🐳 Starting Redis test container on port ${port}...`);
    
    // Start Redis container with dynamic port
    const { stdout, stderr } = await execAsync(
      `docker-compose -f docker/docker-compose.test.yml up -d redis-test`,
      { 
        env: { 
          ...process.env, 
          REDIS_TEST_PORT: port.toString() 
        } 
      }
    );
    
    if (stderr && !stderr.includes('warning')) {
      console.error('Docker compose stderr:', stderr);
    }
    
    console.log('✅ Redis test container started successfully');
    console.log(`📍 Redis URL: redis://localhost:${port}`);
    console.log(`🔧 Set TEST_REDIS_URL environment variable to: redis://localhost:${port}`);
    
    // Wait for Redis to be ready
    console.log('⏳ Waiting for Redis to be ready...');
    await waitForRedis(port);
    console.log('✅ Redis is ready for testing');
    
    return port;
    
  } catch (error) {
    console.error('❌ Failed to setup Redis test environment:', error.message);
    process.exit(1);
  }
}

/**
 * Wait for Redis to be ready
 */
async function waitForRedis(port, maxAttempts = 30) {
  const redis = require('redis');
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const client = redis.createClient({ url: `redis://localhost:${port}` });
      await client.connect();
      await client.ping();
      await client.quit();
      return;
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw new Error(`Redis not ready after ${maxAttempts} attempts`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

/**
 * Cleanup Redis test environment
 */
async function cleanupTestRedis() {
  try {
    console.log('🧹 Cleaning up Redis test environment...');
    await execAsync('docker-compose -f docker/docker-compose.test.yml down');
    
    // Remove the config file
    const fs = require('fs');
    const path = require('path');
    const configFile = path.join(__dirname, '..', '.test-redis-config.json');
    if (fs.existsSync(configFile)) {
      fs.unlinkSync(configFile);
      console.log('🗑️ Removed Redis config file');
    }
    
    console.log('✅ Redis test environment cleaned up');
  } catch (error) {
    console.error('❌ Failed to cleanup Redis test environment:', error.message);
  }
}

// Handle command line arguments
const command = process.argv[2];

switch (command) {
  case 'setup':
    setupTestRedis();
    break;
  case 'cleanup':
    cleanupTestRedis();
    break;
  case 'find-port':
    findAvailablePort().then(port => {
      console.log(port);
    }).catch(error => {
      console.error(error.message);
      process.exit(1);
    });
    break;
  default:
    console.log('Usage: node setup-test-redis.js [setup|cleanup|find-port]');
    console.log('  setup     - Start Redis test container with dynamic port');
    console.log('  cleanup   - Stop and remove Redis test container');
    console.log('  find-port - Find and print an available port');
    process.exit(1);
}