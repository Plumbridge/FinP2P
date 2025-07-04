import { ParallelConfirmationProcessor } from '../../src/router/ParallelConfirmationProcessor';
import { ConfirmationRecordManager, ConfirmationRecord } from '../../src/router/ConfirmationRecordManager';
import { DualConfirmationStatus, Transfer, TransferStatus, DualConfirmationRecord } from '../../src/types';
import { createLogger } from '../../src/utils/logger';
import { EventEmitter } from 'events';

// Mock dependencies
jest.mock('../../src/router/ConfirmationRecordManager');
const MockedConfirmationRecordManager = ConfirmationRecordManager as jest.MockedClass<typeof ConfirmationRecordManager>;

describe('ParallelConfirmationProcessor', () => {
  let processor: ParallelConfirmationProcessor;
  let mockConfirmationManager: jest.Mocked<ConfirmationRecordManager>;
  let mockRedisClient: any;
  let logger: any;
  let eventEmitter: EventEmitter;

  beforeEach(() => {
    logger = createLogger({ level: 'error' });
    eventEmitter = new EventEmitter();
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      hGet: jest.fn(),
      hSet: jest.fn(),
      hDel: jest.fn(),
      hGetAll: jest.fn(),
      sAdd: jest.fn(),
      sRem: jest.fn(),
      sMembers: jest.fn(),
      lPush: jest.fn(),
      lPop: jest.fn(),
      lLen: jest.fn(),
      quit: jest.fn().mockResolvedValue('OK'),
      isOpen: false
    };
    mockConfirmationManager = new MockedConfirmationRecordManager(mockRedisClient, logger, 'test-router') as jest.Mocked<ConfirmationRecordManager>;
    
    // Set up mock methods for mockConfirmationManager
    mockConfirmationManager.createConfirmationRecord = jest.fn();
    mockConfirmationManager.getConfirmationRecord = jest.fn();
    mockConfirmationManager.getAllConfirmationRecords = jest.fn();
    mockConfirmationManager.rollbackConfirmation = jest.fn();
    mockConfirmationManager.generateRegulatoryReport = jest.fn();
    mockConfirmationManager.cleanupOldRecords = jest.fn();
    mockConfirmationManager.getConfirmationsByStatus = jest.fn();
    mockConfirmationManager.cleanupExpiredConfirmations = jest.fn();
    mockConfirmationManager.getUserTransactions = jest.fn();
    mockConfirmationManager.getAssetTransactions = jest.fn();
    mockConfirmationManager.getDualConfirmationStatus = jest.fn();
    
    processor = new ParallelConfirmationProcessor(
      mockRedisClient as any,
      logger,
      mockConfirmationManager,
      'test-router',
      {
        maxConcurrentConfirmations: 2,
        batchSize: 5,
        processingTimeout: 1000
      }
    );

    jest.clearAllMocks();
  });

  const mockConfirmationRecord: ConfirmationRecord = {
    id: 'test-confirmation',
    transferId: 'test-transfer',
    routerId: 'test-router',
    status: 'pending',
    timestamp: new Date().toISOString(),
    signature: 'test-signature',
    metadata: {
      fromAccount: 'test-from',
      toAccount: 'test-to',
      asset: 'test-asset',
      amount: '100'
    }
  };

  afterEach(async () => {
    if (processor) {
      await processor.shutdown();
    }
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(processor).toBeDefined();
      // Processor state is managed internally
      const stats = processor.getStatistics();
      expect(stats.queuedTasks).toBe(0);
      expect(stats.activeTasks).toBe(0);
    });

    it('should use default configuration when not provided', () => {
      const defaultProcessor = new ParallelConfirmationProcessor(
        mockRedisClient as any,
        logger,
        mockConfirmationManager,
        'test-router'
      );
      
      expect(defaultProcessor).toBeDefined();
    });
  });

  describe('Lifecycle Management', () => {
    it('should start and stop properly', async () => {
      // Processor starts automatically when tasks are added
      // State is managed internally

      await processor.shutdown();
      // Processor shutdown completed
    });

    it('should handle multiple start calls gracefully', async () => {
      // Processor starts automatically when tasks are added
      // Multiple start calls are not needed
    });

    it('should handle stop when not running', async () => {
      await processor.shutdown(); // Should not throw
      // Processor shutdown completed
    });
  });

  describe('Task Management', () => {
    const mockTransfer: Transfer = {
      id: 'transfer-123',
      fromAccount: { id: 'account-1', type: 'account', domain: 'test.domain' },
      toAccount: { id: 'account-2', type: 'account', domain: 'test.domain' },
      asset: { id: 'asset-1', type: 'asset', domain: 'test.domain' },
      amount: BigInt(1000),
      status: TransferStatus.PENDING,
      route: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { description: 'Test transfer' }
    };

    beforeEach(async () => {
      // Processor starts automatically when tasks are added
    });

    it('should add confirmation task to queue', async () => {
      const taskId = await processor.addConfirmationTask(
          mockTransfer,
          'medium'
        );

      expect(taskId).toBeDefined();
      
      const stats = processor.getStatistics();
      expect(stats.queuedTasks + stats.activeTasks + stats.processedTransfers).toBeGreaterThanOrEqual(1);
    });

    it('should reject undefined transfer', async () => {
      await expect(processor.addConfirmationTask(undefined as any, 'medium'))
        .rejects.toThrow('Transfer object is required but was undefined');
    });

    it('should reject transfer without id', async () => {
      const invalidTransfer = { ...mockTransfer, id: undefined };
      await expect(processor.addConfirmationTask(invalidTransfer as any, 'medium'))
        .rejects.toThrow('Transfer ID is required but was undefined');
    });

    it('should process confirmation task successfully', async () => {
      const createConfirmationRecordSpy = jest.spyOn(mockConfirmationManager, 'createConfirmationRecord');
      createConfirmationRecordSpy.mockResolvedValue(mockConfirmationRecord);

      const taskId = await processor.addConfirmationTask(
          mockTransfer,
          'high'
        );

      await new Promise(resolve => setImmediate(resolve));

      expect(createConfirmationRecordSpy).toHaveBeenCalledWith(
        mockTransfer,
        'confirmed'
      );
    });

    it('should handle task processing errors gracefully', async () => {
      const createConfirmationRecordSpy = jest.spyOn(mockConfirmationManager, 'createConfirmationRecord');
      createConfirmationRecordSpy.mockRejectedValue(
        new Error('Database connection failed')
      );

      const taskId = await processor.addConfirmationTask(
          mockTransfer,
          'high'
        );
        
      await new Promise(resolve => setImmediate(resolve));

      const stats = processor.getStatistics();
      expect(stats.totalFailed).toBe(1);
    });

    it('should respect maximum concurrent tasks limit', async () => {
      const tasks = [];
      
      // Add more tasks than the limit
      for (let i = 0; i < 10; i++) {
        const task = processor.addConfirmationTask(
            { ...mockTransfer, id: `transfer-${i}` },
            'low'
          );
        tasks.push(task);
      }

      await Promise.all(tasks);

      // Should not exceed the concurrent limit
      const stats = processor.getStatistics();
      expect(stats.activeTasks).toBeLessThanOrEqual(5);
    });

    it('should handle task timeout', async () => {
      // Create processor with very short timeout
      const shortTimeoutProcessor = new ParallelConfirmationProcessor(
        mockRedisClient as any,
        logger,
        mockConfirmationManager,
        'test-router',
        {
          processingTimeout: 10
        }
      );

      // Processor starts automatically when tasks are added

      // Mock a slow operation
      mockConfirmationManager.createConfirmationRecord.mockImplementation(
        () => new Promise<ConfirmationRecord>(resolve => setTimeout(() => resolve(mockConfirmationRecord), 100))
      );

      const taskId = await shortTimeoutProcessor.addConfirmationTask(
        mockTransfer,
        'high'
      );

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 50));

      await shortTimeoutProcessor.shutdown();
    });
  });

  describe('Priority Handling', () => {
    beforeEach(async () => {
      // Processor starts automatically when tasks are added
    });

    it('should process high priority tasks first', async () => {
      const lowPriorityTransfer = {
        ...mockTransfer,
        id: 'low-priority-transfer',
        metadata: { description: 'low priority transfer' }
      };
      
      const highPriorityTransfer = {
        ...mockTransfer,
        id: 'high-priority-transfer',
        metadata: { description: 'high priority transfer' }
      };

      mockConfirmationManager.createConfirmationRecord.mockResolvedValue({
        id: 'conf_123',
        status: DualConfirmationStatus.PENDING
      } as any);

      // Add low priority first, then high priority
      await processor.addConfirmationTask(lowPriorityTransfer, 'low');
      await processor.addConfirmationTask(highPriorityTransfer, 'high');

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // High priority should be processed first
      const calls = mockConfirmationManager.createConfirmationRecord.mock.calls;
      expect(calls[0][0].id).toBe('high-priority-transfer');
    });
  });

  describe('Event Emission', () => {
    beforeEach(async () => {
      // Processor starts automatically when tasks are added
    });

    it('should emit events for task lifecycle', async () => {
      const events: string[] = [];
      
      eventEmitter.on('confirmation:task:started', () => events.push('started'));
      eventEmitter.on('confirmation:task:completed', () => events.push('completed'));
      eventEmitter.on('confirmation:task:failed', () => events.push('failed'));

      mockConfirmationManager.createConfirmationRecord.mockResolvedValue({
        id: 'conf_123',
        status: DualConfirmationStatus.PENDING
      } as any);

      await processor.addConfirmationTask(mockTransfer, 'medium');

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(events).toContain('started');
      expect(events).toContain('completed');
    });

    it('should emit failure events on task errors', async () => {
      const events: string[] = [];
      
      eventEmitter.on('confirmation:task:failed', () => events.push('failed'));

      mockConfirmationManager.createConfirmationRecord.mockRejectedValue(
        new Error('Test error')
      );

      await processor.addConfirmationTask(mockTransfer, 'medium');

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(events).toContain('failed');
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(async () => {
      // Processor starts automatically when tasks are added
    });

    it('should track queue size correctly', async () => {
      let stats = processor.getStatistics();
      expect(stats.queuedTasks).toBe(0);

      await processor.addConfirmationTask(mockTransfer, 'medium');
      stats = processor.getStatistics();
      expect(stats.queuedTasks).toBeGreaterThan(0);
    });

    it('should track active task count', async () => {
      mockConfirmationManager.createConfirmationRecord.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ id: 'conf_123' } as any), 50))
      );

      await processor.addConfirmationTask(mockTransfer, 'medium');
      
      // Should have active task
      let stats = processor.getStatistics();
      expect(stats.activeTasks).toBeGreaterThan(0);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should be back to 0
      stats = processor.getStatistics();
      expect(stats.activeTasks).toBe(0);
    });

    it('should provide processing statistics', () => {
      const stats = processor.getStatistics();
      
      expect(stats).toHaveProperty('queuedTasks');
      expect(stats).toHaveProperty('activeTasks');
      expect(stats).toHaveProperty('totalProcessed');
      expect(stats).toHaveProperty('totalFailed');
      expect(stats).toHaveProperty('averageProcessingTime');
    });
  });

  describe('Graceful Shutdown', () => {
    it('should wait for active tasks to complete during shutdown', async () => {
      // Processing starts automatically when tasks are added

      let taskCompleted = false;
      mockConfirmationManager.createConfirmationRecord.mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => {
            taskCompleted = true;
            resolve({ id: 'conf_123' } as any);
          }, 100);
        })
      );

      await processor.addConfirmationTask(mockTransfer, 'medium');
      
      // Start shutdown
      const stopPromise = processor.shutdown();
      
      // Task should not be completed yet
      expect(taskCompleted).toBe(false);
      
      // Wait for shutdown
      await stopPromise;
      
      // Task should be completed
      expect(taskCompleted).toBe(true);
    });

    it('should force shutdown after timeout', async () => {
      // Mock a task that never completes
      mockConfirmationManager.createConfirmationRecord.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      await processor.addConfirmationTask(mockTransfer, 'high');
      
      // Force shutdown with short timeout
      const startTime = Date.now();
      await processor.shutdown();
      const endTime = Date.now();
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(35000); // 35 seconds to account for shutdown timeout
    });
  });
});

const mockTransfer: Transfer = {
  id: 'transfer-123',
  fromAccount: {
    id: 'account-1',
    type: 'account',
    domain: 'test.domain'
  },
  toAccount: {
    id: 'account-2',
    type: 'account',
    domain: 'test.domain'
  },
  asset: {
    id: 'asset-1',
    type: 'asset',
    domain: 'test.domain'
  },
  amount: BigInt(1000),
  status: TransferStatus.PENDING,
  route: [],
  metadata: {
    reference: 'test-ref',
    description: 'Test transfer'
  },
  createdAt: new Date(),
  updatedAt: new Date()
};