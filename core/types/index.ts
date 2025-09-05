// Core FinP2P Types and Interfaces

export interface FinID {
  id: string;
  type: 'institution' | 'asset' | 'account';
  domain: string;
  metadata?: Record<string, any>;
}

export enum DualConfirmationStatus {
  PENDING = 'pending',
  PARTIAL_CONFIRMED = 'partial_confirmed',
  DUAL_CONFIRMED = 'dual_confirmed',
  FAILED = 'failed'
}

export interface DualConfirmationRecord {
  transferId: string;
  confirmations: {
    routerA?: any; // ConfirmationRecord
    routerB?: any; // ConfirmationRecord
  };
  status: DualConfirmationStatus;
  timestamp: string;
}

export interface Asset {
  id: string;
  finId: FinID;
  symbol: string;
  name: string;
  decimals: number;
  totalSupply: bigint;
  ledgerId: string;
  contractAddress?: string;
  metadata: AssetMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetMetadata {
  description?: string;
  imageUrl?: string;
  externalUrl?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface Account {
  finId: FinID;
  address: string;
  ledgerId: string;
  institutionId: string;
  balances: Map<string, bigint>; // assetId -> balance
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transfer {
  id: string;
  fromAccount: FinID;
  toAccount: FinID;
  asset: FinID;
  amount: bigint;
  status: TransferStatus;
  route: RouteStep[];
  metadata: TransferMetadata;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export enum TransferStatus {
  PENDING = 'pending',
  ROUTING = 'routing',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface RouteStep {
  routerId: string;
  ledgerId: string;
  action: 'lock' | 'unlock' | 'mint' | 'burn' | 'transfer';
  txHash?: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  timestamp: Date;
}

export interface TransferMetadata {
  reference?: string;
  description?: string;
  tags?: string[];
  externalRef?: string;
}

export interface Router {
  id: string;
  name: string;
  institutionId: string;
  endpoint: string;
  publicKey: string;
  supportedLedgers: string[];
  status: RouterStatus;
  lastSeen: Date;
  metadata: RouterMetadata;
}

export enum RouterStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance'
}

export interface RouterMetadata {
  version: string;
  capabilities: string[];
  region?: string;
  institution: {
    name: string;
    country: string;
    regulatoryId?: string;
  };
}

export interface Message {
  id: string;
  type: MessageType;
  fromRouter: string;
  toRouter: string;
  payload: any;
  signature: string;
  timestamp: Date;
  ttl: number;
}

export enum MessageType {
  TRANSFER_REQUEST = 'transfer_request',
  TRANSFER_RESPONSE = 'transfer_response',
  ROUTE_DISCOVERY = 'route_discovery',
  ROUTE_RESPONSE = 'route_response',
  HEARTBEAT = 'heartbeat',
  ERROR = 'error'
}

export interface LedgerAdapter {
  ledgerId: string;
  name: string;
  type: LedgerType;

  // Core operations
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Asset operations
  createAsset(asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset>;
  getAsset(assetId: string): Promise<Asset | null>;

  // Account operations
  createAccount(institutionId: string): Promise<Account>;
  getAccount(accountId: string): Promise<Account | null>;
  getBalance(accountId: string, assetId: string): Promise<bigint>;
  getLockedBalance(accountId: string, assetId: string): Promise<bigint>;
  getAvailableBalance(accountId: string, assetId: string): Promise<bigint>;

  // Transfer operations
  transfer(from: string, to: string, assetId: string, amount: bigint): Promise<string>;
  lockAsset(accountId: string, assetId: string, amount: bigint): Promise<string>;
  unlockAsset(accountId: string, assetId: string, amount: bigint): Promise<string>;

  // Query operations
  getTransaction(txHash: string): Promise<Transaction | null>;
  getTransactionStatus(txHash: string): Promise<TransactionStatus>;

  // Balance history operations
  getBalanceHistory(accountId: string): Array<{ timestamp: Date; assetId: string; balance: bigint; operation: string }>;
}

export enum LedgerType {
  SUI = 'sui',
  HEDERA = 'hedera',
  APTOS = 'aptos',
  FABRIC = 'fabric',
  MOCK = 'mock'
}

export interface Transaction {
  hash: string;
  ledgerId: string;
  from: string;
  to: string;
  assetId: string;
  amount: bigint;
  status: TransactionStatus;
  blockNumber?: number;
  timestamp: Date;
  gasUsed?: bigint;
  gasPrice?: bigint;
}

export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed'
}

export interface RoutingTable {
  destination: FinID;
  nextHop: string; // Router ID
  cost: number;
  hops: number;
  lastUpdated: Date;
}

export interface NetworkTopology {
  routers: Map<string, Router>;
  connections: Map<string, string[]>; // routerId -> connected router IDs
  lastUpdated: Date;
}

export interface PerformanceMetrics {
  routerId: string;
  timestamp: Date;
  transfersProcessed: number;
  averageLatency: number;
  throughput: number;
  errorRate: number;
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface ConfigOptions {
  routerId: string;
  port: number;
  host: string;
  redis: {
    url: string;
    keyPrefix: string;
    ttl: number;
  };
  network: {
    peers: string[];
    heartbeatInterval: number;
    maxRetries: number;
    timeout: number;
  };
  security: {
    enableAuth: boolean;
    jwtSecret: string;
    encryptionKey: string;
    rateLimitWindow: number;
    rateLimitMax: number;
  };
  ledgers: Record<string, {
    type: LedgerType;
    config: Record<string, any>;
  }>;
  monitoring: {
    enableMetrics: boolean;
    metricsPort: number;
    enableHealthCheck: boolean;
    logLevel: string;
  };
}

// Export transaction types
export type { TransactionRequest, TransactionResponse, LedgerTransactionResult } from './transactions';

/**
 * Enhanced Atomic Swap Types for Production-Ready Implementation
 */

export enum AtomicSwapStatus {
  PENDING = 'pending',
  LOCKING_INITIATOR = 'locking_initiator',
  LOCKING_RESPONDER = 'locking_responder',
  LOCKED = 'locked',
  COMPLETING = 'completing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
  ROLLING_BACK = 'rolling_back',
  ROLLED_BACK = 'rolled_back'
}

export enum AtomicSwapStage {
  INITIATED = 'initiated',
  LOCKING_ASSETS = 'locking_assets',
  ASSETS_LOCKED = 'assets_locked',
  COMPLETING_SWAP = 'completing_swap',
  SWAP_COMPLETED = 'swap_completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
  ROLLING_BACK = 'rolling_back',
  ROLLED_BACK = 'rolled_back'
}

export interface AtomicSwapAsset {
  chain: string;
  assetId: string;
  amount: string;
  lockTxHash?: string;
  unlockTxHash?: string;
  lockConfirmations?: number;
  requiredConfirmations?: number;
}

export interface AtomicSwapProgress {
  stage: AtomicSwapStage;
  percentage: number;
  description: string;
  estimatedCompletionTime?: Date;
  lastUpdated: Date;
  subStages: {
    [key: string]: {
      completed: boolean;
      txHash?: string;
      confirmations?: number;
      timestamp?: Date;
    };
  };
}

export interface AtomicSwapTimeout {
  timeoutBlocks: number;
  timeoutTimestamp: Date;
  isExpired: boolean;
  blockchainTimeouts: {
    [chain: string]: {
      blocks: number;
      timestamp: Date;
    };
  };
}

export interface AtomicSwapRollback {
  canRollback: boolean;
  rollbackReason?: 'timeout' | 'failure' | 'manual';
  rollbackStarted?: Date;
  rollbackCompleted?: Date;
  assetsToUnlock: {
    [chain: string]: {
      required: boolean;
      txHash?: string;
      completed: boolean;
    };
  };
}

export interface AtomicSwap {
  swapId: string;
  initiatorFinId: string;
  responderFinId: string;
  initiatorAsset: AtomicSwapAsset;
  responderAsset: AtomicSwapAsset;
  status: AtomicSwapStatus;
  progress: AtomicSwapProgress;
  timeout: AtomicSwapTimeout;
  rollback: AtomicSwapRollback;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  events: AtomicSwapEvent[];
}

export interface AtomicSwapEvent {
  id: string;
  swapId: string;
  type: 'initiated' | 'lock_started' | 'lock_completed' | 'completion_started' | 'completed' | 'failed' | 'expired' | 'rollback_started' | 'rollback_completed';
  chain?: string;
  txHash?: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AtomicSwapRequest {
  initiatorFinId: string;
  responderFinId: string;
  initiatorAsset: { chain: string; assetId: string; amount: string };
  responderAsset: { chain: string; assetId: string; amount: string };
  timeoutBlocks: number;
  timeoutMinutes?: number; // Alternative timeout in minutes
  autoRollback?: boolean;
  requiredConfirmations?: { [chain: string]: number };
}

export interface AtomicSwapResponse {
  swapId: string;
  status: AtomicSwapStatus;
  progress: AtomicSwapProgress;
  estimatedCompletionTime?: Date;
  nextAction?: string;
  lockTxHash?: string;
  completeTxHash?: string;
}
