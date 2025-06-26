"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HederaAdapter = void 0;
const sdk_1 = require("@hashgraph/sdk");
const types_1 = require("../types");
class HederaAdapter {
    constructor(config, logger) {
        this.ledgerId = 'hedera';
        this.name = 'Hedera Hashgraph';
        this.type = types_1.LedgerType.HEDERA;
        this.connected = false;
        // Cache for created tokens and accounts
        this.tokenCache = new Map();
        this.accountCache = new Map();
        this.config = config;
        this.logger = logger;
        // Initialize operator credentials
        this.operatorId = sdk_1.AccountId.fromString(config.operatorId);
        this.operatorKey = sdk_1.PrivateKey.fromString(config.operatorKey);
        // Initialize treasury (defaults to operator if not provided)
        this.treasuryId = config.treasuryId
            ? sdk_1.AccountId.fromString(config.treasuryId)
            : this.operatorId;
        this.treasuryKey = config.treasuryKey
            ? sdk_1.PrivateKey.fromString(config.treasuryKey)
            : this.operatorKey;
    }
    async connect() {
        try {
            // Initialize Hedera client based on network
            switch (this.config.network) {
                case 'mainnet':
                    this.client = sdk_1.Client.forMainnet();
                    break;
                case 'testnet':
                    this.client = sdk_1.Client.forTestnet();
                    break;
                case 'previewnet':
                    this.client = sdk_1.Client.forPreviewnet();
                    break;
                default:
                    throw new Error(`Unsupported network: ${this.config.network}`);
            }
            // Set operator
            this.client.setOperator(this.operatorId, this.operatorKey);
            // Test connection by querying operator balance
            const balance = await new sdk_1.AccountBalanceQuery()
                .setAccountId(this.operatorId)
                .execute(this.client);
            this.logger.info(`Connected to Hedera ${this.config.network}`);
            this.logger.info(`Operator balance: ${balance.hbars.toString()}`);
            this.connected = true;
        }
        catch (error) {
            this.logger.error('Failed to connect to Hedera network:', error);
            throw error;
        }
    }
    async disconnect() {
        if (this.client) {
            this.client.close();
        }
        this.connected = false;
        this.logger.info('Disconnected from Hedera network');
    }
    isConnected() {
        return this.connected;
    }
    async createAsset(assetData) {
        if (!this.connected) {
            throw new Error('Not connected to Hedera network');
        }
        try {
            // Create token on Hedera
            const tokenCreateTx = new sdk_1.TokenCreateTransaction()
                .setTokenName(assetData.name)
                .setTokenSymbol(assetData.symbol)
                .setDecimals(assetData.decimals)
                .setInitialSupply(Number(assetData.totalSupply))
                .setTreasuryAccountId(this.treasuryId)
                .setSupplyType(sdk_1.TokenSupplyType.Finite)
                .setMaxSupply(Number(assetData.totalSupply))
                .setTokenType(sdk_1.TokenType.FungibleCommon)
                .setSupplyKey(this.treasuryKey)
                .setAdminKey(this.treasuryKey)
                .setFreezeKey(this.treasuryKey)
                .setWipeKey(this.treasuryKey)
                .setTokenMemo(JSON.stringify(assetData.metadata))
                .freezeWith(this.client);
            // Sign and execute
            const tokenCreateSign = await tokenCreateTx.sign(this.treasuryKey);
            const tokenCreateSubmit = await tokenCreateSign.execute(this.client);
            const tokenCreateReceipt = await tokenCreateSubmit.getReceipt(this.client);
            if (tokenCreateReceipt.status !== sdk_1.Status.Success) {
                throw new Error(`Token creation failed: ${tokenCreateReceipt.status}`);
            }
            const tokenId = tokenCreateReceipt.tokenId;
            if (!tokenId) {
                throw new Error('Token ID not returned from creation');
            }
            const tokenIdString = tokenId.toString();
            this.tokenCache.set(tokenIdString, tokenId);
            const asset = {
                id: tokenIdString,
                finId: {
                    id: tokenIdString,
                    type: 'asset',
                    domain: 'hedera.com'
                },
                symbol: assetData.symbol,
                name: assetData.name,
                decimals: assetData.decimals,
                totalSupply: assetData.totalSupply,
                ledgerId: this.ledgerId,
                contractAddress: tokenIdString,
                metadata: assetData.metadata,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            this.logger.info(`Created token ${asset.symbol} with ID: ${tokenIdString}`);
            return asset;
        }
        catch (error) {
            this.logger.error('Failed to create asset on Hedera:', error);
            throw error;
        }
    }
    async getAsset(assetId) {
        if (!this.connected) {
            throw new Error('Not connected to Hedera network');
        }
        try {
            // For Hedera, we would need to query token info
            // This is a simplified implementation
            const tokenId = sdk_1.TokenId.fromString(assetId);
            // In a real implementation, you would query token info from Hedera
            // For now, return a mock asset if token exists in cache
            if (this.tokenCache.has(assetId)) {
                const asset = {
                    id: assetId,
                    finId: {
                        id: assetId,
                        type: 'asset',
                        domain: 'hedera.com'
                    },
                    symbol: 'UNKNOWN',
                    name: 'Unknown Token',
                    decimals: 8,
                    totalSupply: BigInt(0),
                    ledgerId: this.ledgerId,
                    contractAddress: assetId,
                    metadata: {},
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                return asset;
            }
            return null;
        }
        catch (error) {
            this.logger.error(`Failed to get asset ${assetId}:`, error);
            return null;
        }
    }
    async createAccount(institutionId) {
        if (!this.connected) {
            throw new Error('Not connected to Hedera network');
        }
        try {
            // Create new Hedera account
            const newAccountPrivateKey = sdk_1.PrivateKey.generateED25519();
            const newAccountPublicKey = newAccountPrivateKey.publicKey;
            const accountCreateTx = new sdk_1.AccountCreateTransaction()
                .setKey(newAccountPublicKey)
                .setInitialBalance(sdk_1.Hbar.fromTinybars(1000)) // Minimum balance
                .setAccountMemo(`FinP2P Account for ${institutionId}`)
                .freezeWith(this.client);
            const accountCreateSign = await accountCreateTx.sign(this.operatorKey);
            const accountCreateSubmit = await accountCreateSign.execute(this.client);
            const accountCreateReceipt = await accountCreateSubmit.getReceipt(this.client);
            if (accountCreateReceipt.status !== sdk_1.Status.Success) {
                throw new Error(`Account creation failed: ${accountCreateReceipt.status}`);
            }
            const accountId = accountCreateReceipt.accountId;
            if (!accountId) {
                throw new Error('Account ID not returned from creation');
            }
            const accountIdString = accountId.toString();
            this.accountCache.set(accountIdString, accountId);
            const account = {
                finId: {
                    id: accountIdString,
                    type: 'account',
                    domain: 'hedera.com'
                },
                address: accountIdString,
                ledgerId: this.ledgerId,
                institutionId,
                balances: new Map(),
                createdAt: new Date(),
                updatedAt: new Date()
            };
            this.logger.info(`Created account for institution ${institutionId}: ${accountIdString}`);
            // Store private key securely (in production, this should be handled differently)
            this.logger.info(`Account private key: ${newAccountPrivateKey.toString()}`);
            return account;
        }
        catch (error) {
            this.logger.error('Failed to create account on Hedera:', error);
            throw error;
        }
    }
    async getAccount(accountId) {
        if (!this.connected) {
            throw new Error('Not connected to Hedera network');
        }
        try {
            const hederaAccountId = sdk_1.AccountId.fromString(accountId);
            // Query account balance
            const balance = await new sdk_1.AccountBalanceQuery()
                .setAccountId(hederaAccountId)
                .execute(this.client);
            const account = {
                finId: {
                    id: accountId,
                    type: 'account',
                    domain: 'hedera.com'
                },
                address: accountId,
                ledgerId: this.ledgerId,
                institutionId: 'unknown', // Would need to be stored separately
                balances: new Map(),
                createdAt: new Date(), // Would need to be queried from transaction history
                updatedAt: new Date()
            };
            // Add HBAR balance
            account.balances.set('HBAR', BigInt(balance.hbars.toTinybars().toString()));
            // Add token balances
            if (balance.tokens) {
                for (const [tokenId, tokenBalance] of Object.entries(balance.tokens)) {
                    account.balances.set(tokenId.toString(), BigInt(tokenBalance.toString()));
                }
            }
            return account;
        }
        catch (error) {
            this.logger.error(`Failed to get account ${accountId}:`, error);
            return null;
        }
    }
    async getBalance(accountId, assetId) {
        if (!this.connected) {
            throw new Error('Not connected to Hedera network');
        }
        try {
            const hederaAccountId = sdk_1.AccountId.fromString(accountId);
            const balance = await new sdk_1.AccountBalanceQuery()
                .setAccountId(hederaAccountId)
                .execute(this.client);
            if (assetId === 'HBAR') {
                return BigInt(balance.hbars.toTinybars().toString());
            }
            const tokenId = sdk_1.TokenId.fromString(assetId);
            const tokenBalance = balance.tokens?.get(tokenId);
            return tokenBalance ? BigInt(tokenBalance.toString()) : BigInt(0);
        }
        catch (error) {
            this.logger.error(`Failed to get balance for account ${accountId}, asset ${assetId}:`, error);
            throw error;
        }
    }
    async transfer(from, to, assetId, amount) {
        if (!this.connected) {
            throw new Error('Not connected to Hedera network');
        }
        try {
            const fromAccountId = sdk_1.AccountId.fromString(from);
            const toAccountId = sdk_1.AccountId.fromString(to);
            let transferTx;
            if (assetId === 'HBAR') {
                // HBAR transfer
                transferTx = new sdk_1.TransferTransaction()
                    .addHbarTransfer(fromAccountId, sdk_1.Hbar.fromTinybars(-amount.toString()))
                    .addHbarTransfer(toAccountId, sdk_1.Hbar.fromTinybars(amount.toString()))
                    .freezeWith(this.client);
            }
            else {
                // Token transfer
                const tokenId = sdk_1.TokenId.fromString(assetId);
                transferTx = new sdk_1.TransferTransaction()
                    .addTokenTransfer(tokenId, fromAccountId, -Number(amount))
                    .addTokenTransfer(tokenId, toAccountId, Number(amount))
                    .freezeWith(this.client);
            }
            // Sign with operator key (in production, would need proper key management)
            const transferSign = await transferTx.sign(this.operatorKey);
            const transferSubmit = await transferSign.execute(this.client);
            const transferReceipt = await transferSubmit.getReceipt(this.client);
            if (transferReceipt.status !== sdk_1.Status.Success) {
                throw new Error(`Transfer failed: ${transferReceipt.status}`);
            }
            const txId = transferSubmit.transactionId.toString();
            this.logger.info(`Transfer completed: ${txId}`);
            return txId;
        }
        catch (error) {
            this.logger.error('Failed to execute transfer on Hedera:', error);
            throw error;
        }
    }
    async lockAsset(accountId, assetId, amount) {
        if (!this.connected) {
            throw new Error('Not connected to Hedera network');
        }
        try {
            // For Hedera, we can use token freeze functionality
            const hederaAccountId = sdk_1.AccountId.fromString(accountId);
            const tokenId = sdk_1.TokenId.fromString(assetId);
            const freezeTx = new sdk_1.TokenFreezeTransaction()
                .setAccountId(hederaAccountId)
                .setTokenId(tokenId)
                .freezeWith(this.client);
            const freezeSign = await freezeTx.sign(this.treasuryKey);
            const freezeSubmit = await freezeSign.execute(this.client);
            const freezeReceipt = await freezeSubmit.getReceipt(this.client);
            if (freezeReceipt.status !== sdk_1.Status.Success) {
                throw new Error(`Asset lock failed: ${freezeReceipt.status}`);
            }
            return freezeSubmit.transactionId.toString();
        }
        catch (error) {
            this.logger.error('Failed to lock asset on Hedera:', error);
            throw error;
        }
    }
    async unlockAsset(accountId, assetId, amount) {
        if (!this.connected) {
            throw new Error('Not connected to Hedera network');
        }
        try {
            const hederaAccountId = sdk_1.AccountId.fromString(accountId);
            const tokenId = sdk_1.TokenId.fromString(assetId);
            const unfreezeTx = new sdk_1.TokenUnfreezeTransaction()
                .setAccountId(hederaAccountId)
                .setTokenId(tokenId)
                .freezeWith(this.client);
            const unfreezeSign = await unfreezeTx.sign(this.treasuryKey);
            const unfreezeSubmit = await unfreezeSign.execute(this.client);
            const unfreezeReceipt = await unfreezeSubmit.getReceipt(this.client);
            if (unfreezeReceipt.status !== sdk_1.Status.Success) {
                throw new Error(`Asset unlock failed: ${unfreezeReceipt.status}`);
            }
            return unfreezeSubmit.transactionId.toString();
        }
        catch (error) {
            this.logger.error('Failed to unlock asset on Hedera:', error);
            throw error;
        }
    }
    async getTransaction(txHash) {
        if (!this.connected) {
            throw new Error('Not connected to Hedera network');
        }
        try {
            console.log('DEBUG: Starting getTransaction with hash:', txHash);
            console.log('DEBUG: Connected status:', this.connected);
            console.log('DEBUG: Client:', this.client);
            // Parse transaction ID from hash
            const transactionId = sdk_1.TransactionId.fromString(txHash);
            console.log('DEBUG: Parsed transaction ID:', transactionId);
            // Query transaction receipt
            const receiptQuery = new sdk_1.TransactionReceiptQuery()
                .setTransactionId(transactionId);
            console.log('DEBUG: Created receipt query:', receiptQuery);
            const receipt = await receiptQuery.execute(this.client);
            console.log('DEBUG: Got receipt:', receipt);
            const transaction = {
                hash: txHash,
                ledgerId: this.ledgerId,
                from: '', // Would need to parse from transaction record
                to: '', // Would need to parse from transaction record
                assetId: '', // Would need to parse from transaction record
                amount: BigInt(0), // Would need to parse from transaction record
                status: receipt.status === sdk_1.Status.Success
                    ? types_1.TransactionStatus.CONFIRMED
                    : types_1.TransactionStatus.FAILED,
                timestamp: new Date(), // Would need to get from transaction record
                gasUsed: BigInt(0) // Hedera uses fixed fees
            };
            console.log('DEBUG: Created transaction:', transaction);
            return transaction;
        }
        catch (error) {
            console.log('DEBUG: Error in getTransaction:', error);
            this.logger.error(`Failed to get transaction ${txHash}:`, error);
            return null;
        }
    }
    async getLockedBalance(accountId, assetId) {
        // Hedera doesn't have a native locked balance concept
        // For demo purposes, we'll return 0
        return BigInt(0);
    }
    async getAvailableBalance(accountId, assetId) {
        // For Hedera, available balance is same as total balance since we don't track locked balances
        return this.getBalance(accountId, assetId);
    }
    async getTransactionStatus(txHash) {
        const transaction = await this.getTransaction(txHash);
        return transaction?.status || types_1.TransactionStatus.PENDING;
    }
    // Hedera-specific utility methods
    getOperatorId() {
        return this.operatorId.toString();
    }
    getTreasuryId() {
        return this.treasuryId.toString();
    }
    async getOperatorBalance() {
        const balance = await new sdk_1.AccountBalanceQuery()
            .setAccountId(this.operatorId)
            .execute(this.client);
        return BigInt(balance.hbars.toTinybars().toString());
    }
    async associateToken(accountId, tokenId, accountKey) {
        const hederaAccountId = sdk_1.AccountId.fromString(accountId);
        const hederaTokenId = sdk_1.TokenId.fromString(tokenId);
        const associateTx = new sdk_1.TokenAssociateTransaction()
            .setAccountId(hederaAccountId)
            .setTokenIds([hederaTokenId])
            .freezeWith(this.client);
        const associateSign = await associateTx.sign(accountKey);
        const associateSubmit = await associateSign.execute(this.client);
        const associateReceipt = await associateSubmit.getReceipt(this.client);
        if (associateReceipt.status !== sdk_1.Status.Success) {
            throw new Error(`Token association failed: ${associateReceipt.status}`);
        }
        return associateSubmit.transactionId.toString();
    }
    // Balance history operations
    getBalanceHistory(accountId) {
        // TODO: Implement balance history tracking for Hedera
        // For now, return empty array as this feature requires additional infrastructure
        this.logger.warn(`Balance history not yet implemented for Hedera adapter. AccountId: ${accountId}`);
        return [];
    }
}
exports.HederaAdapter = HederaAdapter;
//# sourceMappingURL=HederaAdapter.js.map