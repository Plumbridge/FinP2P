"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutingCache = exports.CacheManager = void 0;
/**
 * Multi-level caching system with LRU in-memory cache and Redis backing
 */
class CacheManager {
    constructor(redis, logger, options = {}) {
        this.memoryCache = new Map();
        this.accessOrder = [];
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
    async get(key) {
        // Try memory cache first
        const memoryEntry = this.memoryCache.get(key);
        if (memoryEntry && !this.isExpired(memoryEntry)) {
            this.updateAccessOrder(key);
            this.stats.hits++;
            return memoryEntry.value;
        }
        // Try Redis cache
        if (this.redis) {
            try {
                const redisValue = await this.redis.get(key);
                if (redisValue) {
                    const parsed = JSON.parse(redisValue);
                    // Store in memory cache for faster access
                    this.setMemory(key, parsed, this.defaultTTL);
                    this.stats.hits++;
                    return parsed;
                }
            }
            catch (error) {
                this.logger.warn(`Redis cache get failed for key ${key}:`, error);
            }
        }
        this.stats.misses++;
        return null;
    }
    async set(key, value, ttl) {
        const actualTTL = ttl || this.defaultTTL;
        // Set in memory cache
        this.setMemory(key, value, actualTTL);
        // Set in Redis cache
        if (this.redis) {
            try {
                await this.redis.setEx(key, Math.floor(actualTTL / 1000), JSON.stringify(value));
            }
            catch (error) {
                this.logger.warn(`Redis cache set failed for key ${key}:`, error);
            }
        }
        this.stats.sets++;
    }
    async delete(key) {
        // Remove from memory cache
        this.memoryCache.delete(key);
        this.accessOrder = this.accessOrder.filter(k => k !== key);
        // Remove from Redis cache
        if (this.redis) {
            try {
                await this.redis.DEL(key);
            }
            catch (error) {
                this.logger.warn(`Redis cache delete failed for key ${key}:`, error);
            }
        }
    }
    async clear() {
        this.memoryCache.clear();
        this.accessOrder = [];
        if (this.redis) {
            try {
                await this.redis.flushDb();
            }
            catch (error) {
                this.logger.warn('Redis cache clear failed:', error);
            }
        }
    }
    getStats() {
        this.stats.memoryUsage = this.memoryCache.size;
        return { ...this.stats };
    }
    setMemory(key, value, ttl) {
        // Evict if at capacity
        if (this.memoryCache.size >= this.maxMemorySize && !this.memoryCache.has(key)) {
            this.evictLRU();
        }
        const entry = {
            value,
            expiry: Date.now() + ttl,
            createdAt: Date.now()
        };
        this.memoryCache.set(key, entry);
        this.updateAccessOrder(key);
    }
    updateAccessOrder(key) {
        // Remove from current position
        this.accessOrder = this.accessOrder.filter(k => k !== key);
        // Add to end (most recently used)
        this.accessOrder.push(key);
    }
    evictLRU() {
        if (this.accessOrder.length > 0) {
            const lruKey = this.accessOrder.shift();
            this.memoryCache.delete(lruKey);
            this.stats.evictions++;
        }
    }
    isExpired(entry) {
        return Date.now() > entry.expiry;
    }
}
exports.CacheManager = CacheManager;
/**
 * Specialized cache for routing information
 */
class RoutingCache extends CacheManager {
    async getRoute(fromLedger, toLedger) {
        const key = `${RoutingCache.ROUTE_PREFIX}${fromLedger}:${toLedger}`;
        return this.get(key);
    }
    async setRoute(fromLedger, toLedger, route, ttl = 600000) {
        const key = `${RoutingCache.ROUTE_PREFIX}${fromLedger}:${toLedger}`;
        await this.set(key, route, ttl);
    }
    async getPeerInfo(peerId) {
        const key = `${RoutingCache.PEER_PREFIX}${peerId}`;
        return this.get(key);
    }
    async setPeerInfo(peerId, peerInfo, ttl = 300000) {
        const key = `${RoutingCache.PEER_PREFIX}${peerId}`;
        await this.set(key, peerInfo, ttl);
    }
    async getNetworkTopology() {
        const key = `${RoutingCache.TOPOLOGY_PREFIX}current`;
        return this.get(key);
    }
    async setNetworkTopology(topology, ttl = 120000) {
        const key = `${RoutingCache.TOPOLOGY_PREFIX}current`;
        await this.set(key, topology, ttl);
    }
    async cachePeer(peerId, peerInfo, ttl = 300000) {
        await this.setPeerInfo(peerId, peerInfo, ttl);
    }
    async getPeer(peerId) {
        return await this.getPeerInfo(peerId);
    }
}
exports.RoutingCache = RoutingCache;
RoutingCache.ROUTE_PREFIX = 'route:';
RoutingCache.TOPOLOGY_PREFIX = 'topology:';
RoutingCache.PEER_PREFIX = 'peer:';
//# sourceMappingURL=cache.js.map