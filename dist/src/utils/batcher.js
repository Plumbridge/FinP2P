"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationBatcher = exports.PeerRequestBatcher = exports.RequestBatcher = void 0;
const events_1 = require("events");
/**
 * Generic request batcher for optimizing network calls
 */
class RequestBatcher extends events_1.EventEmitter {
    constructor(processor, options = {}, logger) {
        super();
        this.pendingRequests = new Map();
        this.processor = processor;
        this.options = {
            maxBatchSize: 10,
            maxWaitMs: 100,
            maxConcurrentBatches: 3,
            ...options
        };
        this.logger = logger;
        this.stats = {
            requestsReceived: 0,
            batchesProcessed: 0,
            averageBatchSize: 0,
            averageWaitTime: 0,
            errors: 0
        };
    }
    async add(key, request) {
        return new Promise((resolve, reject) => {
            const batchedRequest = {
                key,
                request,
                resolve,
                reject,
                timestamp: Date.now()
            };
            this.pendingRequests.set(key, batchedRequest);
            this.stats.requestsReceived++;
            // Schedule batch processing
            this.scheduleBatch();
            // Check if we should process immediately
            if (this.pendingRequests.size >= (this.options.maxBatchSize || 10)) {
                this.processBatch();
            }
        });
    }
    async flush() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = undefined;
        }
        await this.processBatch();
    }
    getStats() {
        return { ...this.stats };
    }
    scheduleBatch() {
        if (this.batchTimer || this.pendingRequests.size === 0) {
            return;
        }
        this.batchTimer = setTimeout(() => {
            this.processBatch();
        }, this.options.maxWaitMs);
    }
    async processBatch() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = undefined;
        }
        if (this.pendingRequests.size === 0) {
            return;
        }
        // Extract current batch
        const batch = Array.from(this.pendingRequests.values());
        this.pendingRequests.clear();
        const batchSize = batch.length;
        const waitTime = Date.now() - Math.min(...batch.map(r => r.timestamp));
        try {
            // Process the batch
            const requests = batch.map(b => b.request);
            const responses = await this.processor(requests);
            // Resolve individual requests
            batch.forEach((batchedRequest, index) => {
                if (index < responses.length) {
                    batchedRequest.resolve(responses[index]);
                }
                else {
                    batchedRequest.reject(new Error('Response not found for request'));
                }
            });
            // Update stats
            this.stats.batchesProcessed++;
            this.updateAverages(batchSize, waitTime);
        }
        catch (error) {
            this.stats.errors++;
            this.logger.error('Batch processing failed:', error);
            // Reject all requests in the batch
            batch.forEach(batchedRequest => {
                batchedRequest.reject(error);
            });
        }
    }
    updateAverages(batchSize, waitTime) {
        const totalBatches = this.stats.batchesProcessed;
        this.stats.averageBatchSize =
            (this.stats.averageBatchSize * (totalBatches - 1) + batchSize) / totalBatches;
        this.stats.averageWaitTime =
            (this.stats.averageWaitTime * (totalBatches - 1) + waitTime) / totalBatches;
    }
}
exports.RequestBatcher = RequestBatcher;
/**
 * Specialized batcher for peer router requests
 */
class PeerRequestBatcher {
    constructor(logger) {
        this.batchers = new Map();
        this.logger = logger;
    }
    async batchRequest(endpoint, path, data) {
        const batcherKey = `${endpoint}:${path}`;
        if (!this.batchers.has(batcherKey)) {
            const batcher = new RequestBatcher((requests) => this.processPeerBatch(endpoint, path, requests), {
                maxBatchSize: 5,
                maxWaitMs: 50,
                maxConcurrentBatches: 2
            }, this.logger);
            this.batchers.set(batcherKey, batcher);
        }
        const batcher = this.batchers.get(batcherKey);
        return batcher.add(JSON.stringify(data), data);
    }
    async processPeerBatch(endpoint, path, requests) {
        try {
            // Send batched request to peer
            const response = await fetch(`${endpoint}${path}/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ requests })
            });
            if (!response.ok) {
                throw new Error(`Batch request failed: ${response.statusText}`);
            }
            const result = await response.json();
            return result.responses || [];
        }
        catch (error) {
            this.logger.error(`Peer batch request failed for ${endpoint}${path}:`, error);
            throw error;
        }
    }
    getStats() {
        const stats = {};
        this.batchers.forEach((batcher, key) => {
            stats[key] = batcher.getStats();
        });
        return stats;
    }
}
exports.PeerRequestBatcher = PeerRequestBatcher;
/**
 * Transfer validation batcher
 */
class ValidationBatcher {
    constructor(logger) {
        this.batcher = new RequestBatcher((requests) => this.processValidationBatch(requests), {
            maxBatchSize: 20,
            maxWaitMs: 25,
            maxConcurrentBatches: 5
        }, logger);
    }
    async validateTransfer(transferData) {
        const request = {
            type: 'transfer',
            data: transferData,
            timestamp: Date.now()
        };
        return this.batcher.add(JSON.stringify(request), request);
    }
    async validateAsset(assetData) {
        const request = {
            type: 'asset',
            data: assetData,
            timestamp: Date.now()
        };
        return this.batcher.add(JSON.stringify(request), request);
    }
    async processValidationBatch(requests) {
        // Process validations in parallel for better performance
        const validationPromises = requests.map(async (request) => {
            try {
                // Simulate validation logic
                const isValid = await this.performValidation(request);
                return {
                    valid: isValid,
                    errors: isValid ? [] : ['Validation failed'],
                    timestamp: Date.now()
                };
            }
            catch (error) {
                return {
                    valid: false,
                    errors: [error.message],
                    timestamp: Date.now()
                };
            }
        });
        return Promise.all(validationPromises);
    }
    async performValidation(request) {
        // Implement actual validation logic here
        // This is a placeholder that simulates validation
        await new Promise(resolve => setTimeout(resolve, 1));
        return request.data && typeof request.data === 'object';
    }
    getStats() {
        return this.batcher.getStats();
    }
}
exports.ValidationBatcher = ValidationBatcher;
//# sourceMappingURL=batcher.js.map