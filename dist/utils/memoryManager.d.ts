import winston from 'winston';
import { PerformanceMonitor } from './performanceMonitor';
export interface MemoryManagerOptions {
    maxActiveTransfers?: number;
    transferTimeoutMinutes?: number;
    gcIntervalMs?: number;
    memoryThresholdMB?: number;
    enableAutoCleanup?: boolean;
    cleanupIntervalMs?: number;
}
export interface MemoryStats {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    activeTransfers: number;
    cleanupCount: number;
    gcCount: number;
    lastCleanup: Date;
    lastGC: Date;
}
export interface TransferEntry {
    id: string;
    createdAt: Date;
    lastAccessed: Date;
    status: string;
    memorySize: number;
    data: any;
}
/**
 * Comprehensive memory management system for active transfers and leak prevention
 */
export declare class MemoryManager {
    private activeTransfers;
    private cleanupInterval?;
    private gcInterval?;
    private logger;
    private performanceMonitor?;
    private options;
    private stats;
    constructor(logger: winston.Logger, performanceMonitor?: PerformanceMonitor, options?: MemoryManagerOptions);
    /**
     * Register an active transfer for memory management
     */
    registerTransfer(id: string, data: any, status?: string): void;
    /**
     * Update transfer status and access time
     */
    updateTransfer(id: string, status?: string, data?: any): boolean;
    /**
     * Remove transfer from memory management
     */
    unregisterTransfer(id: string): boolean;
    /**
     * Get transfer entry
     */
    getTransfer(id: string): TransferEntry | undefined;
    /**
     * Cleanup expired and completed transfers
     */
    cleanup(force?: boolean): Promise<number>;
    /**
     * Force garbage collection if memory usage is high
     */
    forceGarbageCollection(): Promise<void>;
    /**
     * Get memory statistics
     */
    getStats(): MemoryStats;
    /**
     * Get all active transfers
     */
    getActiveTransfers(): TransferEntry[];
    /**
     * Check if memory usage is within acceptable limits
     */
    isMemoryHealthy(): boolean;
    /**
     * Shutdown memory manager
     */
    shutdown(): Promise<void>;
    private startAutoCleanup;
    private startGCMonitoring;
    private evictOldestTransfer;
    private estimateMemorySize;
    private getCurrentMemoryUsage;
    private updateStats;
}
/**
 * Enhanced cache manager with better memory management
 */
export declare class EnhancedCacheManager {
    private memoryCache;
    private accessOrder;
    private memoryUsage;
    private maxMemoryBytes;
    private logger;
    constructor(logger: winston.Logger, maxMemoryMB?: number);
    set(key: string, value: any, ttl?: number): void;
    get(key: string): any;
    delete(key: string): boolean;
    clear(): void;
    getMemoryUsage(): {
        usedBytes: number;
        usedMB: number;
        maxMB: number;
        utilization: number;
    };
    private evictLRU;
    private updateAccessOrder;
    private estimateSize;
}
//# sourceMappingURL=memoryManager.d.ts.map