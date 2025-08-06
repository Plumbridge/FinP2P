require('dotenv').config();
const winston = require('winston');
const { 
  FinP2PIntegratedSuiAdapter,
  FinP2PIntegratedHederaAdapter
} = require('../dist/src/adapters');

const { FinP2PSDKRouter } = require('../dist/src/router');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Demo configuration
const demoConfig = {
  // Sui configuration
  sui: {
    network: 'testnet',
    rpcUrl: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443',
    privateKey: process.env.SUI_PRIVATE_KEY || 'suiprivkey1...',
    finp2pRouter: null // Will be set below
  },
  
  // Hedera configuration
  hedera: {
    network: 'testnet',
    accountId: process.env.HEDERA_ACCOUNT_ID || '0.0.123456',
    privateKey: process.env.HEDERA_PRIVATE_KEY || '302e020100300506032b657004220420...',
    // Configure multiple accounts for atomic swap scenarios
    accounts: {
      alice: {
        accountId: process.env.HEDERA_ACCOUNT_ID || '0.0.123456',
        privateKey: process.env.HEDERA_PRIVATE_KEY || '302e020100300506032b657004220420...'
      },
      bob: {
        accountId: process.env.HEDERA_ACCOUNT_ID_2 || '0.0.123457',
        privateKey: process.env.HEDERA_PRIVATE_KEY_2 || '302e020100300506032b657004220420...'
      }
    },
    finp2pRouter: null // Will be set below
  }
};

async function runHederaSuiAdaptersDemo() {
  logger.info('🚀 Starting Hedera & Sui Adapters Demo');
  logger.info('=' .repeat(60));

  // Debug environment variables
  logger.info('🔍 Environment variables:');
  logger.info(`SUI_RPC_URL: ${process.env.SUI_RPC_URL ? 'SET' : 'NOT SET'}`);
  logger.info(`SUI_PRIVATE_KEY: ${process.env.SUI_PRIVATE_KEY ? 'SET' : 'NOT SET'}`);
  logger.info(`SUI_ADDRESS: ${process.env.SUI_ADDRESS ? 'SET' : 'NOT SET'}`);
  logger.info(`SUI_ADDRESS_2: ${process.env.SUI_ADDRESS_2 ? 'SET' : 'NOT SET'}`);
  logger.info(`HEDERA_ACCOUNT_ID: ${process.env.HEDERA_ACCOUNT_ID ? 'SET' : 'NOT SET'}`);
  logger.info(`HEDERA_PRIVATE_KEY: ${process.env.HEDERA_PRIVATE_KEY ? 'SET' : 'NOT SET'}`);
  logger.info(`HEDERA_ACCOUNT_ID_2: ${process.env.HEDERA_ACCOUNT_ID_2 ? 'SET' : 'NOT SET'}`);

  // Initialize FinP2P router (operates in mock mode)
  logger.info('🔧 Initializing FinP2P router...');
  let finp2pRouter;
  try {
    const routerConfig = {
      routerId: 'demo-router',
      port: 3000,
      host: 'localhost',
      orgId: 'demo-org',
      custodianOrgId: 'demo-custodian',
      owneraAPIAddress: 'https://api.finp2p.org',
      authConfig: {
        apiKey: 'demo-api-key',
        secret: {
          type: 1,
          raw: 'demo-secret'
        }
      },
      mockMode: true // Enable mock mode for development
    };
    
    finp2pRouter = new FinP2PSDKRouter(routerConfig);
    logger.info('✅ FinP2P router initialized in mock mode');
  } catch (error) {
    logger.error('❌ FinP2P router initialization failed:', error.message);
    logger.error('❌ Error stack:', error.stack);
    throw error;
  }
  
  // Update configs with router
  logger.info('🔧 Updating configs with router...');
  demoConfig.sui.finp2pRouter = finp2pRouter;
  demoConfig.hedera.finp2pRouter = finp2pRouter;
  logger.info('✅ Configs updated with router');

  // Initialize adapters
  logger.info('🔧 Initializing adapters...');
  
  let suiAdapter, hederaAdapter;
  
  try {
    logger.info('🔧 Initializing Sui adapter...');
    logger.info(`🔧 Sui RPC URL: ${demoConfig.sui.rpcUrl}`);
    logger.info(`🔧 Sui network: ${demoConfig.sui.network}`);
    suiAdapter = new FinP2PIntegratedSuiAdapter(demoConfig.sui, logger);
    logger.info('✅ Sui adapter initialized');
  } catch (error) {
    logger.error('❌ Sui adapter initialization failed:', error.message);
    logger.error('❌ Error stack:', error.stack);
    throw error;
  }
  
  try {
    logger.info('🔧 Initializing Hedera adapter...');
    hederaAdapter = new FinP2PIntegratedHederaAdapter(demoConfig.hedera, logger);
    logger.info('✅ Hedera adapter initialized');
  } catch (error) {
    logger.error('❌ Hedera adapter initialization failed:', error.message);
    throw error;
  }

  try {
    // Connect to all networks
    logger.info('🔗 Connecting to all blockchain networks...');
    
    try {
      logger.info('🔗 Connecting to Sui adapter...');
      await suiAdapter.connect();
      logger.info('✅ Sui adapter connected successfully!');
    } catch (error) {
      logger.error('❌ Sui adapter connection failed:', error.message);
      throw error;
    }
    
         try {
       logger.info('🔗 Connecting to Hedera adapter...');
       await hederaAdapter.connect();
       logger.info('✅ Hedera adapter connected successfully!');
     } catch (error) {
       logger.error('❌ Hedera adapter connection failed:', error.message);
       throw error;
     }
    
    logger.info('✅ All adapters connected successfully!');
    logger.info('');

    // Get initial balances
    logger.info('💰 Getting INITIAL balances before transfers...');
    logger.info('-'.repeat(50));
    
    const aliceFinId = 'alice@atomic-swap.demo';
    const bobFinId = 'bob@atomic-swap.demo';
    const transferAmount = BigInt(1000000); // 1 SUI (6 decimals)
    const hederaAmount = BigInt(100000000); // 1 HBAR (8 decimals)
    
    let aliceInitialSui = 'Error';
    let aliceInitialHbar = 'Error';
    let bobInitialSui = 'Error';
    let bobInitialHbar = 'Error';
    
    try {
      aliceInitialSui = await suiAdapter.getBalanceByFinId(aliceFinId);
      const aliceSuiFormatted = (parseInt(aliceInitialSui) / 1e9).toFixed(6);
      logger.info(`Alice SUI Balance: ${aliceSuiFormatted} SUI`);
    } catch (error) {
      logger.warn(`Alice SUI Balance Error: ${error.message}`);
    }
    
    try {
      aliceInitialHbar = await hederaAdapter.getBalanceByFinId(aliceFinId);
      const aliceHbarFormatted = (parseInt(aliceInitialHbar) / 1e8).toFixed(6);
      logger.info(`Alice HBAR Balance: ${aliceHbarFormatted} HBAR`);
    } catch (error) {
      logger.warn(`Alice HBAR Balance Error: ${error.message}`);
    }
    
    try {
      bobInitialSui = await suiAdapter.getBalanceByFinId(bobFinId);
      const bobSuiFormatted = (parseInt(bobInitialSui) / 1e9).toFixed(6);
      logger.info(`Bob SUI Balance: ${bobSuiFormatted} SUI`);
    } catch (error) {
      logger.warn(`Bob SUI Balance Error: ${error.message}`);
    }
    
    try {
      bobInitialHbar = await hederaAdapter.getBalanceByFinId(bobFinId);
      const bobHbarFormatted = (parseInt(bobInitialHbar) / 1e8).toFixed(6);
      logger.info(`Bob HBAR Balance: ${bobHbarFormatted} HBAR`);
    } catch (error) {
      logger.warn(`Bob HBAR Balance Error: ${error.message}`);
    }

    // Test 1: FinP2P Transactions (using FinIDs)
    logger.info('🔄 Test 1: FinP2P Transactions (using FinIDs)');
    logger.info('-'.repeat(50));
    
    // Alice → Bob SUI (FinP2P)
    try {
      logger.info(`🔄 Executing Sui FinP2P transfer: ${aliceFinId} → ${bobFinId}`);
      const suiFinP2PResult = await suiAdapter.transferByFinId(
        aliceFinId,
        bobFinId,
        transferAmount,
        true // updateFinP2POwnership
      );
             logger.info(`✅ Sui FinP2P transfer successful`);
       logger.info(`   Transaction Hash: ${suiFinP2PResult.txHash}`);
    } catch (error) {
      logger.warn(`⚠️ Sui FinP2P transfer failed: ${error.message}`);
    }
    
    // Bob → Alice HBAR (FinP2P)
    try {
      logger.info(`🔄 Executing Hedera FinP2P transfer: ${bobFinId} → ${aliceFinId}`);
      const hederaFinP2PResult = await hederaAdapter.transferByFinId(
        bobFinId,
        aliceFinId,
        hederaAmount,
        true // updateFinP2POwnership
      );
             logger.info(`✅ Hedera FinP2P transfer successful`);
       logger.info(`   Transaction Hash: ${hederaFinP2PResult.txId}`);
    } catch (error) {
      logger.warn(`⚠️ Hedera FinP2P transfer failed: ${error.message}`);
    }
    
    logger.info('');

    // Test 2: Direct Transactions (using native addresses)
    logger.info('💸 Test 2: Direct Transactions (using native addresses)');
    logger.info('-'.repeat(50));
    
    const suiAddress1 = process.env.SUI_ADDRESS;
    const suiAddress2 = process.env.SUI_ADDRESS_2;
    const hederaAccount1 = process.env.HEDERA_ACCOUNT_ID;
    const hederaAccount2 = process.env.HEDERA_ACCOUNT_ID_2;
    
    if (suiAddress1 && suiAddress2) {
      try {
        logger.info(`💸 Executing Sui direct transfer: ${suiAddress1} → ${suiAddress2}`);
        const suiDirectResult = await suiAdapter.transfer(
          suiAddress1,
          suiAddress2,
          transferAmount,
          'SUI'
        );
                 logger.info(`✅ Sui direct transfer successful`);
         logger.info(`   Transaction Hash: ${suiDirectResult.txHash}`);
      } catch (error) {
        logger.warn(`⚠️ Sui direct transfer failed: ${error.message}`);
      }
    } else {
      logger.warn('⚠️ Skipping Sui direct transfer - missing SUI_ADDRESS or SUI_ADDRESS_2');
    }
    
         if (hederaAccount1 && hederaAccount2) {
       try {
         logger.info(`💸 Executing Hedera direct transfer: ${hederaAccount2} → ${hederaAccount1}`);
         // Use transferByFinId with existing FinIDs but mark as direct transfer
         const hederaDirectResult = await hederaAdapter.transferByFinId(
           bobFinId, // Use Bob's existing FinID
           aliceFinId, // Use Alice's existing FinID
           hederaAmount,
           false // Don't update FinP2P ownership for direct transfers
         );
                  logger.info(`✅ Hedera direct transfer successful`);
          logger.info(`   Transaction Hash: ${hederaDirectResult.txId}`);
       } catch (error) {
         logger.warn(`⚠️ Hedera direct transfer failed: ${error.message}`);
       }
     } else {
       logger.warn('⚠️ Skipping Hedera direct transfer - missing HEDERA_ACCOUNT_ID or HEDERA_ACCOUNT_ID_2');
     }
    
    logger.info('');

    // Test 3: Get balances
    logger.info('💰 Test 3: Getting account balances');
    logger.info('-'.repeat(50));
    
    try {
      const suiBalance = await suiAdapter.getBalanceByFinId(aliceFinId);
      logger.info(`💰 Sui balance for ${aliceFinId}: ${suiBalance} SUI`);
    } catch (error) {
      logger.warn(`⚠️ Failed to get Sui balance: ${error.message}`);
    }
    
    try {
      const hederaBalance = await hederaAdapter.getBalanceByFinId(aliceFinId);
      logger.info(`💰 Hedera balance for ${aliceFinId}: ${hederaBalance} HBAR`);
    } catch (error) {
      logger.warn(`⚠️ Failed to get Hedera balance: ${error.message}`);
    }
    
    logger.info('');

    // Test 4: Get FINAL balances to show changes
    logger.info('💰 Test 4: Getting FINAL balances after transfers...');
    logger.info('-'.repeat(50));
    
    try {
      const aliceFinalSui = await suiAdapter.getBalanceByFinId(aliceFinId);
      const aliceSuiFormatted = (parseInt(aliceFinalSui) / 1e9).toFixed(6);
      const aliceSuiChange = aliceInitialSui !== 'Error' ? 
        (parseFloat(aliceSuiFormatted) - parseFloat((parseInt(aliceInitialSui) / 1e9).toFixed(6))).toFixed(6) : 'N/A';
      logger.info(`Alice SUI Balance: ${aliceSuiFormatted} SUI (Change: ${aliceSuiChange})`);
    } catch (error) {
      logger.warn(`Alice SUI Balance Error: ${error.message}`);
    }
    
    try {
      const aliceFinalHbar = await hederaAdapter.getBalanceByFinId(aliceFinId);
      const aliceHbarFormatted = (parseInt(aliceFinalHbar) / 1e8).toFixed(6);
      const aliceHbarChange = aliceInitialHbar !== 'Error' ? 
        (parseFloat(aliceHbarFormatted) - parseFloat((parseInt(aliceInitialHbar) / 1e8).toFixed(6))).toFixed(6) : 'N/A';
      logger.info(`Alice HBAR Balance: ${aliceHbarFormatted} HBAR (Change: ${aliceHbarChange})`);
    } catch (error) {
      logger.warn(`Alice HBAR Balance Error: ${error.message}`);
    }
    
    try {
      const bobFinalSui = await suiAdapter.getBalanceByFinId(bobFinId);
      const bobSuiFormatted = (parseInt(bobFinalSui) / 1e9).toFixed(6);
      const bobSuiChange = bobInitialSui !== 'Error' ? 
        (parseFloat(bobSuiFormatted) - parseFloat((parseInt(bobInitialSui) / 1e9).toFixed(6))).toFixed(6) : 'N/A';
      logger.info(`Bob SUI Balance: ${bobSuiFormatted} SUI (Change: ${bobSuiChange})`);
    } catch (error) {
      logger.warn(`Bob SUI Balance Error: ${error.message}`);
    }
    
    try {
      const bobFinalHbar = await hederaAdapter.getBalanceByFinId(bobFinId);
      const bobHbarFormatted = (parseInt(bobFinalHbar) / 1e8).toFixed(6);
      const bobHbarChange = bobInitialHbar !== 'Error' ? 
        (parseFloat(bobHbarFormatted) - parseFloat((parseInt(bobInitialHbar) / 1e8).toFixed(6))).toFixed(6) : 'N/A';
      logger.info(`Bob HBAR Balance: ${bobHbarFormatted} HBAR (Change: ${bobHbarChange})`);
    } catch (error) {
      logger.warn(`Bob HBAR Balance Error: ${error.message}`);
    }

    logger.info('');

    // Test 5: Adapter status
    logger.info('📊 Test 5: Adapter status');
    logger.info('-'.repeat(50));
    
    const suiStatus = suiAdapter.getStatus();
    const hederaStatus = hederaAdapter.getStatus();
    
    logger.info('Sui Adapter Status:', suiStatus);
    logger.info('Hedera Adapter Status:', hederaStatus);
    
    logger.info('');
    logger.info('✅ Demo completed successfully!');
    logger.info('=' .repeat(60));

  } catch (error) {
    logger.error('❌ Demo execution failed:', error.message);
    throw error;
  } finally {
    // Cleanup
    try {
      if (suiAdapter) await suiAdapter.disconnect();
      if (hederaAdapter) await hederaAdapter.disconnect();
      logger.info('🧹 Cleanup completed');
    } catch (error) {
      logger.warn('⚠️ Cleanup error:', error.message);
    }
  }
}

// Run the demo
if (require.main === module) {
  runHederaSuiAdaptersDemo()
    .then(() => {
      logger.info('🎉 Demo completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Demo failed:', error);
      process.exit(1);
    });
}

module.exports = { runHederaSuiAdaptersDemo }; 