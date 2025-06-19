import { Logger } from 'winston';
import { LedgerAdapter, Asset, Account, ConfigOptions } from '../types';
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
export declare class LedgerManager {
    private adapters;
    private config;
    private logger;
    private balanceReservations;
    private crossLedgerOperations;
    private reservationTimeout;
    constructor(config: ConfigOptions['ledgers'], logger: Logger);
    initialize(): Promise<void>;
    private createAdapter;
    disconnect(): Promise<void>;
    getAdapter(ledgerId: string): LedgerAdapter | null;
    getSupportedLedgers(): string[];
    isLedgerSupported(ledgerId: string): boolean;
    createAsset(ledgerId: string, assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset>;
    getAsset(ledgerId: string, assetId: string): Promise<Asset | null>;
    createAccount(ledgerId: string, institutionId: string): Promise<Account>;
    getAccount(ledgerId: string, accountId: string): Promise<Account | null>;
    getBalance(ledgerId: string, accountId: string, assetId: string): Promise<bigint>;
    transfer(ledgerId: string, from: string, to: string, assetId: string, amount: bigint): Promise<string>;
    lockAsset(ledgerId: string, accountId: string, assetId: string, amount: bigint): Promise<string>;
    unlockAsset(ledgerId: string, accountId: string, assetId: string, amount: bigint): Promise<string>;
    getTransaction(ledgerId: string, txHash: string): Promise<import("../types").Transaction | null>;
    getTransactionStatus(ledgerId: string, txHash: string): Promise<import("../types").TransactionStatus>;
    validateCrossLedgerTransfer(fromLedger: string, toLedger: string, assetId: string, amount: bigint): Promise<{
        isValid: boolean;
        reason?: string;
    }>;
    getAdapterStatus(): Record<string, {
        connected: boolean;
        type: string;
    }>;
    healthCheck(): Promise<Record<string, boolean>>;
    validateBalanceAvailability(ledgerId: string, accountId: string, assetId: string, amount: bigint): Promise<{
        available: boolean;
        reason?: string;
    }>;
    reserveBalance(ledgerId: string, accountId: string, assetId: string, amount: bigint, operationId?: string): Promise<{
        success: boolean;
        reservationId?: string;
        reason?: string;
    }>;
    lockReservedBalance(reservationId: string): Promise<{
        success: boolean;
        lockTxHash?: string;
        reason?: string;
    }>;
    releaseReservation(reservationId: string, unlock?: boolean): Promise<{
        success: boolean;
        reason?: string;
    }>;
    initiateCrossLedgerTransfer(fromLedger: string, toLedger: string, fromAccount: string, toAccount: string, assetId: string, amount: bigint): Promise<{
        success: boolean;
        operationId?: string;
        reason?: string;
    }>;
    rollbackCrossLedgerOperation(operationId: string): Promise<{
        success: boolean;
        reason?: string;
    }>;
    private getReservedAmount;
    private cleanupExpiredReservations;
    getActiveReservations(): BalanceReservation[];
    getCrossLedgerOperations(): CrossLedgerOperation[];
    setReservationTimeout(timeoutMs: number): void;
}
export {};
//# sourceMappingURL=LedgerManager.d.ts.map