/// <reference types="node" />
import { Logger } from 'winston';
import { EventEmitter } from 'events';
/**
 * Generic connection pool for managing reusable connections
 */
export declare class ConnectionPool<T> extends EventEmitter {
    private connections;
    private waitingQueue;
    private readonly factory;
    private readonly validator;
    private readonly destroyer;
    private readonly options;
    private readonly logger;
    private stats;
    private cleanupInterval?;
    constructor(factory: ConnectionFactory<T>, validator: ConnectionValidator<T>, destroyer: ConnectionDestroyer<T>, options: PoolOptions, logger: Logger);
    acquire(host?: string): Promise<T>;
    release(connection: T): void;
    destroy(): Promise<void>;
    getStats(): PoolStats & {
        active: number;
        idle: number;
        waiting: number;
    };
    private createConnection;
    private preWarm;
    private startCleanupTimer;
    private cleanup;
}
/**
 * HTTP connection pool for peer router connections
 */
export declare class HttpConnectionPool {
    private pools;
    private readonly logger;
    constructor(logger: Logger);
    getPool(endpoint: string): ConnectionPool<any>;
    destroyAll(): Promise<void>;
    destroy(): Promise<void>;
    getStats(): any;
    release(connection: any): void;
    acquire(endpoint: string): Promise<any>;
    private createHttpConnection;
    private validateHttpConnection;
    private destroyHttpConnection;
}
interface PoolOptions {
    min?: number;
    max?: number;
    acquireTimeoutMs?: number;
    idleTimeoutMs?: number;
    validationIntervalMs?: number;
}
interface PoolStats {
    created: number;
    destroyed: number;
    acquired: number;
    released: number;
    timeouts: number;
    errors: number;
}
type ConnectionFactory<T> = () => Promise<T>;
type ConnectionValidator<T> = (connection: T) => boolean;
type ConnectionDestroyer<T> = (connection: T) => Promise<void>;
export {};
//# sourceMappingURL=connectionPool.d.ts.map