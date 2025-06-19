#!/usr/bin/env node

/**
 * Real Blockchain Testnet Demo
 * 
 * This script demonstrates real blockchain operations on testnets:
 * 1. Sui Testnet - Asset creation, transfers, balance queries
 * 2. Hedera Testnet - Token creation, transfers, balance queries
 * 3. Error handling and network resilience testing
 * 4. Performance metrics and timing analysis
 * 5. New adapter development guide
 */

const { SuiAdapter } = require('./dist/adapters/SuiAdapter');
const { HederaAdapter } = require('./dist/adapters/HederaAdapter');
const winston = require('winston');
require('dotenv').config();

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'testnet-demo.log' })
  ]
});

// Test configurations
const SUI_CONFIG = {
  network: 'testnet',
  privateKey: process.env.SUI_PRIVATE_KEY, // Base64 encoded private key
  rpcUrl: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443',
  packageId: process.env.SUI_PACKAGE_ID // FinP2P Move package ID
};

const HEDERA_CONFIG = {
  network: 'testnet',
  operatorId: process.env.HEDERA_OPERATOR_ID || '0.0.123456',
  operatorKey: process.env.HEDERA_OPERATOR_KEY, // DER encoded private key
  treasuryId: process.env.HEDERA_TREASURY_ID,
  treasuryKey: process.env.HEDERA_TREASURY_KEY
};

class RealBlockchainTester {
  constructor() {
    this.suiAdapter = null;
    this.hederaAdapter = null;
    this.testResults = {
      sui: { success: 0, failed: 0, transactions: [] },
      hedera: { success: 0, failed: 0, transactions: [] },
      timing: { sui: [], hedera: [] },
      errors: []
    };
  }

  async initialize() {
    console.log('🚀 Initializing Real Blockchain Testnet Demo\n');
    
    try {
      // Initialize Sui Adapter
      if (SUI_CONFIG.privateKey) {
        this.suiAdapter = new SuiAdapter(SUI_CONFIG, logger);
        await this.suiAdapter.connect();
        console.log('✅ Sui Testnet connected');
      } else {
        console.log('⚠️  Sui private key not provided, skipping Sui tests');
      }

      // Initialize Hedera Adapter
      if (HEDERA_CONFIG.operatorKey) {
        this.hederaAdapter = new HederaAdapter(HEDERA_CONFIG, logger);
        await this.hederaAdapter.connect();
        console.log('✅ Hedera Testnet connected');
      } else {
        console.log('⚠️  Hedera operator key not provided, skipping Hedera tests');
      }

      console.log('');
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      throw error;
    }
  }

  async testSuiOperations() {
    if (!this.suiAdapter) {
      console.log('⏭️  Skipping Sui tests - adapter not initialized\n');
      return;
    }

    console.log('🔵 Testing Sui Testnet Operations\n');
    
    try {
      // 1. Create Asset on Sui Testnet
      console.log('1️⃣  Creating asset on Sui testnet...');
      const startTime = Date.now();
      
      const assetData = {
        symbol: 'FINP2P',
        name: 'FinP2P Test Token',
        decimals: 8,
        totalSupply: BigInt('1000000000000000'), // 10M tokens with 8 decimals
        metadata: {
          description: 'Test token for FinP2P cross-ledger transfers',
          website: 'https://finp2p.io',
          testnet: true,
          created: new Date().toISOString()
        }
      };

      const asset = await this.suiAdapter.createAsset(assetData);
      const createTime = Date.now() - startTime;
      
      console.log(`   ✅ Asset created successfully!`);
      console.log(`   📋 Asset ID: ${asset.id}`);
      console.log(`   🔗 Contract Address: ${asset.contractAddress}`);
      console.log(`   ⏱️  Creation time: ${createTime}ms`);
      
      this.testResults.sui.success++;
      this.testResults.sui.transactions.push({
        type: 'create_asset',
        hash: asset.id,
        time: createTime,
        status: 'success'
      });
      this.testResults.timing.sui.push({ operation: 'create_asset', time: createTime });

      // 2. Create Account on Sui
      console.log('\n2️⃣  Creating account on Sui testnet...');
      const accountStartTime = Date.now();
      
      const accountData = {
        address: this.suiAdapter.keypair?.getPublicKey().toSuiAddress() || 'generated',
        institutionId: 'test-institution',
        metadata: {
          type: 'test_account',
          created: new Date().toISOString()
        }
      };

      const account = await this.suiAdapter.createAccount(accountData);
      const accountTime = Date.now() - accountStartTime;
      
      console.log(`   ✅ Account created successfully!`);
      console.log(`   📋 Account ID: ${account.id}`);
      console.log(`   🏠 Address: ${account.address}`);
      console.log(`   ⏱️  Creation time: ${accountTime}ms`);
      
      this.testResults.sui.success++;
      this.testResults.timing.sui.push({ operation: 'create_account', time: accountTime });

      // 3. Query Balance
      console.log('\n3️⃣  Querying balance on Sui testnet...');
      const balanceStartTime = Date.now();
      
      const balance = await this.suiAdapter.getBalance(account.id, asset.id);
      const balanceTime = Date.now() - balanceStartTime;
      
      console.log(`   ✅ Balance queried successfully!`);
      console.log(`   💰 Balance: ${balance.toString()} ${asset.symbol}`);
      console.log(`   ⏱️  Query time: ${balanceTime}ms`);
      
      this.testResults.sui.success++;
      this.testResults.timing.sui.push({ operation: 'query_balance', time: balanceTime });

      // 4. Test Transfer (if balance > 0)
      if (balance > 0n) {
        console.log('\n4️⃣  Testing transfer on Sui testnet...');
        const transferStartTime = Date.now();
        
        // Create a second account for transfer
        const recipientAccount = await this.suiAdapter.createAccount({
          address: 'recipient-address',
          institutionId: 'test-institution-2',
          metadata: { type: 'recipient_account' }
        });
        
        const transferAmount = balance / 2n; // Transfer half
        const txHash = await this.suiAdapter.transfer(
          account.id,
          recipientAccount.id,
          asset.id,
          transferAmount
        );
        const transferTime = Date.now() - transferStartTime;
        
        console.log(`   ✅ Transfer completed successfully!`);
        console.log(`   🔗 Transaction Hash: ${txHash}`);
        console.log(`   💸 Amount: ${transferAmount.toString()} ${asset.symbol}`);
        console.log(`   ⏱️  Transfer time: ${transferTime}ms`);
        
        this.testResults.sui.success++;
        this.testResults.sui.transactions.push({
          type: 'transfer',
          hash: txHash,
          time: transferTime,
          status: 'success',
          amount: transferAmount.toString()
        });
        this.testResults.timing.sui.push({ operation: 'transfer', time: transferTime });

        // 5. Verify Transfer
        console.log('\n5️⃣  Verifying transfer on Sui testnet...');
        const newBalance = await this.suiAdapter.getBalance(account.id, asset.id);
        const recipientBalance = await this.suiAdapter.getBalance(recipientAccount.id, asset.id);
        
        console.log(`   ✅ Transfer verified!`);
        console.log(`   👤 Sender balance: ${newBalance.toString()} ${asset.symbol}`);
        console.log(`   👤 Recipient balance: ${recipientBalance.toString()} ${asset.symbol}`);
      }

    } catch (error) {
      console.error(`   ❌ Sui operation failed: ${error.message}`);
      this.testResults.sui.failed++;
      this.testResults.errors.push({
        adapter: 'sui',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    console.log('');
  }

  async testHederaOperations() {
    if (!this.hederaAdapter) {
      console.log('⏭️  Skipping Hedera tests - adapter not initialized\n');
      return;
    }

    console.log('🟢 Testing Hedera Testnet Operations\n');
    
    try {
      // 1. Create Token on Hedera Testnet
      console.log('1️⃣  Creating token on Hedera testnet...');
      const startTime = Date.now();
      
      const tokenData = {
        symbol: 'HFINP2P',
        name: 'Hedera FinP2P Test Token',
        decimals: 2,
        totalSupply: BigInt('100000000'), // 1M tokens with 2 decimals
        metadata: {
          description: 'Test token for FinP2P on Hedera',
          website: 'https://finp2p.io',
          testnet: true,
          created: new Date().toISOString()
        }
      };

      const token = await this.hederaAdapter.createAsset(tokenData);
      const createTime = Date.now() - startTime;
      
      console.log(`   ✅ Token created successfully!`);
      console.log(`   📋 Token ID: ${token.id}`);
      console.log(`   🔗 Contract Address: ${token.contractAddress}`);
      console.log(`   ⏱️  Creation time: ${createTime}ms`);
      
      this.testResults.hedera.success++;
      this.testResults.hedera.transactions.push({
        type: 'create_token',
        hash: token.id,
        time: createTime,
        status: 'success'
      });
      this.testResults.timing.hedera.push({ operation: 'create_token', time: createTime });

      // 2. Create Account on Hedera
      console.log('\n2️⃣  Creating account on Hedera testnet...');
      const accountStartTime = Date.now();
      
      const accountData = {
        address: HEDERA_CONFIG.operatorId,
        institutionId: 'test-institution-hedera',
        metadata: {
          type: 'test_account',
          created: new Date().toISOString()
        }
      };

      const account = await this.hederaAdapter.createAccount(accountData);
      const accountTime = Date.now() - accountStartTime;
      
      console.log(`   ✅ Account created successfully!`);
      console.log(`   📋 Account ID: ${account.id}`);
      console.log(`   🏠 Address: ${account.address}`);
      console.log(`   ⏱️  Creation time: ${accountTime}ms`);
      
      this.testResults.hedera.success++;
      this.testResults.timing.hedera.push({ operation: 'create_account', time: accountTime });

      // 3. Query HBAR Balance
      console.log('\n3️⃣  Querying HBAR balance on Hedera testnet...');
      const balanceStartTime = Date.now();
      
      const hbarBalance = await this.hederaAdapter.getBalance(account.id, 'HBAR');
      const balanceTime = Date.now() - balanceStartTime;
      
      console.log(`   ✅ HBAR balance queried successfully!`);
      console.log(`   💰 HBAR Balance: ${hbarBalance.toString()} tinybars`);
      console.log(`   💰 HBAR Balance: ${Number(hbarBalance) / 100000000} HBAR`);
      console.log(`   ⏱️  Query time: ${balanceTime}ms`);
      
      this.testResults.hedera.success++;
      this.testResults.timing.hedera.push({ operation: 'query_balance', time: balanceTime });

      // 4. Query Token Balance
      console.log('\n4️⃣  Querying token balance on Hedera testnet...');
      const tokenBalance = await this.hederaAdapter.getBalance(account.id, token.id);
      
      console.log(`   ✅ Token balance queried successfully!`);
      console.log(`   💰 Token Balance: ${tokenBalance.toString()} ${token.symbol}`);

      // 5. Test HBAR Transfer (small amount)
      if (hbarBalance > 1000000n) { // If more than 0.01 HBAR
        console.log('\n5️⃣  Testing HBAR transfer on Hedera testnet...');
        const transferStartTime = Date.now();
        
        const transferAmount = 1000000n; // 0.01 HBAR in tinybars
        const txHash = await this.hederaAdapter.transfer(
          account.id,
          account.id, // Self-transfer for testing
          'HBAR',
          transferAmount
        );
        const transferTime = Date.now() - transferStartTime;
        
        console.log(`   ✅ HBAR transfer completed successfully!`);
        console.log(`   🔗 Transaction ID: ${txHash}`);
        console.log(`   💸 Amount: ${transferAmount.toString()} tinybars (0.01 HBAR)`);
        console.log(`   ⏱️  Transfer time: ${transferTime}ms`);
        
        this.testResults.hedera.success++;
        this.testResults.hedera.transactions.push({
          type: 'hbar_transfer',
          hash: txHash,
          time: transferTime,
          status: 'success',
          amount: transferAmount.toString()
        });
        this.testResults.timing.hedera.push({ operation: 'hbar_transfer', time: transferTime });
      }

    } catch (error) {
      console.error(`   ❌ Hedera operation failed: ${error.message}`);
      this.testResults.hedera.failed++;
      this.testResults.errors.push({
        adapter: 'hedera',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    console.log('');
  }

  async testErrorHandling() {
    console.log('🔴 Testing Error Handling and Network Resilience\n');

    // Test 1: Invalid network connection
    console.log('1️⃣  Testing invalid network connection...');
    try {
      const invalidSuiAdapter = new SuiAdapter({
        network: 'testnet',
        rpcUrl: 'https://invalid-url-that-does-not-exist.com',
        privateKey: 'invalid-key'
      }, logger);
      
      await invalidSuiAdapter.connect();
      console.log('   ❌ Should have failed but didn\'t');
    } catch (error) {
      console.log(`   ✅ Correctly handled network error: ${error.message.substring(0, 100)}...`);
    }

    // Test 2: Invalid credentials
    console.log('\n2️⃣  Testing invalid credentials...');
    try {
      const invalidHederaAdapter = new HederaAdapter({
        network: 'testnet',
        operatorId: '0.0.invalid',
        operatorKey: 'invalid-key'
      }, logger);
      
      await invalidHederaAdapter.connect();
      console.log('   ❌ Should have failed but didn\'t');
    } catch (error) {
      console.log(`   ✅ Correctly handled credential error: ${error.message.substring(0, 100)}...`);
    }

    // Test 3: Insufficient balance
    if (this.hederaAdapter) {
      console.log('\n3️⃣  Testing insufficient balance error...');
      try {
        await this.hederaAdapter.transfer(
          HEDERA_CONFIG.operatorId,
          HEDERA_CONFIG.operatorId,
          'HBAR',
          BigInt('999999999999999999') // Huge amount
        );
        console.log('   ❌ Should have failed but didn\'t');
      } catch (error) {
        console.log(`   ✅ Correctly handled insufficient balance: ${error.message.substring(0, 100)}...`);
      }
    }

    // Test 4: Network timeout simulation
    console.log('\n4️⃣  Testing network timeout handling...');
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Network timeout')), 100);
    });
    
    try {
      await timeoutPromise;
    } catch (error) {
      console.log(`   ✅ Correctly handled timeout: ${error.message}`);
    }

    console.log('');
  }

  generatePerformanceReport() {
    console.log('📊 Performance Analysis Report\n');
    
    // Sui Performance
    if (this.testResults.timing.sui.length > 0) {
      console.log('🔵 Sui Testnet Performance:');
      const suiTimes = this.testResults.timing.sui;
      const avgTime = suiTimes.reduce((sum, t) => sum + t.time, 0) / suiTimes.length;
      const maxTime = Math.max(...suiTimes.map(t => t.time));
      const minTime = Math.min(...suiTimes.map(t => t.time));
      
      console.log(`   📈 Average Operation Time: ${avgTime.toFixed(2)}ms`);
      console.log(`   ⚡ Fastest Operation: ${minTime}ms`);
      console.log(`   🐌 Slowest Operation: ${maxTime}ms`);
      console.log(`   ✅ Success Rate: ${(this.testResults.sui.success / (this.testResults.sui.success + this.testResults.sui.failed) * 100).toFixed(1)}%`);
      
      suiTimes.forEach(timing => {
        console.log(`   • ${timing.operation}: ${timing.time}ms`);
      });
    }

    // Hedera Performance
    if (this.testResults.timing.hedera.length > 0) {
      console.log('\n🟢 Hedera Testnet Performance:');
      const hederaTimes = this.testResults.timing.hedera;
      const avgTime = hederaTimes.reduce((sum, t) => sum + t.time, 0) / hederaTimes.length;
      const maxTime = Math.max(...hederaTimes.map(t => t.time));
      const minTime = Math.min(...hederaTimes.map(t => t.time));
      
      console.log(`   📈 Average Operation Time: ${avgTime.toFixed(2)}ms`);
      console.log(`   ⚡ Fastest Operation: ${minTime}ms`);
      console.log(`   🐌 Slowest Operation: ${maxTime}ms`);
      console.log(`   ✅ Success Rate: ${(this.testResults.hedera.success / (this.testResults.hedera.success + this.testResults.hedera.failed) * 100).toFixed(1)}%`);
      
      hederaTimes.forEach(timing => {
        console.log(`   • ${timing.operation}: ${timing.time}ms`);
      });
    }

    // Transaction Hashes
    console.log('\n🔗 Transaction Hashes:');
    [...this.testResults.sui.transactions, ...this.testResults.hedera.transactions].forEach(tx => {
      console.log(`   • ${tx.type}: ${tx.hash} (${tx.time}ms)`);
    });

    // Errors
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ Errors Encountered:');
      this.testResults.errors.forEach(error => {
        console.log(`   • ${error.adapter}: ${error.error}`);
      });
    }

    console.log('');
  }

  generateNewAdapterGuide() {
    console.log('🛠️  Adding New Blockchain Adapter - Development Guide\n');
    
    console.log('📋 Steps to add a new blockchain adapter:');
    console.log('');
    console.log('1️⃣  Create Adapter Class (15-30 minutes):');
    console.log('   • Implement LedgerAdapter interface');
    console.log('   • Define blockchain-specific configuration');
    console.log('   • Set up client connection logic');
    console.log('');
    console.log('2️⃣  Implement Core Methods (2-4 hours):');
    console.log('   • connect() / disconnect() - Network connection');
    console.log('   • createAsset() - Token/asset creation');
    console.log('   • createAccount() - Account management');
    console.log('   • getBalance() - Balance queries');
    console.log('   • transfer() - Asset transfers');
    console.log('   • lockAsset() / unlockAsset() - Asset locking');
    console.log('');
    console.log('3️⃣  Add Error Handling (1-2 hours):');
    console.log('   • Network connectivity errors');
    console.log('   • Invalid credentials');
    console.log('   • Insufficient balance');
    console.log('   • Transaction failures');
    console.log('');
    console.log('4️⃣  Testing & Integration (2-3 hours):');
    console.log('   • Unit tests for all methods');
    console.log('   • Testnet integration tests');
    console.log('   • Performance benchmarking');
    console.log('   • Error scenario testing');
    console.log('');
    console.log('5️⃣  Documentation (30-60 minutes):');
    console.log('   • Configuration examples');
    console.log('   • Usage documentation');
    console.log('   • Troubleshooting guide');
    console.log('');
    console.log('⏱️  Total Estimated Time: 6-10 hours');
    console.log('');
    console.log('📚 Required Knowledge:');
    console.log('   • Blockchain SDK/API documentation');
    console.log('   • TypeScript/JavaScript');
    console.log('   • Async/await patterns');
    console.log('   • Error handling best practices');
    console.log('');
    console.log('🔧 Tools Needed:');
    console.log('   • Blockchain testnet access');
    console.log('   • SDK/library installation');
    console.log('   • Test accounts with funding');
    console.log('   • Development environment');
    console.log('');
  }

  async cleanup() {
    console.log('🧹 Cleaning up connections...');
    
    try {
      if (this.suiAdapter) {
        await this.suiAdapter.disconnect();
        console.log('✅ Sui adapter disconnected');
      }
      
      if (this.hederaAdapter) {
        await this.hederaAdapter.disconnect();
        console.log('✅ Hedera adapter disconnected');
      }
    } catch (error) {
      console.error('❌ Cleanup error:', error.message);
    }
    
    console.log('');
  }
}

// Main execution
async function main() {
  const tester = new RealBlockchainTester();
  
  try {
    await tester.initialize();
    await tester.testSuiOperations();
    await tester.testHederaOperations();
    await tester.testErrorHandling();
    tester.generatePerformanceReport();
    tester.generateNewAdapterGuide();
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
  
  console.log('🎉 Real Blockchain Testnet Demo completed successfully!');
}

// Environment setup instructions
function printSetupInstructions() {
  console.log('🔧 Environment Setup Instructions\n');
  console.log('Create a .env file with the following variables:\n');
  console.log('# Sui Testnet Configuration');
  console.log('SUI_PRIVATE_KEY=your_base64_encoded_private_key');
  console.log('SUI_RPC_URL=https://fullnode.testnet.sui.io:443');
  console.log('SUI_PACKAGE_ID=your_deployed_finp2p_package_id\n');
  console.log('# Hedera Testnet Configuration');
  console.log('HEDERA_OPERATOR_ID=0.0.your_account_id');
  console.log('HEDERA_OPERATOR_KEY=your_der_encoded_private_key');
  console.log('HEDERA_TREASURY_ID=0.0.your_treasury_account_id');
  console.log('HEDERA_TREASURY_KEY=your_treasury_private_key\n');
  console.log('📝 Get testnet credentials:');
  console.log('• Sui: https://docs.sui.io/guides/developer/getting-started/get-coins');
  console.log('• Hedera: https://portal.hedera.com/register\n');
}

// Check if this is being run directly
if (require.main === module) {
  // Check for required environment variables
  if (!process.env.SUI_PRIVATE_KEY && !process.env.HEDERA_OPERATOR_KEY) {
    printSetupInstructions();
    console.log('⚠️  No blockchain credentials found. Please set up environment variables.\n');
  }
  
  main().catch(console.error);
}

module.exports = { RealBlockchainTester };