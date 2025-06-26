// @ts-nocheck
import { jest } from '@jest/globals';

// Note: Redis configuration is handled in jest-env-setup.js (setupFiles)
// This file only handles Jest-specific setup that runs after environment setup



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
  // Mock Client
  Client: {
    forTestnet: jest.fn().mockReturnValue({
      setOperator: jest.fn().mockReturnThis(),
      close: jest.fn()
    })
  },
  AccountId: {
    fromString: jest.fn().mockImplementation((str: any) => ({ toString: () => str }))
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
    sign: jest.fn().mockResolvedValue({
      execute: jest.fn().mockResolvedValue({
        transactionId: { toString: () => 'mock-tx-id' },
        getReceipt: jest.fn().mockResolvedValue({
          tokenId: { toString: () => 'mock-token-id' }
        })
      })
    })
  } as any)),
  TransferTransaction: jest.fn().mockImplementation(() => {
    const mockTransaction: any = {
      addHbarTransfer: jest.fn().mockReturnValue(mockTransaction),
      addTokenTransfer: jest.fn().mockReturnValue(mockTransaction),
      freezeWith: jest.fn().mockReturnValue(mockTransaction),
      execute: jest.fn().mockResolvedValue({
        transactionId: { toString: () => 'mock-tx-id' },
        getReceipt: (jest.fn() as any).mockResolvedValue({ status: 'SUCCESS' })
      } as any),
      sign: jest.fn().mockResolvedValue({
        execute: jest.fn().mockResolvedValue({
          transactionId: { toString: () => 'mock-tx-id' },
          getReceipt: (jest.fn() as any).mockResolvedValue({ status: 'SUCCESS' })
        })
      })
    };
    return mockTransaction;
  }),
  AccountCreateTransaction: jest.fn().mockImplementation(() => ({
    setKey: jest.fn().mockReturnThis(),
    setInitialBalance: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue({
      execute: jest.fn().mockResolvedValue({
        transactionId: { toString: () => 'mock-tx-id' },
        getReceipt: jest.fn().mockResolvedValue({
          accountId: { toString: () => 'mock-account-id' }
        })
      })
    })
  } as any)),
  AccountBalanceQuery: jest.fn().mockImplementation(() => ({
    setAccountId: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({
      hbars: { toString: () => '100' }
    })
  } as any)),
  AccountInfoQuery: jest.fn().mockImplementation(() => ({
    setAccountId: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({
      key: { toString: () => 'mock-public-key' }
    })
  } as any)),
  TokenAssociateTransaction: jest.fn().mockImplementation(() => ({
    setAccountId: jest.fn().mockReturnThis(),
    setTokenIds: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue({
      execute: (jest.fn() as any).mockResolvedValue({
        transactionId: { toString: () => 'mock-tx-id' },
        getReceipt: (jest.fn() as any).mockResolvedValue({ status: 'SUCCESS' })
      })
    } as any)
  } as any)),
  Hbar: {
    fromTinybars: jest.fn().mockImplementation((amount: any) => ({
      toString: () => amount.toString()
    })),
    fromString: jest.fn().mockImplementation((str: any) => ({ toString: () => str }))
  },
  TransactionReceiptQuery: jest.fn().mockImplementation(() => ({
    setTransactionId: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({
      status: 'SUCCESS'
    })
  } as any)),
  TransactionId: {
    fromString: jest.fn((id) => ({ toString: () => id }))
  },
  Status: {
    Success: 'SUCCESS'
  },
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
    sign: jest.fn().mockResolvedValue({
      execute: (jest.fn() as any).mockResolvedValue({
        transactionId: { toString: () => 'mock-tx-id' },
        getReceipt: (jest.fn() as any).mockResolvedValue({ status: 'SUCCESS' })
      })
    } as any)
  })),
  TokenUnfreezeTransaction: jest.fn().mockImplementation(() => ({
    setAccountId: jest.fn().mockReturnThis(),
    setTokenId: jest.fn().mockReturnThis(),
    freezeWith: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue({
      execute: (jest.fn() as any).mockResolvedValue({
        transactionId: { toString: () => 'mock-tx-id' },
        getReceipt: (jest.fn() as any).mockResolvedValue({ status: 'SUCCESS' })
      })
    } as any)
  })),
  AccountStakeToAccountTransaction: jest.fn().mockImplementation(() => ({
    setAccountId: jest.fn().mockReturnThis(),
    setStakedAccountId: jest.fn().mockReturnThis(),
    freezeWith: jest.fn().mockReturnThis(),
    sign: (jest.fn() as any).mockResolvedValue({
      execute: (jest.fn() as any).mockResolvedValue({
        transactionId: { toString: () => 'mock-tx-id' },
        getReceipt: (jest.fn() as any).mockResolvedValue({ status: 'SUCCESS' })
      })
    })
  }))
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