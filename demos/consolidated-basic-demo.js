/**
 * Consolidated Basic FinP2P Demo
 * 
 * This demo consolidates basic functionality from multiple previous demos:
 * - Basic router initialization and health checks
 * - Simple asset transfers
 * - Basic confirmation records
 * - Router communication patterns
 * 
 * Replaces: basic-demo.js, parts of complete-scenario-demo.js
 */

const axios = require('axios');
const winston = require('winston');

class ConsolidatedBasicDemo {
  constructor() {
    this.routers = {
      primary: {
        id: 'router-primary',
        endpoint: process.env.PRIMARY_ROUTER_URL || 'http://localhost:3000',
        name: 'Primary Router'
      },
      secondary: {
        id: 'router-secondary', 
        endpoint: process.env.SECONDARY_ROUTER_URL || 'http://localhost:3001',
        name: 'Secondary Router'
      }
    };
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        })
      ),
      transports: [new winston.transports.Console()]
    });
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  logSection(title) {
    console.log('\n' + '='.repeat(60));
    console.log(`🔄 ${title}`);
    console.log('='.repeat(60));
  }

  async checkRouterHealth(router) {
    try {
      const response = await axios.get(`${router.endpoint}/health`, {
        timeout: 5000
      });
      console.log(`✅ ${router.name} is healthy:`, response.data);
      return true;
    } catch (error) {
      console.log(`❌ ${router.name} is not responding:`, error.message);
      return false;
    }
  }

  async createAsset(router, assetData) {
    const asset = {
      id: `${router.id}-${assetData.symbol}-${Date.now()}`,
      ...assetData,
      createdAt: new Date().toISOString(),
      createdBy: router.id
    };

    this.logger.info(`💰 Created ${assetData.type} ${assetData.symbol} on ${router.name}`);
    this.logger.info(`📋 Asset ID: ${asset.id}`);
    
    return asset;
  }

  async createAccount(router, accountId, initialBalances = {}) {
    const account = {
      id: accountId,
      routerId: router.id,
      balances: new Map(Object.entries(initialBalances)),
      createdAt: new Date().toISOString()
    };

    this.logger.info(`👤 Created account: ${accountId} on ${router.name}`);
    return account;
  }

  async runBasicTransfer() {
    this.logSection('Basic Transfer Demo');
    
    const transferData = {
      id: 'basic-transfer-001',
      from: 'user-alice',
      to: 'user-bob',
      asset: 'USD',
      amount: 100,
      timestamp: new Date().toISOString()
    };

    console.log('📤 Initiating basic transfer:', transferData);
    
    // Simulate transfer processing
    await this.delay(1000);
    console.log('✅ Basic transfer completed successfully');
    
    return transferData;
  }

  async runCrossRouterTransfer() {
    this.logSection('Cross-Router Transfer Demo');
    
    // Create assets on different routers
    const bondAsset = await this.createAsset(this.routers.primary, {
      symbol: 'BOND',
      type: 'bond',
      totalSupply: 1000000
    });
    
    const stablecoinAsset = await this.createAsset(this.routers.secondary, {
      symbol: 'USDC',
      type: 'stablecoin',
      totalSupply: 10000000
    });

    // Create accounts
    const buyerAccount = await this.createAccount(this.routers.secondary, 'buyer-001', {
      [stablecoinAsset.id]: 50000
    });
    
    const sellerAccount = await this.createAccount(this.routers.primary, 'seller-001', {
      [bondAsset.id]: 100
    });

    // Simulate cross-router transfer
    const transferData = {
      id: `transfer-${Date.now()}`,
      fromRouter: this.routers.secondary.id,
      toRouter: this.routers.primary.id,
      fromAccount: buyerAccount.id,
      toAccount: sellerAccount.id,
      paymentAsset: stablecoinAsset.id,
      paymentAmount: 10000,
      receivedAsset: bondAsset.id,
      receivedAmount: 10,
      timestamp: new Date().toISOString()
    };

    console.log('🔄 Processing cross-router transfer:', transferData);
    await this.delay(2000);
    console.log('✅ Cross-router transfer completed successfully');
    
    return transferData;
  }

  async run() {
    try {
      console.log('🚀 Starting Consolidated Basic FinP2P Demo');
      console.log('📅 Demo started at:', new Date().toISOString());
      
      // Check router health
      this.logSection('Router Health Check');
      const primaryHealthy = await this.checkRouterHealth(this.routers.primary);
      const secondaryHealthy = await this.checkRouterHealth(this.routers.secondary);
      
      // Run basic transfer
      await this.runBasicTransfer();
      
      // Run cross-router transfer
      await this.runCrossRouterTransfer();
      
      console.log('\n🎉 Consolidated Basic Demo completed successfully!');
      console.log('📊 Demo Summary:');
      console.log('   - Router health checks: ✅ Completed');
      console.log('   - Basic transfer: ✅ Completed');
      console.log('   - Cross-router transfer: ✅ Completed');
      
    } catch (error) {
      console.error('❌ Demo failed:', error.message);
      process.exit(1);
    }
  }
}

// Run the demo
if (require.main === module) {
  const demo = new ConsolidatedBasicDemo();
  demo.run().catch(console.error);
}

module.exports = ConsolidatedBasicDemo;