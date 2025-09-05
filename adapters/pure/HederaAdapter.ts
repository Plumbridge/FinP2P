import { EventEmitter } from 'events';
import {
  Client,
  AccountId,
  TransferTransaction,
  Hbar,
  TransactionReceiptQuery,
  AccountBalanceQuery,
  AccountInfoQuery,
  TransactionId,
  Status,
  PrivateKey
} from '@hashgraph/sdk';
import { Logger } from 'winston';

export interface HederaConfig {
  network: 'mainnet' | 'testnet';
  accountId: string; // Operator account ID (0.0.123456)
  privateKey: string; // Operator private key
  rpcUrl?: string;
  enableTransactionMonitoring?: boolean;
  transactionTimeoutMs?: number;
}

export interface HederaTransactionRequest {
  from: string; // Native Hedera account ID (0.0.123456)
  to: string; // Native Hedera account ID (0.0.123456)
  amount: string; // Amount in tinybars
  memo?: string;
}

export interface HederaTransactionResponse {
  transactionId: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: string;
  receipt?: any;
}

export interface HederaBalanceResponse {
  balance: string; // Balance in tinybars
  accountId: string;
}

export interface HederaAccountInfo {
  accountId: string;
  publicKey: string;
  balance: string;
  memo: string;
  isDeleted: boolean;
  autoRenewPeriod: number;
  expirationTime: Date;
}

export class HederaAdapter extends EventEmitter {
  private config: HederaConfig;
  private logger: Logger;
  private client: Client;
  private connected: boolean = false;
  private transactionMonitoring: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: HederaConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
    
    // Initialize Hedera client
    this.client = this.createClient();
  }

  private createClient(): Client {
    const accountId = AccountId.fromString(this.config.accountId);
    const privateKey = this.config.privateKey;
    
    if (this.config.network === 'mainnet') {
      return Client.forMainnet()
        .setOperator(accountId, privateKey);
    } else {
      return Client.forTestnet()
        .setOperator(accountId, privateKey);
    }
  }

  async connect(): Promise<void> {
    try {
      this.logger.info('🔌 Connecting Hedera Adapter...');
      
      // Test connection by getting account info
      const accountInfo = await this.getAccountInfo(this.config.accountId);
      this.logger.info(`✅ Connected to Hedera ${this.config.network} (Account: ${accountInfo.accountId})`);
      
      this.connected = true;
      this.logger.info('✅ Hedera Adapter connected');
    } catch (error) {
      this.logger.error('❌ Failed to connect Hedera Adapter:', error);
      throw error;
    }
  }

  // Core Hedera Operations

  async getBalance(accountId: string): Promise<HederaBalanceResponse> {
    try {
      this.logger.debug('💰 Getting Hedera balance', { accountId });

      const validatedAccountId = this.validateHederaAccountId(accountId);
      const query = new AccountBalanceQuery()
        .setAccountId(validatedAccountId);

      const balance = await query.execute(this.client);

      return {
        balance: balance.hbars.toTinybars().toString(),
        accountId: validatedAccountId.toString()
      };
    } catch (error) {
      this.logger.error('❌ Failed to get Hedera balance:', error);
      throw error;
    }
  }

  async getAccountInfo(accountId: string): Promise<HederaAccountInfo> {
    try {
      this.logger.debug('👤 Getting Hedera account info', { accountId });

      const validatedAccountId = this.validateHederaAccountId(accountId);
      const query = new AccountInfoQuery()
        .setAccountId(validatedAccountId);

      const info = await query.execute(this.client);

      return {
        accountId: info.accountId.toString(),
        publicKey: info.key.toString(),
        balance: info.balance.toTinybars().toString(),
        memo: info.accountMemo || '',
        isDeleted: info.isDeleted,
        autoRenewPeriod: info.autoRenewPeriod.seconds.toNumber(),
        expirationTime: info.expirationTime.toDate()
      };
    } catch (error) {
      this.logger.error('❌ Failed to get Hedera account info:', error);
      throw error;
    }
  }

  async createTransferTransaction(request: HederaTransactionRequest): Promise<TransferTransaction> {
    try {
      this.logger.debug('📝 Creating Hedera transfer transaction', { 
        from: request.from,
        to: request.to,
        amount: request.amount
      });

      const validatedFrom = this.validateHederaAccountId(request.from);
      const validatedTo = this.validateHederaAccountId(request.to);

      const transaction = new TransferTransaction()
        .addHbarTransfer(validatedFrom, new Hbar(-parseInt(request.amount) / 100000000)) // Convert tinybars to hbars
        .addHbarTransfer(validatedTo, new Hbar(parseInt(request.amount) / 100000000))
        .setTransactionMemo(request.memo || 'Transfer via Hedera Adapter');

      return transaction;
    } catch (error) {
      this.logger.error('❌ Failed to create Hedera transfer transaction:', error);
      throw error;
    }
  }

  async executeTransaction(transaction: TransferTransaction): Promise<HederaTransactionResponse> {
    try {
      this.logger.debug('🚀 Executing Hedera transaction');

      // Freeze and sign the transaction
      const frozenTx = await transaction.freezeWith(this.client);
      const privateKey = PrivateKey.fromString(this.config.privateKey);
      const signedTx = await frozenTx.sign(privateKey);
      
      // Submit the transaction
      const response = await signedTx.execute(this.client);

      this.logger.info('✅ Hedera transaction submitted successfully', {
        transactionId: response.transactionId.toString()
      });

      // Start monitoring if enabled
      if (this.config.enableTransactionMonitoring) {
        this.startTransactionMonitoring(response.transactionId);
      }

      return {
        transactionId: response.transactionId.toString(),
        status: 'pending',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('❌ Failed to execute Hedera transaction:', error);
      throw error;
    }
  }

  async getTransaction(transactionId: string): Promise<any> {
    try {
      this.logger.debug('📄 Getting Hedera transaction', { transactionId });

      const txId = TransactionId.fromString(transactionId);
      const receipt = await new TransactionReceiptQuery()
        .setTransactionId(txId)
        .execute(this.client);

      return {
        transactionId: transactionId,
        status: receipt.status,
        timestamp: new Date().toISOString(),
        receipt: receipt
      };
    } catch (error) {
      this.logger.error('❌ Failed to get Hedera transaction:', error);
      throw error;
    }
  }

  async getTransactionReceipt(transactionId: string): Promise<any> {
    try {
      this.logger.debug('📋 Getting Hedera transaction receipt', { transactionId });

      const txId = TransactionId.fromString(transactionId);
      const receipt = await new TransactionReceiptQuery()
        .setTransactionId(txId)
        .execute(this.client);

      return receipt;
    } catch (error) {
      this.logger.error('❌ Failed to get Hedera transaction receipt:', error);
      throw error;
    }
  }

  async getNetworkInfo(): Promise<any> {
    try {
      this.logger.debug('🌐 Getting Hedera network info');

      const network = this.config.network;
      const operatorAccount = this.config.accountId;

      return {
        network: network,
        operatorAccount: operatorAccount,
        nodeCount: network === 'mainnet' ? 30 : 4, // Approximate node counts
        mirrorNode: network === 'mainnet' ? 'https://mainnet-public.mirrornode.hedera.com' : 'https://testnet.mirrornode.hedera.com'
      };
    } catch (error) {
      this.logger.error('❌ Failed to get Hedera network info:', error);
      throw error;
    }
  }

  // Helper methods

  private validateHederaAccountId(accountId: string): AccountId {
    if (!/^\d+\.\d+\.\d+$/.test(accountId)) {
      throw new Error(`Invalid Hedera account ID format: ${accountId}`);
    }
    return AccountId.fromString(accountId);
  }

  private startTransactionMonitoring(transactionId: TransactionId): void {
    const timeout = this.config.transactionTimeoutMs || 300000; // 5 minutes default
    
    const monitorTimeout = setTimeout(async () => {
      try {
        const receipt = await this.getTransactionReceipt(transactionId.toString());
        
        if (receipt) {
          const status: HederaTransactionResponse = {
            transactionId: transactionId.toString(),
            status: receipt.status === Status.Success ? 'success' : 'failed',
            timestamp: new Date().toISOString(),
            receipt: receipt
          };
          
          this.emit('transactionStatus', status);
          this.transactionMonitoring.delete(transactionId.toString());
        }
      } catch (error) {
        this.logger.error('❌ Hedera transaction monitoring error:', error);
      }
    }, timeout);

    this.transactionMonitoring.set(transactionId.toString(), monitorTimeout);
  }

  // Utility methods

  public isConnected(): boolean {
    return this.connected;
  }

  public getNetwork(): string {
    return this.config.network;
  }

  public getClient(): Client {
    return this.client;
  }

  public getOperatorAccountId(): string {
    return this.config.accountId;
  }

  public async disconnect(): Promise<void> {
    try {
      this.logger.info('🔌 Disconnecting Hedera Adapter...');
      
      // Clear transaction monitoring
      for (const [transactionId, timeout] of this.transactionMonitoring) {
        clearTimeout(timeout);
      }
      this.transactionMonitoring.clear();
      
      this.connected = false;
      this.logger.info('✅ Hedera Adapter disconnected');
    } catch (error) {
      this.logger.error('❌ Error disconnecting Hedera Adapter:', error);
      throw error;
    }
  }

  getStatus(): {
    connected: boolean;
    network: string;
    hasCredentials: boolean;
    finp2pIntegration: boolean;
    endpoint: string;
    supportedNetworks: string[];
  } {
    return {
      connected: this.connected,
      network: `Hedera ${this.config.network}`,
      hasCredentials: true,
      finp2pIntegration: false, // No FinP2P integration
      endpoint: this.config.network === 'mainnet' ? 'Hedera Mainnet' : 'Hedera Testnet',
      supportedNetworks: [this.config.network]
    };
  }
} 