/**
 * Enhanced Dual Confirmation Records Demonstration
 * 
 * This demo showcases the complete FinP2P protocol implementation:
 * 1. Primary Router Authority validation before transfers
 * 2. Dual confirmation records creation and management
 * 3. Router database synchronization with authority checks
 * 4. Cross-ledger transfers with dual confirmation
 * 5. Rollback scenarios and recovery
 * 6. Regulatory reporting and audit trails
 * 7. Integration with blockchain transaction processing
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class DualConfirmationDemo {
  constructor() {
    this.routerA = {
      id: 'router-a',
      endpoint: 'http://localhost:3000',
      database: {
        transfers: new Map(),
        confirmations: new Map(),
        userTransactions: new Map() // userId -> [transactions]
      }
    };
    
    this.routerB = {
      id: 'router-b', 
      endpoint: 'http://localhost:3001',
      database: {
        transfers: new Map(),
        confirmations: new Map(),
        assetTransactions: new Map() // assetId -> [transactions]
      }
    };
    
    this.transfers = new Map();
    this.confirmationRecords = new Map();
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  logSection(title) {
    console.log('\n' + '='.repeat(80));
    console.log(`🔄 ${title}`);
    console.log('='.repeat(80));
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

  async registerAssetsWithAuthority() {
    try {
      // Register USDC with Router A as primary authority
      const usdcAsset = {
        assetId: 'USDC-ETH-0xa0b86a33e6ba3b936f0b85ae3e3c1e0b',
        metadata: {
          assetType: 'stablecoin',
          blockchain: 'ethereum',
          contractAddress: '0xa0b86a33e6ba3b936f0b85ae3e3c1e0b',
          symbol: 'USDC',
          decimals: 6
        },
        backupRouterIds: [this.routerB.id]
      };

      const response = await axios.post(
        `${this.routerA.endpoint}/assets/register`,
        usdcAsset,
        { timeout: 10000 }
      );

      if (response.data.success) {
        console.log(`✅ USDC asset registered with Router A as primary authority`);
        console.log(`   Asset ID: ${usdcAsset.assetId}`);
        console.log(`   Primary Router: ${this.routerA.id}`);
        console.log(`   Backup Router: ${this.routerB.id}`);
      } else {
        console.log(`❌ Failed to register USDC asset: ${response.data.error}`);
      }
    } catch (error) {
      console.log(`❌ Asset registration failed: ${error.message}`);
    }
  }

  logStep(step, description) {
    console.log(`\n📋 Step ${step}: ${description}`);
    console.log('-'.repeat(60));
  }

  async makeRequest(method, url, data = null) {
    try {
      const config = { method, url };
      if (data) config.data = data;
      
      const response = await axios(config);
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || error.message, 
        status: error.response?.status 
      };
    }
  }

  // Simulate dual confirmation record creation
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
    await this.storeConfirmation(this.routerA, confirmationA);
    
    console.log('✅ Router A Confirmation:');
    console.log(JSON.stringify(confirmationA, null, 2));
    
    this.logStep('1.3', 'Router B processes and confirms transfer');
    transfer.txHash = 'tx-' + Math.random().toString(36).substr(2, 16);
    const confirmationB = await this.createConfirmationRecord(transfer, 'router-b', 'confirmed');
    await this.storeConfirmation(this.routerB, confirmationB);
    
    console.log('✅ Router B Confirmation:');
    console.log(JSON.stringify(confirmationB, null, 2));
    
    this.logStep('1.4', 'Both confirmations stored successfully');
    console.log(`🔗 Dual confirmation complete for transfer: ${transfer.id}`);
    console.log(`📊 Router A confirmations: ${this.routerA.database.confirmations.size}`);
    console.log(`📊 Router B confirmations: ${this.routerB.database.confirmations.size}`);
    
    return { transfer, confirmationA, confirmationB };
  }

  async demonstrateMultipleTransfers() {
    this.logSection('2. MULTIPLE TRANSFERS FOR DATABASE DEMONSTRATION');
    
    const transfers = [
      {
        id: `transfer-${Date.now()}-1`,
        fromAccount: 'user-001@router-a.com',
        toAccount: 'user-003@router-b.com',
        asset: 'SILVER-001',
        amount: '5000000'
      },
      {
        id: `transfer-${Date.now()}-2`,
        fromAccount: 'user-002@router-a.com',
        toAccount: 'user-004@router-b.com',
        asset: 'GOLD-001',
        amount: '2000000'
      },
      {
        id: `transfer-${Date.now()}-3`,
        fromAccount: 'user-001@router-a.com',
        toAccount: 'user-005@router-b.com',
        asset: 'PLATINUM-001',
        amount: '500000'
      }
    ];
    
    for (let i = 0; i < transfers.length; i++) {
      const transfer = transfers[i];
      this.logStep(`2.${i+1}`, `Processing transfer ${i+1}`);
      
      transfer.timestamp = new Date().toISOString();
      transfer.status = 'confirmed';
      transfer.txHash = 'tx-' + Math.random().toString(36).substr(2, 16);
      
      // Create confirmations for both routers
      const confirmationA = await this.createConfirmationRecord(transfer, 'router-a', 'confirmed');
      const confirmationB = await this.createConfirmationRecord(transfer, 'router-b', 'confirmed');
      
      await this.storeConfirmation(this.routerA, confirmationA);
      await this.storeConfirmation(this.routerB, confirmationB);
      
      console.log(`✅ Transfer ${transfer.id} confirmed by both routers`);
      await this.delay(100);
    }
  }

  async queryConfirmationRecords() {
    this.logSection('3. QUERYING CONFIRMATION RECORDS FROM BOTH ROUTERS');
    
    this.logStep('3.1', 'Router A confirmation records');
    console.log('📋 Router A Database:');
    console.log(`Total confirmations: ${this.routerA.database.confirmations.size}`);
    
    for (const [id, confirmation] of this.routerA.database.confirmations) {
      console.log(`  🔸 ${id}: ${confirmation.metadata.asset} - ${confirmation.status}`);
    }
    
    this.logStep('3.2', 'Router B confirmation records');
    console.log('📋 Router B Database:');
    console.log(`Total confirmations: ${this.routerB.database.confirmations.size}`);
    
    for (const [id, confirmation] of this.routerB.database.confirmations) {
      console.log(`  🔸 ${id}: ${confirmation.metadata.asset} - ${confirmation.status}`);
    }
  }

  async showRouterAUserTransactions() {
    this.logSection('4. ROUTER A DATABASE - ALL USER TRANSACTIONS');
    
    console.log('👥 Router A maintains records of ALL transactions by its users:');
    console.log('(Organized by user for compliance and auditing)');
    
    for (const [userId, transactions] of this.routerA.database.userTransactions) {
      console.log(`\n🔹 User: ${userId}`);
      console.log(`   Total transactions: ${transactions.length}`);
      
      transactions.forEach((tx, index) => {
        console.log(`   ${index + 1}. ${tx.metadata.asset}: ${tx.metadata.amount} units`);
        console.log(`      To: ${tx.metadata.toAccount}`);
        console.log(`      Status: ${tx.status}`);
        console.log(`      Time: ${tx.timestamp}`);
        console.log(`      Confirmation ID: ${tx.id}`);
      });
    }
  }

  async showRouterBAssetTransactions() {
    this.logSection('5. ROUTER B DATABASE - ALL ASSET TRANSACTIONS');
    
    console.log('💎 Router B maintains records of ALL transactions for its assets:');
    console.log('(Organized by asset for asset management and compliance)');
    
    for (const [assetId, transactions] of this.routerB.database.assetTransactions) {
      console.log(`\n🔸 Asset: ${assetId}`);
      console.log(`   Total transactions: ${transactions.length}`);
      
      transactions.forEach((tx, index) => {
        console.log(`   ${index + 1}. Amount: ${tx.metadata.amount} units`);
        console.log(`      From: ${tx.metadata.fromAccount}`);
        console.log(`      To: ${tx.metadata.toAccount}`);
        console.log(`      Status: ${tx.status}`);
        console.log(`      Time: ${tx.timestamp}`);
        console.log(`      Confirmation ID: ${tx.id}`);
      });
    }
  }

  async demonstratePartialFailure() {
    this.logSection('6. PARTIAL CONFIRMATION FAILURE & ROLLBACK');
    
    this.logStep('6.1', 'Creating transfer that will partially fail');
    const transfer = {
      id: `transfer-fail-${Date.now()}`,
      fromAccount: 'user-006@router-a.com',
      toAccount: 'user-007@router-b.com',
      asset: 'DIAMOND-001',
      amount: '100000',
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    console.log('📄 Transfer Details:');
    console.log(JSON.stringify(transfer, null, 2));
    
    this.logStep('6.2', 'Router A confirms successfully');
    const confirmationA = await this.createConfirmationRecord(transfer, 'router-a', 'confirmed');
    await this.storeConfirmation(this.routerA, confirmationA);
    console.log('✅ Router A confirmation stored');
    
    this.logStep('6.3', 'Router B fails to confirm (simulated failure)');
    console.log('❌ Router B confirmation failed - network timeout');
    console.log('🔄 Initiating rollback procedure...');
    
    this.logStep('6.4', 'Rollback process');
    // Update Router A's confirmation to failed status
    confirmationA.status = 'failed';
    confirmationA.rollbackReason = 'Router B confirmation timeout';
    confirmationA.rollbackTimestamp = new Date().toISOString();
    
    console.log('🔙 Router A confirmation updated to failed status');
    console.log('📝 Rollback reason recorded: Router B confirmation timeout');
    console.log('✅ Transfer rolled back successfully');
    
    this.logStep('6.5', 'Final status check');
    console.log('📊 Final confirmation status:');
    console.log(`   Router A: ${confirmationA.status}`);
    console.log(`   Router B: No confirmation (failed)`);
    console.log(`   Transfer: ${transfer.status} -> failed`);
    
    return { transfer, confirmationA, rollback: true };
  }

  async exportRegulatoryReport() {
    this.logSection('7. REGULATORY REPORTING EXPORT');
    
    this.logStep('7.1', 'Generating comprehensive regulatory report');
    
    const report = {
      reportId: `REG-REPORT-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      reportingPeriod: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      },
      routerA: {
        routerId: this.routerA.id,
        totalConfirmations: this.routerA.database.confirmations.size,
        userTransactions: {},
        confirmations: []
      },
      routerB: {
        routerId: this.routerB.id,
        totalConfirmations: this.routerB.database.confirmations.size,
        assetTransactions: {},
        confirmations: []
      },
      summary: {
        totalTransfers: 0,
        successfulTransfers: 0,
        failedTransfers: 0,
        totalVolume: {},
        complianceStatus: 'COMPLIANT'
      }
    };
    
    // Export Router A data
    for (const [userId, transactions] of this.routerA.database.userTransactions) {
      report.routerA.userTransactions[userId] = transactions.map(tx => ({
        confirmationId: tx.id,
        transferId: tx.transferId,
        asset: tx.metadata.asset,
        amount: tx.metadata.amount,
        toAccount: tx.metadata.toAccount,
        status: tx.status,
        timestamp: tx.timestamp,
        signature: tx.signature
      }));
    }
    
    for (const [id, confirmation] of this.routerA.database.confirmations) {
      report.routerA.confirmations.push(confirmation);
    }
    
    // Export Router B data
    for (const [assetId, transactions] of this.routerB.database.assetTransactions) {
      report.routerB.assetTransactions[assetId] = transactions.map(tx => ({
        confirmationId: tx.id,
        transferId: tx.transferId,
        amount: tx.metadata.amount,
        fromAccount: tx.metadata.fromAccount,
        toAccount: tx.metadata.toAccount,
        status: tx.status,
        timestamp: tx.timestamp,
        signature: tx.signature
      }));
    }
    
    for (const [id, confirmation] of this.routerB.database.confirmations) {
      report.routerB.confirmations.push(confirmation);
    }
    
    // Calculate summary statistics
    const allConfirmations = [...this.routerA.database.confirmations.values()];
    report.summary.totalTransfers = allConfirmations.length;
    report.summary.successfulTransfers = allConfirmations.filter(c => c.status === 'confirmed').length;
    report.summary.failedTransfers = allConfirmations.filter(c => c.status === 'failed').length;
    
    // Calculate volume by asset
    allConfirmations.forEach(confirmation => {
      const asset = confirmation.metadata.asset;
      const amount = parseInt(confirmation.metadata.amount);
      if (!report.summary.totalVolume[asset]) {
        report.summary.totalVolume[asset] = 0;
      }
      if (confirmation.status === 'confirmed') {
        report.summary.totalVolume[asset] += amount;
      }
    });
    
    this.logStep('7.2', 'Saving report to file');
    const reportPath = path.join(__dirname, `regulatory-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log('📄 Regulatory report generated:');
    console.log(`   Report ID: ${report.reportId}`);
    console.log(`   File: ${reportPath}`);
    console.log(`   Total transfers: ${report.summary.totalTransfers}`);
    console.log(`   Successful: ${report.summary.successfulTransfers}`);
    console.log(`   Failed: ${report.summary.failedTransfers}`);
    console.log(`   Assets traded: ${Object.keys(report.summary.totalVolume).join(', ')}`);
    
    this.logStep('7.3', 'Report summary');
    console.log('📊 Volume by asset:');
    for (const [asset, volume] of Object.entries(report.summary.totalVolume)) {
      console.log(`   ${asset}: ${volume} units`);
    }
    
    return report;
  }

  async demonstrateQueryAPIs() {
    this.logSection('8. QUERY APIs FOR CONFIRMATION RECORDS');
    
    this.logStep('8.1', 'Simulated API endpoints for querying confirmations');
    
    console.log('🔗 Available API endpoints:');
    console.log('   GET /api/confirmations - Get all confirmations');
    console.log('   GET /api/confirmations/:id - Get specific confirmation');
    console.log('   GET /api/users/:userId/transactions - Get user transactions (Router A)');
    console.log('   GET /api/assets/:assetId/transactions - Get asset transactions (Router B)');
    console.log('   GET /api/transfers/:transferId/confirmations - Get dual confirmations');
    
    this.logStep('8.2', 'Sample API responses');
    
    // Simulate querying a specific transfer's dual confirmations
    const sampleTransferId = Array.from(this.routerA.database.confirmations.values())[0]?.transferId;
    if (sampleTransferId) {
      console.log(`\n📋 Query: GET /api/transfers/${sampleTransferId}/confirmations`);
      
      const routerAConfirmation = Array.from(this.routerA.database.confirmations.values())
        .find(c => c.transferId === sampleTransferId);
      const routerBConfirmation = Array.from(this.routerB.database.confirmations.values())
        .find(c => c.transferId === sampleTransferId);
      
      const dualConfirmation = {
        transferId: sampleTransferId,
        confirmations: {
          routerA: routerAConfirmation || null,
          routerB: routerBConfirmation || null
        },
        status: (routerAConfirmation && routerBConfirmation) ? 'dual_confirmed' : 'partial_confirmed',
        timestamp: new Date().toISOString()
      };
      
      console.log('📄 Response:');
      console.log(JSON.stringify(dualConfirmation, null, 2));
    }
  }

  async run() {
    console.log('🚀 Starting Enhanced FinP2P Dual Confirmation System Demonstration');
    console.log('=' .repeat(80));
    
    console.log('This demo demonstrates the complete FinP2P protocol:');
    console.log('• Primary Router Authority validation');
    console.log('• Dual confirmation record creation');
    console.log('• Cross-ledger transfer processing');
    console.log('• Router database synchronization');
    console.log('• Rollback and recovery mechanisms');
    console.log('• Regulatory reporting features');
    console.log('• Real blockchain integration simulation');
    
    try {
       // 1. Check router health and Primary Router Authority
       console.log('\n📋 Step 1: Checking router health and Primary Router Authority');
       console.log('-'.repeat(60));
       const routerAHealthy = await this.checkRouterHealth('Router A', 'http://localhost:3001');
       const routerBHealthy = await this.checkRouterHealth('Router B', 'http://localhost:3002');
       
       if (!routerAHealthy) {
         console.log('❌ Router A must be running for this demo. Please start it first.');
         return;
       }
       
       // 2. Register assets with Primary Router Authority
       console.log('\n📋 Step 2: Registering assets with Primary Router Authority');
       console.log('-'.repeat(60));
       await this.registerAssetsWithAuthority();
       await this.delay(1000);
       
       // 3. Demonstrate successful transfer with dual confirmation
       await this.demonstrateSuccessfulTransfer();
       await this.delay(1000);
      
      // 2. Create multiple transfers for database demonstration
      await this.demonstrateMultipleTransfers();
      await this.delay(1000);
      
      // 3. Query confirmation records from both routers
      await this.queryConfirmationRecords();
      await this.delay(1000);
      
      // 4. Show Router A's user-centric database
      await this.showRouterAUserTransactions();
      await this.delay(1000);
      
      // 5. Show Router B's asset-centric database
      await this.showRouterBAssetTransactions();
      await this.delay(1000);
      
      // 6. Demonstrate partial failure and rollback
      await this.demonstratePartialFailure();
      await this.delay(1000);
      
      // 7. Export regulatory report
      await this.exportRegulatoryReport();
      await this.delay(1000);
      
      // 8. Demonstrate query APIs
      await this.demonstrateQueryAPIs();
      
      console.log('\n' + '='.repeat(80));
      console.log('✅ Dual Confirmation Record System Demonstration Complete!');
      console.log('='.repeat(80));
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
    }
  }
}

// Run the demonstration
if (require.main === module) {
  const demo = new DualConfirmationDemo();
  demo.run().catch(console.error);
}

module.exports = DualConfirmationDemo;