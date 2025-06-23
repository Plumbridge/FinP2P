"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router_1 = require("../src/router/Router");
const logger_1 = require("../src/utils/logger");
const types_1 = require("../src/types");
describe('Redis Connection Test', () => {
    let logger;
    let config;
    beforeEach(() => {
        logger = (0, logger_1.createLogger)({ level: 'error' });
        config = {
            routerId: 'test-router',
            host: 'localhost',
            port: 0,
            redis: {
                url: 'redis://localhost:6379',
                timeout: 10000
            },
            network: {
                peers: [],
                maxConnections: 10,
                connectionTimeout: 5000,
                timeout: 10000
            },
            security: {
                enableAuth: false,
                jwtSecret: 'test-secret',
                encryptionKey: 'test-encryption-key-32-characters-long',
                privateKey: 'test-key',
                rateLimitWindow: 900000,
                rateLimitMax: 100
            },
            ledgers: {
                mock: {
                    type: types_1.LedgerType.MOCK,
                    config: {}
                }
            },
            monitoring: {
                enableMetrics: false,
                metricsPort: 0,
                enableHealthCheck: true,
                logLevel: 'error'
            }
        };
    });
    it('should handle Redis connection errors gracefully', async () => {
        const badConfig = {
            ...config,
            redis: { ...config.redis, url: 'redis://invalid:6379' }
        };
        const badRouter = new Router_1.FinP2PRouter(badConfig);
        // Should reject with an error
        await expect(badRouter.start()).rejects.toThrow();
    });
});
//# sourceMappingURL=test-redis-jest.test.js.map