import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction as SuiTransaction } from '@mysten/sui/transactions';
import { fromB64, toB64 } from '@mysten/sui/utils';
import { getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet';
import { bcs } from '@mysten/bcs';
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

export interface SuiAdapterConfig {
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  privateKey?: string;
  rpcUrl?: string;
  packageId?: string; // For deployed FinP2P package
}

export class SuiAdapter implements LedgerAdapter {
  public readonly ledgerId: string = 'sui';
  public readonly name: string = 'Sui Network';
  public readonly type: LedgerType = LedgerType.SUI;

  private client: SuiClient;
  private keypair: Ed25519Keypair;
  private config: SuiAdapterConfig;
  private logger: Logger;
  private connected: boolean = false;
  private packageId: string;

  // Move module names for FinP2P contracts
  private readonly ASSET_MODULE = 'finp2p_asset';
  private readonly ACCOUNT_MODULE = 'finp2p_account';
  private readonly TRANSFER_MODULE = 'finp2p_transfer';

  constructor(config: SuiAdapterConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    
    // Initialize Sui client
    const rpcUrl = config.rpcUrl || getFullnodeUrl(config.network);
    this.client = new SuiClient({ url: rpcUrl });
    
    // Initialize keypair
    if (config.privateKey) {
      this.keypair = Ed25519Keypair.fromSecretKey(fromB64(config.privateKey));
    } else {
      this.keypair = new Ed25519Keypair();
      this.logger.warn('No private key provided, generated new keypair');
    }
    
    this.packageId = config.packageId || '';
  }

  async connect(): Promise<void> {
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
    } catch (error) {
      this.logger.error('Failed to connect to Sui network:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.logger.info('Disconnected from Sui network');
  }

  isConnected(): boolean {
    return this.connected;
  }

  async createAsset(assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset> {
    if (!this.connected) {
      throw new Error('Not connected to Sui network');
    }

    try {
      const tx = new SuiTransaction();
      
      // Call Move function to create asset
      tx.moveCall({
        target: `${this.packageId}::${this.ASSET_MODULE}::create_asset`,
        arguments: [
          tx.pure(bcs.string().serialize(assetData.symbol)),
          tx.pure(bcs.string().serialize(assetData.name)),
          tx.pure(bcs.u8().serialize(assetData.decimals)),
          tx.pure(bcs.u64().serialize(assetData.totalSupply)),
          tx.pure(bcs.string().serialize(JSON.stringify(assetData.metadata)))
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
      const createdObjects = result.objectChanges?.filter(
        (change: any) => change.type === 'created'
      );
      
      if (!createdObjects || createdObjects.length === 0) {
        throw new Error('No asset object created');
      }

      const assetObjectId = (createdObjects[0] as any).objectId;

      const asset: Asset = {
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
    } catch (error) {
      this.logger.error('Failed to create asset on Sui:', error);
      throw error;
    }
  }

  async getAsset(assetId: string): Promise<Asset | null> {
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

      const content = object.data.content as any;
      if (!content || content.dataType !== 'moveObject') {
        return null;
      }

      const fields = content.fields;
      const asset: Asset = {
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
    } catch (error) {
      this.logger.error(`Failed to get asset ${assetId}:`, error);
      return null;
    }
  }

  async createAccount(institutionId: string): Promise<Account> {
    if (!this.connected) {
      throw new Error('Not connected to Sui network');
    }

    try {
      const tx = new SuiTransaction();
      
      // Call Move function to create account
      tx.moveCall({
        target: `${this.packageId}::${this.ACCOUNT_MODULE}::create_account`,
        arguments: [
          tx.pure(bcs.string().serialize(institutionId))
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

      const createdObjects = result.objectChanges?.filter(
        (change: any) => change.type === 'created'
      );
      
      if (!createdObjects || createdObjects.length === 0) {
        throw new Error('No account object created');
      }

      const accountObjectId = (createdObjects[0] as any).objectId;
      const address = this.keypair.getPublicKey().toSuiAddress();

      const account: Account = {
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
    } catch (error) {
      this.logger.error('Failed to create account on Sui:', error);
      throw error;
    }
  }

  async getAccount(accountId: string): Promise<Account | null> {
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

      const content = object.data.content as any;
      const fields = content.fields;

      const account: Account = {
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
    } catch (error) {
      this.logger.error(`Failed to get account ${accountId}:`, error);
      return null;
    }
  }

  async getBalance(accountId: string, assetId: string): Promise<bigint> {
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
    } catch (error) {
      this.logger.error(`Failed to get balance for account ${accountId}, asset ${assetId}:`, error);
      throw error;
    }
  }

  async transfer(from: string, to: string, assetId: string, amount: bigint): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected to Sui network');
    }

    try {
      const tx = new SuiTransaction();
      
      // Call Move function to transfer asset
      tx.moveCall({
        target: `${this.packageId}::${this.TRANSFER_MODULE}::transfer`,
        arguments: [
          tx.object(from),
          tx.object(to),
          tx.object(assetId),
          tx.pure(bcs.u64().serialize(amount))
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
        throw new Error(`Transfer failed: ${result.effects?.status?.error}`);
      }

      const txHash = result.digest;
      this.logger.info(`Transfer completed: ${txHash}`);
      return txHash;
    } catch (error) {
      this.logger.error('Failed to execute transfer on Sui:', error);
      throw error;
    }
  }

  async lockAsset(accountId: string, assetId: string, amount: bigint): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected to Sui network');
    }

    try {
      const tx = new SuiTransaction();
      
      tx.moveCall({
        target: `${this.packageId}::${this.TRANSFER_MODULE}::lock_asset`,
        arguments: [
          tx.object(accountId),
          tx.object(assetId),
          tx.pure(bcs.u64().serialize(amount))
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
    } catch (error) {
      this.logger.error('Failed to lock asset on Sui:', error);
      throw error;
    }
  }

  async unlockAsset(accountId: string, assetId: string, amount: bigint): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected to Sui network');
    }

    try {
      const tx = new SuiTransaction();
      
      tx.moveCall({
        target: `${this.packageId}::${this.TRANSFER_MODULE}::unlock_asset`,
        arguments: [
          tx.object(accountId),
          tx.object(assetId),
          tx.pure(bcs.u64().serialize(amount).toBytes())
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
    } catch (error) {
      this.logger.error('Failed to unlock asset on Sui:', error);
      throw error;
    }
  }

  async getTransaction(txHash: string): Promise<Transaction | null> {
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
      const transaction: Transaction = {
        hash: txHash,
        ledgerId: this.ledgerId,
        from: '', // Extract from transaction input
        to: '', // Extract from transaction input
        assetId: '', // Extract from transaction input
        amount: BigInt(0), // Extract from transaction input
        status: txResponse.effects?.status?.status === 'success' 
          ? TransactionStatus.CONFIRMED 
          : TransactionStatus.FAILED,
        timestamp: new Date(parseInt(txResponse.timestampMs || '0')),
        gasUsed: BigInt(txResponse.effects?.gasUsed?.computationCost || 0)
      };

      return transaction;
    } catch (error) {
      this.logger.error(`Failed to get transaction ${txHash}:`, error);
      return null;
    }
  }

  async getLockedBalance(accountId: string, assetId: string): Promise<bigint> {
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
    } catch (error) {
      this.logger.error(`Failed to get locked balance for account ${accountId}, asset ${assetId}:`, error);
      throw error;
    }
  }

  async getAvailableBalance(accountId: string, assetId: string): Promise<bigint> {
    if (!this.connected) {
      throw new Error('Not connected to Sui network');
    }

    try {
      // For Sui, available balance would be total balance minus locked balance
      const totalBalance = await this.getBalance(accountId, assetId);
      const lockedBalance = await this.getLockedBalance(accountId, assetId);
      return totalBalance - lockedBalance;
    } catch (error) {
      this.logger.error(`Failed to get available balance for account ${accountId}, asset ${assetId}:`, error);
      throw error;
    }
  }

  async getTransactionStatus(txHash: string): Promise<TransactionStatus> {
    const transaction = await this.getTransaction(txHash);
    return transaction?.status || TransactionStatus.PENDING;
  }

  // Sui-specific utility methods
  public getAddress(): string {
    return this.keypair.getPublicKey().toSuiAddress();
  }

  public async getGasBalance(): Promise<bigint> {
    const address = this.getAddress();
    const balance = await this.client.getBalance({ owner: address });
    return BigInt(balance.totalBalance);
  }

  public async requestFaucet(): Promise<void> {
    if (this.config.network === 'devnet' || this.config.network === 'testnet') {
      try {
        await requestSuiFromFaucetV2({
          host: getFaucetHost(this.config.network as 'devnet' | 'testnet'),
          recipient: this.getAddress(),
        });
        this.logger.info('Requested SUI from faucet');
      } catch (error) {
        this.logger.error('Failed to request from faucet:', error);
      }
    }
  }

  public getPrivateKeyBase64(): string {
    return this.keypair.getSecretKey();
  }
}