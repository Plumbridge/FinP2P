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