/**
 * Centralized Benchmark Configuration
 * 
 * This module provides consistent configuration across all benchmark scripts,
 * using environment variables when available and sensible defaults otherwise.
 * This eliminates hardcoded values and ensures consistency.
 */

import * as dotenv from 'dotenv';
import { findAvailablePort } from '../utils/port-scanner';

// Load environment variables
dotenv.config();

export interface BenchmarkConfig {
  // Router Configuration
  router: {
    basePort: number;
    preferredPort: number;
    routerId: string;
    overledgerRouterId: string;
    organizationId: string;
    overledgerOrganizationId: string;
    host: string;
    mockApiKey: string;
    mockPrivateKey: string;
    mockApiAddress: string;
  };

  // Test Identities
  identities: {
    initiatorFinId: string;
    responderFinId: string;
  };

  // Asset Amounts for Testing
  assets: {
    sui: {
      amount: string;
      amountMist: string;
      unit: string;
      assetId: string;
    };
    hedera: {
      amount: string;
      amountTinybars: string;
      unit: string;
      assetId: string;
    };
  };

  // Blockchain Configuration
  networks: {
    sui: {
      rpcUrl: string;
      network: string;
    };
    hedera: {
      network: string;
    };
  };

  // Overledger Configuration
  overledger: {
    baseUrl: string;
    environment: string;
  };

  // Benchmark Parameters
  benchmarkDefaults: {
    iterations: number;
    timeoutBlocks: number;
    timeoutMinutes: number;
    maxLockingAttempts: number;
    maxCompletionAttempts: number;
    iterationDelay: number;
    phaseDelay: number;
  };
}

/**
 * Load and validate configuration from environment variables
 */
function loadConfig(): BenchmarkConfig {
  return {
    router: {
      basePort: parseInt(process.env.BENCHMARK_BASE_PORT || process.env.FINP2P_BASE_PORT || '6380'),
      preferredPort: parseInt(process.env.BENCHMARK_PREFERRED_PORT || process.env.FINP2P_PORT || '6380'),
      routerId: process.env.BENCHMARK_ROUTER_ID || process.env.FINP2P_ROUTER_ID || 'benchmark-router',
      overledgerRouterId: process.env.BENCHMARK_OVERLEDGER_ROUTER_ID || 'overledger-benchmark-router',
      organizationId: process.env.BENCHMARK_ORG_ID || process.env.FINP2P_ORG_ID || 'benchmark-org',
      overledgerOrganizationId: process.env.BENCHMARK_OVERLEDGER_ORG_ID || 'overledger-benchmark-org',
      host: process.env.BENCHMARK_HOST || process.env.FINP2P_HOST || 'localhost',
      mockApiKey: process.env.BENCHMARK_MOCK_API_KEY || process.env.FINP2P_API_KEY || 'benchmark-api-key',
      mockPrivateKey: process.env.BENCHMARK_MOCK_PRIVATE_KEY || process.env.FINP2P_PRIVATE_KEY || 'benchmark-private-key',
      mockApiAddress: process.env.BENCHMARK_MOCK_API_ADDRESS || process.env.FINP2P_API_ADDRESS || 'benchmark-api-address'
    },

    identities: {
      initiatorFinId: process.env.BENCHMARK_INITIATOR_FINID || process.env.DEMO_INITIATOR_FINID || 'alice@atomic-swap.demo',
      responderFinId: process.env.BENCHMARK_RESPONDER_FINID || process.env.DEMO_RESPONDER_FINID || 'bob@atomic-swap.demo'
    },

    assets: {
      sui: {
        amount: process.env.BENCHMARK_SUI_AMOUNT || process.env.DEMO_SUI_AMOUNT || '0.1',
        amountMist: process.env.BENCHMARK_SUI_AMOUNT_MIST || '100000000', // 0.1 SUI in MIST (matches demo)
        unit: 'SUI',
        assetId: process.env.BENCHMARK_SUI_ASSET_ID || 'sui-native-token'
      },
      hedera: {
        amount: process.env.BENCHMARK_HEDERA_AMOUNT || process.env.DEMO_HEDERA_AMOUNT || '10',
        amountTinybars: process.env.BENCHMARK_HEDERA_AMOUNT_TINYBARS || '1000000000', // 10 HBAR in tinybars (matches demo)
        unit: 'HBAR',
        assetId: process.env.BENCHMARK_HEDERA_ASSET_ID || 'hedera-native-token'
      }
    },

    networks: {
      sui: {
        rpcUrl: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443',
        network: process.env.SUI_NETWORK || 'testnet'
      },
      hedera: {
        network: process.env.HEDERA_NETWORK || 'testnet'
      }
    },

    overledger: {
      baseUrl: process.env.OVERLEDGER_BASE_URL || 'https://api.sandbox.overledger.io',
      environment: process.env.OVERLEDGER_ENVIRONMENT || 'sandbox'
    },

    benchmarkDefaults: {
      iterations: parseInt(process.env.BENCHMARK_DEFAULT_ITERATIONS || '5'),
      timeoutBlocks: parseInt(process.env.BENCHMARK_TIMEOUT_BLOCKS || '100'),
      timeoutMinutes: parseInt(process.env.BENCHMARK_TIMEOUT_MINUTES || '5'),
      maxLockingAttempts: parseInt(process.env.BENCHMARK_MAX_LOCKING_ATTEMPTS || '20'),
      maxCompletionAttempts: parseInt(process.env.BENCHMARK_MAX_COMPLETION_ATTEMPTS || '15'),
      iterationDelay: parseInt(process.env.BENCHMARK_ITERATION_DELAY || '3000'), // ms between iterations
      phaseDelay: parseInt(process.env.BENCHMARK_PHASE_DELAY || '500') // ms between status checks
    }
  };
}

/**
 * Singleton configuration instance
 */
export const benchmarkConfig: BenchmarkConfig = loadConfig();

/**
 * Validate that required environment variables are set
 */
export function validateBenchmarkConfig(): { valid: boolean; missingVars: string[] } {
  const missingVars: string[] = [];
  
  // Check for critical environment variables
  const criticalVars = [
    'SUI_PRIVATE_KEY',
    'HEDERA_ACCOUNT_ID', 
    'HEDERA_PRIVATE_KEY',
    'OVERLEDGER_CLIENT_ID',
    'OVERLEDGER_CLIENT_SECRET'
  ];

  criticalVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  return {
    valid: missingVars.length === 0,
    missingVars
  };
}

/**
 * Get router configuration for FinP2P-only benchmark with dynamic port
 */
export async function getFinP2PRouterConfig(dynamicPort?: number) {
  // Use dynamic port allocation like the rest of the project
  const port = dynamicPort || await findAvailablePort();
  return {
    port,
    routerId: benchmarkConfig.router.routerId,
    organizationId: benchmarkConfig.router.organizationId,
    host: benchmarkConfig.router.host,
    mockMode: true,
    apiKey: benchmarkConfig.router.mockApiKey,
    privateKey: benchmarkConfig.router.mockPrivateKey,
    apiAddress: benchmarkConfig.router.mockApiAddress
  };
}

/**
 * Get router configuration for Overledger+FinP2P benchmark with dynamic port
 */
export async function getOverledgerRouterConfig(dynamicPort?: number) {
  // Use dynamic port allocation like the rest of the project
  const port = dynamicPort || await findAvailablePort();
  return {
    port,
    routerId: benchmarkConfig.router.overledgerRouterId,
    organizationId: benchmarkConfig.router.overledgerOrganizationId,
    host: benchmarkConfig.router.host,
    mockMode: true,
    apiKey: benchmarkConfig.router.mockApiKey,
    privateKey: benchmarkConfig.router.mockPrivateKey,
    apiAddress: benchmarkConfig.router.mockApiAddress
  };
}

/**
 * Get Sui adapter configuration
 */
export function getSuiAdapterConfig() {
  return {
    network: benchmarkConfig.networks.sui.network,
    rpcUrl: benchmarkConfig.networks.sui.rpcUrl,
    privateKey: process.env.SUI_PRIVATE_KEY
  };
}

/**
 * Get Hedera adapter configuration
 */
export function getHederaAdapterConfig() {
  return {
    network: benchmarkConfig.networks.hedera.network,
    accountId: process.env.HEDERA_ACCOUNT_ID,
    privateKey: process.env.HEDERA_PRIVATE_KEY
  };
}

/**
 * Get Overledger adapter configuration
 */
export function getOverledgerAdapterConfig() {
  return {
    clientId: process.env.OVERLEDGER_CLIENT_ID,
    clientSecret: process.env.OVERLEDGER_CLIENT_SECRET,
    baseUrl: benchmarkConfig.overledger.baseUrl,
    transactionSigningKeyId: process.env.OVERLEDGER_TRANSACTION_SIGNING_KEY_ID,
    transactionSigningPublicKey: process.env.OVERLEDGER_TRANSCATION_SIGNING_KEY_PUBLIC
  };
}

/**
 * Get swap request configuration for benchmarks
 */
export function getBenchmarkSwapRequest() {
  return {
    initiatorFinId: benchmarkConfig.identities.initiatorFinId,
    responderFinId: benchmarkConfig.identities.responderFinId,
    initiatorAsset: {
      chain: 'sui',
      assetId: benchmarkConfig.assets.sui.assetId,
      amount: benchmarkConfig.assets.sui.amountMist // Use MIST for FinP2P-only
    },
    responderAsset: {
      chain: 'hedera',
      assetId: benchmarkConfig.assets.hedera.assetId,
      amount: benchmarkConfig.assets.hedera.amountTinybars // Use tinybars for FinP2P-only
    },
    timeoutBlocks: benchmarkConfig.benchmarkDefaults.timeoutBlocks,
    timeoutMinutes: benchmarkConfig.benchmarkDefaults.timeoutMinutes
  };
}

/**
 * Get swap request configuration for Overledger benchmarks (uses different format)
 */
export function getOverledgerSwapRequest() {
  return {
    initiatorFinId: benchmarkConfig.identities.initiatorFinId,
    responderFinId: benchmarkConfig.identities.responderFinId,
    initiatorAsset: {
      chain: 'sui',
      assetId: 'sui-native',
      amount: benchmarkConfig.assets.sui.amount, // Use SUI units for Overledger
      unit: benchmarkConfig.assets.sui.unit
    },
    responderAsset: {
      chain: 'hedera',
      assetId: 'hedera-native',
      amount: benchmarkConfig.assets.hedera.amount, // Use HBAR units for Overledger
      unit: benchmarkConfig.assets.hedera.unit
    },
    timeoutBlocks: benchmarkConfig.benchmarkDefaults.timeoutBlocks,
    autoRollback: true
  };
}

/**
 * Log configuration summary for debugging
 */
export function logConfigSummary(logger: any, actualPort?: number) {
  logger.info('📋 Benchmark Configuration Summary:', {
    router: {
      preferredPort: benchmarkConfig.router.preferredPort,
      actualPort: actualPort || 'TBD (dynamic)',
      host: benchmarkConfig.router.host
    },
    identities: benchmarkConfig.identities,
    assets: {
      sui: `${benchmarkConfig.assets.sui.amount} ${benchmarkConfig.assets.sui.unit}`,
      hedera: `${benchmarkConfig.assets.hedera.amount} ${benchmarkConfig.assets.hedera.unit}`
    },
    defaults: {
      iterations: benchmarkConfig.benchmarkDefaults.iterations,
      timeoutMinutes: benchmarkConfig.benchmarkDefaults.timeoutMinutes
    }
  });
} 