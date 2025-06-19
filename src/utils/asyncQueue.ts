import { Logger } from 'winston';
import { EventEmitter } from 'events';

/**
 * Priority levels for queue items
 */
export enum Priority {
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
 * Queue item with priority and metadata
 */
interface QueueItem<T> {
  id: string;
  task: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  priority: Priority;
  timeout?: number;
  retries: number;
  maxRetries: number;
  addedAt: number;
  metadata: Record<string, any>;
}

/**
 * Generic async queue with priority support and concurrency control
 */
export class AsyncQueue<T = any> extends EventEmitter {
  private queue: QueueItem<T>[] = [];
  private running: Set<Promise<any>> = new Set();
  private readonly maxConcurrency: number;
  private readonly options: QueueOptions;
  private readonly logger: Logger;
  private stats: QueueStats;
  private paused: boolean = false;

  constructor(options: QueueOptions = {}, logger: Logger) {
    super();
    this.options = {
      concurrency: 1,
      retryAttempts: 3,
      retryDelayMs: 1000,
      timeoutMs: 30000,
      ...options
    };
    this.maxConcurrency = this.options.concurrency || 5;
    this.logger = logger;
    this.stats = {
      totalAdded: 0,
      totalProcessed: 0,
      totalFailed: 0,
      currentSize: 0,
      averageProcessingTime: 0
    };
  }

  /**
   * Add a task to the queue
   */
  async add<R>(
    task: () => Promise<R>,
    options: QueueOptions = {}
  ): Promise<R> {
    return new Promise((resolve, reject) => {
      const queueItem: QueueItem<T> = {
        id: this.generateId(),
        task: task as () => Promise<any>,
        resolve,
        reject,
        priority: options.priority || Priority.NORMAL,
        timeout: options.timeout,
        retries: options.retries || 0,
        maxRetries: options.maxRetries || 0,
        addedAt: Date.now(),
        metadata: options.metadata || {}
      };

      this.queue.push(queueItem);
      this.sortQueue();
      this.stats.totalAdded++;
      this.stats.currentSize = this.queue.length;

      this.emit('added', queueItem);
      this.processNext();
    });
  }

  /**
   * Process the next item in the queue
   */
  private async processNext(): Promise<void> {
    if (this.paused || this.running.size >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift()!;
    this.stats.currentSize = this.queue.length;
    
    const waitTime = Date.now() - item.addedAt;
    this.updateAverageWaitTime(waitTime);

    const promise = this.executeItem(item);
    this.running.add(promise);

    promise.finally(() => {
      this.running.delete(promise);
      this.processNext(); // Process next item
    });
  }

  /**
   * Execute a queue item
   */
  private async executeItem(item: QueueItem<T>): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.emit('processing', item);
      
      let result: any;
      if (item.timeout) {
        result = await this.withTimeout(item.task(), item.timeout);
      } else {
        result = await item.task();
      }

      const processTime = Date.now() - startTime;
      this.updateAverageProcessTime(processTime);
      
      item.resolve(result);
      this.stats.totalProcessed++;
      this.emit('completed', item, result);
      
    } catch (error) {
      const processTime = Date.now() - startTime;
      this.updateAverageProcessTime(processTime);
      
      if (item.retries < item.maxRetries) {
        item.retries++;
        this.logger.warn(`Retrying task ${item.id}, attempt ${item.retries}/${item.maxRetries}`);
        
        // Add back to queue with delay
        setTimeout(() => {
          this.queue.unshift(item);
          this.stats.currentSize = this.queue.length;
          this.processNext();
        }, this.calculateRetryDelay(item.retries));
        
        return;
      }

      this.logger.error(`Task ${item.id} failed after ${item.retries} retries:`, error);
      item.reject(error);
      this.stats.totalFailed++;
      this.emit('failed', item, error);
    }
  }

  /**
   * Pause queue processing
   */
  pause(): void {
    this.paused = true;
    this.emit('paused');
  }

  /**
   * Resume queue processing
   */
  resume(): void {
    this.paused = false;
    this.emit('resumed');
    this.processNext();
  }

  /**
   * Clear all pending items
   */
  clear(): void {
    const clearedItems = this.queue.splice(0);
    this.stats.currentSize = 0;
    
    clearedItems.forEach(item => {
      item.reject(new Error('Queue cleared'));
    });
    
    this.emit('cleared', clearedItems.length);
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    return {
      ...this.stats,
      currentSize: this.queue.length
    };
  }

  /**
   * Get current queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0 && this.running.size === 0;
  }

  /**
   * Wait for all current tasks to complete
   */
  async drain(): Promise<void> {
    while (!this.isEmpty()) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // Higher priority first
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // Earlier added first for same priority
      return a.addedAt - b.addedAt;
    });
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async withTimeout<R>(promise: Promise<R>, timeoutMs: number): Promise<R> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  }

  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff: 100ms, 200ms, 400ms, 800ms, etc.
    return Math.min(100 * Math.pow(2, attempt - 1), 5000);
  }

  private updateAverageWaitTime(waitTime: number): void {
    // Wait time tracking could be added to QueueStats interface if needed
    // For now, we'll skip this to avoid TypeScript errors
  }

  private updateAverageProcessTime(processTime: number): void {
    const total = this.stats.totalProcessed + this.stats.totalFailed;
    if (total === 0) {
      this.stats.averageProcessingTime = processTime;
    } else {
      this.stats.averageProcessingTime = 
        (this.stats.averageProcessingTime * total + processTime) / (total + 1);
    }
  }
}

/**
 * Specialized queue for router operations
 */
export class RouterOperationQueue {
  private transferQueue: AsyncQueue;
  private assetQueue: AsyncQueue;
  private networkQueue: AsyncQueue;
  private validationQueue: AsyncQueue;
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    
    // Different concurrency limits for different operation types
    this.transferQueue = new AsyncQueue({ concurrency: 3 }, logger); // Conservative for transfers
    this.assetQueue = new AsyncQueue({ concurrency: 5 }, logger);     // Moderate for assets
    this.networkQueue = new AsyncQueue({ concurrency: 10 }, logger);  // Higher for network ops
    this.validationQueue = new AsyncQueue({ concurrency: 15 }, logger); // Highest for validations

    this.setupEventListeners();
  }

  /**
   * Queue a transfer operation
   */
  async queueTransfer<R>(
    operation: () => Promise<R>,
    priority: Priority = Priority.NORMAL,
    timeout?: number
  ): Promise<R> {
    return this.transferQueue.add(operation, {
      priority,
      timeout: timeout || 30000, // 30 second default
      maxRetries: 2,
      metadata: { type: 'transfer' }
    });
  }

  /**
   * Queue an asset operation
   */
  async queueAsset<R>(
    operation: () => Promise<R>,
    priority: Priority = Priority.NORMAL,
    timeout?: number
  ): Promise<R> {
    return this.assetQueue.add(operation, {
      priority,
      timeout: timeout || 15000, // 15 second default
      maxRetries: 1,
      metadata: { type: 'asset' }
    });
  }

  /**
   * Queue a network operation
   */
  async queueNetwork<R>(
    operation: () => Promise<R>,
    priority: Priority = Priority.NORMAL,
    timeout?: number
  ): Promise<R> {
    return this.networkQueue.add(operation, {
      priority,
      timeout: timeout || 10000, // 10 second default
      maxRetries: 3,
      metadata: { type: 'network' }
    });
  }

  /**
   * Queue a validation operation
   */
  async queueValidation<R>(
    operation: () => Promise<R>,
    priority: Priority = Priority.HIGH // Validations are typically high priority
  ): Promise<R> {
    return this.validationQueue.add(operation, {
      priority,
      timeout: 5000, // 5 second timeout
      maxRetries: 0, // No retries for validations
      metadata: { type: 'validation' }
    });
  }

  /**
   * Get comprehensive statistics
   */
  getStats(): Record<string, QueueStats> {
    return {
      transfer: this.transferQueue.getStats(),
      asset: this.assetQueue.getStats(),
      network: this.networkQueue.getStats(),
      validation: this.validationQueue.getStats()
    };
  }

  /**
   * Pause all queues
   */
  pauseAll(): void {
    this.transferQueue.pause();
    this.assetQueue.pause();
    this.networkQueue.pause();
    this.validationQueue.pause();
  }

  /**
   * Resume all queues
   */
  resumeAll(): void {
    this.transferQueue.resume();
    this.assetQueue.resume();
    this.networkQueue.resume();
    this.validationQueue.resume();
  }

  /**
   * Wait for all queues to drain
   */
  async drainAll(): Promise<void> {
    await Promise.all([
      this.transferQueue.drain(),
      this.assetQueue.drain(),
      this.networkQueue.drain(),
      this.validationQueue.drain()
    ]);
  }

  private setupEventListeners(): void {
    const queues = {
      transfer: this.transferQueue,
      asset: this.assetQueue,
      network: this.networkQueue,
      validation: this.validationQueue
    };

    Object.entries(queues).forEach(([name, queue]) => {
      queue.on('failed', (item, error) => {
        this.logger.error(`${name} queue task failed:`, {
          id: item.id,
          error: error.message,
          retries: item.retries
        });
      });

      queue.on('completed', (item) => {
        this.logger.debug(`${name} queue task completed:`, {
          id: item.id,
          waitTime: Date.now() - item.addedAt
        });
      });
    });
  }
}