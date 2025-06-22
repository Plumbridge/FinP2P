import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.TEST_REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379';
process.env.ROUTER_ID = 'test-router';
process.env.PORT = '0'; // Use random port for tests

// Set global test timeout
jest.setTimeout(10000);

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

// Global teardown
afterAll(async () => {
  // Give time for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Remove all Redis mocks - we're using real Redis now
// DO NOT mock redis or ioredis

// Keep other mocks for external services
jest.mock('@mysten/sui/client', () => ({
  SuiClient: jest.fn().mockImplementation(() => ({
    // @ts-ignore
    getCoins: jest.fn().mockResolvedValue({ data: [] }),
    // @ts-ignore
    getBalance: jest.fn().mockResolvedValue({ totalBalance: '0' }),
    // @ts-ignore
    dryRunTransactionBlock: jest.fn().mockResolvedValue({ effects: { status: { status: 'success' } } }),
    // @ts-ignore
    executeTransactionBlock: jest.fn().mockResolvedValue({ digest: 'mock-tx-hash' })
  })),
  getFullnodeUrl: jest.fn().mockReturnValue('https://fullnode.testnet.sui.io')
}));

jest.mock('@mysten/sui/keypairs/ed25519', () => ({
  Ed25519Keypair: jest.fn().mockImplementation(() => ({
    getPublicKey: jest.fn().mockReturnValue({ toBase64: () => 'mock-public-key' }),
    signData: jest.fn().mockReturnValue(Buffer.from('mock-signature'))
  }))
}));

jest.mock('@mysten/sui/transactions', () => ({
  Transaction: jest.fn().mockImplementation(() => ({
    object: jest.fn().mockReturnValue({ kind: 'Input', index: 0, type: 'object' }),
    pure: jest.fn().mockReturnValue({ kind: 'Input', index: 1, type: 'pure' }),
    moveCall: jest.fn().mockReturnValue({ kind: 'TransactionBlock', index: 0 }),
    transferObjects: jest.fn(),
    setGasBudget: jest.fn(),
    setSender: jest.fn(),
    // @ts-ignore
    build: jest.fn().mockResolvedValue(Buffer.from('mock-tx-data'))
  }))
}));

jest.mock('@mysten/sui/utils', () => ({
  fromB64: jest.fn(),
  toB64: jest.fn()
}));

jest.mock('@hashgraph/sdk', () => ({
  Client: {
    forTestnet: jest.fn().mockReturnValue({
      setOperator: jest.fn().mockReturnThis(),
      close: jest.fn()
    })
  },
  AccountId: {
    fromString: jest.fn().mockImplementation((str) => ({ toString: () => str }))
  },
  PrivateKey: {
    fromString: jest.fn().mockImplementation(() => ({
      publicKey: { toString: () => 'mock-public-key' }
    }))
  },
  TokenCreateTransaction: jest.fn().mockImplementation(() => ({
    setTokenName: jest.fn().mockReturnThis(),
    setTokenSymbol: jest.fn().mockReturnThis(),
    setDecimals: jest.fn().mockReturnThis(),
    setInitialSupply: jest.fn().mockReturnThis(),
    setTreasuryAccountId: jest.fn().mockReturnThis(),
    setAdminKey: jest.fn().mockReturnThis(),
    // @ts-ignore
    execute: jest.fn().mockResolvedValue({
      // @ts-ignore
      getReceipt: jest.fn().mockResolvedValue({ tokenId: { toString: () => 'mock-token-id' } })
    })
  } as any)),
  TransferTransaction: jest.fn().mockImplementation(() => ({
    addHbarTransfer: jest.fn().mockReturnThis(),
    // @ts-ignore
    execute: jest.fn().mockResolvedValue({
      // @ts-ignore
      getReceipt: jest.fn().mockResolvedValue({})
    })
  } as any))
}));

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

// Global test utilities
global.testUtils = {
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  generateTestId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
};

// Increase timeout for integration tests
jest.setTimeout(30000);

// Add global teardown to ensure Redis connections are closed
afterAll(async () => {
  // Give time for all connections to close
  await new Promise(resolve => setTimeout(resolve, 500));
});