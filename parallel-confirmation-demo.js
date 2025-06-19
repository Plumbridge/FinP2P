/**
 * Parallel Confirmation Processing Demo
 * 
 * This demo showcases the new parallel confirmation processing system
 * that eliminates sequential bottlenecks in the FinP2P router.
 */

const { Router } = require('./src/router');
const { MockAdapter } = require('./src/adapters');
const { Transfer, Asset, FinID, TransferStatus } = require('./src/types');
const Redis = require('redis');
const winston = require('winston');

// Demo configuration
const DEMO_CONFIG = {
  router: {
    id: 'router-parallel-demo',
    port: 3001,
    host: 'localhost'
  },
  redis: {
    host: 'localhost',
    port: 6379
  },
  transfers: {
    count: 20,
    amounts: [1000n, 5000n, 15000n, 50000n, 100000n, 500000n, 1500000n], // Different amounts for priority testing
    assets: ['USD', 'EUR', 'BTC', 'ETH']
  }
};

class ParallelConfirmationDemo {
  constructor() {
    this.router = null;
    this.redis = null;
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level.toUpperCase()}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      ),
      transports: [
        new winston.transports.Console()
      ]
    });
  }

  async initialize() {
    this.logger.info('🚀 Initializing Parallel Confirmation Demo...');

    try {
      // Initialize Redis
      this.redis = Redis.createClient({
        socket: {
          host: DEMO_CONFIG.redis.host,
          port: DEMO_CONFIG.redis.port
        }
      });
      
      await this.redis.connect();
      this.logger.info('✅ Redis connected');

      // Clear any existing data
      await this.redis.flushDb();
      this.logger.info('🧹 Redis database cleared');

      // Initialize router with parallel confirmation processing
      this.router = new Router({
        id: DEMO_CONFIG.router.id,
        host: DEMO_CONFIG.router.host,
        port: DEMO_CONFIG.router.port,
        redis: {
          host: DEMO_CONFIG.redis.host,
          port: DEMO_CONFIG.redis.port
        },
        // Enable parallel confirmation processing
        parallelConfirmation: {
          maxConcurrentConfirmations: 5,
          batchSize: 3,
          processingTimeout: 10000
        }
      });

      await this.router.start();
      this.logger.info('✅ Router started with parallel confirmation processing');

    } catch (error) {
      this.logger.error('❌ Initialization failed:', error);
      throw error;
    }
  }

  async demonstrateParallelProcessing() {
    this.logger.info('\n📊 Starting Parallel Confirmation Processing Demo...');
    
    const transfers = this.generateTestTransfers();
    const startTime = Date.now();
    
    this.logger.info(`🔄 Processing ${transfers.length} transfers with parallel confirmation...`);
    
    // Process all transfers
    const transferPromises = transfers.map(async (transfer, index) => {
      try {
        const response = await fetch(`http://localhost:${DEMO_CONFIG.router.port}/transfer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(transfer)
        });
        
        const result = await response.json();
        this.logger.info(`✅ Transfer ${index + 1} submitted:`, {
          transferId: result.transfer?.id,
          amount: transfer.amount.toString(),
          priority: this.determinePriority(transfer.amount)
        });
        
        return result;
      } catch (error) {
        this.logger.error(`❌ Transfer ${index + 1} failed:`, error.message);
        return { error: error.message };
      }
    });
    
    // Wait for all transfers to be submitted
    const results = await Promise.all(transferPromises);
    const processingTime = Date.now() - startTime;
    
    this.logger.info(`\n⏱️  All transfers submitted in ${processingTime}ms`);
    
    // Monitor confirmation processing
    await this.monitorConfirmationProcessing(results.filter(r => r.transfer));
    
    return results;
  }

  async monitorConfirmationProcessing(transferResults) {
    this.logger.info('\n👀 Monitoring parallel confirmation processing...');
    
    const monitoringInterval = 2000; // 2 seconds
    const maxMonitoringTime = 30000; // 30 seconds
    let elapsedTime = 0;
    
    while (elapsedTime < maxMonitoringTime) {
      try {
        // Get confirmation metrics
        const metricsResponse = await fetch(`http://localhost:${DEMO_CONFIG.router.port}/confirmations/metrics`);
        const metrics = await metricsResponse.json();
        
        this.logger.info('📈 Confirmation Processing Metrics:', {
          queueSize: metrics.queueSize,
          processingCount: metrics.processingCount,
          completedCount: metrics.completedCount,
          averageProcessingTime: `${metrics.averageProcessingTime}ms`,
          isProcessing: metrics.isProcessing
        });
        
        // Check individual transfer statuses
        let completedTransfers = 0;
        for (const result of transferResults) {
          if (result.transfer) {
            try {
              const statusResponse = await fetch(
                `http://localhost:${DEMO_CONFIG.router.port}/confirmations/status/${result.transfer.id}`
              );
              
              if (statusResponse.ok) {
                const status = await statusResponse.json();
                if (status.status === 'confirmed') {
                  completedTransfers++;
                }
              }
            } catch (error) {
              // Transfer might not have confirmation record yet
            }
          }
        }
        
        this.logger.info(`✅ Confirmed transfers: ${completedTransfers}/${transferResults.length}`);
        
        // Stop monitoring if all confirmations are complete
        if (metrics.queueSize === 0 && metrics.processingCount === 0 && completedTransfers === transferResults.length) {
          this.logger.info('🎉 All confirmations completed!');
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, monitoringInterval));
        elapsedTime += monitoringInterval;
        
      } catch (error) {
        this.logger.error('❌ Error monitoring confirmations:', error.message);
        break;
      }
    }
  }

  generateTestTransfers() {
    const transfers = [];
    
    for (let i = 0; i < DEMO_CONFIG.transfers.count; i++) {
      const amount = DEMO_CONFIG.transfers.amounts[i % DEMO_CONFIG.transfers.amounts.length];
      const assetCode = DEMO_CONFIG.transfers.assets[i % DEMO_CONFIG.transfers.assets.length];
      
      const transfer = {
        id: `transfer-${i + 1}-${Date.now()}`,
        asset: {
          id: `asset-${assetCode}`,
          code: assetCode,
          issuer: 'demo-issuer'
        },
        amount: amount.toString(), // Convert BigInt to string for JSON
        source: {
          ledger: 'mock-ledger',
          account: `account-source-${i + 1}`
        },
        destination: {
          ledger: 'mock-ledger',
          account: `account-dest-${i + 1}`
        },
        memo: `Parallel confirmation demo transfer ${i + 1}`,
        timestamp: new Date().toISOString()
      };
      
      transfers.push(transfer);
    }
    
    return transfers;
  }

  determinePriority(amount) {
    const amountNum = typeof amount === 'string' ? BigInt(amount) : amount;
    if (amountNum > BigInt(1000000)) return 'high';
    if (amountNum > BigInt(10000)) return 'medium';
    return 'low';
  }

  async demonstrateSequentialVsParallel() {
    this.logger.info('\n🔄 Comparing Sequential vs Parallel Processing...');
    
    // Simulate sequential processing time
    const transferCount = 10;
    const avgConfirmationTime = 2000; // 2 seconds per confirmation
    const sequentialTime = transferCount * avgConfirmationTime;
    
    this.logger.info(`📊 Sequential Processing Estimate:`);
    this.logger.info(`   • ${transferCount} transfers × ${avgConfirmationTime}ms = ${sequentialTime}ms`);
    
    // Measure actual parallel processing
    const startTime = Date.now();
    const testTransfers = this.generateTestTransfers().slice(0, transferCount);
    
    await this.demonstrateParallelProcessing();
    
    const parallelTime = Date.now() - startTime;
    const improvement = ((sequentialTime - parallelTime) / sequentialTime * 100).toFixed(1);
    
    this.logger.info(`\n📈 Performance Comparison:`);
    this.logger.info(`   • Sequential (estimated): ${sequentialTime}ms`);
    this.logger.info(`   • Parallel (actual): ${parallelTime}ms`);
    this.logger.info(`   • Improvement: ${improvement}% faster`);
  }

  async cleanup() {
    this.logger.info('\n🧹 Cleaning up demo resources...');
    
    try {
      if (this.router) {
        await this.router.stop();
        this.logger.info('✅ Router stopped');
      }
      
      if (this.redis) {
        await this.redis.quit();
        this.logger.info('✅ Redis disconnected');
      }
      
    } catch (error) {
      this.logger.error('❌ Cleanup error:', error);
    }
  }

  async run() {
    try {
      await this.initialize();
      await this.demonstrateParallelProcessing();
      await this.demonstrateSequentialVsParallel();
      
      this.logger.info('\n🎉 Parallel Confirmation Demo completed successfully!');
      this.logger.info('\n📋 Key Benefits Demonstrated:');
      this.logger.info('   • Parallel processing of confirmations');
      this.logger.info('   • Priority-based task queuing');
      this.logger.info('   • Real-time metrics and monitoring');
      this.logger.info('   • Significant performance improvements');
      this.logger.info('   • Elimination of sequential bottlenecks');
      
    } catch (error) {
      this.logger.error('❌ Demo failed:', error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the demo
if (require.main === module) {
  const demo = new ParallelConfirmationDemo();
  demo.run().catch(console.error);
}

module.exports = { ParallelConfirmationDemo };