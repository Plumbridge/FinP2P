#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const net = require('net');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

/**
 * Check if a port is available
 */
function checkPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const tester = net.createServer()
      .once('error', err => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          reject(err);
        }
      })
      .once('listening', () => {
        tester.once('close', () => resolve(true)).close();
      })
      .listen(port);
  });
}

/**
 * Find an available port starting from a base port
 */
async function findAvailablePort(basePort = 6379) {
  let port = basePort;
  const maxAttempts = 10;
  
  for (let i = 0; i < maxAttempts; i++) {
    if (await checkPortAvailable(port)) {
      return port;
    }
    port++;
  }
  
  throw new Error(`No available ports found between ${basePort} and ${port}`);
}

/**
 * Save Redis configuration for tests
 */
async function saveRedisConfig(port) {
  const config = {
    url: `redis://localhost:${port}`,
    port: port,
    timestamp: new Date().toISOString()
  };
  
  const configPath = path.join(__dirname, '..', '.test-redis-config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`💾 Saved Redis config to ${configPath}`);
}

/**
 * Wait for Redis to be ready using docker exec
 */
async function waitForRedis(port, maxAttempts = 60) {
  console.log('⏳ Waiting for Redis to be ready...');
  
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      // Use docker exec to ping Redis inside the container
      const { stdout } = await execAsync('docker exec docker-redis-test-1 redis-cli ping');
      
      if (stdout.trim() === 'PONG') {
        console.log('✅ Redis is ready!');
        return;
      }
    } catch (error) {
      if (i % 10 === 0) {
        console.log(`⏳ Still waiting... (attempt ${i}/${maxAttempts})`);
      }
    }
    
    // Wait 1 second between attempts
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // If we get here, Redis didn't start properly
  // Get container logs for debugging
  try {
    const { stdout: logs } = await execAsync('docker logs docker-redis-test-1 --tail 20');
    console.error('Redis container logs:', logs);
  } catch (error) {
    console.error('Could not retrieve logs:', error.message);
  }
  
  throw new Error(`Redis not ready after ${maxAttempts} attempts`);
}

/**
 * Setup Redis test environment
 */
async function setupTestRedis() {
  try {
    console.log('🔍 Finding available port for Redis test...');
    const port = await findAvailablePort(6379);
    console.log(`✅ Found available port: ${port}`);
    
    // Set environment variable for docker-compose
    process.env.REDIS_TEST_PORT = port.toString();
    
    console.log(`🐳 Starting Redis test container on port ${port}...`);
    await execAsync(`docker-compose -f docker/docker-compose.test.yml up -d redis-test`);
    
    console.log('✅ Redis test container started successfully');
    console.log(`📍 Redis URL: redis://localhost:${port}`);
    console.log(`🔧 Set TEST_REDIS_URL environment variable to: redis://localhost:${port}`);
    
    // Save configuration
    await saveRedisConfig(port);
    
    // Wait for Redis to be ready
    await waitForRedis(port);
    
    // Set environment variables for the current process
    process.env.TEST_REDIS_URL = `redis://localhost:${port}`;
    process.env.REDIS_URL = `redis://localhost:${port}`;
    
  } catch (error) {
    console.error('❌ Failed to setup Redis test environment:', error.message);
    process.exit(1);
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