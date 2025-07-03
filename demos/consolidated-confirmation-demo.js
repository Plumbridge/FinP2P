/**
 * Consolidated Confirmation System Demo
 * 
 * This demo consolidates confirmation functionality from multiple previous demos:
 * - Dual confirmation records creation and management
 * - Parallel confirmation processing
 * - Router database synchronization
 * - Regulatory reporting and audit trails
 * - Rollback scenarios and recovery
 * 
 * Replaces: dual-confirmation-demo.js, comprehensive-dual-confirmation-demo.js, parallel-confirmation-demo.js
 */

const axios = require('axios');
const winston = require('winston');
const { performance } = require('perf_hooks');

class ConsolidatedConfirmationDemo {
  constructor() {
    this.routers = {
      routerA: {
        id: 'router-a',
        endpoint: process.env.ROUTER_A_URL || 'http://localhost:3000',
        name: 'Router A (User-Centric)',
        database: {
          transfers: new Map(),
          confirmations: new Map(),
          userTransactions: new Map() // userId -> [transactions]
        }
      },
      routerB: {
        id: 'router-b', 
        endpoint: process.env.ROUTER_B_URL || 'http://localhost:3001',
        name: 'Router B (Asset-Centric)',
        database: {
          transfers: new Map(),
          confirmations: new Map(),
          assetTransactions: new Map() // assetId -> [transactions]
        }
      }
    };
    
    this.confirmationRecords = new Map();
    this.dualConfirmations = new Map();
    
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
    console.log('\n' + '='.repeat(80));
    console.log(`🔄 ${title}`);
    console.log('='.repeat(80));
  }

  logStep(step, description) {
    console.log(`\n📋 Step ${step}: ${description}`);
    console.log('-'.repeat(60));
  }

  async checkRouterHealth(routerName, endpoint) {
    try {
      const response = await axios.get(`${endpoint}/health`, { timeout: 5000 });
      console.log(`✅ ${routerName} is running and healthy`);
      return true;
    } catch (error) {
      console.log(`❌ ${routerName} is not running: ${error.message}`);
      return false;
    }
  }

  // Create confirmation record
  async createConfirmationRecord(transfer, routerId, status) {
    const confirmationId = `conf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const confirmation = {
      id: confirmationId,
      transferId: transfer.id,
      routerId: routerId,
      status: status,
      timestamp: new Date().toISOString(),
      signature: this.generateSignature(transfer, routerId),
      metadata: {
        fromAccount: transfer.fromAccount,
        toAccount: transfer.toAccount,
        asset: transfer.asset,
        amount: transfer.amount,
        ledgerTxHash: transfer.txHash || null
      }
    };
    
    return confirmation;
  }

  generateSignature(transfer, routerId) {
    const data = `${transfer.id}-${routerId}-${transfer.amount}-${Date.now()}`;
    return Buffer.from(data).toString('base64');
  }

  // Store confirmation in router's database
  async storeConfirmation(router, confirmation) {
    router.database.confirmations.set(confirmation.id, confirmation);
    
    // Store in user transactions (Router A perspective)
    if (router.id === 'router-a') {
      const userId = confirmation.metadata.fromAccount;
      if (!router.database.userTransactions.has(userId)) {
        router.database.userTransactions.set(userId, []);
      }
      router.database.userTransactions.get(userId).push(confirmation);
    }
    
    // Store in asset transactions (Router B perspective)
    if (router.id === 'router-b') {
      const assetId = confirmation.metadata.asset;
      if (!router.database.assetTransactions.has(assetId)) {
        router.database.assetTransactions.set(assetId, []);
      }
      router.database.assetTransactions.get(assetId).push(confirmation);
    }

    // Update dual confirmation status
    await this.updateDualConfirmationStatus(confirmation);
  }

  async updateDualConfirmationStatus(confirmation) {
    let dualConfirmation = this.dualConfirmations.get(confirmation.transferId);
    
    if (!dualConfirmation) {
      dualConfirmation = {
        transferId: confirmation.transferId,
        confirmations: {},
        status: 'pending',
        timestamp: new Date().toISOString()
      };
    }

    // Add this router's confirmation
    if (confirmation.routerId.includes('router-a')) {
      dualConfirmation.confirmations.routerA = confirmation;
    } else if (confirmation.routerId.includes('router-b')) {
      dualConfirmation.confirmations.routerB = confirmation;
    }

    // Update status based on confirmations
    const hasRouterA = !!dualConfirmation.confirmations.routerA;
    const hasRouterB = !!dualConfirmation.confirmations.routerB;
    const routerAConfirmed = dualConfirmation.confirmations.routerA?.status === 'confirmed';
    const routerBConfirmed = dualConfirmation.confirmations.routerB?.status === 'confirmed';

    if (hasRouterA && hasRouterB && routerAConfirmed && routerBConfirmed) {
      dualConfirmation.status = 'dual_confirmed';
    } else if (hasRouterA || hasRouterB) {
      dualConfirmation.status = 'partial_confirmed';
    } else {
      dualConfirmation.status = 'pending';
    }

    // Check for failures
    if ((hasRouterA && dualConfirmation.confirmations.routerA?.status === 'failed') ||
        (hasRouterB && dualConfirmation.confirmations.routerB?.status === 'failed')) {
      dualConfirmation.status = 'failed';
    }

    dualConfirmation.timestamp = new Date().toISOString();
    this.dualConfirmations.set(confirmation.transferId, dualConfirmation);
  }

  async demonstrateSuccessfulTransfer() {
    this.logSection('1. SUCCESSFUL TRANSFER WITH DUAL CONFIRMATION');
    
    this.logStep('1.1', 'Creating transfer request');
    const transfer = {
      id: `transfer-${Date.now()}`,
      fromAccount: 'user-001@router-a.com',
      toAccount: 'user-002@router-b.com',
      asset: 'GOLD-001',
      amount: '1000000', // 1 GOLD token (6 decimals)
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    console.log('📄 Transfer Details:');
    console.log(JSON.stringify(transfer, null, 2));
    
    this.logStep('1.2', 'Router A processes and confirms transfer');
    const confirmationA = await this.createConfirmationRecord(transfer, 'router-a', 'confirmed');
    await this.storeConfirmation(this.routers.routerA, confirmationA);
    
    console.log('✅ Router A Confirmation:');
    console.log(JSON.stringify(confirmationA, null, 2));
    
    this.logStep('1.3', 'Router B processes and confirms transfer');
    transfer.txHash = 'tx-' + Math.random().toString(36).substr(2, 16);
    const confirmationB = await this.createConfirmationRecord(transfer, 'router-b', 'confirmed');
    await this.storeConfirmation(this.routers.routerB, confirmationB);
    
    console.log('✅ Router B Confirmation:');
    console.log(JSON.stringify(confirmationB, null, 2));
    
    this.logStep('1.4', 'Checking dual confirmation status');
    const dualStatus = this.dualConfirmations.get(transfer.id);
    console.log('🔄 Dual Confirmation Status:');
    console.log(JSON.stringify(dualStatus, null, 2));
    
    return { transfer, confirmationA, confirmationB, dualStatus };
  }

  async demonstrateParallelProcessing() {
    this.logSection('2. PARALLEL CONFIRMATION PROCESSING');
    
    const transfers = this.generateTestTransfers(10);
    const startTime = performance.now();
    
    console.log(`🔄 Processing ${transfers.length} transfers with parallel confirmation...`);
    
    // Process all transfers in parallel
    const transferPromises = transfers.map(async (transfer, index) => {
      try {
        // Simulate processing delay
        await this.delay(Math.random() * 1000 + 500);
        
        // Create confirmations for both routers
        const confirmationA = await this.createConfirmationRecord(transfer, 'router-a', 'confirmed');
        const confirmationB = await this.createConfirmationRecord(transfer, 'router-b', 'confirmed');
        
        await this.storeConfirmation(this.routers.routerA, confirmationA);
        await this.storeConfirmation(this.routers.routerB, confirmationB);
        
        console.log(`✅ Transfer ${index + 1} confirmed by both routers`);
        
        return { transfer, confirmationA, confirmationB };
      } catch (error) {
        console.error(`❌ Transfer ${index + 1} failed:`, error.message);
        return { error: error.message };
      }
    });
    
    // Wait for all transfers to complete
    const results = await Promise.all(transferPromises);
    const processingTime = performance.now() - startTime;
    
    console.log(`\n⏱️  All transfers processed in ${processingTime.toFixed(2)}ms`);
    console.log(`📊 Success rate: ${results.filter(r => !r.error).length}/${results.length}`);
    
    return results;
  }

  generateTestTransfers(count) {
    const transfers = [];
    const amounts = [1000n, 5000n, 15000n, 50000n, 100000n];
    const assets = ['USD', 'EUR', 'BTC', 'ETH'];
    
    for (let i = 0; i < count; i++) {
      transfers.push({
        id: `parallel-transfer-${i + 1}-${Date.now()}`,
        fromAccount: `user-${i + 1}@router-a.com`,
        toAccount: `user-${i + 100}@router-b.com`,
        asset: assets[i % assets.length],
        amount: amounts[i % amounts.length].toString(),
        timestamp: new Date().toISOString(),
        status: 'pending'
      });
    }
    
    return transfers;
  }

  async demonstrateRollbackScenario() {
    this.logSection('3. ROLLBACK SCENARIO DEMONSTRATION');
    
    this.logStep('3.1', 'Creating transfer with partial failure');
    const transfer = {
      id: `rollback-transfer-${Date.now()}`,
      fromAccount: 'user-003@router-a.com',
      toAccount: 'user-004@router-b.com',
      asset: 'SILVER-001',
      amount: '500000',
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    // Router A confirms successfully
    const confirmationA = await this.createConfirmationRecord(transfer, 'router-a', 'confirmed');
    await this.storeConfirmation(this.routers.routerA, confirmationA);
    console.log('✅ Router A confirmed transfer');
    
    // Router B fails
    const confirmationB = await this.createConfirmationRecord(transfer, 'router-b', 'failed');
    await this.storeConfirmation(this.routers.routerB, confirmationB);
    console.log('❌ Router B failed to confirm transfer');
    
    this.logStep('3.2', 'Initiating rollback');
    await this.rollbackConfirmation(confirmationA.id, 'Counterparty router failed to confirm');
    console.log('🔄 Router A confirmation rolled back');
    
    const dualStatus = this.dualConfirmations.get(transfer.id);
    console.log('📊 Final dual confirmation status:', dualStatus.status);
    
    return { transfer, confirmationA, confirmationB, dualStatus };
  }

  async rollbackConfirmation(confirmationId, reason) {
    // Find the confirmation in router databases
    for (const router of Object.values(this.routers)) {
      const confirmation = router.database.confirmations.get(confirmationId);
      if (confirmation) {
        confirmation.status = 'rolled_back';
        confirmation.rollbackReason = reason;
        confirmation.rollbackTimestamp = new Date().toISOString();
        
        // Update dual confirmation status
        await this.updateDualConfirmationStatus(confirmation);
        return true;
      }
    }
    return false;
  }

  async generateRegulatoryReport() {
    this.logSection('4. REGULATORY REPORTING');
    
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const endDate = new Date();
    
    const allConfirmations = [];
    for (const router of Object.values(this.routers)) {
      allConfirmations.push(...Array.from(router.database.confirmations.values()));
    }
    
    const report = {
      reportId: `REG-REPORT-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      reportingPeriod: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      summary: {
        totalConfirmations: allConfirmations.length,
        successfulConfirmations: allConfirmations.filter(c => c.status === 'confirmed').length,
        failedConfirmations: allConfirmations.filter(c => c.status === 'failed').length,
        rolledBackConfirmations: allConfirmations.filter(c => c.status === 'rolled_back').length,
        dualConfirmations: this.dualConfirmations.size,
        fullyConfirmedTransfers: Array.from(this.dualConfirmations.values()).filter(dc => dc.status === 'dual_confirmed').length
      },
      confirmations: allConfirmations
    };
    
    console.log('📋 Regulatory Report Generated:');
    console.log(JSON.stringify(report.summary, null, 2));
    
    return report;
  }

  async run() {
    try {
      console.log('🚀 Starting Consolidated Confirmation System Demo');
      console.log('📅 Demo started at:', new Date().toISOString());
      
      // Check router health
      this.logSection('Router Health Check');
      await this.checkRouterHealth(this.routers.routerA.name, this.routers.routerA.endpoint);
      await this.checkRouterHealth(this.routers.routerB.name, this.routers.routerB.endpoint);
      
      // Run demonstrations
      const successfulTransfer = await this.demonstrateSuccessfulTransfer();
      const parallelResults = await this.demonstrateParallelProcessing();
      const rollbackResult = await this.demonstrateRollbackScenario();
      const report = await this.generateRegulatoryReport();
      
      console.log('\n🎉 Consolidated Confirmation Demo completed successfully!');
      console.log('📊 Demo Summary:');
      console.log('   - Dual confirmation: ✅ Demonstrated');
      console.log('   - Parallel processing: ✅ Demonstrated');
      console.log('   - Rollback scenario: ✅ Demonstrated');
      console.log('   - Regulatory reporting: ✅ Generated');
      
    } catch (error) {
      console.error('❌ Demo failed:', error.message);
      process.exit(1);
    }
  }
}

// Run the demo
if (require.main === module) {
  const demo = new ConsolidatedConfirmationDemo();
  demo.run().catch(console.error);
}

module.exports = ConsolidatedConfirmationDemo;