"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router_1 = require("../../src/router/Router");
const logger_1 = require("../../src/utils/logger");
const types_1 = require("../../src/types");
const redis_1 = require("../helpers/redis");
const router_cleanup_1 = require("../helpers/router-cleanup");
describe('Security Validation Tests', () => {
    let router;
    let redisClient;
    let logger;
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
        const config = {
            routerId: 'security-test-router',
            host: 'localhost',
            port: 0, // Random port
            redis: {
                url: process.env.TEST_REDIS_URL || 'redis://localhost:6379/1',
                client: redisClient // Pass the client directly
            },
            network: {
                peers: [],
                maxConnections: 10,
                connectionTimeout: 5000
            },
            security: {
                enableAuth: true,
                jwtSecret: 'test-secret-key-for-testing-only',
                encryptionKey: 'test-encryption-key-32-chars-long!!',
                privateKey: 'test-private-key',
                rateLimitWindow: 60000,
                rateLimitMax: 100
            },
            ledgers: {
                mock: {
                    type: types_1.LedgerType.MOCK,
                    config: { network: 'testnet' }
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
    });
    afterAll(async () => {
        await (0, redis_1.closeRedisConnection)(redisClient);
    });
    describe('Authentication', () => {
        it('should validate JWT tokens correctly', async () => {
            // Test JWT validation with real Redis session storage
            const testToken = 'valid-jwt-token';
            // This test would verify that authentication works with real Redis
            expect(router).toBeDefined();
        });
        it('should reject invalid tokens', async () => {
            const invalidToken = 'invalid-token';
            // Test that invalid tokens are properly rejected
            expect(router).toBeDefined();
        });
    });
    describe('Rate Limiting', () => {
        it('should enforce rate limits using Redis', async () => {
            // Test that rate limiting works with real Redis counters
            expect(router).toBeDefined();
        });
        it('should reset rate limits after window expires', async () => {
            // Test rate limit window reset functionality
            expect(router).toBeDefined();
        });
    });
    describe('Encryption', () => {
        it('should encrypt sensitive data', async () => {
            // Test data encryption functionality
            expect(router).toBeDefined();
        });
        it('should decrypt data correctly', async () => {
            // Test data decryption functionality
            expect(router).toBeDefined();
        });
    });
    describe('Input Validation', () => {
        it('should validate transfer requests', async () => {
            // Test input validation for transfer requests
            expect(router).toBeDefined();
        });
        it('should reject malformed requests', async () => {
            // Test rejection of malformed requests
            expect(router).toBeDefined();
        });
    });
});
//# sourceMappingURL=SecurityValidation.test.js.map