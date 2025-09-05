import { EventEmitter } from 'events';
import { LayerZeroAdapter, LayerZeroTransferRequest, LayerZeroTransferResult } from '../adapters/layerzero';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface CrossChainRoute {
  sourceChain: string;
  destChain: string;
  tokenSymbol: string;
  fee: string;
  estimatedTime: string;
  status: 'active' | 'inactive' | 'maintenance';
}

export interface TransferQueueItem {
  id: string;
  request: LayerZeroTransferRequest;
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export interface RouterStats {
  totalTransfers: number;
  successfulTransfers: number;
  failedTransfers: number;
  pendingTransfers: number;
  averageTransferTime: number;
  totalVolume: string;
  activeRoutes: CrossChainRoute[];
  initialBalances: Map<string, string>;
  finalBalances: Map<string, string>;
}

export class LayerZeroRouter extends EventEmitter {
  private adapter: LayerZeroAdapter;
  private transferQueue: Map<string, TransferQueueItem> = new Map();
  private transferHistory: Map<string, LayerZeroTransferResult> = new Map();
  private activeTransfers: Set<string> = new Set();
  private isRunning: boolean = false;
  private stats: RouterStats;
  
  // Primary cross-chain route for demonstration
  public readonly PRIMARY_ROUTE = {
    sourceChain: 'sepolia',
    destChain: 'polygon-amoy',
    tokenSymbol: 'ETH',
    fee: '0.0015', // 0.0015 ETH estimated fee
    estimatedTime: '2-5 minutes',
    status: 'active' as const
  };

  constructor() {
    super();
    
    this.adapter = new LayerZeroAdapter();
    this.stats = this.initializeStats();
    
    // Set up event listeners
    this.setupEventListeners();
  }

  private initializeStats(): RouterStats {
    return {
      totalTransfers: 0,
      successfulTransfers: 0,
      failedTransfers: 0,
      pendingTransfers: 0,
      averageTransferTime: 0,
      totalVolume: '0',
      activeRoutes: [this.PRIMARY_ROUTE],
      initialBalances: new Map(),
      finalBalances: new Map()
    };
  }

  private setupEventListeners(): void {
    // Listen to adapter events
    this.adapter.on('transferInitiated', (result) => {
      this.emit('transferInitiated', result);
      this.updateStats('initiated', result);
    });

    this.adapter.on('transferFailed', (result) => {
      this.emit('transferFailed', result);
      this.updateStats('failed', result);
      this.removeFromActiveTransfers(result.id);
    });

    // Listen to our own events
    this.on('transferCompleted', (result) => {
      this.updateStats('completed', result);
      this.removeFromActiveTransfers(result.id);
    });
  }

  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing LayerZero Router...');
      
      // Connect to the adapter
      await this.adapter.connect();
      
      // Verify primary route is available
      const supportedChains = this.adapter.getSupportedChains();
      if (!supportedChains.includes(this.PRIMARY_ROUTE.sourceChain) || 
          !supportedChains.includes(this.PRIMARY_ROUTE.destChain)) {
        throw new Error('Primary cross-chain route not supported');
      }

      // Capture initial balances for all chains
      console.log('📊 Capturing initial balances...');
      await this.captureInitialBalances();

      console.log('✅ LayerZero Router initialized successfully');
      console.log(`📡 Primary route: ${this.PRIMARY_ROUTE.sourceChain} → ${this.PRIMARY_ROUTE.destChain}`);
      console.log('⚠️  NOTE: This router executes REAL ETH transactions, not LayerZero cross-chain transfers');
      console.log('   Cross-chain functionality requires LayerZero contract addresses (currently not configured)');
      
      this.isRunning = true;
      this.emit('routerReady', { timestamp: Date.now() });
      
    } catch (error) {
      console.error('❌ Failed to initialize LayerZero Router:', error);
      throw error;
    }
  }

  private async captureInitialBalances(): Promise<void> {
    try {
      console.log('📊 Capturing initial balances for both wallets...');
      
      // Track Wallet 1 (Sepolia private key) on both chains
      console.log('   Wallet 1 balances:');
      try {
        // Sepolia balance for Wallet 1
        const sepoliaIndex = this.adapter.getSupportedChains().indexOf('sepolia');
        if (sepoliaIndex !== -1) {
          const sepoliaBalance = await this.adapter.getWalletBalance(sepoliaIndex);
          this.stats.initialBalances.set('sepolia_wallet1', sepoliaBalance.balanceInEth);
          console.log(`     sepolia: ${sepoliaBalance.balanceInEth} ETH`);
        }
        
        // Polygon Amoy balance for Wallet 1 (POL - not ETH)
        const polygonProvider = new ethers.JsonRpcProvider('https://polygon-amoy.drpc.org');
        const wallet1PolygonBalance = await polygonProvider.getBalance('0x3808Ab2b060D1648c3Bb8fc617F9dF752143dAFB');
        const wallet1PolygonBalancePol = ethers.formatEther(wallet1PolygonBalance);
        this.stats.initialBalances.set('polygon-amoy_wallet1', wallet1PolygonBalancePol);
        console.log(`     polygon-amoy: ${wallet1PolygonBalancePol} POL`);
      } catch (error) {
        console.log(`     Could not get Wallet 1 balances - ${(error as Error).message}`);
      }
      
      // Track Wallet 2 (destination address) on both chains
      console.log('   Wallet 2 balances:');
      try {
        // Sepolia balance for Wallet 2
        const sepoliaProvider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
        const wallet2Balance = await sepoliaProvider.getBalance('0x7B52C77F01aE2cd0A59c0b24de48F21121E6c2bC');
        const wallet2BalanceEth = ethers.formatEther(wallet2Balance);
        this.stats.initialBalances.set('sepolia_wallet2', wallet2BalanceEth);
        console.log(`     sepolia: ${wallet2BalanceEth} ETH`);
        
        // Polygon Amoy balance for Wallet 2 (POL - not ETH)
        const polygonProvider = new ethers.JsonRpcProvider('https://polygon-amoy.drpc.org');
        const wallet2PolygonBalance = await polygonProvider.getBalance('0x7B52C77F01aE2cd0A59c0b24de48F21121E6c2bC');
        const wallet2PolygonBalancePol = ethers.formatEther(wallet2PolygonBalance);
        this.stats.initialBalances.set('polygon-amoy_wallet2', wallet2PolygonBalancePol);
        console.log(`     polygon-amoy: ${wallet2PolygonBalancePol} POL`);
      } catch (error) {
        console.log(`     Could not get Wallet 2 balances - ${(error as Error).message}`);
      }
      
    } catch (error) {
      console.warn('⚠️  Could not capture initial balances:', (error as Error).message);
    }
  }

  async executeCrossChainTransfer(
    request: Omit<LayerZeroTransferRequest, 'sourceChain' | 'destChain'>,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string> {
    if (!this.isRunning) {
      throw new Error('Router not initialized');
    }

    // Use primary route
    const fullRequest: LayerZeroTransferRequest = {
      ...request,
      sourceChain: this.PRIMARY_ROUTE.sourceChain,
      destChain: this.PRIMARY_ROUTE.destChain
    };

    // Generate transfer ID
    const transferId = `lz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Add to queue
    const queueItem: TransferQueueItem = {
      id: transferId,
      request: fullRequest,
      priority,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3
    };

    this.transferQueue.set(transferId, queueItem);
    this.stats.pendingTransfers++;
    
    console.log(`📋 Added transfer to queue: ${transferId} (${priority} priority)`);
    console.log(`   Amount: ${request.amount} ${request.tokenSymbol}`);
    console.log(`   Route: ${this.PRIMARY_ROUTE.sourceChain} → ${this.PRIMARY_ROUTE.destChain}`);
    console.log(`   ⚠️  This will execute a REAL ETH transaction on ${this.PRIMARY_ROUTE.sourceChain}`);
    
    this.emit('transferQueued', queueItem);

    // Process queue if not already running
    if (!this.activeTransfers.has(transferId)) {
      this.processTransferQueue();
    }

    return transferId;
  }

  private async processTransferQueue(): Promise<void> {
    if (this.activeTransfers.size >= 3) {
      // Limit concurrent transfers
      return;
    }

    // Sort queue by priority and timestamp
    const sortedQueue = Array.from(this.transferQueue.values())
      .filter(item => !this.activeTransfers.has(item.id))
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.timestamp.getTime() - b.timestamp.getTime();
      });

    for (const queueItem of sortedQueue.slice(0, 3 - this.activeTransfers.size)) {
      await this.executeTransfer(queueItem);
    }
  }

  private async executeTransfer(queueItem: TransferQueueItem): Promise<void> {
    try {
      console.log(`🚀 Executing REAL transfer: ${queueItem.id}`);
      console.log(`   This will execute an actual blockchain transaction on ${queueItem.request.sourceChain}`);
      
      this.activeTransfers.add(queueItem.id);
      this.stats.pendingTransfers--;
      
      // Remove from queue
      this.transferQueue.delete(queueItem.id);

      // Execute the transfer (this will be a real ETH transaction)
      const result = await this.adapter.transferToken(queueItem.request);
      
      // Update transfer history
      this.transferHistory.set(queueItem.id, result);
      
      if (result.status === 'completed') {
        this.emit('transferCompleted', result);
        console.log(`✅ Transfer completed: ${queueItem.id}`);
        console.log(`   Transaction Hash: ${result.txHash || 'N/A'}`);
        console.log(`   ⚠️  This was a REAL transaction on ${queueItem.request.sourceChain}`);
      } else if (result.status === 'failed') {
        // Retry logic
        if (queueItem.retryCount < queueItem.maxRetries) {
          queueItem.retryCount++;
          queueItem.timestamp = new Date();
          this.transferQueue.set(queueItem.id, queueItem);
          this.stats.pendingTransfers++;
          console.log(`🔄 Retrying transfer: ${queueItem.id} (attempt ${queueItem.retryCount})`);
        } else {
          console.log(`❌ Transfer failed permanently: ${queueItem.id}`);
        }
      }

    } catch (error) {
      console.error(`❌ Transfer execution failed: ${queueItem.id}`, error);
      
      // Retry logic
      if (queueItem.retryCount < queueItem.maxRetries) {
        queueItem.retryCount++;
        queueItem.timestamp = new Date();
        queueItem.request = queueItem.request;
        this.transferQueue.set(queueItem.id, queueItem);
        this.stats.pendingTransfers++;
        console.log(`🔄 Retrying transfer: ${queueItem.id} (attempt ${queueItem.retryCount})`);
      } else {
        console.log(`❌ Transfer failed permanently: ${queueItem.id}`);
      }
    } finally {
      this.removeFromActiveTransfers(queueItem.id);
    }
  }

  private removeFromActiveTransfers(transferId: string): void {
    this.activeTransfers.delete(transferId);
    // Continue processing queue
    setImmediate(() => this.processTransferQueue());
  }

  private updateStats(type: 'initiated' | 'completed' | 'failed', result: LayerZeroTransferResult): void {
    this.stats.totalTransfers++;
    
    switch (type) {
      case 'initiated':
        // Stats updated when transfer is queued
        break;
      case 'completed':
        this.stats.successfulTransfers++;
        this.stats.totalVolume = ethers.formatEther(
          ethers.parseEther(this.stats.totalVolume) + ethers.parseEther(result.amount)
        );
        break;
      case 'failed':
        this.stats.failedTransfers++;
        break;
    }
  }

  // Public methods for monitoring and control
  getRouterStats(): RouterStats {
    return { ...this.stats };
  }

  getTransferStatus(transferId: string): LayerZeroTransferResult | null {
    return this.transferHistory.get(transferId) || null;
  }

  getQueueStatus(): { queued: number; active: number; completed: number } {
    return {
      queued: this.transferQueue.size,
      active: this.activeTransfers.size,
      completed: this.transferHistory.size
    };
  }

  getActiveRoutes(): CrossChainRoute[] {
    return this.stats.activeRoutes;
  }

  async getEstimatedFee(sourceChain: string, destChain: string, amount: string): Promise<string> {
    try {
      const fee = await this.adapter.estimateTransferFee(sourceChain, destChain, amount);
      return ethers.formatEther(fee.nativeFee);
    } catch (error) {
      console.warn('⚠️  Could not estimate fee, using default:', error);
      return '0.0015'; // Default fee
    }
  }

  async getWalletBalance(chainName: string): Promise<any> {
    try {
      const supportedChains = this.adapter.getSupportedChains();
      const chainIndex = supportedChains.indexOf(chainName);
      if (chainIndex === -1) {
        throw new Error(`Chain ${chainName} not found`);
      }
      return await this.adapter.getWalletBalance(chainIndex);
    } catch (error) {
      console.warn('⚠️  Could not get wallet balance:', error);
      throw error;
    }
  }

  async captureFinalBalances(): Promise<void> {
    console.log('📊 Capturing final balances for both wallets...');
    try {
      // Track Wallet 1 (Sepolia private key) on both chains
      console.log('   Wallet 1 balances:');
      try {
        // Sepolia balance for Wallet 1 (ETH)
        const sepoliaIndex = this.adapter.getSupportedChains().indexOf('sepolia');
        if (sepoliaIndex !== -1) {
          const sepoliaBalance = await this.adapter.getWalletBalance(sepoliaIndex);
          this.stats.finalBalances.set('sepolia_wallet1', sepoliaBalance.balanceInEth);
          const initialBalance = this.stats.initialBalances.get('sepolia_wallet1') || '0';
          const difference = parseFloat(sepoliaBalance.balanceInEth) - parseFloat(initialBalance);
          console.log(`     sepolia: ${sepoliaBalance.balanceInEth} ETH (${difference >= 0 ? '+' : ''}${difference.toFixed(6)} ETH)`);
        }
        
        // Polygon Amoy balance for Wallet 1 (POL - not ETH)
        const polygonProvider = new ethers.JsonRpcProvider('https://polygon-amoy.drpc.org');
        const wallet1PolygonBalance = await polygonProvider.getBalance('0x3808Ab2b060D1648c3Bb8fc617F9dF752143dAFB');
        const wallet1PolygonBalancePol = ethers.formatEther(wallet1PolygonBalance);
        this.stats.finalBalances.set('polygon-amoy_wallet1', wallet1PolygonBalancePol);
        const initialBalance = this.stats.initialBalances.get('polygon-amoy_wallet1') || '0';
        const difference = parseFloat(wallet1PolygonBalancePol) - parseFloat(initialBalance);
        console.log(`     polygon-amoy: ${wallet1PolygonBalancePol} POL (${difference >= 0 ? '+' : ''}${difference.toFixed(6)} POL)`);
      } catch (error) {
        console.log(`     Could not get Wallet 1 balances - ${(error as Error).message}`);
      }
      
      // Track Wallet 2 (destination address) on both chains
      console.log('   Wallet 2 balances:');
      try {
        // Sepolia balance for Wallet 2 (ETH)
        const sepoliaProvider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
        const wallet2Balance = await sepoliaProvider.getBalance('0x7B52C77F01aE2cd0A59c0b24de48F21121E6c2bC');
        const wallet2BalanceEth = ethers.formatEther(wallet2Balance);
        this.stats.finalBalances.set('sepolia_wallet2', wallet2BalanceEth);
        const initialBalance = this.stats.initialBalances.get('sepolia_wallet2') || '0';
        const difference = parseFloat(wallet2BalanceEth) - parseFloat(initialBalance);
        console.log(`     sepolia: ${wallet2BalanceEth} ETH (${difference >= 0 ? '+' : ''}${difference.toFixed(6)} ETH)`);
        
        // Polygon Amoy balance for Wallet 2 (POL - not ETH)
        const polygonProvider = new ethers.JsonRpcProvider('https://polygon-amoy.drpc.org');
        const wallet2PolygonBalance = await polygonProvider.getBalance('0x7B52C77F01aE2cd0A59c0b24de48F21121E6c2bC');
        const wallet2PolygonBalancePol = ethers.formatEther(wallet2PolygonBalance);
        this.stats.finalBalances.set('polygon-amoy_wallet2', wallet2PolygonBalancePol);
        const initialBalance2 = this.stats.initialBalances.get('polygon-amoy_wallet2') || '0';
        const difference2 = parseFloat(wallet2PolygonBalancePol) - parseFloat(initialBalance2);
        console.log(`     polygon-amoy: ${wallet2PolygonBalancePol} POL (${difference2 >= 0 ? '+' : ''}${difference2.toFixed(6)} POL)`);
      } catch (error) {
        console.log(`     Could not get Wallet 2 balances - ${(error as Error).message}`);
      }
      
    } catch (error) {
      console.warn('⚠️  Could not capture final balances:', (error as Error).message);
    }
  }

  getBalanceChanges(): Map<string, { initial: string; final: string; difference: string }> {
    const changes = new Map();
    
    for (const [chainName, initialBalance] of this.stats.initialBalances) {
      const finalBalance = this.stats.finalBalances.get(chainName) || initialBalance;
      const difference = parseFloat(finalBalance) - parseFloat(initialBalance);
      
      changes.set(chainName, {
        initial: initialBalance,
        final: finalBalance,
        difference: difference.toFixed(6)
      });
    }
    
    return changes;
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down LayerZero Router...');
    
    this.isRunning = false;
    
    // Wait for active transfers to complete
    if (this.activeTransfers.size > 0) {
      console.log(`⏳ Waiting for ${this.activeTransfers.size} active transfers to complete...`);
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (this.activeTransfers.size === 0) {
            clearInterval(checkInterval);
            resolve(undefined);
          }
        }, 1000);
      });
    }
    
    // Capture final balances before shutdown
    await this.captureFinalBalances();
    
    // Display balance changes
    this.displayBalanceChanges();
    
    await this.adapter.disconnect();
    console.log('✅ LayerZero Router shutdown complete');
  }

  private displayBalanceChanges(): void {
    console.log('\n📊 Balance Changes Summary:');
    const changes = this.getBalanceChanges();
    
    console.log('   Wallet 1 Changes:');
    for (const [chainName, change] of changes) {
      if (chainName.includes('wallet1')) {
        const difference = parseFloat(change.difference);
        const token = chainName.includes('polygon-amoy') ? 'POL' : 'ETH';
        if (difference !== 0) {
          console.log(`     ${chainName.replace('_wallet1', '')}: ${change.initial} → ${change.final} (${difference >= 0 ? '+' : ''}${change.difference} ${token})`);
        } else {
          console.log(`     ${chainName.replace('_wallet1', '')}: ${change.initial} → ${change.final} (No change)`);
        }
      }
    }
    
    console.log('   Wallet 2 Changes:');
    for (const [chainName, change] of changes) {
      if (chainName.includes('wallet2')) {
        const difference = parseFloat(change.difference);
        const token = chainName.includes('polygon-amoy') ? 'POL' : 'ETH';
        if (difference !== 0) {
          console.log(`     ${chainName.replace('_wallet2', '')}: ${change.initial} → ${change.final} (${difference >= 0 ? '+' : ''}${change.difference} ${token})`);
        } else {
          console.log(`     ${chainName.replace('_wallet2', '')}: ${change.initial} → ${change.final} (No change)`);
        }
      }
    }
  }

  isRouterRunning(): boolean {
    return this.isRunning;
  }
}
