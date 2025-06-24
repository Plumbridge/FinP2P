"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuiAdapter = void 0;
const client_1 = require("@mysten/sui/client");
const ed25519_1 = require("@mysten/sui/keypairs/ed25519");
const transactions_1 = require("@mysten/sui/transactions");
const utils_1 = require("@mysten/sui/utils");
const faucet_1 = require("@mysten/sui/faucet");
const bcs_1 = require("@mysten/bcs");
const types_1 = require("../types");
class SuiAdapter {
    constructor(config, logger) {
        this.ledgerId = 'sui';
        this.name = 'Sui Network';
        this.type = types_1.LedgerType.SUI;
        this.connected = false;
        // Move module names for FinP2P contracts
        this.ASSET_MODULE = 'finp2p_asset';
        this.ACCOUNT_MODULE = 'finp2p_account';
        this.TRANSFER_MODULE = 'finp2p_transfer';
        this.config = config;
        this.logger = logger;
        // Initialize Sui client
        const rpcUrl = config.rpcUrl || (0, client_1.getFullnodeUrl)(config.network);
        this.client = new client_1.SuiClient({ url: rpcUrl });
        // Initialize keypair
        if (config.privateKey) {
            this.keypair = ed25519_1.Ed25519Keypair.fromSecretKey((0, utils_1.fromB64)(config.privateKey));
        }
        else {
            this.keypair = new ed25519_1.Ed25519Keypair();
            this.logger.warn('No private key provided, generated new keypair');
        }
        this.packageId = config.packageId || '';
    }
    async connect() {
        try {
            // Test connection by getting chain identifier
            const chainId = await this.client.getChainIdentifier();
            this.logger.info(`Connected to Sui network: ${chainId}`);
            // Get account address
            const address = this.keypair.getPublicKey().toSuiAddress();
            this.logger.info(`Sui adapter address: ${address}`);
            // Check if FinP2P package is deployed
            if (!this.packageId) {
                this.logger.warn('No FinP2P package ID provided, some functions may not work');
            }
            this.connected = true;
        }
        catch (error) {
            this.logger.error('Failed to connect to Sui network:', error);
            throw error;
        }
    }
    async disconnect() {
        this.connected = false;
        this.logger.info('Disconnected from Sui network');
    }
    isConnected() {
        return this.connected;
    }
    async createAsset(assetData) {
        if (!this.connected) {
            throw new Error('Not connected to Sui network');
        }
        try { // Prepare transaction
            const tx = new transactions_1.Transaction();
            // Call Move function to create asset
            tx.moveCall({
                target: `${this.packageId}::${this.ASSET_MODULE}::create_asset`,
                arguments: [
                    tx.pure(bcs_1.bcs.string().serialize(assetData.symbol)),
                    tx.pure(bcs_1.bcs.string().serialize(assetData.name)),
                    tx.pure(bcs_1.bcs.u8().serialize(assetData.decimals)),
                    tx.pure(bcs_1.bcs.u64().serialize(assetData.totalSupply)),
                    tx.pure(bcs_1.bcs.string().serialize(JSON.stringify(assetData.metadata)))
                ]
            });
            const result = await this.client.signAndExecuteTransaction({
                signer: this.keypair,
                transaction: tx,
                options: {
                    showEffects: true,
                    showObjectChanges: true
                }
            });
            if (result.effects?.status?.status !== 'success') {
                throw new Error(`Asset creation failed: ${result.effects?.status?.error}`);
            }
            // Extract created object ID
            const createdObjects = result.objectChanges?.filter((change) => change.type === 'created');
            if (!createdObjects || createdObjects.length === 0) {
                throw new Error('No asset object created');
            }
            const assetObjectId = createdObjects[0].objectId;
            const asset = {
                id: assetObjectId,
                finId: {
                    id: assetObjectId,
                    type: 'asset',
                    domain: 'sui.network'
                },
                symbol: assetData.symbol,
                name: assetData.name,
                decimals: assetData.decimals,
                totalSupply: assetData.totalSupply,
                ledgerId: this.ledgerId,
                contractAddress: assetObjectId,
                metadata: assetData.metadata,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            this.logger.info(`Created asset ${asset.symbol} with ID: ${asset.id}`);
            return asset;
        }
        catch (error) {
            this.logger.error('Failed to create asset on Sui:', error);
            throw error;
        }
    }
    async getAsset(assetId) {
        if (!this.connected) {
            throw new Error('Not connected to Sui network');
        }
        try {
            const object = await this.client.getObject({
                id: assetId,
                options: {
                    showContent: true,
                    showType: true
                }
            });
            if (!object.data) {
                return null;
            }
            const content = object.data.content;
            if (!content || content.dataType !== 'moveObject') {
                return null;
            }
            const fields = content.fields;
            const asset = {
                id: assetId,
                finId: {
                    id: assetId,
                    type: 'asset',
                    domain: 'sui.network'
                },
                symbol: fields.symbol,
                name: fields.name,
                decimals: parseInt(fields.decimals),
                totalSupply: BigInt(fields.total_supply),
                ledgerId: this.ledgerId,
                contractAddress: assetId,
                metadata: JSON.parse(fields.metadata || '{}'),
                createdAt: new Date(parseInt(fields.created_at) * 1000),
                updatedAt: new Date(parseInt(fields.updated_at) * 1000)
            };
            return asset;
        }
        catch (error) {
            this.logger.error(`Failed to get asset ${assetId}:`, error);
            return null;
        }
    }
    async createAccount(institutionId) {
        if (!this.connected) {
            throw new Error('Not connected to Sui network');
        }
        try {
            const tx = new transactions_1.Transaction();
            // Call Move function to create account
            tx.moveCall({
                target: `${this.packageId}::${this.ACCOUNT_MODULE}::create_account`,
                arguments: [
                    tx.pure(bcs_1.bcs.string().serialize(institutionId))
                ]
            });
            const result = await this.client.signAndExecuteTransaction({
                signer: this.keypair,
                transaction: tx,
                options: {
                    showEffects: true,
                    showObjectChanges: true
                }
            });
            if (result.effects?.status?.status !== 'success') {
                throw new Error(`Account creation failed: ${result.effects?.status?.error}`);
            }
            const createdObjects = result.objectChanges?.filter((change) => change.type === 'created');
            if (!createdObjects || createdObjects.length === 0) {
                throw new Error('No account object created');
            }
            const accountObjectId = createdObjects[0].objectId;
            const address = this.keypair.getPublicKey().toSuiAddress();
            const account = {
                finId: {
                    id: accountObjectId,
                    type: 'account',
                    domain: 'sui.network'
                },
                address,
                ledgerId: this.ledgerId,
                institutionId,
                balances: new Map(),
                createdAt: new Date(),
                updatedAt: new Date()
            };
            this.logger.info(`Created account for institution ${institutionId}: ${accountObjectId}`);
            return account;
        }
        catch (error) {
            this.logger.error('Failed to create account on Sui:', error);
            throw error;
        }
    }
    async importAccount(privateKey) {
        if (!this.connected) {
            throw new Error('Not connected to Sui network');
        }
        try {
            // Create keypair from private key
            const keypair = ed25519_1.Ed25519Keypair.fromSecretKey((0, utils_1.fromB64)(privateKey));
            const address = keypair.getPublicKey().toSuiAddress();
            // Create account object with imported keypair
            const account = {
                finId: {
                    id: address,
                    type: 'account',
                    domain: 'sui.network'
                },
                address,
                ledgerId: this.ledgerId,
                institutionId: 'imported',
                balances: new Map(),
                createdAt: new Date(),
                updatedAt: new Date()
            };
            this.logger.info(`Imported account: ${address}`);
            return account;
        }
        catch (error) {
            this.logger.error('Failed to import account on Sui:', error);
            throw error;
        }
    }
    async getAccount(accountId) {
        if (!this.connected) {
            throw new Error('Not connected to Sui network');
        }
        try {
            const object = await this.client.getObject({
                id: accountId,
                options: {
                    showContent: true
                }
            });
            if (!object.data) {
                return null;
            }
            const content = object.data.content;
            const fields = content.fields;
            const account = {
                finId: {
                    id: accountId,
                    type: 'account',
                    domain: 'sui.network'
                },
                address: fields.address,
                ledgerId: this.ledgerId,
                institutionId: fields.institution_id,
                balances: new Map(Object.entries(fields.balances || {})),
                createdAt: new Date(parseInt(fields.created_at) * 1000),
                updatedAt: new Date(parseInt(fields.updated_at) * 1000)
            };
            return account;
        }
        catch (error) {
            this.logger.error(`Failed to get account ${accountId}:`, error);
            return null;
        }
    }
    async getBalance(accountId, assetId) {
        if (!this.connected) {
            throw new Error('Not connected to Sui network');
        }
        try {
            // For Sui, we need to query the account object and get balance for specific asset
            const account = await this.getAccount(accountId);
            if (!account) {
                throw new Error('Account not found');
            }
            const balance = account.balances.get(assetId);
            return balance ? BigInt(balance) : BigInt(0);
        }
        catch (error) {
            this.logger.error(`Failed to get balance for account ${accountId}, asset ${assetId}:`, error);
            throw error;
        }
    }
    async prepareTransfer(transferData) {
        if (!this.connected) {
            throw new Error('Not connected to Sui network');
        }
        try {
            // Validate transfer data
            const { from, to, assetId, asset, amount } = transferData;
            const finalAssetId = assetId || asset;
            if (!from || !to || !finalAssetId || !amount) {
                throw new Error('Invalid transfer data');
            }
            // Check balance
            const balance = await this.getBalance(from, finalAssetId);
            if (balance < BigInt(amount)) {
                throw new Error('Insufficient funds');
            }
            // Prepare transaction
            const tx = new transactions_1.Transaction();
            tx.moveCall({
                target: `${this.packageId}::${this.TRANSFER_MODULE}::transfer`,
                arguments: [
                    tx.pure(from),
                    tx.pure(to),
                    tx.pure(finalAssetId),
                    tx.pure(bcs_1.bcs.u64().serialize(BigInt(amount)))
                ]
            });
            return {
                transaction: tx,
                from,
                to,
                assetId: finalAssetId,
                amount
            };
        }
        catch (error) {
            this.logger.error('Failed to prepare transfer on Sui:', error);
            throw error;
        }
    }
    async executeTransfer(transferData) {
        if (!this.connected) {
            throw new Error('Not connected to Sui network');
        }
        try {
            const prepared = await this.prepareTransfer(transferData);
            const result = await this.client.signAndExecuteTransaction({
                signer: this.keypair,
                transaction: prepared.transaction,
                options: {
                    showEffects: true
                }
            });
            if (result.effects?.status?.status !== 'success') {
                throw new Error(`Transfer failed: ${result.effects?.status?.error}`);
            }
            const txHash = result.digest;
            this.logger.info(`Transfer completed: ${txHash}`);
            return txHash;
        }
        catch (error) {
            this.logger.error('Failed to execute transfer on Sui:', error);
            throw error;
        }
    }
    async transfer(from, to, assetId, amount) {
        return this.executeTransfer({ from, to, assetId, amount });
    }
    async lockAsset(accountId, assetId, amount) {
        if (!this.connected) {
            throw new Error('Not connected to Sui network');
        }
        try {
            const tx = new transactions_1.Transaction();
            tx.moveCall({
                target: `${this.packageId}::${this.TRANSFER_MODULE}::lock_asset`,
                arguments: [
                    tx.object(accountId),
                    tx.object(assetId),
                    tx.pure(bcs_1.bcs.u64().serialize(amount))
                ]
            });
            const result = await this.client.signAndExecuteTransaction({
                signer: this.keypair,
                transaction: tx,
                options: {
                    showEffects: true
                }
            });
            if (result.effects?.status?.status !== 'success') {
                throw new Error(`Asset lock failed: ${result.effects?.status?.error}`);
            }
            return result.digest;
        }
        catch (error) {
            this.logger.error('Failed to lock asset on Sui:', error);
            throw error;
        }
    }
    async unlockAsset(accountId, assetId, amount) {
        if (!this.connected) {
            throw new Error('Not connected to Sui network');
        }
        try {
            const tx = new transactions_1.Transaction();
            tx.moveCall({
                target: `${this.packageId}::${this.TRANSFER_MODULE}::unlock_asset`,
                arguments: [
                    tx.object(accountId),
                    tx.object(assetId),
                    tx.pure(bcs_1.bcs.u64().serialize(amount).toBytes())
                ]
            });
            const result = await this.client.signAndExecuteTransaction({
                signer: this.keypair,
                transaction: tx,
                options: {
                    showEffects: true
                }
            });
            if (result.effects?.status?.status !== 'success') {
                throw new Error(`Asset unlock failed: ${result.effects?.status?.error}`);
            }
            return result.digest;
        }
        catch (error) {
            this.logger.error('Failed to unlock asset on Sui:', error);
            throw error;
        }
    }
    async getTransaction(txHash) {
        if (!this.connected) {
            throw new Error('Not connected to Sui network');
        }
        try {
            const txResponse = await this.client.getTransactionBlock({
                digest: txHash,
                options: {
                    showEffects: true,
                    showInput: true,
                    showEvents: true
                }
            });
            if (!txResponse) {
                return null;
            }
            // Parse transaction details from Sui transaction
            const transaction = {
                hash: txHash,
                ledgerId: this.ledgerId,
                from: '', // Extract from transaction input
                to: '', // Extract from transaction input
                assetId: '', // Extract from transaction input
                amount: BigInt(0), // Extract from transaction input
                status: txResponse.effects?.status?.status === 'success'
                    ? types_1.TransactionStatus.CONFIRMED
                    : types_1.TransactionStatus.FAILED,
                timestamp: new Date(parseInt(txResponse.timestampMs || '0')),
                gasUsed: BigInt(txResponse.effects?.gasUsed?.computationCost || 0)
            };
            return transaction;
        }
        catch (error) {
            this.logger.error(`Failed to get transaction ${txHash}:`, error);
            throw error;
        }
    }
    async getLockedBalance(accountId, assetId) {
        if (!this.connected) {
            throw new Error('Not connected to Sui network');
        }
        try {
            const account = await this.getAccount(accountId);
            if (!account) {
                throw new Error('Account not found');
            }
            // For Sui, locked balance would be tracked in the account object
            // This is a placeholder implementation - actual implementation would depend on contract
            return BigInt(0);
        }
        catch (error) {
            this.logger.error(`Failed to get locked balance for account ${accountId}, asset ${assetId}:`, error);
            throw error;
        }
    }
    async getAvailableBalance(accountId, assetId) {
        if (!this.connected) {
            throw new Error('Not connected to Sui network');
        }
        try {
            // For Sui, available balance would be total balance minus locked balance
            const totalBalance = await this.getBalance(accountId, assetId);
            const lockedBalance = await this.getLockedBalance(accountId, assetId);
            return totalBalance - lockedBalance;
        }
        catch (error) {
            this.logger.error(`Failed to get available balance for account ${accountId}, asset ${assetId}:`, error);
            throw error;
        }
    }
    async getTransactionStatus(txHash) {
        const transaction = await this.getTransaction(txHash);
        return transaction?.status || types_1.TransactionStatus.PENDING;
    }
    // Sui-specific utility methods
    getAddress() {
        return this.keypair.getPublicKey().toSuiAddress();
    }
    async getGasBalance() {
        const address = this.getAddress();
        const balance = await this.client.getBalance({ owner: address });
        return BigInt(balance.totalBalance);
    }
    async requestFaucet() {
        if (this.config.network === 'devnet' || this.config.network === 'testnet') {
            try {
                await (0, faucet_1.requestSuiFromFaucetV2)({
                    host: (0, faucet_1.getFaucetHost)(this.config.network),
                    recipient: this.getAddress(),
                });
                this.logger.info('Requested SUI from faucet');
            }
            catch (error) {
                this.logger.error('Failed to request from faucet:', error);
            }
        }
    }
    getPrivateKeyBase64() {
        return this.keypair.getSecretKey();
    }
    // Balance history operations
    getBalanceHistory(accountId) {
        // TODO: Implement balance history tracking for Sui
        // For now, return empty array as this feature requires additional infrastructure
        this.logger.warn(`Balance history not yet implemented for Sui adapter. AccountId: ${accountId}`);
        return [];
    }
    getLedgerType() {
        return types_1.LedgerType.SUI;
    }
}
exports.SuiAdapter = SuiAdapter;
//# sourceMappingURL=SuiAdapter.js.map