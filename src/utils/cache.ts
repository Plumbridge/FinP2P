import { Logger } from 'winston';
import { RedisClientType } from 'redis';

/**
 * Multi-level caching system with LRU in-memory cache and Redis backing
 */
export class CacheManager {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = [];
  private readonly maxMemorySize: number;
  private readonly defaultTTL: number;
  private readonly redis?: RedisClientType;
  private readonly logger: Logger;
  private stats: CacheStats;

  constructor(
    redis: RedisClientType | undefined,
    logger: Logger,
    options: CacheOptions = {}
  ) {
    this.redis = redis;
    this.logger = logger;
    this.maxMemorySize = options.maxMemorySize || 1000;
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      memoryUsage: 0
    };
  }

  async get<T>(key: string): Promise<T | null> {
    // Try memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      this.updateAccessOrder(key);
      this.stats.hits++;
      return memoryEntry.value as T;
    }

    // Try Redis cache
    if (this.redis) {
      try {
        const redisValue = await this.redis.get(key);
        if (redisValue) {
          const parsed = JSON.parse(redisValue) as T;
          // Store in memory cache for faster access
          this.setMemory(key, parsed, this.defaultTTL);
          this.stats.hits++;
          return parsed;
        }
      } catch (error) {
        this.logger.warn(`Redis cache get failed for key ${key}:`, error);
      }
    }

    this.stats.misses++;
    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const actualTTL = ttl || this.defaultTTL;

    // Set in memory cache
    this.setMemory(key, value, actualTTL);

    // Set in Redis cache
    if (this.redis) {
      try {
        await this.redis.setEx(key, Math.floor(actualTTL / 1000), JSON.stringify(value));
      } catch (error) {
        this.logger.warn(`Redis cache set failed for key ${key}:`, error);
      }
    }

    this.stats.sets++;
  }

  async delete(key: string): Promise<void> {
    // Remove from memory cache
    this.memoryCache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);

    // Remove from Redis cache
    if (this.redis) {
      try {
        await this.redis.DEL(key);
      } catch (error) {
        this.logger.warn(`Redis cache delete failed for key ${key}:`, error);
      }
    }
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.accessOrder = [];

    if (this.redis) {
      try {
        await this.redis.flushDb();
      } catch (error) {
        this.logger.warn('Redis cache clear failed:', error);
      }
    }
  }

  getStats(): CacheStats {
    this.stats.memoryUsage = this.memoryCache.size;
    return { ...this.stats };
  }

  private setMemory<T>(key: string, value: T, ttl: number): void {
    // Evict if at capacity
    if (this.memoryCache.size >= this.maxMemorySize && !this.memoryCache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry = {
      value,
      expiry: Date.now() + ttl,
      createdAt: Date.now()
    };

    this.memoryCache.set(key, entry);
    this.updateAccessOrder(key);
  }

  private updateAccessOrder(key: string): void {
    // Remove from current position
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  private evictLRU(): void {
    if (this.accessOrder.length > 0) {
      const lruKey = this.accessOrder.shift()!;
      this.memoryCache.delete(lruKey);
      this.stats.evictions++;
    }
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiry;
  }
}

/**
 * Specialized cache for routing information
 */
export class RoutingCache extends CacheManager {
  private static readonly ROUTE_PREFIX = 'route:';
  private static readonly TOPOLOGY_PREFIX = 'topology:';
  private static readonly PEER_PREFIX = 'peer:';

  async getRoute(fromLedger: string, toLedger: string): Promise<string[] | null> {
    const key = `${RoutingCache.ROUTE_PREFIX}${fromLedger}:${toLedger}`;
    return this.get<string[]>(key);
  }

  async setRoute(fromLedger: string, toLedger: string, route: string[], ttl = 600000): Promise<void> {
    const key = `${RoutingCache.ROUTE_PREFIX}${fromLedger}:${toLedger}`;
    await this.set(key, route, ttl);
  }

  async getPeerInfo(peerId: string): Promise<any | null> {
    const key = `${RoutingCache.PEER_PREFIX}${peerId}`;
    return this.get(key);
  }

  async setPeerInfo(peerId: string, peerInfo: any, ttl = 300000): Promise<void> {
    const key = `${RoutingCache.PEER_PREFIX}${peerId}`;
    await this.set(key, peerInfo, ttl);
  }

  async getNetworkTopology(): Promise<any | null> {
    const key = `${RoutingCache.TOPOLOGY_PREFIX}current`;
    return this.get(key);
  }

  async setNetworkTopology(topology: any, ttl = 120000): Promise<void> {
    const key = `${RoutingCache.TOPOLOGY_PREFIX}current`;
    await this.set(key, topology, ttl);
  }

  async cachePeer(peerId: string, peerInfo: any, ttl = 300000): Promise<void> {
    await this.setPeerInfo(peerId, peerInfo, ttl);
  }

  async getPeer(peerId: string): Promise<any | null> {
    return await this.getPeerInfo(peerId);
  }
}

interface CacheEntry {
  value: any;
  expiry: number;
  createdAt: number;
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
