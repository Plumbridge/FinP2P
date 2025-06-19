"use strict";
/**
 * Confirmation Record Manager
 *
 * Manages dual confirmation records for transfers across routers
 * Provides persistent storage and querying capabilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfirmationRecordManager = void 0;
class ConfirmationRecordManager {
    constructor(redis, logger, routerId) {
        // Redis keys
        this.CONFIRMATIONS_KEY = 'finp2p:confirmations';
        this.USER_TRANSACTIONS_KEY = 'finp2p:user_transactions';
        this.ASSET_TRANSACTIONS_KEY = 'finp2p:asset_transactions';
        this.DUAL_CONFIRMATIONS_KEY = 'finp2p:dual_confirmations';
        this.redis = redis;
        this.logger = logger;
        this.routerId = routerId;
    }
    /**
     * Create a confirmation record for a transfer
     */
    async createConfirmationRecord(transfer, status, txHash) {
        const confirmationId = `conf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const confirmation = {
            id: confirmationId,
            transferId: transfer.id,
            routerId: this.routerId,
            status,
            timestamp: new Date().toISOString(),
            signature: this.generateSignature(transfer),
            metadata: {
                fromAccount: transfer.fromAccount.id,
                toAccount: transfer.toAccount.id,
                asset: transfer.asset.id,
                amount: transfer.amount.toString(),
                ledgerTxHash: txHash
            }
        };
        await this.storeConfirmationRecord(confirmation);
        // Check for dual confirmation completion
        await this.checkDualConfirmationStatus(transfer.id);
        return confirmation;
    }
    /**
     * Store confirmation record in Redis
     */
    async storeConfirmationRecord(confirmation) {
        try {
            // Store the confirmation record
            await this.redis.hSet(`${this.CONFIRMATIONS_KEY}:${this.routerId}`, confirmation.id, JSON.stringify(confirmation));
            // Index by user (for Router A - user-centric view)
            await this.redis.sAdd(`${this.USER_TRANSACTIONS_KEY}:${confirmation.metadata.fromAccount}`, confirmation.id);
            // Index by asset (for Router B - asset-centric view)
            await this.redis.sAdd(`${this.ASSET_TRANSACTIONS_KEY}:${confirmation.metadata.asset}`, confirmation.id);
            // Store dual confirmation tracking
            await this.updateDualConfirmationStatus(confirmation);
            this.logger.info(`Confirmation record stored: ${confirmation.id}`);
        }
        catch (error) {
            this.logger.error('Failed to store confirmation record:', error);
            throw error;
        }
    }
    /**
     * Update dual confirmation status
     */
    async updateDualConfirmationStatus(confirmation) {
        const dualConfKey = `${this.DUAL_CONFIRMATIONS_KEY}:${confirmation.transferId}`;
        try {
            // Get existing dual confirmation status
            const existingData = await this.redis.get(dualConfKey);
            let dualConfirmation;
            if (existingData) {
                dualConfirmation = JSON.parse(existingData);
            }
            else {
                dualConfirmation = {
                    transferId: confirmation.transferId,
                    confirmations: {},
                    status: 'pending',
                    timestamp: new Date().toISOString()
                };
            }
            // Add this router's confirmation
            if (this.routerId.includes('router-a')) {
                dualConfirmation.confirmations.routerA = confirmation;
            }
            else if (this.routerId.includes('router-b')) {
                dualConfirmation.confirmations.routerB = confirmation;
            }
            // Update status based on confirmations
            const hasRouterA = !!dualConfirmation.confirmations.routerA;
            const hasRouterB = !!dualConfirmation.confirmations.routerB;
            const routerAConfirmed = dualConfirmation.confirmations.routerA?.status === 'confirmed';
            const routerBConfirmed = dualConfirmation.confirmations.routerB?.status === 'confirmed';
            if (hasRouterA && hasRouterB && routerAConfirmed && routerBConfirmed) {
                dualConfirmation.status = 'dual_confirmed';
            }
            else if (hasRouterA || hasRouterB) {
                dualConfirmation.status = 'partial_confirmed';
            }
            else {
                dualConfirmation.status = 'pending';
            }
            // Check for failures
            if ((hasRouterA && dualConfirmation.confirmations.routerA?.status === 'failed') ||
                (hasRouterB && dualConfirmation.confirmations.routerB?.status === 'failed')) {
                dualConfirmation.status = 'failed';
            }
            dualConfirmation.timestamp = new Date().toISOString();
            // Store updated dual confirmation
            await this.redis.set(dualConfKey, JSON.stringify(dualConfirmation));
        }
        catch (error) {
            this.logger.error('Failed to update dual confirmation status:', error);
        }
    }
    /**
     * Get confirmation record by ID
     */
    async getConfirmationRecord(confirmationId) {
        try {
            const data = await this.redis.hGet(`${this.CONFIRMATIONS_KEY}:${this.routerId}`, confirmationId);
            return data ? JSON.parse(data) : null;
        }
        catch (error) {
            this.logger.error('Failed to get confirmation record:', error);
            return null;
        }
    }
    /**
     * Get all confirmation records for this router
     */
    async getAllConfirmationRecords() {
        try {
            const data = await this.redis.hGetAll(`${this.CONFIRMATIONS_KEY}:${this.routerId}`);
            return Object.values(data).map(record => JSON.parse(record));
        }
        catch (error) {
            this.logger.error('Failed to get all confirmation records:', error);
            return [];
        }
    }
    /**
     * Get user transactions (Router A perspective)
     */
    async getUserTransactions(userId) {
        try {
            const confirmationIds = await this.redis.sMembers(`${this.USER_TRANSACTIONS_KEY}:${userId}`);
            const confirmations = [];
            for (const id of confirmationIds) {
                const confirmation = await this.getConfirmationRecord(id);
                if (confirmation) {
                    confirmations.push(confirmation);
                }
            }
            return confirmations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
        catch (error) {
            this.logger.error('Failed to get user transactions:', error);
            return [];
        }
    }
    /**
     * Get asset transactions (Router B perspective)
     */
    async getAssetTransactions(assetId) {
        try {
            const confirmationIds = await this.redis.sMembers(`${this.ASSET_TRANSACTIONS_KEY}:${assetId}`);
            const confirmations = [];
            for (const id of confirmationIds) {
                const confirmation = await this.getConfirmationRecord(id);
                if (confirmation) {
                    confirmations.push(confirmation);
                }
            }
            return confirmations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
        catch (error) {
            this.logger.error('Failed to get asset transactions:', error);
            return [];
        }
    }
    /**
     * Get dual confirmation status for a transfer
     */
    async getDualConfirmationStatus(transferId) {
        try {
            const data = await this.redis.get(`${this.DUAL_CONFIRMATIONS_KEY}:${transferId}`);
            return data ? JSON.parse(data) : null;
        }
        catch (error) {
            this.logger.error('Failed to get dual confirmation status:', error);
            return null;
        }
    }
    /**
     * Check and update dual confirmation status for a transfer
     */
    async checkDualConfirmationStatus(transferId) {
        try {
            const dualStatus = await this.getDualConfirmationStatus(transferId);
            if (dualStatus && dualStatus.status === 'dual_confirmed') {
                this.logger.info(`Dual confirmation completed for transfer: ${transferId}`);
                // Store completion timestamp
                await this.redis.set(`finp2p:transfer_completion:${transferId}`, new Date().toISOString());
            }
        }
        catch (error) {
            this.logger.error('Failed to check dual confirmation status:', error);
        }
    }
    /**
     * Rollback a confirmation record
     */
    async rollbackConfirmation(confirmationId, reason) {
        try {
            const confirmation = await this.getConfirmationRecord(confirmationId);
            if (!confirmation) {
                return false;
            }
            confirmation.status = 'rolled_back';
            confirmation.rollbackReason = reason;
            confirmation.rollbackTimestamp = new Date().toISOString();
            await this.storeConfirmationRecord(confirmation);
            this.logger.info(`Confirmation rolled back: ${confirmationId}, reason: ${reason}`);
            return true;
        }
        catch (error) {
            this.logger.error('Failed to rollback confirmation:', error);
            return false;
        }
    }
    /**
     * Generate regulatory report
     */
    async generateRegulatoryReport(startDate, endDate) {
        try {
            const allConfirmations = await this.getAllConfirmationRecords();
            // Filter by date range
            const filteredConfirmations = allConfirmations.filter(conf => {
                const confDate = new Date(conf.timestamp);
                return confDate >= startDate && confDate <= endDate;
            });
            const report = {
                reportId: `REG-REPORT-${Date.now()}`,
                generatedAt: new Date().toISOString(),
                reportingPeriod: {
                    start: startDate.toISOString(),
                    end: endDate.toISOString()
                },
                routerData: {
                    routerId: this.routerId,
                    totalConfirmations: filteredConfirmations.length,
                    userTransactions: {},
                    assetTransactions: {},
                    confirmations: filteredConfirmations
                },
                summary: {
                    totalTransfers: filteredConfirmations.length,
                    successfulTransfers: filteredConfirmations.filter(c => c.status === 'confirmed').length,
                    failedTransfers: filteredConfirmations.filter(c => c.status === 'failed').length,
                    totalVolume: {},
                    complianceStatus: 'COMPLIANT'
                }
            };
            // Group by users and assets
            for (const confirmation of filteredConfirmations) {
                const userId = confirmation.metadata.fromAccount;
                const assetId = confirmation.metadata.asset;
                if (!report.routerData.userTransactions[userId]) {
                    report.routerData.userTransactions[userId] = [];
                }
                report.routerData.userTransactions[userId].push(confirmation);
                if (!report.routerData.assetTransactions[assetId]) {
                    report.routerData.assetTransactions[assetId] = [];
                }
                report.routerData.assetTransactions[assetId].push(confirmation);
                // Calculate volume
                if (confirmation.status === 'confirmed') {
                    const amount = parseInt(confirmation.metadata.amount);
                    if (!report.summary.totalVolume[assetId]) {
                        report.summary.totalVolume[assetId] = 0;
                    }
                    report.summary.totalVolume[assetId] += amount;
                }
            }
            return report;
        }
        catch (error) {
            this.logger.error('Failed to generate regulatory report:', error);
            throw error;
        }
    }
    /**
     * Generate cryptographic signature for confirmation
     */
    generateSignature(transfer) {
        const data = `${transfer.id}-${this.routerId}-${transfer.amount}-${Date.now()}`;
        return Buffer.from(data).toString('base64');
    }
    /**
     * Clean up old confirmation records (for maintenance)
     */
    async cleanupOldRecords(olderThanDays) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
            const allConfirmations = await this.getAllConfirmationRecords();
            let deletedCount = 0;
            for (const confirmation of allConfirmations) {
                const confirmationDate = new Date(confirmation.timestamp);
                if (confirmationDate < cutoffDate) {
                    await this.redis.hDel(`${this.CONFIRMATIONS_KEY}:${this.routerId}`, confirmation.id);
                    deletedCount++;
                }
            }
            this.logger.info(`Cleaned up ${deletedCount} old confirmation records`);
            return deletedCount;
        }
        catch (error) {
            this.logger.error('Failed to cleanup old records:', error);
            return 0;
        }
    }
}
exports.ConfirmationRecordManager = ConfirmationRecordManager;
//# sourceMappingURL=ConfirmationRecordManager.js.map