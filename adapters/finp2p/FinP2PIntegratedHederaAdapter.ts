import { EventEmitter } from 'events';
import {
  Client,
  AccountId,
  PrivateKey,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TransferTransaction,
  AccountBalanceQuery,
  TokenAssociateTransaction,
  Hbar,
  Status
} from '@hashgraph/sdk';
import { Logger } from 'winston';
import { FinP2PSDKRouter } from '../../core/router/FinP2PSDKRouter';

export interface FinP2PIntegratedHederaConfig {
  network: 'testnet' | 'mainnet' | 'previewnet';
  accountId?: string;
  privateKey?: string;
  // Support for multiple accounts (for atomic swap scenarios)
  accounts?: {
    [accountId: string]: {
      accountId: string;
      privateKey: string;
    };
  };
  finp2pRouter: FinP2PSDKRouter;
}

/**
 * Hedera Adapter Integrated with FinP2P
 * 
 * Provides Hedera blockchain integration with FinP2P identity resolution:
 * - Uses FinP2P for identity resolution (FinID -> wallet address)
 * - Performs blockchain operations on Hedera network
 * - Supports both FinID-based and direct address transfers
 * - Integrates with FinP2P atomic swap coordination
 */
export class FinP2PIntegratedHederaAdapter extends EventEmitter {
  private client: Client | null = null;
  private operatorAccountId: AccountId | null = null;
  private operatorPrivateKey: PrivateKey | null = null;
  // Store multiple accounts for atomic swap scenarios
  private accountKeys: Map<string, PrivateKey> = new Map();
  private config: FinP2PIntegratedHederaConfig;
  private logger: Logger;
  private connected: boolean = false;

  constructor(config: FinP2PIntegratedHederaConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;

    // Listen for atomic swap events from FinP2P router
    this.setupAtomicSwapListeners();

    this.logger.info('🔗 FinP2P-Integrated Hedera Adapter initialized', {
      network: config.network,
      hasCredentials: !!(config.accountId && config.privateKey),
      finp2pIntegration: 'enabled',
      atomicSwapSupport: 'enabled'
    });
  }

  async connect(): Promise<void> {
    try {
      // Load multiple accounts if configured
      if (this.config.accounts) {
        for (const [accountId, accountConfig] of Object.entries(this.config.accounts)) {
          try {
            const privateKey = PrivateKey.fromString(accountConfig.privateKey);
            this.accountKeys.set(accountConfig.accountId, privateKey);
            this.logger.info(`✅ Loaded account key for: ${accountConfig.accountId}`);
          } catch (error) {
            this.logger.warn(`⚠️ Failed to load account key for ${accountConfig.accountId}:`, (error as Error).message);
          }
        }
      }

      if (this.config.accountId && this.config.privateKey) {
        // Real Hedera network connection
        this.operatorAccountId = AccountId.fromString(this.config.accountId);
        this.operatorPrivateKey = PrivateKey.fromString(this.config.privateKey);

        // Also add the main account to the account keys map
        this.accountKeys.set(this.config.accountId, this.operatorPrivateKey);

        // Create client for specified network
        switch (this.config.network) {
          case 'testnet':
            this.client = Client.forTestnet();
            break;
          case 'mainnet':
            this.client = Client.forMainnet();
            break;
          case 'previewnet':
            this.client = Client.forPreviewnet();
            break;
          default:
            throw new Error(`Unsupported network: ${this.config.network}`);
        }

        this.client.setOperator(this.operatorAccountId, this.operatorPrivateKey);

        // Test connection
        const balance = await new AccountBalanceQuery()
          .setAccountId(this.operatorAccountId)
          .execute(this.client);

        this.connected = true;
        
        this.logger.info('✅ Connected to real Hedera network', {
          network: this.config.network,
          accountId: this.config.accountId,
          balance: balance.hbars.toString(),
          finp2pIntegration: 'active',
          totalAccounts: this.accountKeys.size
        });
      } else {
        // Mock mode
        this.connected = true;
        this.logger.info('✅ Connected to mock Hedera (no credentials provided)', {
          network: this.config.network,
          mode: 'mock',
          finp2pIntegration: 'active'
        });
      }
    } catch (error) {
      this.logger.error('❌ Failed to connect to Hedera network:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
    this.connected = false;
    this.logger.info('🔌 Disconnected from Hedera network');
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Setup listeners for atomic swap events from FinP2P router
   */
  private setupAtomicSwapListeners(): void {
    this.config.finp2pRouter.on('atomicSwapInitiated', async (swapData: any) => {
      if (swapData.initiatorAsset.chain === 'hedera' || swapData.responderAsset.chain === 'hedera') {
        this.logger.info('🔔 Received atomic swap event for Hedera:', swapData);
        await this.handleAtomicSwapEvent(swapData);
      }
    });

    this.config.finp2pRouter.on('atomicSwapLocked', async (lockData: any) => {
      if (lockData.chain === 'hedera') {
        this.logger.info('🔒 Hedera assets locked in atomic swap:', lockData);
      }
    });

    this.config.finp2pRouter.on('atomicSwapCompleted', async (completionData: any) => {
      this.logger.info('✅ Atomic swap completed:', completionData);
    });

    // Enhanced: Add rollback listeners
    this.config.finp2pRouter.on('atomicSwapExpired', async (expiredData: any) => {
      if (this.isSwapRelevantToHedera(expiredData.swap)) {
        this.logger.warn('⏰ Atomic swap expired for Hedera chain:', {
          swapId: expiredData.swapId,
          reason: expiredData.reason
        });
      }
    });

    this.config.finp2pRouter.on('atomicSwapRollback', async (rollbackData: any) => {
      if (rollbackData.assetsToUnlock?.hedera?.required) {
        this.logger.info('🔄 Received rollback request for Hedera assets:', rollbackData);
        await this.handleAtomicSwapRollback(rollbackData);
      }
    });
  }

  /**
   * Handle atomic swap events when Hedera is involved
   */
  private async handleAtomicSwapEvent(swapData: any): Promise<void> {
    try {
      // Execute Hedera operations if this chain is involved in the swap
      if (swapData.initiatorAsset.chain === 'hedera') {
        // Account 1 is trading HBAR away
        this.logger.info('🔒 Hedera initiator: Locking HBAR assets for atomic swap...');
        await this.lockHederaAssetsForSwap(swapData, swapData.initiatorFinId, swapData.initiatorAsset);
      }
      
      if (swapData.responderAsset.chain === 'hedera') {
        // Account 2 is trading HBAR away (or receiving HBAR)
        this.logger.info('🔒 Hedera responder: Locking HBAR assets for atomic swap...');
        await this.lockHederaAssetsForSwap(swapData, swapData.responderFinId, swapData.responderAsset);
      }
    } catch (error) {
      this.logger.error('❌ Failed to handle atomic swap event:', error);
    }
  }

  /**
   * Lock Hedera assets for atomic swap
   */
  private async lockHederaAssetsForSwap(swapData: any, traderFinId?: string, assetToLock?: any): Promise<void> {
    // Use provided parameters or fall back to initiator data
    const finId = traderFinId || swapData.initiatorFinId;
    const asset = assetToLock || swapData.initiatorAsset;
    if (!this.client || !this.operatorPrivateKey) {
      // Mock mode
      const mockTxId = `mock_hedera_lock_${Date.now()}`;
      this.logger.info('🔒 Mock Hedera asset lock for atomic swap:', {
        swapId: swapData.swapId,
        asset: asset,
        finId: finId,
        txId: mockTxId,
        mode: 'mock'
      });
      await this.notifyAssetsLocked(swapData.swapId, mockTxId);
      return;
    }

    try {
      this.logger.info('🔒 Locking Hedera assets for atomic swap:', {
        swapId: swapData.swapId,
        asset: asset,
        finId: finId
      });

      // In a real implementation, this would create a time-locked transaction
      // For demonstration, we'll send Account 2's HBAR to Account 1's HBAR address (cross-party transfer)
      const counterpartyFinId = finId === swapData.initiatorFinId ? swapData.responderFinId : swapData.initiatorFinId;
      const lockAddress = await this.getWalletAddressForFinId(counterpartyFinId);
      const lockAccountId = AccountId.fromString(lockAddress);
      const amount = BigInt(asset.amount);

      // Simulate asset lock (in reality, this would be a scheduled transaction)
      const lockTransaction = await new TransferTransaction()
        .addHbarTransfer(this.operatorAccountId!, Hbar.fromTinybars(-Number(amount)))
        .addHbarTransfer(lockAccountId, Hbar.fromTinybars(Number(amount)))
        .execute(this.client);

      const receipt = await lockTransaction.getReceipt(this.client);

      if (receipt.status !== Status.Success) {
        throw new Error(`Lock transaction failed with status: ${receipt.status}`);
      }

      this.logger.info('✅ Hedera assets locked for atomic swap:', {
        swapId: swapData.swapId,
        txHash: lockTransaction.transactionId?.toString(),
        note: 'In production, this would be a scheduled/time-locked transaction'
      });

      // Notify FinP2P router that assets are locked
      await this.notifyAssetsLocked(swapData.swapId, lockTransaction.transactionId?.toString() || '');

    } catch (error) {
      this.logger.error('❌ Failed to lock Hedera assets for swap:', error);
      throw error;
    }
  }

  /**
   * Notify FinP2P router that assets are locked
   */
  private async notifyAssetsLocked(swapId: string, txHash: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.finp2pRouter.getRouterInfo().endpoint}/atomic-swaps/${swapId}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain: 'hedera',
          txHash
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to notify lock: ${response.statusText}`);
      }

      this.logger.info('📡 Notified FinP2P router of Hedera asset lock:', { swapId, txHash });
    } catch (error) {
      this.logger.error('❌ Failed to notify FinP2P router of asset lock:', error);
      throw error;
    }
  }

  /**
   * Check if swap is relevant to Hedera chain
   */
  private isSwapRelevantToHedera(swap: any): boolean {
    return swap?.initiatorAsset?.chain === 'hedera' || swap?.responderAsset?.chain === 'hedera';
  }

  /**
   * Handle atomic swap rollback for Hedera assets
   */
  private async handleAtomicSwapRollback(rollbackData: any): Promise<void> {
    const { swapId, swap } = rollbackData;
    
    if (!this.client || !this.operatorPrivateKey) {
      this.logger.warn('⚠️ Cannot rollback Hedera assets - no client or signing key available');
      // In mock mode, simulate rollback completion
      this.logger.info('🔄 Mock Hedera rollback completed:', { swapId });
      await this.notifyAssetsUnlocked(swapId, `mock_hedera_unlock_${Date.now()}`);
      return;
    }

    try {
      this.logger.info('🔄 Starting Hedera asset rollback for swap:', {
        swapId,
        initiatorLocked: !!swap.initiatorAsset.lockTxHash,
        responderLocked: !!swap.responderAsset.lockTxHash
      });

      // In a real implementation, this would unlock assets from scheduled transactions
      // For demonstration, we'll simulate the unlock process
      
      let unlockTxHash: string | undefined;
      
      if (swap.initiatorAsset.chain === 'hedera' && swap.initiatorAsset.lockTxHash) {
        unlockTxHash = await this.unlockHederaAssets(swap, 'initiator');
      } else if (swap.responderAsset.chain === 'hedera' && swap.responderAsset.lockTxHash) {
        unlockTxHash = await this.unlockHederaAssets(swap, 'responder');
      }

      if (unlockTxHash) {
        this.logger.info('✅ Hedera assets unlocked successfully:', {
          swapId,
          unlockTxHash
        });

        // Notify router of successful unlock
        await this.notifyAssetsUnlocked(swapId, unlockTxHash);
      }

    } catch (error) {
      this.logger.error('❌ Failed to rollback Hedera assets:', error);
      // In a real implementation, we'd retry or escalate the error
    }
  }

  /**
   * Unlock Hedera assets (simulate unlocking from scheduled transaction)
   */
  private async unlockHederaAssets(swap: any, role: 'initiator' | 'responder'): Promise<string> {
    if (!this.client || !this.operatorPrivateKey || !this.operatorAccountId) {
      throw new Error('Cannot unlock Hedera assets - client not properly initialized');
    }

    const asset = role === 'initiator' ? swap.initiatorAsset : swap.responderAsset;
    const finId = role === 'initiator' ? swap.initiatorFinId : swap.responderFinId;
    
    this.logger.info(`🔓 Unlocking ${role} Hedera assets:`, {
      swapId: swap.swapId,
      amount: asset.amount,
      finId,
      originalLockTx: asset.lockTxHash
    });

    try {
      // In a real implementation, this would:
      // 1. Cancel or execute the scheduled transaction unlock
      // 2. Return assets to the original owner
      // 3. Handle any unlock conditions/timeouts
      
      // For demonstration, we'll simulate an unlock transaction
      const unlockAddress = await this.getWalletAddressForFinId(finId);
      const unlockAccountId = AccountId.fromString(unlockAddress);
      const amount = BigInt(asset.amount);

      // Simulate returning locked assets to original owner
      const unlockTransaction = await new TransferTransaction()
        .addHbarTransfer(this.operatorAccountId, Hbar.fromTinybars(-Number(amount)))
        .addHbarTransfer(unlockAccountId, Hbar.fromTinybars(Number(amount)))
        .execute(this.client);

      const receipt = await unlockTransaction.getReceipt(this.client);

      if (receipt.status !== Status.Success) {
        throw new Error(`Unlock transaction failed with status: ${receipt.status}`);
      }

      this.logger.info('🎯 Hedera asset unlock transaction completed:', {
        swapId: swap.swapId,
        unlockTxHash: unlockTransaction.transactionId?.toString(),
        returnedTo: `${unlockAddress.substring(0, 6)}...`,
        note: 'In production, this would unlock from scheduled/time-locked transaction'
      });

      return unlockTransaction.transactionId?.toString() || '';

    } catch (error) {
      this.logger.error('❌ Failed to execute Hedera unlock transaction:', error);
      throw error;
    }
  }

  /**
   * Notify FinP2P router that assets are unlocked
   */
  private async notifyAssetsUnlocked(swapId: string, unlockTxHash: string): Promise<void> {
    try {
      // In a real implementation, this would be a specific rollback/unlock endpoint
      this.logger.info('📤 Notifying router of Hedera asset unlock:', {
        swapId,
        unlockTxHash
      });
      
      // For now, we'll emit an event that the router can listen to
      this.config.finp2pRouter.emit('hederaAssetsUnlocked', {
        swapId,
        chain: 'hedera',
        unlockTxHash,
        timestamp: new Date()
      });
      
    } catch (error) {
      this.logger.error('Failed to notify router of asset unlock:', error);
    }
  }

  /**
   * Get Hedera wallet address for a FinID
   * This is the key integration point with FinP2P!
   */
  async getWalletAddressForFinId(finId: string): Promise<string> {
    try {
      const walletAddress = await this.config.finp2pRouter.getWalletAddress(finId, 'hedera');
      
      if (!walletAddress) {
        throw new Error(`No Hedera wallet address found for FinID: ${finId}`);
      }

      this.logger.info('🔍 Resolved FinID to Hedera wallet address:', {
        finId,
        walletAddress,
        chain: 'hedera'
      });

      return walletAddress;
    } catch (error) {
      this.logger.error('❌ Failed to resolve FinID to Hedera wallet address:', error);
      throw error;
    }
  }

  /**
   * Get HBAR balance for a FinID (not wallet address!)
   * This shows how blockchain operations work with FinP2P identity
   */
  async getBalanceByFinId(finId: string): Promise<bigint> {
    if (!this.connected) {
      throw new Error('Not connected to Hedera network');
    }

    try {
      // 1. Resolve FinID to Hedera wallet address via FinP2P
      const walletAddress = await this.getWalletAddressForFinId(finId);

      if (this.client) {
        // 2. Query real Hedera blockchain for actual balance
        const accountId = AccountId.fromString(walletAddress);
        const balance = await new AccountBalanceQuery()
          .setAccountId(accountId)
          .execute(this.client);

        this.logger.info('💰 Retrieved HBAR balance via FinP2P identity:', {
          finId,
          walletAddress,
          balance: balance.hbars.toString(),
          note: 'Asset remains on Hedera - FinP2P provided identity resolution'
        });

        return BigInt(balance.hbars.toTinybars().toString());
      } else {
        // Mock mode
        const mockBalance = BigInt('100000000000'); // 1000 HBAR in tinybars
        this.logger.info('💰 Retrieved mock HBAR balance via FinP2P identity:', {
          finId,
          walletAddress,
          balance: '1000 HBAR (mock)',
          mode: 'mock'
        });
        return mockBalance;
      }
    } catch (error) {
      this.logger.error('❌ Failed to get balance by FinID:', error);
      throw error;
    }
  }

  /**
   * Transfer HBAR using FinIDs (not wallet addresses!)
   * This demonstrates how FinP2P enables user-friendly transfers
   */
  async transferByFinId(
    fromFinId: string,
    toFinId: string,
    amount: bigint,
    updateFinP2POwnership: boolean = true
  ): Promise<{ txId: string; finp2pTransferId?: string }> {
    if (!this.connected) {
      throw new Error('Not connected to Hedera network');
    }

    if (!this.client || !this.operatorPrivateKey) {
      // Mock mode
      const mockTxId = `mock_hedera_tx_${Date.now()}`;
      this.logger.info('🔄 Mock Hedera transfer via FinP2P identity:', {
        fromFinId,
        toFinId,
        amount: amount.toString(),
        txId: mockTxId,
        mode: 'mock'
      });
      return { txId: mockTxId };
    }

    try {
      this.logger.info('🔄 Processing real Hedera transfer via FinP2P identity:', {
        fromFinId,
        toFinId,
        amount: amount.toString(),
        willUpdateFinP2P: updateFinP2POwnership
      });

      // 1. Resolve FinIDs to actual Hedera wallet addresses
      const fromAddress = await this.getWalletAddressForFinId(fromFinId);
      const toAddress = await this.getWalletAddressForFinId(toFinId);

      // 2. Execute actual transfer on Hedera blockchain
      const fromAccountId = AccountId.fromString(fromAddress);
      const toAccountId = AccountId.fromString(toAddress);

      // Get the private key for the sender account
      const senderPrivateKey = this.accountKeys.get(fromAddress);
      if (!senderPrivateKey) {
        throw new Error(`No private key found for account ${fromAddress}. Available accounts: ${Array.from(this.accountKeys.keys()).join(', ')}`);
      }

      // Create a new client instance for this specific transaction
      let transactionClient: Client;
      switch (this.config.network) {
        case 'testnet':
          transactionClient = Client.forTestnet();
          break;
        case 'mainnet':
          transactionClient = Client.forMainnet();
          break;
        case 'previewnet':
          transactionClient = Client.forPreviewnet();
          break;
        default:
          throw new Error(`Unsupported network: ${this.config.network}`);
      }
      transactionClient.setOperator(fromAccountId, senderPrivateKey);

      const transaction = await new TransferTransaction()
        .addHbarTransfer(fromAccountId, Hbar.fromTinybars(-Number(amount)))
        .addHbarTransfer(toAccountId, Hbar.fromTinybars(Number(amount)))
        .execute(transactionClient);

      const receipt = await transaction.getReceipt(transactionClient);

      if (receipt.status !== Status.Success) {
        throw new Error(`Transaction failed with status: ${receipt.status}`);
      }

      this.logger.info('✅ Real Hedera blockchain transfer completed:', {
        txId: transaction.transactionId?.toString(),
        fromAddress,
        toAddress,
        amount: amount.toString()
      });

      // 3. Optionally update FinP2P ownership records
      let finp2pTransferId: string | undefined;
      if (updateFinP2POwnership) {
        try {
          this.logger.info('📝 FinP2P ownership update needed:', {
            fromFinId,
            toFinId,
            asset: 'hbar-native-token',
            amount: amount.toString(),
            blockchainTx: transaction.transactionId?.toString(),
            note: 'FinP2P ownership records should be updated to reflect this transfer'
          });
          
          finp2pTransferId = `finp2p_transfer_${Date.now()}`;
        } catch (finp2pError) {
          this.logger.warn('⚠️  Failed to update FinP2P ownership (blockchain transfer still succeeded):', finp2pError);
        }
      }

      // Emit event for tracking
      this.emit('transferCompleted', {
        txId: transaction.transactionId?.toString(),
        fromFinId,
        toFinId,
        fromAddress,
        toAddress,
        amount,
        finp2pTransferId,
        chain: 'hedera'
      });

      return {
        txId: transaction.transactionId?.toString() || `hedera_tx_${Date.now()}`,
        finp2pTransferId
      };

    } catch (error) {
      this.logger.error('❌ Failed to transfer by FinID:', error);
      throw error;
    }
  }

  /**
   * Direct HBAR transfer using account IDs (not FinIDs)
   */
  async transfer(fromAccountId: string, toAccountId: string, amount: bigint, assetType: string): Promise<{ txId: string }> {
    if (!this.connected) throw new Error('Not connected to Hedera network');
    if (!this.client || !this.operatorPrivateKey) throw new Error('No client or operator key');
    if (assetType !== 'HBAR') throw new Error('Only native HBAR transfers are supported');
    // Only allow sending from the operator account for now
    if (fromAccountId !== this.operatorAccountId?.toString()) throw new Error('Direct transfer only supported from operator account');
    const transaction = await new TransferTransaction()
      .addHbarTransfer(AccountId.fromString(fromAccountId), Hbar.fromTinybars(-Number(amount)))
      .addHbarTransfer(AccountId.fromString(toAccountId), Hbar.fromTinybars(Number(amount)))
      .execute(this.client);
    const receipt = await transaction.getReceipt(this.client);
    if (receipt.status !== Status.Success) throw new Error(`Transaction failed with status: ${receipt.status}`);
    this.logger.info('✅ Hedera direct/native transfer completed:', { txId: transaction.transactionId?.toString(), fromAccountId, toAccountId, amount: amount.toString() });
    return { txId: transaction.transactionId?.toString() || `hedera_tx_${Date.now()}` };
  }

  /**
   * Create a new token on Hedera using FinID for ownership
   */
  async createTokenByFinId(
    ownerFinId: string,
    tokenName: string,
    tokenSymbol: string,
    initialSupply: number = 1000000
  ): Promise<{ tokenId: string; finp2pAssetId?: string }> {
    if (!this.connected) {
      throw new Error('Not connected to Hedera network');
    }

    if (!this.client || !this.operatorPrivateKey) {
      // Mock mode
      const mockTokenId = `0.0.${Date.now()}`;
      this.logger.info('🪙 Mock Hedera token creation via FinP2P identity:', {
        ownerFinId,
        tokenName,
        tokenSymbol,
        tokenId: mockTokenId,
        mode: 'mock'
      });
      return { tokenId: mockTokenId };
    }

    try {
      // 1. Resolve FinID to Hedera wallet address
      const ownerAddress = await this.getWalletAddressForFinId(ownerFinId);
      const treasuryId = AccountId.fromString(ownerAddress);

      // 2. Create token on Hedera blockchain
      const transaction = await new TokenCreateTransaction()
        .setTokenName(tokenName)
        .setTokenSymbol(tokenSymbol)
        .setTokenType(TokenType.FungibleCommon)
        .setSupplyType(TokenSupplyType.Finite)
        .setInitialSupply(initialSupply)
        .setMaxSupply(initialSupply * 10)
        .setTreasuryAccountId(treasuryId)
        .setSupplyKey(this.operatorPrivateKey)
        .execute(this.client);

      const receipt = await transaction.getReceipt(this.client);
      const tokenId = receipt.tokenId?.toString();

      if (!tokenId) {
        throw new Error('Failed to create token - no token ID returned');
      }

      this.logger.info('✅ Real Hedera token created via FinP2P identity:', {
        tokenId,
        ownerFinId,
        ownerAddress,
        tokenName,
        tokenSymbol,
        initialSupply
      });

      // 3. Optionally register asset in FinP2P
      let finp2pAssetId: string | undefined;
      try {
        finp2pAssetId = `finp2p_hedera_${tokenId}`;
        this.logger.info('📝 FinP2P asset registration needed:', {
          ownerFinId,
          tokenId,
          finp2pAssetId,
          note: 'Asset should be registered in FinP2P for ownership tracking'
        });
      } catch (finp2pError) {
        this.logger.warn('⚠️  Failed to register asset in FinP2P:', finp2pError);
      }

      return { tokenId, finp2pAssetId };

    } catch (error) {
      this.logger.error('❌ Failed to create token by FinID:', error);
      throw error;
    }
  }

  /**
   * Get token balance for a FinID
   */
  async getTokenBalanceByFinId(finId: string, tokenId: string): Promise<bigint> {
    if (!this.connected) {
      throw new Error('Not connected to Hedera network');
    }

    try {
      // 1. Resolve FinID to Hedera wallet address
      const walletAddress = await this.getWalletAddressForFinId(finId);

      if (this.client) {
        // 2. Query real Hedera blockchain for token balance
        const accountId = AccountId.fromString(walletAddress);
        const balance = await new AccountBalanceQuery()
          .setAccountId(accountId)
          .execute(this.client);

        const tokenBalance = balance.tokens?.get(tokenId) || 0;

        this.logger.info('💰 Retrieved token balance via FinP2P identity:', {
          finId,
          walletAddress,
          tokenId,
          balance: tokenBalance.toString(),
          note: 'Token remains on Hedera - FinP2P provided identity resolution'
        });

        return BigInt(tokenBalance.toString());
      } else {
        // Mock mode
        const mockBalance = BigInt('1000000'); // 1M tokens
        this.logger.info('💰 Retrieved mock token balance via FinP2P identity:', {
          finId,
          walletAddress,
          tokenId,
          balance: '1000000 (mock)',
          mode: 'mock'
        });
        return mockBalance;
      }
    } catch (error) {
      this.logger.error('❌ Failed to get token balance by FinID:', error);
      throw error;
    }
  }

  /**
   * Execute a cross-chain trade initiated through FinP2P
   */
  async executeFinP2PTrade(tradeRequest: {
    traderFinId: string;
    offerAsset: { assetId: string; amount: string };
    requestAsset: { assetId: string; amount: string; chain: string };
    counterpartyFinId: string;
  }): Promise<string> {
    try {
      this.logger.info('🔄 Executing FinP2P-enabled cross-chain trade:', {
        trader: tradeRequest.traderFinId,
        counterparty: tradeRequest.counterpartyFinId,
        offer: tradeRequest.offerAsset,
        request: tradeRequest.requestAsset,
        note: 'Assets stay on original chains - only ownership transfers'
      });

      // 1. Verify trader owns the offered asset via FinP2P
      const traderOwnsAsset = await this.config.finp2pRouter.checkOwnership(
        tradeRequest.traderFinId,
        tradeRequest.offerAsset.assetId
      );

      if (!traderOwnsAsset) {
        throw new Error(`Trader ${tradeRequest.traderFinId} does not own offered asset`);
      }

      // 2. Execute the trade through FinP2P (ownership transfer only)
      const tradeResult = await fetch(`${this.config.finp2pRouter.getRouterInfo().endpoint}/trades/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromFinId: tradeRequest.traderFinId,
          toFinId: tradeRequest.counterpartyFinId,
          fromAsset: tradeRequest.offerAsset.assetId,
          toAsset: tradeRequest.requestAsset.assetId,
          fromAmount: tradeRequest.offerAsset.amount,
          toAmount: tradeRequest.requestAsset.amount
        })
      });

      const trade = await tradeResult.json() as {
        tradeId: string;
        status: string;
        [key: string]: any;
      };

      this.logger.info('✅ FinP2P cross-chain trade completed:', {
        tradeId: trade.tradeId,
        status: trade.status,
        note: 'Assets remained on original chains - only ownership changed'
      });

      return trade.tradeId;

    } catch (error) {
      this.logger.error('❌ Failed to execute FinP2P trade:', error);
      throw error;
    }
  }

  /**
   * Verify a user's ownership of an asset before allowing operations
   */
  async verifyOwnershipBeforeOperation(finId: string, assetId: string): Promise<boolean> {
    try {
      const ownsAsset = await this.config.finp2pRouter.checkOwnership(finId, assetId);
      
      this.logger.info('🔍 Verified ownership via FinP2P:', {
        finId,
        assetId,
        ownsAsset,
        note: 'FinP2P provided ownership verification for blockchain operation'
      });

      return ownsAsset;
    } catch (error) {
      this.logger.error('❌ Failed to verify ownership:', error);
      return false;
    }
  }

  /**
   * Get the adapter configuration and status
   */
  getStatus(): {
    connected: boolean;
    network: string;
    hasCredentials: boolean;
    finp2pIntegration: boolean;
    endpoint: string;
    mode: 'real' | 'mock';
  } {
    return {
      connected: this.connected,
      network: this.config.network,
      hasCredentials: !!(this.config.accountId && this.config.privateKey),
      finp2pIntegration: true,
      endpoint: this.config.finp2pRouter.getRouterInfo().endpoint,
      mode: this.client ? 'real' : 'mock'
    };
  }
} 