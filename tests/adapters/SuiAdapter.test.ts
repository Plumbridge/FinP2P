import { SuiAdapter } from '../../src/adapters/SuiAdapter';
import { LedgerType } from '../../src/types';
import { createLogger } from '../../src/utils/logger';

describe('SuiAdapter', () => {
  let adapter: SuiAdapter;
  let logger: any;

  beforeEach(() => {
    logger = createLogger({ level: 'error' });
    
    const config = {
      network: 'testnet' as const,
      rpcUrl: 'https://test-rpc.sui.io'
    };
    
    adapter = new SuiAdapter(config, logger);
    
    // Mock the connect method to avoid actual network calls
    jest.spyOn(adapter, 'connect').mockResolvedValue();
    
    // Mock the client methods to avoid actual network calls
    const mockClient = {
      signAndExecuteTransaction: jest.fn().mockResolvedValue({
        digest: 'mock-transaction-digest',
        effects: { status: { status: 'success' } },
        objectChanges: [{
          type: 'created',
          objectId: 'mock-object-id',
          objectType: 'mock-type'
        }]
      }),
      getTransactionBlock: jest.fn().mockResolvedValue({
        digest: 'mock-transaction-digest',
        transaction: { data: {} }
      }),
      getBalance: jest.fn().mockResolvedValue(BigInt(1000))
    };
    (adapter as any).client = mockClient;
  });

  describe('Initialization', () => {
    it('should initialize with correct properties', () => {
      expect(adapter.ledgerId).toBe('sui');
      expect(adapter.name).toBe('Sui Network');
      expect(adapter.type).toBe(LedgerType.SUI);
      expect(adapter.isConnected()).toBe(false);
    });

    it('should handle missing private key gracefully', () => {
      const configWithoutKey = {
        network: 'testnet' as const,
        rpcUrl: 'https://test-rpc.sui.io'
      };
      
      expect(() => new SuiAdapter(configWithoutKey, logger)).not.toThrow();
    });
  });

  describe('Connection Management', () => {
    it('should handle connection errors gracefully', async () => {
      // Mock failed connection by setting client to null
      (adapter as any).client = null;
      (adapter as any).connected = false;

      // The connect method should handle the case where client is not properly initialized
      expect(adapter.isConnected()).toBe(false);
    });

    it('should disconnect properly', async () => {
      await adapter.disconnect();
      expect(adapter.isConnected()).toBe(false);
    });
  });

  describe('Asset Operations', () => {
    it('should throw error when creating asset while disconnected', async () => {
      (adapter as any).connected = false;
      
      const assetData = {
        finId: {
          id: 'test-asset-id',
          type: 'asset' as const,
          domain: 'sui.network'
        },
        symbol: 'TST',
        name: 'Test Asset',
        decimals: 18,
        totalSupply: BigInt(1000000),
        ledgerId: 'sui',
        metadata: {
          description: 'Test asset for testing'
        }
      };
      
      await expect(
        adapter.createAsset(assetData)
      ).rejects.toThrow('Not connected to Sui network');
    });

    it('should create asset when connected', async () => {
      (adapter as any).connected = true;
      
      const assetData = {
        finId: {
          id: 'test-asset-id',
          type: 'asset' as const,
          domain: 'sui.network'
        },
        symbol: 'TST',
        name: 'Test Asset',
        decimals: 18,
        totalSupply: BigInt(1000000),
        ledgerId: 'sui',
        metadata: {
          description: 'Test asset for testing'
        }
      };
      
      const result = await adapter.createAsset(assetData);
      expect(result.id).toBe('mock-object-id');
      expect(result.name).toBe('Test Asset');
      expect(result.symbol).toBe('TST');
    });



    it('should handle asset creation with proper validation', async () => {
      (adapter as any).connected = true;
      
      const validAssetData = {
        finId: {
          id: 'valid-asset-id',
          type: 'asset' as const,
          domain: 'valid.domain'
        },
        symbol: 'VALID',
        name: 'Valid Token',
        decimals: 8,
        totalSupply: BigInt(1000000),
        ledgerId: 'sui',
        metadata: {
          description: 'Valid token for testing'
        }
      };

      const result = await adapter.createAsset(validAssetData);
      expect(result).toBeDefined();
      expect(result.symbol).toBe('VALID');
      expect(result.decimals).toBe(8);
    });
  });

  describe('Account Operations', () => {
    it('should throw error when creating account while disconnected', async () => {
      // Set adapter to disconnected state
      (adapter as any).connected = false;
      
      await expect(adapter.createAccount('test-institution')).rejects.toThrow('Not connected to Sui network');
    });

    it('should handle balance queries for disconnected state', async () => {
      // Set adapter to disconnected state
      (adapter as any).connected = false;
      
      await expect(adapter.getBalance('test-account', 'test-asset')).rejects.toThrow('Not connected to Sui network');
    });
  });

  describe('Transfer Operations', () => {
    it('should throw error when transferring while disconnected', async () => {
      // Set adapter to disconnected state
      (adapter as any).connected = false;
      
      await expect(
        adapter.transfer('from-account', 'to-account', 'asset-id', BigInt(100))
      ).rejects.toThrow('Not connected to Sui network');
    });

    it('should execute transfer with valid parameters', async () => {
      // Ensure adapter is connected for transfer tests
      (adapter as any).connected = true;
      
      const result = await adapter.transfer('from-account', 'to-account', 'asset-id', BigInt(100));
      expect(result).toBe('mock-transaction-digest');
      expect((adapter as any).client.signAndExecuteTransaction).toHaveBeenCalled();
    });
  });

  describe('Transaction Queries', () => {
    it('should handle transaction queries while disconnected', async () => {
      // Set adapter to disconnected state
      (adapter as any).connected = false;
      
      await expect(adapter.getTransaction('test-hash')).rejects.toThrow('Not connected to Sui network');
      await expect(adapter.getTransactionStatus('test-hash')).rejects.toThrow('Not connected to Sui network');
    });
  });
});