import { EventEmitter } from 'events';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { fromB64 } from '@mysten/bcs';
import { Logger } from 'winston';
import { FinP2PSDKRouter } from '../../core/router/FinP2PSDKRouter';

export interface FinP2PIntegratedSuiConfig {
  network: 'testnet' | 'devnet' | 'localnet';
  rpcUrl?: string;
  privateKey?: string;
  finp2pRouter: FinP2PSDKRouter;
}

/**
 * Sui Adapter Integrated with FinP2P
 * 
 * Provides Sui blockchain integration with FinP2P identity resolution:
 * - Uses FinP2P for identity resolution (FinID -> wallet address)
 * - Performs blockchain operations on Sui network
 * - Supports both FinID-based and direct address transfers
 * - Integrates with FinP2P atomic swap coordination
 */
export class FinP2PIntegratedSuiAdapter extends EventEmitter {
  private client: SuiClient;
  private keypair: Ed25519Keypair | null = null;
  private config: FinP2PIntegratedSuiConfig;
  private logger: Logger;
  private connected: boolean = false;

  constructor(config: FinP2PIntegratedSuiConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;

    // Initialize Sui client
    const rpcUrl = config.rpcUrl || getFullnodeUrl(config.network);
    this.client = new SuiClient({ url: rpcUrl });

    // Initialize keypair if private key provided
    if (config.privateKey) {
      try {
        // Support both bech32 (suiprivkey1...) and base64 formats
        if (config.privateKey.startsWith('suiprivkey1')) {
          // Bech32 format from Sui wallet
          this.keypair = Ed25519Keypair.fromSecretKey(config.privateKey);
        } else {
          // Base64 format (legacy)
          this.keypair = Ed25519Keypair.fromSecretKey(fromB64(config.privateKey));
        }
        this.logger.info('✅ Sui keypair initialized for signing operations');
      } catch (error) {
        this.logger.warn('⚠️ Invalid Sui private key provided, signing operations will not be available');
        this.logger.warn('💡 Expected format: suiprivkey1... (from Sui wallet) or base64 encoded');
      }
    }

    // Listen for atomic swap events from FinP2P router
    this.setupAtomicSwapListeners();

    this.logger.info('🔗 FinP2P-Integrated Sui Adapter initialized', {
      network: config.network,
      rpcUrl,
      hasSigningKey: !!this.keypair,
      finp2pIntegration: 'enabled',
      atomicSwapSupport: 'enabled'
    });
  }

  /**
   * Setup listeners for atomic swap events from FinP2P router
   */
  private setupAtomicSwapListeners(): void {
    this.config.finp2pRouter.on('atomicSwapInitiated', async (swapData: any) => {
      if (swapData.initiatorAsset.chain === 'sui' || swapData.responderAsset.chain === 'sui') {
        this.logger.info('🔔 Received atomic swap event for Sui:', swapData);
        await this.handleAtomicSwapEvent(swapData);
      }
    });

    this.config.finp2pRouter.on('atomicSwapLocked', async (lockData: any) => {
      if (lockData.chain === 'sui') {
        this.logger.info('🔒 Sui assets locked in atomic swap:', lockData);
      }
    });

    this.config.finp2pRouter.on('atomicSwapCompleted', async (completionData: any) => {
      this.logger.info('✅ Atomic swap completed:', completionData);
    });

    this.config.finp2pRouter.on('atomicSwapExpired', async (expiredData: any) => {
      if (this.isSwapRelevantToSui(expiredData.swap)) {
        this.logger.warn('⏰ Atomic swap expired for Sui chain:', {
          swapId: expiredData.swapId,
          reason: expiredData.reason
        });
      }
    });

    this.config.finp2pRouter.on('atomicSwapRollback', async (rollbackData: any) => {
      if (rollbackData.assetsToUnlock?.sui?.required) {
        this.logger.info('🔄 Received rollback request for Sui assets:', rollbackData);
        await this.handleAtomicSwapRollback(rollbackData);
      }
    });
  }

  /**
   * Handle atomic swap events when Sui is involved
   */
  private async handleAtomicSwapEvent(swapData: any): Promise<void> {
    try {
      // Check if this adapter should handle the initiator side (Sui assets being locked)
      if (swapData.initiatorAsset.chain === 'sui') {
        await this.lockSuiAssetsForSwap(swapData);
      }
      
      // If this is the responder side and we're receiving Sui assets, wait for lock confirmation
      if (swapData.responderAsset.chain === 'sui') {
        this.logger.info('📝 Waiting for counterparty to lock assets before completing Sui side...');
      }
    } catch (error) {
      this.logger.error('❌ Failed to handle atomic swap event:', error);
    }
  }

  /**
   * Lock Sui assets for atomic swap (initiator side)
   */
  private async lockSuiAssetsForSwap(swapData: any): Promise<void> {
    if (!this.keypair) {
      throw new Error('Cannot lock Sui assets - no signing key available');
    }

    try {
      this.logger.info('🔒 Locking Sui assets for atomic swap:', {
        swapId: swapData.swapId,
        asset: swapData.initiatorAsset,
        finId: swapData.initiatorFinId
      });

      // In a real implementation, this would create a time-locked contract
      // For demonstration, we'll send Account 1's SUI to Account 2's SUI address (cross-party transfer)
      const recipientAddress = await this.getWalletAddressForFinId(swapData.responderFinId);
      
      // Simulate asset lock (in reality, this would be a smart contract)
      const lockTransaction = new Transaction();
      // Amount is already in MIST (smallest SUI unit)
      const amount = BigInt(swapData.initiatorAsset.amount);
      
      // Get the sender's address to select coins from
      const senderAddress = await this.getWalletAddressForFinId(swapData.initiatorFinId);
      
      // Use SUI's gas smashing - provide coins directly and let SUI handle gas automatically
      const coins = await this.client.getCoins({
        owner: senderAddress,
        coinType: '0x2::sui::SUI'
      });

      if (!coins.data || coins.data.length === 0) {
        throw new Error('No SUI coins found');
      }

      // Calculate total available balance
      const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
      if (totalBalance < amount) {
        throw new Error(`Insufficient balance. Need ${amount.toString()} MIST, have ${totalBalance.toString()} MIST`);
      }

      // Sort coins by balance (largest first) for efficient selection
      const sortedCoins = coins.data
        .filter(coin => BigInt(coin.balance) > 0)
        .sort((a, b) => Number(BigInt(b.balance) - BigInt(a.balance)));

      // Use the first coin as primary coin, SUI will handle gas from it automatically
      const [primaryCoin] = sortedCoins;
      
      this.logger.info('🪙 Using SUI gas smashing for transaction:', {
        primaryCoinBalance: primaryCoin.balance,
        requiredAmount: amount.toString(),
        note: 'SUI will automatically handle gas from primary coin'
      });

      // Split the required amount from the primary coin
      const [splitCoin] = lockTransaction.splitCoins(primaryCoin.coinObjectId, [amount]);
      
      // In real atomic swap, this would go to a time-locked contract address
      lockTransaction.transferObjects([splitCoin], recipientAddress);

      const result = await this.client.signAndExecuteTransaction({
        transaction: lockTransaction,
        signer: this.keypair,
        options: {
          showBalanceChanges: true,
          showEffects: true,
        },
      });

      this.logger.info('✅ Sui assets locked for atomic swap:', {
        swapId: swapData.swapId,
        txHash: result.digest,
        note: 'In production, this would be a time-locked smart contract'
      });

      // Notify FinP2P router that assets are locked
      await this.notifyAssetsLocked(swapData.swapId, result.digest);

    } catch (error) {
      this.logger.error('❌ Failed to lock Sui assets for swap:', error);
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
          chain: 'sui',
          txHash
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to notify lock: ${response.statusText}`);
      }

      this.logger.info('📡 Notified FinP2P router of Sui asset lock:', { swapId, txHash });
    } catch (error) {
      this.logger.error('❌ Failed to notify FinP2P router of asset lock:', error);
      throw error;
    }
  }

  /**
   * Check if swap is relevant to Sui chain
   */
  private isSwapRelevantToSui(swap: any): boolean {
    return swap?.initiatorAsset?.chain === 'sui' || swap?.responderAsset?.chain === 'sui';
  }

  /**
   * Handle atomic swap rollback for Sui assets
   */
  private async handleAtomicSwapRollback(rollbackData: any): Promise<void> {
    const { swapId, swap } = rollbackData;
    
    if (!this.keypair) {
      this.logger.warn('⚠️ Cannot rollback Sui assets - no signing key available');
      return;
    }

    try {
      this.logger.info('🔄 Starting Sui asset rollback for swap:', {
        swapId,
        initiatorLocked: !!swap.initiatorAsset.lockTxHash,
        responderLocked: !!swap.responderAsset.lockTxHash
      });

      // In a real implementation, this would unlock assets from time-locked contracts
      // For demonstration, we'll simulate the unlock process
      
      let unlockTxHash: string | undefined;
      
      if (swap.initiatorAsset.chain === 'sui' && swap.initiatorAsset.lockTxHash) {
        unlockTxHash = await this.unlockSuiAssets(swap, 'initiator');
      } else if (swap.responderAsset.chain === 'sui' && swap.responderAsset.lockTxHash) {
        unlockTxHash = await this.unlockSuiAssets(swap, 'responder');
      }

      if (unlockTxHash) {
        this.logger.info('✅ Sui assets unlocked successfully:', {
          swapId,
          unlockTxHash
        });

        // Notify router of successful unlock
        await this.notifyAssetsUnlocked(swapId, unlockTxHash);
      }

    } catch (error) {
      this.logger.error('❌ Failed to rollback Sui assets:', error);
      // In a real implementation, we'd retry or escalate the error
    }
  }

  /**
   * Unlock Sui assets (simulate unlocking from time-locked contract)
   */
  private async unlockSuiAssets(swap: any, role: 'initiator' | 'responder'): Promise<string> {
    if (!this.keypair) {
      throw new Error('Cannot unlock Sui assets - no signing key available');
    }

    const asset = role === 'initiator' ? swap.initiatorAsset : swap.responderAsset;
    const finId = role === 'initiator' ? swap.initiatorFinId : swap.responderFinId;
    
    this.logger.info(`🔓 Unlocking ${role} Sui assets:`, {
      swapId: swap.swapId,
      amount: asset.amount,
      finId,
      originalLockTx: asset.lockTxHash
    });

    try {
      // In a real implementation, this would:
      // 1. Call the time-locked contract's unlock function
      // 2. Return assets to the original owner
      // 3. Handle any unlock conditions/timeouts
      
      // For demonstration, we'll unlock assets by returning them to original owner
      // In a real implementation, this would call the time-locked contract's unlock function
      // For demo: Account 2 returns the SUI back to Account 1
      const account1Address = await this.getWalletAddressForFinId(finId); // Account 1 (original owner)
      
      const unlockTransaction = new Transaction();
      // Amount is already in MIST (smallest SUI unit)
      const amount = BigInt(asset.amount);
      
      // Account 2 returns the locked SUI to Account 1 using SUI's gas smashing
      const coins = await this.client.getCoins({
        owner: account1Address,
        coinType: '0x2::sui::SUI'
      });

      if (!coins.data || coins.data.length === 0) {
        throw new Error('No SUI coins found for unlock');
      }

      const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
      if (totalBalance < amount) {
        throw new Error(`Insufficient balance for unlock. Need ${amount.toString()} MIST, have ${totalBalance.toString()} MIST`);
      }

      const sortedCoins = coins.data
        .filter(coin => BigInt(coin.balance) > 0)
        .sort((a, b) => Number(BigInt(b.balance) - BigInt(a.balance)));

      const [primaryCoin] = sortedCoins;
      
      this.logger.info('🪙 Using SUI gas smashing for unlock:', {
        primaryCoinBalance: primaryCoin.balance,
        requiredAmount: amount.toString(),
        note: 'SUI will automatically handle gas from primary coin'
      });

      const [splitCoin] = unlockTransaction.splitCoins(primaryCoin.coinObjectId, [amount]);
      
      unlockTransaction.transferObjects([splitCoin], account1Address);

      const result = await this.client.signAndExecuteTransaction({
        transaction: unlockTransaction,
        signer: this.keypair,
        options: {
          showBalanceChanges: true,
          showEffects: true,
        },
      });

      this.logger.info('🎯 Sui asset unlock transaction completed:', {
        swapId: swap.swapId,
        unlockTxHash: result.digest,
        returnedTo: `${account1Address.substring(0, 10)}...`,
        amount: asset.amount,
        note: 'Demo: Account 2 returned SUI to Account 1 (same address in demo, but represents cross-party flow)'
      });

      return result.digest;

    } catch (error) {
      this.logger.error('❌ Failed to execute Sui unlock transaction:', error);
      throw error;
    }
  }

  /**
   * Notify FinP2P router that assets are unlocked
   */
  private async notifyAssetsUnlocked(swapId: string, unlockTxHash: string): Promise<void> {
    try {
      // In a real implementation, this would be a specific rollback/unlock endpoint
      this.logger.info('📤 Notifying router of Sui asset unlock:', {
        swapId,
        unlockTxHash
      });
      
      // For now, we'll emit an event that the router can listen to
      this.config.finp2pRouter.emit('suiAssetsUnlocked', {
        swapId,
        chain: 'sui',
        unlockTxHash,
        timestamp: new Date()
      });
      
    } catch (error) {
      this.logger.error('Failed to notify router of asset unlock:', error);
    }
  }

  async connect(): Promise<void> {
    try {
      // Test Sui connection
      const chainId = await this.client.getChainIdentifier();
      this.connected = true;
      
      this.logger.info('✅ Connected to Sui network', {
        network: this.config.network,
        chainId,
        finp2pIntegration: 'active'
      });
    } catch (error) {
      this.logger.error('❌ Failed to connect to Sui network:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.logger.info('🔌 Disconnected from Sui network');
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Select and merge coins for a transaction
   * This solves the InsufficientCoinBalance error by properly selecting coins
   */
  private async selectAndMergeCoins(transaction: Transaction, address: string, amount: bigint): Promise<any> {
    try {
      // Get all coins owned by the address
      const coins = await this.client.getCoins({
        owner: address,
        coinType: '0x2::sui::SUI'
      });

      if (!coins.data || coins.data.length === 0) {
        throw new Error('No SUI coins found');
      }

      // Calculate total available balance
      const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
      
      // No need to manually calculate gas - SUI SDK handles this automatically
      if (totalBalance < amount) {
        throw new Error(`Insufficient balance. Need ${amount.toString()} MIST, have ${totalBalance.toString()} MIST`);
      }

      // Sort coins by balance (largest first) for efficient selection
      const sortedCoins = coins.data
        .filter(coin => BigInt(coin.balance) > 0)
        .sort((a, b) => Number(BigInt(b.balance) - BigInt(a.balance)));

      // Select coins until we have enough
      const selectedCoins = [];
      let selectedBalance = BigInt(0);
      
      for (const coin of sortedCoins) {
        selectedCoins.push(coin);
        selectedBalance += BigInt(coin.balance);
        if (selectedBalance >= amount) {
          break;
        }
      }

      this.logger.info('🪙 Selected coins for transaction:', {
        coinsSelected: selectedCoins.length,
        totalCoinsAvailable: sortedCoins.length,
        selectedBalance: selectedBalance.toString(),
        requiredAmount: amount.toString(),
        note: 'Gas fees handled automatically by SUI SDK'
      });

      // If we have multiple coins, merge them first
      if (selectedCoins.length > 1) {
        const [primaryCoin, ...remainingCoins] = selectedCoins;
        
        // Merge all selected coins into the primary coin
        transaction.mergeCoins(
          primaryCoin.coinObjectId,
          remainingCoins.map(coin => coin.coinObjectId)
        );
        
        // Split the required amount from the merged coin
        const [splitCoin] = transaction.splitCoins(primaryCoin.coinObjectId, [amount]);
        return splitCoin;
      }

      // Single coin case - split the amount we need
      const [splitCoin] = transaction.splitCoins(selectedCoins[0].coinObjectId, [amount]);
      return splitCoin;

    } catch (error) {
      this.logger.error('❌ Failed to select and merge coins:', error);
      throw error;
    }
  }

  /**
   * Get Sui wallet address for a FinID
   * This is the key integration point with FinP2P!
   */
  async getWalletAddressForFinId(finId: string): Promise<string> {
    try {
      const walletAddress = await this.config.finp2pRouter.getWalletAddress(finId, 'sui');
      
      if (!walletAddress) {
        throw new Error(`No Sui wallet address found for FinID: ${finId}`);
      }

      this.logger.info('🔍 Resolved FinID to Sui wallet address:', {
        finId,
        walletAddress: `${walletAddress.substring(0, 10)}...`,
        chain: 'sui'
      });

      return walletAddress;
    } catch (error) {
      this.logger.error('❌ Failed to resolve FinID to Sui wallet address:', error);
      throw error;
    }
  }

  /**
   * Get SUI balance for a FinID (not wallet address!)
   * This shows how blockchain operations work with FinP2P identity
   */
  async getBalanceByFinId(finId: string): Promise<bigint> {
    if (!this.connected) {
      throw new Error('Not connected to Sui network');
    }

    try {
      // 1. Resolve FinID to Sui wallet address via FinP2P
      const walletAddress = await this.getWalletAddressForFinId(finId);

      // 2. Query Sui blockchain for actual balance
      const balance = await this.client.getBalance({
        owner: walletAddress
      });

      this.logger.info('💰 Retrieved SUI balance via FinP2P identity:', {
        finId,
        walletAddress: `${walletAddress.substring(0, 10)}...`,
        balance: balance.totalBalance,
        note: 'Asset remains on Sui - FinP2P provided identity resolution'
      });

      return BigInt(balance.totalBalance);
    } catch (error) {
      this.logger.error('❌ Failed to get balance by FinID:', error);
      throw error;
    }
  }

  /**
   * Transfer SUI tokens using FinIDs (not wallet addresses!)
   * This demonstrates how FinP2P enables user-friendly transfers
   */
  async transferByFinId(
    fromFinId: string,
    toFinId: string,
    amount: bigint,
    updateFinP2POwnership: boolean = true
  ): Promise<{ txHash: string; finp2pTransferId?: string }> {
    if (!this.connected) {
      throw new Error('Not connected to Sui network');
    }

    if (!this.keypair) {
      throw new Error('No signing key available - cannot execute transfers');
    }

    try {
      this.logger.info('🔄 Processing Sui transfer via FinP2P identity:', {
        fromFinId,
        toFinId,
        amount: amount.toString(),
        willUpdateFinP2P: updateFinP2POwnership
      });

      // 1. Resolve FinIDs to actual Sui wallet addresses
      const fromAddress = await this.getWalletAddressForFinId(fromFinId);
      const toAddress = await this.getWalletAddressForFinId(toFinId);

      // 2. Execute actual transfer on Sui blockchain using SUI's gas smashing
      const transaction = new Transaction();
      
      const coins = await this.client.getCoins({
        owner: fromAddress,
        coinType: '0x2::sui::SUI'
      });

      if (!coins.data || coins.data.length === 0) {
        throw new Error('No SUI coins found');
      }

      // Calculate total available balance
      const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
      if (totalBalance < amount) {
        throw new Error(`Insufficient balance. Need ${amount.toString()} MIST, have ${totalBalance.toString()} MIST`);
      }

      // Sort coins by balance (largest first)
      const sortedCoins = coins.data
        .filter(coin => BigInt(coin.balance) > 0)
        .sort((a, b) => Number(BigInt(b.balance) - BigInt(a.balance)));

      // Use the first coin as primary coin, SUI will handle gas automatically
      const [primaryCoin] = sortedCoins;
      
      this.logger.info('🪙 Using SUI gas smashing for transfer:', {
        primaryCoinBalance: primaryCoin.balance,
        requiredAmount: amount.toString(),
        note: 'SUI will automatically handle gas from primary coin'
      });

      // Split the required amount from the primary coin
      const [splitCoin] = transaction.splitCoins(primaryCoin.coinObjectId, [amount]);
      
      transaction.transferObjects([splitCoin], toAddress);

      const result = await this.client.signAndExecuteTransaction({
        transaction,
        signer: this.keypair,
        options: {
          showBalanceChanges: true,
          showEffects: true,
        },
      });

      this.logger.info('✅ Sui blockchain transfer completed:', {
        txHash: result.digest,
        fromAddress: `${fromAddress.substring(0, 10)}...`,
        toAddress: `${toAddress.substring(0, 10)}...`,
        amount: amount.toString()
      });

      // 3. Optionally update FinP2P ownership records
      let finp2pTransferId: string | undefined;
      if (updateFinP2POwnership) {
        try {
          // This would typically be done through FinP2P SDK
          // For now, we'll note that it should be done
          this.logger.info('📝 FinP2P ownership update needed:', {
            fromFinId,
            toFinId,
            asset: 'sui-native-token',
            amount: amount.toString(),
            blockchainTx: result.digest,
            note: 'FinP2P ownership records should be updated to reflect this transfer'
          });
          
          finp2pTransferId = `finp2p_transfer_${Date.now()}`;
        } catch (finp2pError) {
          this.logger.warn('⚠️  Failed to update FinP2P ownership (blockchain transfer still succeeded):', finp2pError);
        }
      }

      // Emit event for tracking
      this.emit('transferCompleted', {
        txHash: result.digest,
        fromFinId,
        toFinId,
        fromAddress,
        toAddress,
        amount,
        finp2pTransferId,
        chain: 'sui'
      });

      return {
        txHash: result.digest,
        finp2pTransferId
      };

    } catch (error) {
      this.logger.error('❌ Failed to transfer by FinID:', error);
      throw error;
    }
  }

  /**
   * Direct SUI transfer using addresses (not FinIDs)
   */
  async transfer(fromAddress: string, toAddress: string, amount: bigint, assetType: string): Promise<{ txHash: string }> {
    if (!this.connected) throw new Error('Not connected to Sui network');
    if (!this.keypair) throw new Error('No signing key available - cannot execute transfers');
    if (assetType !== 'SUI') throw new Error('Only native SUI transfers are supported');

    this.logger.info('🔄 Starting Sui direct transfer:', { fromAddress, toAddress, amount: amount.toString() });

    try {
      // Get coins for the fromAddress
      this.logger.info('🔍 Querying coins for address:', fromAddress);
      const coins = await this.client.getCoins({ owner: fromAddress, coinType: '0x2::sui::SUI' });
      
      if (!coins.data || coins.data.length === 0) {
        this.logger.error('❌ No SUI coins found for address:', fromAddress);
        throw new Error('No SUI coins found');
      }
      
      this.logger.info('✅ Found coins:', { coinCount: coins.data.length });
      
      const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
      this.logger.info('💰 Total balance:', { totalBalance: totalBalance.toString(), requiredAmount: amount.toString() });
      
      if (totalBalance < amount) {
        this.logger.error('❌ Insufficient balance:', { 
          required: amount.toString(), 
          available: totalBalance.toString() 
        });
        throw new Error(`Insufficient balance. Need ${amount.toString()} MIST, have ${totalBalance.toString()} MIST`);
      }
      
      const sortedCoins = coins.data.filter(coin => BigInt(coin.balance) > 0).sort((a, b) => Number(BigInt(b.balance) - BigInt(a.balance)));
      const [primaryCoin] = sortedCoins;
      
      this.logger.info('🔧 Creating transaction with primary coin:', { 
        coinObjectId: primaryCoin.coinObjectId,
        coinBalance: primaryCoin.balance 
      });
      
      const transaction = new Transaction();
      const [splitCoin] = transaction.splitCoins(primaryCoin.coinObjectId, [amount]);
      transaction.transferObjects([splitCoin], toAddress);
      
      this.logger.info('📝 Executing transaction...');
      const result = await this.client.signAndExecuteTransaction({
        transaction,
        signer: this.keypair,
        options: { showBalanceChanges: true, showEffects: true }
      });
      
      this.logger.info('✅ Sui direct/native transfer completed:', { 
        txHash: result.digest, 
        fromAddress, 
        toAddress, 
        amount: amount.toString() 
      });
      return { txHash: result.digest };
    } catch (error) {
      this.logger.error('❌ Sui direct transfer failed:', error);
      throw error;
    }
  }

  /**
   * Get all owned objects for a FinID
   * Shows how complex blockchain queries work with FinP2P identity
   */
  async getOwnedObjectsByFinId(finId: string): Promise<any[]> {
    if (!this.connected) {
      throw new Error('Not connected to Sui network');
    }

    try {
      // 1. Resolve FinID to Sui wallet address
      const walletAddress = await this.getWalletAddressForFinId(finId);

      // 2. Query Sui for owned objects
      const ownedObjects = await this.client.getOwnedObjects({
        owner: walletAddress
      });

      this.logger.info('📦 Retrieved owned objects via FinP2P identity:', {
        finId,
        walletAddress: `${walletAddress.substring(0, 10)}...`,
        objectCount: ownedObjects.data.length
      });

      return ownedObjects.data;
    } catch (error) {
      this.logger.error('❌ Failed to get owned objects by FinID:', error);
      throw error;
    }
  }

  /**
   * Execute a cross-chain trade initiated through FinP2P
   * This demonstrates the correct pattern for FinP2P-enabled trading
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
   * This is how blockchain adapters should check permissions via FinP2P
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
   * Get transaction history for a FinID
   * Shows how historical data works with FinP2P identity
   */
  async getTransactionHistoryByFinId(finId: string): Promise<any[]> {
    if (!this.connected) {
      throw new Error('Not connected to Sui network');
    }

    try {
      // 1. Resolve FinID to wallet address
      const walletAddress = await this.getWalletAddressForFinId(finId);

      // 2. Query Sui transaction history
      const txHistory = await this.client.queryTransactionBlocks({
        filter: {
          FromAddress: walletAddress
        },
        options: {
          showInput: true,
          showEffects: true,
          showBalanceChanges: true
        }
      });

      this.logger.info('📚 Retrieved transaction history via FinP2P identity:', {
        finId,
        walletAddress: `${walletAddress.substring(0, 10)}...`,
        transactionCount: txHistory.data.length
      });

      return txHistory.data;
    } catch (error) {
      this.logger.error('❌ Failed to get transaction history by FinID:', error);
      throw error;
    }
  }

  /**
   * Get the adapter configuration and status
   */
  getStatus(): {
    connected: boolean;
    network: string;
    hasSigningKey: boolean;
    finp2pIntegration: boolean;
    endpoint: string;
  } {
    return {
      connected: this.connected,
      network: this.config.network,
      hasSigningKey: !!this.keypair,
      finp2pIntegration: true,
      endpoint: this.config.finp2pRouter.getRouterInfo().endpoint
    };
  }
} 