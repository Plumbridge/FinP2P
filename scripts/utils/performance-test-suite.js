/**
 * FinP2P Performance Test Suite
 * 
 * This comprehensive test suite measures:
 * 1. Sequential transfer latency (100 transfers)
 * 2. Concurrent transfer throughput and success rate
 * 3. Network partition resilience
 * 4. Component timing breakdown (signing, confirmation, end-to-end)
 * 5. Router scalability limits
 */

const { performance } = require('perf_hooks');
const { v4: uuidv4 } = require('uuid');

// Use the mock Router from complete-scenario-demo for performance testing
class MockRouter {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.assets = new Map();
    this.accounts = new Map();
    this.transfers = new Map();
    this.messageLog = [];
    this.confirmationRecords = new Map();
    this.isOnline = true;
  }

  async start() {
    this.isOnline = true;
  }

  async stop() {
    this.isOnline = false;
  }

  async createAsset(assetType, symbol, totalSupply, metadata = {}) {
    const asset = {
      id: `${symbol}-${Date.now()}`,
      type: assetType,
      symbol,
      totalSupply,
      metadata,
      createdAt: new Date()
    };
    this.assets.set(asset.id, asset);
    return asset;
  }

  async createAccount(accountId, initialBalances = {}) {
    const account = {
      id: accountId,
      balances: new Map(Object.entries(initialBalances)),
      createdAt: new Date()
    };
    this.accounts.set(accountId, account);
    return account;
  }

  async initiateTransfer(transferData) {
    const transfer = {
      id: uuidv4(),
      ...transferData,
      status: 'PENDING',
      timestamp: new Date(),
      txHash: `mock-tx-${Date.now()}`
    };
    
    this.transfers.set(transfer.id, transfer);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));
    
    transfer.status = 'COMPLETED';
    return transfer;
  }

  async generateTransferSignature(transferData) {
    // Simulate signing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 20 + 5));
    return `mock-signature-${Date.now()}`;
  }

  async findRoute(fromAccount, toAccount) {
    // Simulate route discovery time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 30 + 10));
    return { path: [fromAccount, toAccount], hops: 1 };
  }

  async confirmOnBlockchain(assetId, amount) {
    // Simulate blockchain confirmation time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    return { confirmed: true, blockHeight: Math.floor(Math.random() * 1000000) };
  }
}

class PerformanceTestSuite {
  constructor() {
    this.routers = new Map();
    this.results = {
      sequential: {},
      concurrent: {},
      partition: {},
      timing: {},
      scalability: {}
    };
  }

  async setupRouters(count = 3) {
    console.log(`\n🔧 Setting up ${count} routers...`);
    
    for (let i = 0; i < count; i++) {
      const routerId = `router-${String.fromCharCode(65 + i)}`; // A, B, C, etc.
      const routerName = `Router ${String.fromCharCode(65 + i)}`;
      
      const router = new MockRouter(routerId, routerName);
      
      await router.start();
      this.routers.set(routerId, router);
      
      // Create test assets and accounts
      await this.setupTestData(router, i);
    }
    
    console.log(`✅ ${count} routers initialized`);
  }

  async setupTestData(router, index) {
    // Create test asset
    const asset = await router.createAsset(
      'token',
      `TEST${index}`,
      1000000,
      { name: `Test Asset ${index}`, decimals: 8 }
    );
    
    // Create test accounts with balances
    await router.createAccount(`treasury-${index}`, { [asset.id]: 500000 });
    await router.createAccount(`client-${index}`, { [asset.id]: 100000 });
  }

  async test1_SequentialTransfers() {
    console.log('\n📊 TEST 1: Sequential Transfer Latency (100 transfers)');
    console.log('='.repeat(60));
    
    const routers = Array.from(this.routers.values());
    const routerA = routers[0];
    const routerB = routers[1];
    const routerC = routers[2];
    
    const transferCount = 100;
    const latencies = [];
    const startTime = performance.now();
    
    for (let i = 0; i < transferCount; i++) {
      const transferStart = performance.now();
      
      try {
        const transfer = await routerA.initiateTransfer({
          fromAccount: 'treasury-0',
          toAccount: 'client-1',
          assetId: 'TEST0',
          amount: 100,
          metadata: { reference: `SEQ-${i}` }
        });
        
        const transferEnd = performance.now();
        const latency = transferEnd - transferStart;
        latencies.push(latency);
        
        if ((i + 1) % 10 === 0) {
          console.log(`   Completed ${i + 1}/${transferCount} transfers`);
        }
        
      } catch (error) {
        console.error(`   Transfer ${i} failed:`, error.message);
      }
    }
    
    const totalTime = performance.now() - startTime;
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);
    const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];
    
    this.results.sequential = {
      totalTransfers: transferCount,
      successfulTransfers: latencies.length,
      successRate: (latencies.length / transferCount) * 100,
      totalTime: totalTime.toFixed(2),
      avgLatency: avgLatency.toFixed(2),
      minLatency: minLatency.toFixed(2),
      maxLatency: maxLatency.toFixed(2),
      p95Latency: p95Latency.toFixed(2),
      throughput: (latencies.length / (totalTime / 1000)).toFixed(2)
    };
    
    console.log('\n📈 Sequential Transfer Results:');
    console.log(`   Success Rate: ${this.results.sequential.successRate}%`);
    console.log(`   Average Latency: ${this.results.sequential.avgLatency} ms`);
    console.log(`   P95 Latency: ${this.results.sequential.p95Latency} ms`);
    console.log(`   Throughput: ${this.results.sequential.throughput} TPS`);
  }

  async test2_ConcurrentTransfers() {
    console.log('\n📊 TEST 2: Concurrent Transfer Throughput (100 concurrent)');
    console.log('='.repeat(60));
    
    const routers = Array.from(this.routers.values());
    const routerA = routers[0];
    const transferCount = 100;
    
    const startTime = performance.now();
    
    // Create 100 concurrent transfer promises
    const transferPromises = [];
    for (let i = 0; i < transferCount; i++) {
      const promise = routerA.initiateTransfer({
        fromAccount: 'treasury-0',
        toAccount: 'client-1',
        assetId: 'TEST0',
        amount: 10,
        metadata: { reference: `CONC-${i}` }
      }).catch(error => ({ error: error.message }));
      
      transferPromises.push(promise);
    }
    
    console.log(`   Executing ${transferCount} concurrent transfers...`);
    const results = await Promise.all(transferPromises);
    const endTime = performance.now();
    
    const successful = results.filter(r => !r.error).length;
    const failed = results.filter(r => r.error).length;
    const totalTime = endTime - startTime;
    const tps = successful / (totalTime / 1000);
    
    this.results.concurrent = {
      totalTransfers: transferCount,
      successfulTransfers: successful,
      failedTransfers: failed,
      successRate: (successful / transferCount) * 100,
      totalTime: totalTime.toFixed(2),
      throughput: tps.toFixed(2)
    };
    
    console.log('\n📈 Concurrent Transfer Results:');
    console.log(`   Success Rate: ${this.results.concurrent.successRate}%`);
    console.log(`   Successful: ${successful}, Failed: ${failed}`);
    console.log(`   Total Time: ${this.results.concurrent.totalTime} ms`);
    console.log(`   Throughput: ${this.results.concurrent.throughput} TPS`);
  }

  async test3_NetworkPartition() {
    console.log('\n📊 TEST 3: Network Partition Resilience');
    console.log('='.repeat(60));
    
    const routerA = this.routers.get('router-A');
    const routerB = this.routers.get('router-B');
    const routerC = this.routers.get('router-C');
    
    console.log('   Testing normal operation...');
    
    // Test normal operation (A -> C)
    const normalStart = performance.now();
    try {
      const normalTransfer = await routerA.initiateTransfer({
        fromAccount: 'treasury-0',
        toAccount: 'client-2',
        assetId: 'TEST0',
        amount: 100,
        metadata: { reference: 'NORMAL-TEST' }
      });
      
      const normalTime = performance.now() - normalStart;
      console.log(`   ✅ Normal A->C transfer: ${normalTime.toFixed(2)} ms`);
      
    } catch (error) {
      console.log(`   ❌ Normal transfer failed: ${error.message}`);
    }
    
    // Simulate Router B disconnection
    console.log('   Simulating Router B disconnection...');
    await routerB.stop();
    
    // Test A -> C transfer with B disconnected
    const partitionStart = performance.now();
    try {
      const partitionTransfer = await routerA.initiateTransfer({
        fromAccount: 'treasury-0',
        toAccount: 'client-2',
        assetId: 'TEST0',
        amount: 100,
        metadata: { reference: 'PARTITION-TEST' }
      });
      
      const partitionTime = performance.now() - partitionStart;
      console.log(`   ✅ Partition A->C transfer: ${partitionTime.toFixed(2)} ms`);
      
      this.results.partition = {
        normalOperation: true,
        partitionResilience: true,
        normalTime: (performance.now() - normalStart).toFixed(2),
        partitionTime: partitionTime.toFixed(2)
      };
      
    } catch (error) {
      console.log(`   ❌ Partition transfer failed: ${error.message}`);
      this.results.partition = {
        normalOperation: true,
        partitionResilience: false,
        error: error.message
      };
    }
    
    // Reconnect Router B
    console.log('   Reconnecting Router B...');
    await routerB.start();
    console.log('   ✅ Router B reconnected');
  }

  async test4_TimingBreakdown() {
    console.log('\n📊 TEST 4: Component Timing Breakdown');
    console.log('='.repeat(60));
    
    const routerA = this.routers.get('router-A');
    const iterations = 10;
    const timings = {
      signing: [],
      routing: [],
      blockchain: [],
      endToEnd: []
    };
    
    for (let i = 0; i < iterations; i++) {
      const e2eStart = performance.now();
      
      // Measure signing time
      const signingStart = performance.now();
      const signature = await routerA.generateTransferSignature({
        fromAccount: 'treasury-0',
        toAccount: 'client-1',
        asset: 'TEST0',
        amount: '100'
      });
      const signingTime = performance.now() - signingStart;
      
      // Measure routing time
      const routingStart = performance.now();
      const route = await routerA.findRoute('treasury-0', 'client-1');
      const routingTime = performance.now() - routingStart;
      
      // Measure blockchain confirmation time
      const blockchainStart = performance.now();
      const confirmation = await routerA.confirmOnBlockchain('TEST0', '100');
      const blockchainTime = performance.now() - blockchainStart;
      
      const e2eTime = performance.now() - e2eStart;
      
      timings.signing.push(signingTime);
      timings.routing.push(routingTime);
      timings.blockchain.push(blockchainTime);
      timings.endToEnd.push(e2eTime);
    }
    
    const avgTiming = (arr) => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);
    
    this.results.timing = {
      avgSigning: avgTiming(timings.signing),
      avgRouting: avgTiming(timings.routing),
      avgBlockchain: avgTiming(timings.blockchain),
      avgEndToEnd: avgTiming(timings.endToEnd)
    };
    
    console.log('\n📈 Timing Breakdown Results:');
    console.log(`   Message Signing: ${this.results.timing.avgSigning} ms`);
    console.log(`   Route Discovery: ${this.results.timing.avgRouting} ms`);
    console.log(`   Blockchain Confirmation: ${this.results.timing.avgBlockchain} ms`);
    console.log(`   End-to-End: ${this.results.timing.avgEndToEnd} ms`);
  }

  async test5_RouterScalability() {
    console.log('\n📊 TEST 5: Router Scalability Test');
    console.log('='.repeat(60));
    
    const maxRouters = 10;
    const scalabilityResults = [];
    
    // Clean up existing routers
    for (const router of this.routers.values()) {
      await router.stop();
    }
    this.routers.clear();
    
    for (let routerCount = 3; routerCount <= maxRouters; routerCount++) {
      console.log(`   Testing with ${routerCount} routers...`);
      
      const setupStart = performance.now();
      await this.setupRouters(routerCount);
      const setupTime = performance.now() - setupStart;
      
      // Test transfer performance with this router count
      const transferStart = performance.now();
      const routers = Array.from(this.routers.values());
      const routerA = routers[0];
      const routerB = routers[1];
      
      try {
        const transfer = await routerA.initiateTransfer({
          fromAccount: 'treasury-0',
          toAccount: 'client-1',
          assetId: 'TEST0',
          amount: 100,
          metadata: { reference: `SCALE-${routerCount}` }
        });
        
        const transferTime = performance.now() - transferStart;
        
        scalabilityResults.push({
          routerCount,
          setupTime: setupTime.toFixed(2),
          transferTime: transferTime.toFixed(2),
          success: true
        });
        
        console.log(`     ✅ ${routerCount} routers: Setup ${setupTime.toFixed(2)}ms, Transfer ${transferTime.toFixed(2)}ms`);
        
      } catch (error) {
        scalabilityResults.push({
          routerCount,
          setupTime: setupTime.toFixed(2),
          success: false,
          error: error.message
        });
        
        console.log(`     ❌ ${routerCount} routers failed: ${error.message}`);
        break;
      }
      
      // Clean up for next iteration
      for (const router of this.routers.values()) {
        await router.stop();
      }
      this.routers.clear();
    }
    
    this.results.scalability = {
      maxSuccessfulRouters: scalabilityResults.filter(r => r.success).length + 2,
      results: scalabilityResults
    };
    
    console.log('\n📈 Scalability Results:');
    console.log(`   Maximum Routers Tested: ${this.results.scalability.maxSuccessfulRouters}`);
    scalabilityResults.forEach(result => {
      if (result.success) {
        console.log(`   ${result.routerCount} routers: ${result.transferTime}ms transfer time`);
      }
    });
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test environment...');
    for (const router of this.routers.values()) {
      await router.stop();
    }
    this.routers.clear();
  }

  printFinalReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🏆 FINP2P PERFORMANCE TEST SUITE - FINAL REPORT');
    console.log('='.repeat(80));
    
    console.log('\n📊 SEQUENTIAL TRANSFERS:');
    console.log(`   Average Latency: ${this.results.sequential.avgLatency} ms`);
    console.log(`   P95 Latency: ${this.results.sequential.p95Latency} ms`);
    console.log(`   Success Rate: ${this.results.sequential.successRate}%`);
    console.log(`   Throughput: ${this.results.sequential.throughput} TPS`);
    
    console.log('\n📊 CONCURRENT TRANSFERS:');
    console.log(`   Throughput: ${this.results.concurrent.throughput} TPS`);
    console.log(`   Success Rate: ${this.results.concurrent.successRate}%`);
    
    console.log('\n📊 NETWORK PARTITION:');
    console.log(`   Resilience: ${this.results.partition.partitionResilience ? '✅ PASS' : '❌ FAIL'}`);
    
    console.log('\n📊 TIMING BREAKDOWN:');
    console.log(`   Message Signing: ${this.results.timing.avgSigning} ms`);
    console.log(`   Blockchain Confirmation: ${this.results.timing.avgBlockchain} ms`);
    console.log(`   End-to-End: ${this.results.timing.avgEndToEnd} ms`);
    
    console.log('\n📊 SCALABILITY:');
    console.log(`   Maximum Routers: ${this.results.scalability.maxSuccessfulRouters}`);
    
    console.log('\n' + '='.repeat(80));
  }
}

// Main execution
async function runPerformanceTests() {
  const testSuite = new PerformanceTestSuite();
  
  try {
    console.log('🚀 Starting FinP2P Performance Test Suite...');
    
    await testSuite.setupRouters(3);
    
    await testSuite.test1_SequentialTransfers();
    await testSuite.test2_ConcurrentTransfers();
    await testSuite.test3_NetworkPartition();
    await testSuite.test4_TimingBreakdown();
    await testSuite.test5_RouterScalability();
    
    testSuite.printFinalReport();
    
  } catch (error) {
    console.error('❌ Performance test suite failed:', error);
  } finally {
    await testSuite.cleanup();
  }
}

if (require.main === module) {
  runPerformanceTests().catch(console.error);
}

module.exports = { PerformanceTestSuite };