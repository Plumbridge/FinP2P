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
  ConfigOptions
} from '../types';
import { createLogger } from '../utils/logger';

export interface FinP2PSDKConfig {
  routerId: string;
  port: number;
  host: string;
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
  // Mock mode for development/dissertation
  mockMode?: boolean;
}

/**
 * FinP2P SDK Router with Credential Mocking Support
 * 
 * This implementation:
 * - Uses the REAL FinP2P SDK structure and patterns
 * - Mocks credentials when needed for development/dissertation
 * - Maintains proper FinP2P ownership model (no asset movement)
 * - Provides FinID to wallet address resolution for blockchain adapters
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
  private mockWalletMappings: Map<string, Map<string, string>> = new Map(); // finId -> chain -> walletAddress
  private mockSwaps: Map<string, any> = new Map(); // swapId -> swap data

  constructor(config: FinP2PSDKConfig) {
    super();

    this.config = config;
    this.logger = createLogger({ level: 'info' });

    this.routerInfo = {
      id: config.routerId,
      name: config.routerId,
      institutionId: config.orgId,
      endpoint: `http://${config.host}:${config.port}`,
      publicKey: config.mockMode ? 'mock-public-key-for-development' : 'real-public-key',
      supportedLedgers: ['ethereum', 'sui', 'hedera'],
      status: RouterStatus.OFFLINE,
      lastSeen: new Date(),
      metadata: {
        version: '1.0.0',
        capabilities: ['ownership_transfer', 'ownership_verification', 'asset_creation', 'user_creation'],
        institution: {
          name: config.orgId,
          country: 'US'
        }
      }
    };

    this.app = express();
    this.setupExpress();
    
    if (config.mockMode) {
      this.initializeMockData();
    }
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
    
    // Mock users with REAL wallet addresses for atomic swap demonstration
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
      // REAL wallet mappings for atomic swap demo
      { 
        finId: 'alice@atomic-swap.demo',
        name: 'Alice (Real Wallet)',
        email: 'alice@atomic-swap.demo',
        wallets: {
          sui: realSuiAddress || '0x000...sui_address_not_available',
          hedera: realHederaAccountId,
          ethereum: '0x000...placeholder'
        }
      },
      { 
        finId: 'bob@atomic-swap.demo',
        name: 'Bob (Real Wallet)', 
        email: 'bob@atomic-swap.demo',
        wallets: {
          sui: realSuiAddress || '0x000...sui_address_not_available', // Same user's wallets for demo
          hedera: realHederaAccountId, // Same user's wallets for demo
          ethereum: '0x000...placeholder'
        }
      }
    ];

    mockUsers.forEach(user => {
      this.mockUsers.set(user.finId, user);
      this.mockWalletMappings.set(user.finId, new Map(Object.entries(user.wallets)));
    });
    
    this.logger.info('🔧 Mock wallet mappings configured:', {
      'alice@atomic-swap.demo': { 
        sui: realSuiAddress ? `${realSuiAddress.substring(0, 10)}...` : 'not-available',
        hedera: realHederaAccountId 
      },
      'bob@atomic-swap.demo': { 
        sui: realSuiAddress ? `${realSuiAddress.substring(0, 10)}...` : 'not-available',
        hedera: realHederaAccountId 
      }
    });

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
        await this.lockSwapAssets(swapId, chain, txHash);
        res.json({ success: true });
      } catch (error) {
        this.logger.error('Failed to lock swap assets:', error);
        res.status(500).json({ error: 'Failed to lock assets' });
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
   * Execute atomic swap between two chains
   * This coordinates the swap protocol between adapters
   */
  async executeAtomicSwap(swapRequest: {
    initiatorFinId: string;
    responderFinId: string;
    initiatorAsset: { chain: string; assetId: string; amount: string };
    responderAsset: { chain: string; assetId: string; amount: string };
    timeoutBlocks: number;
  }): Promise<{
    swapId: string;
    status: 'pending' | 'locked' | 'completed' | 'failed';
    lockTxHash?: string;
    completeTxHash?: string;
  }> {
    const swapId = `atomic_swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.logger.info('🔄 Initiating atomic swap via FinP2P protocol:', {
      swapId,
      initiator: swapRequest.initiatorFinId,
      responder: swapRequest.responderFinId,
      initiatorOffer: swapRequest.initiatorAsset,
      responderOffer: swapRequest.responderAsset
    });

    // Store swap details
    this.mockSwaps.set(swapId, {
      ...swapRequest,
      swapId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      stages: {
        initiated: true,
        locked: false,
        completed: false
      }
    });

    // Emit swap initiated event for adapters to listen
    this.emit('atomicSwapInitiated', {
      swapId,
      ...swapRequest
    });

    return {
      swapId,
      status: 'pending'
    };
  }

  /**
   * Lock assets for atomic swap (called by adapters)
   */
  async lockSwapAssets(swapId: string, chain: string, txHash: string): Promise<void> {
    this.logger.info('🔒 Assets locked for atomic swap:', {
      swapId,
      chain,
      txHash
    });

    const swap = this.mockSwaps.get(swapId);
    if (swap) {
      swap.stages.locked = true;
      swap.lockTxHash = txHash;
      swap.status = 'locked';
      this.mockSwaps.set(swapId, swap);
      this.emit('atomicSwapLocked', {
        swapId,
        chain,
        txHash,
        swap
      });
    }
  }

  /**
   * Complete atomic swap (called by adapters)
   */
  async completeAtomicSwap(swapId: string, completeTxHash: string): Promise<void> {
    this.logger.info('✅ Atomic swap completed:', {
      swapId,
      completeTxHash
    });

    const swap = this.mockSwaps.get(swapId);
    if (swap) {
      swap.stages.completed = true;
      swap.completeTxHash = completeTxHash;
      swap.status = 'completed';
      this.mockSwaps.set(swapId, swap);
      
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

      this.emit('atomicSwapCompleted', {
        swapId,
        completeTxHash,
        swap
      });
    }
  }

  /**
   * Get atomic swap status
   */
  async getAtomicSwapStatus(swapId: string): Promise<any> {
    return this.mockSwaps.get(swapId) || null;
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
      this.server = this.app.listen(this.config.port, this.config.host, () => {
        this.logger.info(`🌐 FinP2P SDK Router listening on ${this.config.host}:${this.config.port}`);
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
}
