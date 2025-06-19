import { Logger } from 'winston';
import {
  LedgerAdapter,
  LedgerType,
  Asset,
  Account,
  ConfigOptions
} from '../types';
import { SuiAdapter, SuiAdapterConfig } from '../adapters/SuiAdapter';
import { HederaAdapter, HederaAdapterConfig } from '../adapters/HederaAdapter';
import { MockAdapter } from '../adapters/MockAdapter';

interface BalanceReservation {
  id: string;
  ledgerId: string;
  accountId: string;
  assetId: string;
  amount: bigint;
  timestamp: Date;
  lockTxHash?: string;
}

interface CrossLedgerOperation {
  id: string;
  fromLedger: string;
  toLedger: string;
  fromAccount: string;
  toAccount: string;
  assetId: string;
  amount: bigint;
  reservations: BalanceReservation[];
  status: 'pending' | 'locked' | 'completed' | 'failed' | 'rolled_back';
  timestamp: Date;
}

export class LedgerManager {
  private adapters: Map<string, LedgerAdapter> = new Map();
  private config: ConfigOptions['ledgers'];
  private logger: Logger;
  private balanceReservations: Map<string, BalanceReservation> = new Map();
  private crossLedgerOperations: Map<string, CrossLedgerOperation> = new Map();
  private reservationTimeout: number = 300000; // 5 minutes default

  constructor(config: ConfigOptions['ledgers'], logger: Logger) {
    this.config = config;
    this.logger = logger;
    
    // Start cleanup timer for expired reservations
    setInterval(() => this.cleanupExpiredReservations(), 60000); // Check every minute
  }

  async initialize(): Promise<void> {
    try {
      for (const [ledgerId, ledgerConfig] of Object.entries(this.config)) {
        const adapter = await this.createAdapter(ledgerId, ledgerConfig);
        if (adapter) {
          await adapter.connect();
          this.adapters.set(ledgerId, adapter);
          this.logger.info(`Initialized adapter for ledger: ${ledgerId}`);
        }
      }
      
      this.logger.info(`Ledger manager initialized with ${this.adapters.size} adapters`);
    } catch (error) {
      this.logger.error('Failed to initialize ledger manager:', error);
      throw error;
    }
  }

  private async createAdapter(
    ledgerId: string,
    config: { type: LedgerType; config: Record<string, any> }
  ): Promise<LedgerAdapter | null> {
    try {
      switch (config.type) {
        case LedgerType.SUI:
          return new SuiAdapter(config.config as SuiAdapterConfig, this.logger);
        
        case LedgerType.HEDERA:
          return new HederaAdapter(config.config as HederaAdapterConfig, this.logger);
        
        case LedgerType.MOCK:
          return new MockAdapter(config.config, this.logger);
        
        case LedgerType.APTOS:
          // TODO: Implement Aptos adapter
          this.logger.warn(`Aptos adapter not yet implemented for ledger: ${ledgerId}`);
          return null;
        
        case LedgerType.FABRIC:
          // TODO: Implement Fabric adapter
          this.logger.warn(`Fabric adapter not yet implemented for ledger: ${ledgerId}`);
          return null;
        
        default:
          this.logger.error(`Unknown ledger type: ${config.type}`);
          return null;
      }
    } catch (error) {
      this.logger.error(`Failed to create adapter for ${ledgerId}:`, error);
      return null;
    }
  }

  async disconnect(): Promise<void> {
    try {
      for (const [ledgerId, adapter] of this.adapters) {
        await adapter.disconnect();
        this.logger.info(`Disconnected from ledger: ${ledgerId}`);
      }
      this.adapters.clear();
    } catch (error) {
      this.logger.error('Failed to disconnect from ledgers:', error);
      throw error;
    }
  }

  getAdapter(ledgerId: string): LedgerAdapter | null {
    return this.adapters.get(ledgerId) || null;
  }

  getSupportedLedgers(): string[] {
    return Array.from(this.adapters.keys());
  }

  isLedgerSupported(ledgerId: string): boolean {
    return this.adapters.has(ledgerId);
  }

  async createAsset(ledgerId: string, assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset> {
    const adapter = this.getAdapter(ledgerId);
    if (!adapter) {
      throw new Error(`Ledger ${ledgerId} not supported`);
    }

    if (!adapter.isConnected()) {
      throw new Error(`Ledger ${ledgerId} not connected`);
    }

    try {
      const asset = await adapter.createAsset(assetData);
      this.logger.info(`Created asset ${asset.symbol} on ledger ${ledgerId}`);
      return asset;
    } catch (error) {
      this.logger.error(`Failed to create asset on ledger ${ledgerId}:`, error);
      throw error;
    }
  }

  async getAsset(ledgerId: string, assetId: string): Promise<Asset | null> {
    const adapter = this.getAdapter(ledgerId);
    if (!adapter) {
      throw new Error(`Ledger ${ledgerId} not supported`);
    }

    try {
      return await adapter.getAsset(assetId);
    } catch (error) {
      this.logger.error(`Failed to get asset ${assetId} from ledger ${ledgerId}:`, error);
      throw error;
    }
  }

  async createAccount(ledgerId: string, institutionId: string): Promise<Account> {
    const adapter = this.getAdapter(ledgerId);
    if (!adapter) {
      throw new Error(`Ledger ${ledgerId} not supported`);
    }

    if (!adapter.isConnected()) {
      throw new Error(`Ledger ${ledgerId} not connected`);
    }

    try {
      const account = await adapter.createAccount(institutionId);
      this.logger.info(`Created account for institution ${institutionId} on ledger ${ledgerId}`);
      return account;
    } catch (error) {
      this.logger.error(`Failed to create account on ledger ${ledgerId}:`, error);
      throw error;
    }
  }

  async getAccount(ledgerId: string, accountId: string): Promise<Account | null> {
    const adapter = this.getAdapter(ledgerId);
    if (!adapter) {
      throw new Error(`Ledger ${ledgerId} not supported`);
    }

    try {
      return await adapter.getAccount(accountId);
    } catch (error) {
      this.logger.error(`Failed to get account ${accountId} from ledger ${ledgerId}:`, error);
      throw error;
    }
  }

  async getBalance(ledgerId: string, accountId: string, assetId: string): Promise<bigint> {
    const adapter = this.getAdapter(ledgerId);
    if (!adapter) {
      throw new Error(`Ledger ${ledgerId} not supported`);
    }

    try {
      return await adapter.getBalance(accountId, assetId);
    } catch (error) {
      this.logger.error(`Failed to get balance for account ${accountId} on ledger ${ledgerId}:`, error);
      throw error;
    }
  }

  async transfer(
    ledgerId: string,
    from: string,
    to: string,
    assetId: string,
    amount: bigint
  ): Promise<string> {
    const adapter = this.getAdapter(ledgerId);
    if (!adapter) {
      throw new Error(`Ledger ${ledgerId} not supported`);
    }

    if (!adapter.isConnected()) {
      throw new Error(`Ledger ${ledgerId} not connected`);
    }

    try {
      const txHash = await adapter.transfer(from, to, assetId, amount);
      this.logger.info(`Transfer completed on ledger ${ledgerId}: ${txHash}`);
      return txHash;
    } catch (error) {
      this.logger.error(`Failed to execute transfer on ledger ${ledgerId}:`, error);
      throw error;
    }
  }

  async lockAsset(
    ledgerId: string,
    accountId: string,
    assetId: string,
    amount: bigint
  ): Promise<string> {
    const adapter = this.getAdapter(ledgerId);
    if (!adapter) {
      throw new Error(`Ledger ${ledgerId} not supported`);
    }

    if (!adapter.isConnected()) {
      throw new Error(`Ledger ${ledgerId} not connected`);
    }

    try {
      const txHash = await adapter.lockAsset(accountId, assetId, amount);
      this.logger.info(`Asset locked on ledger ${ledgerId}: ${txHash}`);
      return txHash;
    } catch (error) {
      this.logger.error(`Failed to lock asset on ledger ${ledgerId}:`, error);
      throw error;
    }
  }

  async unlockAsset(
    ledgerId: string,
    accountId: string,
    assetId: string,
    amount: bigint
  ): Promise<string> {
    const adapter = this.getAdapter(ledgerId);
    if (!adapter) {
      throw new Error(`Ledger ${ledgerId} not supported`);
    }

    if (!adapter.isConnected()) {
      throw new Error(`Ledger ${ledgerId} not connected`);
    }

    try {
      const txHash = await adapter.unlockAsset(accountId, assetId, amount);
      this.logger.info(`Asset unlocked on ledger ${ledgerId}: ${txHash}`);
      return txHash;
    } catch (error) {
      this.logger.error(`Failed to unlock asset on ledger ${ledgerId}:`, error);
      throw error;
    }
  }

  async getTransaction(ledgerId: string, txHash: string) {
    const adapter = this.getAdapter(ledgerId);
    if (!adapter) {
      throw new Error(`Ledger ${ledgerId} not supported`);
    }

    try {
      return await adapter.getTransaction(txHash);
    } catch (error) {
      this.logger.error(`Failed to get transaction ${txHash} from ledger ${ledgerId}:`, error);
      throw error;
    }
  }

  async getTransactionStatus(ledgerId: string, txHash: string) {
    const adapter = this.getAdapter(ledgerId);
    if (!adapter) {
      throw new Error(`Ledger ${ledgerId} not supported`);
    }

    try {
      return await adapter.getTransactionStatus(txHash);
    } catch (error) {
      this.logger.error(`Failed to get transaction status for ${txHash} from ledger ${ledgerId}:`, error);
      throw error;
    }
  }

  async validateCrossLedgerTransfer(
    fromLedger: string,
    toLedger: string,
    assetId: string,
    amount: bigint
  ): Promise<{ isValid: boolean; reason?: string }> {
    try {
      // Check if both ledgers are supported
      if (!this.isLedgerSupported(fromLedger)) {
        return { isValid: false, reason: `Source ledger ${fromLedger} not supported` };
      }

      if (!this.isLedgerSupported(toLedger)) {
        return { isValid: false, reason: `Destination ledger ${toLedger} not supported` };
      }

      // Check if both adapters are connected
      const fromAdapter = this.getAdapter(fromLedger);
      const toAdapter = this.getAdapter(toLedger);

      if (!fromAdapter?.isConnected()) {
        return { isValid: false, reason: `Source ledger ${fromLedger} not connected` };
      }

      if (!toAdapter?.isConnected()) {
        return { isValid: false, reason: `Destination ledger ${toLedger} not connected` };
      }

      // Validate amount
      if (amount <= 0) {
        return { isValid: false, reason: 'Transfer amount must be positive' };
      }

      // Additional validation logic can be added here
      // e.g., check asset compatibility, minimum transfer amounts, etc.

      return { isValid: true };
    } catch (error) {
      this.logger.error('Cross-ledger transfer validation failed:', error);
      return { isValid: false, reason: 'Validation error occurred' };
    }
  }

  getAdapterStatus(): Record<string, { connected: boolean; type: string }> {
    const status: Record<string, { connected: boolean; type: string }> = {};
    
    for (const [ledgerId, adapter] of this.adapters) {
      status[ledgerId] = {
        connected: adapter.isConnected(),
        type: adapter.type
      };
    }
    
    return status;
  }

  async healthCheck(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};
    
    for (const [ledgerId, adapter] of this.adapters) {
      try {
        // Perform a simple health check (e.g., check connection)
        health[ledgerId] = adapter.isConnected();
      } catch (error) {
        this.logger.error(`Health check failed for ledger ${ledgerId}:`, error);
        health[ledgerId] = false;
      }
    }
    
    return health;
  }

  // Enhanced balance management methods
  async validateBalanceAvailability(
    ledgerId: string,
    accountId: string,
    assetId: string,
    amount: bigint
  ): Promise<{ available: boolean; reason?: string }> {
    const adapter = this.getAdapter(ledgerId);
    if (!adapter) {
      return {
        available: false,
        reason: `Ledger ${ledgerId} not supported`
      };
    }

    try {
      const availableBalance = await adapter.getAvailableBalance(accountId, assetId);
      const reservedAmount = this.getReservedAmount(ledgerId, accountId, assetId);
      const lockedBalance = await adapter.getLockedBalance(accountId, assetId);
      
      const trulyAvailable = availableBalance - reservedAmount - lockedBalance;
      
      return {
        available: trulyAvailable >= amount,
        reason: trulyAvailable >= amount ? undefined : 
          `Insufficient balance (Available: ${trulyAvailable}, Requested: ${amount})`
      };
    } catch (error) {
      this.logger.error(`Failed to validate balance for ${accountId}:`, error);
      return {
        available: false,
        reason: 'Balance validation failed'
      };
    }
  }

  async reserveBalance(
    ledgerId: string,
    accountId: string,
    assetId: string,
    amount: bigint,
    operationId?: string
  ): Promise<{ success: boolean; reservationId?: string; reason?: string }> {
    const adapter = this.getAdapter(ledgerId);
    if (!adapter) {
      return {
        success: false,
        reason: `Ledger ${ledgerId} not supported`
      };
    }

    try {
      const availableBalance = await adapter.getAvailableBalance(accountId, assetId);
      const reservedAmount = this.getReservedAmount(ledgerId, accountId, assetId);
      const lockedBalance = await adapter.getLockedBalance(accountId, assetId);
      
      const trulyAvailable = availableBalance - reservedAmount - lockedBalance;
      
      if (trulyAvailable < amount) {
        return {
          success: false,
          reason: 'Insufficient balance when accounting for reservations and locked funds'
        };
      }

      const reservationId = operationId || `reserve_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const reservation: BalanceReservation = {
        id: reservationId,
        ledgerId,
        accountId,
        assetId,
        amount,
        timestamp: new Date()
      };

      this.balanceReservations.set(reservationId, reservation);
      
      this.logger.info(`Reserved balance: ${amount} of ${assetId} for account ${accountId} on ${ledgerId}`);
      
      return {
        success: true,
        reservationId
      };
    } catch (error) {
      this.logger.error(`Failed to reserve balance:`, error);
      return {
        success: false,
        reason: 'Reservation error occurred'
      };
    }
  }

  async lockReservedBalance(reservationId: string): Promise<{ success: boolean; lockTxHash?: string; reason?: string }> {
    try {
      const reservation = this.balanceReservations.get(reservationId);
      if (!reservation) {
        return {
          success: false,
          reason: 'Reservation not found'
        };
      }

      if (reservation.lockTxHash) {
        return {
          success: true,
          lockTxHash: reservation.lockTxHash
        };
      }

      const adapter = this.getAdapter(reservation.ledgerId);
      if (!adapter) {
        return {
          success: false,
          reason: `Ledger ${reservation.ledgerId} not supported`
        };
      }

      const lockTxHash = await adapter.lockAsset(
        reservation.accountId,
        reservation.assetId,
        reservation.amount
      );

      reservation.lockTxHash = lockTxHash;
      this.balanceReservations.set(reservationId, reservation);
      
      this.logger.info(`Locked reserved balance: ${lockTxHash}`);
      
      return {
        success: true,
        lockTxHash
      };
    } catch (error) {
      this.logger.error(`Failed to lock reserved balance:`, error);
      return {
        success: false,
        reason: 'Lock operation failed'
      };
    }
  }

  async releaseReservation(reservationId: string, unlock: boolean = false): Promise<{ success: boolean; reason?: string }> {
    try {
      const reservation = this.balanceReservations.get(reservationId);
      if (!reservation) {
        return {
          success: false,
          reason: 'Reservation not found'
        };
      }

      if (unlock && reservation.lockTxHash) {
        const adapter = this.getAdapter(reservation.ledgerId);
        if (adapter) {
          try {
            await adapter.unlockAsset(
              reservation.accountId,
              reservation.assetId,
              reservation.amount
            );
            this.logger.info(`Unlocked asset for reservation ${reservationId}`);
          } catch (error) {
            this.logger.error(`Failed to unlock asset for reservation ${reservationId}:`, error);
          }
        }
      }

      this.balanceReservations.delete(reservationId);
      this.logger.info(`Released reservation: ${reservationId}`);
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to release reservation:`, error);
      return {
        success: false,
        reason: 'Release operation failed'
      };
    }
  }

  async initiateCrossLedgerTransfer(
    fromLedger: string,
    toLedger: string,
    fromAccount: string,
    toAccount: string,
    assetId: string,
    amount: bigint
  ): Promise<{ success: boolean; operationId?: string; reason?: string }> {
    try {
      // Validate ledgers are connected
      const fromAdapter = this.getAdapter(fromLedger);
      const toAdapter = this.getAdapter(toLedger);
      
      if (!fromAdapter || !fromAdapter.isConnected()) {
        return {
          success: false,
          reason: `Source ledger ${fromLedger} is not connected`
        };
      }
      
      if (!toAdapter || !toAdapter.isConnected()) {
        return {
          success: false,
          reason: `Destination ledger ${toLedger} is not connected`
        };
      }

      const validation = await this.validateCrossLedgerTransfer(fromLedger, toLedger, assetId, amount);
      if (!validation.isValid) {
        return {
          success: false,
          reason: validation.reason
        };
      }

      const operationId = `cross_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Reserve balance on source ledger
      const reservation = await this.reserveBalance(fromLedger, fromAccount, assetId, amount, `${operationId}_source`);
      if (!reservation.success) {
        return {
          success: false,
          reason: reservation.reason
        };
      }

      const operation: CrossLedgerOperation = {
        id: operationId,
        fromLedger,
        toLedger,
        fromAccount,
        toAccount,
        assetId,
        amount,
        reservations: [this.balanceReservations.get(reservation.reservationId!)!],
        status: 'pending',
        timestamp: new Date()
      };

      this.crossLedgerOperations.set(operationId, operation);
      
      this.logger.info(`Initiated cross-ledger transfer: ${operationId}`);
      
      return {
        success: true,
        operationId
      };
    } catch (error) {
      this.logger.error(`Failed to initiate cross-ledger transfer:`, error);
      return {
        success: false,
        reason: 'Cross-ledger transfer initiation failed'
      };
    }
  }

  async rollbackCrossLedgerOperation(operationId: string): Promise<{ success: boolean; reason?: string }> {
    try {
      const operation = this.crossLedgerOperations.get(operationId);
      if (!operation) {
        return {
          success: false,
          reason: 'Operation not found'
        };
      }

      // Check valid status for rollback
      if (operation.status === 'completed') {
        return {
          success: false,
          reason: 'Cannot rollback completed operation'
        };
      }
      
      if (operation.status === 'failed') {
        return {
          success: false,
          reason: 'Operation already failed'
        };
      }
      
      if (operation.status === 'rolled_back') {
        return {
          success: false,
          reason: 'Operation already rolled back'
        };
      }

      // Release all reservations
      for (const reservation of operation.reservations) {
        await this.releaseReservation(reservation.id, true);
      }

      operation.status = 'rolled_back';
      this.crossLedgerOperations.set(operationId, operation);
      
      this.logger.info(`Rolled back cross-ledger operation: ${operationId}`);
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to rollback cross-ledger operation:`, error);
      return {
        success: false,
        reason: 'Rollback operation failed'
      };
    }
  }

  private getReservedAmount(ledgerId: string, accountId: string, assetId: string): bigint {
    let totalReserved = BigInt(0);
    
    for (const reservation of this.balanceReservations.values()) {
      if (
        reservation.ledgerId === ledgerId &&
        reservation.accountId === accountId &&
        reservation.assetId === assetId
      ) {
        totalReserved += reservation.amount;
      }
    }
    
    return totalReserved;
  }

  private cleanupExpiredReservations(): void {
    const now = new Date();
    const expiredReservations: string[] = [];
    
    for (const [reservationId, reservation] of this.balanceReservations) {
      const age = now.getTime() - reservation.timestamp.getTime();
      if (age > this.reservationTimeout) {
        expiredReservations.push(reservationId);
      }
    }
    
    for (const reservationId of expiredReservations) {
      this.releaseReservation(reservationId, true);
      this.logger.info(`Cleaned up expired reservation: ${reservationId}`);
    }
  }

  // Utility methods for testing and monitoring
  getActiveReservations(): BalanceReservation[] {
    return Array.from(this.balanceReservations.values());
  }

  getCrossLedgerOperations(): CrossLedgerOperation[] {
    return Array.from(this.crossLedgerOperations.values());
  }

  setReservationTimeout(timeoutMs: number): void {
    this.reservationTimeout = timeoutMs;
  }
}