import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.TEST_REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379';
process.env.ROUTER_ID = 'test-router';
process.env.PORT = '0'; // Use random port for tests

// Set global test timeout
jest.setTimeout(30000);



// Global cleanup to prevent hanging tests
afterEach(async () => {
  // Clear all timers and intervals
  jest.clearAllTimers();
  jest.clearAllMocks();
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

// Global teardown - consolidated
afterAll(async () => {
  // Clear any remaining timers
  jest.clearAllTimers();
  
  // Give time for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Force close any remaining handles
  if (process.env.NODE_ENV === 'test') {
    // Additional cleanup for test environment
    await new Promise(resolve => setTimeout(resolve, 500));
  }
});

// Integration tests will use real services, so we remove the mocks.
// Unit tests can still mock these at the test-file level if needed.

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockImplementation((token) => {
    if (token === 'valid-token' || token === 'valid.jwt.token') {
      return { routerId: 'test-router', permissions: ['transfer'] };
    }
    throw new Error('Invalid token');
  })
}));

// Declare global test utilities type
declare global {
  var testUtils: {
    delay: (ms: number) => Promise<void>;
    generateTestId: () => string;
  };
}

// Global test utilities
global.testUtils = {
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  generateTestId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
};

// Increase timeout for integration tests
jest.setTimeout(30000);

// Removed duplicate afterAll - consolidated above