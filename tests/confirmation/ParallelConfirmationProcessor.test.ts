import { ParallelConfirmationProcessor } from '../../src/confirmation/ParallelConfirmationProcessor';
import { ConfirmationRecordManager } from '../../src/confirmation/ConfirmationRecordManager';
import { DualConfirmationStatus, Transfer, TransferStatus } from '../../src/types';
import { createLogger } from '../../src/utils/logger';
import { EventEmitter } from 'events';

// Mock dependencies
jest.mock('../../src/confirmation/ConfirmationRecordManager');
const MockedConfirmationRecordManager = ConfirmationRecordManager as jest.MockedClass<typeof ConfirmationRecordManager>;

describe('ParallelConfirmationProcessor', () => {
  let processor: ParallelConfirmationProcessor;
  let mockConfirmationManager: jest.Mocked<ConfirmationRecordManager>;
  let logger: any;
  let eventEmitter: EventEmitter;

  beforeEach(() => {
    logger = createLogger({ level: 'error' });
    eventEmitter = new EventEmitter();
    mockConfirmationManager = new MockedConfirmationRecordManager() as jest.Mocked<ConfirmationRecordManager>;
    
    processor = new ParallelConfirmationProcessor(
      mockConfirmationManager,
      eventEmitter,
      logger,
      { maxConcurrentTasks: 5, taskTimeout: 30000 }
    );

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await processor.stop();
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(processor).toBeDefined();
      expect(processor.isRunning()).toBe(false);
      expect(processor.getQueueSize()).toBe(0);
      expect(processor.getActiveTaskCount()).toBe(0);
    });

    it('should use default configuration when not provided', () => {
      const defaultProcessor = new ParallelConfirmationProcessor(
        mockConfirmationManager,
        eventEmitter,
        logger
      );
      
      expect(defaultProcessor).toBeDefined();
    });
  });

  describe('Lifecycle Management', () => {
    it('should start and stop properly', async () => {
      await processor.start();
      expect(processor.isRunning()).toBe(true);

      await processor.stop();
      expect(processor.isRunning()).toBe(false);
    });

    it('should handle multiple start calls gracefully', async () => {
      await processor.start();
      await processor.start(); // Should not throw
      expect(processor.isRunning()).toBe(true);
    });

    it('should handle stop when not running', async () => {
      await processor.stop(); // Should not throw
      expect(processor.isRunning()).toBe(false);
    });
  });

  describe('Task Management', () => {
    const mockTransfer: Transfer = {
      id: 'transfer-123',
      fromAccount: 'account-1',
      toAccount: 'account-2',
      asset: 'asset-1',
      amount: BigInt(1000),
      status: TransferStatus.PENDING,
      createdAt: new Date(),
      metadata: { priority: 'high' }
    };

    beforeEach(async () => {
      await processor.start();
    });

    it('should add confirmation task to queue', async () => {
      const taskId = await processor.addConfirmationTask(
        mockTransfer,
        'router-1',
        'user-1'
      );

      expect(taskId).toBeDefined();
      expect(processor.getQueueSize()).toBe(1);
    });

    it('should process confirmation task successfully', async () => {
      const mockRecord = {
        id: 'conf_123',
        transferId: 'transfer-123',
        status: DualConfirmationStatus.PENDING,
        confirmations: []
      };

      mockConfirmationManager.createConfirmationRecord.mockResolvedValue(mockRecord as any);

      const taskId = await processor.addConfirmationTask(
        mockTransfer,
        'router-1',
        'user-1'
      );

      // Wait for task processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockConfirmationManager.createConfirmationRecord).toHaveBeenCalledWith(
        mockTransfer,
        'router-1',
        'user-1'
      );
    });

    it('should handle task processing errors gracefully', async () => {
      mockConfirmationManager.createConfirmationRecord.mockRejectedValue(
        new Error('Database connection failed')
      );

      const taskId = await processor.addConfirmationTask(
        mockTransfer,
        'router-1',
        'user-1'
      );

      // Wait for task processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not crash the processor
      expect(processor.isRunning()).toBe(true);
    });

    it('should respect maximum concurrent tasks limit', async () => {
      const tasks = [];
      
      // Add more tasks than the limit
      for (let i = 0; i < 10; i++) {
        const task = processor.addConfirmationTask(
          { ...mockTransfer, id: `transfer-${i}` },
          'router-1',
          'user-1'
        );
        tasks.push(task);
      }

      await Promise.all(tasks);

      // Should not exceed the concurrent limit
      expect(processor.getActiveTaskCount()).toBeLessThanOrEqual(5);
    });

    it('should handle task timeout', async () => {
      // Create processor with very short timeout
      const shortTimeoutProcessor = new ParallelConfirmationProcessor(
        mockConfirmationManager,
        eventEmitter,
        logger,
        { maxConcurrentTasks: 5, taskTimeout: 10 }
      );

      await shortTimeoutProcessor.start();

      // Mock a slow operation
      mockConfirmationManager.createConfirmationRecord.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const taskId = await shortTimeoutProcessor.addConfirmationTask(
        mockTransfer,
        'router-1',
        'user-1'
      );

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 50));

      await shortTimeoutProcessor.stop();
    });
  });

  describe('Priority Handling', () => {
    beforeEach(async () => {
      await processor.start();
    });

    it('should process high priority tasks first', async () => {
      const lowPriorityTransfer = {
        ...mockTransfer,
        id: 'transfer-low',
        metadata: { priority: 'low' }
      };

      const highPriorityTransfer = {
        ...mockTransfer,
        id: 'transfer-high',
        metadata: { priority: 'high' }
      };

      mockConfirmationManager.createConfirmationRecord.mockResolvedValue({
        id: 'conf_123',
        status: DualConfirmationStatus.PENDING
      } as any);

      // Add low priority first, then high priority
      await processor.addConfirmationTask(lowPriorityTransfer, 'router-1', 'user-1');
      await processor.addConfirmationTask(highPriorityTransfer, 'router-1', 'user-1');

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // High priority should be processed first
      const calls = mockConfirmationManager.createConfirmationRecord.mock.calls;
      expect(calls[0][0].id).toBe('transfer-high');
    });
  });

  describe('Event Emission', () => {
    beforeEach(async () => {
      await processor.start();
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

      await processor.addConfirmationTask(mockTransfer, 'router-1', 'user-1');

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

      await processor.addConfirmationTask(mockTransfer, 'router-1', 'user-1');

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(events).toContain('failed');
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(async () => {
      await processor.start();
    });

    it('should track queue size correctly', async () => {
      expect(processor.getQueueSize()).toBe(0);

      await processor.addConfirmationTask(mockTransfer, 'router-1', 'user-1');
      expect(processor.getQueueSize()).toBeGreaterThan(0);
    });

    it('should track active task count', async () => {
      mockConfirmationManager.createConfirmationRecord.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ id: 'conf_123' } as any), 50))
      );

      await processor.addConfirmationTask(mockTransfer, 'router-1', 'user-1');
      
      // Should have active task
      expect(processor.getActiveTaskCount()).toBeGreaterThan(0);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should be back to 0
      expect(processor.getActiveTaskCount()).toBe(0);
    });

    it('should provide processing statistics', () => {
      const stats = processor.getStatistics();
      
      expect(stats).toHaveProperty('queueSize');
      expect(stats).toHaveProperty('activeTaskCount');
      expect(stats).toHaveProperty('totalProcessed');
      expect(stats).toHaveProperty('totalFailed');
      expect(stats).toHaveProperty('averageProcessingTime');
    });
  });

  describe('Graceful Shutdown', () => {
    it('should wait for active tasks to complete during shutdown', async () => {
      await processor.start();

      let taskCompleted = false;
      mockConfirmationManager.createConfirmationRecord.mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => {
            taskCompleted = true;
            resolve({ id: 'conf_123' } as any);
          }, 100);
        })
      );

      await processor.addConfirmationTask(mockTransfer, 'router-1', 'user-1');
      
      // Start shutdown
      const stopPromise = processor.stop();
      
      // Task should not be completed yet
      expect(taskCompleted).toBe(false);
      
      // Wait for shutdown
      await stopPromise;
      
      // Task should be completed
      expect(taskCompleted).toBe(true);
    });

    it('should force shutdown after timeout', async () => {
      await processor.start();

      // Mock a task that never completes
      mockConfirmationManager.createConfirmationRecord.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      await processor.addConfirmationTask(mockTransfer, 'router-1', 'user-1');
      
      // Force shutdown with short timeout
      const startTime = Date.now();
      await processor.stop(100); // 100ms timeout
      const endTime = Date.now();
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(500);
    });
  });
});

const mockTransfer: Transfer = {
  id: 'transfer-123',
  fromAccount: 'account-1',
  toAccount: 'account-2',
  asset: 'asset-1',
  amount: BigInt(1000),
  status: TransferStatus.PENDING,
  createdAt: new Date(),
  metadata: { priority: 'medium' }
};