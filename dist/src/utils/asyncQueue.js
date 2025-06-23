"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouterOperationQueue = exports.AsyncQueue = exports.Priority = void 0;
const events_1 = require("events");
/**
 * Priority levels for queue items
 */
var Priority;
(function (Priority) {
    Priority[Priority["LOW"] = 0] = "LOW";
    Priority[Priority["NORMAL"] = 1] = "NORMAL";
    Priority[Priority["HIGH"] = 2] = "HIGH";
    Priority[Priority["CRITICAL"] = 3] = "CRITICAL";
})(Priority || (exports.Priority = Priority = {}));
/**
 * Generic async queue with priority support and concurrency control
 */
class AsyncQueue extends events_1.EventEmitter {
    constructor(options = {}, logger) {
        super();
        this.queue = [];
        this.running = new Set();
        this.paused = false;
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
    async add(task, options = {}) {
        return new Promise((resolve, reject) => {
            const queueItem = {
                id: this.generateId(),
                task: task,
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
    async processNext() {
        if (this.paused || this.running.size >= this.maxConcurrency || this.queue.length === 0) {
            return;
        }
        const item = this.queue.shift();
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
    async executeItem(item) {
        const startTime = Date.now();
        try {
            this.emit('processing', item);
            let result;
            if (item.timeout) {
                result = await this.withTimeout(item.task(), item.timeout);
            }
            else {
                result = await item.task();
            }
            const processTime = Date.now() - startTime;
            this.updateAverageProcessTime(processTime);
            item.resolve(result);
            this.stats.totalProcessed++;
            this.emit('completed', item, result);
        }
        catch (error) {
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
    pause() {
        this.paused = true;
        this.emit('paused');
    }
    /**
     * Resume queue processing
     */
    resume() {
        this.paused = false;
        this.emit('resumed');
        this.processNext();
    }
    /**
     * Clear all pending items
     */
    clear() {
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
    getStats() {
        return {
            ...this.stats,
            currentSize: this.queue.length
        };
    }
    /**
     * Get current queue size
     */
    size() {
        return this.queue.length;
    }
    /**
     * Check if queue is empty
     */
    isEmpty() {
        return this.queue.length === 0 && this.running.size === 0;
    }
    /**
     * Wait for all current tasks to complete
     */
    async drain() {
        while (!this.isEmpty()) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }
    sortQueue() {
        this.queue.sort((a, b) => {
            // Higher priority first
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            // Earlier added first for same priority
            return a.addedAt - b.addedAt;
        });
    }
    generateId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    async withTimeout(promise, timeoutMs) {
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
    calculateRetryDelay(attempt) {
        // Exponential backoff: 100ms, 200ms, 400ms, 800ms, etc.
        return Math.min(100 * Math.pow(2, attempt - 1), 5000);
    }
    updateAverageWaitTime(waitTime) {
        // Wait time tracking could be added to QueueStats interface if needed
        // For now, we'll skip this to avoid TypeScript errors
    }
    updateAverageProcessTime(processTime) {
        const total = this.stats.totalProcessed + this.stats.totalFailed;
        if (total === 0) {
            this.stats.averageProcessingTime = processTime;
        }
        else {
            this.stats.averageProcessingTime =
                (this.stats.averageProcessingTime * total + processTime) / (total + 1);
        }
    }
}
exports.AsyncQueue = AsyncQueue;
/**
 * Specialized queue for router operations
 */
class RouterOperationQueue {
    constructor(logger) {
        this.logger = logger;
        // Different concurrency limits for different operation types
        this.transferQueue = new AsyncQueue({ concurrency: 3 }, logger); // Conservative for transfers
        this.assetQueue = new AsyncQueue({ concurrency: 5 }, logger); // Moderate for assets
        this.networkQueue = new AsyncQueue({ concurrency: 10 }, logger); // Higher for network ops
        this.validationQueue = new AsyncQueue({ concurrency: 15 }, logger); // Highest for validations
        this.setupEventListeners();
    }
    /**
     * Queue a transfer operation
     */
    async queueTransfer(operation, priority = Priority.NORMAL, timeout) {
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
    async queueAsset(operation, priority = Priority.NORMAL, timeout) {
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
    async queueNetwork(operation, priority = Priority.NORMAL, timeout) {
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
    async queueValidation(operation, priority = Priority.HIGH // Validations are typically high priority
    ) {
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
    getStats() {
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
    pauseAll() {
        this.transferQueue.pause();
        this.assetQueue.pause();
        this.networkQueue.pause();
        this.validationQueue.pause();
    }
    /**
     * Resume all queues
     */
    resumeAll() {
        this.transferQueue.resume();
        this.assetQueue.resume();
        this.networkQueue.resume();
        this.validationQueue.resume();
    }
    /**
     * Wait for all queues to drain
     */
    async drainAll() {
        await Promise.all([
            this.transferQueue.drain(),
            this.assetQueue.drain(),
            this.networkQueue.drain(),
            this.validationQueue.drain()
        ]);
    }
    setupEventListeners() {
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
exports.RouterOperationQueue = RouterOperationQueue;
//# sourceMappingURL=asyncQueue.js.map