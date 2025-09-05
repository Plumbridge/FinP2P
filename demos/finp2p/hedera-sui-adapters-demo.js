require('dotenv').config({ path: '../../.env' });
const winston = require('winston');
const { 
  FinP2PIntegratedSuiAdapter,
  FinP2PIntegratedHederaAdapter
} = require('../../dist/adapters/finp2p');

const { FinP2PSDKRouter } = require('../../dist/core/router');

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
      account1: {
        accountId: process.env.HEDERA_ACCOUNT_ID || '0.0.123456',
        privateKey: process.env.HEDERA_PRIVATE_KEY || '302e020100300506032b657004220420...'
      },
      account2: {
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

  // Results tracking for summary
  const results = {
    router: 'pending',
    suiConnect: 'pending',
    hederaConnect: 'pending',
    suiTransfer: 'pending',
    hederaTransfer: 'pending',
    finalBalances: 'pending',
  };

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
      routerId: process.env.FINP2P_ROUTER_ID || 'demo-router',
      port: parseInt(process.env.FINP2P_ROUTER_PORT) || 3000,
      host: process.env.FINP2P_ROUTER_HOST || 'localhost',
      orgId: process.env.FINP2P_ORG_ID || 'demo-org',
      custodianOrgId: process.env.FINP2P_CUSTODIAN_ORG_ID || 'demo-custodian',
      owneraAPIAddress: process.env.OWNERA_API_ADDRESS || 'https://api.finp2p.org',
      authConfig: {
        apiKey: process.env.FINP2P_API_KEY || 'demo-api-key',
        secret: {
          type: 1,
          raw: process.env.FINP2P_SECRET || 'demo-secret'
        }
      },
      mockMode: true // Enable mock mode for development
    };
    
    finp2pRouter = new FinP2PSDKRouter(routerConfig);
    logger.info('✅ FinP2P router initialized (mock mode: no external network calls)');
    results.router = 'success';
  } catch (error) {
    logger.error('❌ FinP2P router initialization failed:', error.message);
    logger.error('❌ Error stack:', error.stack);
    results.router = 'failed';
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
      results.suiConnect = 'success';
    } catch (error) {
      logger.error('❌ Sui adapter connection failed:', error.message);
      results.suiConnect = 'failed';
      throw error;
    }
    
    try {
      logger.info('🔗 Connecting to Hedera adapter...');
      await hederaAdapter.connect();
      logger.info('✅ Hedera adapter connected successfully!');
      results.hederaConnect = 'success';
    } catch (error) {
      logger.error('❌ Hedera adapter connection failed:', error.message);
      results.hederaConnect = 'failed';
      throw error;
    }
    
    logger.info('✅ All adapters connected successfully!');
    logger.info('');

    // Get initial balances
    logger.info('💰 Getting INITIAL balances before transfers');
    logger.info('-'.repeat(50));
    
    const account1FinId = process.env.FINP2P_ACCOUNT1_FINID || 'account1@atomic-swap.demo';
    const account2FinId = process.env.FINP2P_ACCOUNT2_FINID || 'account2@atomic-swap.demo';
    const transferAmount = BigInt(process.env.SUI_TRANSFER_AMOUNT || '1000000'); // Configurable SUI amount
    const hederaAmount = BigInt(process.env.HEDERA_TRANSFER_AMOUNT || '100000000'); // Configurable HBAR amount
    
    let account1InitialSui = 'Error';
    let account1InitialHbar = 'Error';
    let account2InitialSui = 'Error';
    let account2InitialHbar = 'Error';
    
    try {
      account1InitialSui = await suiAdapter.getBalanceByFinId(account1FinId);
      const account1SuiFormatted = (parseInt(account1InitialSui) / 1e9).toFixed(6);
      logger.info(`Account 1 SUI Balance: ${account1SuiFormatted} SUI`);
    } catch (error) {
      logger.warn(`Account 1 SUI Balance Error: ${error.message}`);
    }
    
    try {
      account1InitialHbar = await hederaAdapter.getBalanceByFinId(account1FinId);
      const account1HbarFormatted = (parseInt(account1InitialHbar) / 1e8).toFixed(6);
      logger.info(`Account 1 HBAR Balance: ${account1HbarFormatted} HBAR`);
    } catch (error) {
      logger.warn(`Account 1 HBAR Balance Error: ${error.message}`);
    }
    
    try {
      account2InitialSui = await suiAdapter.getBalanceByFinId(account2FinId);
      const account2SuiFormatted = (parseInt(account2InitialSui) / 1e9).toFixed(6);
      logger.info(`Account 2 SUI Balance: ${account2SuiFormatted} SUI`);
    } catch (error) {
      logger.warn(`Account 2 SUI Balance Error: ${error.message}`);
    }
    
    try {
      account2InitialHbar = await hederaAdapter.getBalanceByFinId(account2FinId);
      const account2HbarFormatted = (parseInt(account2InitialHbar) / 1e8).toFixed(6);
      logger.info(`Account 2 HBAR Balance: ${account2HbarFormatted} HBAR`);
        } catch (error) {
      logger.warn(`Account 2 HBAR Balance Error: ${error.message}`);
    }

    // Test 1: FinP2P Transactions (using FinIDs)
    logger.info('🔄 Test 1: FinP2P-coordinated transfers (using FinIDs)');
    logger.info('-'.repeat(50));
    
    // Account 1 → Account 2 SUI (FinP2P)
    try {
      logger.info(`🔄 Executing Sui FinP2P transfer: ${account1FinId} → ${account2FinId}`);
      const suiFinP2PResult = await suiAdapter.transferByFinId(
        account1FinId,
        account2FinId,
        transferAmount,
        true // updateFinP2POwnership
      );
             logger.info(`✅ Sui FinP2P transfer successful`);
       logger.info(`   Transaction Hash: ${suiFinP2PResult.txHash}`);
      results.suiTransfer = 'success';
    } catch (error) {
      logger.warn(`⚠️ Sui FinP2P transfer failed: ${error.message}`);
      results.suiTransfer = 'failed';
    }
    
    // Account 2 → Account 1 HBAR (FinP2P)
    try {
      logger.info(`🔄 Executing Hedera FinP2P transfer: ${account2FinId} → ${account1FinId}`);
      const hederaFinP2PResult = await hederaAdapter.transferByFinId(
        account2FinId,
        account1FinId,
        hederaAmount,
        true // updateFinP2POwnership
      );
             logger.info(`✅ Hedera FinP2P transfer successful`);
       logger.info(`   Transaction Hash: ${hederaFinP2PResult.txId}`);
        } catch (error) {
      logger.warn(`⚠️ Hedera FinP2P transfer failed: ${error.message}`);
      results.hederaTransfer = 'failed';
    }
    if (results.hederaTransfer === 'pending') {
      results.hederaTransfer = 'success';
    }
    
    logger.info('');

    // Test 2: Direct Transactions (using native addresses)
    logger.info('💸 Test 2: Direct transactions (using native addresses)');
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
           account2FinId, // Use Account 2's existing FinID
           account1FinId, // Use Account 1's existing FinID
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
    logger.info('💰 Test 3: Getting account balances (after Test 1 & 2)');
    logger.info('-'.repeat(50));
    
    try {
      const suiBalance = await suiAdapter.getBalanceByFinId(account1FinId);
      logger.info(`💰 Sui balance for ${account1FinId}: ${suiBalance} SUI`);
        } catch (error) {
      logger.warn(`⚠️ Failed to get Sui balance: ${error.message}`);
    }
    
    try {
      const hederaBalance = await hederaAdapter.getBalanceByFinId(account1FinId);
      logger.info(`💰 Hedera balance for ${account1FinId}: ${hederaBalance} HBAR`);
    } catch (error) {
      logger.warn(`⚠️ Failed to get Hedera balance: ${error.message}`);
    }
    
    logger.info('');

    // Test 4: Get FINAL balances to show changes
    logger.info('💰 Test 4: Getting FINAL balances after transfers');
    logger.info('-'.repeat(50));
    
    try {
      const account1FinalSui = await suiAdapter.getBalanceByFinId(account1FinId);
      const account1SuiFormatted = (parseInt(account1FinalSui) / 1e9).toFixed(6);
      const account1SuiChange = account1InitialSui !== 'Error' ? 
        (parseFloat(account1SuiFormatted) - parseFloat((parseInt(account1InitialSui) / 1e9).toFixed(6))).toFixed(6) : 'N/A';
      logger.info(`Account 1 SUI Balance: ${account1SuiFormatted} SUI (Change: ${account1SuiChange})`);
        } catch (error) {
      logger.warn(`Account 1 SUI Balance Error: ${error.message}`);
    }
    
    try {
      const account1FinalHbar = await hederaAdapter.getBalanceByFinId(account1FinId);
      const account1HbarFormatted = (parseInt(account1FinalHbar) / 1e8).toFixed(6);
      const account1HbarChange = account1InitialHbar !== 'Error' ? 
        (parseFloat(account1HbarFormatted) - parseFloat((parseInt(account1InitialHbar) / 1e8).toFixed(6))).toFixed(6) : 'N/A';
      logger.info(`Account 1 HBAR Balance: ${account1HbarFormatted} HBAR (Change: ${account1HbarChange})`);
    } catch (error) {
      logger.warn(`Account 1 HBAR Balance Error: ${error.message}`);
    }
    
    try {
      const account2FinalSui = await suiAdapter.getBalanceByFinId(account2FinId);
      const account2SuiFormatted = (parseInt(account2FinalSui) / 1e9).toFixed(6);
      const account2SuiChange = account2InitialSui !== 'Error' ? 
        (parseFloat(account2SuiFormatted) - parseFloat((parseInt(account2InitialSui) / 1e9).toFixed(6))).toFixed(6) : 'N/A';
      logger.info(`Account 2 SUI Balance: ${account2SuiFormatted} SUI (Change: ${account2SuiChange})`);
    } catch (error) {
      logger.warn(`Account 2 SUI Balance Error: ${error.message}`);
    }
    
    try {
      const account2FinalHbar = await hederaAdapter.getBalanceByFinId(account2FinId);
      const account2HbarFormatted = (parseInt(account2FinalHbar) / 1e8).toFixed(6);
      const account2HbarChange = account2InitialHbar !== 'Error' ? 
        (parseFloat(account2HbarFormatted) - parseFloat((parseInt(account2InitialHbar) / 1e8).toFixed(6))).toFixed(6) : 'N/A';
      logger.info(`Account 2 HBAR Balance: ${account2HbarFormatted} HBAR (Change: ${account2HbarChange})`);
      } catch (error) {
      logger.warn(`Account 2 HBAR Balance Error: ${error.message}`);
    }

    // Mark final balances section as completed
    results.finalBalances = 'success';

    logger.info('');

    // Test 5: Adapter status
    logger.info('📊 Test 5: Adapter status');
    logger.info('-'.repeat(50));
    
    const suiStatus = suiAdapter.getStatus();
    const hederaStatus = hederaAdapter.getStatus();
    
    logger.info('Sui Adapter Status:', suiStatus);
    logger.info('Hedera Adapter Status:', hederaStatus);
    
    logger.info('');

    // Summary
    const icon = (s) => (s === 'success' ? '✅' : s === 'skipped' ? '⏭️' : '❌');
    logger.info('\n📊 Hedera & Sui Adapters Demo Summary');
    logger.info('======================================');
    logger.info(`   Router: ${icon(results.router)}`);
    logger.info(`   Sui Connect: ${icon(results.suiConnect)}`);
    logger.info(`   Hedera Connect: ${icon(results.hederaConnect)}`);
    logger.info(`   Sui Transfer: ${icon(results.suiTransfer)}`);
    logger.info(`   Hedera Transfer: ${icon(results.hederaTransfer)}`);
    logger.info(`   Final Balances: ${icon(results.finalBalances)}`);

    logger.info('');
    logger.info('✅ Demo completed successfully!');
    logger.info('='.repeat(60));

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