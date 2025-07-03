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
}

/**
 * FinP2P Router implementation using the official Ownera FinP2P SDK
 * This replaces the custom router implementation with the real FinP2P SDK
 */
export class FinP2PSDKRouter extends EventEmitter {
  private app: express.Application;
  private server: any;
  private logger: Logger;
  private config: FinP2PSDKConfig;
  private sdk: Sdk;
  private routerInfo: IRouter;
  private _isRunning: boolean = false;
  private isStarting: boolean = false;
  private isStarted: boolean = false;
  private activeTransfers: Map<string, Transfer> = new Map();

  constructor(config: FinP2PSDKConfig) {
    super();
    
    this.validateConfig(config);
    this.config = config;
    this.logger = createLogger({ level: 'info' });
    
    // Initialize the official FinP2P SDK
    this.sdk = new Sdk({
      orgId: config.orgId,
      owneraAPIAddress: config.owneraAPIAddress,
      owneraOssURL: config.owneraOssURL,
      owneraFinp2pURL: config.owneraFinp2pURL,
      authConfig: config.authConfig
    });

    this.routerInfo = {
      id: config.routerId,
      name: config.routerId,
      institutionId: config.orgId,
      endpoint: `http://${config.host}:${config.port}`,
      publicKey: '', // Will be populated from SDK
      supportedLedgers: [], // Will be populated from SDK
      status: RouterStatus.OFFLINE,
      lastSeen: new Date(),
      metadata: {
        version: '1.0.0',
        capabilities: ['transfer', 'routing', 'asset_creation'],
        institution: {
          name: config.orgId,
          country: 'US' // Should be configurable
        }
      }
    };

    this.app = express();
    this.setupExpress();
  }

  private validateConfig(config: FinP2PSDKConfig): void {
    if (!config) {
      throw new Error('Configuration is required');
    }

    const requiredFields = [
      'routerId', 'port', 'host', 'orgId', 'custodianOrgId', 
      'owneraAPIAddress', 'authConfig'
    ];

    for (const field of requiredFields) {
      if (!config[field as keyof FinP2PSDKConfig]) {
        throw new Error(`${field} is required in configuration`);
      }
    }

    if (!config.authConfig.apiKey || !config.authConfig.secret) {
      throw new Error('authConfig must include apiKey and secret');
    }

    if (typeof config.port !== 'number' || config.port < 0 || config.port > 65535) {
      throw new Error('Port must be a valid number between 0 and 65535');
    }
  }

  private setupExpress(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Middleware for request logging
    this.app.use((req, res, next) => {
      this.logger.debug(`${req.method} ${req.path}`, { body: req.body });
      next();
    });

    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      const sdkInfo: any = {};
      if (this.sdk && typeof this.sdk.nodeId !== 'undefined') {
        sdkInfo.nodeId = this.sdk.nodeId;
      }
      if (this.sdk && typeof this.sdk.custodianOrgId !== 'undefined') {
        sdkInfo.custodianOrgId = this.sdk.custodianOrgId;
      }
      
      res.json({
        status: 'healthy',
        router: this.routerInfo,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        sdk: sdkInfo
      });
    });

    // Router info
    this.app.get('/info', (req, res) => {
      res.json(this.routerInfo);
    });

    // SDK-based endpoints
    this.app.post('/users', this.createUser.bind(this));
    this.app.get('/users/:userId', this.getUser.bind(this));
    this.app.post('/assets', this.createAsset.bind(this));
    this.app.get('/assets/:assetId', this.getAsset.bind(this));
    this.app.get('/organization', this.getOrganization.bind(this));

    // Transfer endpoints (custom implementation using SDK)
    this.app.post('/transfers', this.handleTransferRequest.bind(this));
    this.app.get('/transfers/:id', this.getTransfer.bind(this));
    this.app.get('/transfers', this.listTransfers.bind(this));
  }

  // SDK-based methods
  private async createUser(req: express.Request, res: express.Response): Promise<void> {
    try {
      const user = await this.sdk.createUser(req.body);
      res.json(user);
    } catch (error) {
      this.logger.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }

  private async getUser(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { userId } = req.params;
      const user = await this.sdk.getUser({ userId });
      res.json(user);
    } catch (error) {
      this.logger.error('Error getting user:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  }

  private async createAsset(req: express.Request, res: express.Response): Promise<void> {
    try {
      const asset = await this.sdk.createAsset(req.body);
      res.json(asset);
    } catch (error) {
      this.logger.error('Error creating asset:', error);
      res.status(500).json({ error: 'Failed to create asset' });
    }
  }

  private async getAsset(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { assetId } = req.params;
      const asset = await this.sdk.getAsset({ assetId });
      res.json(asset);
    } catch (error) {
      this.logger.error('Error getting asset:', error);
      res.status(500).json({ error: 'Failed to get asset' });
    }
  }

  private async getOrganization(req: express.Request, res: express.Response): Promise<void> {
    try {
      const organization = await this.sdk.getOrganization({});
      res.json(organization);
    } catch (error) {
      this.logger.error('Error getting organization:', error);
      res.status(500).json({ error: 'Failed to get organization' });
    }
  }

  // Transfer methods (custom implementation)
  private async handleTransferRequest(req: express.Request, res: express.Response): Promise<void> {
    try {
      // This would integrate with the SDK's transfer capabilities
      // For now, implementing basic transfer tracking
      const transfer: Transfer = {
        id: `transfer-${Date.now()}`,
        fromAccount: req.body.fromAccount,
        toAccount: req.body.toAccount,
        asset: req.body.asset || req.body.assetId, // Support both property names
        amount: BigInt(req.body.amount),
        status: TransferStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        route: [],
        metadata: req.body.metadata || {}
      };

      this.activeTransfers.set(transfer.id, transfer);
      this.logger.info(`Transfer initiated: ${transfer.id}`);
      
      res.json(transfer);
    } catch (error) {
      this.logger.error('Error handling transfer request:', error);
      res.status(500).json({ error: 'Failed to process transfer' });
    }
  }

  private async getTransfer(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { id } = req.params;
      const transfer = this.activeTransfers.get(id);
      
      if (!transfer) {
        res.status(404).json({ error: 'Transfer not found' });
        return;
      }
      
      res.json(transfer);
    } catch (error) {
      this.logger.error('Error getting transfer:', error);
      res.status(500).json({ error: 'Failed to get transfer' });
    }
  }

  private async listTransfers(req: express.Request, res: express.Response): Promise<void> {
    try {
      const transfers = Array.from(this.activeTransfers.values());
      res.json(transfers);
    } catch (error) {
      this.logger.error('Error listing transfers:', error);
      res.status(500).json({ error: 'Failed to list transfers' });
    }
  }

  public async start(): Promise<void> {
    if (this.isStarted || this.isStarting) {
      this.logger.warn('Router is already started or starting');
      return;
    }
    
    this.isStarting = true;
    
    try {
      this.logger.info('Starting FinP2P SDK Router...', { routerId: this.config.routerId });
      
      // Start HTTP server
      this.server = this.app.listen(this.config.port, this.config.host, () => {
        this.logger.info(`FinP2P SDK Router ${this.routerInfo.id} listening on ${this.config.host}:${this.config.port}`);
      });
      
      this.routerInfo.status = RouterStatus.ONLINE;
      this._isRunning = true;
      this.isStarted = true;
      
      this.emit('started');
      this.logger.info('FinP2P SDK Router started successfully');
    } catch (error) {
      this.logger.error('Failed to start router:', error);
      throw error;
    } finally {
      this.isStarting = false;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isStarted) {
      this.logger.debug('Router is not running');
      return;
    }
    
    try {
      this.logger.info('Stopping FinP2P SDK Router...');
      
      this._isRunning = false;
      this.routerInfo.status = RouterStatus.OFFLINE;
      
      // Stop HTTP server
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server!.close(() => resolve());
        });
      }
      
      this.isStarted = false;
      this.emit('stopped');
      this.logger.info('FinP2P SDK Router stopped successfully');
    } catch (error) {
      this.logger.error('Error stopping router:', error);
      throw error;
    }
  }

  // Getters for compatibility
  public get isRunning(): boolean {
    return this._isRunning;
  }

  public get finp2pSdk(): Sdk {
    return this.sdk;
  }

  public getRouterInfo(): IRouter {
    return this.routerInfo;
  }

  public getActiveTransfers(): Map<string, Transfer> {
    return this.activeTransfers;
  }
}