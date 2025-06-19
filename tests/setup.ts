import { jest } from '@jest/globals';

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.ROUTER_ID = 'test-router';
  process.env.PORT = '0'; // Use random port for tests
});

afterAll(async () => {
  // Cleanup after all tests
  // Clear all timers and intervals
  jest.clearAllTimers();
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  // Wait a bit for any pending operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock external dependencies for unit tests
jest.mock('@mysten/sui/client', () => ({
  SuiClient: jest.fn(),
  getFullnodeUrl: jest.fn()
}));

jest.mock('@mysten/sui/keypairs/ed25519', () => ({
  Ed25519Keypair: jest.fn()
}));

jest.mock('@mysten/sui/transactions', () => ({
  Transaction: jest.fn().mockImplementation(() => ({
    object: jest.fn().mockReturnValue({ kind: 'Input', index: 0, type: 'object' }),
    pure: jest.fn().mockReturnValue({ kind: 'Input', index: 1, type: 'pure' }),
    moveCall: jest.fn(),
    transferObjects: jest.fn(),
    setGasBudget: jest.fn(),
    setSender: jest.fn()
  }))
}));

jest.mock('@mysten/sui/utils', () => ({
  fromB64: jest.fn(),
  toB64: jest.fn()
}));

jest.mock('@hashgraph/sdk', () => ({
  Client: jest.fn(),
  AccountId: jest.fn(),
  PrivateKey: jest.fn(),
  TokenCreateTransaction: jest.fn(),
  TransferTransaction: jest.fn()
}));

// Mock Redis globally for all tests
jest.mock('redis', () => {
  const mockRedisClient = {
    hSet: jest.fn((_key: string, _field: string, _value: string): Promise<number> => Promise.resolve(1)),
    hGet: jest.fn((_key: string, _field: string): Promise<string | null> => Promise.resolve(null)),
    hGetAll: jest.fn((_key: string): Promise<{ [key: string]: string }> => Promise.resolve({})),
    hgetall: jest.fn((_key: string): Promise<{ [key: string]: string }> => Promise.resolve({})),
    sAdd: jest.fn((_key: string, _member: string | string[]): Promise<number> => Promise.resolve(1)),
    sMembers: jest.fn((_key: string): Promise<string[]> => Promise.resolve([])),
    sRem: jest.fn((_key: string, _member: string | string[]): Promise<number> => Promise.resolve(1)),
    del: jest.fn((_key: string | string[]): Promise<number> => Promise.resolve(1)),
    get: jest.fn((_key: string): Promise<string | null> => Promise.resolve(null)),
    set: jest.fn((_key: string, _value: string): Promise<'OK' | null> => Promise.resolve('OK')),
    exists: jest.fn((_keys: string | string[]): Promise<number> => Promise.resolve(0)),
    keys: jest.fn((_pattern: string): Promise<string[]> => Promise.resolve([])),
    quit: jest.fn((): Promise<'OK'> => Promise.resolve('OK')),
    connect: jest.fn((): Promise<void> => Promise.resolve(undefined)),
    disconnect: jest.fn((): Promise<void> => Promise.resolve(undefined)),
    ping: jest.fn((): Promise<string> => Promise.resolve('PONG')),
    isOpen: true,
    isReady: true
  };
  
  return {
    createClient: jest.fn(() => mockRedisClient)
  };
});

// Global test utilities
global.testUtils = {
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  generateTestId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
};

// Declare global types for TypeScript
declare global {
  var testUtils: {
    delay: (ms: number) => Promise<void>;
    generateTestId: () => string;
  };
}