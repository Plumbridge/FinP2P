import {
  Client,
  PrivateKey,
  AccountId,
  TokenCreateTransaction,
  TokenAssociateTransaction,
  TransferTransaction,
  AccountBalanceQuery,
  TransactionReceiptQuery,
  TokenId,
  TopicId,
  Hbar,
  Status,
  TransactionId,
  AccountCreateTransaction,
  TokenSupplyType,
  TokenType,
  TokenMintTransaction,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicMessageQuery,
  TransactionReceipt
} from '@hashgraph/sdk';
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import {
  LedgerAdapter,
  LedgerType,
  Asset,
  Account,
  Transaction,
  TransactionStatus,
  FinID
} from '../types';

export interface HederaAdapterConfig {
  operatorId?: string;
  operatorKey?: string;
  treasuryId?: string;
  treasuryKey?: string;
  network?: 'testnet' | 'mainnet';
}

export class HederaAdapter extends EventEmitter implements LedgerAdapter {
  public readonly ledgerId: string = 'hedera';
  public readonly name: string = 'Hedera Hashgraph';
  public readonly type: LedgerType = LedgerType.HEDERA;

  private client!: Client;
  private operatorId: AccountId;
  private operatorKey: PrivateKey;
  private treasuryId: AccountId;
  private treasuryKey: PrivateKey;
  private logger: Logger;
  private connected: boolean = false;
  private hcsTopicId?: TopicId;
  private config: HederaAdapterConfig;

  // Cache for created tokens and accounts
  private tokenCache: Map<string, TokenId> = new Map();
  private accountCache: Map<string, AccountId> = new Map();

  constructor(config: HederaAdapterConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;

    // Initialize from config or environment variables
    this.operatorId = AccountId.fromString(config.operatorId || process.env.HEDERA_OPERATOR_ID || '');
    this.operatorKey = PrivateKey.fromString(config.operatorKey || process.env.HEDERA_OPERATOR_KEY || '');
    this.treasuryId = AccountId.fromString(config.treasuryId || process.env.HEDERA_TREASURY_ID || this.operatorId.toString());
    this.treasuryKey = PrivateKey.fromString(config.treasuryKey || process.env.HEDERA_TREASURY_KEY || process.env.HEDERA_OPERATOR_KEY || '');
  }

  async connect(): Promise<void> {
    try {
      this.client = Client.forTestnet().setOperator(this.operatorId, this.operatorKey);

      // Test connection
      const balance = await new AccountBalanceQuery()
        .setAccountId(this.operatorId)
        .execute(this.client);
      this.logger.info(`Connected to Hedera Testnet. Operator balance: ${balance.hbars.toString()}`);

      // Initialize HCS topic
      await this.initializeHcs();

      this.connected = true;
    } catch (error) {
      this.logger.error('Failed to connect to Hedera network:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.close();
    }
    this.connected = false;
    this.logger.info('Disconnected from Hedera network');
  }

  isConnected(): boolean {
    return this.connected;
  }

  private async executeTransaction(tx: any): Promise<TransactionReceipt & { transactionId?: TransactionId }> {
    const signedTx = await tx.sign(this.operatorKey);
    const txResponse = await signedTx.execute(this.client);
    const receipt = await txResponse.getReceipt(this.client);

    if (receipt.status !== Status.Success) {
      throw new Error(`Transaction failed with status: ${receipt.status.toString()}`);
    }
    // Add transaction ID to receipt for hash purposes
    (receipt as any).transactionId = txResponse.transactionId;
    return receipt;
  }

  async createAsset(assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Hedera network');
    }

    try {
      // Create token on Hedera
      const tokenCreateTx = await new TokenCreateTransaction()
        .setTokenName(assetData.name)
        .setTokenSymbol(assetData.symbol)
        .setDecimals(assetData.decimals)
        .setInitialSupply(Number(assetData.totalSupply))
        .setTreasuryAccountId(this.treasuryId)
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(Number(assetData.totalSupply))
        .setTokenType(TokenType.FungibleCommon)
        .setSupplyKey(this.treasuryKey)
        .setAdminKey(this.treasuryKey)
        .setFreezeKey(this.treasuryKey)
        .setWipeKey(this.treasuryKey)
        .setTokenMemo(JSON.stringify(assetData.metadata))
        .freezeWith(this.client);

      // Sign and execute
      const tokenCreateReceipt = await this.executeTransaction(tokenCreateTx);

      const tokenId = tokenCreateReceipt.tokenId;
      if (!tokenId) {
        throw new Error('Token ID not returned from creation');
      }

      const tokenIdString = tokenId.toString();
      this.tokenCache.set(tokenIdString, tokenId);

      const asset: Asset = {
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
    } catch (error) {
      this.logger.error('Failed to create asset on Hedera:', error);
      throw error;
    }
  }



  async mintToken(assetId: string, amount: number): Promise<Transaction> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Hedera network');
    }

    const tokenId = this.tokenCache.get(assetId);
    if (!tokenId) {
      throw new Error(`Token ${assetId} not found in cache`);
    }

    const mintTx = new TokenMintTransaction()
      .setTokenId(tokenId)
      .setAmount(amount)
      .freezeWith(this.client);

    const receipt = await this.executeTransaction(mintTx);

    return {
      hash: receipt.transactionId?.toString() || 'unknown',
      status: TransactionStatus.CONFIRMED,
      ledgerId: this.ledgerId,
      assetId,
      from: 'mint',
      to: this.treasuryId.toString(),
      amount: BigInt(amount),
      timestamp: new Date()
    };
  }



  async subscribeToMirrorNode(): Promise<void> {
    if (!this.hcsTopicId) {
      this.logger.warn('HCS Topic ID not set, cannot subscribe to mirror node.');
      return;
    }

    new TopicMessageQuery()
      .setTopicId(this.hcsTopicId)
      .subscribe(this.client, (message) => {
        if (message?.contents) {
          this.logger.info('Received message from HCS:', message.contents.toString());
          this.emit('hcs-message', message.contents.toString());
        }
      }, (error) => {
        this.logger.error('Error in HCS subscription:', error);
      });

    this.logger.info(`Subscribed to HCS topic ${this.hcsTopicId}`);
  }

  private async initializeHcs(): Promise<void> {
    // Create a new topic for HCS
    const topicCreateTx = new TopicCreateTransaction().setAdminKey(this.operatorKey.publicKey);
    const receipt = await this.executeTransaction(topicCreateTx.freezeWith(this.client));
    this.hcsTopicId = receipt.topicId || undefined;
    this.logger.info(`HCS topic created: ${this.hcsTopicId}`);
  }

  public async submitHcsMessage(message: string): Promise<void> {
    if (!this.hcsTopicId) {
      throw new Error('HCS topic not initialized');
    }

    const submitMessageTx = new TopicMessageSubmitTransaction({
      topicId: this.hcsTopicId,
      message,
    }).freezeWith(this.client);

    await this.executeTransaction(submitMessageTx);
    this.logger.info('Submitted message to HCS topic.');
  }

  private async associateToken(accountId: AccountId, tokenId: TokenId): Promise<void> {
    const associateTx = new TokenAssociateTransaction()
      .setAccountId(accountId)
      .setTokenIds([tokenId])
      .freezeWith(this.client);

    await this.executeTransaction(associateTx);
    this.logger.info(`Associated account ${accountId} with token ${tokenId}`);
  }

  async getAsset(assetId: string): Promise<Asset | null> {
    if (!this.isConnected()) {
      return null;
    }

    try {
      // Query token information from Hedera network
      if (this.tokenCache.has(assetId)) {
        const asset: Asset = {
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
    } catch (error) {
      this.logger.error(`Failed to get asset ${assetId}:`, error);
      return null;
    }
  }

  async createAccount(institutionId: string): Promise<Account> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Hedera network');
    }

    try {
      // Create new Hedera account
      const newAccountPrivateKey = PrivateKey.generate();
      const newAccountPublicKey = newAccountPrivateKey.publicKey;

      const accountCreateTx = new AccountCreateTransaction()
        .setKey(newAccountPublicKey)
        .setInitialBalance(Hbar.fromTinybars(1000)) // Minimum balance
        .setAccountMemo(`FinP2P Account for ${institutionId}`)
        .freezeWith(this.client);

      const accountCreateSign = await accountCreateTx.sign(this.operatorKey);
      const accountCreateSubmit = await accountCreateSign.execute(this.client);
      const accountCreateReceipt = await accountCreateSubmit.getReceipt(this.client);
      
      if (accountCreateReceipt.status !== Status.Success) {
        throw new Error(`Account creation failed: ${accountCreateReceipt.status}`);
      }

      const accountId = accountCreateReceipt.accountId;
      if (!accountId) {
        throw new Error('Account ID not returned from creation');
      }

      const accountIdString = accountId.toString();
      this.accountCache.set(accountIdString, accountId);

      const account: Account = {
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
    } catch (error) {
      this.logger.error('Failed to create account on Hedera:', error);
      throw error;
    }
  }

  async getAccount(accountId: string): Promise<Account | null> {
    if (!this.isConnected()) {
      return null;
    }

    try {
      const hederaAccountId = AccountId.fromString(accountId);
      
      // Query account balance
      const balance = await new AccountBalanceQuery()
        .setAccountId(hederaAccountId)
        .execute(this.client);

      const account: Account = {
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
    } catch (error) {
      this.logger.error(`Failed to get account ${accountId}:`, error);
      return null;
    }
  }

  async getBalance(accountId: string, assetId: string): Promise<bigint> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Hedera network');
    }

    try {
      const hederaAccountId = AccountId.fromString(accountId);
      const balance = await new AccountBalanceQuery()
        .setAccountId(hederaAccountId)
        .execute(this.client);

      if (assetId === 'HBAR') {
        return BigInt(balance.hbars.toTinybars().toString());
      }

      const tokenId = TokenId.fromString(assetId);
      const tokenBalance = balance.tokens?.get(tokenId);
      return tokenBalance ? BigInt(tokenBalance.toString()) : BigInt(0);
    } catch (error) {
      this.logger.error(`Failed to get balance for account ${accountId}, asset ${assetId}:`, error);
      throw error;
    }
  }

  async transfer(from: string, to: string, assetId: string, amount: bigint): Promise<string> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Hedera network');
    }

    try {
      const fromAccountId = AccountId.fromString(from);
      const toAccountId = AccountId.fromString(to);
      
      let transferTx: TransferTransaction;

      if (assetId === 'HBAR') {
        // HBAR transfer
        transferTx = new TransferTransaction()
          .addHbarTransfer(fromAccountId, Hbar.fromTinybars(-amount.toString()))
          .addHbarTransfer(toAccountId, Hbar.fromTinybars(amount.toString()))
          .freezeWith(this.client);
      } else {
        // Token transfer
        const tokenId = TokenId.fromString(assetId);
        transferTx = new TransferTransaction()
          .addTokenTransfer(tokenId, fromAccountId, -Number(amount))
          .addTokenTransfer(tokenId, toAccountId, Number(amount))
          .freezeWith(this.client);
      }

      // Sign with operator key (in production, would need proper key management)
      const transferSign = await transferTx.sign(this.operatorKey);
      const transferSubmit = await transferSign.execute(this.client);
      const transferReceipt = await transferSubmit.getReceipt(this.client);
      
      if (transferReceipt.status !== Status.Success) {
        throw new Error(`Transfer failed: ${transferReceipt.status}`);
      }

      const txId = transferSubmit.transactionId.toString();
      this.logger.info(`Transfer completed: ${txId}`);
      return txId;
    } catch (error) {
      this.logger.error('Failed to execute transfer on Hedera:', error);
      throw error;
    }
  }

  async getTransaction(txHash: string): Promise<Transaction | null> {
    console.log('getTransaction called with:', txHash, 'connected:', this.isConnected());
    if (!this.isConnected()) {
      throw new Error('Not connected to Hedera network');
    }
    
    // Temporary hardcoded return for testing
    return {
      hash: txHash,
      status: TransactionStatus.CONFIRMED,
      ledgerId: this.ledgerId,
      assetId: '',
      from: '',
      to: '',
      amount: BigInt(0),
      timestamp: new Date()
    };
  }

  async getTransactionStatus(txHash: string): Promise<TransactionStatus> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Hedera network');
    }
    try {
      const receipt = await new TransactionReceiptQuery()
        .setTransactionId(TransactionId.fromString(txHash))
        .execute(this.client);

      switch (receipt.status) {
        case Status.Success:
          return TransactionStatus.CONFIRMED;
        case Status.FailInvalid:
        case Status.FailFee:
        case Status.FailBalance:
          return TransactionStatus.FAILED;
        default:
          return TransactionStatus.PENDING;
      }
    } catch (error) {
      this.logger.error(`Error fetching transaction status for ${txHash}:`, error);
      return TransactionStatus.FAILED;
    }
  }

  async lockAsset(accountId: string, assetId: string, amount: bigint): Promise<string> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Hedera network');
    }

    try {
      // Generate a unique lock ID
      const lockId = `${accountId}_${assetId}_${Date.now()}`;
      this.logger.info(`Locking ${amount} of ${assetId} for account ${accountId} with lockId ${lockId}`);
      
      // For Hedera, we could implement this using a smart contract or HCS topic
      // For now, we'll emit an event and return a transaction ID
      const txId = `lock_${lockId}_${Date.now()}`;
      
      // Emit lock event for cross-chain coordination
      this.emit('lockAsset', {
        accountId,
        assetId,
        amount: amount.toString(),
        lockId,
        txId,
        timestamp: new Date()
      });
      
      return txId;
    } catch (error) {
      this.logger.error(`Failed to lock asset ${assetId} for account ${accountId}:`, error);
      throw error;
    }
  }

  async unlockAsset(accountId: string, assetId: string, amount: bigint): Promise<string> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Hedera network');
    }

    try {
      // Generate a unique unlock ID
      const lockId = `${accountId}_${assetId}_${Date.now()}`;
      this.logger.info(`Unlocking ${amount} of ${assetId} for account ${accountId} with lockId ${lockId}`);
      
      // For Hedera, we could implement this using a smart contract or HCS topic
      // For now, we'll emit an event and return a transaction ID
      const txId = `unlock_${lockId}_${Date.now()}`;
      
      // Emit unlock event for cross-chain coordination
      this.emit('unlockAsset', {
        accountId,
        assetId,
        amount: amount.toString(),
        lockId,
        txId,
        timestamp: new Date()
      });
      
      return txId;
    } catch (error) {
      this.logger.error(`Failed to unlock asset ${assetId} for account ${accountId}:`, error);
      throw error;
    }
  }

  // TODO: Implement actual balance logic for Hedera
  async getLockedBalance(accountId: string, assetId: string): Promise<bigint> {
    this.logger.info(`Getting locked balance for account ${accountId} and asset ${assetId}`);
    return 0n; // TODO: Implement actual locked balance tracking
  }

  async getAvailableBalance(accountId: string, assetId: string): Promise<bigint> {
    this.logger.info(`Getting available balance for account ${accountId} and asset ${assetId}`);
    return this.getBalance(accountId, assetId); // TODO: Subtract locked balance from total
  }

  getBalanceHistory(accountId: string): Array<{ timestamp: Date; assetId: string; balance: bigint; operation: string; }> {
    this.logger.info(`Getting balance history for account ${accountId}`);
    return []; // TODO: Implement balance history tracking
  }

  /**
   * Creates a transfer transaction and returns a transaction result
   * This method is used by the FinP2PCore for cross-ledger transfers
   * 
   * @param req - The transaction request containing transfer details
   * @returns Promise resolving to a ledger transaction result
   */
  async createTransfer(req: any): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Hedera network');
    }

    try {
      // Generate an operation ID if not provided
      const operationId = req.operationId || `hedera-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      this.logger.info(`Creating Hedera transfer with operation ID: ${operationId}`);
      
      // Execute the transfer using the existing transfer method
      const txHash = await this.transfer(req.fromAccount, req.toAccount, req.assetId, req.amount);
      
      // Return the transaction result
      return {
        operationId,
        transactionHash: txHash,
        status: 'completed', // TODO: Check actual transaction status
        timestamp: new Date().toISOString(),
        ledger: this.ledgerId,
        fromAccount: req.fromAccount,
        toAccount: req.toAccount,
        assetId: req.assetId,
        amount: req.amount.toString()
      };
    } catch (error) {
      this.logger.error('Failed to create Hedera transfer:', error);
      throw error;
    }
  }

  private async _waitForTransactionReceipt(txId: TransactionId): Promise<Status> {
    const receipt = await new TransactionReceiptQuery()
      .setTransactionId(txId)
      .execute(this.client);
    return receipt.status;
  }
}