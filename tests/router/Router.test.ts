import { FinP2PRouter } from '../../src/router/Router';
import { ConfigOptions, LedgerType } from '../../src/types';
import { createLogger } from '../../src/utils/logger';
import { createTestRedisClient, cleanupRedis, closeRedisConnection } from '../helpers/redis';
import { stopRouterSafely } from '../helpers/router-cleanup';
import { RedisClientType } from 'redis';

describe('FinP2PRouter', () => {
  let router: FinP2PRouter | null;
  let config: ConfigOptions;
  let logger: any;
  let redisClient: RedisClientType;

  // Increase test timeout
  jest.setTimeout(15000);

  beforeAll(async () => {
    redisClient = await createTestRedisClient();
  });

  beforeEach(async () => {
    // Clean up any existing router instance FIRST
    if (router) {
      await stopRouterSafely(router);
      router = null; // Clear the reference
    }
    
    // Clean up Redis
    if (redisClient && redisClient.isOpen) {
      await cleanupRedis(redisClient);
    }
    
    logger = createLogger({ level: 'error' });
    // Reduce log noise in tests

    config = {
      routerId: 'test-router',
      port: 0, // Use random port
      host: 'localhost',
      redis: {
        url: process.env.TEST_REDIS_URL || 'redis://localhost:6379/1',
        keyPrefix: 'test:finp2p:',
        ttl: 3600
      },
      network: {
        peers: [],
        heartbeatInterval: 5000,
        maxRetries: 3,
        timeout: 10000
      },
      security: {
        enableAuth: false,
        jwtSecret: 'test-secret',
        encryptionKey: 'test-encryption-key-32-chars-long!!',
        rateLimitWindow: 900000,
        rateLimitMax: 100
      },
      ledgers: {
        mock: {
        type: LedgerType.MOCK,
        config: {
          name: 'Test Mock Ledger',
          latency: 10,
          failureRate: 0,
          enableBalanceHistory: true,
          enableConcurrencySimulation: false,
          networkPartitionRate: 0,
          balanceReconciliationDelay: 500 // Increased for test reliability
        }
        }
      },
      monitoring: {
        enableMetrics: false,
        metricsPort: 0,
        enableHealthCheck: true,
        logLevel: 'error'
      }
    };

    router = new FinP2PRouter(config, redisClient);
  });

  afterEach(async () => {
    // Always stop router after each test
    if (router) {
      await stopRouterSafely(router);
      router = null;
    }
  });

  afterAll(async () => {
    // Final cleanup
    if (router) {
      await stopRouterSafely(router);
    }
    await closeRedisConnection(redisClient);
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  describe('Initialization', () => {
    it('should create router with valid configuration', () => {
      expect(router).toBeDefined();
      expect(router?.getId()).toBe('test-router');
    });

    it('should throw error with invalid configuration', () => {
      const invalidConfig = { ...config, routerId: '' };
      expect(() => new FinP2PRouter(invalidConfig, redisClient)).toThrow();
    });
  });

  describe('Lifecycle', () => {
    it('should start and stop successfully', async () => {
      if (router?.isRunning()) {
        await router.stop();
      }
      if (router) {
         await router.start();
         expect(router.isRunning()).toBe(true);
        
        await router.stop();
        expect(router.isRunning()).toBe(false);
      }
    });

    it('should handle multiple start calls gracefully', async () => {
      router = new FinP2PRouter(config, redisClient);
      
      if (router) {
        await router.start();
        expect(router.isRunning()).toBe(true);
        
        // Second start should not throw but should be a no-op
        await router.start();
        expect(router.isRunning()).toBe(true);
        
        // Clean up
        await router.stop();
      }
    });

    it('should handle stop before start', async () => {
      if (router) {
        await router.stop(); // Should not throw
        expect(router.isRunning()).toBe(false);
      }
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when running', async () => {
      await router?.start();
      const health = await router?.getHealth();
      
      expect(health?.status).toBe('healthy');
      expect(health?.timestamp).toBeDefined();
      expect(health?.uptime).toBeGreaterThan(0);
    });

    it('should return unhealthy status when stopped', async () => {
      if (router) {
        const health = await router.getHealth();
        
        expect(health.status).toBe('unhealthy');
      }
    });
  });

  describe('Router Information', () => {
    it('should return correct router info', async () => {
      if (router) {
        const info = router.getInfo();
        
        expect(info.id).toBe('test-router');
        expect(info.metadata.version).toBeDefined();
        expect(info.supportedLedgers).toContain('mock');
      }
    });
  });

  describe('Peer Management', () => {
    it('should handle peer connections', async () => {
      if (router) {
        await router.start();
        
        const peers = router.getPeers();
        expect(Array.isArray(peers)).toBe(true);
      }
    });

    it('should add and remove peers', async () => {
      if (router) {
        await router.start();
        
        const peerUrl = process.env.TEST_PEER_URL || 'http://localhost:3001';
        await router.addPeer(peerUrl);
        
        const peers = router.getPeers();
        expect(peers.some(p => p.url === peerUrl)).toBe(true);
        
        await router.removePeer(peerUrl);
        const updatedPeers = router.getPeers();
        expect(updatedPeers.some((p: any) => p.url === peerUrl)).toBe(false);
      }
    });
  });

  

  describe('Metrics', () => {
    it('should collect basic metrics', async () => {
      if (router?.isRunning()) {
        await router.stop();
      }
      if (router) {
        await router.start();
        
        const metrics = await router.getMetrics();
      
        expect(metrics).toBeDefined();
        expect(metrics.routerId).toBe('test-router');
        expect(metrics.timestamp).toBeDefined();
        expect(typeof metrics.transfersProcessed).toBe('number');
        expect(typeof metrics.activeConnections).toBe('number');
      }
    });
  });

  describe('Enhanced Balance Tracking Integration', () => {
    let testAccountId: string;
    let testAssetId: string;

    beforeEach(async () => {
      // Start router for this test suite
      if (router && !router.isRunning()) {
        await router.start();
      }
      
      const ledgerManager = (router as any).ledgerManager;
      const mockAdapter = ledgerManager.getAdapter('mock');
      
      // Create test asset
      const asset = await mockAdapter.createAsset({
        finId: 'fin-test-001',
        symbol: 'TEST',
        name: 'Test Token',
        decimals: 18,
        totalSupply: BigInt('1000000000000000000000000'),
        ledgerId: 'mock',
        metadata: { description: 'Test token' }
      });
      testAssetId = asset.id;
      
      // Create test account
      const account = await mockAdapter.createAccount('test-institution');
      testAccountId = account.id;
      
      // Mint initial balance
      await mockAdapter.mintTokens(testAccountId, testAssetId, BigInt('100000000000000000000')); // 100 tokens
    });

    it('should support enhanced balance validation through router', async () => {
      // Ensure router is started
      if (router && (!router.isRunning || !router.isRunning())) {
        await router.start();
      }
      
      const ledgerManager = (router as any).ledgerManager;
      
      // Test balance validation
      const validation = await ledgerManager.validateBalanceAvailability(
        'mock',
        testAccountId,
        testAssetId,
        BigInt('50000000000000000000') // 50 tokens
      );
      
      expect(validation.available).toBe(true);
      expect(validation.availableBalance).toBeGreaterThanOrEqual(BigInt('0'));
    });

    it('should support balance reservations through router', async () => {
      const ledgerManager = (router as any).ledgerManager;
      
      // Reserve balance
      const reservation = await ledgerManager.reserveBalance(
        'mock',
        testAccountId,
        testAssetId,
        BigInt('30000000000000000000') // 30 tokens
      );
      
      expect(reservation.success).toBe(true);
      expect(reservation.reservationId).toBeDefined();
      
      // Check that availability is reduced
      const validation = await ledgerManager.validateBalanceAvailability(
        'mock',
        testAccountId,
        testAssetId,
        BigInt('80000000000000000000') // 80 tokens
      );
      
      expect(validation.available).toBe(false);
      expect(validation.availableBalance).toBeLessThan(BigInt('100000000000000000000'));
      
      // Release reservation
      await ledgerManager.releaseReservation(reservation.reservationId!);
      
      // Check that availability is restored
      const finalValidation = await ledgerManager.validateBalanceAvailability(
        'mock',
        testAccountId,
        testAssetId,
        BigInt('100000000000000000000')
      );
      
      expect(finalValidation.available).toBe(true);
    });

    it('should track balance history through router operations', async () => {
      const ledgerManager = (router as any).ledgerManager;
      const mockAdapter = ledgerManager.getAdapter('mock');
      
      // Use the test account and asset from beforeEach
      console.log('Using testAccountId:', testAccountId);
      console.log('Using testAssetId:', testAssetId);

      
      // Debug: Check if accounts exist
      console.log('Accounts in adapter:', Array.from(mockAdapter.accounts.keys()));
      
      // Get initial history
      const initialHistory = mockAdapter.getBalanceHistory(testAccountId);
      expect(initialHistory).toHaveLength(1); // Initial mintTokens from beforeEach
      
      // Create another account for transfer
      const account2 = await mockAdapter.createAccount('test-institution-2');
      console.log('Created account2:', account2.id);
      console.log('Accounts after creating account2:', Array.from(mockAdapter.accounts.keys()));
      
      // Verify both accounts exist before transfer
      console.log('Account 1 exists:', mockAdapter.accounts.has(testAccountId));
      console.log('Account 2 exists:', mockAdapter.accounts.has(account2.id));
      
      // Perform transfer
      try {
        await mockAdapter.transfer(
          testAccountId,
          account2.id,
          testAssetId,
          BigInt('10000000000000000000') // 10 tokens
        );
        console.log('Transfer completed successfully');
      } catch (error) {
        console.log('Transfer failed:', (error as Error).message);
        console.log('Final accounts state:', Array.from(mockAdapter.accounts.keys()));
        throw error;
      }
      
      // Check updated history
      const updatedHistory = mockAdapter.getBalanceHistory(testAccountId);
      expect(updatedHistory).toHaveLength(2); // Initial mint + transfer
      
      // Verify transfer entry
      const transferEntry = updatedHistory[1];
      expect(transferEntry.operation).toBe('transfer');
      expect(transferEntry.assetId).toBe(testAssetId);
      expect(transferEntry.balance).toBe(BigInt('90000000000000000000')); // 100 - 10 = 90 tokens
    });

    it('should handle cross-ledger operations with enhanced validation', async () => {
      const ledgerManager = (router as any).ledgerManager;
      const mockAdapter = ledgerManager.getAdapter('mock');
      
      // Test cross-ledger transfer initiation (mock to mock for testing)
      const crossTransfer = await ledgerManager.initiateCrossLedgerTransfer(
        'mock',
        'mock',
        testAccountId,
        testAccountId, // Same account for simplicity in test
        testAssetId,
        BigInt('15000000000000000000') // 15 tokens
      );
      
      expect(crossTransfer.success).toBe(true);
      expect(crossTransfer.operationId).toBeDefined();
      
      // Check operation tracking
      const operations = ledgerManager.getCrossLedgerOperations();
      expect(operations.length).toBeGreaterThanOrEqual(1);
      expect(['pending','processing']).toContain(operations[0].status);
      
      // Test rollback
      const rollback = await ledgerManager.rollbackCrossLedgerOperation(crossTransfer.operationId!);
      expect(rollback.success).toBe(true);
      
      // Check operation status
      const updatedOperations = ledgerManager.getCrossLedgerOperations();
      expect(['rolled_back','failed']).toContain(updatedOperations[0].status);
    });

    it('should handle insufficient balance scenarios gracefully', async () => {
      const ledgerManager = (router as any).ledgerManager;
      const mockAdapter = ledgerManager.getAdapter('mock');
      
      // Create test asset
      const asset = await mockAdapter.createAsset({
        finId: 'fin-test-004',
        symbol: 'TEST4',
        name: 'Test Token 4',
        decimals: 18,
        totalSupply: BigInt('1000000000000000000000000'),
        ledgerId: 'mock',
        metadata: { description: 'Test token 4' }
      });
      const testAssetId = asset.id;
      
      // Create test account
      const account = await mockAdapter.createAccount('test-institution');
      const testAccountId = account.id;
      
      // Mint initial balance
      await mockAdapter.mintTokens(testAccountId, testAssetId, BigInt('100000000000000000000')); // 100 tokens
      
      // Try to reserve more than available
      const reservation = await ledgerManager.reserveBalance(
        'mock',
        testAccountId,
        testAssetId,
        BigInt('150000000000000000000') // 150 tokens (more than 100 available)
      );
      
      expect(reservation.success).toBe(false);
      expect(reservation.reason).toMatch(/(Insufficient|not enough)/i);
    });

    // afterEach(async () => {
    //   // Stop router safely with extended timeout for this test suite
    //   if (router && router.isRunning && router.isRunning()) {
    //     await stopRouterSafely(router, 15000); // 15 second timeout
    //   }
    // });
  });
});