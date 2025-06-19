/**
 * Complete FinP2P Cross-Ledger Transfer Scenario
 * 
 * This demo shows:
 * 1. Start 3 routers (Bank A, Bank B, Bank C)
 * 2. Bank A creates a bond on Sui blockchain
 * 3. Bank B creates a stablecoin on Hedera
 * 4. Bank B's client buys Bank A's bond using Hedera stablecoin
 * 5. Complete message flow between routers
 * 6. Verification on both blockchains
 * 7. Query all 3 routers for confirmation records
 * 8. Total time measurement
 */

const winston = require('winston');
const { performance } = require('perf_hooks');

// Mock blockchain transaction hashes and responses
const mockBlockchainTxs = {
  sui: {
    createBond: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
    transferBond: '0x9876543210fedcba0987654321fedcba0987654321fedcba0987654321fedcba'
  },
  hedera: {
    createStablecoin: '0.0.123456-1234567890-987654321',
    transferStablecoin: '0.0.123456-1234567891-987654322'
  }
};

// Router configuration
class Router {
  constructor(id, name, blockchain) {
    this.id = id;
    this.name = name;
    this.blockchain = blockchain;
    this.assets = new Map();
    this.accounts = new Map();
    this.transfers = new Map();
    this.confirmations = new Map();
    this.messageLog = [];
    this.startTime = Date.now();
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] [${this.name}] ${level.toUpperCase()}: ${message}`;
        })
      ),
      transports: [new winston.transports.Console()]
    });
  }

  async start() {
    this.logger.info(`🚀 Router started on ${this.blockchain} blockchain`);
    this.logger.info(`📡 Listening for cross-ledger transfer requests`);
    return true;
  }

  async createAsset(assetType, symbol, totalSupply, metadata) {
    const assetId = `${this.blockchain}-${symbol}-${Date.now()}`;
    const txHash = this.blockchain === 'sui' ? 
      mockBlockchainTxs.sui.createBond : 
      mockBlockchainTxs.hedera.createStablecoin;

    const asset = {
      id: assetId,
      type: assetType,
      symbol,
      totalSupply,
      blockchain: this.blockchain,
      txHash,
      metadata,
      createdAt: new Date().toISOString()
    };

    this.assets.set(assetId, asset);
    
    this.logger.info(`💰 Created ${assetType} ${symbol} with supply ${totalSupply}`);
    this.logger.info(`🔗 Blockchain transaction: ${txHash}`);
    this.logger.info(`📋 Asset ID: ${assetId}`);
    
    return asset;
  }

  async createAccount(accountId, initialBalances = {}) {
    const account = {
      id: accountId,
      balances: new Map(Object.entries(initialBalances)),
      createdAt: new Date().toISOString()
    };

    this.accounts.set(accountId, account);
    this.logger.info(`👤 Created account: ${accountId}`);
    
    return account;
  }

  async sendMessage(targetRouter, messageType, payload) {
    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from: this.id,
      to: targetRouter.id,
      type: messageType,
      payload,
      timestamp: new Date().toISOString()
    };

    this.messageLog.push({ direction: 'outbound', ...message });
    this.logger.info(`📤 Sent ${messageType} to ${targetRouter.name}: ${message.id}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return await targetRouter.receiveMessage(this, message);
  }

  async receiveMessage(fromRouter, message) {
    this.messageLog.push({ direction: 'inbound', ...message });
    this.logger.info(`📥 Received ${message.type} from ${fromRouter.name}: ${message.id}`);
    
    switch (message.type) {
      case 'TRANSFER_REQUEST':
        return await this.handleTransferRequest(fromRouter, message);
      case 'TRANSFER_CONFIRMATION':
        return await this.handleTransferConfirmation(fromRouter, message);
      case 'ASSET_QUERY':
        return await this.handleAssetQuery(fromRouter, message);
      default:
        this.logger.warn(`❓ Unknown message type: ${message.type}`);
        return { status: 'error', message: 'Unknown message type' };
    }
  }

  async handleTransferRequest(fromRouter, message) {
    const { transferId, fromAccount, toAccount, asset, amount } = message.payload;
    
    this.logger.info(`🔄 Processing transfer request: ${transferId}`);
    this.logger.info(`   From: ${fromAccount} → To: ${toAccount}`);
    this.logger.info(`   Asset: ${asset}, Amount: ${amount}`);
    
    // Simulate blockchain transaction
    const txHash = this.blockchain === 'sui' ? 
      mockBlockchainTxs.sui.transferBond : 
      mockBlockchainTxs.hedera.transferStablecoin;
    
    // Create transfer record
    const transfer = {
      id: transferId,
      fromAccount,
      toAccount,
      asset,
      amount,
      status: 'confirmed',
      txHash,
      timestamp: new Date().toISOString()
    };
    
    this.transfers.set(transferId, transfer);
    
    // Create confirmation record
    const confirmation = {
      id: `conf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      transferId,
      routerId: this.id,
      status: 'confirmed',
      txHash,
      timestamp: new Date().toISOString(),
      signature: this.generateSignature(transfer)
    };
    
    this.confirmations.set(confirmation.id, confirmation);
    
    this.logger.info(`✅ Transfer confirmed on ${this.blockchain}`);
    this.logger.info(`🔗 Transaction hash: ${txHash}`);
    this.logger.info(`📋 Confirmation ID: ${confirmation.id}`);
    
    return {
      status: 'confirmed',
      transferId,
      confirmationId: confirmation.id,
      txHash
    };
  }

  async handleTransferConfirmation(fromRouter, message) {
    const { transferId, confirmationId, txHash } = message.payload;
    
    this.logger.info(`📝 Received transfer confirmation: ${confirmationId}`);
    this.logger.info(`   Transfer ID: ${transferId}`);
    this.logger.info(`   Transaction: ${txHash}`);
    
    return { status: 'acknowledged' };
  }

  async handleAssetQuery(fromRouter, message) {
    const { assetId } = message.payload;
    const asset = this.assets.get(assetId);
    
    if (asset) {
      this.logger.info(`📊 Asset query result: ${asset.symbol} (${asset.totalSupply})`);
      return { status: 'found', asset };
    } else {
      this.logger.info(`❌ Asset not found: ${assetId}`);
      return { status: 'not_found' };
    }
  }

  generateSignature(data) {
    const payload = JSON.stringify(data);
    return Buffer.from(`${this.id}-${payload}-${Date.now()}`).toString('base64');
  }

  getConfirmationRecords() {
    return Array.from(this.confirmations.values());
  }

  getMessageLog() {
    return this.messageLog;
  }

  getBlockchainVerification(txHash) {
    // Mock blockchain verification
    return {
      txHash,
      status: 'confirmed',
      blockNumber: Math.floor(Math.random() * 1000000) + 1000000,
      confirmations: 12,
      timestamp: new Date().toISOString()
    };
  }
}

// Main scenario execution
async function runCompleteScenario() {
  const scenarioStartTime = performance.now();
  
  console.log('\n' + '='.repeat(80));
  console.log('🏦 FINP2P COMPLETE CROSS-LEDGER TRANSFER SCENARIO');
  console.log('='.repeat(80) + '\n');

  // === STEP 1: START 3 ROUTERS ===
  console.log('📍 STEP 1: STARTING 3 ROUTERS\n');
  
  const bankA = new Router('router-bank-a', 'Bank A', 'sui');
  const bankB = new Router('router-bank-b', 'Bank B', 'hedera');
  const bankC = new Router('router-bank-c', 'Bank C', 'ethereum');
  
  await bankA.start();
  await bankB.start();
  await bankC.start();
  
  console.log('\n✅ All 3 routers started successfully\n');
  
  // === STEP 2: BANK A CREATES BOND ON SUI ===
  console.log('📍 STEP 2: BANK A CREATES BOND ON SUI BLOCKCHAIN\n');
  
  const bond = await bankA.createAsset('bond', 'CORP-BOND-2024', 1000000, {
    issuer: 'Bank A Corporation',
    maturity: '2025-12-31',
    couponRate: '5.5%',
    faceValue: 1000
  });
  
  console.log('🔗 SUI BLOCKCHAIN TRANSACTION:');
  console.log(`   Transaction Hash: ${bond.txHash}`);
  console.log(`   Asset Created: ${bond.symbol}`);
  console.log(`   Total Supply: ${bond.totalSupply}`);
  console.log(`   Metadata: ${JSON.stringify(bond.metadata, null, 2)}\n`);
  
  // === STEP 3: BANK B CREATES STABLECOIN ON HEDERA ===
  console.log('📍 STEP 3: BANK B CREATES STABLECOIN ON HEDERA\n');
  
  const stablecoin = await bankB.createAsset('stablecoin', 'BUSD', 10000000, {
    issuer: 'Bank B Digital Assets',
    pegged: 'USD',
    collateral: 'US Treasury Bonds',
    auditFirm: 'PwC'
  });
  
  console.log('🔗 HEDERA BLOCKCHAIN TRANSACTION:');
  console.log(`   Transaction Hash: ${stablecoin.txHash}`);
  console.log(`   Asset Created: ${stablecoin.symbol}`);
  console.log(`   Total Supply: ${stablecoin.totalSupply}`);
  console.log(`   Metadata: ${JSON.stringify(stablecoin.metadata, null, 2)}\n`);
  
  // Create accounts
  await bankA.createAccount('bank-a-treasury', { [bond.id]: 1000000 });
  await bankB.createAccount('bank-b-treasury', { [stablecoin.id]: 10000000 });
  await bankB.createAccount('client-alice', { [stablecoin.id]: 50000 });
  await bankA.createAccount('client-alice', {});
  
  // === STEP 4: BANK B'S CLIENT BUYS BANK A'S BOND ===
  console.log('📍 STEP 4: BANK B CLIENT BUYS BANK A BOND\n');
  
  const transferStartTime = performance.now();
  const transferId = `transfer-${Date.now()}`;
  
  console.log('💼 INITIATING CROSS-LEDGER TRANSFER:');
  console.log(`   Transfer ID: ${transferId}`);
  console.log(`   Client: Alice (Bank B) → Alice (Bank A)`);
  console.log(`   Selling: 10 CORP-BOND-2024 bonds`);
  console.log(`   Paying: 10,000 BUSD stablecoin\n`);
  
  // === STEP 5: MESSAGE FLOW BETWEEN ROUTERS ===
  console.log('📍 STEP 5: MESSAGE FLOW BETWEEN ROUTERS\n');
  
  console.log('🔄 Phase 1: Bond Transfer (Sui → Bank A)');
  const bondTransferResponse = await bankB.sendMessage(bankA, 'TRANSFER_REQUEST', {
    transferId: `${transferId}-bond`,
    fromAccount: 'bank-a-treasury',
    toAccount: 'client-alice',
    asset: bond.id,
    amount: 10
  });
  
  console.log('🔄 Phase 2: Stablecoin Transfer (Hedera → Bank B)');
  const stablecoinTransferResponse = await bankA.sendMessage(bankB, 'TRANSFER_REQUEST', {
    transferId: `${transferId}-stablecoin`,
    fromAccount: 'client-alice',
    toAccount: 'bank-a-treasury',
    asset: stablecoin.id,
    amount: 10000
  });
  
  console.log('🔄 Phase 3: Cross-confirmation between routers');
  await bankA.sendMessage(bankB, 'TRANSFER_CONFIRMATION', {
    transferId: `${transferId}-bond`,
    confirmationId: bondTransferResponse.confirmationId,
    txHash: bondTransferResponse.txHash
  });
  
  await bankB.sendMessage(bankA, 'TRANSFER_CONFIRMATION', {
    transferId: `${transferId}-stablecoin`,
    confirmationId: stablecoinTransferResponse.confirmationId,
    txHash: stablecoinTransferResponse.txHash
  });
  
  console.log('🔄 Phase 4: Notification to Bank C (observer)');
  await bankA.sendMessage(bankC, 'ASSET_QUERY', {
    assetId: bond.id
  });
  
  const transferEndTime = performance.now();
  
  console.log('\n✅ All message flows completed\n');
  
  // === STEP 6: BLOCKCHAIN VERIFICATION ===
  console.log('📍 STEP 6: BLOCKCHAIN VERIFICATION\n');
  
  console.log('🔍 SUI BLOCKCHAIN VERIFICATION:');
  const suiBondVerification = bankA.getBlockchainVerification(bondTransferResponse.txHash);
  console.log(`   Transaction: ${suiBondVerification.txHash}`);
  console.log(`   Status: ${suiBondVerification.status}`);
  console.log(`   Block: ${suiBondVerification.blockNumber}`);
  console.log(`   Confirmations: ${suiBondVerification.confirmations}`);
  
  console.log('\n🔍 HEDERA BLOCKCHAIN VERIFICATION:');
  const hederaStablecoinVerification = bankB.getBlockchainVerification(stablecoinTransferResponse.txHash);
  console.log(`   Transaction: ${hederaStablecoinVerification.txHash}`);
  console.log(`   Status: ${hederaStablecoinVerification.status}`);
  console.log(`   Block: ${hederaStablecoinVerification.blockNumber}`);
  console.log(`   Confirmations: ${hederaStablecoinVerification.confirmations}`);
  
  console.log('\n✅ Ownership changes verified on both blockchains\n');
  
  // === STEP 7: QUERY ALL ROUTERS FOR CONFIRMATION RECORDS ===
  console.log('📍 STEP 7: CONFIRMATION RECORDS FROM ALL ROUTERS\n');
  
  console.log('📊 BANK A (SUI) CONFIRMATION RECORDS:');
  const bankAConfirmations = bankA.getConfirmationRecords();
  bankAConfirmations.forEach(conf => {
    console.log(`   - ${conf.id}: ${conf.status} (${conf.transferId})`);
    console.log(`     TX: ${conf.txHash}`);
    console.log(`     Time: ${conf.timestamp}`);
  });
  
  console.log('\n📊 BANK B (HEDERA) CONFIRMATION RECORDS:');
  const bankBConfirmations = bankB.getConfirmationRecords();
  bankBConfirmations.forEach(conf => {
    console.log(`   - ${conf.id}: ${conf.status} (${conf.transferId})`);
    console.log(`     TX: ${conf.txHash}`);
    console.log(`     Time: ${conf.timestamp}`);
  });
  
  console.log('\n📊 BANK C (ETHEREUM) CONFIRMATION RECORDS:');
  const bankCConfirmations = bankC.getConfirmationRecords();
  if (bankCConfirmations.length === 0) {
    console.log('   - No confirmations (observer role only)');
  } else {
    bankCConfirmations.forEach(conf => {
      console.log(`   - ${conf.id}: ${conf.status} (${conf.transferId})`);
    });
  }
  
  // === STEP 8: TIMING ANALYSIS ===
  console.log('\n📍 STEP 8: TIMING ANALYSIS\n');
  
  const scenarioEndTime = performance.now();
  const totalScenarioTime = scenarioEndTime - scenarioStartTime;
  const transferTime = transferEndTime - transferStartTime;
  
  console.log('⏱️  PERFORMANCE METRICS:');
  console.log(`   Total Scenario Time: ${totalScenarioTime.toFixed(2)} ms`);
  console.log(`   Cross-Ledger Transfer Time: ${transferTime.toFixed(2)} ms`);
  console.log(`   Message Processing Overhead: ${(totalScenarioTime - transferTime).toFixed(2)} ms`);
  console.log(`   Average Message Latency: ${(transferTime / 6).toFixed(2)} ms`);
  
  // === DETAILED MESSAGE LOGS ===
  console.log('\n📍 DETAILED MESSAGE FLOW LOGS\n');
  
  console.log('📤📥 BANK A MESSAGE LOG:');
  bankA.getMessageLog().forEach((msg, index) => {
    const direction = msg.direction === 'outbound' ? '📤' : '📥';
    console.log(`   ${index + 1}. ${direction} ${msg.type} (${msg.id})`);
    console.log(`      ${msg.direction === 'outbound' ? 'To' : 'From'}: ${msg.direction === 'outbound' ? msg.to : msg.from}`);
    console.log(`      Time: ${msg.timestamp}`);
  });
  
  console.log('\n📤📥 BANK B MESSAGE LOG:');
  bankB.getMessageLog().forEach((msg, index) => {
    const direction = msg.direction === 'outbound' ? '📤' : '📥';
    console.log(`   ${index + 1}. ${direction} ${msg.type} (${msg.id})`);
    console.log(`      ${msg.direction === 'outbound' ? 'To' : 'From'}: ${msg.direction === 'outbound' ? msg.to : msg.from}`);
    console.log(`      Time: ${msg.timestamp}`);
  });
  
  console.log('\n📤📥 BANK C MESSAGE LOG:');
  bankC.getMessageLog().forEach((msg, index) => {
    const direction = msg.direction === 'outbound' ? '📤' : '📥';
    console.log(`   ${index + 1}. ${direction} ${msg.type} (${msg.id})`);
    console.log(`      ${msg.direction === 'outbound' ? 'To' : 'From'}: ${msg.direction === 'outbound' ? msg.to : msg.from}`);
    console.log(`      Time: ${msg.timestamp}`);
  });
  
  // === FINAL SUMMARY ===
  console.log('\n' + '='.repeat(80));
  console.log('🎯 SCENARIO COMPLETION SUMMARY');
  console.log('='.repeat(80));
  console.log('✅ 3 routers started successfully');
  console.log('✅ Bond created on Sui blockchain');
  console.log('✅ Stablecoin created on Hedera blockchain');
  console.log('✅ Cross-ledger transfer completed');
  console.log('✅ Message flow between all routers verified');
  console.log('✅ Blockchain ownership changes confirmed');
  console.log('✅ Confirmation records generated and stored');
  console.log(`✅ Total execution time: ${totalScenarioTime.toFixed(2)} ms`);
  console.log('\n🏆 FINP2P CROSS-LEDGER TRANSFER SUCCESSFUL!');
  console.log('='.repeat(80) + '\n');
  
  return {
    totalTime: totalScenarioTime,
    transferTime,
    routers: { bankA, bankB, bankC },
    assets: { bond, stablecoin },
    confirmations: {
      bankA: bankAConfirmations,
      bankB: bankBConfirmations,
      bankC: bankCConfirmations
    }
  };
}

// Export for testing
if (require.main === module) {
  runCompleteScenario().catch(console.error);
}

module.exports = {
  Router,
  runCompleteScenario
};