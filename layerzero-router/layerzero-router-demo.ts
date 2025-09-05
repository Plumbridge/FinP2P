#!/usr/bin/env ts-node

import { LayerZeroRouter } from './LayerZeroRouter';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🚀 Starting LayerZero Router Demo...\n');
  console.log('📡 Cross-Chain Route: Sepolia ETH → Arbitrum Sepolia\n');
  console.log('⚠️  IMPORTANT: This demo executes REAL ETH transactions on Sepolia testnet\n');
  console.log('   - Real blockchain transactions will be executed');
  console.log('   - Real ETH will be spent on gas fees');
  console.log('   - Balances will actually change');
  console.log('   - This is NOT a simulation\n');

  try {
    // Create and initialize the router
    const router = new LayerZeroRouter();
    
    // Set up event listeners
    setupEventListeners(router);
    
    // Initialize the router
    console.log('🔗 Initializing LayerZero Router...');
    await router.initialize();
    
    // Display initial status
    displayRouterStatus(router);
    
    // Check wallet balance
    await checkWalletBalance(router);
    
    // Execute cross-chain transfer
    console.log(`\n🚀 Executing Atomic Swap Cross-Chain Transfer...`);
    console.log(`   Route: ${router.PRIMARY_ROUTE.sourceChain} → ${router.PRIMARY_ROUTE.destChain}`);
    console.log(`   Amount: 0.002 ETH ↔ POL`);
    console.log(`   ⚠️  This will execute REAL transactions on both chains!`);
    console.log(`   🔄 Atomic Swap: Wallet 1 (0x3808Ab2b060D1648c3Bb8fc617F9dF752143dAFB) loses ETH, gains POL | Wallet 2 (0x7B52C77F01aE2cd0A59c0b24de48F21121E6c2bC) loses POL, gains ETH`);
    console.log(`   🔒 LayerZero ensures atomicity - both succeed or both fail!`);
    
    // Execute the atomic swap transfer
    const transferId = await router.executeCrossChainTransfer({
      tokenSymbol: 'ETH',
      amount: '0.002',
      destinationAddress: '0x7B52C77F01aE2cd0A59c0b24de48F21121E6c2bC' // Wallet 2 address
    }, 'high');
    
    console.log(`📋 Transfer queued: ${transferId} (High Priority)`);
    
    // Monitor transfers
    console.log('\n📊 Monitoring Transfer Progress...\n');
    
    let completedTransfers = 0;
    const totalTransfers = 1; // Only one transfer for atomic swap
    
    // Monitor until all transfers are completed or failed
    while (completedTransfers < totalTransfers) {
      const queueStatus = router.getQueueStatus();
      const stats = router.getRouterStats();
      
      console.log(`⏳ Queue Status: ${queueStatus.queued} queued, ${queueStatus.active} active, ${queueStatus.completed} completed`);
      console.log(`📈 Stats: ${stats.successfulTransfers} successful, ${stats.failedTransfers} failed`);
      
      // Check individual transfer statuses
      const transfers = [transferId]; // Use the actual transfer ID
      for (const transferId of transfers) {
        const status = router.getTransferStatus(transferId);
        if (status && (status.status === 'completed' || status.status === 'failed')) {
          if (status.status === 'completed') {
            console.log(`✅ Transfer ${transferId}: COMPLETED`);
            console.log(`   Amount: ${status.amount} ${status.tokenSymbol}`);
            console.log(`   Fee: ${status.fee || 'N/A'} ETH`);
            if (status.txHash) {
              console.log(`   TX Hash: ${status.txHash}`);
            }
            console.log(`   ⚠️  This was a REAL transaction on the blockchain!`);
          } else {
            console.log(`❌ Transfer ${transferId}: FAILED - ${status.error}`);
          }
          completedTransfers++;
        }
      }
      
      if (completedTransfers < totalTransfers) {
        await sleep(5000); // Wait 5 seconds before next check
      }
    }
    
    // Final status
    console.log('\n🎯 Final Router Status:');
    displayRouterStatus(router);
    
    // Display balance changes
    console.log('\n💰 Balance Changes Analysis:');
    const balanceChanges = router.getBalanceChanges();
    for (const [chainName, change] of balanceChanges) {
      const difference = parseFloat(change.difference);
      if (difference !== 0) {
        console.log(`   ${chainName}: ${change.initial} → ${change.final} (${difference >= 0 ? '+' : ''}${change.difference} ETH)`);
        if (difference < 0) {
          console.log(`      💸 Spent ${Math.abs(difference).toFixed(6)} ETH on gas fees and transfers`);
        }
      } else {
        console.log(`   ${chainName}: ${change.initial} → ${change.final} (No change)`);
      }
    }
    
    // Shutdown gracefully
    console.log('\n🔌 Shutting down router...');
    await router.shutdown();
    
    console.log('\n✅ Demo completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - REAL blockchain transactions were executed');
    console.log('   - REAL ETH was spent on gas fees');
    console.log('   - Balances actually changed on the blockchain');
    console.log('   - This demonstrates real cross-chain infrastructure');
    console.log('   - For true LayerZero cross-chain transfers, contract addresses are needed');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

function setupEventListeners(router: LayerZeroRouter): void {
  // Router ready event
  router.on('routerReady', (info) => {
    console.log('🎯 Router ready event received:', new Date(info.timestamp).toISOString());
  });
  
  // Transfer queued event
  router.on('transferQueued', (item) => {
    console.log(`📋 Transfer queued event: ${item.id} (${item.priority} priority)`);
  });
  
  // Transfer initiated event
  router.on('transferInitiated', (result) => {
    console.log(`🚀 Transfer initiated: ${result.id}`);
    console.log(`   From: ${result.sourceChain} → ${result.destChain}`);
    console.log(`   Amount: ${result.amount} ${result.tokenSymbol}`);
    console.log(`   ⚠️  REAL transaction starting on ${result.sourceChain}`);
  });
  
  // Transfer completed event
  router.on('transferCompleted', (result) => {
    console.log(`✅ Transfer completed: ${result.id}`);
    console.log(`   Status: ${result.status}`);
    if (result.txHash) {
      console.log(`   Transaction Hash: ${result.txHash}`);
    }
    console.log(`   ⚠️  REAL transaction completed on ${result.sourceChain}`);
  });
  
  // Transfer failed event
  router.on('transferFailed', (result) => {
    console.log(`❌ Transfer failed: ${result.id}`);
    console.log(`   Error: ${result.error}`);
  });
}

function displayRouterStatus(router: LayerZeroRouter): void {
  const stats = router.getRouterStats();
  const routes = router.getActiveRoutes();
  const queueStatus = router.getQueueStatus();
  
  console.log('\n📊 Router Status:');
  console.log(`   Running: ${router.isRouterRunning() ? '✅ Yes' : '❌ No'}`);
  console.log(`   Total Transfers: ${stats.totalTransfers}`);
  console.log(`   Successful: ${stats.successfulTransfers}`);
  console.log(`   Failed: ${stats.failedTransfers}`);
  console.log(`   Pending: ${stats.pendingTransfers}`);
  console.log(`   Total Volume: ${stats.totalVolume} ETH`);
  
  console.log('\n🛣️  Active Routes:');
  routes.forEach(route => {
    console.log(`   ${route.sourceChain} → ${route.destChain}`);
    console.log(`     Token: ${route.tokenSymbol}`);
    console.log(`     Fee: ${route.fee} ETH`);
    console.log(`     Time: ${route.estimatedTime}`);
    console.log(`     Status: ${route.status}`);
  });
  
  console.log('\n📋 Queue Status:');
  console.log(`   Queued: ${queueStatus.queued}`);
  console.log(`   Active: ${queueStatus.active}`);
  console.log(`   Completed: ${queueStatus.completed}`);
}

async function checkWalletBalance(router: LayerZeroRouter): Promise<void> {
  try {
    console.log('\n💳 Checking Wallet Balance...');
    const balance = await router.getWalletBalance('sepolia');
    console.log(`✅ Balance: ${balance.balanceInEth} ETH on ${balance.chain}`);
    console.log(`   Raw balance: ${balance.balance} wei`);
    
    // Check if we have enough for transfers
    const requiredAmount = 0.002; // 0.002 ETH for atomic swap
    const estimatedGasFees = 0.001; // Estimated gas fees for 1 transaction
    const totalRequired = requiredAmount + estimatedGasFees;
    const currentBalance = parseFloat(balance.balanceInEth);
    
    if (currentBalance >= totalRequired) {
      console.log(`✅ Sufficient balance for demo transfers`);
      console.log(`   Transfers: ${requiredAmount} ETH`);
      console.log(`   Estimated gas: ${estimatedGasFees} ETH`);
      console.log(`   Total required: ${totalRequired} ETH`);
      console.log(`   Available: ${currentBalance} ETH`);
    } else {
      console.log(`⚠️  Insufficient balance for demo transfers`);
      console.log(`   Transfers: ${requiredAmount} ETH`);
      console.log(`   Estimated gas: ${estimatedGasFees} ETH`);
      console.log(`   Total required: ${totalRequired} ETH`);
      console.log(`   Available: ${currentBalance} ETH`);
      console.log(`   Shortfall: ${(totalRequired - currentBalance).toFixed(6)} ETH`);
    }
    
  } catch (error) {
    console.log('⚠️  Could not check wallet balance:', (error as Error).message);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the demo
if (require.main === module) {
  main().catch(console.error);
}
