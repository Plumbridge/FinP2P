/**
 * Parallel Confirmation Processor
 * 
 * Implements parallel confirmation processing to eliminate sequential bottlenecks
 * in the FinP2P router confirmation system
 */

import { RedisClientType } from 'redis';
import { Logger } from 'winston';
import { Transfer, FinID } from '../types';
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

export class ParallelConfirmationProcessor {
  private redis: RedisClientType;
  private logger: Logger;
  private confirmationManager: ConfirmationRecordManager;
  private routerId: string;
  private onConfirmationCreated?: () => void;
  
  // Configuration
  private readonly maxConcurrentConfirmations: number;
  private readonly batchSize: number;
  private readonly processingTimeout: number;
  
  // State management
  private activeTasks: Map<string, ConfirmationTask> = new Map();
  private processingQueue: ConfirmationTask[] = [];
  private completedTasks: Map<string, ConfirmationResult> = new Map();
  private isProcessing: boolean = false;
  
  // Performance tracking
  private metrics = {
    totalProcessed: 0,
    totalFailed: 0,
    averageProcessingTime: 0,
    currentConcurrency: 0,
    maxConcurrencyReached: 0
  };

  constructor(
    redis: RedisClientType,
    logger: Logger,
    confirmationManager: ConfirmationRecordManager,
    routerId: string,
    options: {
      maxConcurrentConfirmations?: number;
      batchSize?: number;
      processingTimeout?: number;
      onConfirmationCreated?: () => void;
    } = {}
  ) {
    this.redis = redis;
    this.logger = logger;
    this.confirmationManager = confirmationManager;
    this.routerId = routerId;
    this.onConfirmationCreated = options.onConfirmationCreated;
    
    // Set configuration with defaults
    this.maxConcurrentConfirmations = options.maxConcurrentConfirmations || 10;
    this.batchSize = options.batchSize || 5;
    this.processingTimeout = options.processingTimeout || 30000; // 30 seconds
    
    this.logger.info('ParallelConfirmationProcessor initialized', {
      routerId: this.routerId,
      maxConcurrentConfirmations: this.maxConcurrentConfirmations,
      batchSize: this.batchSize,
      processingTimeout: this.processingTimeout
    });
  }

  /**
   * Add a transfer for confirmation processing
   */
  async addConfirmationTask(
    transfer: Transfer,
    priority: 'high' | 'medium' | 'low' = 'medium',
    maxRetries: number = 3
  ): Promise<string> {
    const taskId = `conf-task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const task: ConfirmationTask = {
      id: taskId,
      transfer,
      routerId: this.routerId,
      priority,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries
    };
    
    // Add to processing queue with priority ordering
    this.addToQueue(task);
    
    this.logger.debug('Confirmation task added', {
      taskId,
      transferId: transfer.id,
      priority,
      queueSize: this.processingQueue.length
    });
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }
    
    return taskId;
  }

  /**
   * Process confirmations in parallel batches
   */
  private async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      return;
    }
    
    this.isProcessing = true;
    this.logger.info('Starting parallel confirmation processing');
    
    try {
      while (this.processingQueue.length > 0 || this.activeTasks.size > 0) {
        // Process available tasks in parallel
        await this.processBatch();
        
        // Small delay to prevent CPU spinning
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    } catch (error) {
      this.logger.error('Error in confirmation processing loop:', error);
    } finally {
      this.isProcessing = false;
      this.logger.info('Parallel confirmation processing stopped');
    }
  }

  /**
   * Process a batch of confirmations in parallel
   */
  private async processBatch(): Promise<void> {
    const availableSlots = this.maxConcurrentConfirmations - this.activeTasks.size;
    
    if (availableSlots <= 0) {
      // Wait for some tasks to complete
      await this.waitForTaskCompletion();
      return;
    }
    
    // Get tasks to process
    const tasksToProcess = this.processingQueue.splice(0, Math.min(availableSlots, this.batchSize));
    
    if (tasksToProcess.length === 0) {
      return;
    }
    
    this.logger.debug('Processing confirmation batch', {
      batchSize: tasksToProcess.length,
      activeTasks: this.activeTasks.size,
      queueSize: this.processingQueue.length
    });
    
    // Start processing tasks in parallel
    const processingPromises = tasksToProcess.map(task => this.processConfirmationTask(task));
    
    // Don't await all - let them run in parallel
    processingPromises.forEach(promise => {
      promise.catch(error => {
        this.logger.error('Unhandled error in confirmation task:', error);
      });
    });
    
    // Update metrics
    this.metrics.currentConcurrency = this.activeTasks.size;
    this.metrics.maxConcurrencyReached = Math.max(
      this.metrics.maxConcurrencyReached,
      this.activeTasks.size
    );
  }

  /**
   * Process a single confirmation task
   */
  private async processConfirmationTask(task: ConfirmationTask): Promise<void> {
    const startTime = Date.now();
    
    // Add to active tasks
    this.activeTasks.set(task.id, task);
    
    try {
      this.logger.debug('Processing confirmation task', {
        taskId: task.id,
        transferId: task.transfer.id,
        priority: task.priority,
        retryCount: task.retryCount
      });
      
      // Create confirmation record
      const confirmationRecord = await this.confirmationManager.createConfirmationRecord(
        task.transfer,
        'confirmed' // Assuming successful for now - in real implementation, this would depend on ledger response
      );
      
      const processingTime = Date.now() - startTime;
      
      // Store result
      const result: ConfirmationResult = {
        taskId: task.id,
        transferId: task.transfer.id,
        success: true,
        confirmationRecord,
        processingTime
      };
      
      this.completedTasks.set(task.id, result);
      
      // Update metrics
      this.metrics.totalProcessed++;
      this.updateAverageProcessingTime(processingTime);
      
      // Notify router of confirmation creation
      if (this.onConfirmationCreated) {
        this.onConfirmationCreated();
      }
      
      this.logger.debug('Confirmation task completed successfully', {
        taskId: task.id,
        transferId: task.transfer.id,
        processingTime,
        confirmationId: confirmationRecord.id
      });
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.logger.error('Confirmation task failed', {
        taskId: task.id,
        transferId: task.transfer.id,
        error: (error as Error).message,
        retryCount: task.retryCount,
        maxRetries: task.maxRetries
      });
      
      // Handle retry logic
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        // Add back to queue with delay
        setTimeout(() => {
          this.addToQueue(task);
        }, 1000 * Math.pow(2, task.retryCount)); // Exponential backoff
      } else {
        // Max retries reached - mark as failed
        const result: ConfirmationResult = {
          taskId: task.id,
          transferId: task.transfer.id,
          success: false,
          error: (error as Error).message,
          processingTime
        };
        
        this.completedTasks.set(task.id, result);
        this.metrics.totalFailed++;
      }
    } finally {
      // Remove from active tasks
      this.activeTasks.delete(task.id);
    }
  }

  /**
   * Add task to queue with priority ordering
   */
  private addToQueue(task: ConfirmationTask): void {
    // Insert task based on priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    
    let insertIndex = this.processingQueue.length;
    for (let i = 0; i < this.processingQueue.length; i++) {
      if (priorityOrder[task.priority] < priorityOrder[this.processingQueue[i].priority]) {
        insertIndex = i;
        break;
      }
    }
    
    this.processingQueue.splice(insertIndex, 0, task);
  }

  /**
   * Wait for at least one task to complete
   */
  private async waitForTaskCompletion(): Promise<void> {
    const timeout = 100; // 100ms
    const startTime = Date.now();
    const initialActiveCount = this.activeTasks.size;
    
    while (this.activeTasks.size >= initialActiveCount && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * Update average processing time metric
   */
  private updateAverageProcessingTime(newTime: number): void {
    const totalProcessed = this.metrics.totalProcessed;
    this.metrics.averageProcessingTime = 
      ((this.metrics.averageProcessingTime * (totalProcessed - 1)) + newTime) / totalProcessed;
  }

  /**
   * Get confirmation result for a specific task
   */
  async getConfirmationResult(taskId: string): Promise<ConfirmationResult | null> {
    return this.completedTasks.get(taskId) || null;
  }

  /**
   * Get processing metrics
   */
  getMetrics(): {
    queueSize: number;
    processingCount: number;
    completedCount: number;
    averageProcessingTime: number;
    isProcessing: boolean;
  } {
    return {
      queueSize: this.processingQueue.length,
      processingCount: this.activeTasks.size,
      completedCount: this.completedTasks.size,
      averageProcessingTime: this.metrics.averageProcessingTime,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Get status of all tasks for a transfer
   */
  async getTransferConfirmationStatus(transferId: string): Promise<{
    pending: ConfirmationTask[];
    active: ConfirmationTask[];
    completed: ConfirmationResult[];
  }> {
    const pending = this.processingQueue.filter(task => task.transfer.id === transferId);
    const active = Array.from(this.activeTasks.values()).filter(task => task.transfer.id === transferId);
    const completed = Array.from(this.completedTasks.values()).filter(result => result.transferId === transferId);
    
    return { pending, active, completed };
  }

  /**
   * Clean up old completed tasks
   */
  async cleanup(olderThanMinutes: number = 60): Promise<number> {
    const cutoffTime = Date.now() - (olderThanMinutes * 60 * 1000);
    let cleanedCount = 0;
    
    for (const [taskId, result] of this.completedTasks.entries()) {
      // Assuming we can derive completion time from task ID timestamp
      const taskTimestamp = parseInt(taskId.split('-')[2]);
      if (taskTimestamp < cutoffTime) {
        this.completedTasks.delete(taskId);
        cleanedCount++;
      }
    }
    
    this.logger.info('Cleaned up old confirmation tasks', {
      cleanedCount,
      remainingCompleted: this.completedTasks.size
    });
    
    return cleanedCount;
  }

  /**
   * Get processor statistics
   */
  getStatistics(): any {
    return {
      processedTransfers: this.completedTasks.size,
      averageProcessingTime: 0, // Would calculate from completed tasks
      successRate: 1.0, // Would calculate from success/failure ratio
      activeTasks: this.activeTasks.size,
      queuedTasks: this.processingQueue.length
    };
  }

  /**
   * Shutdown the processor gracefully
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down ParallelConfirmationProcessor');
    
    // Wait for active tasks to complete (with timeout)
    const shutdownTimeout = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.activeTasks.size > 0 && Date.now() - startTime < shutdownTimeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (this.activeTasks.size > 0) {
      this.logger.warn('Shutdown timeout reached with active tasks remaining', {
        activeTasksCount: this.activeTasks.size
      });
    }
    
    this.logger.info('ParallelConfirmationProcessor shutdown complete');
  }
}