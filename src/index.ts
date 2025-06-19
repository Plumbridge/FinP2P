import dotenv from 'dotenv';
import { FinP2PRouter } from './router/Router';
import { createLogger } from './utils/logger';
import { ConfigOptions, LedgerType } from './types';

// Load environment variables
dotenv.config();

const logger = createLogger({ level: 'info' });

function getConfig(): ConfigOptions {
  const routerId = process.env.ROUTER_ID || 'router-1';
  const port = parseInt(process.env.PORT || '3000', 10);
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  return {
    routerId,
    port,
    host: process.env.HOST || '0.0.0.0',
    
    // Redis configuration
    redis: {
      url: redisUrl,
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'finp2p:',
      ttl: parseInt(process.env.REDIS_TTL || '3600', 10)
    },
    
    // Network configuration
    network: {
      peers: process.env.PEERS ? process.env.PEERS.split(',') : [],
      heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL || '30000', 10),
      maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
      timeout: parseInt(process.env.TIMEOUT || '30000', 10)
    },
    
    // Security configuration
    security: {
      enableAuth: process.env.ENABLE_AUTH === 'true',
      jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
      encryptionKey: process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!!',
      rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
      rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10)
    },
    
    // Ledger configurations
    ledgers: {
      // Mock ledger for testing
      mock: {
        type: LedgerType.MOCK,
        config: {
          name: 'Mock Ledger',
          latency: parseInt(process.env.MOCK_LATENCY || '100', 10),
          failureRate: parseFloat(process.env.MOCK_FAILURE_RATE || '0')
        }
      },
      
      // Sui configuration
      ...(process.env.SUI_RPC_URL && {
        sui: {
          type: LedgerType.SUI,
          config: {
            rpcUrl: process.env.SUI_RPC_URL,
            privateKey: process.env.SUI_PRIVATE_KEY,
            network: process.env.SUI_NETWORK || 'testnet',
            gasObjectId: process.env.SUI_GAS_OBJECT_ID,
            packageId: process.env.SUI_PACKAGE_ID
          }
        }
      }),
      
      // Hedera configuration
      ...(process.env.HEDERA_ACCOUNT_ID && {
        hedera: {
          type: LedgerType.HEDERA,
          config: {
            accountId: process.env.HEDERA_ACCOUNT_ID,
            privateKey: process.env.HEDERA_PRIVATE_KEY,
            network: process.env.HEDERA_NETWORK || 'testnet',
            mirrorNodeUrl: process.env.HEDERA_MIRROR_NODE_URL
          }
        }
      })
    },
    
    // Monitoring configuration
    monitoring: {
      enableMetrics: process.env.ENABLE_METRICS !== 'false',
      metricsPort: parseInt(process.env.METRICS_PORT || '9090', 10),
      enableHealthCheck: process.env.ENABLE_HEALTH_CHECK !== 'false',
      logLevel: process.env.LOG_LEVEL || 'info'
    }
  };
}

async function main() {
  try {
    logger.info('Starting FinP2P Router...');
    
    const config = getConfig();
    logger.info(`Router configuration loaded for: ${config.routerId}`);
    
    // Validate required configuration
    if (!config.routerId) {
      throw new Error('ROUTER_ID is required');
    }
    
    if (config.security.enableAuth && config.security.jwtSecret === 'default-secret-change-in-production') {
      logger.warn('Using default JWT secret. Please set JWT_SECRET environment variable in production.');
    }
    
    if (config.security.encryptionKey === 'default-encryption-key-32-chars!!') {
      logger.warn('Using default encryption key. Please set ENCRYPTION_KEY environment variable in production.');
    }
    
    // Create and start the router
    const router = new FinP2PRouter(config);
    
    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      
      try {
        await router.stop();
        logger.info('Router stopped successfully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };
    
    // Register signal handlers
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      shutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
    
    // Start the router
    await router.start();
    
    logger.info(`FinP2P Router ${config.routerId} started successfully on port ${config.port}`);
    logger.info(`Health check available at: http://${config.host}:${config.port}/health`);
    logger.info(`API documentation available at: http://${config.host}:${config.port}/api-docs`);
    
    if (config.monitoring.enableMetrics) {
      logger.info(`Metrics available at: http://${config.host}:${config.monitoring.metricsPort}/metrics`);
    }
    
    // Log configured ledgers
    const configuredLedgers = Object.keys(config.ledgers);
    if (configuredLedgers.length > 0) {
      logger.info(`Configured ledgers: ${configuredLedgers.join(', ')}`);
    } else {
      logger.warn('No ledgers configured. Router will run in limited mode.');
    }
    
    // Log peer configuration
    if (config.network.peers.length > 0) {
      logger.info(`Configured peers: ${config.network.peers.join(', ')}`);
    } else {
      logger.info('No peers configured. Router will run in standalone mode.');
    }
    
  } catch (error) {
    logger.error('Failed to start FinP2P Router:', error);
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { FinP2PRouter, getConfig };
export * from './types';
export * from './utils';
export * from './adapters';
export * from './router';