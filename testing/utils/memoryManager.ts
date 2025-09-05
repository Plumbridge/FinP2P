import * as winston from 'winston';
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
export class MemoryManager {
  private activeTransfers: Map<string, TransferEntry> = new Map();
  private cleanupInterval?: NodeJS.Timeout;
  private gcInterval?: NodeJS.Timeout;
  private logger: winston.Logger;
  private performanceMonitor?: PerformanceMonitor;
  private options: Required<MemoryManagerOptions>;
  private stats: MemoryStats;

  constructor(
    logger: winston.Logger,
    performanceMonitor?: PerformanceMonitor,
    options: MemoryManagerOptions = {}
  ) {
    this.logger = logger;
    this.performanceMonitor = performanceMonitor;
    this.options = {
      maxActiveTransfers: options.maxActiveTransfers || 10000,
      transferTimeoutMinutes: options.transferTimeoutMinutes || 60,
      gcIntervalMs: options.gcIntervalMs || 300000, // 5 minutes
      memoryThresholdMB: options.memoryThresholdMB || 512,
      enableAutoCleanup: options.enableAutoCleanup ?? true,
      cleanupIntervalMs: options.cleanupIntervalMs || 60000 // 1 minute
    };

    this.stats = {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0,
      activeTransfers: 0,
      cleanupCount: 0,
      gcCount: 0,
      lastCleanup: new Date(),
      lastGC: new Date()
    };

    this.startAutoCleanup();
    this.startGCMonitoring();
  }

  /**
   * Register an active transfer for memory management
   */
  registerTransfer(id: string, data: any, status: string = 'pending'): void {
    const memorySize = this.estimateMemorySize(data);

    // Check if we're at capacity
    if (this.activeTransfers.size >= this.options.maxActiveTransfers) {
      this.evictOldestTransfer();
    }

    const entry: TransferEntry = {
      id,
      createdAt: new Date(),
      lastAccessed: new Date(),
      status,
      memorySize,
      data
    };

    this.activeTransfers.set(id, entry);
    this.updateStats();

    this.logger.debug('Transfer registered for memory management', {
      transferId: id,
      memorySize,
      totalActive: this.activeTransfers.size
    });
  }

  /**
   * Update transfer status and access time
   */
  updateTransfer(id: string, status?: string, data?: any): boolean {
    const entry = this.activeTransfers.get(id);
    if (!entry) {
      return false;
    }

    entry.lastAccessed = new Date();
    if (status) {
      entry.status = status;
    }
    if (data) {
      entry.data = data;
      entry.memorySize = this.estimateMemorySize(data);
    }

    this.activeTransfers.set(id, entry);
    return true;
  }

  /**
   * Remove transfer from memory management
   */
  unregisterTransfer(id: string): boolean {
    const removed = this.activeTransfers.delete(id);
    if (removed) {
      this.updateStats();
      this.logger.debug('Transfer unregistered from memory management', {
        transferId: id,
        totalActive: this.activeTransfers.size
      });
    }
    return removed;
  }

  /**
   * Get transfer entry
   */
  getTransfer(id: string): TransferEntry | undefined {
    const entry = this.activeTransfers.get(id);
    if (entry) {
      entry.lastAccessed = new Date();
      this.activeTransfers.set(id, entry);
    }
    return entry;
  }

  /**
   * Cleanup expired and completed transfers
   */
  async cleanup(force: boolean = false): Promise<number> {
    const now = new Date();
    const timeoutMs = this.options.transferTimeoutMinutes * 60 * 1000;
    let cleanedCount = 0;

    for (const [id, entry] of this.activeTransfers) {
      const shouldCleanup = force ||
        entry.status === 'completed' ||
        entry.status === 'failed' ||
        (now.getTime() - entry.createdAt.getTime()) > timeoutMs;

      if (shouldCleanup) {
        this.activeTransfers.delete(id);
        cleanedCount++;

        this.logger.debug('Transfer cleaned up', {
          transferId: id,
          status: entry.status,
          age: now.getTime() - entry.createdAt.getTime(),
          reason: force ? 'forced' : entry.status === 'completed' || entry.status === 'failed' ? 'status' : 'timeout'
        });
      }
    }

    this.stats.cleanupCount += cleanedCount;
    this.stats.lastCleanup = now;
    this.updateStats();

    if (cleanedCount > 0) {
      this.logger.info('Memory cleanup completed', {
        cleanedTransfers: cleanedCount,
        remainingTransfers: this.activeTransfers.size,
        memoryUsage: this.getCurrentMemoryUsage()
      });
    }

    return cleanedCount;
  }

  /**
   * Force garbage collection if memory usage is high
   */
  async forceGarbageCollection(): Promise<void> {
    const memoryUsage = this.getCurrentMemoryUsage();

    if (memoryUsage.heapUsed > this.options.memoryThresholdMB * 1024 * 1024) {
      this.logger.info('Forcing garbage collection due to high memory usage', {
        heapUsed: memoryUsage.heapUsed / 1024 / 1024,
        threshold: this.options.memoryThresholdMB
      });

      if (global.gc) {
        global.gc();
        this.stats.gcCount++;
        this.stats.lastGC = new Date();

        const newMemoryUsage = this.getCurrentMemoryUsage();
        this.logger.info('Garbage collection completed', {
          beforeMB: memoryUsage.heapUsed / 1024 / 1024,
          afterMB: newMemoryUsage.heapUsed / 1024 / 1024,
          freedMB: (memoryUsage.heapUsed - newMemoryUsage.heapUsed) / 1024 / 1024
        });
      } else {
        this.logger.warn('Garbage collection not available (run with --expose-gc)');
      }
    }
  }

  /**
   * Get memory statistics
   */
  getStats(): MemoryStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get all active transfers
   */
  getActiveTransfers(): TransferEntry[] {
    return Array.from(this.activeTransfers.values());
  }

  /**
   * Check if memory usage is within acceptable limits
   */
  isMemoryHealthy(): boolean {
    const memoryUsage = this.getCurrentMemoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;

    return heapUsedMB < this.options.memoryThresholdMB &&
           this.activeTransfers.size < this.options.maxActiveTransfers;
  }

  /**
   * Shutdown memory manager
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down memory manager...');

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = undefined;
    }

    // Final cleanup
    await this.cleanup(true);

    this.logger.info('Memory manager shutdown completed', {
      finalStats: this.getStats()
    });
  }

  private startAutoCleanup(): void {
    if (!this.options.enableAutoCleanup) {
      return;
    }

    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanup();
      } catch (error) {
        this.logger.error('Auto cleanup failed:', error);
      }
    }, this.options.cleanupIntervalMs);
  }

  private startGCMonitoring(): void {
    this.gcInterval = setInterval(async () => {
      try {
        await this.forceGarbageCollection();
      } catch (error) {
        this.logger.error('GC monitoring failed:', error);
      }
    }, this.options.gcIntervalMs);
  }

  private evictOldestTransfer(): void {
    let oldestEntry: TransferEntry | null = null;
    let oldestId: string | null = null;

    for (const [id, entry] of this.activeTransfers) {
      if (!oldestEntry || entry.lastAccessed < oldestEntry.lastAccessed) {
        oldestEntry = entry;
        oldestId = id;
      }
    }

    if (oldestId) {
      this.activeTransfers.delete(oldestId);
      this.logger.warn('Evicted oldest transfer due to capacity limit', {
        transferId: oldestId,
        age: Date.now() - oldestEntry!.createdAt.getTime()
      });
    }
  }

  private estimateMemorySize(data: any): number {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate
    } catch {
      return 1024; // Default estimate
    }
  }

  private getCurrentMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  private updateStats(): void {
    const memoryUsage = this.getCurrentMemoryUsage();
    this.stats.heapUsed = memoryUsage.heapUsed;
    this.stats.heapTotal = memoryUsage.heapTotal;
    this.stats.external = memoryUsage.external;
    this.stats.rss = memoryUsage.rss;
    this.stats.activeTransfers = this.activeTransfers.size;

    // Record metrics if performance monitor is available
    if (this.performanceMonitor) {
      this.performanceMonitor.recordMetric('memory.activeTransfers', this.activeTransfers.size, 'gauge');
      this.performanceMonitor.recordMetric('memory.cleanupCount', this.stats.cleanupCount, 'counter');
      this.performanceMonitor.recordMetric('memory.gcCount', this.stats.gcCount, 'counter');
    }
  }
}

/**
 * Enhanced cache manager with better memory management
 */
export class EnhancedCacheManager {
  private memoryCache: Map<string, any> = new Map();
  private accessOrder: string[] = [];
  private memoryUsage: number = 0;
  private maxMemoryBytes: number;
  private logger: winston.Logger;

  constructor(logger: winston.Logger, maxMemoryMB: number = 100) {
    this.logger = logger;
    this.maxMemoryBytes = maxMemoryMB * 1024 * 1024;
  }

  set(key: string, value: any, ttl: number = 300000): void {
    const size = this.estimateSize(value);

    // Evict if necessary
    while (this.memoryUsage + size > this.maxMemoryBytes && this.memoryCache.size > 0) {
      this.evictLRU();
    }

    const entry = {
      value,
      expiry: Date.now() + ttl,
      size
    };

    // Remove old entry if exists
    if (this.memoryCache.has(key)) {
      const oldEntry = this.memoryCache.get(key);
      this.memoryUsage -= oldEntry.size;
    }

    this.memoryCache.set(key, entry);
    this.memoryUsage += size;
    this.updateAccessOrder(key);
  }

  get(key: string): any {
    const entry = this.memoryCache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.delete(key);
      return null;
    }

    this.updateAccessOrder(key);
    return entry.value;
  }

  delete(key: string): boolean {
    const entry = this.memoryCache.get(key);
    if (entry) {
      this.memoryUsage -= entry.size;
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      return this.memoryCache.delete(key);
    }
    return false;
  }

  clear(): void {
    this.memoryCache.clear();
    this.accessOrder = [];
    this.memoryUsage = 0;
  }

  getMemoryUsage(): { usedBytes: number; usedMB: number; maxMB: number; utilization: number } {
    return {
      usedBytes: this.memoryUsage,
      usedMB: this.memoryUsage / 1024 / 1024,
      maxMB: this.maxMemoryBytes / 1024 / 1024,
      utilization: this.memoryUsage / this.maxMemoryBytes
    };
  }

  private evictLRU(): void {
    if (this.accessOrder.length > 0) {
      const lruKey = this.accessOrder.shift()!;
      const entry = this.memoryCache.get(lruKey);
      if (entry) {
        this.memoryUsage -= entry.size;
        this.memoryCache.delete(lruKey);
        this.logger.debug('Evicted LRU cache entry', { key: lruKey, size: entry.size });
      }
    }
  }

  private updateAccessOrder(key: string): void {
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
  }

  private estimateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 1024;
    }
  }
}
