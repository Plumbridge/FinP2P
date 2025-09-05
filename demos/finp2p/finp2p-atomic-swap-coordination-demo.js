// Load environment variables from .env file
require('dotenv').config({ path: '../../.env' });

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
    const required = {
      'SUI_RPC_URL': 'Sui RPC URL',
      'SUI_PRIVATE_KEY': 'Sui private key',
      'SUI_ADDRESS': 'Sui wallet address',
      'SUI_ADDRESS_2': 'Second Sui wallet address',
      'HEDERA_ACCOUNT_ID': 'Hedera account ID',
      'HEDERA_PRIVATE_KEY': 'Hedera private key',
      'HEDERA_ACCOUNT_ID_2': 'Second Hedera account ID',
      'HEDERA_PRIVATE_KEY_2': 'Second Hedera private key'
    };

    const missing = [];
    for (const [key, description] of Object.entries(required)) {
      if (!process.env[key]) {
        missing.push(`${key} (${description})`);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables:\n${missing.map(item => `   • ${item}`).join('\n')}\n\nPlease check your .env file and ensure all required variables are set.`);
    }

    console.log('✅ Environment variables validated');
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

      await suiAdapter.connect();
      this.emit('progress', { message: '✅ Sui adapter connected and ready for atomic swap coordination' });
      results.suiConnect = 'success';

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

      await hederaAdapter.connect();
      this.emit('progress', { message: '✅ Hedera adapter connected and ready for atomic swap coordination' });
      results.hederaConnect = 'success';

      // Get initial balances
      this.emit('progress', { message: '\n💰 Getting INITIAL balances before atomic swap...' });
      
      let account1InitialSui = 'Error';
      let account1InitialHbar = 'Error';
      let account2InitialSui = 'Error';
      let account2InitialHbar = 'Error';
      
      try {
        account1InitialSui = await suiAdapter.getBalanceByFinId(account1FinId);
        const account1SuiFormatted = (parseInt(account1InitialSui) / 1e9).toFixed(6);
        this.emit('progress', { message: `Account 1 SUI Balance: ${account1SuiFormatted} SUI` });
      } catch (error) {
        this.emit('progress', { message: `Account 1 SUI Balance Error: ${error.message}` });
      }
      
      try {
        account1InitialHbar = await hederaAdapter.getBalanceByFinId(account1FinId);
        const account1HbarFormatted = (parseInt(account1InitialHbar) / 1e8).toFixed(6);
        this.emit('progress', { message: `Account 1 HBAR Balance: ${account1HbarFormatted} HBAR` });
      } catch (error) {
        this.emit('progress', { message: `Account 1 HBAR Balance Error: ${error.message}` });
      }
      
      try {
        account2InitialSui = await suiAdapter.getBalanceByFinId(account2FinId);
        const account2SuiFormatted = (parseInt(account2InitialSui) / 1e9).toFixed(6);
        this.emit('progress', { message: `Account 2 SUI Balance: ${account2SuiFormatted} SUI` });
      } catch (error) {
        this.emit('progress', { message: `Account 2 SUI Balance Error: ${error.message}` });
      }
      
      try {
        account2InitialHbar = await hederaAdapter.getBalanceByFinId(account2FinId);
        const account2HbarFormatted = (parseInt(account2InitialHbar) / 1e8).toFixed(6);
        this.emit('progress', { message: `Account 2 HBAR Balance: ${account2HbarFormatted} HBAR` });
      } catch (error) {
        this.emit('progress', { message: `Account 2 HBAR Balance Error: ${error.message}` });
      }

      // Execute Atomic Swap Coordination
      this.emit('progress', { message: '\n🔄 Executing FinP2P Atomic Swap Coordination...' });
      this.emit('progress', { message: '=================================================' });
      
      // Step 1: Account 1 sends SUI to Account 2 (coordinated via FinP2P)
      this.emit('progress', { message: '\n📤 Step 1: Account 1 sends SUI to Account 2 (via FinP2P coordination)' });
      
      try {
        const account1ToAccount2Sui = await suiAdapter.transferByFinId(
          account1FinId,
          account2FinId,
          BigInt(process.env.SUI_TRANSFER_AMOUNT || '1000000'), // Configurable SUI amount
          true
        );
        
        this.emit('progress', { message: '✅ Account 1 → Account 2 SUI transfer completed successfully' });
        this.emit('progress', { message: `   Transaction Hash: ${account1ToAccount2Sui.txHash}`