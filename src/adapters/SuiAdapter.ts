import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction as SuiTransaction } from '@mysten/sui/transactions';
import { fromB64, toB64 } from '@mysten/sui/utils';
import { getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet';
import { bcs } from '@mysten/bcs';
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

export interface SuiAdapterConfig {
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  privateKey?: string;
  rpcUrl?: string;
  packageId?: string; // For deployed FinP2P package
}

export class SuiAdapter extends EventEmitter implements LedgerAdapter {
  public readonly ledgerId: string = 'sui';
  public readonly name: string = 'Sui Network';
  public readonly type: LedgerType = LedgerType.SUI;

  private client: SuiClient;
  private keypair: Ed25519Keypair;
  private config: SuiAdapterConfig;
  private logger: Logger;
  private connected: boolean = false;
  private packageId: string;
  private address: string = '';

  // Move module names for FinP2P contracts
  private readonly ASSET_MODULE = 'finp2p_asset';
  private readonly ACCOUNT_MODULE = 'finp2p_account';
  private readonly TRANSFER_MODULE = 'finp2p_transfer';

  constructor(config: SuiAdapterConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;

    const rpcUrl = process.env.SUI_RPC_URL || config.rpcUrl || getFullnodeUrl(config.network);
    this.client = new SuiClient({ url: rpcUrl });

    const privateKey = process.env.SUI_PRIVATE_KEY || config.privateKey;
    if (privateKey) {
      try {
        // Handle both bech32 format (suiprivkey1...) and base64 format
        if (privateKey.startsWith('suiprivkey1')) {
          this.keypair = Ed25519Keypair.fromSecretKey(privateKey);
        } else {
          // Assume base64 format
          this.keypair = Ed25519Keypair.fromSecretKey(fromB64(privateKey));
        }
      } catch (error) {
        this.logger.error('Failed to parse private key:', error);
        this.keypair = new Ed25519Keypair();
        this.logger.warn('Generated new keypair due to invalid private key');
      }
    } else {
      this.keypair = new Ed25519Keypair();
      this.logger.warn('No SUI_PRIVATE_KEY provided, generated new keypair');
    }

    this.packageId = process.env.SUI_PACKAGE_ID || config.packageId || '';
  }

  async connect(): Promise<void> {
    try {
      const chainId = await this.client.getChainIdentifier();
      this.logger.info(`Connected to Sui testnet: ${chainId}`);
      this.address = this.keypair.getPublicKey().toSuiAddress();
      this.logger.info(`Sui adapter address: ${this.address}`);
      if (!this.packageId) {
        this.logger.warn('No SUI_PACKAGE_ID provided, some functions may not work');
      }
      this.connected = true;
    } catch (error) {
      this.logger.error('Failed to connect to Sui testnet:', error);
      throw new Error('Failed to connect to Sui testnet');
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
    if (!this.packageId) throw new Error('Sui package ID not configured');
    if (!this.connected) throw new Error('Not connected to Sui network');

    try {
      // Prepare transaction
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

  async transfer(from: string, to: string, assetId: string, amount: bigint): Promise<string> {
    if (!this.connected) throw new Error('Not connected to Sui network');

    const tx = new SuiTransaction();
    tx.moveCall({
      target: `${this.packageId}::${this.TRANSFER_MODULE}::transfer_asset`,
      arguments: [
        tx.object(from),
        tx.object(to),
        tx.object(assetId),
        tx.pure(bcs.u64().serialize(amount))
      ]
    });

    const result = await this.executeTransaction(tx);
    return result.digest;
  }

  async lockAsset(accountId: string, assetId: string, amount: bigint): Promise<string> {
    if (!this.packageId) throw new Error('Sui package ID not configured');
    if (!this.connected) throw new Error('Not connected to Sui network');

    const tx = new SuiTransaction();
    tx.moveCall({
      target: `${this.packageId}::${this.TRANSFER_MODULE}::lock_asset`,
      arguments: [
        tx.object(accountId),
        tx.object(assetId),
        tx.pure(bcs.u64().serialize(amount))
      ]
    });

    const result = await this.executeTransaction(tx);

    this.emit('AssetLocked', {
      accountId,
      assetId,
      amount: amount.toString(),
      transactionId: result.digest
    });

    return result.digest;
  }



  async subscribeToEvents(filter: any): Promise<void> {
    if (!this.connected) throw new Error('Not connected to Sui network');

    this.client.subscribeEvent({
      filter,
      onMessage: (event) => {
        this.emit('event', event);
      }
    });
  }

  private async executeTransaction(tx: SuiTransaction, retries = 3): Promise<any> {
    for (let i = 0; i < retries; i++) {
      try {
        const result = await this.client.signAndExecuteTransaction({
          signer: this.keypair,
          transaction: tx,
          options: { showEffects: true }
        });

        if (result.effects?.status?.status !== 'success') {
          throw new Error(`Transaction failed: ${result.effects?.status?.error}`);
        }
        return result;
      } catch (error) {
        this.logger.error(`Transaction attempt ${i + 1} failed:`, error);
        if (i === retries - 1) throw error;
      }
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

  async getTransaction(transactionId: string): Promise<Transaction | null> {
    if (!this.connected) throw new Error('Not connected to Sui network');

    try {
      const tx = await this.client.getTransactionBlock({
        digest: transactionId,
        options: {
          showEffects: true,
          showInput: true,
        },
      });

      if (!tx) return null;

      const status = tx.effects?.status.status === 'success' ? TransactionStatus.CONFIRMED : TransactionStatus.FAILED;

      return {
        hash: tx.digest,
        status,
        ledgerId: this.ledgerId,
        assetId: '', // You might need to extract this from the transaction
        from: '', // You might need to extract this from the transaction
        to: '', // You might need to extract this from the transaction
        amount: BigInt(0), // You might need to extract this from the transaction
        timestamp: new Date(parseInt(tx.timestampMs || '0'))
      };
    } catch (error) {
      this.logger.error(`Failed to get transaction ${transactionId} from Sui:`, error);
      return null;
    }
  }

  async createAccount(institutionId: string): Promise<Account>;
  async createAccount(accountData: { address?: string; institutionId: string; metadata?: any }): Promise<Account>;
  async createAccount(institutionIdOrData: string | { address?: string; institutionId: string; metadata?: any }): Promise<Account> {
    if (!this.connected) {
      throw new Error('Not connected to Sui network');
    }

    try {
      // Handle both parameter types
      let accountData: { address?: string; institutionId: string; metadata?: any };
      if (typeof institutionIdOrData === 'string') {
        accountData = { institutionId: institutionIdOrData };
      } else {
        accountData = institutionIdOrData;
      }
      let accountObjectId: string;
      let address: string;
      
      if (accountData.address) {
        // Use existing address
        address = accountData.address;
        accountObjectId = address; // For Sui, we can use the address as the account ID
        this.logger.info(`Using existing account: ${address}`);
      } else {
        // Create new account using Move contract (if package is available)
        if (!this.packageId) {
          // Fallback: create a simple account object using current keypair
          address = this.address || this.keypair.getPublicKey().toSuiAddress();
          accountObjectId = address;
          this.logger.info(`Created simple account using current keypair: ${address}`);
        } else {
          const tx = new SuiTransaction();
          
          // Call Move function to create account
          tx.moveCall({
            target: `${this.packageId}::${this.ACCOUNT_MODULE}::create_account`,
            arguments: [
              tx.pure(bcs.string().serialize(accountData.institutionId))
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

          accountObjectId = (createdObjects[0] as any).objectId;
          address = this.keypair.getPublicKey().toSuiAddress();
        }
      }

      // Query current SUI balance
      const balances = new Map<string, bigint>();
      try {
        const suiBalance = await this.getGasBalance();
        balances.set('SUI', BigInt(suiBalance));
      } catch (balanceError) {
        this.logger.warn(`Could not query SUI balance for account ${address}:`, balanceError);
      }

      const account: Account = {
        finId: {
          id: accountObjectId,
          type: 'account',
          domain: 'sui.network'
        },
        address,
        ledgerId: this.ledgerId,
        institutionId: accountData.institutionId,
        balances,
        metadata: accountData.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.logger.info(`Account ready for institution ${accountData.institutionId}: ${accountObjectId}`);
      return account;
    } catch (error) {
      this.logger.error('Failed to create/setup account on Sui:', error);
      throw new Error(`Sui account creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async importAccount(privateKey: string): Promise<Account> {
    if (!this.connected) {
      throw new Error('Not connected to Sui network');
    }

    try {
      // Create keypair from private key
      const keypair = Ed25519Keypair.fromSecretKey(fromB64(privateKey));
      const address = keypair.getPublicKey().toSuiAddress();

      // Create account object with imported keypair
      const account: Account = {
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
    } catch (error) {
      this.logger.error('Failed to import account on Sui:', error);
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

  async prepareTransfer(from: string, to: string, assetId: string, amount: bigint): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected to Sui network');
    }

    try {
      const tx = new SuiTransaction();
      const finalAssetId = assetId; // Assuming assetId is the object ID

      tx.moveCall({
        target: `${this.packageId}::${this.TRANSFER_MODULE}::transfer`,
        arguments: [
          tx.object(from),
          tx.object(to),
          tx.object(finalAssetId),
          tx.pure(bcs.u64().serialize(amount))
        ]
      });

      return {
        transaction: tx,
        from,
        to,
        assetId: finalAssetId,
        amount
      };
    } catch (error) {
      this.logger.error('Failed to prepare transfer:', error);
      throw error;
    }
  }

  async executeTransfer(preparedTx: any): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected to Sui network');
    }

    try {
      const result = await this.executeTransaction(preparedTx.transaction);
      return result.digest;
    } catch (error) {
      this.logger.error('Failed to execute transfer:', error);
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
        throw new Error(`Asset unlock failed: ${result.effects?.status?.error}`);
      }

      return result.digest;
    } catch (error) {
      this.logger.error('Failed to unlock asset on Sui:', error);
      throw error;
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

  // Balance history operations
  getBalanceHistory(accountId: string): Array<{ timestamp: Date; assetId: string; balance: bigint; operation: string }> {
    // TODO: Implement balance history tracking for Sui
    // For now, return empty array as this feature requires additional infrastructure
    this.logger.warn(`Balance history not yet implemented for Sui adapter. AccountId: ${accountId}`);
    return [];
  }

  getLedgerType(): LedgerType {
    return LedgerType.SUI;
  }

}