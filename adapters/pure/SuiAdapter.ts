import { EventEmitter } from 'events';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { Logger } from 'winston';

export interface SuiConfig {
  network: 'mainnet' | 'testnet' | 'devnet';
  rpcUrl?: string;
  enableTransactionMonitoring?: boolean;
  transactionTimeoutMs?: number;
}

export interface SuiTransactionRequest {
  from: string; // Native Sui address (0x...)
  to: string; // Native Sui address (0x...)
  amount: string; // Amount in MIST
  gasBudget?: number;
}

export interface SuiTransactionResponse {
  digest: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: string;
  gasUsed?: string;
  balanceChanges?: any[];
  effects?: any;
  events?: any[];
}

export interface SuiBalanceResponse {
  balance: string; // Balance in MIST
  address: string;
}

export interface SuiAccountInfo {
  address: string;
  publicKey: string;
  balance: string;
  objects: any[];
}

export class SuiAdapter extends EventEmitter {
  private config: SuiConfig;
  private logger: Logger;
  private client: SuiClient;
  private connected: boolean = false;
  private transactionMonitoring: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: SuiConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
    
    // Initialize Sui client
    const rpcUrl = config.rpcUrl || getFullnodeUrl(config.network);
    this.client = new SuiClient({ url: rpcUrl });
  }

  async connect(): Promise<void> {
    try {
      this.logger.info('🔌 Connecting Sui Adapter...');
      
      // Test connection by getting chain identifier
      const chainId = await this.client.getChainIdentifier();
      this.logger.info(`✅ Connected to Sui ${this.config.network} (Chain ID: ${chainId})`);
      
      this.connected = true;
      this.logger.info('✅ Sui Adapter connected');
    } catch (error) {
      this.logger.error('❌ Failed to connect Sui Adapter:', error);
      throw error;
    }
  }

  // Core Sui Operations

  async getBalance(address: string): Promise<SuiBalanceResponse> {
    try {
      this.logger.debug('💰 Getting Sui balance', { address: this.truncateAddress(address) });

      const validatedAddress = this.validateSuiAddress(address);
      const balance = await this.client.getBalance({
        owner: validatedAddress,
        coinType: '0x2::sui::SUI'
      });

      return {
        balance: balance.totalBalance,
        address: validatedAddress
      };
    } catch (error) {
      this.logger.error('❌ Failed to get Sui balance:', error);
      throw error;
    }
  }

  async getAccountInfo(address: string): Promise<SuiAccountInfo> {
    try {
      this.logger.debug('👤 Getting Sui account info', { address: this.truncateAddress(address) });

      const validatedAddress = this.validateSuiAddress(address);
      
      // Get balance
      const balance = await this.client.getBalance({
        owner: validatedAddress,
        coinType: '0x2::sui::SUI'
      });

      // Get owned objects
      const objects = await this.client.getOwnedObjects({
        owner: validatedAddress,
        options: { showContent: true }
      });

      return {
        address: validatedAddress,
        publicKey: '', // Sui doesn't expose public key in this way
        balance: balance.totalBalance,
        objects: objects.data
      };
    } catch (error) {
      this.logger.error('❌ Failed to get Sui account info:', error);
      throw error;
    }
  }

  async createTransferTransaction(request: SuiTransactionRequest): Promise<any> {
    try {
      this.logger.debug('📝 Creating Sui transfer transaction', { 
        from: this.truncateAddress(request.from),
        to: this.truncateAddress(request.to),
        amount: request.amount
      });

      const validatedFrom = this.validateSuiAddress(request.from);
      const validatedTo = this.validateSuiAddress(request.to);

      // For now, return a simple transaction object
      // In a real implementation, you'd build a proper Sui transaction
      return {
        from: validatedFrom,
        to: validatedTo,
        amount: request.amount,
        gasBudget: request.gasBudget || 1000
      };
    } catch (error) {
      this.logger.error('❌ Failed to create Sui transfer transaction:', error);
      throw error;
    }
  }

  async executeTransaction(
    transaction: any,
    keypair: Ed25519Keypair
  ): Promise<SuiTransactionResponse> {
    try {
      this.logger.debug('🚀 Executing Sui transaction');

      if (!this.client) {
        throw new Error('Sui client not initialized');
      }

      // If transaction is already a Transaction object, use it directly
      // Otherwise, build a transaction from the provided data
      let txToExecute;
      
      if (transaction && typeof transaction.splitCoins === 'function') {
        // Already a Transaction object
        txToExecute = transaction;
      } else {
        // Build transaction from data
        const { Transaction } = await import('@mysten/sui/transactions');
        txToExecute = new Transaction();
        
        if (transaction.to && transaction.amount) {
          // Simple transfer transaction
          const fromAddress = keypair.getPublicKey().toSuiAddress();
          
          // Get coins for the sender
          const coins = await this.client.getCoins({ 
            owner: fromAddress, 
            coinType: '0x2::sui::SUI' 
          });
          
          if (!coins.data || coins.data.length === 0) {
            throw new Error('No SUI coins found for sender address');
          }
          
          const sortedCoins = coins.data
            .filter(coin => BigInt(coin.balance) > 0)
            .sort((a, b) => Number(BigInt(b.balance) - BigInt(a.balance)));
          
          const [primaryCoin] = sortedCoins;
          const [splitCoin] = txToExecute.splitCoins(primaryCoin.coinObjectId, [BigInt(transaction.amount)]);
          txToExecute.transferObjects([splitCoin], transaction.to);
        } else {
          throw new Error('Invalid transaction format - expected transaction object or {to, amount} data');
        }
      }
      
      this.logger.info('📝 Executing Sui transaction...');
      const result = await this.client.signAndExecuteTransaction({
        transaction: txToExecute,
        signer: keypair,
        options: { 
          showBalanceChanges: true, 
          showEffects: true,
          showEvents: true 
        }
      });
      
      this.logger.info('✅ Sui transaction executed successfully', {
        digest: result.digest,
        status: result.effects?.status?.status || 'success'
      });

      // Start monitoring if enabled
      if (this.config.enableTransactionMonitoring) {
        this.startTransactionMonitoring(result.digest);
      }

      return {
        digest: result.digest,
        status: (result.effects?.status?.status === 'failure' ? 'failed' : result.effects?.status?.status) || 'success',
        gasUsed: result.effects?.gasUsed?.computationCost?.toString() || '0',
        balanceChanges: result.balanceChanges || [],
        timestamp: new Date().toISOString(),
        effects: result.effects,
        events: result.events || undefined
      };
    } catch (error) {
      this.logger.error('❌ Failed to execute Sui transaction:', error);
      throw error;
    }
  }

  async getTransaction(digest: string): Promise<any> {
    try {
      this.logger.debug('📄 Getting Sui transaction', { digest: this.truncateDigest(digest) });

      const tx = await this.client.getTransactionBlock({
        digest: digest,
        options: {
          showEffects: true,
          showInput: true,
          showEvents: true,
          showObjectChanges: true
        }
      });

      if (!tx) {
        throw new Error(`Transaction not found: ${digest}`);
      }

      return tx;
    } catch (error) {
      this.logger.error('❌ Failed to get Sui transaction:', error);
      throw error;
    }
  }

  async getLatestCheckpoint(): Promise<any> {
    try {
      this.logger.debug('📦 Getting latest Sui checkpoint');

      const checkpoint = await this.client.getCheckpoint({ id: 'latest' });
      return checkpoint;
    } catch (error) {
      this.logger.error('❌ Failed to get latest Sui checkpoint:', error);
      throw error;
    }
  }

  async getCheckpoint(checkpointId: string): Promise<any> {
    try {
      this.logger.debug('📦 Getting Sui checkpoint', { checkpointId });

      const checkpoint = await this.client.getCheckpoint({
        id: checkpointId
      });

      if (!checkpoint) {
        throw new Error(`Checkpoint not found: ${checkpointId}`);
      }

      return checkpoint;
    } catch (error) {
      this.logger.error('❌ Failed to get Sui checkpoint:', error);
      throw error;
    }
  }

  // Helper methods

  private validateSuiAddress(address: string): string {
    if (!/^0x[a-fA-F0-9]{64}$/.test(address)) {
      throw new Error(`Invalid Sui address format: ${address}`);
    }
    return address;
  }

  private truncateAddress(address: string): string {
    return address.length > 10 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
  }

  private truncateDigest(digest: string): string {
    return digest.length > 10 ? `${digest.slice(0, 6)}...${digest.slice(-4)}` : digest;
  }

  private startTransactionMonitoring(digest: string): void {
    const timeout = this.config.transactionTimeoutMs || 300000; // 5 minutes default
    
    const monitorTimeout = setTimeout(async () => {
      try {
        const tx = await this.getTransaction(digest);
        
        if (tx) {
          const status: SuiTransactionResponse = {
            digest: digest,
            status: tx.effects?.status?.status === 'success' ? 'success' : 'failed',
            timestamp: new Date().toISOString()
          };
          
          this.emit('transactionStatus', status);
          this.transactionMonitoring.delete(digest);
        }
      } catch (error) {
        this.logger.error('❌ Sui transaction monitoring error:', error);
      }
    }, timeout);

    this.transactionMonitoring.set(digest, monitorTimeout);
  }

  // Utility methods

  public isConnected(): boolean {
    return this.connected;
  }

  public getNetwork(): string {
    return this.config.network;
  }

  public getClient(): SuiClient {
    return this.client;
  }

  public async disconnect(): Promise<void> {
    try {
      this.logger.info('🔌 Disconnecting Sui Adapter...');
      
      // Clear transaction monitoring
      for (const [digest, timeout] of this.transactionMonitoring) {
        clearTimeout(timeout);
      }
      this.transactionMonitoring.clear();
      
      this.connected = false;
      this.logger.info('✅ Sui Adapter disconnected');
    } catch (error) {
      this.logger.error('❌ Error disconnecting Sui Adapter:', error);
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
      network: `Sui ${this.config.network}`,
      hasCredentials: true,
      finp2pIntegration: false, // No FinP2P integration
      endpoint: this.config.rpcUrl || getFullnodeUrl(this.config.network),
      supportedNetworks: [this.config.network]
    };
  }
} 