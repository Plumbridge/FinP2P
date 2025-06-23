import { Logger } from 'winston';
import { LedgerAdapter, LedgerType, Asset, Account, Transaction, TransactionStatus } from '../types';
export interface MockAdapterConfig {
    name?: string;
    latency?: number;
    failureRate?: number;
    enableBalanceHistory?: boolean;
    enableConcurrencySimulation?: boolean;
    networkPartitionRate?: number;
    balanceReconciliationDelay?: number;
}
export declare class MockAdapter implements LedgerAdapter {
    readonly ledgerId: string;
    readonly name: string;
    readonly type: LedgerType;
    private config;
    private logger;
    private connected;
    private assets;
    private accounts;
    private transactions;
    private balances;
    private lockedBalances;
    private balanceHistory;
    private pendingOperations;
    private networkPartitioned;
    constructor(config: MockAdapterConfig, logger: Logger);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    createAsset(assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset>;
    getAsset(assetId: string): Promise<Asset | null>;
    createAccount(institutionId: string): Promise<Account>;
    getAccount(accountId: string): Promise<Account | null>;
    getBalance(accountId: string, assetId: string): Promise<bigint>;
    transfer(from: string, to: string, assetId: string, amount: bigint): Promise<string>;
    lockAsset(accountId: string, assetId: string, amount: bigint): Promise<string>;
    unlockAsset(accountId: string, assetId: string, amount: bigint): Promise<string>;
    getTransaction(txHash: string): Promise<Transaction | null>;
    getTransactionStatus(txHash: string): Promise<TransactionStatus>;
    mintTokens(accountId: string, assetId: string, amount: bigint): Promise<void>;
    burnTokens(accountId: string, assetId: string, amount: bigint): Promise<void>;
    getLockedBalance(accountId: string, assetId: string): Promise<bigint>;
    getAllAssets(): Asset[];
    getAllAccounts(): Account[];
    getAllTransactions(): Transaction[];
    reset(): void;
    getBalanceHistory(accountId: string): Array<{
        timestamp: Date;
        assetId: string;
        balance: bigint;
        operation: string;
    }>;
    getPendingOperations(): Array<{
        operationId: string;
        operation: string;
        timestamp: Date;
        accountId: string;
        assetId: string;
        amount: bigint;
    }>;
    simulateInsufficientBalance(accountId: string, assetId: string): void;
    simulateConcurrentTransfers(accountId: string, assetId: string, count?: number): void;
    simulateNetworkPartition(partitioned?: boolean): void;
    simulateBalanceReconciliation(accountId: string, assetId: string, correctBalance: bigint): Promise<void>;
    getAvailableBalance(accountId: string, assetId: string): Promise<bigint>;
    private simulateLatency;
    private shouldSimulateFailure;
    private shouldSimulateNetworkPartition;
    private recordBalanceChange;
    private hasPendingOperation;
    private addPendingOperation;
    private removePendingOperation;
    private initializeDefaultData;
}
//# sourceMappingURL=MockAdapter.d.ts.map