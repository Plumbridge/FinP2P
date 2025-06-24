Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.TEST_REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379';
process.env.ROUTER_ID = 'test-router';
process.env.PORT = '0'; // Use random port for tests

// Set global test timeout
globals_1.jest.setTimeout(30000);

// Mock console methods to reduce test output noise
console.log = jest.fn();
console.debug = jest.fn();
console.info = jest.fn();
console.warn = jest.fn();
console.error = jest.fn();

// Ensure unhandled promise rejections fail tests
process.on('unhandledRejection', (err) => {
  throw err;
});

// Global cleanup to prevent hanging tests
afterEach(async () => {
  // Clear all timers and intervals
  globals_1.jest.clearAllTimers();
  globals_1.jest.clearAllMocks();
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

// Global teardown - consolidated
afterAll(async () => {
  // Clear any remaining timers
  globals_1.jest.clearAllTimers();
  
  // Give time for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Force close any remaining handles
  if (process.env.NODE_ENV === 'test') {
    // Additional cleanup for test environment
    await new Promise(resolve => setTimeout(resolve, 500));
  }
});

// Remove all Redis mocks - we're using real Redis now
// DO NOT mock redis or ioredis

// Keep other mocks for external services
globals_1.jest.mock('@mysten/sui/client', () => ({
    SuiClient: globals_1.jest.fn().mockImplementation(() => ({
        // @ts-ignore
        getCoins: globals_1.jest.fn().mockResolvedValue({ data: [] }),
        // @ts-ignore
        getBalance: globals_1.jest.fn().mockResolvedValue({ totalBalance: '0' }),
        // @ts-ignore
        dryRunTransactionBlock: globals_1.jest.fn().mockResolvedValue({ effects: { status: { status: 'success' } } }),
        // @ts-ignore
        executeTransactionBlock: globals_1.jest.fn().mockResolvedValue({ digest: 'mock-tx-hash' })
    })),
    getFullnodeUrl: globals_1.jest.fn().mockReturnValue('https://fullnode.testnet.sui.io')
}));

globals_1.jest.mock('@mysten/sui/keypairs/ed25519', () => ({
    Ed25519Keypair: globals_1.jest.fn().mockImplementation(() => ({
        getPublicKey: globals_1.jest.fn().mockReturnValue({ toBase64: () => 'mock-public-key' }),
        signData: globals_1.jest.fn().mockReturnValue(Buffer.from('mock-signature'))
    }))
}));

globals_1.jest.mock('@mysten/sui/transactions', () => ({
    Transaction: globals_1.jest.fn().mockImplementation(() => ({
        object: globals_1.jest.fn().mockReturnValue({ kind: 'Input', index: 0, type: 'object' }),
        pure: globals_1.jest.fn().mockReturnValue({ kind: 'Input', index: 1, type: 'pure' }),
        moveCall: globals_1.jest.fn().mockReturnValue({ kind: 'TransactionBlock', index: 0 }),
        transferObjects: globals_1.jest.fn(),
        setGasBudget: globals_1.jest.fn(),
        setSender: globals_1.jest.fn(),
        build: globals_1.jest.fn().mockResolvedValue({ kind: 'TransactionBlock' })
    }))
}));

// Additional mocks can be added here as needed