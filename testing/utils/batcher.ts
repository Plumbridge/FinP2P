import { Logger } from 'winston';
import { EventEmitter } from 'events';

/**
 * Generic request batcher for optimizing network calls
 */
export class RequestBatcher<TRequest, TResponse> extends EventEmitter {
  private pendingRequests: Map<string, BatchedRequest<TRequest, TResponse>> = new Map();
  private batchTimer?: NodeJS.Timeout;
  private readonly processor: BatchProcessor<TRequest, TResponse>;
  private readonly options: BatcherOptions;
  private readonly logger: Logger;
  private stats: BatcherStats;

  constructor(
    processor: BatchProcessor<TRequest, TResponse>,
    options: BatcherOptions = {},
    logger: Logger
  ) {
    super();
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

  async add(key: string, request: TRequest): Promise<TResponse> {
    return new Promise((resolve, reject) => {
      const batchedRequest: BatchedRequest<TRequest, TResponse> = {
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

  async flush(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }
    await this.processBatch();
  }

  getStats(): BatcherStats {
    return { ...this.stats };
  }

  private scheduleBatch(): void {
    if (this.batchTimer || this.pendingRequests.size === 0) {
      return;
    }

    this.batchTimer = setTimeout(() => {
      this.processBatch();
    }, this.options.maxWaitMs);
  }

  private async processBatch(): Promise<void> {
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
        } else {
          batchedRequest.reject(new Error('Response not found for request'));
        }
      });

      // Update stats
      this.stats.batchesProcessed++;
      this.updateAverages(batchSize, waitTime);

    } catch (error) {
      this.stats.errors++;
      this.logger.error('Batch processing failed:', error);

      // Reject all requests in the batch
      batch.forEach(batchedRequest => {
        batchedRequest.reject(error as Error);
      });
    }
  }

  private updateAverages(batchSize: number, waitTime: number): void {
    const totalBatches = this.stats.batchesProcessed;
    this.stats.averageBatchSize =
      (this.stats.averageBatchSize * (totalBatches - 1) + batchSize) / totalBatches;
    this.stats.averageWaitTime =
      (this.stats.averageWaitTime * (totalBatches - 1) + waitTime) / totalBatches;
  }
}

/**
 * Specialized batcher for peer router requests
 */
export class PeerRequestBatcher {
  private batchers: Map<string, RequestBatcher<any, any>> = new Map();
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async batchRequest(endpoint: string, path: string, data: any): Promise<any> {
    const batcherKey = `${endpoint}:${path}`;

    if (!this.batchers.has(batcherKey)) {
      const batcher = new RequestBatcher(
        (requests) => this.processPeerBatch(endpoint, path, requests),
        {
          maxBatchSize: 5,
          maxWaitMs: 50,
          maxConcurrentBatches: 2
        },
        this.logger
      );
      this.batchers.set(batcherKey, batcher);
    }

    const batcher = this.batchers.get(batcherKey)!;
    return batcher.add(JSON.stringify(data), data);
  }

  private async processPeerBatch(endpoint: string, path: string, requests: any[]): Promise<any[]> {
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

      const result = await response.json() as { responses?: any[] };
      return result.responses || [];
    } catch (error) {
      this.logger.error(`Peer batch request failed for ${endpoint}${path}:`, error);
      throw error;
    }
  }

  getStats(): Record<string, BatcherStats> {
    const stats: Record<string, BatcherStats> = {};
    this.batchers.forEach((batcher, key) => {
      stats[key] = batcher.getStats();
    });
    return stats;
  }
}

/**
 * Transfer validation batcher
 */
export class ValidationBatcher {
  private batcher: RequestBatcher<ValidationRequest, ValidationResponse>;

  constructor(logger: Logger) {
    this.batcher = new RequestBatcher(
      (requests) => this.processValidationBatch(requests),
      {
        maxBatchSize: 20,
        maxWaitMs: 25,
        maxConcurrentBatches: 5
      },
      logger
    );
  }

  async validateTransfer(transferData: any): Promise<ValidationResponse> {
    const request: ValidationRequest = {
      type: 'transfer',
      data: transferData,
      timestamp: Date.now()
    };

    return this.batcher.add(JSON.stringify(request), request);
  }

  async validateAsset(assetData: any): Promise<ValidationResponse> {
    const request: ValidationRequest = {
      type: 'asset',
      data: assetData,
      timestamp: Date.now()
    };

    return this.batcher.add(JSON.stringify(request), request);
  }

  private async processValidationBatch(requests: ValidationRequest[]): Promise<ValidationResponse[]> {
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
      } catch (error) {
        return {
          valid: false,
          errors: [(error as Error).message],
          timestamp: Date.now()
        };
      }
    });

    return Promise.all(validationPromises);
  }

  private async performValidation(request: ValidationRequest): Promise<boolean> {
    // Implement actual validation logic here
    // This is a placeholder that simulates validation
    await new Promise(resolve => setTimeout(resolve, 1));
    return request.data && typeof request.data === 'object';
  }

  getStats(): BatcherStats {
    return this.batcher.getStats();
  }
}

interface BatchedRequest<TRequest, TResponse> {
  key: string;
  request: TRequest;
  resolve: (response: TResponse) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

interface BatcherOptions {
  maxBatchSize?: number;
  maxWaitMs?: number;
  maxConcurrentBatches?: number;
}

interface BatcherStats {
  requestsReceived: number;
  batchesProcessed: number;
  averageBatchSize: number;
  averageWaitTime: number;
  errors: number;
}

interface ValidationRequest {
  type: 'transfer' | 'asset' | 'account';
  data: any;
  timestamp: number;
}

interface ValidationResponse {
  valid: boolean;
  errors: string[];
  timestamp: number;
}

type BatchProcessor<TRequest, TResponse> = (requests: TRequest[]) => Promise<TResponse[]>;
