import { HederaAdapter } from '../../src/adapters/HederaAdapter';
import { Asset, Account, Transaction, TransactionStatus } from '../../src/types';
import winston from 'winston';

// Mock environment variables
const originalEnv = process.env;
beforeAll(() => {
  process.env = {
    ...originalEnv,
    HEDERA_OPERATOR_ID: '0.0.123',
    HEDERA_OPERATOR_KEY: '302e020100300506032b6570042204200000000000000000000000000000000000000000000000000000000000000000',
    HEDERA_TREASURY_ID: '0.0.456',
    HEDERA_TREASURY_KEY: '302e020100300506032b6570042204200000000000000000000000000000000000000000000000000000000000000001'
  };
});

afterAll(() => {
  process.env = originalEnv;
});

// Mock the Hedera SDK to avoid network calls
jest.mock('@hashgraph/sdk', () => {
  const mockClient = {
    setOperator: jest.fn().mockReturnThis(),
    setRequestTimeout: jest.fn().mockReturnThis(),
    setMaxAttempts: jest.fn().mockReturnThis(),
    close: jest.fn()
  };

  const mockAccountId = {
    toString: () => '0.0.123'
  };

  const mockTokenId = {
    toString: () => '0.0.456'
  };

  const mockPrivateKey = {
    publicKey: {
      toString: () => 'mock-public-key'
    }
  };

  const mockBalance = {
    hbars: {
      toString: () => '100 ℏ'
    }
  };

  const mockReceipt = {
    status: { toString: () => 'SUCCESS' },
    tokenId: mockTokenId,
    topicId: mockTokenId,
    transactionId: '0.0.123@1234567890.123456789'
  };

  const mockTransactionResponse = {
    transactionId: '0.0.123@1234567890.123456789',
    getReceipt: jest.fn().mockResolvedValue(mockReceipt)
  };

  return {
    Client: {
      forTestnet: jest.fn(() => mockClient)
    },
    AccountId: {
      fromString: jest.fn(() => mockAccountId)
    },
    PrivateKey: {
      fromString: jest.fn(() => mockPrivateKey)
    },
    AccountBalanceQuery: jest.fn().mockImplementation(() => ({
      setAccountId: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(mockBalance)
    })),
    TokenCreateTransaction: jest.fn().mockImplementation(() => ({
      setTokenName: jest.fn().mockReturnThis(),
      setTokenSymbol: jest.fn().mockReturnThis(),
      setDecimals: jest.fn().mockReturnThis(),
      setInitialSupply: jest.fn().mockReturnThis(),
      setTreasuryAccountId: jest.fn().mockReturnThis(),
      setSupplyType: jest.fn().mockReturnThis(),
      setMaxSupply: jest.fn().mockReturnThis(),
      setTokenType: jest.fn().mockReturnThis(),
      setSupplyKey: jest.fn().mockReturnThis(),
      setAdminKey: jest.fn().mockReturnThis(),
      setFreezeKey: jest.fn().mockReturnThis(),
      setWipeKey: jest.fn().mockReturnThis(),
      setTokenMemo: jest.fn().mockReturnThis(),
      freezeWith: jest.fn().mockReturnThis(),
      sign: jest.fn().mockResolvedValue({
        execute: jest.fn().mockResolvedValue(mockTransactionResponse)
      })
    })),
    TopicCreateTransaction: jest.fn().mockImplementation(() => ({
      setAdminKey: jest.fn().mockReturnThis(),
      freezeWith: jest.fn().mockReturnThis(),
      sign: jest.fn().mockResolvedValue({
        execute: jest.fn().mockResolvedValue(mockTransactionResponse)
      })
    })),
    TransferTransaction: jest.fn().mockImplementation(() => ({
      addHbarTransfer: jest.fn().mockReturnThis(),
      freezeWith: jest.fn().mockReturnThis(),
      sign: jest.fn().mockResolvedValue({
        execute: jest.fn().mockResolvedValue(mockTransactionResponse)
      })
    })),
    TokenSupplyType: {
      Finite: 'FINITE'
    },
    TokenType: {
      FungibleCommon: 'FUNGIBLE_COMMON'
    },
    Status: {
      Success: 'SUCCESS'
    },
    Hbar: {
      fromTinybars: jest.fn((amount) => ({ toTinybars: () => amount }))
    }
  };
});

describe('HederaAdapter (Mocked)', () => {
  let adapter: HederaAdapter;
  let logger: winston.Logger;

  // Use valid DER encoded test keys
  const TEST_PRIVATE_KEY = '302e020100300506032b6570042204200000000000000000000000000000000000000000000000000000000000000000';
  const TEST_TREASURY_KEY = '302e020100300506032b6570042204200000000000000000000000000000000000000000000000000000000000000001';

  const TEST_CONFIG = {
    network: 'testnet' as const,
    operatorId: '0.0.123',
    operatorKey: TEST_PRIVATE_KEY,
    treasuryId: '0.0.456',
    treasuryKey: TEST_TREASURY_KEY
  };

  beforeEach(() => {
    logger = winston.createLogger({
      level: 'error',
      transports: [new winston.transports.Console({ silent: true })]
    });
    adapter = new HederaAdapter(TEST_CONFIG, logger);
  });

  afterEach(async () => {
    if (adapter.isConnected()) {
      await adapter.disconnect();
    }
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(adapter).toBeDefined();
      expect(adapter.isConnected()).toBe(false);
    });
  });

  describe('Connection Management', () => {
    it('should connect successfully', async () => {
      await adapter.connect();
      expect(adapter.isConnected()).toBe(true);
    });

    it('should disconnect successfully', async () => {
      await adapter.connect();
      await adapter.disconnect();
      expect(adapter.isConnected()).toBe(false);
    });
  });

  describe('Asset Operations', () => {
    it('should create asset when connected', async () => {
      await adapter.connect();
      
      const assetData = {
        finId: {
          id: 'test-asset-id',
          type: 'asset' as const,
          domain: 'hedera.com'
        },
        symbol: 'TEST',
        name: 'Test Token',
        decimals: 8,
        totalSupply: BigInt(1000000),
        ledgerId: 'hedera-testnet',
        contractAddress: '0.0.456',
        metadata: { description: 'Test token for testing' }
      };

      const asset = await adapter.createAsset(assetData);
      expect(asset).toBeDefined();
      expect(asset.symbol).toBe('TEST');
      expect(asset.name).toBe('Test Token');
      expect(typeof asset.id).toBe('string');
      
      await adapter.disconnect();
    });

    it('should throw error when creating asset while disconnected', async () => {
      const assetData = {
        finId: {
          id: 'test-asset-id-2',
          type: 'asset' as const,
          domain: 'hedera.com'
        },
        symbol: 'TEST',
        name: 'Test Token',
        decimals: 8,
        totalSupply: BigInt(1000000),
        ledgerId: 'hedera-testnet',
        contractAddress: '0.0.456',
        metadata: { description: 'Test token for testing' }
      };

      await expect(adapter.createAsset(assetData)).rejects.toThrow('Not connected to Hedera network');
    });
  });

  describe('Account Operations', () => {
    it('should create account', async () => {
      const institutionId = 'test-institution';

      // Mock the AccountCreateTransaction
      const mockAccountCreateTransaction = {
        setKey: jest.fn().mockReturnThis(),
        setInitialBalance: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          getReceipt: jest.fn().mockResolvedValue({
            status: 'SUCCESS',
            accountId: { toString: () => '0.0.789' }
          })
        })
      };

      jest.spyOn(adapter, 'createAccount').mockImplementation(async (id: string) => {
        return {
            finId: { id: '0.0.789', type: 'account', domain: 'hedera' },
            address: '0.0.789',
            institutionId: id,
            balances: new Map<string, bigint>(),
            createdAt: new Date(),
            updatedAt: new Date(),
            ledgerId: 'hedera',
          };
      });

      const account = await adapter.createAccount(institutionId);
      expect(account).toBeDefined();
      expect(account.address).toBe('0.0.789');
      expect(account.institutionId).toBe(institutionId);
    });

    it('should get account', async () => {
      const account = await adapter.getAccount('0.0.789');
      expect(account).toBeDefined();
      expect(account).not.toBeNull();
      expect(account!.address).toBe('0.0.789');
    });
  });

  describe('Transfer Operations', () => {
    it('should execute transfer when connected', async () => {
      await adapter.connect();
      
      const result = await adapter.transfer('0.0.123', '0.0.456', 'HBAR', BigInt(100));
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      
      await adapter.disconnect();
    });

    it('should throw error when transferring while disconnected', async () => {
      await expect(
        adapter.transfer('0.0.123', '0.0.456', 'HBAR', BigInt(100))
      ).rejects.toThrow('Not connected to Hedera network');
    });
  });

  describe('Transaction Queries', () => {
    it('should get transaction when connected', async () => {
      await adapter.connect();
      
      const result = await adapter.getTransaction('0.0.123@1234567890.123456789');
      expect(result).toBeDefined();
      expect(result!.hash).toBe('0.0.123@1234567890.123456789');
      
      await adapter.disconnect();
    });

    it('should return null when getting transaction while disconnected', async () => {
      const result = await adapter.getTransaction('0.0.123@1234567890.123456789');
      expect(result).toBeNull();
    });
  });
});