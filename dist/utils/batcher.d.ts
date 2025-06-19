/// <reference types="node" />
import { Logger } from 'winston';
import { EventEmitter } from 'events';
/**
 * Generic request batcher for optimizing network calls
 */
export declare class RequestBatcher<TRequest, TResponse> extends EventEmitter {
    private pendingRequests;
    private batchTimer?;
    private readonly processor;
    private readonly options;
    private readonly logger;
    private stats;
    constructor(processor: BatchProcessor<TRequest, TResponse>, options: BatcherOptions | undefined, logger: Logger);
    add(key: string, request: TRequest): Promise<TResponse>;
    flush(): Promise<void>;
    getStats(): BatcherStats;
    private scheduleBatch;
    private processBatch;
    private updateAverages;
}
/**
 * Specialized batcher for peer router requests
 */
export declare class PeerRequestBatcher {
    private batchers;
    private readonly logger;
    constructor(logger: Logger);
    batchRequest(endpoint: string, path: string, data: any): Promise<any>;
    private processPeerBatch;
    getStats(): Record<string, BatcherStats>;
}
/**
 * Transfer validation batcher
 */
export declare class ValidationBatcher {
    private batcher;
    constructor(logger: Logger);
    validateTransfer(transferData: any): Promise<ValidationResponse>;
    validateAsset(assetData: any): Promise<ValidationResponse>;
    private processValidationBatch;
    private performValidation;
    getStats(): BatcherStats;
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
interface ValidationResponse {
    valid: boolean;
    errors: string[];
    timestamp: number;
}
type BatchProcessor<TRequest, TResponse> = (requests: TRequest[]) => Promise<TResponse[]>;
export {};
//# sourceMappingURL=batcher.d.ts.map