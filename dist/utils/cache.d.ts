import { Logger } from 'winston';
import { RedisClientType } from 'redis';
/**
 * Multi-level caching system with LRU in-memory cache and Redis backing
 */
export declare class CacheManager {
    private memoryCache;
    private accessOrder;
    private readonly maxMemorySize;
    private readonly defaultTTL;
    private readonly redis?;
    private readonly logger;
    private stats;
    constructor(redis: RedisClientType | undefined, logger: Logger, options?: CacheOptions);
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    getStats(): CacheStats;
    private setMemory;
    private updateAccessOrder;
    private evictLRU;
    private isExpired;
}
/**
 * Specialized cache for routing information
 */
export declare class RoutingCache extends CacheManager {
    private static readonly ROUTE_PREFIX;
    private static readonly TOPOLOGY_PREFIX;
    private static readonly PEER_PREFIX;
    getRoute(fromLedger: string, toLedger: string): Promise<string[] | null>;
    setRoute(fromLedger: string, toLedger: string, route: string[], ttl?: number): Promise<void>;
    getPeerInfo(peerId: string): Promise<any | null>;
    setPeerInfo(peerId: string, peerInfo: any, ttl?: number): Promise<void>;
    getNetworkTopology(): Promise<any | null>;
    setNetworkTopology(topology: any, ttl?: number): Promise<void>;
    cachePeer(peerId: string, peerInfo: any, ttl?: number): Promise<void>;
    getPeer(peerId: string): Promise<any | null>;
}
interface CacheOptions {
    maxMemorySize?: number;
    defaultTTL?: number;
}
interface CacheStats {
    hits: number;
    misses: number;
    sets: number;
    evictions: number;
    memoryUsage: number;
}
export {};
//# sourceMappingURL=cache.d.ts.map