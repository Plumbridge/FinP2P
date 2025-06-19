/// <reference types="node" />
import { Logger } from 'winston';
import { EventEmitter } from 'events';
/**
 * Priority levels for queue items
 */
export declare enum Priority {
    LOW = 0,
    NORMAL = 1,
    HIGH = 2,
    CRITICAL = 3
}
/**
 * Queue configuration options
 */
interface QueueOptions {
    concurrency?: number;
    retryAttempts?: number;
    retryDelayMs?: number;
    timeoutMs?: number;
    priority?: Priority;
    timeout?: number;
    retries?: number;
    maxRetries?: number;
    metadata?: Record<string, any>;
}
/**
 * Queue statistics
 */
interface QueueStats {
    totalAdded: number;
    totalProcessed: number;
    totalFailed: number;
    currentSize: number;
    averageProcessingTime: number;
}
/**
 * Generic async queue with priority support and concurrency control
 */
export declare class AsyncQueue<T = any> extends EventEmitter {
    private queue;
    private running;
    private readonly maxConcurrency;
    private readonly options;
    private readonly logger;
    private stats;
    private paused;
    constructor(options: QueueOptions | undefined, logger: Logger);
    /**
     * Add a task to the queue
     */
    add<R>(task: () => Promise<R>, options?: QueueOptions): Promise<R>;
    /**
     * Process the next item in the queue
     */
    private processNext;
    /**
     * Execute a queue item
     */
    private executeItem;
    /**
     * Pause queue processing
     */
    pause(): void;
    /**
     * Resume queue processing
     */
    resume(): void;
    /**
     * Clear all pending items
     */
    clear(): void;
    /**
     * Get queue statistics
     */
    getStats(): QueueStats;
    /**
     * Get current queue size
     */
    size(): number;
    /**
     * Check if queue is empty
     */
    isEmpty(): boolean;
    /**
     * Wait for all current tasks to complete
     */
    drain(): Promise<void>;
    private sortQueue;
    private generateId;
    private withTimeout;
    private calculateRetryDelay;
    private updateAverageWaitTime;
    private updateAverageProcessTime;
}
/**
 * Specialized queue for router operations
 */
export declare class RouterOperationQueue {
    private transferQueue;
    private assetQueue;
    private networkQueue;
    private validationQueue;
    private readonly logger;
    constructor(logger: Logger);
    /**
     * Queue a transfer operation
     */
    queueTransfer<R>(operation: () => Promise<R>, priority?: Priority, timeout?: number): Promise<R>;
    /**
     * Queue an asset operation
     */
    queueAsset<R>(operation: () => Promise<R>, priority?: Priority, timeout?: number): Promise<R>;
    /**
     * Queue a network operation
     */
    queueNetwork<R>(operation: () => Promise<R>, priority?: Priority, timeout?: number): Promise<R>;
    /**
     * Queue a validation operation
     */
    queueValidation<R>(operation: () => Promise<R>, priority?: Priority): Promise<R>;
    /**
     * Get comprehensive statistics
     */
    getStats(): Record<string, QueueStats>;
    /**
     * Pause all queues
     */
    pauseAll(): void;
    /**
     * Resume all queues
     */
    resumeAll(): void;
    /**
     * Wait for all queues to drain
     */
    drainAll(): Promise<void>;
    private setupEventListeners;
}
export {};
//# sourceMappingURL=asyncQueue.d.ts.map