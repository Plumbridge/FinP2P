"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router_1 = require("../../src/router/Router");
const types_1 = require("../../src/types");
const logger_1 = require("../../src/utils/logger");
const redis_1 = require("../helpers/redis");
const router_cleanup_1 = require("../helpers/router-cleanup");
describe('FinP2PRouter', () => {
    let router;
    let config;
    let logger;
    let redisClient;
    // Increase test timeout to 10 seconds
    jest.setTimeout(10000);
    beforeAll(async () => {
        redisClient = await (0, redis_1.createTestRedisClient)();
    });
    beforeEach(async () => {
        // Clean up any existing router instance
        if (router && router.isRunning && router.isRunning()) {
            await (0, router_cleanup_1.stopRouterSafely)(router);
        }
        // Clean up Redis
        if (redisClient && redisClient.isOpen) {
            await (0, redis_1.cleanupRedis)(redisClient);
        }
        logger = (0, logger_1.createLogger)({ level: 'error' });
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
                    type: types_1.LedgerType.MOCK,
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
        router = new Router_1.FinP2PRouter(config);
    });
    afterEach(async () => {
        // Stop router safely if it's running
        if (router && router.isRunning && router.isRunning()) {
            await (0, router_cleanup_1.stopRouterSafely)(router);
        }
        // Clear any remaining timers
        jest.clearAllTimers();
        jest.clearAllMocks();
    });
    afterAll(async () => {
        await (0, redis_1.closeRedisConnection)(redisClient);
        // Clear all mocks after each test
        jest.clearAllMocks();
        // Wait for any pending operations to complete
        await new Promise(resolve => setTimeout(resolve, 50));
    });
    describe('Initialization', () => {
        it('should create router with valid configuration', () => {
            expect(router).toBeDefined();
            expect(router.getId()).toBe('test-router');
        });
        it('should throw error with invalid configuration', () => {
            const invalidConfig = { ...config, routerId: '' };
            expect(() => new Router_1.FinP2PRouter(invalidConfig)).toThrow();
        });
    });
    describe('Lifecycle', () => {
        it('should start and stop successfully', async () => {
            await router.start();
            expect(router.isRunning()).toBe(true);
            await router.stop();
            expect(router.isRunning()).toBe(false);
        });
        it('should handle multiple start calls gracefully', async () => {
            await router.start();
            await router.start(); // Should not throw
            expect(router.isRunning()).toBe(true);
        });
        it('should handle stop before start', async () => {
            await router.stop(); // Should not throw
            expect(router.isRunning()).toBe(false);
        });
    });
    describe('Health Check', () => {
        it('should return healthy status when running', async () => {
            await router.start();
            const health = await router.getHealth();
            expect(health.status).toBe('healthy');
            expect(health.timestamp).toBeDefined();
            expect(health.uptime).toBeGreaterThan(0);
        });
        it('should return unhealthy status when stopped', async () => {
            const health = await router.getHealth();
            expect(health.status).toBe('unhealthy');
        });
    });
    describe('Router Information', () => {
        it('should return correct router info', async () => {
            const info = router.getInfo();
            expect(info.id).toBe('test-router');
            expect(info.metadata.version).toBeDefined();
            expect(info.supportedLedgers).toContain('mock');
        });
    });
    describe('Peer Management', () => {
        it('should handle peer connections', async () => {
            await router.start();
            const peers = router.getPeers();
            expect(Array.isArray(peers)).toBe(true);
        });
        it('should add and remove peers', async () => {
            await router.start();
            const peerUrl = 'http://localhost:3001';
            await router.addPeer(peerUrl);
            const peers = router.getPeers();
            expect(peers.some(p => p.url === peerUrl)).toBe(true);
            await router.removePeer(peerUrl);
            const updatedPeers = router.getPeers();
            expect(updatedPeers.some((p) => p.url === peerUrl)).toBe(false);
        });
    });
    describe('Error Handling', () => {
        it('should handle Redis connection errors gracefully', async () => {
            const badConfig = {
                ...config,
                redis: { ...config.redis, url: 'redis://invalid:6379' }
            };
            const badRouter = new Router_1.FinP2PRouter(badConfig);
            // Should not throw, but should log error
            await expect(badRouter.start()).rejects.toThrow();
        });
        it('should handle port conflicts gracefully', async () => {
            const router1 = new Router_1.FinP2PRouter({ ...config, port: 3333 });
            const router2 = new Router_1.FinP2PRouter({ ...config, port: 3333 });
            await router1.start();
            // Second router should fail to start on same port
            await expect(router2.start()).rejects.toThrow();
            await router1.stop();
        });
    });
    describe('Metrics', () => {
        it('should collect basic metrics', async () => {
            await router.start();
            const metrics = await router.getMetrics();
            expect(metrics).toBeDefined();
            expect(metrics.routerId).toBe('test-router');
            expect(metrics.timestamp).toBeDefined();
            expect(typeof metrics.transfersProcessed).toBe('number');
            expect(typeof metrics.activeConnections).toBe('number');
        });
    });
    describe('Enhanced Balance Tracking Integration', () => {
        let testAssetId;
        let testAccountId;
        beforeEach(async () => {
            await router.start();
            // Get the ledger manager to set up test data
            const ledgerManager = router.ledgerManager;
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
            const ledgerManager = router.ledgerManager;
            // Test balance validation
            const validation = await ledgerManager.validateBalanceAvailability('mock', testAccountId, testAssetId, BigInt('50000000000000000000') // 50 tokens
            );
            expect(validation.available).toBe(true);
            expect(validation.available).toBe(true);
            expect(validation.availableBalance).toBeGreaterThanOrEqual(BigInt('0'));
        });
        it('should support balance reservations through router', async () => {
            const ledgerManager = router.ledgerManager;
            // Reserve balance
            const reservation = await ledgerManager.reserveBalance('mock', testAccountId, testAssetId, BigInt('30000000000000000000') // 30 tokens
            );
            expect(reservation.success).toBe(true);
            expect(reservation.reservationId).toBeDefined();
            // Check that availability is reduced
            const validation = await ledgerManager.validateBalanceAvailability('mock', testAccountId, testAssetId, BigInt('80000000000000000000') // 80 tokens
            );
            expect(validation.available).toBe(false);
            expect(validation.availableBalance).toBeLessThan(BigInt('100000000000000000000'));
            // Release reservation
            await ledgerManager.releaseReservation(reservation.reservationId);
            // Check that availability is restored
            const finalValidation = await ledgerManager.validateBalanceAvailability('mock', testAccountId, testAssetId, BigInt('100000000000000000000'));
            expect(finalValidation.available).toBe(true);
        });
        it('should track balance history through router operations', async () => {
            const ledgerManager = router.ledgerManager;
            const mockAdapter = ledgerManager.getAdapter('mock');
            // Get initial history
            const initialHistory = mockAdapter.getBalanceHistory(testAccountId);
            expect(initialHistory).toHaveLength(1); // Initial mintTokens
            // Create another account for transfer
            const account2 = await mockAdapter.createAccount('test-institution-2');
            // Perform transfer
            await mockAdapter.transfer(testAccountId, account2.id, testAssetId, BigInt('10000000000000000000') // 10 tokens
            );
            // Check updated history
            const updatedHistory = mockAdapter.getBalanceHistory(testAccountId);
            expect(updatedHistory).toHaveLength(2);
            expect(updatedHistory[1].operation).toBeDefined();
            expect(updatedHistory[1].balance).toBeDefined();
        });
        it('should handle cross-ledger operations with enhanced validation', async () => {
            const ledgerManager = router.ledgerManager;
            // Test cross-ledger transfer initiation (mock to mock for testing)
            const crossTransfer = await ledgerManager.initiateCrossLedgerTransfer('mock', 'mock', testAccountId, testAccountId, // Same account for simplicity in test
            testAssetId, BigInt('15000000000000000000') // 15 tokens
            );
            expect(crossTransfer.success).toBe(true);
            expect(crossTransfer.operationId).toBeDefined();
            // Check operation tracking
            const operations = ledgerManager.getCrossLedgerOperations();
            expect(operations.length).toBeGreaterThanOrEqual(1);
            expect(['pending', 'processing']).toContain(operations[0].status);
            // Test rollback
            const rollback = await ledgerManager.rollbackCrossLedgerOperation(crossTransfer.operationId);
            expect(rollback.success).toBe(true);
            // Check operation status
            const updatedOperations = ledgerManager.getCrossLedgerOperations();
            expect(['rolled_back', 'failed']).toContain(updatedOperations[0].status);
        });
        it('should handle insufficient balance scenarios gracefully', async () => {
            const ledgerManager = router.ledgerManager;
            // Try to reserve more than available
            const reservation = await ledgerManager.reserveBalance('mock', testAccountId, testAssetId, BigInt('150000000000000000000') // 150 tokens (more than 100 available)
            );
            expect(reservation.success).toBe(false);
            expect(reservation.reason).toMatch(/(Insufficient|not enough)/i);
        });
    });
});
//# sourceMappingURL=Router.test.js.map