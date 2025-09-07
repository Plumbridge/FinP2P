#!/usr/bin/env ts-node

import { LayerZeroAdapter } from '../../adapters/layerzero';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🚀 Starting LayerZero Adapter Demo...\n');

  try {
    // Create LayerZero adapter instance
    const adapter = new LayerZeroAdapter();
    
    console.log('📋 Adapter Configuration:');
    console.log('- Testnet Mode: Enabled');
    console.log('- Supported Networks: EVM chains (Sepolia, Mumbai, Arbitrum, Base)');
    console.log('- Non-EVM Support: Sui, Hedera (placeholder)\n');

    // Connect to networks
    console.log('🔗 Connecting to LayerZero network...');
    await adapter.connect();
    
    // Display connection info
    const supportedChains = adapter.getSupportedChains();
    console.log(`✅ Connected! Supported chains: ${supportedChains.length}`);
    supportedChains.forEach(chain => {
      console.log(`  - ${chain}`);
    });
    console.log('');

    // Get wallet addresses
    const walletAddresses = adapter.getWalletAddresses();
    console.log('💰 Wallet Addresses:');
    walletAddresses.forEach((address, index) => {
      console.log(`  Wallet ${index}: ${address}`);
    });
    console.log('');

    // Check balances
    try {
      console.log('💳 Checking wallet balances...');
      const balance = await adapter.getWalletBalance(1);
      console.log(`✅ Balance: ${balance.balanceInEth} ETH on ${balance.chain}`);
      console.log(`   Raw balance: ${balance.balance} wei`);
      console.log('');
    } catch (error) {
      console.log('⚠️  Could not check balance:', (error as Error).message);
      console.log('');
    }

    // Estimate transfer fees
    try {
      console.log('💸 Estimating transfer fees...');
      const fee = await adapter.estimateTransferFee('sepolia', 'polygon-amoy', '0.001');
      console.log(`✅ Estimated fee: ${ethers.formatEther(fee.nativeFee)} ETH`);
      console.log(`   LZ Token fee: ${ethers.formatEther(fee.lzTokenFee)} LZ`);
      console.log('');
    } catch (error) {
      console.log('⚠️  Could not estimate fees:', (error as Error).message);
      console.log('');
    }

    // Execute a test transfer (if we have sufficient balance)
    try {
      console.log('🚀 Executing test transfer...');
      
      // Use the first available wallet address as destination
      const firstWallet = Array.from(walletAddresses.values())[0];
      if (!firstWallet) {
        throw new Error('No wallet addresses available');
      }

             const transferResult = await adapter.transferToken({
         sourceChain: 'sepolia',
         destChain: 'polygon-amoy',
         tokenSymbol: 'ETH',
         amount: '0.001',
         destinationAddress: firstWallet
       });

      console.log('✅ Transfer executed successfully!');
      console.log(`   Transfer ID: ${transferResult.id}`);
      console.log(`   Status: ${transferResult.status}`);
      if (transferResult.txHash) {
        console.log(`   Transaction Hash: ${transferResult.txHash}`);
      }
      if (transferResult.fee) {
        console.log(`   Fee: ${transferResult.fee} ETH`);
      }
      console.log('');

      // Check transfer status
      console.log('📊 Checking transfer status...');
      const status = await adapter.getTransferStatus(transferResult.id);
      console.log(`   Status: ${status.status}`);
      console.log(`   Message: ${status.message}`);
      if (status.layerZeroStatus) {
        console.log(`   LayerZero Status: ${status.layerZeroStatus}`);
      }
      console.log('');

    } catch (error) {
      console.log('⚠️  Could not execute transfer:', (error as Error).message);
      console.log('   This might be due to insufficient balance or network issues');
      console.log('');
    }

    // Execute atomic swap demo
    try {
      console.log('🔄 Executing LayerZero atomic swap demo...');
      
      const atomicSwapRequest = {
        initiatorChain: 'sepolia',
        responderChain: 'polygon-amoy',
        initiatorAsset: {
          symbol: 'ETH',
          amount: '0.001',
          address: '0x0000000000000000000000000000000000000000' // Native ETH
        },
        responderAsset: {
          symbol: 'MATIC',
          amount: '0.001',
          address: '0x0000000000000000000000000000000000000000' // Native MATIC
        },
        initiatorAddress: Array.from(walletAddresses.values())[0] || '0x0000000000000000000000000000000000000000',
        responderAddress: Array.from(walletAddresses.values())[1] || '0x0000000000000000000000000000000000000000',
        timelock: 100 // 100 blocks
      };

      const swapResult = await adapter.executeAtomicSwap(atomicSwapRequest);
      
      console.log('✅ Atomic swap initiated successfully!');
      console.log(`   Swap ID: ${swapResult.swapId}`);
      console.log(`   Status: ${swapResult.status}`);
      console.log(`   Secret Hash: ${swapResult.secretHash.substring(0, 20)}...`);
      console.log(`   Expiry: ${new Date(swapResult.expiry).toISOString()}`);
      console.log('');

      // Simulate claiming the swap after a short delay
      console.log('⏳ Waiting 2 seconds before claiming swap...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const claimResult = await adapter.claimAtomicSwap(swapResult.swapId, swapResult.secret);
      console.log('✅ Atomic swap claimed successfully!');
      console.log(`   Final Status: ${claimResult.status}`);
      console.log('');

    } catch (error) {
      console.log('⚠️  Could not execute atomic swap:', (error as Error).message);
      console.log('');
    }

    // Display chain information
    console.log('🔗 Chain Information:');
    for (const chainName of supportedChains) {
      try {
        const chainInfo = await adapter.getChainInfo(chainName);
        if (chainInfo) {
          console.log(`  ${chainInfo.name}:`);
          console.log(`    Chain ID: ${chainInfo.chainId}`);
          console.log(`    LayerZero Chain ID: ${chainInfo.layerZeroChainId}`);
          console.log(`    RPC URL: ${chainInfo.rpcUrl || 'N/A'}`);
          console.log(`    Supported: ${chainInfo.supported}`);
        }
      } catch (error) {
        console.log(`  ${chainName}: Error getting info - ${(error as Error).message}`);
      }
    }
    console.log('');

    // Event handling demonstration
    console.log('📡 Setting up event listeners...');
    
    adapter.on('transferInitiated', (result) => {
      console.log('🎯 Transfer initiated event received:');
      console.log(`   ID: ${result.id}`);
      console.log(`   From: ${result.sourceChain} to ${result.destChain}`);
      console.log(`   Amount: ${result.amount} ${result.tokenSymbol}`);
    });

    adapter.on('transferFailed', (result) => {
      console.log('❌ Transfer failed event received:');
      console.log(`   ID: ${result.id}`);
      console.log(`   Error: ${result.error}`);
    });

    console.log('✅ Event listeners configured');
    console.log('');

    // Disconnect
    console.log('🔌 Disconnecting from LayerZero network...');
    await adapter.disconnect();
    console.log('✅ Disconnected successfully');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
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
