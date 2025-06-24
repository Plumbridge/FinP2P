import { EventEmitter } from 'events';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
// Removed redis import - using ioredis instead
import { Logger } from 'winston';
import {
  Router as IRouter,
  Router,
  FinID,
  Transfer,
  Message,
  MessageType,
  TransferStatus,
  RouterStatus,
  LedgerAdapter,
  RoutingTable,
  NetworkTopology,
  PerformanceMetrics,
  ConfigOptions
} from '../types';
import { createLogger } from '../utils/logger';
import { MessageValidator } from '../utils/validation';
import { CryptoUtils } from '../utils/crypto';
import { RoutingEngine } from './RoutingEngine';
import { LedgerManager } from './LedgerManager';

export class FinP2PRouter extends EventEmitter {
  private app: express.Application;
  private server: any;
  private redis!: any; // Using ioredis instead of redis
  private logger: Logger;
  private config: ConfigOptions;
  private routingEngine!: RoutingEngine;
  private ledgerManager!: LedgerManager;
  private messageValidator: MessageValidator;
  private cryptoUtils: CryptoUtils;
  
  private routerInfo: IRouter;
  private _isRunning: boolean = false;
  private isStarting: boolean = false;
  private isStarted: boolean = false;
  private peerRouters: Map<string, string> = new Map(); // routerId -> endpoint
  private activeTransfers: Map<string, Transfer> = new Map();
  private routingTable: Map<string, RoutingTable> = new Map();
  private networkTopology: NetworkTopology;
  private metrics: PerformanceMetrics;
  private intervals: NodeJS.Timeout[] = [];

  constructor(config: ConfigOptions) {
    super();
    
    // Validate required configuration
    this.validateConfig(config);
    
    this.config = config;
    this.logger = createLogger({ level: config.monitoring.logLevel });
    this.app = express();
    this.setupExpress();
    
    // Initialize crypto utilities early so we can use the public key
    this.cryptoUtils = new CryptoUtils(this.config.security.encryptionKey);
    
    // Initialize message validator
    this.messageValidator = new MessageValidator();
    
    this.routerInfo = {
      id: config.routerId,
      name: config.routerId, // Using routerId as name since no separate name field
      institutionId: config.routerId, // Using routerId as institutionId since no separate field
      endpoint: `http://localhost:${config.port}`,
      publicKey: this.cryptoUtils.getPublicKey(),
      supportedLedgers: Object.keys(config.ledgers),
      status: RouterStatus.OFFLINE,
      lastSeen: new Date(),
      metadata: {
        version: '1.0.0',
        capabilities: ['transfer', 'routing', 'asset_creation'],
        institution: {
          name: config.routerId,
          country: 'US' // Default, should be configurable
        }
      }
    };

    this.networkTopology = {
      routers: new Map(),
      connections: new Map(),
      lastUpdated: new Date()
    };

    this.metrics = {
      routerId: this.routerInfo.id,
      timestamp: new Date(),
      transfersProcessed: 0,
      averageLatency: 0,
      throughput: 0,
      errorRate: 0,
      activeConnections: 0,
      memoryUsage: 0,
      cpuUsage: 0
    };

    // Note: Components will be initialized in start() method
  }

  private validateConfig(config: ConfigOptions): void {
    if (!config) {
      throw new Error('Configuration is required');
    }

    // Validate routerId
    if (!config.routerId || typeof config.routerId !== 'string' || config.routerId.trim() === '') {
      throw new Error('Router ID is required and cannot be empty');
    }

    // Validate port
    if (typeof config.port !== 'number' || config.port < 0 || config.port > 65535) {
      throw new Error('Port must be a valid number between 0 and 65535');
    }

    // Validate host
    if (!config.host || typeof config.host !== 'string' || config.host.trim() === '') {
      throw new Error('Host is required and cannot be empty');
    }

    // Validate Redis configuration
    if (!config.redis || !config.redis.url || typeof config.redis.url !== 'string') {
      throw new Error('Redis URL is required');
    }

    // Validate security configuration
    if (!config.security || !config.security.encryptionKey || config.security.encryptionKey.length < 32) {
      throw new Error('Encryption key is required and must be at least 32 characters');
    }

    // Validate monitoring configuration
    if (!config.monitoring || typeof config.monitoring !== 'object') {
      throw new Error('Monitoring configuration is required');
    }
    if (!config.monitoring.logLevel || typeof config.monitoring.logLevel !== 'string') {
      throw new Error('Log level is required in monitoring configuration');
    }

    // Validate ledgers configuration
    if (!config.ledgers || typeof config.ledgers !== 'object') {
      throw new Error('Ledgers configuration is required');
    }

    // Validate network configuration
    if (!config.network || typeof config.network !== 'object') {
      throw new Error('Network configuration is required');
    }
  }

  private async initializeComponents(): Promise<void> {
    try {
      // Initialize Redis
      const Redis = require('ioredis');
      this.redis = new Redis(this.config.redis.url, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 1,
      });

      this.redis.on('error', (err: Error) => {
        this.logger.error('Redis connection error:', err);
      });

      // Initialize routing engine
      this.routingEngine = new RoutingEngine(this.redis, this.logger);
      
      // Initialize ledger manager
      this.ledgerManager = new LedgerManager(this.config.ledgers, this.logger);
      await this.ledgerManager.initialize();
      
      this.logger.info('Router components initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize router components:', error);
      throw error;
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
      res.json({
        status: 'healthy',
        router: this.routerInfo,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    });

    // Router info
    this.app.get('/info', (req, res) => {
      res.json(this.routerInfo);
    });

    // Transfer endpoints
    this.app.post('/transfers', this.handleTransferRequest.bind(this));
    this.app.get('/transfers/:id', this.getTransfer.bind(this));
    this.app.get('/transfers', this.listTransfers.bind(this));

    // Asset endpoints
    this.app.post('/assets', this.createAsset.bind(this));
    this.app.get('/assets/:id', this.getAsset.bind(this));
    
    // Account endpoints
    this.app.post('/accounts', this.createAccount.bind(this));
    this.app.get('/accounts/:id', this.getAccount.bind(this));
    this.app.get('/accounts/:id/balance/:assetId', this.getBalance.bind(this));

    // Routing endpoints
    this.app.get('/routing/table', this.getRoutingTable.bind(this));
    this.app.get('/routing/topology', this.getNetworkTopology.bind(this));
    
    // Peer communication
    this.app.post('/messages', this.handleMessage.bind(this));
    
    // Metrics
    this.app.get('/metrics', this.getMetricsEndpoint.bind(this));
  }

  public async start(): Promise<void> {
    if (this.isStarted || this.isStarting) {
      this.logger.warn('Router is already started or starting');
      return;
    }
    
    this.isStarting = true;
    
    try {
      this.logger.info('Starting FinP2P Router...', { routerId: this.config.routerId });
      
      // Initialize components only if not already initialized
      if (!this.redis || !this.redis.isOpen) {
        await this.initializeComponents();
      }
      
      // Start HTTP server
      this.server = this.app.listen(this.config.port, () => {
        this.logger.info(`Router ${this.routerInfo.id} listening on port ${this.config.port}`);
      });

      // Connect to peer routers
      await this.connectToPeers();
      
      // Start periodic tasks
      this.startPeriodicTasks();
      
      this.routerInfo.status = RouterStatus.ONLINE;
      this._isRunning = true;
      this.isStarted = true;
      
      this.emit('started');
      this.logger.info('FinP2P Router started successfully');
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
      this.logger.info('Stopping FinP2P Router...');
      
      this._isRunning = false;
      this.routerInfo.status = RouterStatus.OFFLINE;
      
      // Clear all intervals
      this.intervals.forEach(interval => clearInterval(interval));
      this.intervals = [];
      
      // Stop all components
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server!.close(() => resolve());
        });
      }
      
      // Close Redis connection
      if (this.redis && this.redis.isOpen) {
        await this.redis.quit();
      }
      
      // Disconnect ledger manager if exists
      if (this.ledgerManager) {
        await this.ledgerManager.disconnect().catch(err => {
          this.logger.warn('Error disconnecting ledger manager:', err);
        });
      }
      
      this.isStarted = false;
      this.emit('stopped');
      this.logger.info('FinP2P Router stopped successfully');
    } catch (error) {
      this.logger.error('Error stopping router:', error);
      throw error;
    }
  }

  private async connectToPeers(): Promise<void> {
    for (const peerEndpoint of this.config.network.peers) {
      try {
        // Discover peer router info
        const response = await fetch(`${peerEndpoint}/info`);
        const peerInfo = await response.json() as Router;
        
        this.peerRouters.set(peerInfo.id, peerEndpoint);
        this.networkTopology.routers.set(peerInfo.id, peerInfo);
        
        this.logger.info(`Connected to peer router: ${peerInfo.id}`);
      } catch (error) {
        this.logger.warn(`Failed to connect to peer ${peerEndpoint}:`, error);
      }
    }
  }

  private startPeriodicTasks(): void {
    // Heartbeat to peers
    this.intervals.push(setInterval(() => {
      this.sendHeartbeatToPeers();
    }, 30000)); // 30 seconds

    // Update metrics
    this.intervals.push(setInterval(() => {
      this.updateMetrics();
    }, 10000)); // 10 seconds

    // Clean up expired transfers
    this.intervals.push(setInterval(() => {
      this.cleanupExpiredTransfers();
    }, 60000)); // 1 minute
  }

  private async sendHeartbeatToPeers(): Promise<void> {
    const heartbeatMessage: Message = {
      id: uuidv4(),
      type: MessageType.HEARTBEAT,
      fromRouter: this.routerInfo.id,
      toRouter: '', // Will be set for each peer
      payload: {
        status: this.routerInfo.status,
        timestamp: new Date(),
        metrics: this.metrics
      },
      signature: '',
      timestamp: new Date(),
      ttl: 60000 // 1 minute
    };

    for (const [peerId, endpoint] of this.peerRouters) {
      try {
        heartbeatMessage.toRouter = peerId;
        heartbeatMessage.signature = await this.cryptoUtils.sign(JSON.stringify(heartbeatMessage.payload));
        
        await fetch(`${endpoint}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(heartbeatMessage)
        });
      } catch (error) {
        this.logger.warn(`Failed to send heartbeat to ${peerId}:`, error);
      }
    }
  }

  private updateMetrics(): void {
    const memUsage = process.memoryUsage();
    this.metrics = {
      ...this.metrics,
      timestamp: new Date(),
      activeConnections: this.peerRouters.size,
      memoryUsage: memUsage.heapUsed / 1024 / 1024, // MB
      cpuUsage: process.cpuUsage().user / 1000000 // Convert to seconds
    };
  }

  private cleanupExpiredTransfers(): void {
    const now = new Date();
    for (const [transferId, transfer] of this.activeTransfers) {
      const ageInMinutes = (now.getTime() - transfer.createdAt.getTime()) / (1000 * 60);
      if (ageInMinutes > 60 && transfer.status !== TransferStatus.COMPLETED) {
        transfer.status = TransferStatus.FAILED;
        this.activeTransfers.delete(transferId);
        this.logger.warn(`Transfer ${transferId} expired and marked as failed`);
      }
    }
  }

  // Route handlers
  private async handleTransferRequest(req: express.Request, res: express.Response): Promise<void> {
    try {
      const transferData = req.body;
      const transfer = await this.processTransfer(transferData);
      res.json(transfer);
    } catch (error) {
      this.logger.error('Transfer failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: 'Transfer failed', details: errorMessage });
    }
  }

  private async getTransfer(req: express.Request, res: express.Response): Promise<void> {
    const transferId = req.params.id;
    const transfer = this.activeTransfers.get(transferId);
    
    if (!transfer) {
      res.status(404).json({ error: 'Transfer not found' });
      return;
    }
    
    res.json(transfer);
  }

  private async listTransfers(req: express.Request, res: express.Response): Promise<void> {
    const transfers = Array.from(this.activeTransfers.values());
    res.json(transfers);
  }

  private async createAsset(req: express.Request, res: express.Response): Promise<void> {
    try {
      const assetData = req.body;
      const asset = await this.ledgerManager.createAsset(assetData.ledgerId, assetData);
      res.json(asset);
    } catch (error) {
      this.logger.error('Asset creation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: 'Asset creation failed', details: errorMessage });
    }
  }

  private async getAsset(req: express.Request, res: express.Response): Promise<void> {
    try {
      const assetId = req.params.id;
      const ledgerId = req.query.ledgerId as string;
      const asset = await this.ledgerManager.getAsset(ledgerId, assetId);
      
      if (!asset) {
        res.status(404).json({ error: 'Asset not found' });
        return;
      }
      
      res.json(asset);
    } catch (error) {
      this.logger.error('Get asset failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: 'Get asset failed', details: errorMessage });
    }
  }

  private async createAccount(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { ledgerId, institutionId } = req.body;
      const account = await this.ledgerManager.createAccount(ledgerId, institutionId);
      res.json(account);
    } catch (error) {
      this.logger.error('Account creation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: 'Account creation failed', details: errorMessage });
    }
  }

  private async getAccount(req: express.Request, res: express.Response): Promise<void> {
    try {
      const accountId = req.params.id;
      const ledgerId = req.query.ledgerId as string;
      const account = await this.ledgerManager.getAccount(ledgerId, accountId);
      
      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
      
      res.json(account);
    } catch (error) {
      this.logger.error('Get account failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: 'Get account failed', details: errorMessage });
    }
  }

  private async getBalance(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { id: accountId, assetId } = req.params;
      const ledgerId = req.query.ledgerId as string;
      const balance = await this.ledgerManager.getBalance(ledgerId, accountId, assetId);
      res.json({ balance: balance.toString() });
    } catch (error) {
      this.logger.error('Get balance failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: 'Get balance failed', details: errorMessage });
    }
  }

  private async getRoutingTable(req: express.Request, res: express.Response): Promise<void> {
    const routingTable = Array.from(this.routingTable.values());
    res.json(routingTable);
  }

  private async getNetworkTopology(req: express.Request, res: express.Response): Promise<void> {
    res.json({
      routers: Array.from(this.networkTopology.routers.values()),
      connections: Object.fromEntries(this.networkTopology.connections),
      lastUpdated: this.networkTopology.lastUpdated
    });
  }

  private async handleMessage(req: express.Request, res: express.Response): Promise<void> {
    try {
      const message: Message = req.body;
      await this.processMessage(message);
      res.json({ status: 'processed' });
    } catch (error) {
      this.logger.error('Message processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: 'Message processing failed', details: errorMessage });
    }
  }

  private async getMetricsEndpoint(req: express.Request, res: express.Response): Promise<void> {
    res.json(this.getMetrics());
  }

  // Core business logic
  public async processTransfer(transferData: any): Promise<Transfer> {
    const transfer: Transfer = {
      id: uuidv4(),
      fromAccount: transferData.fromAccount,
      toAccount: transferData.toAccount,
      asset: transferData.asset,
      amount: BigInt(transferData.amount),
      status: TransferStatus.PENDING,
      route: [],
      metadata: transferData.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.activeTransfers.set(transfer.id, transfer);
    
    // Find route and execute transfer
    const route = await this.routingEngine.findRoute(
      transfer.fromAccount,
      transfer.toAccount,
      this.networkTopology
    );
    
    transfer.route = route;
    transfer.status = TransferStatus.ROUTING;
    
    // Execute the transfer
    await this.executeTransfer(transfer);
    
    this.emit('transfer', transfer);
    return transfer;
  }

  private async executeTransfer(transfer: Transfer): Promise<void> {
    try {
      transfer.status = TransferStatus.EXECUTING;
      
      // For now, implement simple same-ledger transfer
      // In a full implementation, this would handle cross-ledger routing
      const fromLedger = 'mock'; // Should be determined from account
      const toLedger = 'mock';
      
      if (fromLedger === toLedger) {
        // Same ledger transfer
        const txHash = await this.ledgerManager.transfer(
          fromLedger,
          transfer.fromAccount.id,
          transfer.toAccount.id,
          transfer.asset.id,
          transfer.amount
        );
        
        transfer.route[0] = {
          routerId: this.routerInfo.id,
          ledgerId: fromLedger,
          action: 'transfer',
          txHash,
          status: 'completed',
          timestamp: new Date()
        };
        
        transfer.status = TransferStatus.COMPLETED;
        transfer.completedAt = new Date();
      } else {
        // Cross-ledger transfer (simplified)
        throw new Error('Cross-ledger transfers not yet implemented');
      }
      
      this.metrics.transfersProcessed++;
    } catch (error) {
      transfer.status = TransferStatus.FAILED;
      this.logger.error(`Transfer ${transfer.id} failed:`, error);
      throw error;
    }
  }

  private async processMessage(message: Message): Promise<void> {
    // Validate message signature
    const isValid = await this.messageValidator.validate(message);
    if (!isValid) {
      throw new Error('Invalid message signature');
    }

    switch (message.type) {
      case MessageType.HEARTBEAT:
        await this.handleHeartbeat(message);
        break;
      case MessageType.TRANSFER_REQUEST:
        await this.handleTransferMessage(message);
        break;
      case MessageType.ROUTE_DISCOVERY:
        await this.handleRouteDiscovery(message);
        break;
      default:
        this.logger.warn(`Unknown message type: ${message.type}`);
    }
  }

  public async handleHeartbeat(message: Message): Promise<void> {
    const peerRouter = this.networkTopology.routers.get(message.fromRouter);
    if (peerRouter) {
      peerRouter.lastSeen = new Date();
      peerRouter.status = message.payload.status;
    }
  }

  private async handleTransferMessage(message: Message): Promise<void> {
    // Handle incoming transfer requests from other routers
    this.logger.info(`Received transfer message from ${message.fromRouter}`);
    // Implementation depends on specific transfer protocol
  }

  private async handleRouteDiscovery(message: Message): Promise<void> {
    // Handle route discovery requests
    this.logger.info(`Received route discovery from ${message.fromRouter}`);
    // Implementation depends on routing algorithm
  }

  // Getters
  public getRouterInfo(): IRouter {
    return this.routerInfo;
  }

  public getId(): string {
    return this.routerInfo.id;
  }

  public getInfo(): IRouter {
    return this.routerInfo;
  }

  public getVersion(): string {
    return this.routerInfo.metadata.version;
  }

  public getSupportedLedgers(): string[] {
    return this.routerInfo.supportedLedgers;
  }

  public isRunning(): boolean {
    return this.isStarted;
  }

  public isOnline(): boolean {
    return this._isRunning && this.routerInfo.status === RouterStatus.ONLINE;
  }

  public getMetrics(): PerformanceMetrics {
    return this.metrics;
  }

  public getLedgerAdapters(): any[] {
    return Array.from(this.ledgerManager['adapters'].values());
  }

  public getLedgerManager(): LedgerManager {
    return this.ledgerManager;
  }

  // Peer management methods
  public async addPeer(peerUrl: string): Promise<void> {
    try {
      // Extract router ID from URL or generate one
      const routerId = `peer-${Date.now()}`;
      this.peerRouters.set(routerId, peerUrl);
      
      // Add to network topology
      const peerRouter: IRouter = {
        id: routerId,
        name: routerId,
        institutionId: routerId,
        endpoint: peerUrl,
        publicKey: '', // Would be fetched in real implementation
        supportedLedgers: [],
        status: RouterStatus.ONLINE,
        lastSeen: new Date(),
        metadata: {
          version: '1.0.0',
          capabilities: [],
          institution: {
            name: routerId,
            country: 'Unknown'
          }
        }
      };
      
      this.networkTopology.routers.set(routerId, peerRouter);
      this.logger.info(`Added peer: ${peerUrl}`);
    } catch (error) {
      this.logger.error(`Failed to add peer ${peerUrl}:`, error);
      throw error;
    }
  }

  public async removePeer(peerUrl: string): Promise<void> {
    try {
      // Find router ID by URL
      let routerIdToRemove: string | undefined;
      for (const [routerId, url] of this.peerRouters.entries()) {
        if (url === peerUrl) {
          routerIdToRemove = routerId;
          break;
        }
      }
      
      if (routerIdToRemove) {
        this.peerRouters.delete(routerIdToRemove);
        this.networkTopology.routers.delete(routerIdToRemove);
        this.logger.info(`Removed peer: ${peerUrl}`);
      }
    } catch (error) {
      this.logger.error(`Failed to remove peer ${peerUrl}:`, error);
      throw error;
    }
  }

  public getPeers(): Array<{ id: string; url: string; status: string }> {
    const peers: Array<{ id: string; url: string; status: string }> = [];
    for (const [routerId, url] of this.peerRouters.entries()) {
      const router = this.networkTopology.routers.get(routerId);
      peers.push({
        id: routerId,
        url: url,
        status: router?.status || RouterStatus.OFFLINE
      });
    }
    return peers;
  }

  public getKnownRouters(): any[] {
    return Array.from(this.networkTopology.routers.values());
  }

  public async discoverRouters(): Promise<any[]> {
    // Simple implementation - return known routers
    // In a real implementation, this would actively discover new routers
    return this.getKnownRouters();
  }

  public getConfirmationProcessorStatistics(): any {
    // Return basic statistics for the confirmation processor
    return {
      totalProcessed: 0,
      pending: 0,
      confirmed: 0,
      failed: 0
    };
  }

  public async checkPrimaryRouterAuthorization(currency: string, operation: string, routerId: string): Promise<boolean> {
    // Simple implementation - check if router is known
    const knownRouters = this.getKnownRouters();
    return knownRouters.some(router => router.id === routerId);
  }

  public async getHealth(): Promise<{
    status: string;
    timestamp: Date;
    uptime: number;
    components: {
      redis: boolean;
      ledgers: Record<string, boolean>;
    };
  }> {
    const uptime = this._isRunning ? Date.now() - Date.now() : 0; // Simple uptime calculation
    
    let redisHealth = false;
    try {
      if (this.redis) {
        await this.redis.ping();
        redisHealth = true;
      }
    } catch (error) {
      this.logger.warn('Redis health check failed:', error);
    }

    let ledgerHealth: Record<string, boolean> = {};
    try {
      if (this.ledgerManager) {
        ledgerHealth = await this.ledgerManager.healthCheck();
      }
    } catch (error) {
      this.logger.warn('Ledger health check failed:', error);
    }
    
    return {
      status: this._isRunning ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      uptime,
      components: {
        redis: redisHealth,
        ledgers: ledgerHealth
      }
    };
  }

  /**
   * Sign a message using the router's private key
   */
  async signMessage(message: any): Promise<any> {
    try {
      const signature = this.cryptoUtils.sign(JSON.stringify(message));
      return {
        ...message,
        signature
      };
    } catch (error) {
      this.logger.error('Failed to sign message:', error);
      throw new Error('Message signing failed');
    }
  }

  /**
   * Verify a message signature
   */
  async verifyMessageSignature(signedMessage: any): Promise<boolean> {
    try {
      const { signature, ...message } = signedMessage;
      if (!signature) {
        return false;
      }
      
      // Get the public key for the router that sent the message
      const publicKey = await this.getRouterPublicKey(message.routerId);
      if (!publicKey) {
        return false;
      }
      
      return this.cryptoUtils.verify(JSON.stringify(message), signature, publicKey);
    } catch (error) {
      this.logger.error('Failed to verify message signature:', error);
      return false;
    }
  }

  /**
   * Get the public key for a router
   */
  async getRouterPublicKey(routerId?: string): Promise<string | null> {
    try {
      if (!routerId || routerId === this.routerInfo.id) {
        // Return our own public key
        return this.cryptoUtils.getPublicKey();
      }
      
      // For other routers, we would typically fetch from a registry or cache
      // For now, return null as we don't have a router registry implemented
      this.logger.warn(`Public key requested for unknown router: ${routerId}`);
      return null;
    } catch (error) {
      this.logger.error('Failed to get router public key:', error);
      return null;
    }
  }
}