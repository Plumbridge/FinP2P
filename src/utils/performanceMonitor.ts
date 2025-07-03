import { Logger } from 'winston';
import { EventEmitter } from 'events';

/**
 * Enhanced performance monitoring system
 */
export class PerformanceMonitor extends EventEmitter {
  private metrics: Map<string, MetricData> = new Map();
  private timers: Map<string, TimerData> = new Map();
  private readonly logger: Logger;
  private readonly options: MonitorOptions;
  private reportInterval?: NodeJS.Timeout;
  private memoryBaseline: number;

  constructor(logger: Logger, options: MonitorOptions = {}) {
    super();
    this.logger = logger;
    this.options = {
      reportIntervalMs: 60000, // 1 minute
      maxMetrics: 1000,
      enableMemoryTracking: true,
      enableCpuTracking: true,
      ...options
    };
    this.memoryBaseline = process.memoryUsage().heapUsed;
    this.startReporting();
  }

  /**
   * Start timing an operation
   */
  startTimer(name: string, metadata?: Record<string, any>): string {
    const timerId = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.timers.set(timerId, {
      name,
      startTime: process.hrtime.bigint(),
      metadata: metadata || {}
    });
    return timerId;
  }

  /**
   * End timing and record metric
   */
  endTimer(timerId: string): number {
    const timer = this.timers.get(timerId);
    if (!timer) {
      this.logger.warn(`Timer ${timerId} not found`);
      return 0;
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - timer.startTime) / 1000000; // Convert to milliseconds
    
    this.recordMetric(timer.name, duration, 'duration', timer.metadata);
    this.timers.delete(timerId);
    
    return duration;
  }

  /**
   * Record a custom metric
   */
  recordMetric(name: string, value: number, type: MetricType = 'gauge', metadata?: Record<string, any>): void {
    const now = Date.now();
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        type,
        values: [],
        count: 0,
        sum: 0,
        min: value,
        max: value,
        avg: value,
        lastUpdated: now,
        metadata: metadata || {}
      });
    }

    const metric = this.metrics.get(name)!;
    metric.values.push({ value, timestamp: now });
    metric.count++;
    metric.sum += value;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);
    metric.avg = metric.sum / metric.count;
    metric.lastUpdated = now;

    // Keep only recent values to prevent memory bloat
    if (metric.values.length > 100) {
      metric.values = metric.values.slice(-50);
    }

    // Emit event for real-time monitoring
    this.emit('metric', { name, value, type, timestamp: now });

    // Check for performance alerts
    this.checkAlerts(name, value, metric);
  }

  /**
   * Increment a counter metric
   */
  increment(name: string, value: number = 1, metadata?: Record<string, any>): void {
    this.recordMetric(name, value, 'counter', metadata);
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(): void {
    if (!this.options.enableMemoryTracking) return;

    const usage = process.memoryUsage();
    this.recordMetric('memory.heapUsed', usage.heapUsed, 'gauge');
    this.recordMetric('memory.heapTotal', usage.heapTotal, 'gauge');
    this.recordMetric('memory.external', usage.external, 'gauge');
    this.recordMetric('memory.rss', usage.rss, 'gauge');
    
    const heapDelta = usage.heapUsed - this.memoryBaseline;
    this.recordMetric('memory.heapDelta', heapDelta, 'gauge');
  }

  /**
   * Record CPU usage
   */
  recordCpuUsage(): void {
    if (!this.options.enableCpuTracking) return;

    const usage = process.cpuUsage();
    this.recordMetric('cpu.user', usage.user, 'gauge');
    this.recordMetric('cpu.system', usage.system, 'gauge');
  }

  /**
   * Get metric data
   */
  getMetric(name: string): MetricData | undefined {
    return this.metrics.get(name);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, MetricData> {
    const result: Record<string, MetricData> = {};
    this.metrics.forEach((metric, name) => {
      result[name] = { ...metric };
    });
    return result;
  }

  /**
   * Get performance summary
   */
  getSummary(): PerformanceSummary {
    const metrics = this.getAllMetrics();
    const now = Date.now();
    
    return {
      timestamp: now,
      totalMetrics: this.metrics.size,
      activeTimers: this.timers.size,
      memoryUsage: this.options.enableMemoryTracking ? process.memoryUsage() : undefined,
      uptime: process.uptime(),
      topMetrics: this.getTopMetrics(5),
      alerts: this.getActiveAlerts()
    };
  }

  /**
   * Clear old metrics
   */
  cleanup(maxAge: number = 3600000): void { // 1 hour default
    const cutoff = Date.now() - maxAge;
    
    this.metrics.forEach((metric, name) => {
      metric.values = metric.values.filter(v => v.timestamp > cutoff);
      if (metric.values.length === 0) {
        this.metrics.delete(name);
      }
    });
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.timers.clear();
    this.memoryBaseline = process.memoryUsage().heapUsed;
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = undefined;
    }
  }

  private startReporting(): void {
    if (this.options.reportIntervalMs && this.options.reportIntervalMs > 0) {
      this.reportInterval = setInterval(() => {
        this.recordMemoryUsage();
        this.recordCpuUsage();
        this.emit('report', this.getSummary());
      }, this.options.reportIntervalMs);
    }
  }

  private getTopMetrics(limit: number): Array<{ name: string; value: number; type: MetricType }> {
    return Array.from(this.metrics.values())
      .sort((a, b) => {
        if (a.type === 'duration' && b.type === 'duration') {
          return b.avg - a.avg; // Highest average duration first
        }
        if (a.type === 'counter' && b.type === 'counter') {
          return b.sum - a.sum; // Highest count first
        }
        return b.count - a.count; // Most frequently updated first
      })
      .slice(0, limit)
      .map(metric => ({
        name: metric.name,
        value: metric.type === 'duration' ? metric.avg : metric.sum,
        type: metric.type
      }));
  }

  private checkAlerts(name: string, value: number, metric: MetricData): void {
    // Simple alerting logic - can be extended
    if (metric.type === 'duration' && value > 1000) { // > 1 second
      this.emit('alert', {
        type: 'slow_operation',
        metric: name,
        value,
        threshold: 1000,
        timestamp: Date.now()
      });
    }

    if (name.includes('memory') && value > 100 * 1024 * 1024) { // > 100MB
      this.emit('alert', {
        type: 'high_memory',
        metric: name,
        value,
        threshold: 100 * 1024 * 1024,
        timestamp: Date.now()
      });
    }
  }

  private getActiveAlerts(): Alert[] {
    // This would typically store alerts in memory or database
    // For now, return empty array
    return [];
  }
}

/**
 * Router-specific performance tracker
 */
export class RouterPerformanceTracker {
  private monitor: PerformanceMonitor;
  private operationCounters: Map<string, number> = new Map();

  constructor(logger: Logger) {
    this.monitor = new PerformanceMonitor(logger, {
      reportIntervalMs: 30000, // 30 seconds for router
      enableMemoryTracking: true,
      enableCpuTracking: true
    });

    // Set up event listeners
    this.monitor.on('alert', (alert) => {
      logger.warn('Performance alert:', alert);
    });
  }

  trackOperation(operation: string): OperationTracker {
    const timerId = this.monitor.startTimer(`router.${operation}`);
    this.incrementCounter(`router.${operation}.count`);
    
    return {
      end: () => {
        const duration = this.monitor.endTimer(timerId);
        return duration;
      },
      addMetadata: (metadata: Record<string, any>) => {
        // Metadata would be added to the timer if supported
      }
    };
  }

  trackTransfer(transferId: string): OperationTracker {
    return this.trackOperation(`transfer.${transferId}`);
  }

  trackAssetOperation(operation: string, assetId: string): OperationTracker {
    return this.trackOperation(`asset.${operation}.${assetId}`);
  }

  trackNetworkOperation(operation: string, peerId?: string): OperationTracker {
    const opName = peerId ? `network.${operation}.${peerId}` : `network.${operation}`;
    return this.trackOperation(opName);
  }

  recordError(operation: string, error: Error): void {
    this.monitor.increment(`router.${operation}.errors`);
    this.monitor.recordMetric(`router.${operation}.error_rate`, 1, 'counter', {
      error: error.message,
      stack: error.stack
    });
  }

  recordSuccess(operation: string): void {
    this.monitor.increment(`router.${operation}.success`);
  }

  private incrementCounter(name: string): void {
    const current = this.operationCounters.get(name) || 0;
    this.operationCounters.set(name, current + 1);
    this.monitor.increment(name);
  }

  getMetrics(): Record<string, MetricData> {
    return this.monitor.getAllMetrics();
  }

  getSummary(): PerformanceSummary {
    return this.monitor.getSummary();
  }

  stop(): void {
    this.monitor.stop();
  }
}

interface TimerData {
  name: string;
  startTime: bigint;
  metadata: Record<string, any>;
}

interface MetricData {
  name: string;
  type: MetricType;
  values: Array<{ value: number; timestamp: number }>;
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
  topMetrics: Array<{ name: string; value: number; type: MetricType }>;
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