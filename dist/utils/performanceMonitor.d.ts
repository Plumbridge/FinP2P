/// <reference types="node" />
/// <reference types="node" />
import { Logger } from 'winston';
import { EventEmitter } from 'events';
/**
 * Enhanced performance monitoring system
 */
export declare class PerformanceMonitor extends EventEmitter {
    private metrics;
    private timers;
    private readonly logger;
    private readonly options;
    private reportInterval?;
    private memoryBaseline;
    constructor(logger: Logger, options?: MonitorOptions);
    /**
     * Start timing an operation
     */
    startTimer(name: string, metadata?: Record<string, any>): string;
    /**
     * End timing and record metric
     */
    endTimer(timerId: string): number;
    /**
     * Record a custom metric
     */
    recordMetric(name: string, value: number, type?: MetricType, metadata?: Record<string, any>): void;
    /**
     * Increment a counter metric
     */
    increment(name: string, value?: number, metadata?: Record<string, any>): void;
    /**
     * Record memory usage
     */
    recordMemoryUsage(): void;
    /**
     * Record CPU usage (simplified)
     */
    recordCpuUsage(): void;
    /**
     * Get metric data
     */
    getMetric(name: string): MetricData | undefined;
    /**
     * Get all metrics
     */
    getAllMetrics(): Record<string, MetricData>;
    /**
     * Get performance summary
     */
    getSummary(): PerformanceSummary;
    /**
     * Clear old metrics
     */
    cleanup(maxAge?: number): void;
    /**
     * Reset all metrics
     */
    reset(): void;
    /**
     * Stop monitoring
     */
    stop(): void;
    private startReporting;
    private getTopMetrics;
    private checkAlerts;
    private getActiveAlerts;
}
/**
 * Router-specific performance tracker
 */
export declare class RouterPerformanceTracker {
    private monitor;
    private operationCounters;
    constructor(logger: Logger);
    trackOperation(operation: string): OperationTracker;
    trackTransfer(transferId: string): OperationTracker;
    trackAssetOperation(operation: string, assetId: string): OperationTracker;
    trackNetworkOperation(operation: string, peerId?: string): OperationTracker;
    recordError(operation: string, error: Error): void;
    recordSuccess(operation: string): void;
    private incrementCounter;
    getMetrics(): Record<string, MetricData>;
    getSummary(): PerformanceSummary;
    stop(): void;
}
interface MetricData {
    name: string;
    type: MetricType;
    values: Array<{
        value: number;
        timestamp: number;
    }>;
    count: number;
    sum: number;
    min: number;
    max: number;
    avg: number;
    lastUpdated: number;
    metadata: Record<string, any>;
}
interface MonitorOptions {
    reportIntervalMs?: number;
    maxMetrics?: number;
    enableMemoryTracking?: boolean;
    enableCpuTracking?: boolean;
}
interface PerformanceSummary {
    timestamp: number;
    totalMetrics: number;
    activeTimers: number;
    memoryUsage?: NodeJS.MemoryUsage;
    uptime: number;
    topMetrics: Array<{
        name: string;
        value: number;
        type: MetricType;
    }>;
    alerts: Alert[];
}
interface Alert {
    type: string;
    metric: string;
    value: number;
    threshold: number;
    timestamp: number;
}
interface OperationTracker {
    end(): number;
    addMetadata(metadata: Record<string, any>): void;
}
type MetricType = 'gauge' | 'counter' | 'duration' | 'histogram';
export {};
//# sourceMappingURL=performanceMonitor.d.ts.map