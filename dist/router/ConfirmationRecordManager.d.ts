/**
 * Confirmation Record Manager
 *
 * Manages dual confirmation records for transfers across routers
 * Provides persistent storage and querying capabilities
 */
import { RedisClientType } from 'redis';
import { Logger } from 'winston';
import { Transfer } from '../types';
export interface ConfirmationRecord {
    id: string;
    transferId: string;
    routerId: string;
    status: 'pending' | 'confirmed' | 'failed' | 'rolled_back';
    timestamp: string;
    signature: string;
    metadata: {
        fromAccount: string;
        toAccount: string;
        asset: string;
        amount: string;
        ledgerTxHash?: string;
    };
    rollbackReason?: string;
    rollbackTimestamp?: string;
}
export interface DualConfirmationStatus {
    transferId: string;
    confirmations: {
        routerA?: ConfirmationRecord;
        routerB?: ConfirmationRecord;
    };
    status: 'pending' | 'partial_confirmed' | 'dual_confirmed' | 'failed';
    timestamp: string;
}
export interface RegulatoryReport {
    reportId: string;
    generatedAt: string;
    reportingPeriod: {
        start: string;
        end: string;
    };
    routerData: {
        routerId: string;
        totalConfirmations: number;
        userTransactions: Record<string, ConfirmationRecord[]>;
        assetTransactions: Record<string, ConfirmationRecord[]>;
        confirmations: ConfirmationRecord[];
    };
    summary: {
        totalTransfers: number;
        successfulTransfers: number;
        failedTransfers: number;
        totalVolume: Record<string, number>;
        complianceStatus: string;
    };
}
export declare class ConfirmationRecordManager {
    private redis;
    private logger;
    private routerId;
    private readonly CONFIRMATIONS_KEY;
    private readonly USER_TRANSACTIONS_KEY;
    private readonly ASSET_TRANSACTIONS_KEY;
    private readonly DUAL_CONFIRMATIONS_KEY;
    constructor(redis: RedisClientType, logger: Logger, routerId: string);
    /**
     * Create a confirmation record for a transfer
     */
    createConfirmationRecord(transfer: Transfer, status: 'confirmed' | 'failed', txHash?: string): Promise<ConfirmationRecord>;
    /**
     * Store confirmation record in Redis
     */
    private storeConfirmationRecord;
    /**
     * Update dual confirmation status
     */
    private updateDualConfirmationStatus;
    /**
     * Get confirmation record by ID
     */
    getConfirmationRecord(confirmationId: string): Promise<ConfirmationRecord | null>;
    /**
     * Get all confirmation records for this router
     */
    getAllConfirmationRecords(): Promise<ConfirmationRecord[]>;
    /**
     * Get user transactions (Router A perspective)
     */
    getUserTransactions(userId: string): Promise<ConfirmationRecord[]>;
    /**
     * Get asset transactions (Router B perspective)
     */
    getAssetTransactions(assetId: string): Promise<ConfirmationRecord[]>;
    /**
     * Get dual confirmation status for a transfer
     */
    getDualConfirmationStatus(transferId: string): Promise<DualConfirmationStatus | null>;
    /**
     * Check and update dual confirmation status for a transfer
     */
    private checkDualConfirmationStatus;
    /**
     * Rollback a confirmation record
     */
    rollbackConfirmation(confirmationId: string, reason: string): Promise<boolean>;
    /**
     * Generate regulatory report
     */
    generateRegulatoryReport(startDate: Date, endDate: Date): Promise<RegulatoryReport>;
    /**
     * Generate cryptographic signature for confirmation
     */
    private generateSignature;
    /**
     * Clean up old confirmation records (for maintenance)
     */
    cleanupOldRecords(olderThanDays: number): Promise<number>;
}
//# sourceMappingURL=ConfirmationRecordManager.d.ts.map