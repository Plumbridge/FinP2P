import { FinP2PRouter } from '../src/router/Router';
import { createLogger } from '../src/utils/logger';
import { LedgerType } from '../src/types';

describe('Redis Connection Test', () => {
  let logger: any;
  let config: any;

  beforeEach(() => {
    logger = createLogger({ level: 'error' });
    config = {
      routerId: 'test-router',
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
        encryptionKey: 'test-encryption-key-32-chars!!',
        privateKey: 'test-key',
        rateLimitWindow: 900000,
        rateLimitMax: 100
      },
      ledgers: {
        mock: {
          type: LedgerType.MOCK,
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
    
    const badRouter = new FinP2PRouter(badConfig);
    
    // Should reject with an error
    await expect(badRouter.start()).rejects.toThrow();
  });
});