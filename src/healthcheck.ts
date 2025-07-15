#!/usr/bin/env node

/**
 * Health check script for Docker containers
 * This script is used by Docker's HEALTHCHECK instruction
 */

import http from 'http';

const HEALTH_CHECK_URL = `http://localhost:${process.env.PORT || 3000}/health`;
const TIMEOUT = parseInt(process.env.HEALTH_CHECK_TIMEOUT || '3000', 10); // 3 seconds

function performHealthCheck(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = http.get(HEALTH_CHECK_URL, { timeout: TIMEOUT }, (res) => {
      if (res.statusCode === 200) {
        console.log('Health check passed');
        resolve();
      } else {
        console.error(`Health check failed with status: ${res.statusCode}`);
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    });

    req.on('timeout', () => {
      console.error('Health check timed out');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.on('error', (err) => {
      console.error('Health check error:', err.message);
      reject(err);
    });
  });
}

// Run the health check
performHealthCheck()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Health check failed:', error.message);
    process.exit(1);
  });
