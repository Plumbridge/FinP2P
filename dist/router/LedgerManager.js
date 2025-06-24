"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerManager = void 0;
const types_1 = require("../types");
const SuiAdapter_1 = require("../adapters/SuiAdapter");
const HederaAdapter_1 = require("../adapters/HederaAdapter");
const MockAdapter_1 = require("../adapters/MockAdapter");
class LedgerManager {
    constructor(config, logger) {
        this.adapters = new Map();
        this.balanceReservations = new Map();
        this.crossLedgerOperations = new Map();
        this.reservationTimeout = 300000; // 5 minutes default
        this.reservationQueues = new Map();
        this.cleanupTimer = null;
        this.config = config;
        this.logger = logger;
        // Start cleanup timer for expired reservations
        this.cleanupTimer = setInterval(() => this.cleanupExpiredReservations(), 60000); // Check every minute
    }
    async initialize() {
        try {
            console.log('LedgerManager.initialize() called with config:', this.config);
            for (const [ledgerId, ledgerConfig] of Object.entries(this.config)) {
                console.log(`Creating adapter for ledger: ${ledgerId}`, ledgerConfig);
                const adapter = await this.createAdapter(ledgerId, ledgerConfig);
                console.log(`Created adapter for ${ledgerId}:`, adapter);
                if (adapter) {
                    console.log(`Connecting adapter for ${ledgerId}`);
                    await adapter.connect();
                    this.adapters.set(ledgerId, adapter);
                    console.log(`Successfully initialized adapter for ledger: ${ledgerId}`);
                    this.logger.info(`Initialized adapter for ledger: ${ledgerId}`);
                }
                else {
                    console.log(`Failed to create adapter for ${ledgerId}`);
                }
            }
            console.log(`LedgerManager initialized with ${this.adapters.size} adapters`);
            this.logger.info(`Ledger manager initialized with ${this.adapters.size} adapters`);
        }
        catch (error) {
            console.log('LedgerManager initialization error:', error);
            this.logger.error('Failed to initialize ledger manager:', error);
            throw error;
        }
    }
    async createAdapter(ledgerId, config) {
        try {
            switch (config.type) {
                case types_1.LedgerType.SUI:
                    return new SuiAdapter_1.SuiAdapter(config.config, this.logger);
                case types_1.LedgerType.HEDERA:
                    return new HederaAdapter_1.HederaAdapter(config.config, this.logger);
                case types_1.LedgerType.MOCK:
                    return new MockAdapter_1.MockAdapter(config.config, this.logger);
                case types_1.LedgerType.APTOS:
                    // TODO: Implement Aptos adapter
                    this.logger.warn(`Aptos adapter not yet implemented for ledger: ${ledgerId}`);
                    return null;
                case types_1.LedgerType.FABRIC:
                    // TODO: Implement Fabric adapter
                    this.logger.warn(`Fabric adapter not yet implemented for ledger: ${ledgerId}`);
                    return null;
                default:
                    this.logger.error(`Unknown ledger type: ${config.type}`);
                    return null;
            }
        }
        catch (error) {
            this.logger.error(`Failed to create adapter for ${ledgerId}:`, error);
            return null;
        }
    }
    async disconnect() {
        try {
            // Clear cleanup timer
            if (this.cleanupTimer) {
                clearInterval(this.cleanupTimer);
                this.cleanupTimer = null;
            }
            for (const [ledgerId, adapter] of this.adapters) {
                await adapter.disconnect();
                this.logger.info(`Disconnected from ledger: ${ledgerId}`);
            }
            this.adapters.clear();
        }
        catch (error) {
            this.logger.error('Failed to disconnect from ledgers:', error);
            throw error;
        }
    }
    getAdapter(ledgerId) {
        return this.adapters.get(ledgerId) || null;
    }
    getSupportedLedgers() {
        return Array.from(this.adapters.keys());
    }
    getAdapters() {
        return Array.from(this.adapters.values());
    }
    isLedgerSupported(ledgerId) {
        return this.adapters.has(ledgerId);
    }
    async createAsset(ledgerId, assetData) {
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
        }
        catch (error) {
            this.logger.error(`Failed to create asset on ledger ${ledgerId}:`, error);
            throw error;
        }
    }
    async getAsset(ledgerId, assetId) {
        const adapter = this.getAdapter(ledgerId);
        if (!adapter) {
            throw new Error(`Ledger ${ledgerId} not supported`);
        }
        try {
            return await adapter.getAsset(assetId);
        }
        catch (error) {
            this.logger.error(`Failed to get asset ${assetId} from ledger ${ledgerId}:`, error);
            throw error;
        }
    }
    async createAccount(ledgerId, institutionId) {
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
        }
        catch (error) {
            this.logger.error(`Failed to create account on ledger ${ledgerId}:`, error);
            throw error;
        }
    }
    async getAccount(ledgerId, accountId) {
        const adapter = this.getAdapter(ledgerId);
        if (!adapter) {
            throw new Error(`Ledger ${ledgerId} not supported`);
        }
        try {
            return await adapter.getAccount(accountId);
        }
        catch (error) {
            this.logger.error(`Failed to get account ${accountId} from ledger ${ledgerId}:`, error);
            throw error;
        }
    }
    async getBalance(ledgerId, accountId, assetId) {
        const adapter = this.getAdapter(ledgerId);
        if (!adapter) {
            throw new Error(`Ledger ${ledgerId} not supported`);
        }
        try {
            return await adapter.getBalance(accountId, assetId);
        }
        catch (error) {
            this.logger.error(`Failed to get balance for account ${accountId} on ledger ${ledgerId}:`, error);
            throw error;
        }
    }
    async transfer(ledgerId, from, to, assetId, amount) {
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
        }
        catch (error) {
            this.logger.error(`Failed to execute transfer on ledger ${ledgerId}:`, error);
            throw error;
        }
    }
    async lockAsset(ledgerId, accountId, assetId, amount) {
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
        }
        catch (error) {
            this.logger.error(`Failed to lock asset on ledger ${ledgerId}:`, error);
            throw error;
        }
    }
    async unlockAsset(ledgerId, accountId, assetId, amount) {
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
        }
        catch (error) {
            this.logger.error(`Failed to unlock asset on ledger ${ledgerId}:`, error);
            throw error;
        }
    }
    async getTransaction(ledgerId, txHash) {
        const adapter = this.getAdapter(ledgerId);
        if (!adapter) {
            throw new Error(`Ledger ${ledgerId} not supported`);
        }
        try {
            return await adapter.getTransaction(txHash);
        }
        catch (error) {
            this.logger.error(`Failed to get transaction ${txHash} from ledger ${ledgerId}:`, error);
            throw error;
        }
    }
    async getTransactionStatus(ledgerId, txHash) {
        const adapter = this.getAdapter(ledgerId);
        if (!adapter) {
            throw new Error(`Ledger ${ledgerId} not supported`);
        }
        try {
            return await adapter.getTransactionStatus(txHash);
        }
        catch (error) {
            this.logger.error(`Failed to get transaction status for ${txHash} from ledger ${ledgerId}:`, error);
            throw error;
        }
    }
    async validateCrossLedgerTransfer(fromLedger, toLedger, assetId, amount) {
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
        }
        catch (error) {
            this.logger.error('Cross-ledger transfer validation failed:', error);
            return { isValid: false, reason: 'Validation error occurred' };
        }
    }
    getAdapterStatus() {
        const status = {};
        for (const [ledgerId, adapter] of this.adapters) {
            status[ledgerId] = {
                connected: adapter.isConnected(),
                type: adapter.type
            };
        }
        return status;
    }
    async healthCheck() {
        const health = {};
        for (const [ledgerId, adapter] of this.adapters) {
            try {
                // Perform a simple health check (e.g., check connection)
                health[ledgerId] = adapter.isConnected();
            }
            catch (error) {
                this.logger.error(`Health check failed for ledger ${ledgerId}:`, error);
                health[ledgerId] = false;
            }
        }
        return health;
    }
    // Enhanced balance management methods
    async validateBalanceAvailability(ledgerId, accountId, assetId, amount) {
        const adapter = this.getAdapter(ledgerId);
        if (!adapter) {
            return {
                available: false,
                currentBalance: BigInt(0),
                availableBalance: BigInt(0),
                reason: `Ledger ${ledgerId} not supported`
            };
        }
        try {
            const currentBalance = await adapter.getBalance(accountId, assetId);
            const availableBalance = await adapter.getAvailableBalance(accountId, assetId);
            const reservedAmount = this.getReservedAmount(ledgerId, accountId, assetId);
            const lockedBalance = await adapter.getLockedBalance(accountId, assetId);
            const trulyAvailable = availableBalance - reservedAmount - lockedBalance;
            return {
                available: trulyAvailable >= amount,
                currentBalance,
                availableBalance: trulyAvailable,
                reason: trulyAvailable >= amount ? undefined :
                    `Insufficient balance (Available: ${trulyAvailable}, Requested: ${amount})`
            };
        }
        catch (error) {
            this.logger.error(`Failed to validate balance for ${accountId}:`, error);
            return {
                available: false,
                currentBalance: BigInt(0),
                availableBalance: BigInt(0),
                reason: 'Balance validation failed'
            };
        }
    }
    async reserveBalance(ledgerId, accountId, assetId, amount, operationId) {
        const lockKey = `${ledgerId}:${accountId}:${assetId}`;
        const queue = this.reservationQueues.get(lockKey);
        if (queue) {
            return new Promise(resolve => {
                queue.push(() => {
                    this.reserveBalanceInternal(ledgerId, accountId, assetId, amount, operationId).then(resolve);
                });
            });
        }
        this.reservationQueues.set(lockKey, []);
        return this.reserveBalanceInternal(ledgerId, accountId, assetId, amount, operationId);
    }
    async reserveBalanceInternal(ledgerId, accountId, assetId, amount, operationId) {
        const lockKey = `${ledgerId}:${accountId}:${assetId}`;
        try {
            const adapter = this.getAdapter(ledgerId);
            if (!adapter) {
                return {
                    success: false,
                    reason: `Ledger ${ledgerId} not supported`
                };
            }
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
            const reservation = {
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
        }
        catch (error) {
            this.logger.error(`Failed to reserve balance:`, error);
            return {
                success: false,
                reason: 'Reservation error occurred'
            };
        }
        finally {
            const queue = this.reservationQueues.get(lockKey);
            if (queue && queue.length > 0) {
                const next = queue.shift();
                if (next) {
                    // Use setTimeout to avoid deep recursion and potential stack overflow
                    setTimeout(next, 0);
                }
            }
            else {
                // If the queue is empty, we can remove it.
                this.reservationQueues.delete(lockKey);
            }
        }
    }
    async lockReservedBalance(reservationId) {
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
            const lockTxHash = await adapter.lockAsset(reservation.accountId, reservation.assetId, reservation.amount);
            reservation.lockTxHash = lockTxHash;
            this.balanceReservations.set(reservationId, reservation);
            this.logger.info(`Locked reserved balance: ${lockTxHash}`);
            return {
                success: true,
                lockTxHash
            };
        }
        catch (error) {
            this.logger.error(`Failed to lock reserved balance:`, error);
            return {
                success: false,
                reason: 'Lock operation failed'
            };
        }
    }
    async releaseReservation(reservationId, unlock = false) {
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
                        await adapter.unlockAsset(reservation.accountId, reservation.assetId, reservation.amount);
                        this.logger.info(`Unlocked asset for reservation ${reservationId}`);
                    }
                    catch (error) {
                        this.logger.error(`Failed to unlock asset for reservation ${reservationId}:`, error);
                    }
                }
            }
            this.balanceReservations.delete(reservationId);
            this.logger.info(`Released reservation: ${reservationId}`);
            return { success: true };
        }
        catch (error) {
            this.logger.error(`Failed to release reservation:`, error);
            return {
                success: false,
                reason: 'Release operation failed'
            };
        }
    }
    async initiateCrossLedgerTransfer(fromLedger, toLedger, fromAccount, toAccount, assetId, amount) {
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
            const operation = {
                id: operationId,
                fromLedger,
                toLedger,
                fromAccount,
                toAccount,
                assetId,
                amount,
                reservations: [this.balanceReservations.get(reservation.reservationId)],
                status: 'pending',
                timestamp: new Date()
            };
            this.crossLedgerOperations.set(operationId, operation);
            this.logger.info(`Initiated cross-ledger transfer: ${operationId}`);
            return {
                success: true,
                operationId
            };
        }
        catch (error) {
            this.logger.error(`Failed to initiate cross-ledger transfer:`, error);
            return {
                success: false,
                reason: 'Cross-ledger transfer initiation failed'
            };
        }
    }
    async rollbackCrossLedgerOperation(operationId) {
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
        }
        catch (error) {
            this.logger.error(`Failed to rollback cross-ledger operation:`, error);
            return {
                success: false,
                reason: 'Rollback operation failed'
            };
        }
    }
    getReservedAmount(ledgerId, accountId, assetId) {
        let totalReserved = BigInt(0);
        for (const reservation of this.balanceReservations.values()) {
            if (reservation.ledgerId === ledgerId &&
                reservation.accountId === accountId &&
                reservation.assetId === assetId) {
                totalReserved += reservation.amount;
            }
        }
        return totalReserved;
    }
    cleanupExpiredReservations() {
        const now = new Date();
        const expiredReservations = [];
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
    getActiveReservations() {
        return Array.from(this.balanceReservations.values());
    }
    getCrossLedgerOperations() {
        return Array.from(this.crossLedgerOperations.values());
    }
    setReservationTimeout(timeoutMs) {
        this.reservationTimeout = timeoutMs;
    }
}
exports.LedgerManager = LedgerManager;
//# sourceMappingURL=LedgerManager.js.map