import { Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';
import {
  LedgerAdapter,
  LedgerType,
  Asset,
  Account,
  Transaction,
  TransactionStatus,
  FinID
} from '../types';

export interface MockAdapterConfig {
  name?: string;
  latency?: number; // Simulated network latency in ms
  failureRate?: number; // Percentage of operations that should fail (0-100)
  enableBalanceHistory?: boolean; // Track balance changes over time
  enableConcurrencySimulation?: boolean; // Simulate concurrent operation conflicts
  networkPartitionRate?: number; // Percentage chance of network partition (0-100)
  balanceReconciliationDelay?: number; // Delay for balance reconciliation in ms
}

export class MockAdapter implements LedgerAdapter {
  public readonly ledgerId: string = 'mock';
  public readonly name: string = 'Mock Ledger';
  public readonly type: LedgerType = LedgerType.MOCK;

  private config: MockAdapterConfig;
  private logger: Logger;
  private connected: boolean = false;
  
  // In-memory storage for mock data
  private assets: Map<string, Asset> = new Map();
  private accounts: Map<string, Account> = new Map();
  private transactions: Map<string, Transaction> = new Map();
  private balances: Map<string, Map<string, bigint>> = new Map(); // accountId -> assetId -> balance
  private lockedBalances: Map<string, Map<string, bigint>> = new Map(); // accountId -> assetId -> locked amount
  private balanceHistory: Map<string, Array<{ timestamp: Date; assetId: string; balance: bigint; operation: string }>> = new Map();
  private pendingOperations: Map<string, { operation: string; timestamp: Date; accountId: string; assetId: string; amount: bigint }> = new Map();
  private networkPartitioned: boolean = false;

  constructor(config: MockAdapterConfig, logger: Logger) {
    this.config = {
      latency: 100,
      failureRate: 0,
      enableBalanceHistory: false,
      enableConcurrencySimulation: false,
      networkPartitionRate: 0,
      balanceReconciliationDelay: 1000,
      ...config
    };
    this.logger = logger;
  }

  async connect(): Promise<void> {
    await this.simulateLatency();
    
    if (this.shouldSimulateFailure()) {
      throw new Error('Mock connection failure');
    }
    
    this.connected = true;
    this.logger.info('Connected to mock ledger');
    
    // Initialize with some default data
    await this.initializeDefaultData();
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.logger.info('Disconnected from mock ledger');
  }

  isConnected(): boolean {
    return this.connected;
  }

  async createAsset(assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset> {
    if (!this.connected) {
      throw new Error('Not connected to mock ledger');
    }

    await this.simulateLatency();
    
    if (this.shouldSimulateFailure()) {
      throw new Error('Mock asset creation failure');
    }

    const assetId = uuidv4();
    const asset: Asset = {
      id: assetId,
      finId: {
        id: assetId,
        type: 'asset',
        domain: 'mock.local'
      },
      symbol: assetData.symbol,
      name: assetData.name,
      decimals: assetData.decimals,
      totalSupply: assetData.totalSupply,
      ledgerId: this.ledgerId,
      contractAddress: `mock_contract_${assetId}`,
      metadata: assetData.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.assets.set(assetId, asset);
    this.logger.info(`Created mock asset ${asset.symbol} with ID: ${assetId}`);
    
    return asset;
  }

  async getAsset(assetId: string): Promise<Asset | null> {
    if (!this.connected) {
      throw new Error('Not connected to mock ledger');
    }

    await this.simulateLatency();
    
    return this.assets.get(assetId) || null;
  }

  async createAccount(institutionId: string): Promise<Account> {
    if (!this.connected) {
      throw new Error('Not connected to mock ledger');
    }

    await this.simulateLatency();
    
    if (this.shouldSimulateFailure()) {
      throw new Error('Mock account creation failure');
    }

    const accountId = uuidv4();
    const address = `mock_address_${accountId.substring(0, 8)}`;
    
    const account: Account = {
      finId: {
        id: accountId,
        type: 'account',
        domain: 'mock.local'
      },
      address,
      ledgerId: this.ledgerId,
      institutionId,
      balances: new Map(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.accounts.set(accountId, account);
    this.balances.set(accountId, new Map());
    this.lockedBalances.set(accountId, new Map());
    
    this.logger.info(`Created mock account for institution ${institutionId}: ${accountId}`);
    
    return account;
  }

  async getAccount(accountId: string): Promise<Account | null> {
    if (!this.connected) {
      throw new Error('Not connected to mock ledger');
    }

    await this.simulateLatency();
    
    const account = this.accounts.get(accountId);
    if (!account) {
      return null;
    }

    // Update balances from internal storage
    const accountBalances = this.balances.get(accountId) || new Map();
    account.balances = new Map(accountBalances);
    account.updatedAt = new Date();
    
    return account;
  }

  async getBalance(accountId: string, assetId: string): Promise<bigint> {
    if (!this.connected) {
      throw new Error('Not connected to mock ledger');
    }

    await this.simulateLatency();
    
    if (this.shouldSimulateNetworkPartition()) {
      throw new Error('Network partition - unable to retrieve balance');
    }
    
    const accountBalances = this.balances.get(accountId);
    if (!accountBalances) {
      return BigInt(0);
    }
    
    return accountBalances.get(assetId) || BigInt(0);
  }

  async transfer(from: string, to: string, assetId: string, amount: bigint): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected to mock ledger');
    }

    await this.simulateLatency();
    
    if (this.shouldSimulateFailure()) {
      throw new Error('Mock transfer failure');
    }

    if (this.shouldSimulateNetworkPartition()) {
      throw new Error('Network partition - transfer failed');
    }

    // Validate accounts exist
    if (!this.accounts.has(from) || !this.accounts.has(to)) {
      throw new Error('Account not found');
    }

    // Simulate concurrency conflicts if enabled
    if (this.config.enableConcurrencySimulation && this.hasPendingOperation(from, assetId)) {
      throw new Error('Concurrent operation detected - transfer rejected');
    }

    const operationId = uuidv4();
    if (this.config.enableConcurrencySimulation) {
      this.addPendingOperation(operationId, 'transfer', from, assetId, amount);
    }

    try {
      // Atomic balance check and update to prevent race conditions
      const fromBalances = this.balances.get(from) || new Map();
      const toBalances = this.balances.get(to) || new Map();
      
      const currentFromBalance = fromBalances.get(assetId) || BigInt(0);
      const lockedAmount = await this.getLockedBalance(from, assetId);
      const availableBalance = currentFromBalance - lockedAmount;
      
      if (availableBalance < amount) {
        throw new Error('Insufficient balance');
      }

      // Execute transfer atomically
      const newFromBalance = currentFromBalance - amount;
      const currentToBalance = toBalances.get(assetId) || BigInt(0);
      const newToBalance = currentToBalance + amount;
      
      fromBalances.set(assetId, newFromBalance);
      toBalances.set(assetId, newToBalance);
      
      this.balances.set(from, fromBalances);
      this.balances.set(to, toBalances);

      // Record balance history if enabled
      if (this.config.enableBalanceHistory) {
        this.recordBalanceChange(from, assetId, newFromBalance, 'transfer_out');
        this.recordBalanceChange(to, assetId, newToBalance, 'transfer_in');
      }

      // Create transaction record
      const txHash = `mock_tx_${uuidv4()}`;
      const transaction: Transaction = {
        hash: txHash,
        ledgerId: this.ledgerId,
        from,
        to,
        assetId,
        amount,
        status: TransactionStatus.CONFIRMED,
        timestamp: new Date(),
        gasUsed: BigInt(21000), // Mock gas usage
        gasPrice: BigInt(20000000000) // Mock gas price
      };
      
      this.transactions.set(txHash, transaction);
      
      this.logger.info(`Mock transfer completed: ${txHash}`);
      return txHash;
    } finally {
      if (this.config.enableConcurrencySimulation) {
        this.removePendingOperation(operationId);
      }
    }
  }

  async lockAsset(accountId: string, assetId: string, amount: bigint): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected to mock ledger');
    }

    await this.simulateLatency();
    
    if (this.shouldSimulateFailure()) {
      throw new Error('Mock asset lock failure');
    }

    if (this.shouldSimulateNetworkPartition()) {
      throw new Error('Network partition: Unable to lock asset');
    }

    const operationId = `lock_${uuidv4()}`;
    
    if (this.config.enableConcurrencySimulation && this.hasPendingOperation(accountId, assetId)) {
      throw new Error('Concurrent operation detected: Asset lock conflict');
    }

    try {
      if (this.config.enableConcurrencySimulation) {
        this.addPendingOperation(operationId, 'lock', accountId, assetId, amount);
      }

      // Check available balance
      const balance = await this.getBalance(accountId, assetId);
      const lockedBalances = this.lockedBalances.get(accountId) || new Map();
      const currentLocked = lockedBalances.get(assetId) || BigInt(0);
      const availableBalance = balance - currentLocked;
      
      if (availableBalance < amount) {
        throw new Error('Insufficient available balance to lock');
      }

      // Lock the amount
      const newLockedAmount = currentLocked + amount;
      lockedBalances.set(assetId, newLockedAmount);
      this.lockedBalances.set(accountId, lockedBalances);

      if (this.config.enableBalanceHistory) {
        this.recordBalanceChange(accountId, assetId, newLockedAmount, 'lock');
      }

      const txHash = `mock_lock_${uuidv4()}`;
      this.logger.info(`Mock asset locked: ${txHash}`);
      
      return txHash;
    } finally {
      if (this.config.enableConcurrencySimulation) {
        this.removePendingOperation(operationId);
      }
    }
  }

  async unlockAsset(accountId: string, assetId: string, amount: bigint): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected to mock ledger');
    }

    await this.simulateLatency();
    
    if (this.shouldSimulateFailure()) {
      throw new Error('Mock asset unlock failure');
    }

    if (this.shouldSimulateNetworkPartition()) {
      throw new Error('Network partition: Unable to unlock asset');
    }

    const operationId = `unlock_${uuidv4()}`;
    
    if (this.config.enableConcurrencySimulation && this.hasPendingOperation(accountId, assetId)) {
      throw new Error('Concurrent operation detected: Asset unlock conflict');
    }

    try {
      if (this.config.enableConcurrencySimulation) {
        this.addPendingOperation(operationId, 'unlock', accountId, assetId, amount);
      }

      const lockedBalances = this.lockedBalances.get(accountId) || new Map();
      const currentLocked = lockedBalances.get(assetId) || BigInt(0);
      
      if (currentLocked < amount) {
        throw new Error('Insufficient locked balance to unlock');
      }

      // Unlock the amount
      const newLockedAmount = currentLocked - amount;
      if (newLockedAmount === BigInt(0)) {
        lockedBalances.delete(assetId);
      } else {
        lockedBalances.set(assetId, newLockedAmount);
      }
      this.lockedBalances.set(accountId, lockedBalances);

      if (this.config.enableBalanceHistory) {
        this.recordBalanceChange(accountId, assetId, newLockedAmount, 'unlock');
      }

      const txHash = `mock_unlock_${uuidv4()}`;
      this.logger.info(`Mock asset unlocked: ${txHash}`);
      
      return txHash;
    } finally {
      if (this.config.enableConcurrencySimulation) {
        this.removePendingOperation(operationId);
      }
    }
  }

  async getTransaction(txHash: string): Promise<Transaction | null> {
    if (!this.connected) {
      throw new Error('Not connected to mock ledger');
    }

    await this.simulateLatency();
    
    return this.transactions.get(txHash) || null;
  }

  async getTransactionStatus(txHash: string): Promise<TransactionStatus> {
    const transaction = await this.getTransaction(txHash);
    return transaction?.status || TransactionStatus.PENDING;
  }

  // Mock-specific utility methods
  public async mintTokens(accountId: string, assetId: string, amount: bigint): Promise<void> {
    const accountBalances = this.balances.get(accountId) || new Map();
    const currentBalance = accountBalances.get(assetId) || BigInt(0);
    const newBalance = currentBalance + amount;
    
    accountBalances.set(assetId, newBalance);
    this.balances.set(accountId, accountBalances);
    
    this.logger.info(`Minted ${amount} of asset ${assetId} to account ${accountId}`);
  }

  public async burnTokens(accountId: string, assetId: string, amount: bigint): Promise<void> {
    const accountBalances = this.balances.get(accountId) || new Map();
    const currentBalance = accountBalances.get(assetId) || BigInt(0);
    
    if (currentBalance < amount) {
      throw new Error('Insufficient balance to burn');
    }
    
    const newBalance = currentBalance - amount;
    if (newBalance === BigInt(0)) {
      accountBalances.delete(assetId);
    } else {
      accountBalances.set(assetId, newBalance);
    }
    
    this.balances.set(accountId, accountBalances);
    
    this.logger.info(`Burned ${amount} of asset ${assetId} from account ${accountId}`);
  }

  public async getLockedBalance(accountId: string, assetId: string): Promise<bigint> {
    await this.simulateLatency();
    const lockedBalances = this.lockedBalances.get(accountId) || new Map();
    return lockedBalances.get(assetId) || BigInt(0);
  }

  public getAllAssets(): Asset[] {
    return Array.from(this.assets.values());
  }

  public getAllAccounts(): Account[] {
    return Array.from(this.accounts.values());
  }

  public getAllTransactions(): Transaction[] {
    return Array.from(this.transactions.values());
  }

  public reset(): void {
    this.assets.clear();
    this.accounts.clear();
    this.transactions.clear();
    this.balances.clear();
    this.lockedBalances.clear();
    this.balanceHistory.clear();
    this.pendingOperations.clear();
    this.networkPartitioned = false;
    this.logger.info('Mock ledger data reset');
  }

  // Enhanced balance tracking methods
  public getBalanceHistory(accountId: string): Array<{ timestamp: Date; assetId: string; balance: bigint; operation: string }> {
    return this.balanceHistory.get(accountId) || [];
  }

  public getPendingOperations(): Array<{ operationId: string; operation: string; timestamp: Date; accountId: string; assetId: string; amount: bigint }> {
    const operations = [];
    for (const [operationId, operation] of this.pendingOperations) {
      operations.push({ operationId, ...operation });
    }
    return operations;
  }

  public simulateInsufficientBalance(accountId: string, assetId: string): void {
    const accountBalances = this.balances.get(accountId) || new Map();
    accountBalances.set(assetId, BigInt(0));
    this.balances.set(accountId, accountBalances);
    this.logger.info(`Simulated insufficient balance for account ${accountId}, asset ${assetId}`);
  }

  public simulateConcurrentTransfers(accountId: string, assetId: string, count: number = 5): void {
    for (let i = 0; i < count; i++) {
      const operationId = `concurrent_${i}_${uuidv4()}`;
      this.addPendingOperation(operationId, 'concurrent_transfer', accountId, assetId, BigInt(1000));
    }
    this.logger.info(`Simulated ${count} concurrent operations for account ${accountId}`);
  }

  public simulateNetworkPartition(partitioned: boolean = true): void {
    this.networkPartitioned = partitioned;
    this.logger.info(`Network partition ${partitioned ? 'enabled' : 'disabled'}`);
  }

  public async simulateBalanceReconciliation(accountId: string, assetId: string, correctBalance: bigint): Promise<void> {
    if (this.config.balanceReconciliationDelay) {
      await new Promise(resolve => setTimeout(resolve, this.config.balanceReconciliationDelay));
    }
    
    const accountBalances = this.balances.get(accountId) || new Map();
    const currentBalance = accountBalances.get(assetId) || BigInt(0);
    
    accountBalances.set(assetId, correctBalance);
    this.balances.set(accountId, accountBalances);
    
    if (this.config.enableBalanceHistory) {
      this.recordBalanceChange(accountId, assetId, correctBalance, 'reconciliation');
    }
    
    this.logger.info(`Balance reconciled for account ${accountId}: ${currentBalance} -> ${correctBalance}`);
  }

  public async getAvailableBalance(accountId: string, assetId: string): Promise<bigint> {
    await this.simulateLatency();
    const totalBalance = this.balances.get(accountId)?.get(assetId) || BigInt(0);
    const lockedAmount = await this.getLockedBalance(accountId, assetId);
    return totalBalance - lockedAmount;
  }

  private async simulateLatency(): Promise<void> {
    if (this.config.latency && this.config.latency > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.latency));
    }
  }

  private shouldSimulateFailure(): boolean {
    if (!this.config.failureRate || this.config.failureRate <= 0) {
      return false;
    }
    
    return Math.random() * 100 < this.config.failureRate;
  }

  private shouldSimulateNetworkPartition(): boolean {
    if (!this.config.networkPartitionRate || this.config.networkPartitionRate <= 0) {
      return false;
    }
    
    return Math.random() * 100 < this.config.networkPartitionRate;
  }

  private recordBalanceChange(accountId: string, assetId: string, balance: bigint, operation: string): void {
    if (!this.balanceHistory.has(accountId)) {
      this.balanceHistory.set(accountId, []);
    }
    
    const history = this.balanceHistory.get(accountId)!;
    history.push({
      timestamp: new Date(),
      assetId,
      balance,
      operation
    });
    
    // Keep only last 100 entries per account
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  private hasPendingOperation(accountId: string, assetId: string): boolean {
    for (const [_, operation] of this.pendingOperations) {
      if (operation.accountId === accountId && operation.assetId === assetId) {
        return true;
      }
    }
    return false;
  }

  private addPendingOperation(operationId: string, operation: string, accountId: string, assetId: string, amount: bigint): void {
    this.pendingOperations.set(operationId, {
      operation,
      timestamp: new Date(),
      accountId,
      assetId,
      amount
    });
  }

  private removePendingOperation(operationId: string): void {
    this.pendingOperations.delete(operationId);
  }

  private async initializeDefaultData(): Promise<void> {
    try {
      // Create a default asset
      const assetId = uuidv4();
      const defaultAsset = await this.createAsset({
        symbol: 'MOCK',
        name: 'Mock Token',
        decimals: 8,
        totalSupply: BigInt('1000000000000000'), // 10M tokens with 8 decimals
        ledgerId: this.ledgerId,
        finId: {
          id: assetId,
          type: 'asset',
          domain: 'mock.local'
        },
        metadata: {
          description: 'Default mock token for testing',
          attributes: [
            { trait_type: 'Type', value: 'Utility' },
            { trait_type: 'Network', value: 'Mock' }
          ]
        }
      });

      // Create a default account
      const defaultAccount = await this.createAccount('mock-institution');
      
      // Mint some tokens to the default account
      await this.mintTokens(defaultAccount.finId.id, defaultAsset.id, BigInt('100000000000')); // 1000 tokens
      
      this.logger.info('Initialized mock ledger with default data');
    } catch (error) {
      this.logger.warn('Failed to initialize default data:', error);
    }
  }
}