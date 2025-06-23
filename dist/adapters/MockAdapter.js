"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockAdapter = void 0;
const uuid_1 = require("uuid");
const types_1 = require("../types");
class MockAdapter {
    constructor(config, logger) {
        this.ledgerId = 'mock';
        this.name = 'Mock Ledger';
        this.type = types_1.LedgerType.MOCK;
        this.connected = false;
        // In-memory storage for mock data
        this.assets = new Map();
        this.accounts = new Map();
        this.transactions = new Map();
        this.balances = new Map(); // accountId -> assetId -> balance
        this.lockedBalances = new Map(); // accountId -> assetId -> locked amount
        this.balanceHistory = new Map();
        this.pendingOperations = new Map();
        this.networkPartitioned = false;
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
    async connect() {
        await this.simulateLatency();
        if (this.shouldSimulateFailure()) {
            throw new Error('Mock connection failure');
        }
        this.connected = true;
        this.logger.info('Connected to mock ledger');
        // Initialize with some default data
        await this.initializeDefaultData();
    }
    async disconnect() {
        this.connected = false;
        this.logger.info('Disconnected from mock ledger');
    }
    isConnected() {
        return this.connected;
    }
    async createAsset(assetData) {
        if (!this.connected) {
            throw new Error('Not connected to mock ledger');
        }
        await this.simulateLatency();
        if (this.shouldSimulateFailure()) {
            throw new Error('Mock asset creation failure');
        }
        const assetId = (0, uuid_1.v4)();
        const asset = {
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
    async getAsset(assetId) {
        if (!this.connected) {
            throw new Error('Not connected to mock ledger');
        }
        await this.simulateLatency();
        return this.assets.get(assetId) || null;
    }
    async createAccount(institutionId) {
        if (!this.connected) {
            throw new Error('Not connected to mock ledger');
        }
        await this.simulateLatency();
        if (this.shouldSimulateFailure()) {
            throw new Error('Mock account creation failure');
        }
        const accountId = (0, uuid_1.v4)();
        const address = `mock_address_${accountId.substring(0, 8)}`;
        const account = {
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
    async getAccount(accountId) {
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
    async getBalance(accountId, assetId) {
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
    async transfer(from, to, assetId, amount) {
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
        const operationId = (0, uuid_1.v4)();
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
            const txHash = `mock_tx_${(0, uuid_1.v4)()}`;
            const transaction = {
                hash: txHash,
                ledgerId: this.ledgerId,
                from,
                to,
                assetId,
                amount,
                status: types_1.TransactionStatus.CONFIRMED,
                timestamp: new Date(),
                gasUsed: BigInt(21000), // Mock gas usage
                gasPrice: BigInt(20000000000) // Mock gas price
            };
            this.transactions.set(txHash, transaction);
            this.logger.info(`Mock transfer completed: ${txHash}`);
            return txHash;
        }
        finally {
            if (this.config.enableConcurrencySimulation) {
                this.removePendingOperation(operationId);
            }
        }
    }
    async lockAsset(accountId, assetId, amount) {
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
        const operationId = `lock_${(0, uuid_1.v4)()}`;
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
            const txHash = `mock_lock_${(0, uuid_1.v4)()}`;
            this.logger.info(`Mock asset locked: ${txHash}`);
            return txHash;
        }
        finally {
            if (this.config.enableConcurrencySimulation) {
                this.removePendingOperation(operationId);
            }
        }
    }
    async unlockAsset(accountId, assetId, amount) {
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
        const operationId = `unlock_${(0, uuid_1.v4)()}`;
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
            }
            else {
                lockedBalances.set(assetId, newLockedAmount);
            }
            this.lockedBalances.set(accountId, lockedBalances);
            if (this.config.enableBalanceHistory) {
                this.recordBalanceChange(accountId, assetId, newLockedAmount, 'unlock');
            }
            const txHash = `mock_unlock_${(0, uuid_1.v4)()}`;
            this.logger.info(`Mock asset unlocked: ${txHash}`);
            return txHash;
        }
        finally {
            if (this.config.enableConcurrencySimulation) {
                this.removePendingOperation(operationId);
            }
        }
    }
    async getTransaction(txHash) {
        if (!this.connected) {
            throw new Error('Not connected to mock ledger');
        }
        await this.simulateLatency();
        return this.transactions.get(txHash) || null;
    }
    async getTransactionStatus(txHash) {
        const transaction = await this.getTransaction(txHash);
        return transaction?.status || types_1.TransactionStatus.PENDING;
    }
    // Mock-specific utility methods
    async mintTokens(accountId, assetId, amount) {
        const accountBalances = this.balances.get(accountId) || new Map();
        const currentBalance = accountBalances.get(assetId) || BigInt(0);
        const newBalance = currentBalance + amount;
        accountBalances.set(assetId, newBalance);
        this.balances.set(accountId, accountBalances);
        // Record balance change in history
        this.recordBalanceChange(accountId, assetId, newBalance, 'mintTokens');
        this.logger.info(`Minted ${amount} of asset ${assetId} to account ${accountId}`);
    }
    async burnTokens(accountId, assetId, amount) {
        const accountBalances = this.balances.get(accountId) || new Map();
        const currentBalance = accountBalances.get(assetId) || BigInt(0);
        if (currentBalance < amount) {
            throw new Error('Insufficient balance to burn');
        }
        const newBalance = currentBalance - amount;
        if (newBalance === BigInt(0)) {
            accountBalances.delete(assetId);
        }
        else {
            accountBalances.set(assetId, newBalance);
        }
        this.balances.set(accountId, accountBalances);
        // Record balance change in history
        this.recordBalanceChange(accountId, assetId, newBalance, 'burnTokens');
        this.logger.info(`Burned ${amount} of asset ${assetId} from account ${accountId}`);
    }
    async getLockedBalance(accountId, assetId) {
        await this.simulateLatency();
        const lockedBalances = this.lockedBalances.get(accountId) || new Map();
        return lockedBalances.get(assetId) || BigInt(0);
    }
    getAllAssets() {
        return Array.from(this.assets.values());
    }
    getAllAccounts() {
        return Array.from(this.accounts.values());
    }
    getAllTransactions() {
        return Array.from(this.transactions.values());
    }
    reset() {
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
    getBalanceHistory(accountId) {
        return this.balanceHistory.get(accountId) || [];
    }
    getPendingOperations() {
        const operations = [];
        for (const [operationId, operation] of this.pendingOperations) {
            operations.push({ operationId, ...operation });
        }
        return operations;
    }
    simulateInsufficientBalance(accountId, assetId) {
        const accountBalances = this.balances.get(accountId) || new Map();
        accountBalances.set(assetId, BigInt(0));
        this.balances.set(accountId, accountBalances);
        this.logger.info(`Simulated insufficient balance for account ${accountId}, asset ${assetId}`);
    }
    simulateConcurrentTransfers(accountId, assetId, count = 5) {
        for (let i = 0; i < count; i++) {
            const operationId = `concurrent_${i}_${(0, uuid_1.v4)()}`;
            this.addPendingOperation(operationId, 'concurrent_transfer', accountId, assetId, BigInt(1000));
        }
        this.logger.info(`Simulated ${count} concurrent operations for account ${accountId}`);
    }
    simulateNetworkPartition(partitioned = true) {
        this.networkPartitioned = partitioned;
        this.logger.info(`Network partition ${partitioned ? 'enabled' : 'disabled'}`);
    }
    async simulateBalanceReconciliation(accountId, assetId, correctBalance) {
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
    async getAvailableBalance(accountId, assetId) {
        await this.simulateLatency();
        const totalBalance = this.balances.get(accountId)?.get(assetId) || BigInt(0);
        const lockedAmount = await this.getLockedBalance(accountId, assetId);
        return totalBalance - lockedAmount;
    }
    async simulateLatency() {
        if (this.config.latency && this.config.latency > 0) {
            await new Promise(resolve => setTimeout(resolve, this.config.latency));
        }
    }
    shouldSimulateFailure() {
        if (!this.config.failureRate || this.config.failureRate <= 0) {
            return false;
        }
        return Math.random() * 100 < this.config.failureRate;
    }
    shouldSimulateNetworkPartition() {
        if (!this.config.networkPartitionRate || this.config.networkPartitionRate <= 0) {
            return false;
        }
        return Math.random() * 100 < this.config.networkPartitionRate;
    }
    recordBalanceChange(accountId, assetId, balance, operation) {
        if (!this.balanceHistory.has(accountId)) {
            this.balanceHistory.set(accountId, []);
        }
        const history = this.balanceHistory.get(accountId);
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
    hasPendingOperation(accountId, assetId) {
        for (const [_, operation] of this.pendingOperations) {
            if (operation.accountId === accountId && operation.assetId === assetId) {
                return true;
            }
        }
        return false;
    }
    addPendingOperation(operationId, operation, accountId, assetId, amount) {
        this.pendingOperations.set(operationId, {
            operation,
            timestamp: new Date(),
            accountId,
            assetId,
            amount
        });
    }
    removePendingOperation(operationId) {
        this.pendingOperations.delete(operationId);
    }
    async initializeDefaultData() {
        try {
            // Create a default asset
            const assetId = (0, uuid_1.v4)();
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
        }
        catch (error) {
            this.logger.warn('Failed to initialize default data:', error);
        }
    }
}
exports.MockAdapter = MockAdapter;
//# sourceMappingURL=MockAdapter.js.map