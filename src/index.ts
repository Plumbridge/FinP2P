import dotenv from 'dotenv';
import { Sdk } from '@owneraio/finp2p-sdk-js';
import { createLogger } from './utils/logger';

// Load environment variables
dotenv.config();

const logger = createLogger({ level: process.env.LOG_LEVEL || 'info' });

async function main() {
  try {
    logger.info('Starting FinP2P Router with real SDK...');
     
    // Real FinP2P SDK Configuration
    const sdk = new Sdk({
      orgId: process.env.ROUTER_ID || 'your-org-id',
      custodianOrgId: process.env.FINP2P_CUSTODIAN_ORG_ID || process.env.ROUTER_ID || 'your-org-id',
      owneraAPIAddress: process.env.OWNERA_API_ADDRESS || 'https://api.finp2p.org',
      authConfig: {
        apiKey: process.env.FINP2P_API_KEY || '',
        secret: {
          type: 1 as const, // Certificate type
          raw: process.env.FINP2P_PRIVATE_KEY || '', // Your private key
        },
      },
    });

    // Initialize adapters for your DLTs
    await initializeAdapters(sdk);
     
    // The SDK doesn't have a start method, so we'll just log that it's ready
    logger.info('FinP2P SDK initialized successfully');
     
  } catch (error) {
    logger.error('Failed to start FinP2P Router:', error);
    process.exit(1);
  }
}

async function initializeAdapters(sdk: Sdk) {
  // Your Sui adapter would be registered here
  if (process.env.SUI_PRIVATE_KEY) {
    // Register Sui adapter with FinP2P
    // This would use the skeleton adapter pattern from owneraio/finp2p-nodejs-skeleton-adapter
  }
   
  // Your Hedera adapter would be registered here
  if (process.env.HEDERA_OPERATOR_ID) {
    // Register Hedera adapter with FinP2P
  }
}

// Start the application
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}