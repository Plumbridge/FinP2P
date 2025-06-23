/// <reference types="node" />
import { EventEmitter } from 'events';
import { Router as IRouter, Transfer, Message, PerformanceMetrics, ConfigOptions } from '../types';
import { LedgerManager } from './LedgerManager';
export declare class FinP2PRouter extends EventEmitter {
    private app;
    private server;
    private redis;
    private logger;
    private config;
    private routingEngine;
    private ledgerManager;
    private messageValidator;
    private cryptoUtils;
    private routerInfo;
    private _isRunning;
    private peerRouters;
    private activeTransfers;
    private routingTable;
    private networkTopology;
    private metrics;
    private intervals;
    constructor(config: ConfigOptions);
    private validateConfig;
    private initializeComponents;
    private setupExpress;
    private setupRoutes;
    start(): Promise<void>;
    stop(): Promise<void>;
    private connectToPeers;
    private startPeriodicTasks;
    private sendHeartbeatToPeers;
    private updateMetrics;
    private cleanupExpiredTransfers;
    private handleTransferRequest;
    private getTransfer;
    private listTransfers;
    private createAsset;
    private getAsset;
    private createAccount;
    private getAccount;
    private getBalance;
    private getRoutingTable;
    private getNetworkTopology;
    private handleMessage;
    private getMetricsEndpoint;
    processTransfer(transferData: any): Promise<Transfer>;
    private executeTransfer;
    private processMessage;
    handleHeartbeat(message: Message): Promise<void>;
    private handleTransferMessage;
    private handleRouteDiscovery;
    getRouterInfo(): IRouter;
    getId(): string;
    getInfo(): IRouter;
    getVersion(): string;
    getSupportedLedgers(): string[];
    isRunning(): boolean;
    isOnline(): boolean;
    getMetrics(): PerformanceMetrics;
    getLedgerAdapters(): any[];
    getLedgerManager(): LedgerManager;
    addPeer(peerUrl: string): Promise<void>;
    removePeer(peerUrl: string): Promise<void>;
    getPeers(): Array<{
        id: string;
        url: string;
        status: string;
    }>;
    getKnownRouters(): any[];
    discoverRouters(): Promise<any[]>;
    getConfirmationProcessorStatistics(): any;
    checkPrimaryRouterAuthorization(currency: string, operation: string, routerId: string): Promise<boolean>;
    getHealth(): Promise<{
        status: string;
        timestamp: Date;
        uptime: number;
        components: {
            redis: boolean;
            ledgers: Record<string, boolean>;
        };
    }>;
    /**
     * Sign a message using the router's private key
     */
    signMessage(message: any): Promise<any>;
    /**
     * Verify a message signature
     */
    verifyMessageSignature(signedMessage: any): Promise<boolean>;
    /**
     * Get the public key for a router
     */
    getRouterPublicKey(routerId?: string): Promise<string | null>;
}
//# sourceMappingURL=Router.d.ts.map