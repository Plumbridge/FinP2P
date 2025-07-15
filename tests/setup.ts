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

jest.mock('@mysten/sui/utils', () => ({
  fromB64: jest.fn(),
  toB64: jest.fn()
}));

jest.mock('@hashgraph/sdk', () => {
  const Status = {
    Success: { toString: () => 'SUCCESS' }
  };
  
  return {
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
    sign: jest.fn(() => Promise.resolve({
      execute: jest.fn(() => Promise.resolve({
        transactionId: { toString: () => 'mock-tx-id' },
        getReceipt: jest.fn(() => Promise.resolve({
          status: Status.Success,
          tokenId: { toString: () => '0.0.999999' }
        }))
      }))
    }))
  })),
  TransferTransaction: jest.fn().mockImplementation(() => {
    const mockTransaction: any = {
      addHbarTransfer: jest.fn(),
      addTokenTransfer: jest.fn(),
      freezeWith: jest.fn(),
      execute: jest.fn(() => Promise.resolve({
        transactionId: { toString: () => 'mock-tx-id' },
        getReceipt: jest.fn(() => Promise.resolve({ status: Status.Success }))
      })),
      sign: jest.fn(() => Promise.resolve({
        execute: jest.fn(() => Promise.resolve({
          transactionId: { toString: () => 'mock-tx-id' },
          getReceipt: jest.fn(() => Promise.resolve({ status: Status.Success }))
        }))
      }))
    };
    // Set up method chaining
    mockTransaction.addHbarTransfer.mockReturnValue(mockTransaction);
    mockTransaction.addTokenTransfer.mockReturnValue(mockTransaction);
    mockTransaction.freezeWith.mockReturnValue(mockTransaction);
    return mockTransaction;
  }),
  AccountCreateTransaction: jest.fn().mockImplementation(() => ({
    setKey: jest.fn().mockReturnThis(),
    setInitialBalance: jest.fn().mockReturnThis(),
    sign: jest.fn(() => Promise.resolve({
      execute: jest.fn(() => Promise.resolve({
        transactionId: { toString: () => 'mock-tx-id' },
        getReceipt: jest.fn(() => Promise.resolve({
          status: Status.Success,
          accountId: { toString: () => '0.0.888888' }
        }))
      }))
    }))
  })),
  AccountBalanceQuery: jest.fn().mockImplementation(() => ({
    setAccountId: jest.fn().mockReturnThis(),
    execute: jest.fn(() => Promise.resolve({
      status: Status.Success
    }))
  })),
  AccountInfoQuery: jest.fn().mockImplementation(() => ({
    setAccountId: jest.fn().mockReturnThis(),
    execute: jest.fn(() => Promise.resolve({
      hbars: { toTinybars: () => ({ toString: () => '1000000' }) },
      tokens: new Map()
    }))
  })),
  TokenAssociateTransaction: jest.fn().mockImplementation(() => ({
    setAccountId: jest.fn().mockReturnThis(),
    setTokenIds: jest.fn().mockReturnThis(),
    sign: jest.fn(() => Promise.resolve({
      execute: jest.fn(() => Promise.resolve({
        transactionId: { toString: () => 'mock-tx-id' },
        getReceipt: jest.fn(() => Promise.resolve({ status: Status.Success }))
      }))
    }))
  })),
  Hbar: {
    fromTinybars: jest.fn().mockImplementation((amount: any) => ({
      toTinybars: () => ({ toString: () => String(amount) })
    }))
  },
  TokenId: {
    fromString: jest.fn().mockImplementation((str) => ({ toString: () => str }))
  },
  TransactionReceiptQuery: jest.fn().mockImplementation(() => ({
    setTransactionId: jest.fn().mockReturnThis(),
    execute: jest.fn(() => Promise.resolve({
      status: Status.Success,
      accountId: { toString: () => '0.0.888888' },
      tokenId: { toString: () => '0.0.999999' }
    }))
  })),
  TransactionId: {
    fromString: jest.fn((id) => ({ toString: () => id }))
  },
  Status,
  TokenType: {
    FungibleCommon: 'FUNGIBLE_COMMON',
    NonFungibleUnique: 'NON_FUNGIBLE_UNIQUE'
  },
  TokenSupplyType: {
    Infinite: 'INFINITE',
    Finite: 'FINITE'
  },
  TokenFreezeTransaction: jest.fn().mockImplementation(() => ({
    setAccountId: jest.fn().mockReturnThis(),
    setTokenId: jest.fn().mockReturnThis(),
    freezeWith: jest.fn().mockReturnThis(),
    sign: jest.fn(() => Promise.resolve({
      execute: jest.fn(() => Promise.resolve({
        transactionId: { toString: () => 'mock-tx-id' },
        getReceipt: jest.fn(() => Promise.resolve({ status: Status.Success }))
      }))
    }))
  })),
  TokenUnfreezeTransaction: jest.fn().mockImplementation(() => ({
    setAccountId: jest.fn().mockReturnThis(),
    setTokenId: jest.fn().mockReturnThis(),
    freezeWith: jest.fn().mockReturnThis(),
    sign: jest.fn(() => Promise.resolve({
      execute: jest.fn(() => Promise.resolve({
        transactionId: { toString: () => 'mock-tx-id' },
        getReceipt: jest.fn(() => Promise.resolve({ status: Status.Success }))
      }))
    }))
  })),
  AccountStakeToAccountTransaction: jest.fn().mockImplementation(() => ({
    setAccountId: jest.fn().mockReturnThis(),
    setStakedAccountId: jest.fn().mockReturnThis(),
    freezeWith: jest.fn().mockReturnThis(),
    sign: jest.fn(() => Promise.resolve({
      execute: jest.fn(() => Promise.resolve({
        transactionId: { toString: () => 'mock-tx-id' },
        getReceipt: jest.fn(() => Promise.resolve({ status: Status.Success }))
      }))
    }))
  }))
} as any;
});

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
