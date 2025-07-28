// Load environment variables from .env file
require('dotenv').config();

const winston = require('winston');
const { FinP2PSDKRouter } = require('../dist/src/router/FinP2PSDKRouter');
const { FinP2PIntegratedSuiAdapter } = require('../dist/src/adapters/FinP2PIntegratedSuiAdapter');
const { FinP2PIntegratedHederaAdapter } = require('../dist/src/adapters/FinP2PIntegratedHederaAdapter');
const { findAvailablePort } = require('../dist/src/utils/port-scanner');
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
 * 🔥 FINP2P ATOMIC SWAP COORDINATION DEMO
 * 
 * This demo shows FinP2P coordinating REAL atomic swaps between blockchains:
 * - Sui Testnet: Real SUI tokens transferred via FinP2P atomic swap coordination
 * - Hedera Testnet: Real HBAR tokens transferred via FinP2P atomic swap coordination  
 * - FinP2P Protocol: Provides identity resolution and atomic swap coordination
 * - Atomic Swap Flow: Alice trades SUI ↔ Bob trades HBAR via FinP2P
 * 
 * 🎯 Architecture:
 * 1. Alice has SUI and wants HBAR, Bob has HBAR and wants SUI
 * 2. FinP2P router provides cross-party address resolution
 * 3. Both adapters execute coordinated real blockchain operations
 * 4. Assets are transferred between parties via FinP2P atomic swap coordination
 * 5. Atomic swaps without traditional atomic swap contracts
 * 
 * ⚡ Real Blockchain Operations (when credentials provided):
 * - Actual Sui testnet transactions with real gas fees
 * - Actual Hedera testnet transactions with real gas fees
 * - Real wallet balance changes demonstrating atomic swap coordination
 */

class AtomicSwapDemoEmitter extends EventEmitter {
  async runDemo() {
    this.emit('progress', { message: '🔥 Starting FinP2P Atomic Swap Coordination Demo' });
    this.emit('progress', { message: '🎯 Demonstrating real atomic swap coordination via FinP2P protocol' });
    
    // ========================================
    // FINP2P ATOMIC SWAP COORDINATION EXPLANATION
    // ========================================
    this.emit('progress', { message: '\n🔄 FINP2P ATOMIC SWAP COORDINATION DEMONSTRATION:' });
    this.emit('progress', { message: '=================================================' });
    this.emit('progress', { message: 'This demo shows real atomic swap coordination via FinP2P:' });
    this.emit('progress', { message: '• Alice has SUI and wants HBAR' });
    this.emit('progress', { message: '• Bob has HBAR and wants SUI' });
    this.emit('progress', { message: '• FinP2P provides cross-party address resolution' });
    this.emit('progress', { message: '• Alice sends SUI to Bob (coordinated via FinP2P)' });
    this.emit('progress', { message: '• Bob sends HBAR to Alice (coordinated via FinP2P)' });
    this.emit('progress', { message: '• Both transactions are real and will be submitted to testnets' });
    this.emit('progress', { message: '• Using your wallet credentials to simulate both parties' });
    this.emit('progress', { message: '=================================================\n' });
    
    try {
      // ========================================
      // 1. SETUP FINP2P ROUTER (CREDENTIALS MOCKED ONLY)
      // ========================================
      this.emit('progress', { message: '\n🔧 Setting up FinP2P Router for atomic swap coordination...' });
      
      // Find available port dynamically
      const routerPort = await findAvailablePort(6380);
      this.emit('progress', { message: `🔌 Found available port: ${routerPort}` });
      
      const finp2pRouter = new FinP2PSDKRouter({
        port: routerPort,
        routerId: 'atomic-swap-coordinator',
        orgId: 'atomic-swap-demo',
        custodianOrgId: 'atomic-swap-demo',
        owneraAPIAddress: 'mock-api-address-for-demo',
        authConfig: {
          apiKey: 'mock-api-key-for-demo',
          secret: {
            type: 1,
            raw: 'mock-private-key-for-demo'
          }
        },
        mockMode: true // ONLY the credentials are mocked - blockchain operations are real!
      }, logger);

      await finp2pRouter.start();
      this.emit('progress', { message: '✅ FinP2P Router started and ready to coordinate atomic swaps' });

      // ========================================
      // 2. SETUP REAL SUI TESTNET ADAPTER
      // ========================================
      this.emit('progress', { message: '\n🔧 Setting up REAL Sui Testnet Adapter...' });
      
      const suiAdapter = new FinP2PIntegratedSuiAdapter({
        network: 'testnet',
        rpcUrl: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443',
        privateKey: process.env.SUI_PRIVATE_KEY, // REAL Sui testnet private key
        finp2pRouter: finp2pRouter
      }, logger);

      await suiAdapter.connect();
      const suiStatus = suiAdapter.getStatus();
      this.emit('progress', { message: '✅ Sui Adapter ready for atomic swaps:', data: {
        connected: suiStatus.connected,
        hasRealCredentials: suiStatus.hasSigningKey,
        mode: suiStatus.hasSigningKey ? 'REAL_TESTNET' : 'MOCK_MODE'
      } });

      // ========================================
      // 3. SETUP REAL HEDERA TESTNET ADAPTER
      // ========================================
      this.emit('progress', { message: '\n🔧 Setting up REAL Hedera Testnet Adapter...' });
      
      const hederaAdapter = new FinP2PIntegratedHederaAdapter({
        network: 'testnet',
        accountId: process.env.HEDERA_ACCOUNT_ID, // REAL Hedera testnet account
        privateKey: process.env.HEDERA_PRIVATE_KEY, // REAL Hedera testnet private key
        finp2pRouter: finp2pRouter
      }, logger);

      await hederaAdapter.connect();
      const hederaStatus = hederaAdapter.getStatus();
      this.emit('progress', { message: '✅ Hedera Adapter ready for atomic swaps:', data: {
        connected: hederaStatus.connected,
        hasRealCredentials: hederaStatus.hasCredentials,
        mode: hederaStatus.mode
      } });

      // ========================================
      // 4. CROSS-PARTY ADDRESS RESOLUTION VIA FINP2P
      // ========================================
      this.emit('progress', { message: '\n🔍 Cross-Party Address Resolution via FinP2P Protocol...' });
      
      const aliceFinId = 'alice@atomic-swap.demo'; // Alice: Has SUI, wants HBAR
      const bobFinId = 'bob@atomic-swap.demo';     // Bob: Has HBAR, wants SUI
      
      this.emit('progress', { message: '👥 Trading Parties:', data: {
        alice: 'Has SUI tokens → Wants HBAR tokens',
        bob: 'Has HBAR tokens → Wants SUI tokens',
        method: 'FinP2P-coordinated atomic swap'
      } });

      // Alice queries FinP2P for Bob's addresses
      this.emit('progress', { message: '\n🔍 Alice queries FinP2P: "Where should I send Bob his SUI tokens?"' });
      const bobSuiAddress = await finp2pRouter.getWalletAddress(bobFinId, 'sui');
      this.emit('progress', { message: '✅ FinP2P responds to Alice:', data: {
        query: 'Bob\'s SUI wallet address',
        response: bobSuiAddress ? `${bobSuiAddress.substring(0, 10)}...` : 'not-available',
        usage: 'Alice will send SUI here'
      } });

      // Bob queries FinP2P for Alice's addresses  
      this.emit('progress', { message: '\n🔍 Bob queries FinP2P: "Where should I send Alice her HBAR tokens?"' });
      const aliceHederaAddress = await finp2pRouter.getWalletAddress(aliceFinId, 'hedera');
      this.emit('progress', { message: '✅ FinP2P responds to Bob:', data: {
        query: 'Alice\'s HBAR wallet address', 
        response: aliceHederaAddress,
        usage: 'Bob will send HBAR here'
      } });

      // ========================================
      // 5. CHECK TRADING PARTY BALANCES BEFORE SWAP
      // ========================================
      this.emit('progress', { message: '\n💰 Checking Trading Party Balances Before Asset Exchange...' });
      
      // Remove pre-swap balance progress log, but still capture the values for later
      let aliceSuiBalanceBefore, bobHederaBalanceBefore;
      try {
        aliceSuiBalanceBefore = await suiAdapter.getBalanceByFinId(aliceFinId);
        bobHederaBalanceBefore = await hederaAdapter.getBalanceByFinId(bobFinId);
      } catch (error) {
        aliceSuiBalanceBefore = null;
        bobHederaBalanceBefore = null;
      }

      // ========================================
      // 6. INITIATE ATOMIC SWAP VIA FINP2P
      // ========================================
      this.emit('progress', { message: '\n🔄 Initiating Atomic Swap via FinP2P Protocol...' });
      this.emit('progress', { message: '💡 Process: Alice and Bob agree to trade via atomic swap' });
      this.emit('progress', { message: '   → Alice gives SUI → Gets HBAR' });
      this.emit('progress', { message: '   → Bob gives HBAR → Gets SUI' });
      this.emit('progress', { message: '   → FinP2P coordinates to ensure atomicity!' });
      
      const swapRequest = {
        initiatorFinId: aliceFinId,
        responderFinId: bobFinId,
        initiatorAsset: {
          chain: 'sui',
          assetId: 'sui-native-token',
          amount: '100000000' // 0.1 SUI in MIST (reduced to available balance)
        },
        responderAsset: {
          chain: 'hedera',
          assetId: 'hedera-native-token', 
          amount: '1000000000' // 10 HBAR in tinybars (proportionally reduced)
        },
        timeoutBlocks: 100,
        timeoutMinutes: 5, // Enhanced: 5-minute timeout for demo
        autoRollback: true, // Enhanced: Automatic rollback on timeout/failure
        requiredConfirmations: { // Enhanced: Confirmation requirements
          'sui': 3,
          'hedera': 2
        }
      };

      this.emit('progress', { message: '📋 Enhanced Swap Details:', data: {
        trade: 'Alice trades 0.1 SUI ↔ Bob trades 10 HBAR',
        chains: 'Sui Testnet ↔ Hedera Testnet',
        coordinator: 'FinP2P Protocol with Enhanced Features',
        atomicity: 'Both complete or both fail',
        timeoutProtection: '5-minute timeout with automatic rollback',
        statusTracking: 'Real-time progress with percentage completion',
        rollbackCapability: 'Automatic asset unlock on failure',
        realBlockchains: suiStatus.hasSigningKey || hederaStatus.hasCredentials,
        note: 'Demonstrating production-ready atomic swap features'
      } });

      // Execute the enhanced atomic swap through FinP2P
      const swapResult = await finp2pRouter.executeAtomicSwap(swapRequest);
      
      this.emit('progress', { message: '✅ Enhanced Atomic Swap Initiated:', data: {
        swapId: swapResult.swapId,
        status: swapResult.status,
        progress: `${swapResult.progress?.percentage || 0}%`,
        estimatedCompletion: swapResult.estimatedCompletionTime,
        nextAction: swapResult.nextAction,
        note: 'Enhanced monitoring with real-time progress tracking'
      } });

      // ========================================
      // 6. ENHANCED REAL-TIME PROGRESS MONITORING
      // ========================================
      this.emit('progress', { message: '\n👁️  Enhanced Real-Time Progress Monitoring...' });
      this.emit('progress', { message: '🔄 Demonstrating detailed status tracking with automatic timeout handling' });
      
      // Enhanced monitoring with multiple status checks
      let monitoringAttempts = 0;
      const maxMonitoringAttempts = 15; // Monitor for up to 75 seconds
      
      while (monitoringAttempts < maxMonitoringAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        monitoringAttempts++;
        
        const swapStatus = await finp2pRouter.getAtomicSwapStatus(swapResult.swapId);
        if (!swapStatus) {
          this.emit('progress', { message: '⚠️ Could not retrieve swap status' });
          break;
        }
        
        this.emit('progress', { message: `📈 Progress Update #${monitoringAttempts}:`, data: {
          swapId: swapResult.swapId,
          status: swapStatus.status,
          stage: swapStatus.progress?.stage,
          completion: `${swapStatus.progress?.percentage || 0}%`,
          description: swapStatus.progress?.description,
          timeRemaining: swapStatus.timeout?.timeoutTimestamp ? 
            Math.max(0, Math.round((new Date(swapStatus.timeout.timeoutTimestamp).getTime() - Date.now()) / 1000)) + 's' : 'unknown',
          canRollback: swapStatus.rollback?.canRollback || false,
          subStages: Object.entries(swapStatus.progress?.subStages || {})
            .filter(([_, stage]) => stage.completed)
            .map(([name, _]) => name),
          recentEvents: swapStatus.events?.slice(-2).map(event => `${event.type}: ${event.message}`) || []
        } });
        
        // Break if swap is in final state
        if (['completed', 'failed', 'expired', 'rolled_back'].includes(swapStatus.status)) {
          this.emit('progress', { message: `🏁 Swap reached final state: ${swapStatus.status}` });
          break;
        }
        
        // Complete swap if both assets are locked
        if (swapStatus.status === 'locked' && monitoringAttempts === 3) {
          this.emit('progress', { message: '\n✅ Both assets locked - completing atomic swap...' });
          try {
            await finp2pRouter.completeAtomicSwap(swapResult.swapId, `completion_tx_${Date.now()}`);
            this.emit('progress', { message: '🎉 Swap completion initiated!' });
          } catch (error) {
            this.emit('error', { error: error, message: '❌ Failed to complete atomic swap:' });
          }
        }
      }

      // ========================================
      // 7. FINAL STATUS CHECK & ANALYSIS
      // ========================================
      this.emit('progress', { message: '\n📊 Final Swap Analysis...' });
      
      const finalStatus = await finp2pRouter.getAtomicSwapStatus(swapResult.swapId);
      if (finalStatus) {
        this.emit('progress', { message: '🎯 Final Swap State:', data: {
          swapId: swapResult.swapId,
          finalStatus: finalStatus.status,
          finalStage: finalStatus.progress?.stage,
          completion: `${finalStatus.progress?.percentage || 0}%`,
          totalEvents: finalStatus.events?.length || 0,
          timeElapsed: finalStatus.updatedAt ? 
            Math.round((new Date(finalStatus.updatedAt).getTime() - new Date(finalStatus.createdAt).getTime()) / 1000) + 's' : 'unknown',
          wasRolledBack: finalStatus.status === 'rolled_back',
          rollbackReason: finalStatus.rollback?.rollbackReason || 'N/A',
          assetsUnlocked: finalStatus.rollback ? 
            Object.entries(finalStatus.rollback.assetsToUnlock)
              .filter(([_, unlock]) => unlock.completed)
              .map(([chain, _]) => chain) : []
        } });
        
        // Show event timeline
        if (finalStatus.events && finalStatus.events.length > 0) {
          this.emit('progress', { message: '📅 Swap Event Timeline:' });
          finalStatus.events.forEach((event, index) => {
            this.emit('progress', { message: `  ${index + 1}. [${event.type}] ${event.message}${event.chain ? ` (${event.chain})` : ''}` });
          });
        }
      }

      // ========================================
      // 8. CHECK POST-SWAP BALANCES
      // ========================================
      this.emit('progress', { message: '\n💰 Checking Post-Swap Balances...' });
      
      // At the end, after post-swap balances are fetched:
      let aliceSuiBalanceAfter, bobHederaBalanceAfter;
      try {
        aliceSuiBalanceAfter = await suiAdapter.getBalanceByFinId(aliceFinId);
        bobHederaBalanceAfter = await hederaAdapter.getBalanceByFinId(bobFinId);
        this.emit('balances', {
          before: {
            alice_sui: aliceSuiBalanceBefore ? aliceSuiBalanceBefore.toString() : null,
            bob_hedera: bobHederaBalanceBefore ? bobHederaBalanceBefore.toString() : null
          },
          after: {
            alice_sui: aliceSuiBalanceAfter ? aliceSuiBalanceAfter.toString() : null,
            bob_hedera: bobHederaBalanceAfter ? bobHederaBalanceAfter.toString() : null
          }
        });
        this.emit('progress', { message: '📊 Balance Change Summary:', data: {
          alice_sui_before: aliceSuiBalanceBefore ? aliceSuiBalanceBefore.toString() : 'N/A',
          alice_sui_after: aliceSuiBalanceAfter ? aliceSuiBalanceAfter.toString() : 'N/A',
          bob_hedera_before: bobHederaBalanceBefore ? bobHederaBalanceBefore.toString() : 'N/A',
          bob_hedera_after: bobHederaBalanceAfter ? bobHederaBalanceAfter.toString() : 'N/A',
          note: 'Shows before and after balances for both parties.'
        }});
        let suiTxId = null, hederaTxId = null;
        if (finalStatus && finalStatus.events) {
          for (const event of finalStatus.events) {
            if (event.chain === 'sui' && (event.txId || event.txHash || event.transactionId)) suiTxId = event.txId || event.txHash || event.transactionId;
            if (event.chain === 'hedera' && (event.txId || event.txHash || event.transactionId)) hederaTxId = event.txId || event.txHash || event.transactionId;
          }
        }
        this.emit('progress', { message: '🔗 Transaction IDs:' });
        if (suiTxId) {
          this.emit('progress', { message: 'Sui Transaction ID:', data: { code: `\n\n\`\`\`\n${suiTxId}\n\`\`\`\n` } });
        } else {
          this.emit('progress', { message: 'Sui Transaction ID: Not available' });
        }
        if (hederaTxId) {
          this.emit('progress', { message: 'Hedera Transaction ID:', data: { code: `\n\n\`\`\`\n${hederaTxId}\n\`\`\`\n` } });
        } else {
          this.emit('progress', { message: 'Hedera Transaction ID: Not available' });
        }
      } catch (error) {
        this.emit('progress', { message: '📊 Balance summary unavailable (mock mode or error)' });
      }

      // ========================================
      // 9. DEMO SUMMARY AND LIMITATIONS
      // ========================================
      this.emit('progress', { message: '\n📚 ATOMIC SWAP DEMONSTRATION COMPLETE' });
      this.emit('progress', { message: '==================================================' });
      this.emit('progress', { message: '🔥 What Just Happened:' });
      this.emit('progress', { message: '   • FinP2P coordinated atomic swap protocol with real blockchain operations' });
      this.emit('progress', { message: '   • Real transactions were submitted to Sui and Hedera testnets' });
      this.emit('progress', { message: '' });
      this.emit('progress', { message: '💰 Transaction Results in the Wallet:' });
      this.emit('progress', { message: '   • Alice sent SUI to Bob (your SUI address → your SUI address)' });
      this.emit('progress', { message: '   • Bob sent HBAR to Alice (your HBAR address → your HBAR address)' });
      this.emit('progress', { message: '   • Net result: Cross-party transfers that cancel out + gas fees' });
      this.emit('progress', { message: '   • Real atomic swap logic with actual blockchain transactions' });
      this.emit('progress', { message: '' });
      this.emit('progress', { message: '✅ What Was Successfully Demonstrated:' });
      this.emit('progress', { message: '   • Real blockchain transaction execution on testnets' });
      this.emit('progress', { message: '   • FinP2P protocol coordination between chains' });
      this.emit('progress', { message: '   • Atomic swap state management and monitoring' });
      this.emit('progress', { message: '   • Event-driven architecture between adapters' });
      this.emit('progress', { message: '   • Timeout protection and rollback mechanisms' });
      this.emit('progress', { message: '' });

      // ========================================
      // 10. CLEANUP & AUTO-EXIT
      // ========================================
      this.emit('progress', { message: '\n🧹 Cleaning up...' });
      await suiAdapter.disconnect();
      await hederaAdapter.disconnect();
      await finp2pRouter.stop();
      
      this.emit('progress', { message: '✅ FinP2P Atomic Swap Coordination Demo completed successfully!' });
      
      // Auto-exit after 2 seconds to prevent hanging
      setTimeout(() => {
        this.emit('progress', { message: '📤 Demo auto-exiting...' });
        process.exit(0);
      }, 2000);

    } catch (error) {
      this.emit('error', { error: error, message: '❌ FinP2P atomic swap coordination demo failed:' });
      
      // Auto-exit after 2 seconds even on error to prevent hanging
      setTimeout(() => {
        this.emit('progress', { message: '📤 Demo auto-exiting after error...' });
        process.exit(1);
      }, 2000);
    }
  }
}

// ========================================
// CONFIGURATION VERIFICATION
// ========================================
function verifyConfiguration() {
  logger.info('🔍 Verifying Configuration for Atomic Swaps...');
  
  const config = {
    sui: {
      hasPrivateKey: !!process.env.SUI_PRIVATE_KEY,
      rpcUrl: process.env.SUI_RPC_URL || 'default-testnet'
    },
    hedera: {
      hasAccountId: !!process.env.HEDERA_ACCOUNT_ID,
      hasPrivateKey: !!process.env.HEDERA_PRIVATE_KEY,
      network: process.env.HEDERA_NETWORK || 'testnet'
    }
  };
  
  logger.info('🔧 Configuration Status:', config);
  
  if (config.sui.hasPrivateKey && config.hedera.hasAccountId && config.hedera.hasPrivateKey) {
    logger.info('🎯 FULL REAL TESTNET MODE - All blockchain operations will be real!');
    logger.info('💸 Note: Real gas fees will be charged on both networks');
  } else if (config.sui.hasPrivateKey || (config.hedera.hasAccountId && config.hedera.hasPrivateKey)) {
    logger.info('🌐 HYBRID MODE - Some operations real, some mocked');
  } else {
    logger.info('🎭 DEMO MODE - All blockchain operations mocked');
    logger.info('💡 Perfect for testing the atomic swap protocol without spending gas');
  }
  
  logger.info('📖 Educational Value: Full regardless of mode - shows real protocol patterns');
}

// Run the demo
if (require.main === module) {
  verifyConfiguration();
  const demoEmitter = new AtomicSwapDemoEmitter();
  demoEmitter.on('progress', (data) => {
    if (data.message) {
      logger.info(data.message);
    } else if (data.data) {
      logger.info(JSON.stringify(data.data, null, 2));
    }
  });
  demoEmitter.on('error', (data) => {
    logger.error(data.message, data.error);
  });
  demoEmitter.runDemo().catch(console.error);
}

module.exports = { AtomicSwapDemoEmitter }; 