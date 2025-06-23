"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const redis_1 = require("redis");
// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.TEST_REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379';
process.env.ROUTER_ID = 'test-router';
process.env.PORT = '0'; // Use random port for tests
// Set global test timeout
globals_1.jest.setTimeout(10000);
// Wait for Redis to be ready before running tests
beforeAll(async () => {
    const maxRetries = 10;
    let retries = 0;
    while (retries < maxRetries) {
        try {
            const client = (0, redis_1.createClient)({ url: process.env.TEST_REDIS_URL });
            await client.connect();
            await client.ping();
            await client.quit();
            console.log('Redis connection verified successfully');
            break;
        }
        catch (error) {
            retries++;
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(`Redis connection attempt ${retries}/${maxRetries} failed:`, errorMessage);
            if (retries === maxRetries) {
                throw new Error(`Redis not ready after ${maxRetries} attempts: ${errorMessage}`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
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
// Global teardown
afterAll(async () => {
    // Give time for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
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
        // @ts-ignore
        build: globals_1.jest.fn().mockResolvedValue(Buffer.from('mock-tx-data'))
    }))
}));
globals_1.jest.mock('@mysten/sui/utils', () => ({
    fromB64: globals_1.jest.fn(),
    toB64: globals_1.jest.fn()
}));
globals_1.jest.mock('@hashgraph/sdk', () => ({
    Client: {
        forTestnet: globals_1.jest.fn().mockReturnValue({
            setOperator: globals_1.jest.fn().mockReturnThis(),
            close: globals_1.jest.fn()
        }),
        forMainnet: globals_1.jest.fn().mockReturnValue({
            setOperator: globals_1.jest.fn().mockReturnThis(),
            close: globals_1.jest.fn()
        }),
        forPreviewnet: globals_1.jest.fn().mockReturnValue({
            setOperator: globals_1.jest.fn().mockReturnThis(),
            close: globals_1.jest.fn()
        })
    },
    AccountId: {
        fromString: globals_1.jest.fn().mockImplementation((str) => ({ toString: () => str }))
    },
    PrivateKey: {
        fromString: globals_1.jest.fn().mockImplementation(() => ({
            publicKey: { toString: () => 'mock-public-key' }
        }))
    },
    TokenCreateTransaction: globals_1.jest.fn().mockImplementation(() => ({
        setTokenName: globals_1.jest.fn().mockReturnThis(),
        setTokenSymbol: globals_1.jest.fn().mockReturnThis(),
        setDecimals: globals_1.jest.fn().mockReturnThis(),
        setInitialSupply: globals_1.jest.fn().mockReturnThis(),
        setTreasuryAccountId: globals_1.jest.fn().mockReturnThis(),
        setSupplyType: globals_1.jest.fn().mockReturnThis(),
        setMaxSupply: globals_1.jest.fn().mockReturnThis(),
        setTokenType: globals_1.jest.fn().mockReturnThis(),
        setAdminKey: globals_1.jest.fn().mockReturnThis(),
        setSupplyKey: globals_1.jest.fn().mockReturnThis(),
        setFreezeKey: globals_1.jest.fn().mockReturnThis(),
        setWipeKey: globals_1.jest.fn().mockReturnThis(),
        setTokenMemo: globals_1.jest.fn().mockReturnThis(),
        freezeWith: globals_1.jest.fn().mockReturnThis(),
        sign: globals_1.jest.fn().mockResolvedValue({
            execute: globals_1.jest.fn().mockResolvedValue({
                transactionId: { toString: () => 'mock-tx-id' },
                getReceipt: globals_1.jest.fn().mockResolvedValue({
                    status: 'SUCCESS',
                    tokenId: { toString: () => '0.0.999999' }
                })
            })
        })
    })),
    TransferTransaction: globals_1.jest.fn().mockImplementation(() => ({
        addHbarTransfer: globals_1.jest.fn().mockReturnThis(),
        addTokenTransfer: globals_1.jest.fn().mockReturnThis(),
        freezeWith: globals_1.jest.fn().mockReturnThis(),
        sign: globals_1.jest.fn().mockResolvedValue({
            execute: globals_1.jest.fn().mockResolvedValue({
                transactionId: { toString: () => 'mock-tx-id' },
                getReceipt: globals_1.jest.fn().mockResolvedValue({ status: 'SUCCESS' })
            })
        })
    })),
    TokenSupplyType: {
        Finite: 'FINITE',
        Infinite: 'INFINITE'
    },
    TokenType: {
        FungibleCommon: 'FUNGIBLE_COMMON',
        NonFungibleUnique: 'NON_FUNGIBLE_UNIQUE'
    },
    Hbar: {
        fromTinybars: globals_1.jest.fn((amount) => ({
            toTinybars: () => ({ toString: () => amount.toString() })
        })),
        from: globals_1.jest.fn((amount) => ({
            toTinybars: () => ({ toString: () => amount.toString() })
        }))
    },
    TransactionId: {
        fromString: globals_1.jest.fn((id) => ({ toString: () => id }))
    },
    Status: {
        Success: 'SUCCESS'
    },
    AccountCreateTransaction: globals_1.jest.fn(() => ({
        setKey: globals_1.jest.fn().mockReturnThis(),
        setInitialBalance: globals_1.jest.fn().mockReturnThis(),
        freezeWith: globals_1.jest.fn().mockReturnThis(),
        sign: globals_1.jest.fn().mockResolvedValue({
            execute: globals_1.jest.fn().mockResolvedValue({
                transactionId: { toString: () => 'mock-tx-id' },
                getReceipt: globals_1.jest.fn().mockResolvedValue({
                    status: 'SUCCESS',
                    accountId: { toString: () => '0.0.888888' }
                })
            })
        })
    })),
    TransactionReceiptQuery: globals_1.jest.fn(() => ({
        setTransactionId: globals_1.jest.fn().mockReturnThis(),
        execute: globals_1.jest.fn().mockResolvedValue({
            status: 'SUCCESS'
        })
    })),
    AccountBalanceQuery: globals_1.jest.fn(() => ({
        setAccountId: globals_1.jest.fn().mockReturnThis(),
        execute: globals_1.jest.fn().mockResolvedValue({
            hbars: { toTinybars: () => ({ toString: () => '1000000' }) },
            tokens: new Map()
        })
    })),
    TokenAssociateTransaction: globals_1.jest.fn(() => ({
        setAccountId: globals_1.jest.fn().mockReturnThis(),
        setTokenIds: globals_1.jest.fn().mockReturnThis(),
        freezeWith: globals_1.jest.fn().mockReturnThis(),
        sign: globals_1.jest.fn().mockResolvedValue({
            execute: globals_1.jest.fn().mockResolvedValue({
                transactionId: { toString: () => 'mock-tx-id' },
                getReceipt: globals_1.jest.fn().mockResolvedValue({ status: 'SUCCESS' })
            })
        })
    }))
}));
// Mock jsonwebtoken
globals_1.jest.mock('jsonwebtoken', () => ({
    sign: globals_1.jest.fn().mockReturnValue('mock-jwt-token'),
    verify: globals_1.jest.fn().mockImplementation((token) => {
        if (token === 'valid-token' || token === 'valid.jwt.token') {
            return { routerId: 'test-router', permissions: ['transfer'] };
        }
        throw new Error('Invalid token');
    })
}));
// Global test utilities
global.testUtils = {
    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    generateTestId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
};
// Increase timeout for integration tests
globals_1.jest.setTimeout(30000);
// Add global teardown to ensure Redis connections are closed
afterAll(async () => {
    // Give time for all connections to close
    await new Promise(resolve => setTimeout(resolve, 500));
});
//# sourceMappingURL=setup.js.map