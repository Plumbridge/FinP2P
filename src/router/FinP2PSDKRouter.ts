import { EventEmitter } from 'events';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Sdk } from '@owneraio/finp2p-sdk-js';
import { Logger } from 'winston';
import {
  Router as IRouter,
  Transfer,
  TransferStatus,
  RouterStatus,
  ConfigOptions,
  AtomicSwap,
  AtomicSwapRequest,
  AtomicSwapResponse,
  AtomicSwapStatus,
  AtomicSwapStage,
  AtomicSwapEvent
} from '../types';
import { createLogger } from '../utils/logger';

export interface FinP2PSDKConfig {
  routerId: string;
  port: number;
  host?: string;
  orgId: string;
  custodianOrgId: string;
  owneraAPIAddress: string;
  owneraOssURL?: string;
  owneraFinp2pURL?: string;
  authConfig: {
    apiKey: string;
    secret: {
      type: 1 | 2;
      raw: string;
    };
  };
  mockMode?: boolean;
}

/**
 * FinP2P SDK Router
 * 
 * Provides FinP2P protocol implementation with:
 * - FinID to wallet address resolution
 * - Atomic swap coordination
 * - Asset ownership management
 * - Cross-chain transaction routing
 * - Mock mode support for development
 */
export class FinP2PSDKRouter extends EventEmitter {
  private app: express.Application;
  private server: any;
  private logger: Logger;
  private config: FinP2PSDKConfig;
  private sdk: Sdk | null = null;
  private routerInfo: IRouter;
  private _isRunning: boolean = false;
  private isStarting: boolean = false;
  private isStarted: boolean = false;
  private activeTransfers: Map<string, Transfer> = new Map();
  
  // Mock data for development (when mockMode = true)
  private mockUsers: Map<string, any> = new Map();
  private mockAssets: Map<string, any> = new Map();
  private mockOwnership: Map<string, any> = new Map();
  private mockWalletMappings: Map<string, Map<string, string>> = new Map();
  private mockSwaps: Map<string, AtomicSwap> = new Map();
  private swapTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private swapMonitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: FinP2PSDKConfig) {
    super();

    // Provide default host if not specified
    this.config = {
      ...config,
      host: config.host || 'localhost'
    };
    this.logger = createLogger({ level: 'info' });

    this.routerInfo = {
      id: this.config.routerId,
      name: this.config.routerId,
      institutionId: this.config.orgId,
      endpoint: `http://${this.config.host}:${this.config.port}`,
      publicKey: this.config.mockMode ? 'mock-public-key-for-development' : 'real-public-key',
      supportedLedgers: ['ethereum', 'sui', 'hedera'],
      status: RouterStatus.OFFLINE,
      lastSeen: new Date(),
      metadata: {
        version: '1.0.0',
        capabilities: ['ownership_transfer', 'ownership_verification', 'asset_creation', 'user_creation'],
        institution: {
          name: this.config.orgId,
          country: 'US'
        }
      }
    };

    this.app = express();
    this.setupExpress();
    
    if (config.mockMode) {
      this.initializeMockData();
    }

    // Setup rollback completion listeners
    this.setupRollbackListeners();
  }

  /**
   * Setup listeners for rollback completion events from adapters
   */
  private setupRollbackListeners(): void {
    // Listen for Sui asset unlock confirmations
    this.on('suiAssetsUnlocked', (unlockData: any) => {
      this.handleAssetUnlockConfirmation(unlockData);
    });

    // Listen for Hedera asset unlock confirmations  
    this.on('hederaAssetsUnlocked', (unlockData: any) => {
      this.handleAssetUnlockConfirmation(unlockData);
    });
  }

  /**
   * Handle confirmation that assets have been unlocked by an adapter
   */
  private handleAssetUnlockConfirmation(unlockData: {
    swapId: string;
    chain: string;
    unlockTxHash: string;
    timestamp: Date;
  }): void {
    const swap = this.mockSwaps.get(unlockData.swapId);
    if (!swap) {
      this.logger.warn('Received unlock confirmation for unknown swap:', unlockData.swapId);
      return;
    }

    this.logger.info('📝 Processing asset unlock confirmation:', {
      swapId: unlockData.swapId,
      chain: unlockData.chain,
      unlockTxHash: unlockData.unlockTxHash
    });

    // Mark the specific chain as unlocked
    if (swap.rollback.assetsToUnlock[unlockData.chain]) {
      swap.rollback.assetsToUnlock[unlockData.chain].completed = true;
      swap.rollback.assetsToUnlock[unlockData.chain].txHash = unlockData.unlockTxHash;
    }

    // Update asset unlock transaction hash
    if (swap.initiatorAsset.chain === unlockData.chain) {
      swap.initiatorAsset.unlockTxHash = unlockData.unlockTxHash;
    } else if (swap.responderAsset.chain === unlockData.chain) {
      swap.responderAsset.unlockTxHash = unlockData.unlockTxHash;
    }

    swap.updatedAt = new Date();
    
    // Add unlock event
    swap.events.push({
      id: `${unlockData.swapId}_unlock_${unlockData.chain}`,
      swapId: unlockData.swapId,
      type: 'rollback_completed',
      chain: unlockData.chain,
      txHash: unlockData.unlockTxHash,
      message: `Assets unlocked and returned to original owner on ${unlockData.chain}`,
      timestamp: unlockData.timestamp
    });

    // Check if all required unlocks are complete
    const allUnlocksComplete = Object.values(swap.rollback.assetsToUnlock)
      .filter(unlock => unlock.required)
      .every(unlock => unlock.completed);

    if (allUnlocksComplete) {
      this.completeSwapRollback(unlockData.swapId);
    }

    this.mockSwaps.set(unlockData.swapId, swap);
  }

  /**
   * Extract Sui address from private key in environment variable
   */
  private extractSuiAddressFromEnv(): string | null {
    try {
      const privateKey = process.env.SUI_PRIVATE_KEY;
      if (!privateKey) {
        return null;
      }

      // Import Sui SDK for address derivation
      const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
      const { fromB64 } = require('@mysten/sui/utils');

      let keypair: any;
      
      // Support both bech32 (suiprivkey1...) and base64 formats
      if (privateKey.startsWith('suiprivkey1')) {
        keypair = Ed25519Keypair.fromSecretKey(privateKey);
      } else {
        keypair = Ed25519Keypair.fromSecretKey(fromB64(privateKey));
      }

      const suiAddress = keypair.getPublicKey().toSuiAddress();
      this.logger.info('✅ Extracted Sui address from private key:', {
        address: `${suiAddress.substring(0, 10)}...`,
        source: 'SUI_PRIVATE_KEY environment variable'
      });
      
      return suiAddress;
    } catch (error) {
      this.logger.warn('⚠️ Could not extract Sui address from private key:', (error as Error).message);
      return null;
    }
  }

  private initializeMockData(): void {
    this.logger.info('🎭 Initializing mock data for development/dissertation');
    
    // Get real wallet addresses from environment variables for the atomic swap demo
    const realSuiAddress = this.extractSuiAddressFromEnv();
    const realHederaAccountId = process.env.HEDERA_ACCOUNT_ID || '0.0.123456';
    
    // Get second account addresses for Bob (different from Alice)
    const bobSuiAddress = process.env.SUI_ADDRESS_2 || realSuiAddress || '0x000...bob_sui_not_available';
    const bobHederaAccount = process.env.HEDERA_ACCOUNT_ID_2 || realHederaAccountId;
    
    // TRUE CROSS-CHAIN SWAP SETUP: Alice has SUI (wants HBAR), Bob has HBAR (wants SUI)
    // This demonstrates real cross-party asset exchange via FinP2P coordination
    const aliceSuiAddress = realSuiAddress || '0x000...alice_sui_not_available'; // Alice has SUI to trade
    const aliceHederaAccount = realHederaAccountId; // Alice wants to receive HBAR here
    
    this.logger.info('🔄 TRUE CROSS-CHAIN ASSET EXCHANGE SETUP:');
    this.logger.info('   • Alice: Has SUI tokens, wants HBAR tokens');
    this.logger.info('   • Bob: Has HBAR tokens, wants SUI tokens');
    this.logger.info('   • FinP2P will coordinate cross-chain asset exchange');
    this.logger.info('   • Alice trades her SUI for Bob\'s HBAR via atomic swap protocol!');
    
    // Mock users configured for proper atomic swap
    const mockUsers = [
      { 
        finId: 'finp2p_alice_123',
        name: 'Alice Johnson',
        email: 'alice@demo.com',
        wallets: {
          sui: '0x123abc...alice_sui',
          hedera: '0.0.123456',
          ethereum: '0x456def...alice_eth'
        }
      },
      { 
        finId: 'finp2p_bob_456',
        name: 'Bob Smith', 
        email: 'bob@demo.com',
        wallets: {
          sui: '0x789xyz...bob_sui',
          hedera: '0.0.789012',
          ethereum: '0x123ghi...bob_eth'
        }
      },
      // Alice: Has SUI, wants HBAR - will trade her SUI for Bob's HBAR
      { 
        finId: 'alice@atomic-swap.demo',
        name: 'Alice (Trader: SUI → HBAR)',
        email: 'alice@atomic-swap.demo',
        wallets: {
          sui: aliceSuiAddress, // Alice's SUI wallet (has SUI to trade)
          hedera: aliceHederaAccount, // Alice's HBAR wallet (wants to receive HBAR)
          ethereum: process.env.SEPOLIA_WALLET_ADDRESS || '0x000...placeholder'
        }
      },
      // Bob: Has HBAR, wants SUI - will trade his HBAR for Alice's SUI
      { 
        finId: 'bob@atomic-swap.demo',
        name: 'Bob (Trader: HBAR → SUI)', 
        email: 'bob@atomic-swap.demo',
        wallets: {
          sui: bobSuiAddress, // Bob's SUI wallet (wants to receive SUI)
          hedera: bobHederaAccount, // Bob's HBAR wallet (has HBAR to trade)
          ethereum: process.env.SEPOLIA_WALLET_ADDRESS || '0x000...placeholder'
        }
      }
    ];

    mockUsers.forEach(user => {
      this.mockUsers.set(user.finId, user);
      this.mockWalletMappings.set(user.finId, new Map(Object.entries(user.wallets)));
    });
    
    this.logger.info('🔧 Cross-Party Asset Exchange Configuration:');
    this.logger.info(`   Alice has SUI in wallet: ${aliceSuiAddress ? `${aliceSuiAddress.substring(0, 10)}...` : 'not-available'}`);
    this.logger.info(`   Alice wants HBAR in wallet: ${aliceHederaAccount}`);
    this.logger.info(`   Bob has HBAR in wallet: ${bobHederaAccount}`);
    this.logger.info(`   Bob wants SUI in wallet: ${bobSuiAddress ? `${bobSuiAddress.substring(0, 10)}...` : 'not-available'}`);
    this.logger.info('');
    this.logger.info('🎯 Trading Party Details:', {
      'alice@atomic-swap.demo': { 
        sui_wallet: aliceSuiAddress ? `${aliceSuiAddress.substring(0, 10)}...` : 'not-available',
        hedera_wallet: aliceHederaAccount,
        trade: 'Has SUI → Wants HBAR'
      },
      'bob@atomic-swap.demo': { 
        sui_wallet: bobSuiAddress ? `${bobSuiAddress.substring(0, 10)}...` : 'not-available',
        hedera_wallet: bobHederaAccount,
        trade: 'Has HBAR → Wants SUI'
      }
    });

    this.logger.info('💡 Cross-Chain Asset Exchange Flow:');
    this.logger.info('   1. Alice queries FinP2P: "What is Bob\'s SUI wallet address?"');
    this.logger.info('   2. Bob queries FinP2P: "What is Alice\'s HBAR wallet address?"');
    this.logger.info('   3. Atomic swap execution:');
    this.logger.info('      → Alice sends SUI to Bob\'s SUI wallet');
    this.logger.info('      → Bob sends HBAR to Alice\'s HBAR wallet');
    this.logger.info('   4. Result: Alice gets HBAR, Bob gets SUI - TRUE ASSET EXCHANGE!');

    // Mock assets
    this.mockAssets.set('asset_sui_token_1', {
      assetId: 'asset_sui_token_1',
      name: 'Demo SUI Token',
      chain: 'sui',
      contractAddress: '0xabc123...sui_contract'
    });

    this.mockAssets.set('asset_hedera_token_1', {
      assetId: 'asset_hedera_token_1', 
      name: 'Demo Hedera Token',
      chain: 'hedera',
      contractAddress: '0.0.456789'
    });

    // Initial ownership (Alice owns some assets)
    this.mockOwnership.set('finp2p_alice_123:asset_sui_token_1', {
      finId: 'finp2p_alice_123',
      assetId: 'asset_sui_token_1',
      amount: '1000000000', // 1 SUI token
      chain: 'sui'
    });
  }

  private setupExpress(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use((req, res, next) => {
      this.logger.debug(`${req.method} ${req.path}`, { body: req.body });
      next();
    });

    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        router: this.routerInfo,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        mode: this.config.mockMode ? 'development_mock' : 'production',
        note: this.config.mockMode ? 'Using mocked credentials for development' : 'Using real FinP2P network'
      });
    });

    // Router info
    this.app.get('/info', (req, res) => {
      res.json(this.routerInfo);
    });

    // FinP2P SDK endpoints (real structure, mocked when needed)
    this.app.post('/users', this.createUser.bind(this));
    this.app.get('/users/:userId', this.getUser.bind(this));
    this.app.post('/assets', this.createAsset.bind(this));
    this.app.get('/assets/:assetId', this.getAsset.bind(this));
    this.app.get('/organization', this.getOrganization.bind(this));

    // FinP2P Ownership Transfer endpoints
    this.app.post('/ownership/transfer', this.handleOwnershipTransfer.bind(this));
    this.app.get('/ownership/verify/:userId/:assetId', this.verifyOwnership.bind(this));
    
    // Critical: FinID to wallet address resolution for blockchain adapters
    this.app.get('/finid/:finId/wallet/:chain', this.getWalletAddressByFinId.bind(this));
    this.app.post('/trades/execute', this.executeTradeViaFinP2P.bind(this));

    // Add atomic swap endpoints
    this.app.post('/atomic-swaps/initiate', async (req, res) => {
      try {
        const result = await this.executeAtomicSwap(req.body);
        res.json(result);
      } catch (error) {
        this.logger.error('Failed to initiate atomic swap:', error);
        res.status(500).json({ error: 'Failed to initiate atomic swap' });
      }
    });

    this.app.post('/atomic-swaps/:swapId/lock', async (req, res) => {
      try {
        const { swapId } = req.params;
        const { chain, txHash } = req.body;
        
        this.logger.info('🔒 Received asset lock notification:', {
          swapId,
          chain,
          txHash
        });
        
        await this.lockSwapAssets(swapId, chain, txHash);
        res.json({ 
          success: true, 
          message: 'Asset lock notification received',
          swapId,
          chain,
          txHash
        });
      } catch (error) {
        this.logger.error('Failed to process lock notification:', error);
        res.status(500).json({ 
          error: 'Failed to process lock notification',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/atomic-swaps/:swapId/complete', async (req, res) => {
      try {
        const { swapId } = req.params;
        const { completeTxHash } = req.body;
        await this.completeAtomicSwap(swapId, completeTxHash);
        res.json({ success: true });
      } catch (error) {
        this.logger.error('Failed to complete swap:', error);
        res.status(500).json({ error: 'Failed to complete swap' });
      }
    });

    this.app.get('/atomic-swaps/:swapId', async (req, res) => {
      try {
        const { swapId } = req.params;
        const swap = await this.getAtomicSwapStatus(swapId);
        res.json(swap || { error: 'Swap not found' });
      } catch (error) {
        this.logger.error('Failed to get swap status:', error);
        res.status(500).json({ error: 'Failed to get swap status' });
      }
    });
  }

  /**
   * Critical method: Resolve FinID to wallet address for blockchain operations
   * This is what blockchain adapters will call to get actual wallet addresses
   */
  private async getWalletAddressByFinId(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { finId, chain } = req.params;

      if (this.config.mockMode) {
        // Mock mode: return from mock data
        const walletMap = this.mockWalletMappings.get(finId);
        if (!walletMap) {
          res.status(404).json({ error: 'FinID not found' });
          return;
        }

        const walletAddress = walletMap.get(chain);
        if (!walletAddress) {
          res.status(404).json({ error: `No wallet found for chain ${chain}` });
          return;
        }

        res.json({
          finId,
          chain,
          walletAddress,
          mode: 'mock'
        });
      } else {
        // Real mode: use actual FinP2P SDK
        if (!this.sdk) {
          res.status(500).json({ error: 'FinP2P SDK not initialized' });
          return;
        }

        // In real implementation, this would query the FinP2P network
        // const user = await this.sdk.getUser(finId);
        // const walletAddress = user.wallets[chain];
        
        res.status(501).json({ 
          error: 'Real FinP2P integration not implemented yet',
          note: 'Use mockMode for development' 
        });
      }
    } catch (error) {
      this.logger.error('Error resolving FinID to wallet:', error);
      res.status(500).json({ error: 'Failed to resolve FinID to wallet address' });
    }
  }

  /**
   * Execute a trade using FinP2P for identity resolution
   * This demonstrates how blockchain adapters integrate with FinP2P
   */
  private async executeTradeViaFinP2P(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { 
        fromFinId, 
        toFinId, 
        fromAsset, 
        toAsset, 
        fromAmount, 
        toAmount 
      } = req.body;

      this.logger.info('🔄 Executing cross-chain trade via FinP2P:', {
        fromFinId,
        toFinId,
        fromAsset,
        toAsset,
        note: 'Assets stay on original chains - only ownership transfers'
      });

      if (this.config.mockMode) {
        // 1. Resolve FinIDs to wallet addresses
        const fromWallets = this.mockWalletMappings.get(fromFinId);
        const toWallets = this.mockWalletMappings.get(toFinId);

        if (!fromWallets || !toWallets) {
          res.status(400).json({ error: 'Invalid FinIDs' });
          return;
        }

        // 2. Get asset chain information
        const fromAssetInfo = this.mockAssets.get(fromAsset);
        const toAssetInfo = this.mockAssets.get(toAsset);

        if (!fromAssetInfo || !toAssetInfo) {
          res.status(400).json({ error: 'Invalid assets' });
          return;
        }

        // 3. Resolve wallet addresses for each chain
        const fromWalletAddress = fromWallets.get(fromAssetInfo.chain);
        const toWalletAddress = toWallets.get(toAssetInfo.chain);

        if (!fromWalletAddress || !toWalletAddress) {
          res.status(400).json({ error: 'Wallet addresses not found for required chains' });
          return;
        }

        // 4. Execute ownership transfers (NOT asset movements!)
        const tradeId = `trade_${Date.now()}`;
        
        // Transfer ownership in FinP2P (assets stay on original chains)
        this.mockOwnership.delete(`${fromFinId}:${fromAsset}`);
        this.mockOwnership.set(`${toFinId}:${fromAsset}`, {
          finId: toFinId,
          assetId: fromAsset,
          amount: fromAmount,
          chain: fromAssetInfo.chain,
          acquiredVia: 'trade',
          tradeId
        });

        this.mockOwnership.delete(`${toFinId}:${toAsset}`);
        this.mockOwnership.set(`${fromFinId}:${toAsset}`, {
          finId: fromFinId,
          assetId: toAsset,
          amount: toAmount,
          chain: toAssetInfo.chain,
          acquiredVia: 'trade',
          tradeId
        });

        res.json({
          tradeId,
          status: 'completed',
          message: 'Ownership transferred successfully - assets remain on original chains',
          details: {
            fromFinId,
            toFinId,
            exchanges: [
              {
                asset: fromAssetInfo.name,
                chain: fromAssetInfo.chain,
                newOwner: toFinId,
                walletAddress: toWalletAddress,
                note: 'Asset stays on original chain'
              },
              {
                asset: toAssetInfo.name,
                chain: toAssetInfo.chain,
                newOwner: fromFinId,
                walletAddress: fromWalletAddress,
                note: 'Asset stays on original chain'
              }
            ]
          },
          note: 'This is the CORRECT FinP2P model - no cross-chain asset movement!',
          mode: 'mock'
        });

      } else {
        res.status(501).json({ 
          error: 'Real FinP2P trading not implemented yet',
          note: 'Use mockMode for development' 
        });
      }

    } catch (error) {
      this.logger.error('Error executing trade:', error);
      res.status(500).json({ error: 'Failed to execute trade' });
    }
  }

  private async createUser(req: express.Request, res: express.Response): Promise<void> {
    try {
      if (this.config.mockMode) {
        const userData = req.body;
        const finId = userData.finId || `finp2p_${userData.name.toLowerCase()}_${Date.now()}`;
        
        const user = {
          finId,
          ...userData,
          createdAt: new Date()
        };

        this.mockUsers.set(finId, user);
        
        // Initialize wallet mappings if provided
        if (userData.wallets) {
          this.mockWalletMappings.set(finId, new Map(Object.entries(userData.wallets)));
        }

        res.json({ ...user, mode: 'mock' });
      } else {
        // Real FinP2P SDK call
        if (!this.sdk) {
          res.status(500).json({ error: 'FinP2P SDK not initialized' });
          return;
        }

        const user = await this.sdk.createUser(req.body);
        res.json(user);
      }
    } catch (error) {
      this.logger.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }

  private async getUser(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (this.config.mockMode) {
        const user = this.mockUsers.get(userId);
        if (!user) {
          res.status(404).json({ error: 'User not found' });
          return;
        }
        res.json({ ...user, mode: 'mock' });
      } else {
        if (!this.sdk) {
          res.status(500).json({ error: 'FinP2P SDK not initialized' });
          return;
        }

                 // Fix SDK method call - needs proper request object
         const user = await this.sdk.getUser({ userId });
         res.json(user);
      }
    } catch (error) {
      this.logger.error('Error getting user:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  }

  private async createAsset(req: express.Request, res: express.Response): Promise<void> {
    try {
      if (this.config.mockMode) {
        const assetData = req.body;
        const assetId = assetData.assetId || `asset_${assetData.chain}_${Date.now()}`;
        
        const asset = {
          assetId,
          ...assetData,
          createdAt: new Date()
        };

        this.mockAssets.set(assetId, asset);
        res.json({ ...asset, mode: 'mock' });
      } else {
        if (!this.sdk) {
          res.status(500).json({ error: 'FinP2P SDK not initialized' });
          return;
        }

        const asset = await this.sdk.createAsset(req.body);
        res.json(asset);
      }
    } catch (error) {
      this.logger.error('Error creating asset:', error);
      res.status(500).json({ error: 'Failed to create asset' });
    }
  }

  private async getAsset(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { assetId } = req.params;

      if (this.config.mockMode) {
        const asset = this.mockAssets.get(assetId);
        if (!asset) {
          res.status(404).json({ error: 'Asset not found' });
          return;
        }
        res.json({ ...asset, mode: 'mock' });
      } else {
        if (!this.sdk) {
          res.status(500).json({ error: 'FinP2P SDK not initialized' });
          return;
        }

                 // Fix SDK method call - needs proper request object
         const asset = await this.sdk.getAsset({ assetId });
         res.json(asset);
      }
    } catch (error) {
      this.logger.error('Error getting asset:', error);
      res.status(500).json({ error: 'Failed to get asset' });
    }
  }

  private async getOrganization(req: express.Request, res: express.Response): Promise<void> {
    try {
      if (this.config.mockMode) {
        res.json({
          orgId: this.config.orgId,
          name: `Mock Organization ${this.config.orgId}`,
          type: 'financial_institution',
          status: 'active',
          mode: 'mock'
        });
      } else {
        if (!this.sdk) {
          res.status(500).json({ error: 'FinP2P SDK not initialized' });
          return;
        }

                 // Fix SDK method call - needs proper request object
         const org = await this.sdk.getOrganization({});
         res.json(org);
      }
    } catch (error) {
      this.logger.error('Error getting organization:', error);
      res.status(500).json({ error: 'Failed to get organization' });
    }
  }

  private async handleOwnershipTransfer(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { fromFinId, toFinId, assetId, amount } = req.body;

      if (this.config.mockMode) {
        // Mock ownership transfer
        const ownershipKey = `${fromFinId}:${assetId}`;
        const ownership = this.mockOwnership.get(ownershipKey);

        if (!ownership) {
          res.status(400).json({ error: 'Ownership not found' });
          return;
        }

        // Transfer ownership
        this.mockOwnership.delete(ownershipKey);
        this.mockOwnership.set(`${toFinId}:${assetId}`, {
          ...ownership,
          finId: toFinId,
          transferredAt: new Date()
        });

        res.json({
          transferId: `transfer_${Date.now()}`,
          fromFinId,
          toFinId,
          assetId,
          amount,
          status: 'completed',
          message: 'Ownership transferred successfully',
          note: 'Asset remains on original blockchain',
          mode: 'mock'
        });
      } else {
        if (!this.sdk) {
          res.status(500).json({ error: 'FinP2P SDK not initialized' });
          return;
        }

                 // Real FinP2P ownership transfer - needs implementation
         res.status(501).json({ 
           error: 'Real FinP2P ownership transfer not yet implemented',
           note: 'SDK method needs to be integrated - use mockMode for development' 
         });
      }
    } catch (error) {
      this.logger.error('Error handling ownership transfer:', error);
      res.status(500).json({ error: 'Failed to transfer ownership' });
    }
  }

  private async verifyOwnership(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { userId, assetId } = req.params;

      if (this.config.mockMode) {
        const ownershipKey = `${userId}:${assetId}`;
        const ownership = this.mockOwnership.get(ownershipKey);

        res.json({
          userId,
          assetId,
          isOwner: !!ownership,
          ownership: ownership || null,
          mode: 'mock'
        });
      } else {
        if (!this.sdk) {
          res.status(500).json({ error: 'FinP2P SDK not initialized' });
          return;
        }

                 // Real FinP2P ownership verification - needs implementation
         res.status(501).json({ 
           error: 'Real FinP2P ownership verification not yet implemented',
           note: 'SDK method needs to be integrated - use mockMode for development' 
         });
      }
    } catch (error) {
      this.logger.error('Error verifying ownership:', error);
      res.status(500).json({ error: 'Failed to verify ownership' });
    }
  }

  /**
   * Execute atomic swap between two chains with enhanced timeout and status tracking
   * This coordinates the swap protocol between adapters
   */
  async executeAtomicSwap(swapRequest: AtomicSwapRequest): Promise<AtomicSwapResponse> {
    const swapId = `atomic_swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    // Calculate timeout timestamp (use minutes if provided, otherwise estimate from blocks)
    const timeoutMinutes = swapRequest.timeoutMinutes || Math.max(5, swapRequest.timeoutBlocks * 0.5); // Estimate 30 seconds per block
    const timeoutTimestamp = new Date(now.getTime() + timeoutMinutes * 60 * 1000);
    
    this.logger.info('🔄 Initiating enhanced atomic swap via FinP2P protocol:', {
      swapId,
      initiator: swapRequest.initiatorFinId,
      responder: swapRequest.responderFinId,
      initiatorOffer: swapRequest.initiatorAsset,
      responderOffer: swapRequest.responderAsset,
      timeoutBlocks: swapRequest.timeoutBlocks,
      timeoutMinutes,
      autoRollback: swapRequest.autoRollback ?? true
    });

    // Create comprehensive swap object
    const swap: AtomicSwap = {
      swapId,
      initiatorFinId: swapRequest.initiatorFinId,
      responderFinId: swapRequest.responderFinId,
      initiatorAsset: {
        ...swapRequest.initiatorAsset,
        requiredConfirmations: swapRequest.requiredConfirmations?.[swapRequest.initiatorAsset.chain] || 3
      },
      responderAsset: {
        ...swapRequest.responderAsset,
        requiredConfirmations: swapRequest.requiredConfirmations?.[swapRequest.responderAsset.chain] || 3
      },
      status: AtomicSwapStatus.PENDING,
      progress: {
        stage: AtomicSwapStage.INITIATED,
        percentage: 10,
        description: 'Atomic swap initiated - waiting for asset locking to begin',
        lastUpdated: now,
        subStages: {
          'swap_initiated': { completed: true, timestamp: now },
          'initiator_lock_pending': { completed: false },
          'responder_lock_pending': { completed: false },
          'completion_pending': { completed: false },
          'ownership_transfer_pending': { completed: false }
        }
      },
      timeout: {
        timeoutBlocks: swapRequest.timeoutBlocks,
        timeoutTimestamp,
        isExpired: false,
        blockchainTimeouts: {
          [swapRequest.initiatorAsset.chain]: {
            blocks: Math.floor(swapRequest.timeoutBlocks * 0.6), // 60% of total timeout
            timestamp: new Date(now.getTime() + timeoutMinutes * 0.6 * 60 * 1000)
          },
          [swapRequest.responderAsset.chain]: {
            blocks: Math.floor(swapRequest.timeoutBlocks * 0.6),
            timestamp: new Date(now.getTime() + timeoutMinutes * 0.6 * 60 * 1000)
          }
        }
      },
      rollback: {
        canRollback: false,
        assetsToUnlock: {
          [swapRequest.initiatorAsset.chain]: { required: false, completed: false },
          [swapRequest.responderAsset.chain]: { required: false, completed: false }
        }
      },
      createdAt: now,
      updatedAt: now,
      events: [{
        id: `${swapId}_initiated`,
        swapId,
        type: 'initiated',
        message: 'Atomic swap initiated and ready for asset locking',
        timestamp: now,
        metadata: {
          initiatorChain: swapRequest.initiatorAsset.chain,
          responderChain: swapRequest.responderAsset.chain,
          timeoutBlocks: swapRequest.timeoutBlocks
        }
      }]
    };

    // Store enhanced swap details
    this.mockSwaps.set(swapId, swap);

    // Start timeout monitoring
    this.startSwapTimeoutMonitoring(swapId, swapRequest.autoRollback ?? true);

    // Emit swap initiated event for adapters to listen
    this.emit('atomicSwapInitiated', {
      swapId,
      ...swapRequest,
      swap
    });

    return {
      swapId,
      status: AtomicSwapStatus.PENDING,
      progress: swap.progress,
      estimatedCompletionTime: new Date(now.getTime() + timeoutMinutes * 0.7 * 60 * 1000), // Estimate 70% of timeout
      nextAction: 'Waiting for both chains to lock assets'
    };
  }

  /**
   * Lock assets for atomic swap (called by adapters) - Enhanced Version
   */
  async lockSwapAssets(swapId: string, chain: string, txHash: string): Promise<void> {
    this.logger.info('🔒 Assets locked for atomic swap:', {
      swapId,
      chain,
      txHash
    });

    const swap = this.mockSwaps.get(swapId);
    if (!swap) {
      throw new Error(`Swap ${swapId} not found`);
    }

    const now = new Date();
    
    // Update asset lock information
    if (swap.initiatorAsset.chain === chain) {
      swap.initiatorAsset.lockTxHash = txHash;
      swap.progress.subStages['initiator_lock_pending'].completed = true;
      swap.progress.subStages['initiator_lock_pending'].txHash = txHash;
      swap.progress.subStages['initiator_lock_pending'].timestamp = now;
    } else if (swap.responderAsset.chain === chain) {
      swap.responderAsset.lockTxHash = txHash;
      swap.progress.subStages['responder_lock_pending'].completed = true;
      swap.progress.subStages['responder_lock_pending'].txHash = txHash;
      swap.progress.subStages['responder_lock_pending'].timestamp = now;
    }

    // Check if both assets are locked
    const bothLocked = swap.initiatorAsset.lockTxHash && swap.responderAsset.lockTxHash;
    
    if (bothLocked) {
      swap.status = AtomicSwapStatus.LOCKED;
      swap.progress.stage = AtomicSwapStage.ASSETS_LOCKED;
      swap.progress.percentage = 70;
      swap.progress.description = 'Both assets locked successfully - ready for completion';
      swap.rollback.canRollback = true;
      swap.rollback.assetsToUnlock[chain].required = true;
    } else {
      swap.status = swap.initiatorAsset.lockTxHash ? AtomicSwapStatus.LOCKING_RESPONDER : AtomicSwapStatus.LOCKING_INITIATOR;
      swap.progress.percentage = 40;
      swap.progress.description = `Asset locked on ${chain} - waiting for counterparty`;
    }

    swap.updatedAt = now;
    
    // Add event
    swap.events.push({
      id: `${swapId}_lock_${chain}`,
      swapId,
      type: 'lock_completed',
      chain,
      txHash,
      message: `Assets locked on ${chain}`,
      timestamp: now
    });

    this.mockSwaps.set(swapId, swap);
    
    this.emit('atomicSwapLocked', {
      swapId,
      chain,
      txHash,
      swap
    });
  }

  /**
   * Complete atomic swap (called by adapters) - Enhanced Version
   */
  async completeAtomicSwap(swapId: string, completeTxHash: string): Promise<void> {
    this.logger.info('✅ Atomic swap completed:', {
      swapId,
      completeTxHash
    });

    const swap = this.mockSwaps.get(swapId);
    if (!swap) {
      throw new Error(`Swap ${swapId} not found`);
    }

    const now = new Date();
    
    swap.status = AtomicSwapStatus.COMPLETED;
    swap.progress.stage = AtomicSwapStage.SWAP_COMPLETED;
    swap.progress.percentage = 100;
    swap.progress.description = 'Atomic swap completed successfully - ownership transferred';
    swap.completedAt = now;
    swap.updatedAt = now;
    
    // Update sub-stages
    swap.progress.subStages['completion_pending'].completed = true;
    swap.progress.subStages['completion_pending'].txHash = completeTxHash;
    swap.progress.subStages['completion_pending'].timestamp = now;
    swap.progress.subStages['ownership_transfer_pending'].completed = true;
    swap.progress.subStages['ownership_transfer_pending'].timestamp = now;
    
    // Add completion event
    swap.events.push({
      id: `${swapId}_completed`,
      swapId,
      type: 'completed',
      txHash: completeTxHash,
      message: 'Atomic swap completed successfully',
      timestamp: now
    });

    // Transfer ownership in FinP2P
    this.transferOwnership(
      swap.initiatorFinId,
      swap.responderFinId,
      swap.initiatorAsset.assetId,
      swap.initiatorAsset.amount
    );
    
    this.transferOwnership(
      swap.responderFinId,
      swap.initiatorFinId,
      swap.responderAsset.assetId,
      swap.responderAsset.amount
    );

    // Clear timeouts
    this.clearSwapTimeouts(swapId);

    this.mockSwaps.set(swapId, swap);

    this.emit('atomicSwapCompleted', {
      swapId,
      completeTxHash,
      swap
    });
  }

  /**
   * Get enhanced atomic swap status
   */
  async getAtomicSwapStatus(swapId: string): Promise<AtomicSwap | null> {
    const swap = this.mockSwaps.get(swapId);
    if (!swap) {
      return null;
    }

    // Check if swap has expired
    if (!swap.timeout.isExpired && new Date() > swap.timeout.timeoutTimestamp) {
      await this.handleSwapTimeout(swapId, 'timeout');
    }

    return swap;
  }

  /**
   * Start timeout monitoring for atomic swap
   */
  private startSwapTimeoutMonitoring(swapId: string, autoRollback: boolean): void {
    const swap = this.mockSwaps.get(swapId);
    if (!swap) return;

    // Set main timeout
    const timeoutMs = swap.timeout.timeoutTimestamp.getTime() - Date.now();
    if (timeoutMs > 0) {
      const timeoutHandle = setTimeout(async () => {
        await this.handleSwapTimeout(swapId, 'timeout');
      }, timeoutMs);
      
      this.swapTimeouts.set(swapId, timeoutHandle);
    }

    // Set up periodic monitoring (every 30 seconds)
    const monitoringHandle = setInterval(async () => {
      const currentSwap = this.mockSwaps.get(swapId);
      if (!currentSwap || currentSwap.status === AtomicSwapStatus.COMPLETED || currentSwap.status === AtomicSwapStatus.FAILED) {
        this.clearSwapTimeouts(swapId);
        return;
      }

      // Check if swap has expired
      if (!currentSwap.timeout.isExpired && new Date() > currentSwap.timeout.timeoutTimestamp) {
        await this.handleSwapTimeout(swapId, 'timeout');
      }
    }, 30000);

    this.swapMonitoringIntervals.set(swapId, monitoringHandle);
  }

  /**
   * Handle swap timeout and optionally trigger rollback
   */
  private async handleSwapTimeout(swapId: string, reason: 'timeout' | 'failure' | 'manual'): Promise<void> {
    const swap = this.mockSwaps.get(swapId);
    if (!swap || swap.status === AtomicSwapStatus.COMPLETED) {
      return;
    }

    const now = new Date();
    
    this.logger.warn('⏰ Atomic swap timeout detected:', {
      swapId,
      reason,
      currentStatus: swap.status,
      timeoutTimestamp: swap.timeout.timeoutTimestamp,
      currentTime: now
    });

    swap.timeout.isExpired = true;
    swap.status = AtomicSwapStatus.EXPIRED;
    swap.progress.stage = AtomicSwapStage.EXPIRED;
    swap.progress.percentage = 0;
    swap.progress.description = `Swap expired due to ${reason}`;
    swap.updatedAt = now;
    swap.failedAt = now;

    // Add timeout event
    swap.events.push({
      id: `${swapId}_expired`,
      swapId,
      type: 'expired',
      message: `Swap expired due to ${reason}`,
      timestamp: now,
      metadata: { reason }
    });

    // Check if we need to rollback locked assets
    const hasLockedAssets = swap.initiatorAsset.lockTxHash || swap.responderAsset.lockTxHash;
    
    if (hasLockedAssets) {
      swap.rollback.canRollback = true;
      swap.rollback.rollbackReason = reason;
      swap.rollback.rollbackStarted = now;
      
      // Mark assets that need to be unlocked
      if (swap.initiatorAsset.lockTxHash) {
        swap.rollback.assetsToUnlock[swap.initiatorAsset.chain].required = true;
      }
      if (swap.responderAsset.lockTxHash) {
        swap.rollback.assetsToUnlock[swap.responderAsset.chain].required = true;
      }

      // Start rollback process
      await this.executeSwapRollback(swapId);
    }

    this.mockSwaps.set(swapId, swap);
    this.clearSwapTimeouts(swapId);

    this.emit('atomicSwapExpired', {
      swapId,
      reason,
      swap
    });
  }

  /**
   * Execute rollback for failed/expired swap
   */
  private async executeSwapRollback(swapId: string): Promise<void> {
    const swap = this.mockSwaps.get(swapId);
    if (!swap || !swap.rollback.canRollback) {
      return;
    }

    const now = new Date();
    
    this.logger.info('🔄 Starting atomic swap rollback:', {
      swapId,
      reason: swap.rollback.rollbackReason,
      assetsToUnlock: swap.rollback.assetsToUnlock
    });

    swap.status = AtomicSwapStatus.ROLLING_BACK;
    swap.progress.stage = AtomicSwapStage.ROLLING_BACK;
    swap.progress.percentage = 20;
    swap.progress.description = 'Rolling back locked assets...';
    swap.updatedAt = now;

    // Add rollback event
    swap.events.push({
      id: `${swapId}_rollback_started`,
      swapId,
      type: 'rollback_started',
      message: `Rollback started due to ${swap.rollback.rollbackReason}`,
      timestamp: now
    });

    // Emit rollback events for adapters to handle
    this.emit('atomicSwapRollback', {
      swapId,
      swap,
      assetsToUnlock: swap.rollback.assetsToUnlock
    });

    // In a real implementation, we would wait for adapters to confirm asset unlocking
    // For now, we'll simulate successful rollback after a short delay
    setTimeout(() => {
      this.completeSwapRollback(swapId);
    }, 2000);

    this.mockSwaps.set(swapId, swap);
  }

  /**
   * Complete swap rollback process
   */
  private completeSwapRollback(swapId: string): void {
    const swap = this.mockSwaps.get(swapId);
    if (!swap) return;

    const now = new Date();
    
    swap.status = AtomicSwapStatus.ROLLED_BACK;
    swap.progress.stage = AtomicSwapStage.ROLLED_BACK;
    swap.progress.percentage = 100;
    swap.progress.description = 'Assets successfully rolled back';
    swap.rollback.rollbackCompleted = now;
    swap.updatedAt = now;

    // Mark all assets as unlocked (in real implementation, this would be based on actual unlock transactions)
    Object.keys(swap.rollback.assetsToUnlock).forEach(chain => {
      swap.rollback.assetsToUnlock[chain].completed = true;
    });

    // Add rollback completion event
    swap.events.push({
      id: `${swapId}_rollback_completed`,
      swapId,
      type: 'rollback_completed',
      message: 'Assets successfully rolled back to original owners',
      timestamp: now
    });

    this.mockSwaps.set(swapId, swap);

    this.logger.info('✅ Atomic swap rollback completed:', {
      swapId,
      rollbackDuration: now.getTime() - (swap.rollback.rollbackStarted?.getTime() || 0)
    });

    this.emit('atomicSwapRolledBack', {
      swapId,
      swap
    });
  }

  /**
   * Clear all timeouts for a swap
   */
  private clearSwapTimeouts(swapId: string): void {
    const timeout = this.swapTimeouts.get(swapId);
    if (timeout) {
      clearTimeout(timeout);
      this.swapTimeouts.delete(swapId);
    }

    const interval = this.swapMonitoringIntervals.get(swapId);
    if (interval) {
      clearInterval(interval);
      this.swapMonitoringIntervals.delete(swapId);
    }
  }

  /**
   * Transfer ownership (internal FinP2P operation)
   */
  private transferOwnership(fromFinId: string, toFinId: string, assetId: string, amount: string): void {
    this.logger.info('📝 Updating FinP2P ownership records:', {
      from: fromFinId,
      to: toFinId,
      asset: assetId,
      amount
    });

    // Update mock ownership data
    const ownershipKey = `${toFinId}:${assetId}`;
    this.mockOwnership.set(ownershipKey, {
      finId: toFinId,
      assetId,
      amount,
      updatedAt: new Date().toISOString()
    });
    
    // Remove from previous owner
    const previousOwnershipKey = `${fromFinId}:${assetId}`;
    this.mockOwnership.delete(previousOwnershipKey);
  }

  public async start(): Promise<void> {
    if (this.isStarted || this.isStarting) {
      this.logger.warn('Router is already started or starting');
      return;
    }

    this.isStarting = true;

    try {
      this.logger.info('🚀 Starting FinP2P SDK Router...', { 
        routerId: this.config.routerId,
        mode: this.config.mockMode ? 'development_mock' : 'production'
      });

      if (!this.config.mockMode) {
        // Initialize real FinP2P SDK
        this.sdk = new Sdk({
          orgId: this.config.orgId,
          custodianOrgId: this.config.custodianOrgId,
          owneraAPIAddress: this.config.owneraAPIAddress,
          owneraOssURL: this.config.owneraOssURL,
          owneraFinp2pURL: this.config.owneraFinp2pURL,
          authConfig: this.config.authConfig
        });

                 // Note: SDK connect method may need implementation
         // await this.sdk.connect();
         this.logger.info('✅ FinP2P SDK initialized (connect method may need implementation)');
      } else {
        this.logger.info('🎭 Running in mock mode for development/dissertation');
      }

      // Start HTTP server
      const host = this.config.host!; // We ensure host is defined in constructor
      this.server = this.app.listen(this.config.port, host, () => {
        this.logger.info(`🌐 FinP2P SDK Router listening on ${host}:${this.config.port}`);
        this.logger.info(`🎯 Mode: ${this.config.mockMode ? 'Mock (Development)' : 'Production'}`);
      });

      this.routerInfo.status = RouterStatus.ONLINE;
      this._isRunning = true;
      this.isStarted = true;

      this.emit('started');
    } catch (error) {
      this.logger.error('❌ Failed to start router:', error);
      throw error;
    } finally {
      this.isStarting = false;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    try {
      this.logger.info('🛑 Stopping FinP2P SDK Router...');

      this._isRunning = false;
      this.routerInfo.status = RouterStatus.OFFLINE;

             if (this.sdk) {
         // Note: SDK disconnect method may need implementation
         // await this.sdk.disconnect();
         this.logger.info('FinP2P SDK cleanup (disconnect method may need implementation)');
       }

      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server!.close(() => resolve());
        });
      }

      this.isStarted = false;
      this.emit('stopped');
    } catch (error) {
      this.logger.error('❌ Error stopping router:', error);
      throw error;
    }
  }

  // Getters
  public get isRunning(): boolean {
    return this._isRunning;
  }

  public getRouterInfo(): IRouter {
    return this.routerInfo;
  }

  /**
   * Get wallet address for a FinID and chain (for blockchain adapters)
   */
  public async getWalletAddress(finId: string, chain: string): Promise<string | null> {
    if (this.config.mockMode) {
      const walletMap = this.mockWalletMappings.get(finId);
      return walletMap?.get(chain) || null;
    } else {
      // Real implementation would query FinP2P SDK
      throw new Error('Real FinP2P integration not implemented yet');
    }
  }

  /**
   * Check if a FinID owns an asset (for blockchain adapters)
   */
  public async checkOwnership(finId: string, assetId: string): Promise<boolean> {
    if (this.config.mockMode) {
      return this.mockOwnership.has(`${finId}:${assetId}`);
    } else {
      // Real implementation would query FinP2P SDK
      throw new Error('Real FinP2P integration not implemented yet');
    }
  }

  /**
   * Resolve FinID to wallet information across all supported chains
   * This method returns wallet addresses for all supported blockchains
   */
  public async resolveFinId(finId: string): Promise<{
    ethereumAddress?: string;
    suiAddress?: string;
    hederaAccountId?: string;
  }> {
    try {
      if (this.config.mockMode) {
        // Return mock wallet data for all chains
        const userWallets = this.mockWalletMappings.get(finId);
        if (!userWallets) {
          throw new Error(`FinID not found: ${finId}`);
        }
        
        return {
          ethereumAddress: userWallets.get('ethereum') || undefined,
          suiAddress: userWallets.get('sui') || undefined,
          hederaAccountId: userWallets.get('hedera') || undefined
        };
      }
      
      // Real FinP2P SDK implementation would go here
      this.logger.warn('Real FinP2P SDK resolveFinId not implemented');
      throw new Error(`FinID not found: ${finId}`);
    } catch (error) {
      this.logger.error('Error resolving FinID:', error);
      throw error;
    }
  }
}
