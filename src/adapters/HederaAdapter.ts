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
  Hbar,
  Status,
  TransactionId,
  AccountCreateTransaction,
  TokenSupplyType,
  TokenType,
  TokenFreezeTransaction,
  TokenUnfreezeTransaction
} from '@hashgraph/sdk';
import { Logger } from 'winston';
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
  network: 'mainnet' | 'testnet' | 'previewnet';
  operatorId: string;
  operatorKey: string;
  treasuryId?: string;
  treasuryKey?: string;
}

export class HederaAdapter implements LedgerAdapter {
  public readonly ledgerId: string = 'hedera';
  public readonly name: string = 'Hedera Hashgraph';
  public readonly type: LedgerType = LedgerType.HEDERA;

  private client!: Client;
  private operatorId: AccountId;
  private operatorKey: PrivateKey;
  private treasuryId: AccountId;
  private treasuryKey: PrivateKey;
  private config: HederaAdapterConfig;
  private logger: Logger;
  private connected: boolean = false;

  // Cache for created tokens and accounts
  private tokenCache: Map<string, TokenId> = new Map();
  private accountCache: Map<string, AccountId> = new Map();

  constructor(config: HederaAdapterConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    
    // Initialize operator credentials
    this.operatorId = AccountId.fromString(config.operatorId);
    this.operatorKey = PrivateKey.fromString(config.operatorKey);
    
    // Initialize treasury (defaults to operator if not provided)
    this.treasuryId = config.treasuryId 
      ? AccountId.fromString(config.treasuryId) 
      : this.operatorId;
    this.treasuryKey = config.treasuryKey 
      ? PrivateKey.fromString(config.treasuryKey) 
      : this.operatorKey;
  }

  async connect(): Promise<void> {
    try {
      // Initialize Hedera client based on network
      switch (this.config.network) {
        case 'mainnet':
          this.client = Client.forMainnet();
          break;
        case 'testnet':
          this.client = Client.forTestnet();
          break;
        case 'previewnet':
          this.client = Client.forPreviewnet();
          break;
        default:
          throw new Error(`Unsupported network: ${this.config.network}`);
      }

      // Set operator
      this.client.setOperator(this.operatorId, this.operatorKey);
      
      // Test connection by querying operator balance
      const balance = await new AccountBalanceQuery()
        .setAccountId(this.operatorId)
        .execute(this.client);
      
      this.logger.info(`Connected to Hedera ${this.config.network}`);
      this.logger.info(`Operator balance: ${balance.hbars.toString()}`);
      
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

  async createAsset(assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset> {
    if (!this.connected) {
      throw new Error('Not connected to Hedera network');
    }

    try {
      // Create token on Hedera
      const tokenCreateTx = new TokenCreateTransaction()
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
      const tokenCreateSign = await tokenCreateTx.sign(this.treasuryKey);
      const tokenCreateSubmit = await tokenCreateSign.execute(this.client);
      const tokenCreateReceipt = await tokenCreateSubmit.getReceipt(this.client);
      
      if (tokenCreateReceipt.status !== Status.Success) {
        throw new Error(`Token creation failed: ${tokenCreateReceipt.status}`);
      }

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

  async getAsset(assetId: string): Promise<Asset | null> {
    if (!this.connected) {
      throw new Error('Not connected to Hedera network');
    }

    try {
      // For Hedera, we would need to query token info
      // This is a simplified implementation
      const tokenId = TokenId.fromString(assetId);
      
      // In a real implementation, you would query token info from Hedera
      // For now, return a mock asset if token exists in cache
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
    if (!this.connected) {
      throw new Error('Not connected to Hedera network');
    }

    try {
      // Create new Hedera account
      const newAccountPrivateKey = PrivateKey.generateED25519();
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
    if (!this.connected) {
      throw new Error('Not connected to Hedera network');
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
    if (!this.connected) {
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
    if (!this.connected) {
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

  async lockAsset(accountId: string, assetId: string, amount: bigint): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected to Hedera network');
    }

    try {
      // For Hedera, we can use token freeze functionality
      const hederaAccountId = AccountId.fromString(accountId);
      const tokenId = TokenId.fromString(assetId);
      
      const freezeTx = new TokenFreezeTransaction()
        .setAccountId(hederaAccountId)
        .setTokenId(tokenId)
        .freezeWith(this.client);

      const freezeSign = await freezeTx.sign(this.treasuryKey);
      const freezeSubmit = await freezeSign.execute(this.client);
      const freezeReceipt = await freezeSubmit.getReceipt(this.client);
      
      if (freezeReceipt.status !== Status.Success) {
        throw new Error(`Asset lock failed: ${freezeReceipt.status}`);
      }

      return freezeSubmit.transactionId.toString();
    } catch (error) {
      this.logger.error('Failed to lock asset on Hedera:', error);
      throw error;
    }
  }

  async unlockAsset(accountId: string, assetId: string, amount: bigint): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected to Hedera network');
    }

    try {
      const hederaAccountId = AccountId.fromString(accountId);
      const tokenId = TokenId.fromString(assetId);
      
      const unfreezeTx = new TokenUnfreezeTransaction()
        .setAccountId(hederaAccountId)
        .setTokenId(tokenId)
        .freezeWith(this.client);

      const unfreezeSign = await unfreezeTx.sign(this.treasuryKey);
      const unfreezeSubmit = await unfreezeSign.execute(this.client);
      const unfreezeReceipt = await unfreezeSubmit.getReceipt(this.client);
      
      if (unfreezeReceipt.status !== Status.Success) {
        throw new Error(`Asset unlock failed: ${unfreezeReceipt.status}`);
      }

      return unfreezeSubmit.transactionId.toString();
    } catch (error) {
      this.logger.error('Failed to unlock asset on Hedera:', error);
      throw error;
    }
  }

  async getTransaction(txHash: string): Promise<Transaction | null> {
    if (!this.connected) {
      throw new Error('Not connected to Hedera network');
    }

    try {
      // Parse transaction ID from hash
      const transactionId = TransactionId.fromString(txHash);
      
      // Query transaction receipt
      const receipt = await new TransactionReceiptQuery()
        .setTransactionId(transactionId)
        .execute(this.client);

      const transaction: Transaction = {
        hash: txHash,
        ledgerId: this.ledgerId,
        from: '', // Would need to parse from transaction record
        to: '', // Would need to parse from transaction record
        assetId: '', // Would need to parse from transaction record
        amount: BigInt(0), // Would need to parse from transaction record
        status: receipt.status === Status.Success 
          ? TransactionStatus.CONFIRMED 
          : TransactionStatus.FAILED,
        timestamp: new Date(), // Would need to get from transaction record
        gasUsed: BigInt(0) // Hedera uses fixed fees
      };

      return transaction;
    } catch (error) {
      this.logger.error(`Failed to get transaction ${txHash}:`, error);
      return null;
    }
  }

  async getLockedBalance(accountId: string, assetId: string): Promise<bigint> {
    // Hedera doesn't have a native locked balance concept
    // For demo purposes, we'll return 0
    return BigInt(0);
  }

  async getAvailableBalance(accountId: string, assetId: string): Promise<bigint> {
    // For Hedera, available balance is same as total balance since we don't track locked balances
    return this.getBalance(accountId, assetId);
  }

  async getTransactionStatus(txHash: string): Promise<TransactionStatus> {
    const transaction = await this.getTransaction(txHash);
    return transaction?.status || TransactionStatus.PENDING;
  }

  // Hedera-specific utility methods
  public getOperatorId(): string {
    return this.operatorId.toString();
  }

  public getTreasuryId(): string {
    return this.treasuryId.toString();
  }

  public async getOperatorBalance(): Promise<bigint> {
    const balance = await new AccountBalanceQuery()
      .setAccountId(this.operatorId)
      .execute(this.client);
    return BigInt(balance.hbars.toTinybars().toString());
  }

  public async associateToken(accountId: string, tokenId: string, accountKey: PrivateKey): Promise<string> {
    const hederaAccountId = AccountId.fromString(accountId);
    const hederaTokenId = TokenId.fromString(tokenId);
    
    const associateTx = new TokenAssociateTransaction()
      .setAccountId(hederaAccountId)
      .setTokenIds([hederaTokenId])
      .freezeWith(this.client);

    const associateSign = await associateTx.sign(accountKey);
    const associateSubmit = await associateSign.execute(this.client);
    const associateReceipt = await associateSubmit.getReceipt(this.client);
    
    if (associateReceipt.status !== Status.Success) {
      throw new Error(`Token association failed: ${associateReceipt.status}`);
    }

    return associateSubmit.transactionId.toString();
  }
}