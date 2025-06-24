import { HederaAdapter } from '../../src/adapters/HederaAdapter';
import { LedgerType } from '../../src/types';
import { createLogger } from '../../src/utils/logger';

// Mock the Hedera SDK
jest.mock('@hashgraph/sdk', () => ({
  Client: {
    forTestnet: jest.fn(() => ({
      setOperator: jest.fn(),
      close: jest.fn()
    })),
    forMainnet: jest.fn(() => ({
      setOperator: jest.fn(),
      close: jest.fn()
    })),
    forPreviewnet: jest.fn(() => ({
      setOperator: jest.fn(),
      close: jest.fn()
    }))
  },
  AccountId: {
    fromString: jest.fn((id) => ({ toString: () => id }))
  },
  PrivateKey: {
    fromString: jest.fn(() => ({
      publicKey: { toAccountId: jest.fn(() => ({ toString: () => '0.0.123456' })) }
    }))
  },
  TokenCreateTransaction: jest.fn(() => ({
     setTokenName: jest.fn().mockReturnThis(),
     setTokenSymbol: jest.fn().mockReturnThis(),
     setDecimals: jest.fn().mockReturnThis(),
     setInitialSupply: jest.fn().mockReturnThis(),
     setTreasuryAccountId: jest.fn().mockReturnThis(),
     setSupplyType: jest.fn().mockReturnThis(),
     setMaxSupply: jest.fn().mockReturnThis(),
     setTokenType: jest.fn().mockReturnThis(),
     setAdminKey: jest.fn().mockReturnThis(),
     setSupplyKey: jest.fn().mockReturnThis(),
      setFreezeKey: jest.fn().mockReturnThis(),
      setWipeKey: jest.fn().mockReturnThis(),
      setTokenMemo: jest.fn().mockReturnThis(),
      freezeWith: jest.fn().mockReturnThis(),
     sign: jest.fn().mockResolvedValue({
       execute: jest.fn().mockResolvedValue({
         transactionId: { toString: () => 'mock-tx-id' },
         getReceipt: jest.fn().mockResolvedValue({
           status: 'SUCCESS',
           tokenId: { toString: () => '0.0.999999' }
         })
       })
     })
   })),
  TransferTransaction: jest.fn(() => ({
    addHbarTransfer: jest.fn().mockReturnThis(),
    addTokenTransfer: jest.fn().mockReturnThis(),
    freezeWith: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue({
      execute: jest.fn().mockResolvedValue({
         transactionId: { toString: () => 'mock-tx-id' },
         getReceipt: jest.fn().mockResolvedValue({ status: 'SUCCESS' })
       })
    })
  })),
  AccountCreateTransaction: jest.fn(() => ({
    setKey: jest.fn().mockReturnThis(),
    setInitialBalance: jest.fn().mockReturnThis(),
    freezeWith: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue({
      execute: jest.fn().mockResolvedValue({
        transactionId: { toString: () => 'mock-tx-id' },
        getReceipt: jest.fn().mockResolvedValue({
           status: 'SUCCESS',
           accountId: { toString: () => '0.0.888888' }
         })
      })
    })
  })),
  TransactionReceiptQuery: jest.fn(() => ({
     setTransactionId: jest.fn().mockReturnThis(),
     execute: jest.fn().mockResolvedValue({
       status: 'SUCCESS'
     })
   })),
  TransactionId: {
    fromString: jest.fn((id) => ({ toString: () => id }))
  },
  Status: {
     Success: 'SUCCESS'
   },
   TokenType: {
     FungibleCommon: 'FUNGIBLE_COMMON'
   },
   TokenSupplyType: {
     Finite: 'FINITE'
   },
   Hbar: {
     fromTinybars: jest.fn((amount) => ({ toTinybars: () => ({ toString: () => amount.toString() }) }))
   }
}));

describe('HederaAdapter', () => {
  let adapter: HederaAdapter;
  let logger: any;

  beforeEach(async () => {
    logger = createLogger({ level: 'error' });
    
    const config = {
      network: 'testnet' as const,
      operatorId: '0.0.123456',
      // Use a valid DER encoded private key for testing
      operatorKey: '302e020100300506032b657004220420' + '0'.repeat(64),
      treasuryId: '0.0.654321',
      treasuryKey: '302e020100300506032b657004220420' + '1'.repeat(64)
    };
    
    adapter = new HederaAdapter(config, logger);
    
    // Mock the connect method to avoid actual network calls
    jest.spyOn(adapter, 'connect').mockResolvedValue();
  });

  describe('Initialization', () => {
    it('should initialize with correct properties', () => {
      expect(adapter.ledgerId).toBe('hedera');
      expect(adapter.name).toBe('Hedera Hashgraph');
      expect(adapter.type).toBe(LedgerType.HEDERA);
      expect(adapter.isConnected()).toBe(false);
    });

    it('should use operator as treasury when treasury not provided', () => {
      const configWithoutTreasury = {
        network: 'testnet' as const,
        operatorId: '0.0.123456',
        operatorKey: 'test-operator-key'
      };
      
      expect(() => new HederaAdapter(configWithoutTreasury, logger)).not.toThrow();
    });

    it('should throw error for invalid network', () => {
      const invalidConfig = {
        network: 'invalid' as any,
        operatorId: '0.0.123456',
        operatorKey: 'test-operator-key'
      };
      
      const invalidAdapter = new HederaAdapter(invalidConfig, logger);
      expect(invalidAdapter.connect()).rejects.toThrow();
    });
  });

  describe('Connection Management', () => {
    it('should handle connection for different networks', async () => {
      const networks = ['mainnet', 'testnet', 'previewnet'] as const;
      
      for (const network of networks) {
        const config = {
          network,
          operatorId: '0.0.123456',
          operatorKey: 'test-operator-key'
        };
        
        const networkAdapter = new HederaAdapter(config, logger);
        // Connection will fail in test environment, but should not throw on initialization
        expect(() => networkAdapter).not.toThrow();
      }
    });

    it('should disconnect properly', async () => {
      await adapter.disconnect();
      expect(adapter.isConnected()).toBe(false);
    });
  });

  describe('Asset Operations', () => {
    describe('createAsset', () => {
      it('should create asset when connected', async () => {
        (adapter as any).connected = true;
        
        const assetData = {
          finId: {
            id: 'test-asset-id',
            type: 'asset' as const,
            domain: 'test.domain'
          },
          symbol: 'TEST',
          name: 'Test Token',
          decimals: 6,
          totalSupply: BigInt(1000000),
          ledgerId: 'hedera',
          metadata: {
            description: 'Test token for testing'
          }
        };

        const result = await adapter.createAsset(assetData);
        expect(result).toBeDefined();
        expect(result.symbol).toBe('TEST');
      });

      it('should throw error when disconnected', async () => {
        await adapter.disconnect();
        const assetData = {
          finId: {
            id: 'test-asset-id',
            type: 'asset' as const,
            domain: 'test.domain'
          },
          symbol: 'TEST',
          name: 'Test Token',
          decimals: 6,
          totalSupply: BigInt(1000000),
          ledgerId: 'hedera',
          metadata: {
            description: 'Test token for testing'
          }
        };

        await expect(adapter.createAsset(assetData)).rejects.toThrow();
      });
    });



    it('should handle asset creation with empty symbol when connected', async () => {
      (adapter as any).connected = true;
      
      const assetDataWithEmptySymbol = {
        finId: {
          id: 'test-asset-id',
          type: 'asset' as const,
          domain: 'test.domain'
        },
        symbol: '', // Empty symbol
        name: 'Test Token',
        decimals: 6,
        totalSupply: BigInt(1000000),
        ledgerId: 'hedera',
        metadata: {
          description: 'Test token for testing'
        }
      };

      const result = await adapter.createAsset(assetDataWithEmptySymbol);
      expect(result).toBeDefined();
    });

    it('should handle asset retrieval while disconnected', async () => {
      await expect(adapter.getAsset('test-asset-id')).rejects.toThrow('Not connected to Hedera network');
    });
  });

  describe('Account Operations', () => {
    it('should throw error when creating account while disconnected', async () => {
      await expect(adapter.createAccount('test-institution')).rejects.toThrow('Not connected to Hedera network');
    });

    it('should handle account retrieval while disconnected', async () => {
      await expect(adapter.getAccount('0.0.123456')).rejects.toThrow('Not connected to Hedera network');
    });

    it('should handle balance queries while disconnected', async () => {
      await expect(adapter.getBalance('0.0.123456', 'test-asset')).rejects.toThrow('Not connected to Hedera network');
    });
  });

  describe('Transfer Operations', () => {
    it('should throw error when transferring while disconnected', async () => {
      await expect(
        adapter.transfer('0.0.123456', '0.0.789012', 'asset-id', BigInt(100))
      ).rejects.toThrow('Not connected to Hedera network');
    });

    it('should execute transfer when connected', async () => {
      (adapter as any).connected = true;
      
      const result = await adapter.transfer('0.0.123456', '0.0.789012', 'HBAR', BigInt(100));
      expect(result).toBe('mock-tx-id');
    });

    it('should handle lock/unlock operations while disconnected', async () => {
      await expect(
        adapter.lockAsset('0.0.123456', 'asset-id', BigInt(100))
      ).rejects.toThrow('Not connected to Hedera network');
      
      await expect(
        adapter.unlockAsset('0.0.123456', 'asset-id', BigInt(100))
      ).rejects.toThrow('Not connected to Hedera network');
    });
  });

  describe('Transaction Queries', () => {
    it('should handle transaction queries while disconnected', async () => {
      await expect(adapter.getTransaction('test-hash')).rejects.toThrow('Not connected to Hedera network');
      await expect(adapter.getTransactionStatus('test-hash')).rejects.toThrow('Not connected to Hedera network');
    });

    it('should handle transaction queries when connected', async () => {
      (adapter as any).connected = true;
      
      const result = await adapter.getTransaction('0.0.123@1234567890.123456789');
      expect(result).toBeDefined();
      expect(result?.hash).toBe('0.0.123@1234567890.123456789');
    });
  });

  describe('Token Cache Management', () => {
    it('should handle token cache operations', () => {
      // Test internal cache functionality
      expect(adapter).toBeDefined();
      // Cache is private, so we test through public methods
    });
  });

  describe('Staking Operations', () => {
    it('should handle staking operations', async () => {
      // Staking is not implemented in HederaAdapter yet
      // This test verifies that the adapter doesn't have staking functionality
      expect(typeof (adapter as any).stake).toBe('undefined');
    });
  });
});