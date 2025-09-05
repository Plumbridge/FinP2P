import { AxelarAdapter } from './axelar-adapter';
import dotenv from 'dotenv';

// Load environment variables from the project root
dotenv.config({ path: '.env' });

async function testRealAxelarTransfers() {
  console.log('🚀 Testing REAL Axelar Cross-Chain Transfers with Wallet Integration');
  console.log('==================================================================\n');

  // Initialize Axelar adapter with real credentials
  // Note: Axelar handles cross-chain communication internally - no separate RPC endpoints needed
  const axelarAdapter = new AxelarAdapter({
    environment: process.env.AXELAR_ENVIRONMENT || 'testnet',
    restUrl: process.env.AXELAR_REST_URL,
    mnemonic: process.env.AXELAR_MNEMONIC_1, // Use mnemonic instead of private key
    walletAddress: process.env.AXELAR_ADDRESS_1
  });

  try {
    // Connect to Axelar network
    console.log('🔗 Connecting to Axelar network...');
    await axelarAdapter.connect();
    
    // Display network info
    const networkInfo = axelarAdapter.getNetworkInfo();
    console.log('\n📊 Network Information:');
    console.log(JSON.stringify(networkInfo, null, 2));

    // Test 1: Cross-chain transfer (Sepolia to Polygon Sepolia)
    console.log('\n🧪 Test 1: Cross-chain transfer (Sepolia to Polygon Sepolia)');
    console.log('This will demonstrate Axelar\'s cross-chain infrastructure!');
    console.log(`💰 From wallet: ${process.env.AXELAR_ADDRESS_1}`);
    console.log(`🎯 To wallet: ${process.env.AXELAR_ADDRESS_2}`);
    
    const transferResult = await axelarAdapter.transferToken({
      sourceChain: 'ethereum-sepolia',
      destChain: 'polygon-sepolia',
      tokenSymbol: 'uaxl', // AXEL token
      amount: '1', // Minimal amount for testing
      destinationAddress: process.env.AXELAR_ADDRESS_2 || process.env.AXELAR_ADDRESS_1 || '', // Send to different wallet (or same for testing)
    });

    console.log('\n✅ Transfer initiated successfully!');
    console.log('📊 Transfer details:');
    console.log(JSON.stringify(transferResult, null, 2));

    // Test 2: Get transfer status
    console.log('\n🧪 Test 2: Get transfer status');
    const status = await axelarAdapter.getTransferStatus(transferResult.txHash);
    console.log('📊 Transfer status:');
    console.log(JSON.stringify(status, null, 2));

    // Test 3: Get audit record
    console.log('\n🧪 Test 3: Get audit record');
    const auditRecord = await axelarAdapter.getAuditRecord(transferResult.txHash);
    console.log('📊 Audit record:');
    console.log(JSON.stringify(auditRecord, null, 2));

    // Test 4: Send message (minimal token transfer)
    console.log('\n🧪 Test 4: Send message (minimal token transfer)');
    const messageResult = await axelarAdapter.sendMessage({
      sourceChain: 'ethereum-sepolia',
      destChain: 'base-sepolia',
      message: { type: 'test', timestamp: Date.now() },
      destinationAddress: process.env.AXELAR_ADDRESS_2 || process.env.AXELAR_ADDRESS_1 || '',
    });

    console.log('\n✅ Message sent successfully!');
    console.log('📊 Message details:');
    console.log(JSON.stringify(messageResult, null, 2));

    console.log('\n🎉 All tests completed successfully!');
    console.log('🔍 This demonstrates Axelar\'s cross-chain infrastructure.');
    console.log('📝 Note: For real transfers, you need to integrate with Axelar\'s wallet approval system.');
    console.log('📝 Note: You can configure different wallet addresses in your .env file for true cross-wallet transfers.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    await axelarAdapter.disconnect();
    console.log('\n✅ Axelar adapter disconnected');
  }
}

// Run the test
testRealAxelarTransfers().catch(console.error);
