/**
 * Basic FinP2P Demo
 * 
 * This demo showcases basic FinP2P functionality:
 * 1. Router initialization
 * 2. Simple asset transfer
 * 3. Basic confirmation
 */

const axios = require('axios');

class BasicDemo {
  constructor() {
    this.routerA = {
      id: 'router-a',
      endpoint: 'http://localhost:3000'
    };
    
    this.routerB = {
      id: 'router-b', 
      endpoint: 'http://localhost:3001'
    };
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
      console.log(`✅ ${router.id} is healthy:`, response.data);
      return true;
    } catch (error) {
      console.log(`❌ ${router.id} is not responding:`, error.message);
      return false;
    }
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

  async run() {
    try {
      console.log('🚀 Starting Basic FinP2P Demo');
      console.log('📅 Demo started at:', new Date().toISOString());
      
      // Check if routers are running (optional for basic demo)
      this.logSection('Router Health Check');
      await this.checkRouterHealth(this.routerA);
      await this.checkRouterHealth(this.routerB);
      
      // Run basic transfer
      await this.runBasicTransfer();
      
      console.log('\n🎉 Basic Demo completed successfully!');
      console.log('📊 Demo Summary:');
      console.log('   - Basic transfer: ✅ Completed');
      console.log('   - Router health checks: ✅ Attempted');
      
    } catch (error) {
      console.error('❌ Demo failed:', error.message);
      process.exit(1);
    }
  }
}

// Run the demo
if (require.main === module) {
  const demo = new BasicDemo();
  demo.run().catch(console.error);
}

module.exports = BasicDemo;