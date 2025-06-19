"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinP2PRouter = void 0;
const events_1 = require("events");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const uuid_1 = require("uuid");
const redis_1 = require("redis");
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
const validation_1 = require("../utils/validation");
const crypto_1 = require("../utils/crypto");
const RoutingEngine_1 = require("./RoutingEngine");
const LedgerManager_1 = require("./LedgerManager");
class FinP2PRouter extends events_1.EventEmitter {
    constructor(config) {
        super();
        this._isRunning = false;
        this.peerRouters = new Map(); // routerId -> endpoint
        this.activeTransfers = new Map();
        this.routingTable = new Map();
        this.intervals = [];
        // Validate required configuration
        this.validateConfig(config);
        this.config = config;
        this.logger = (0, logger_1.createLogger)({ level: config.monitoring.logLevel });
        this.app = (0, express_1.default)();
        this.setupExpress();
        // Initialize crypto utilities early so we can use the public key
        this.cryptoUtils = new crypto_1.CryptoUtils(this.config.security.encryptionKey);
        // Initialize message validator
        this.messageValidator = new validation_1.MessageValidator();
        this.routerInfo = {
            id: config.routerId,
            name: config.routerId, // Using routerId as name since no separate name field
            institutionId: config.routerId, // Using routerId as institutionId since no separate field
            endpoint: `http://localhost:${config.port}`,
            publicKey: this.cryptoUtils.getPublicKey(),
            supportedLedgers: Object.keys(config.ledgers),
            status: types_1.RouterStatus.OFFLINE,
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
    validateConfig(config) {
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
        if (!config.monitoring || !config.monitoring.logLevel) {
            throw new Error('Monitoring configuration with log level is required');
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
    async initializeComponents() {
        try {
            // Initialize Redis
            this.redis = (0, redis_1.createClient)({ url: this.config.redis.url });
            await this.redis.connect();
            // Initialize routing engine
            this.routingEngine = new RoutingEngine_1.RoutingEngine(this.redis, this.logger);
            // Initialize ledger manager
            this.ledgerManager = new LedgerManager_1.LedgerManager(this.config.ledgers, this.logger);
            await this.ledgerManager.initialize();
            this.logger.info('Router components initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize router components:', error);
            throw error;
        }
    }
    setupExpress() {
        this.app.use((0, helmet_1.default)());
        this.app.use((0, cors_1.default)());
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true }));
        // Middleware for request logging
        this.app.use((req, res, next) => {
            this.logger.debug(`${req.method} ${req.path}`, { body: req.body });
            next();
        });
        this.setupRoutes();
    }
    setupRoutes() {
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
    async start() {
        try {
            // Initialize components first
            await this.initializeComponents();
            // Start HTTP server
            this.server = this.app.listen(this.config.port, () => {
                this.logger.info(`Router ${this.routerInfo.id} listening on port ${this.config.port}`);
            });
            // Connect to peer routers
            await this.connectToPeers();
            // Start periodic tasks
            this.startPeriodicTasks();
            this.routerInfo.status = types_1.RouterStatus.ONLINE;
            this._isRunning = true;
            this.emit('started');
            this.logger.info('FinP2P Router started successfully');
        }
        catch (error) {
            this.logger.error('Failed to start router:', error);
            throw error;
        }
    }
    async stop() {
        try {
            if (!this._isRunning) {
                return;
            }
            this._isRunning = false;
            this.routerInfo.status = types_1.RouterStatus.OFFLINE;
            // Clear all intervals
            this.intervals.forEach(interval => clearInterval(interval));
            this.intervals = [];
            // Close server if exists
            if (this.server) {
                await new Promise((resolve, reject) => {
                    this.server.close((err) => {
                        if (err) {
                            this.logger.warn('Error closing server:', err);
                            reject(err);
                        }
                        else {
                            resolve();
                        }
                    });
                });
            }
            // Disconnect Redis if connected
            if (this.redis && this.redis.isOpen) {
                await this.redis.quit().catch(err => {
                    this.logger.warn('Error quitting Redis:', err);
                });
            }
            // Disconnect ledger manager if exists
            if (this.ledgerManager) {
                await this.ledgerManager.disconnect().catch(err => {
                    this.logger.warn('Error disconnecting ledger manager:', err);
                });
            }
            this.emit('stopped');
            this.logger.info('FinP2P Router stopped successfully');
            return Promise.resolve();
        }
        catch (error) {
            this.logger.error('Error stopping router:', error);
            throw error;
        }
    }
    async connectToPeers() {
        for (const peerEndpoint of this.config.network.peers) {
            try {
                // Discover peer router info
                const response = await fetch(`${peerEndpoint}/info`);
                const peerInfo = await response.json();
                this.peerRouters.set(peerInfo.id, peerEndpoint);
                this.networkTopology.routers.set(peerInfo.id, peerInfo);
                this.logger.info(`Connected to peer router: ${peerInfo.id}`);
            }
            catch (error) {
                this.logger.warn(`Failed to connect to peer ${peerEndpoint}:`, error);
            }
        }
    }
    startPeriodicTasks() {
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
    async sendHeartbeatToPeers() {
        const heartbeatMessage = {
            id: (0, uuid_1.v4)(),
            type: types_1.MessageType.HEARTBEAT,
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
            }
            catch (error) {
                this.logger.warn(`Failed to send heartbeat to ${peerId}:`, error);
            }
        }
    }
    updateMetrics() {
        const memUsage = process.memoryUsage();
        this.metrics = {
            ...this.metrics,
            timestamp: new Date(),
            activeConnections: this.peerRouters.size,
            memoryUsage: memUsage.heapUsed / 1024 / 1024, // MB
            cpuUsage: process.cpuUsage().user / 1000000 // Convert to seconds
        };
    }
    cleanupExpiredTransfers() {
        const now = new Date();
        for (const [transferId, transfer] of this.activeTransfers) {
            const ageInMinutes = (now.getTime() - transfer.createdAt.getTime()) / (1000 * 60);
            if (ageInMinutes > 60 && transfer.status !== types_1.TransferStatus.COMPLETED) {
                transfer.status = types_1.TransferStatus.FAILED;
                this.activeTransfers.delete(transferId);
                this.logger.warn(`Transfer ${transferId} expired and marked as failed`);
            }
        }
    }
    // Route handlers
    async handleTransferRequest(req, res) {
        try {
            const transferData = req.body;
            const transfer = await this.processTransfer(transferData);
            res.json(transfer);
        }
        catch (error) {
            this.logger.error('Transfer failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: 'Transfer failed', details: errorMessage });
        }
    }
    async getTransfer(req, res) {
        const transferId = req.params.id;
        const transfer = this.activeTransfers.get(transferId);
        if (!transfer) {
            res.status(404).json({ error: 'Transfer not found' });
            return;
        }
        res.json(transfer);
    }
    async listTransfers(req, res) {
        const transfers = Array.from(this.activeTransfers.values());
        res.json(transfers);
    }
    async createAsset(req, res) {
        try {
            const assetData = req.body;
            const asset = await this.ledgerManager.createAsset(assetData.ledgerId, assetData);
            res.json(asset);
        }
        catch (error) {
            this.logger.error('Asset creation failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: 'Asset creation failed', details: errorMessage });
        }
    }
    async getAsset(req, res) {
        try {
            const assetId = req.params.id;
            const ledgerId = req.query.ledgerId;
            const asset = await this.ledgerManager.getAsset(ledgerId, assetId);
            if (!asset) {
                res.status(404).json({ error: 'Asset not found' });
                return;
            }
            res.json(asset);
        }
        catch (error) {
            this.logger.error('Get asset failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: 'Get asset failed', details: errorMessage });
        }
    }
    async createAccount(req, res) {
        try {
            const { ledgerId, institutionId } = req.body;
            const account = await this.ledgerManager.createAccount(ledgerId, institutionId);
            res.json(account);
        }
        catch (error) {
            this.logger.error('Account creation failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: 'Account creation failed', details: errorMessage });
        }
    }
    async getAccount(req, res) {
        try {
            const accountId = req.params.id;
            const ledgerId = req.query.ledgerId;
            const account = await this.ledgerManager.getAccount(ledgerId, accountId);
            if (!account) {
                res.status(404).json({ error: 'Account not found' });
                return;
            }
            res.json(account);
        }
        catch (error) {
            this.logger.error('Get account failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: 'Get account failed', details: errorMessage });
        }
    }
    async getBalance(req, res) {
        try {
            const { id: accountId, assetId } = req.params;
            const ledgerId = req.query.ledgerId;
            const balance = await this.ledgerManager.getBalance(ledgerId, accountId, assetId);
            res.json({ balance: balance.toString() });
        }
        catch (error) {
            this.logger.error('Get balance failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: 'Get balance failed', details: errorMessage });
        }
    }
    async getRoutingTable(req, res) {
        const routingTable = Array.from(this.routingTable.values());
        res.json(routingTable);
    }
    async getNetworkTopology(req, res) {
        res.json({
            routers: Array.from(this.networkTopology.routers.values()),
            connections: Object.fromEntries(this.networkTopology.connections),
            lastUpdated: this.networkTopology.lastUpdated
        });
    }
    async handleMessage(req, res) {
        try {
            const message = req.body;
            await this.processMessage(message);
            res.json({ status: 'processed' });
        }
        catch (error) {
            this.logger.error('Message processing failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: 'Message processing failed', details: errorMessage });
        }
    }
    async getMetricsEndpoint(req, res) {
        res.json(this.getMetrics());
    }
    // Core business logic
    async processTransfer(transferData) {
        const transfer = {
            id: (0, uuid_1.v4)(),
            fromAccount: transferData.fromAccount,
            toAccount: transferData.toAccount,
            asset: transferData.asset,
            amount: BigInt(transferData.amount),
            status: types_1.TransferStatus.PENDING,
            route: [],
            metadata: transferData.metadata || {},
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.activeTransfers.set(transfer.id, transfer);
        // Find route and execute transfer
        const route = await this.routingEngine.findRoute(transfer.fromAccount, transfer.toAccount, this.networkTopology);
        transfer.route = route;
        transfer.status = types_1.TransferStatus.ROUTING;
        // Execute the transfer
        await this.executeTransfer(transfer);
        this.emit('transfer', transfer);
        return transfer;
    }
    async executeTransfer(transfer) {
        try {
            transfer.status = types_1.TransferStatus.EXECUTING;
            // For now, implement simple same-ledger transfer
            // In a full implementation, this would handle cross-ledger routing
            const fromLedger = 'mock'; // Should be determined from account
            const toLedger = 'mock';
            if (fromLedger === toLedger) {
                // Same ledger transfer
                const txHash = await this.ledgerManager.transfer(fromLedger, transfer.fromAccount.id, transfer.toAccount.id, transfer.asset.id, transfer.amount);
                transfer.route[0] = {
                    routerId: this.routerInfo.id,
                    ledgerId: fromLedger,
                    action: 'transfer',
                    txHash,
                    status: 'completed',
                    timestamp: new Date()
                };
                transfer.status = types_1.TransferStatus.COMPLETED;
                transfer.completedAt = new Date();
            }
            else {
                // Cross-ledger transfer (simplified)
                throw new Error('Cross-ledger transfers not yet implemented');
            }
            this.metrics.transfersProcessed++;
        }
        catch (error) {
            transfer.status = types_1.TransferStatus.FAILED;
            this.logger.error(`Transfer ${transfer.id} failed:`, error);
            throw error;
        }
    }
    async processMessage(message) {
        // Validate message signature
        const isValid = await this.messageValidator.validate(message);
        if (!isValid) {
            throw new Error('Invalid message signature');
        }
        switch (message.type) {
            case types_1.MessageType.HEARTBEAT:
                await this.handleHeartbeat(message);
                break;
            case types_1.MessageType.TRANSFER_REQUEST:
                await this.handleTransferMessage(message);
                break;
            case types_1.MessageType.ROUTE_DISCOVERY:
                await this.handleRouteDiscovery(message);
                break;
            default:
                this.logger.warn(`Unknown message type: ${message.type}`);
        }
    }
    async handleHeartbeat(message) {
        const peerRouter = this.networkTopology.routers.get(message.fromRouter);
        if (peerRouter) {
            peerRouter.lastSeen = new Date();
            peerRouter.status = message.payload.status;
        }
    }
    async handleTransferMessage(message) {
        // Handle incoming transfer requests from other routers
        this.logger.info(`Received transfer message from ${message.fromRouter}`);
        // Implementation depends on specific transfer protocol
    }
    async handleRouteDiscovery(message) {
        // Handle route discovery requests
        this.logger.info(`Received route discovery from ${message.fromRouter}`);
        // Implementation depends on routing algorithm
    }
    // Getters
    getRouterInfo() {
        return this.routerInfo;
    }
    getId() {
        return this.routerInfo.id;
    }
    getInfo() {
        return this.routerInfo;
    }
    getVersion() {
        return this.routerInfo.metadata.version;
    }
    getSupportedLedgers() {
        return this.routerInfo.supportedLedgers;
    }
    isRunning() {
        return this._isRunning;
    }
    isOnline() {
        return this._isRunning && this.routerInfo.status === types_1.RouterStatus.ONLINE;
    }
    getMetrics() {
        return this.metrics;
    }
    getLedgerAdapters() {
        return Array.from(this.ledgerManager['adapters'].values());
    }
    getLedgerManager() {
        return this.ledgerManager;
    }
    // Peer management methods
    async addPeer(peerUrl) {
        try {
            // Extract router ID from URL or generate one
            const routerId = `peer-${Date.now()}`;
            this.peerRouters.set(routerId, peerUrl);
            // Add to network topology
            const peerRouter = {
                id: routerId,
                name: routerId,
                institutionId: routerId,
                endpoint: peerUrl,
                publicKey: '', // Would be fetched in real implementation
                supportedLedgers: [],
                status: types_1.RouterStatus.ONLINE,
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
        }
        catch (error) {
            this.logger.error(`Failed to add peer ${peerUrl}:`, error);
            throw error;
        }
    }
    async removePeer(peerUrl) {
        try {
            // Find router ID by URL
            let routerIdToRemove;
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
        }
        catch (error) {
            this.logger.error(`Failed to remove peer ${peerUrl}:`, error);
            throw error;
        }
    }
    getPeers() {
        const peers = [];
        for (const [routerId, url] of this.peerRouters.entries()) {
            const router = this.networkTopology.routers.get(routerId);
            peers.push({
                id: routerId,
                url: url,
                status: router?.status || types_1.RouterStatus.OFFLINE
            });
        }
        return peers;
    }
    getKnownRouters() {
        return Array.from(this.networkTopology.routers.values());
    }
    async discoverRouters() {
        // Simple implementation - return known routers
        // In a real implementation, this would actively discover new routers
        return this.getKnownRouters();
    }
    getConfirmationProcessorStatistics() {
        // Return basic statistics for the confirmation processor
        return {
            totalProcessed: 0,
            pending: 0,
            confirmed: 0,
            failed: 0
        };
    }
    async checkPrimaryRouterAuthorization(currency, operation, routerId) {
        // Simple implementation - check if router is known
        const knownRouters = this.getKnownRouters();
        return knownRouters.some(router => router.id === routerId);
    }
    async getHealth() {
        const uptime = this._isRunning ? Date.now() - Date.now() : 0; // Simple uptime calculation
        let redisHealth = false;
        try {
            if (this.redis) {
                await this.redis.ping();
                redisHealth = true;
            }
        }
        catch (error) {
            this.logger.warn('Redis health check failed:', error);
        }
        let ledgerHealth = {};
        try {
            if (this.ledgerManager) {
                ledgerHealth = await this.ledgerManager.healthCheck();
            }
        }
        catch (error) {
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
}
exports.FinP2PRouter = FinP2PRouter;
//# sourceMappingURL=Router.js.map