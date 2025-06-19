import { Logger } from 'winston';
import { EventEmitter } from 'events';

/**
 * Generic connection pool for managing reusable connections
 */
export class ConnectionPool<T> extends EventEmitter {
  private connections: PooledConnection<T>[] = [];
  private waitingQueue: Array<(connection: T) => void> = [];
  private readonly factory: ConnectionFactory<T>;
  private readonly validator: ConnectionValidator<T>;
  private readonly destroyer: ConnectionDestroyer<T>;
  private readonly options: PoolOptions;
  private readonly logger: Logger;
  private stats: PoolStats;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    factory: ConnectionFactory<T>,
    validator: ConnectionValidator<T>,
    destroyer: ConnectionDestroyer<T>,
    options: PoolOptions,
    logger: Logger
  ) {
    super();
    this.factory = factory;
    this.validator = validator;
    this.destroyer = destroyer;
    this.options = {
      min: 2,
      max: 10,
      acquireTimeoutMs: 30000,
      idleTimeoutMs: 300000,
      validationIntervalMs: 60000,
      ...options
    };
    this.logger = logger;
    this.stats = {
      created: 0,
      destroyed: 0,
      acquired: 0,
      released: 0,
      timeouts: 0,
      errors: 0
    };

    this.startCleanupTimer();
    this.preWarm();
  }

  async acquire(host?: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.stats.timeouts++;
        reject(new Error('Connection acquisition timeout'));
      }, this.options.acquireTimeoutMs);

      const tryAcquire = () => {
        // Find available connection
        const availableIndex = this.connections.findIndex(
          conn => !conn.inUse && this.validator(conn.connection)
        );

        if (availableIndex !== -1) {
          const pooledConn = this.connections[availableIndex];
          pooledConn.inUse = true;
          pooledConn.lastUsed = Date.now();
          this.stats.acquired++;
          clearTimeout(timeout);
          resolve(pooledConn.connection);
          return;
        }

        // Create new connection if under max
        if (this.connections.length < (this.options.max || 50)) {
          this.createConnection()
            .then(connection => {
              const pooledConn: PooledConnection<T> = {
                connection,
                inUse: true,
                created: Date.now(),
                lastUsed: Date.now()
              };
              this.connections.push(pooledConn);
              this.stats.created++;
              this.stats.acquired++;
              clearTimeout(timeout);
              resolve(connection);
            })
            .catch(error => {
              this.stats.errors++;
              clearTimeout(timeout);
              reject(error);
            });
          return;
        }

        // Wait for connection to become available
        this.waitingQueue.push((connection: T) => {
          clearTimeout(timeout);
          resolve(connection);
        });
      };

      tryAcquire();
    });
  }

  release(connection: T): void {
    const pooledConn = this.connections.find(conn => conn.connection === connection);
    if (!pooledConn) {
      this.logger.warn('Attempted to release unknown connection');
      return;
    }

    pooledConn.inUse = false;
    pooledConn.lastUsed = Date.now();
    this.stats.released++;

    // Serve waiting requests
    if (this.waitingQueue.length > 0) {
      const waiter = this.waitingQueue.shift()!;
      pooledConn.inUse = true;
      pooledConn.lastUsed = Date.now();
      this.stats.acquired++;
      waiter(connection);
    }
  }

  async destroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Destroy all connections
    await Promise.all(
      this.connections.map(async (pooledConn) => {
        try {
          await this.destroyer(pooledConn.connection);
          this.stats.destroyed++;
        } catch (error) {
          this.logger.warn('Error destroying connection:', error);
        }
      })
    );

    this.connections = [];
    this.waitingQueue = [];
  }

  getStats(): PoolStats & { active: number; idle: number; waiting: number } {
    const active = this.connections.filter(conn => conn.inUse).length;
    const idle = this.connections.filter(conn => !conn.inUse).length;
    const waiting = this.waitingQueue.length;

    return {
      ...this.stats,
      active,
      idle,
      waiting
    };
  }

  private async createConnection(): Promise<T> {
    try {
      return await this.factory();
    } catch (error) {
      this.logger.error('Failed to create connection:', error);
      throw error;
    }
  }

  private async preWarm(): Promise<void> {
    const promises = [];
    const minConnections = this.options.min || 0;
    for (let i = 0; i < minConnections; i++) {
      promises.push(
        this.createConnection().then(connection => {
          const pooledConn: PooledConnection<T> = {
            connection,
            inUse: false,
            created: Date.now(),
            lastUsed: Date.now()
          };
          this.connections.push(pooledConn);
          this.stats.created++;
        }).catch(error => {
          this.logger.warn('Failed to pre-warm connection:', error);
        })
      );
    }
    await Promise.allSettled(promises);
  }

  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.options.validationIntervalMs);
  }

  private async cleanup(): Promise<void> {
    const now = Date.now();
    const toDestroy: PooledConnection<T>[] = [];
    const idleTimeoutMs = this.options.idleTimeoutMs || 30000;
    const minConnections = this.options.min || 0;

    // Find connections to destroy
    for (let i = this.connections.length - 1; i >= 0; i--) {
      const conn = this.connections[i];
      
      // Skip if in use
      if (conn.inUse) continue;
      
      // Check if idle too long or invalid
      const isIdle = (now - conn.lastUsed) > idleTimeoutMs;
      const isInvalid = !this.validator(conn.connection);
      const canDestroy = this.connections.length > minConnections;
      
      if ((isIdle || isInvalid) && canDestroy) {
        toDestroy.push(conn);
        this.connections.splice(i, 1);
      }
    }

    // Destroy connections
    for (const conn of toDestroy) {
      try {
        await this.destroyer(conn.connection);
        this.stats.destroyed++;
      } catch (error) {
        this.logger.warn('Error during cleanup:', error);
      }
    }

    // Emit stats
    this.emit('stats', this.getStats());
  }
}

/**
 * HTTP connection pool for peer router connections
 */
export class HttpConnectionPool {
  private pools: Map<string, ConnectionPool<any>> = new Map();
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  getPool(endpoint: string): ConnectionPool<any> {
    if (!this.pools.has(endpoint)) {
      const pool = new ConnectionPool(
        () => this.createHttpConnection(endpoint),
        (conn) => this.validateHttpConnection(conn),
        (conn) => this.destroyHttpConnection(conn),
        {
          min: 1,
          max: 5,
          acquireTimeoutMs: 10000,
          idleTimeoutMs: 120000
        },
        this.logger
      );
      this.pools.set(endpoint, pool);
    }
    return this.pools.get(endpoint)!;
  }

  async destroyAll(): Promise<void> {
    await Promise.all(
      Array.from(this.pools.values()).map(pool => pool.destroy())
    );
    this.pools.clear();
  }

  async destroy(): Promise<void> {
    await this.destroyAll();
  }

  getStats(): any {
    const stats = {
      totalPools: this.pools.size,
      pools: {} as Record<string, any>
    };
    
    for (const [endpoint, pool] of this.pools.entries()) {
      stats.pools[endpoint] = pool.getStats();
    }
    
    return stats;
  }

  release(connection: any): void {
    // Find which pool this connection belongs to and release it
    for (const pool of this.pools.values()) {
      try {
        pool.release(connection);
        break;
      } catch (error) {
        // Connection doesn't belong to this pool, continue
      }
    }
  }

  async acquire(endpoint: string): Promise<any> {
    const pool = this.getPool(endpoint);
    return await pool.acquire();
  }

  private async createHttpConnection(endpoint: string): Promise<any> {
    // Create HTTP agent or connection object
    return {
      endpoint,
      created: Date.now(),
      requests: 0
    };
  }

  private validateHttpConnection(conn: any): boolean {
    // Validate connection is still usable
    return conn && (Date.now() - conn.created) < 300000; // 5 minutes
  }

  private async destroyHttpConnection(conn: any): Promise<void> {
    // Clean up connection resources
    // In a real implementation, this would close HTTP agents, etc.
  }
}

interface PooledConnection<T> {
  connection: T;
  inUse: boolean;
  created: number;
  lastUsed: number;
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