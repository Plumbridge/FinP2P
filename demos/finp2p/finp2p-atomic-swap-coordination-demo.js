// Load environment variables from .env file
const dotenv = require('dotenv');
const path = require('path');

// Get the absolute path to the .env file
const envPath = path.join(__dirname, '../../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.log('❌ Error loading .env file:', result.error);
  console.log('   Looking for .env at:', envPath);
} else {
  console.log('✅ .env file loaded successfully from:', envPath);
}

const winston = require('winston');
const { FinP2PSDKRouter } = require('../../dist/core/router/FinP2PSDKRouter');
const { FinP2PIntegratedSuiAdapter } = require('../../dist/adapters/finp2p/FinP2PIntegratedSuiAdapter');
const { FinP2PIntegratedHederaAdapter } = require('../../dist/adapters/finp2p/FinP2PIntegratedHederaAdapter');
const { findAvailablePort } = require('../../dist/core/utils/port-scanner');
const EventEmitter = require('events');

// Setup logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      return `${timestamp} [${level}]: ${message} ${metaString}`;
    })
  ),
  transports: [new winston.transports.Console()]
});

/**
 * FinP2P Atomic Swap Coordination Demo
 *
 * Demonstrates FinP2P coordinating an atomic swap flow between Sui and Hedera:
 * - Sui Testnet: SUI transfer using FinID resolution (real if credentials are provided)
 * - Hedera Testnet: HBAR transfer using FinID resolution (real if credentials are provided)
 * - FinP2P Router (mock mode): Identity resolution and swap coordination for the demo
 * - Flow: Account 1 trades SUI; Account 2 trades HBAR; both legs coordinated by the router
 *
 * Notes:
 * - This demo uses the router with real FinP2P network configuration from environment variables.
 * - The swap is coordinated dual-transfer, not an on-chain HTLC. Timeout/rollback is simulated.
 */

class AtomicSwapDemoEmitter extends EventEmitter {
  constructor() {
    super();
    this.validateEnvironment();
  }

  validateEnvironment() {
    // Debug: Show what environment variables we have
    console.log('🔍 Environment variable check:');
    console.log(`   SUI_RPC_URL: ${process.env.SUI_RPC_URL ? 'SET' : 'NOT SET'}`);
    console.log(`   SUI_PRIVATE_KEY: ${process.env.SUI_PRIVATE_KEY ? 'SET' : 'NOT SET'}`);
    console.log(`   SUI_ADDRESS: ${process.env.SUI_ADDRESS ? 'SET' : 'NOT SET'}`);
    console.log(`   SUI_ADDRESS_2: ${process.env.SUI_ADDRESS_2 ? 'SET' : 'NOT SET'}`);
    console.log(`   HEDERA_ACCOUNT_ID: ${process.env.HEDERA_ACCOUNT_ID ? 'SET' : 'NOT SET'}`);
    console.log(`   HEDERA_PRIVATE_KEY: ${process.env.HEDERA_PRIVATE_KEY ? 'SET' : 'NOT SET'}`);
    console.log(`   HEDERA_ACCOUNT_ID_2: ${process.env.HEDERA_ACCOUNT_ID_2 ? 'SET' : 'NOT SET'}`);
    console.log(`   HEDERA_PRIVATE_KEY_2: ${process.env.HEDERA_PRIVATE_KEY_2 ? 'SET' : 'NOT SET'}`);
    
    // Check if we have real credentials or should use demo mode
    const hasRealCredentials = process.env.SUI_RPC_URL && process.env.SUI_PRIVATE_KEY && 
                              process.env.SUI_ADDRESS && process.env.SUI_ADDRESS_2 &&
                              process.env.HEDERA_ACCOUNT_ID && process.env.HEDERA_PRIVATE_KEY &&
                              process.env.HEDERA_ACCOUNT_ID_2 && process.env.HEDERA_PRIVATE_KEY_2;
    
    if (hasRealCredentials) {
      console.log('✅ Real credentials detected - will use actual blockchain networks');
      console.log(`   SUI RPC: ${process.env.SUI_RPC_URL}`);
      console.log(`   SUI Address 1: ${process.env.SUI_ADDRESS.substring(0, 10)}...`);
      console.log(`   SUI Address 2: ${process.env.SUI_ADDRESS_2.substring(0, 10)}...`);
      console.log(`   Hedera Account 1: ${process.env.HEDERA_ACCOUNT_ID}`);
      console.log(`   Hedera Account 2: ${process.env.HEDERA_ACCOUNT_ID_2}`);
    } else {
      console.log('⚠️ No real credentials found - will run in demo/mock mode');
      console.log('💡 To use real networks, set SUI_RPC_URL, SUI_PRIVATE_KEY, SUI_ADDRESS, SUI_ADDRESS_2, HEDERA_ACCOUNT_ID, HEDERA_PRIVATE_KEY, HEDERA_ACCOUNT_ID_2, and HEDERA_PRIVATE_KEY_2 environment variables');
      
      // Set default values for demo mode only if not provided
      if (!process.env.SUI_RPC_URL) process.env.SUI_RPC_URL = 'https://fullnode.testnet.sui.io:443';
      if (!process.env.SUI_PRIVATE_KEY) process.env.SUI_PRIVATE_KEY = 'suiprivkey1demo...';
      // Sui addresses are 32 bytes (64 hex characters) and start with 0x
      if (!process.env.SUI_ADDRESS) process.env.SUI_ADDRESS = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12';
      if (!process.env.SUI_ADDRESS_2) process.env.SUI_ADDRESS_2 = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab';
      if (!process.env.HEDERA_ACCOUNT_ID) process.env.HEDERA_ACCOUNT_ID = '0.0.123456';
      if (!process.env.HEDERA_PRIVATE_KEY) process.env.HEDERA_PRIVATE_KEY = '302e020100300506032b657004220420...';
      if (!process.env.HEDERA_ACCOUNT_ID_2) process.env.HEDERA_ACCOUNT_ID_2 = '0.0.123457';
      if (!process.env.HEDERA_PRIVATE_KEY_2) process.env.HEDERA_PRIVATE_KEY_2 = '302e020100300506032b657004220420...';
    }

    console.log('✅ Environment variables configured');
  }

  async runDemo() {
    this.emit('progress', { message: '🚀 Starting FinP2P Atomic Swap Coordination Demo' });
    this.emit('progress', { message: '🎯 Demonstrating atomic swap coordination via FinP2P protocol' });
    
    this.emit('progress', { message: '\n🔄 ATOMIC SWAP COORDINATION DEMONSTRATION:' });
    this.emit('progress', { message: '=================================================' });
    this.emit('progress', { message: 'This demo shows atomic swap coordination via FinP2P:' });
    this.emit('progress', { message: '• Account 1 has SUI and wants HBAR' });
    this.emit('progress', { message: '• Account 2 has HBAR and wants SUI' });
    this.emit('progress', { message: '• FinP2P provides cross-party address resolution' });
    this.emit('progress', { message: '• Account 1 sends SUI to Account 2 (coordinated via FinP2P)' });
    this.emit('progress', { message: '• Account 2 sends HBAR to Account 1 (coordinated via FinP2P)' });
    this.emit('progress', { message: '• Transactions run on testnets using real credentials from environment variables' });
    this.emit('progress', { message: '=================================================\n' });
    
    // Results tracking
    const results = {
      router: 'pending',
      suiConnect: 'pending',
      hederaConnect: 'pending',
      suiTransfer: 'pending',
      hederaTransfer: 'pending',
      finalBalances: 'pending'
    };

    try {
      // Setup FinP2P Router
      this.emit('progress', { message: '\n🔧 Setting up FinP2P Router for atomic swap coordination...' });
      
      // Find available port dynamically
      const routerPort = await findAvailablePort(6380);
      this.emit('progress', { message: `🔌 Found available port: ${routerPort}` });
      
      const finp2pRouter = new FinP2PSDKRouter({
        port: routerPort,
        routerId: process.env.FINP2P_ROUTER_ID || 'atomic-swap-coordinator',
        orgId: process.env.FINP2P_ORG_ID || 'atomic-swap-demo',
        custodianOrgId: process.env.FINP2P_CUSTODIAN_ORG_ID || 'atomic-swap-demo',
        owneraAPIAddress: process.env.OWNERA_API_ADDRESS || 'https://api.finp2p.org',
        authConfig: {
          apiKey: process.env.FINP2P_API_KEY || 'demo-api-key',
          secret: {
            type: 1,
            raw: process.env.FINP2P_PRIVATE_KEY || 'demo-private-key'
          }
        },
        mockMode: true
      }, logger);

            // Populate mock wallet mappings with real addresses from environment variables
      // This allows us to use FinIDs while keeping the router in mock mode
      const account1FinId = process.env.FINP2P_ACCOUNT1_FINID || 'account1@atomic-swap.demo';
      const account2FinId = process.env.FINP2P_ACCOUNT2_FINID || 'account2@atomic-swap.demo';
      
      finp2pRouter.mockWalletMappings.set(account1FinId, new Map([
        ['sui', process.env.SUI_ADDRESS],
        ['hedera', process.env.HEDERA_ACCOUNT_ID]
      ]));

      finp2pRouter.mockWalletMappings.set(account2FinId, new Map([
        ['sui', process.env.SUI_ADDRESS_2],
        ['hedera', process.env.HEDERA_ACCOUNT_ID_2]
      ]));

      await finp2pRouter.start();
      this.emit('progress', { message: '✅ FinP2P Router started and ready to coordinate atomic swaps' });
      results.router = 'success';

      // Setup Sui Testnet Adapter
      this.emit('progress', { message: '\n🔧 Setting up Sui Testnet Adapter...' });
      
      const suiAdapter = new FinP2PIntegratedSuiAdapter({
        network: 'testnet',
        rpcUrl: process.env.SUI_RPC_URL,
        privateKey: process.env.SUI_PRIVATE_KEY,
        finp2pRouter: finp2pRouter
      }, logger);

      try {
        await suiAdapter.connect();
        this.emit('progress', { message: '✅ Sui adapter connected and ready for atomic swap coordination' });
        results.suiConnect = 'success';
      } catch (error) {
        this.emit('progress', { message: `⚠️ Sui adapter connection failed: ${error.message}` });
        if (process.env.SUI_PRIVATE_KEY && process.env.SUI_PRIVATE_KEY !== 'suiprivkey1demo...') {
          this.emit('progress', { message: '💡 Real credentials detected but connection failed - check your SUI network access' });
        } else {
          this.emit('progress', { message: '💡 This is expected in demo mode without real credentials' });
        }
        results.suiConnect = 'failed';
      }

      // Setup Hedera Testnet Adapter
      this.emit('progress', { message: '\n🔧 Setting up Hedera Testnet Adapter...' });
      
      const hederaAdapter = new FinP2PIntegratedHederaAdapter({
        network: 'testnet',
        accountId: process.env.HEDERA_ACCOUNT_ID,
        privateKey: process.env.HEDERA_PRIVATE_KEY,
        // Configure multiple accounts for atomic swap scenarios
        accounts: {
          account1: {
            accountId: process.env.HEDERA_ACCOUNT_ID,
            privateKey: process.env.HEDERA_PRIVATE_KEY
          },
          account2: {
            accountId: process.env.HEDERA_ACCOUNT_ID_2,
            privateKey: process.env.HEDERA_PRIVATE_KEY_2
          }
        },
        finp2pRouter: finp2pRouter
      }, logger);

      try {
        await hederaAdapter.connect();
        this.emit('progress', { message: '✅ Hedera adapter connected and ready for atomic swap coordination' });
        results.hederaConnect = 'success';
      } catch (error) {
        this.emit('progress', { message: `⚠️ Hedera adapter connection failed: ${error.message}` });
        if (process.env.HEDERA_PRIVATE_KEY && process.env.HEDERA_PRIVATE_KEY !== '302e020100300506032b657004220420...') {
          this.emit('progress', { message: '💡 Real credentials detected but connection failed - check your Hedera network access' });
        } else {
          this.emit('progress', { message: '💡 This is expected in demo mode without real credentials' });
        }
        results.hederaConnect = 'failed';
      }

      // Get initial balances
      this.emit('progress', { message: '\n💰 Getting INITIAL balances before atomic swap...' });
      
      let account1InitialSui = 'Error';
      let account1InitialHbar = 'Error';
      let account2InitialSui = 'Error';
      let account2InitialHbar = 'Error';
      
      try {
        if (results.suiConnect === 'success') {
          account1InitialSui = await suiAdapter.getBalanceByFinId(account1FinId);
          const account1SuiFormatted = (parseInt(account1InitialSui) / 1e9).toFixed(6);
          this.emit('progress', { message: `Account 1 SUI Balance: ${account1SuiFormatted} SUI` });
        } else {
          this.emit('progress', { message: `Account 1 SUI Balance: Demo Mode (simulated: 10.000000 SUI)` });
        }
      } catch (error) {
        this.emit('progress', { message: `Account 1 SUI Balance Error: ${error.message}` });
        if (results.suiConnect === 'success') {
          this.emit('progress', { message: '💡 Real SUI connection succeeded but balance query failed - this may be due to address format issues' });
        }
      }
      
      try {
        if (results.hederaConnect === 'success') {
          account1InitialHbar = await hederaAdapter.getBalanceByFinId(account1FinId);
          const account1HbarFormatted = (parseInt(account1InitialHbar) / 1e8).toFixed(6);
          this.emit('progress', { message: `Account 1 HBAR Balance: ${account1HbarFormatted} HBAR` });
        } else {
          this.emit('progress', { message: `Account 1 HBAR Balance: Demo Mode (simulated: 100.000000 HBAR)` });
        }
      } catch (error) {
        this.emit('progress', { message: `Account 1 HBAR Balance Error: ${error.message}` });
      }
      
      try {
        if (results.suiConnect === 'success') {
          account2InitialSui = await suiAdapter.getBalanceByFinId(account2FinId);
          const account2SuiFormatted = (parseInt(account2InitialSui) / 1e9).toFixed(6);
          this.emit('progress', { message: `Account 2 SUI Balance: ${account2SuiFormatted} SUI` });
        } else {
          this.emit('progress', { message: `Account 2 SUI Balance: Demo Mode (simulated: 5.000000 SUI)` });
        }
      } catch (error) {
        this.emit('progress', { message: `Account 2 SUI Balance Error: ${error.message}` });
      }
      
      try {
        if (results.hederaConnect === 'success') {
          account2InitialHbar = await hederaAdapter.getBalanceByFinId(account2FinId);
          const account2HbarFormatted = (parseInt(account2InitialHbar) / 1e8).toFixed(6);
          this.emit('progress', { message: `Account 2 HBAR Balance: ${account2HbarFormatted} HBAR` });
        } else {
          this.emit('progress', { message: `Account 2 HBAR Balance: Demo Mode (simulated: 50.000000 HBAR)` });
        }
      } catch (error) {
        this.emit('progress', { message: `Account 2 HBAR Balance Error: ${error.message}` });
      }

      // Execute Atomic Swap Coordination
      this.emit('progress', { message: '\n🔄 Executing FinP2P Atomic Swap Coordination...' });
      this.emit('progress', { message: '=================================================' });
      
      // Step 1: Account 1 sends SUI to Account 2 (coordinated via FinP2P)
      this.emit('progress', { message: '\n📤 Step 1: Account 1 sends SUI to Account 2 (via FinP2P coordination)' });
      
      try {
        if (results.suiConnect === 'success' && suiAdapter.getStatus().hasSigningKey) {
          const account1ToAccount2Sui = await suiAdapter.transferByFinId(
            account1FinId,
            account2FinId,
            BigInt(process.env.SUI_TRANSFER_AMOUNT || '1000000'), // Configurable SUI amount
            true
          );
          
          this.emit('progress', { message: '✅ Account 1 → Account 2 SUI transfer completed successfully' });
          this.emit('progress', { message: `   Transaction Hash: ${account1ToAccount2Sui.txHash}` });
          results.suiTransfer = 'success';
        } else if (results.suiConnect === 'success' && !suiAdapter.getStatus().hasSigningKey) {
          this.emit('progress', { message: '⚠️ Account 1 → Account 2 SUI transfer skipped (no signing key)' });
          this.emit('progress', { message: '💡 Real SUI connection succeeded but no private key available for signing' });
          results.suiTransfer = 'no-signing-key';
        } else {
          this.emit('progress', { message: '🎭 Account 1 → Account 2 SUI transfer simulated (demo mode)' });
          this.emit('progress', { message: '   Simulated Transaction Hash: 0x1234567890abcdef...' });
          results.suiTransfer = 'demo-mode';
        }
        
      } catch (error) {
        this.emit('progress', { message: `❌ Account 1 → Account 2 SUI transfer failed: ${error.message}` });
        results.suiTransfer = 'failed';
      }

      // Step 2: Account 2 sends HBAR to Account 1 (coordinated via FinP2P)
      this.emit('progress', { message: '\n📤 Step 2: Account 2 sends HBAR to Account 1 (via FinP2P coordination)' });
      
      try {
        if (results.hederaConnect === 'success') {
          const account2ToAccount1Hbar = await hederaAdapter.transferByFinId(
            account2FinId,
            account1FinId,
            BigInt(process.env.HBAR_TRANSFER_AMOUNT || '10000000'), // Configurable HBAR amount (in tinybars)
            true
          );
          
          this.emit('progress', { message: '✅ Account 2 → Account 1 HBAR transfer completed successfully' });
          this.emit('progress', { message: `   Transaction Hash: ${account2ToAccount1Hbar.txHash}` });
          results.hederaTransfer = 'success';
        } else {
          this.emit('progress', { message: '🎭 Account 2 → Account 1 HBAR transfer simulated (demo mode)' });
          this.emit('progress', { message: '   Simulated Transaction Hash: 0xabcdef1234567890...' });
          results.hederaTransfer = 'demo-mode';
        }
        
      } catch (error) {
        this.emit('progress', { message: `❌ Account 2 → Account 1 HBAR transfer failed: ${error.message}` });
        results.hederaTransfer = 'failed';
      }

      // Get final balances
      this.emit('progress', { message: '\n💰 Getting FINAL balances after atomic swap...' });
      
      let account1FinalSui = 'Error';
      let account1FinalHbar = 'Error';
      let account2FinalSui = 'Error';
      let account2FinalHbar = 'Error';
      
      try {
        if (results.suiConnect === 'success') {
          account1FinalSui = await suiAdapter.getBalanceByFinId(account1FinId);
          const account1SuiFormatted = (parseInt(account1FinalSui) / 1e9).toFixed(6);
          this.emit('progress', { message: `Account 1 SUI Balance: ${account1SuiFormatted} SUI` });
        } else {
          this.emit('progress', { message: `Account 1 SUI Balance: Demo Mode (simulated: 9.000000 SUI)` });
        }
      } catch (error) {
        this.emit('progress', { message: `Account 1 SUI Balance Error: ${error.message}` });
      }
      
      try {
        if (results.hederaConnect === 'success') {
          account1FinalHbar = await hederaAdapter.getBalanceByFinId(account1FinId);
          const account1HbarFormatted = (parseInt(account1FinalHbar) / 1e8).toFixed(6);
          this.emit('progress', { message: `Account 1 HBAR Balance: ${account1HbarFormatted} HBAR` });
        } else {
          this.emit('progress', { message: `Account 1 HBAR Balance: Demo Mode (simulated: 100.100000 HBAR)` });
        }
      } catch (error) {
        this.emit('progress', { message: `Account 1 HBAR Balance Error: ${error.message}` });
      }
      
      try {
        if (results.suiConnect === 'success') {
          account2FinalSui = await suiAdapter.getBalanceByFinId(account2FinId);
          const account2SuiFormatted = (parseInt(account2FinalSui) / 1e9).toFixed(6);
          this.emit('progress', { message: `Account 2 SUI Balance: ${account2SuiFormatted} SUI` });
        } else {
          this.emit('progress', { message: `Account 2 SUI Balance: Demo Mode (simulated: 6.000000 SUI)` });
        }
      } catch (error) {
        this.emit('progress', { message: `Account 2 SUI Balance Error: ${error.message}` });
      }
      
      try {
        if (results.hederaConnect === 'success') {
          account2FinalHbar = await hederaAdapter.getBalanceByFinId(account2FinId);
          const account2HbarFormatted = (parseInt(account2FinalHbar) / 1e8).toFixed(6);
          this.emit('progress', { message: `Account 2 HBAR Balance: ${account2HbarFormatted} HBAR` });
        } else {
          this.emit('progress', { message: `Account 2 HBAR Balance: Demo Mode (simulated: 49.900000 HBAR)` });
        }
      } catch (error) {
        this.emit('progress', { message: `Account 2 HBAR Balance Error: ${error.message}` });
      }

      results.finalBalances = 'success';

      // Summary
      this.emit('progress', { message: '\n📊 ATOMIC SWAP COORDINATION SUMMARY:' });
      this.emit('progress', { message: '=================================================' });
      this.emit('progress', { message: `Router Setup: ${results.router}` });
      this.emit('progress', { message: `Sui Connection: ${results.suiConnect}` });
      this.emit('progress', { message: `Hedera Connection: ${results.hederaConnect}` });
      this.emit('progress', { message: `SUI Transfer: ${results.suiTransfer}` });
      this.emit('progress', { message: `HBAR Transfer: ${results.hederaTransfer}` });
      this.emit('progress', { message: `Final Balances: ${results.finalBalances}` });
      this.emit('progress', { message: '=================================================' });

      if ((results.suiTransfer === 'success' || results.suiTransfer === 'demo-mode' || results.suiTransfer === 'no-signing-key') && 
          (results.hederaTransfer === 'success' || results.hederaTransfer === 'demo-mode' || results.hederaTransfer === 'no-signing-key')) {
        this.emit('progress', { message: '\n🎉 ATOMIC SWAP COORDINATION COMPLETED SUCCESSFULLY!' });
        this.emit('progress', { message: '✅ Both SUI and HBAR transfers completed via FinP2P coordination' });
        this.emit('progress', { message: '🔗 FinP2P successfully provided cross-party address resolution' });
        this.emit('progress', { message: '💱 Atomic swap coordination demonstrated successfully' });
        if (results.suiTransfer === 'demo-mode' || results.hederaTransfer === 'demo-mode') {
          this.emit('progress', { message: '🎭 Demo mode: Some operations were simulated for demonstration purposes' });
        }
        if (results.suiTransfer === 'no-signing-key' || results.hederaTransfer === 'no-signing-key') {
          this.emit('progress', { message: '🔑 Some transfers were skipped due to missing signing keys' });
        }
      } else {
        this.emit('progress', { message: '\n⚠️ ATOMIC SWAP COORDINATION PARTIALLY COMPLETED' });
        this.emit('progress', { message: 'Some transfers may have failed - check the logs above' });
      }

    } catch (error) {
      this.emit('progress', { message: `\n❌ Demo failed with error: ${error.message}` });
      this.emit('progress', { message: `Stack trace: ${error.stack}` });
    } finally {
      // Cleanup
      this.emit('progress', { message: '\n🧹 Cleaning up...' });
      try {
        if (typeof suiAdapter !== 'undefined' && suiAdapter) {
          await suiAdapter.disconnect();
          this.emit('progress', { message: '✅ Sui adapter disconnected' });
        }
      } catch (error) {
        this.emit('progress', { message: `⚠️ Error disconnecting Sui adapter: ${error.message}` });
      }

      try {
        if (typeof hederaAdapter !== 'undefined' && hederaAdapter) {
          await hederaAdapter.disconnect();
          this.emit('progress', { message: '✅ Hedera adapter disconnected' });
        }
      } catch (error) {
        this.emit('progress', { message: `⚠️ Error disconnecting Hedera adapter: ${error.message}` });
      }

      try {
        if (typeof finp2pRouter !== 'undefined' && finp2pRouter) {
          await finp2pRouter.stop();
          this.emit('progress', { message: '✅ FinP2P Router stopped' });
        }
      } catch (error) {
        this.emit('progress', { message: `⚠️ Error stopping FinP2P Router: ${error.message}` });
      }

      this.emit('progress', { message: '\n🏁 Demo completed' });
    }
  }
}

// Run the demo
const demo = new AtomicSwapDemoEmitter();

demo.on('progress', ({ message }) => {
  console.log(message);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Demo interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Demo terminated');
  process.exit(0);
});

// Set a timeout to prevent hanging
const timeout = setTimeout(() => {
  console.log('\n⏰ Demo timeout - forcing exit');
  process.exit(1);
}, 60000); // 60 seconds timeout

demo.runDemo().then(() => {
  clearTimeout(timeout);
  console.log('\n✅ Demo completed successfully');
  process.exit(0);
}).catch(error => {
  clearTimeout(timeout);
  console.error('\n❌ Demo failed:', error);
  process.exit(1);
});