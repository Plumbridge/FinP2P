import dotenv from 'dotenv';
import { FinP2PSDKRouter, FinP2PSDKConfig } from './router';
import { createLogger } from './utils/logger';

// Load environment variables
dotenv.config();

const logger = createLogger({ level: 'info' });

function getSDKConfig(): FinP2PSDKConfig {
  const routerId = process.env.ROUTER_ID || 'router-1';
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';
  
  // Required FinP2P SDK configuration
  const orgId = process.env.FINP2P_ORG_ID;
  
  if (!orgId) {
    throw new Error('FINP2P_ORG_ID environment variable is required');
  }
  
  const custodianOrgId = process.env.FINP2P_CUSTODIAN_ORG_ID || orgId;
  const owneraAPIAddress = process.env.OWNERA_API_ADDRESS;
  const apiKey = process.env.FINP2P_API_KEY;
  const privateKey = process.env.FINP2P_PRIVATE_KEY;
  
  if (!owneraAPIAddress) {
    throw new Error('OWNERA_API_ADDRESS environment variable is required');
  }
  
  if (!apiKey) {
    throw new Error('FINP2P_API_KEY environment variable is required');
  }
  
  if (!privateKey) {
    throw new Error('FINP2P_PRIVATE_KEY environment variable is required');
  }
  
  return {
    routerId,
    port,
    host,
    orgId,
    custodianOrgId,
    owneraAPIAddress,
    owneraOssURL: process.env.OWNERA_OSS_URL,
    owneraFinp2pURL: process.env.OWNERA_FINP2P_URL,
    authConfig: {
      apiKey,
      secret: {
        type: (parseInt(process.env.FINP2P_SECRET_TYPE || '1', 10) === 2 ? 2 : 1) as 1 | 2,
        raw: privateKey
      }
    }
  };
}

async function main() {
  try {
    logger.info('Starting FinP2P SDK Router...');
    
    const config = getSDKConfig();
    logger.info(`FinP2P SDK Router configuration loaded for: ${config.routerId}`);
    logger.info(`Organization ID: ${config.orgId}`);
    logger.info(`Ownera API Address: ${config.owneraAPIAddress}`);
    
    // Create and start the SDK-based router
    const router = new FinP2PSDKRouter(config);
    
    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      
      try {
        await router.stop();
        logger.info('FinP2P SDK Router stopped successfully');
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
    
    logger.info(`FinP2P SDK Router ${config.routerId} started successfully on ${config.host}:${config.port}`);
    logger.info(`Health check available at: http://${config.host}:${config.port}/health`);
    logger.info(`Router info available at: http://${config.host}:${config.port}/info`);
    
    // Log SDK info if available
    const sdk = router.finp2pSdk;
    if (sdk && typeof sdk.nodeId !== 'undefined') {
      logger.info(`SDK Node ID: ${sdk.nodeId}`);
    }
    if (sdk && typeof sdk.custodianOrgId !== 'undefined') {
      logger.info(`Custodian Org ID: ${sdk.custodianOrgId}`);
    }
    
  } catch (error) {
    logger.error('Failed to start FinP2P SDK Router:', error);
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

export { FinP2PSDKRouter, getSDKConfig };
export * from './types';
export * from './utils';
export * from './router';