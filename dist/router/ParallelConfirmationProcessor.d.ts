/**
 * Parallel Confirmation Processor
 *
 * Implements parallel confirmation processing to eliminate sequential bottlenecks
 * in the FinP2P router confirmation system
 */
import { RedisClientType } from 'redis';
import { Logger } from 'winston';
import { Transfer } from '../types';
import { ConfirmationRecordManager, ConfirmationRecord } from './ConfirmationRecordManager';
export interface ConfirmationTask {
    id: string;
    transfer: Transfer;
    routerId: string;
    priority: 'high' | 'medium' | 'low';
    timestamp: Date;
    retryCount: number;
    maxRetries: number;
}
export interface ConfirmationResult {
    taskId: string;
    transferId: string;
    success: boolean;
    confirmationRecord?: ConfirmationRecord;
    error?: string;
    processingTime: number;
}
export interface ConfirmationBatch {
    id: string;
    tasks: ConfirmationTask[];
    startTime: Date;
    status: 'pending' | 'processing' | 'completed' | 'failed';
}
export declare class ParallelConfirmationProcessor {
    private redis;
    private logger;
    private confirmationManager;
    private routerId;
    private onConfirmationCreated?;
    private readonly maxConcurrentConfirmations;
    private readonly batchSize;
    private readonly processingTimeout;
    private activeTasks;
    private processingQueue;
    private completedTasks;
    private isProcessing;
    private metrics;
    constructor(redis: RedisClientType, logger: Logger, confirmationManager: ConfirmationRecordManager, routerId: string, options?: {
        maxConcurrentConfirmations?: number;
        batchSize?: number;
        processingTimeout?: number;
        onConfirmationCreated?: () => void;
    });
    /**
     * Add a transfer for confirmation processing
     */
    addConfirmationTask(transfer: Transfer, priority?: 'high' | 'medium' | 'low', maxRetries?: number): Promise<string>;
    /**
     * Process confirmations in parallel batches
     */
    private startProcessing;
    /**
     * Process a batch of confirmations in parallel
     */
    private processBatch;
    /**
     * Process a single confirmation task
     */
    private processConfirmationTask;
    /**
     * Add task to queue with priority ordering
     */
    private addToQueue;
    /**
     * Wait for at least one task to complete
     */
    private waitForTaskCompletion;
    /**
     * Update average processing time metric
     */
    private updateAverageProcessingTime;
    /**
     * Get confirmation result for a specific task
     */
    getConfirmationResult(taskId: string): Promise<ConfirmationResult | null>;
    /**
     * Get processing metrics
     */
    getMetrics(): {
        queueSize: number;
        processingCount: number;
        completedCount: number;
        averageProcessingTime: number;
        isProcessing: boolean;
    };
    /**
     * Get status of all tasks for a transfer
     */
    getTransferConfirmationStatus(transferId: string): Promise<{
        pending: ConfirmationTask[];
        active: ConfirmationTask[];
        completed: ConfirmationResult[];
    }>;
    /**
     * Clean up old completed tasks
     */
    cleanup(olderThanMinutes?: number): Promise<number>;
    /**
     * Get processor statistics
     */
    getStatistics(): any;
    /**
     * Shutdown the processor gracefully
     */
    shutdown(force?: boolean): Promise<void>;
}
//# sourceMappingURL=ParallelConfirmationProcessor.d.ts.map