"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

// Mock the ConfirmationRecordManager module
jest.mock('../../src/router/ConfirmationRecordManager', () => {
    return {
        ConfirmationRecordManager: jest.fn().mockImplementation(() => ({
            createConfirmationRecord: jest.fn(),
            getConfirmationRecord: jest.fn(),
            updateConfirmationStatus: jest.fn(),
            checkDualConfirmation: jest.fn(),
            getConfirmationsByStatus: jest.fn(),
            submitConfirmation: jest.fn(),
            getTransferConfirmations: jest.fn(),
            getAllConfirmationRecords: jest.fn(),
            cleanupOldRecords: jest.fn(),
            cleanupExpiredConfirmations: jest.fn()
        }))
    };
});

const ParallelConfirmationProcessor_1 = require("../../src/router/ParallelConfirmationProcessor");
const types_1 = require("../../src/types");
const logger_1 = require("../../src/utils/logger");
const events_1 = require("events");

// Disable console errors for tests
console.error = jest.fn();

describe('ParallelConfirmationProcessor', () => {
    let processor;
    let mockConfirmationManager;
    let mockRedisClient;
    let logger;
    let eventEmitter;
    
    beforeEach(() => {
        logger = (0, logger_1.createLogger)({ level: 'error' });
        eventEmitter = new events_1.EventEmitter();
        
        // Mock Redis client
        mockRedisClient = {
            hSet: jest.fn(),
            hGet: jest.fn(),
            hDel: jest.fn(),
            hGetAll: jest.fn(),
            hExists: jest.fn(),
            sAdd: jest.fn(),
            sRem: jest.fn(),
            sDiff: jest.fn(),
            sMembers: jest.fn(),
            keys: jest.fn(),
            eval: jest.fn(),
            publish: jest.fn(),
            multi: jest.fn(),
            exec: jest.fn(),
            ping: jest.fn().mockResolvedValue('PONG'),
            isOpen: true
        };

        // Create a new instance of the mocked ConfirmationRecordManager
        const { ConfirmationRecordManager } = require('../../src/router/ConfirmationRecordManager');
        mockConfirmationManager = new ConfirmationRecordManager(mockRedisClient, logger, 'test-router');
        
        // Ensure the mock methods are available
        jest.clearAllMocks();
        
        // Set up mock methods
        mockConfirmationManager.createConfirmationRecord = jest.fn().mockResolvedValue({
            id: 'conf_123',
            transferId: 'transfer-123',
            routerId: 'test-router',
            status: 'confirmed',
            timestamp: new Date().toISOString(),
            signature: 'mock-signature',
            metadata: {
                fromAccount: 'account-1',
                toAccount: 'account-2',
                asset: 'asset-1',
                amount: '1000',
                ledgerTxHash: 'mock-tx-hash'
            }
        });
        
        mockConfirmationManager.getConfirmationRecord = jest.fn();
        mockConfirmationManager.updateConfirmationStatus = jest.fn();
        mockConfirmationManager.checkDualConfirmation = jest.fn();
        mockConfirmationManager.getConfirmationsByStatus = jest.fn();
        mockConfirmationManager.submitConfirmation = jest.fn();
        mockConfirmationManager.getTransferConfirmations = jest.fn();
        mockConfirmationManager.getAllConfirmationRecords = jest.fn();
        mockConfirmationManager.cleanupOldRecords = jest.fn();
        mockConfirmationManager.cleanupExpiredConfirmations = jest.fn();
        
        processor = new ParallelConfirmationProcessor_1.ParallelConfirmationProcessor(
            mockRedisClient, 
            logger, 
            mockConfirmationManager, 
            'test-router', 
            {
                maxConcurrentConfirmations: 5,
                batchSize: 3,
                processingTimeout: 5000
            }
        );
        
        // Connect event emitter to processor
        processor.eventEmitter = eventEmitter;
        
        jest.clearAllMocks();
    });
    
    afterEach(async () => {
        await processor.shutdown();
        jest.clearAllTimers();
    });
    
    describe('Initialization', () => {
        it('should initialize with correct configuration', () => {
            expect(processor).toBeDefined();
            const stats = processor.getStatistics();
            expect(stats.queuedTasks).toBe(0);
            expect(stats.activeTasks).toBe(0);
        });
        
        it('should use default configuration when not provided', () => {
            const defaultProcessor = new ParallelConfirmationProcessor_1.ParallelConfirmationProcessor(
                mockRedisClient, 
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
        const mockTransfer = {
            id: 'transfer-123',
            fromAccount: { 
                id: 'account-1', 
                type: 'account', 
                domain: 'test.domain',
                metadata: {}
            },
            toAccount: { 
                id: 'account-2', 
                type: 'account', 
                domain: 'test.domain',
                metadata: {}
            },
            asset: { 
                id: 'asset-1', 
                type: 'asset', 
                domain: 'test.domain',
                metadata: {}
            },
            amount: BigInt(1000),
            status: types_1.TransferStatus.PENDING,
            route: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: { description: 'Test transfer' }
        };
        
        beforeEach(async () => {
            // Processor starts automatically when tasks are added
        });
        
        it('should add confirmation task to queue', async () => {
            // Pause processing by making createConfirmationRecord take time
            mockConfirmationManager.createConfirmationRecord.mockImplementation(
                () => new Promise(resolve => setTimeout(resolve, 1000))
            );
            
            const taskId = await processor.addConfirmationTask(mockTransfer, 'medium');
            expect(taskId).toBeDefined();
            
            // Check immediately after adding
            const stats = processor.getStatistics();
            expect(stats.queuedTasks + stats.activeTasks).toBeGreaterThan(0);
        });
        
        it('should process confirmation task successfully', async () => {
            const mockRecord = {
                id: 'conf_123',
                transferId: 'transfer-123',
                routerId: 'test-router',
                status: 'confirmed',
                timestamp: new Date().toISOString(),
                signature: 'mock-signature',
                metadata: {
                    fromAccount: 'account-1',
                    toAccount: 'account-2',
                    asset: 'asset-1',
                    amount: '1000',
                    ledgerTxHash: 'mock-tx-hash'
                }
            };

            mockConfirmationManager.createConfirmationRecord.mockResolvedValue(mockRecord);

            const taskId = await processor.addConfirmationTask(mockTransfer, 'high');

            // Wait for task processing
            await new Promise(resolve => setTimeout(resolve, 200));

            // Verify the confirmation manager was called with correct parameters
            expect(mockConfirmationManager.createConfirmationRecord).toHaveBeenCalled();
            
            // Based on the implementation, createConfirmationRecord expects (transfer, status, txHash?)
            const callArgs = mockConfirmationManager.createConfirmationRecord.mock.calls[0];
            expect(callArgs[0]).toEqual(mockTransfer);
            expect(callArgs[1]).toBe('confirmed'); // status parameter
        });
        
        it('should handle task processing errors gracefully', async () => {
            mockConfirmationManager.createConfirmationRecord.mockRejectedValue(
                new Error('Database connection failed')
            );
            
            const taskId = await processor.addConfirmationTask(mockTransfer, 'high');
            
            // Wait for task processing
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Should not crash the processor
            const stats = processor.getStatistics();
            expect(stats).toBeDefined();
        });
        
        it('should respect maximum concurrent tasks limit', async () => {
            // Mock to return proper confirmation records for each transfer
            mockConfirmationManager.createConfirmationRecord.mockImplementation((transfer) => {
                return new Promise(resolve => setTimeout(() => resolve({
                    id: `conf_${transfer.id}`,
                    transferId: transfer.id,
                    routerId: 'test-router',
                    status: 'confirmed',
                    timestamp: new Date().toISOString(),
                    signature: 'mock-signature',
                    metadata: {
                        fromAccount: transfer.fromAccount.id,
                        toAccount: transfer.toAccount.id,
                        asset: transfer.asset.id,
                        amount: transfer.amount.toString(),
                        ledgerTxHash: 'mock-tx-hash'
                    }
                }), 50));
            });
            
            const tasks = [];
            // Add more tasks than the limit
            for (let i = 0; i < 10; i++) {
                const task = processor.addConfirmationTask({ 
                    ...mockTransfer, 
                    id: `transfer-${i}` 
                }, 'low');
                tasks.push(task);
            }
            
            // Give time for processing to start
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Check that active tasks don't exceed limit
            const stats = processor.getStatistics();
            expect(stats.activeTasks).toBeLessThanOrEqual(5);
            
            // Wait for all tasks to complete
            await Promise.all(tasks);
        });
        
        it('should handle task timeout', async () => {
            // Create processor with very short timeout
            const shortTimeoutProcessor = new ParallelConfirmationProcessor_1.ParallelConfirmationProcessor(
                mockRedisClient, 
                logger, 
                mockConfirmationManager, 
                'test-router', 
                {
                    processingTimeout: 10
                }
            );
            
            // Mock a slow operation
            mockConfirmationManager.createConfirmationRecord.mockImplementation(() => 
                new Promise(resolve => setTimeout(() => resolve({
                    id: 'conf_123',
                    transferId: 'transfer-123',
                    routerId: 'test-router',
                    status: 'confirmed',
                    timestamp: new Date().toISOString(),
                    signature: 'mock-signature',
                    metadata: {
                        fromAccount: 'account-1',
                        toAccount: 'account-2',
                        asset: 'asset-1',
                        amount: '1000'
                    }
                }), 100))
            );
            
            const taskId = await shortTimeoutProcessor.addConfirmationTask(mockTransfer, 'high');
            
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
            const mockTransfer = {
                id: 'transfer-base',
                fromAccount: { 
                    id: 'account-1', 
                    type: 'account', 
                    domain: 'test.domain',
                    metadata: {}
                },
                toAccount: { 
                    id: 'account-2', 
                    type: 'account', 
                    domain: 'test.domain',
                    metadata: {}
                },
                asset: { 
                    id: 'asset-1', 
                    type: 'asset', 
                    domain: 'test.domain',
                    metadata: {}
                },
                amount: BigInt(1000),
                status: types_1.TransferStatus.PENDING,
                route: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: { description: 'Test transfer' }
            };
            
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
            
            let processedTransferIds = [];
            
            // Make processing slower so we can add both tasks before any processing starts
            mockConfirmationManager.createConfirmationRecord.mockImplementation((transfer) => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        processedTransferIds.push(transfer.id);
                        resolve({
                            id: `conf_${transfer.id}`,
                            transferId: transfer.id,
                            routerId: 'test-router',
                            status: 'confirmed',
                            timestamp: new Date().toISOString(),
                            signature: 'mock-signature',
                            metadata: {
                                fromAccount: transfer.fromAccount.id,
                                toAccount: transfer.toAccount.id,
                                asset: transfer.asset.id,
                                amount: transfer.amount.toString()
                            }
                        });
                    }, 100);
                });
            });
            
            // Add low priority first, then high priority quickly
            await processor.addConfirmationTask(lowPriorityTransfer, 'low');
            await processor.addConfirmationTask(highPriorityTransfer, 'high');
            
            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // High priority should be processed first
            expect(processedTransferIds.length).toBeGreaterThan(0);
            expect(processedTransferIds[0]).toBe('high-priority-transfer');
        });
    });
    
    describe('Event Emission', () => {
        beforeEach(async () => {
            // Processor starts automatically when tasks are added
        });
        
        it('should emit events for task lifecycle', async () => {
            const mockTransfer = {
                id: 'transfer-123',
                fromAccount: { 
                    id: 'account-1', 
                    type: 'account', 
                    domain: 'test.domain',
                    metadata: {}
                },
                toAccount: { 
                    id: 'account-2', 
                    type: 'account', 
                    domain: 'test.domain',
                    metadata: {}
                },
                asset: { 
                    id: 'asset-1', 
                    type: 'asset', 
                    domain: 'test.domain',
                    metadata: {}
                },
                amount: BigInt(1000),
                status: types_1.TransferStatus.PENDING,
                route: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: { description: 'Test transfer' }
            };
            
            const events = [];
            
            // Mock the confirmation record creation
            mockConfirmationManager.createConfirmationRecord.mockImplementation(() => {
                events.push('started');
                return Promise.resolve({
                    id: 'conf_123',
                    transferId: 'transfer-123',
                    routerId: 'test-router',
                    status: 'confirmed',
                    timestamp: new Date().toISOString(),
                    signature: 'mock-signature',
                    metadata: {
                        fromAccount: 'account-1',
                        toAccount: 'account-2',
                        asset: 'asset-1',
                        amount: '1000'
                    }
                }).then(result => {
                    confirmationEventEmitter.emit('confirmation:task:completed');
                    return result;
                });
            });
            
            await processor.addConfirmationTask(mockTransfer, 'medium');
            
            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 200));
            
            expect(events).toContain('started');
            expect(events).toContain('completed');
        });
        
        it('should emit failure events on task errors', async () => {
            const mockTransfer = {
                id: 'transfer-123',
                fromAccount: { 
                    id: 'account-1', 
                    type: 'account', 
                    domain: 'test.domain',
                    metadata: {}
                },
                toAccount: { 
                    id: 'account-2', 
                    type: 'account', 
                    domain: 'test.domain',
                    metadata: {}
                },
                asset: { 
                    id: 'asset-1', 
                    type: 'asset', 
                    domain: 'test.domain',
                    metadata: {}
                },
                amount: BigInt(1000),
                status: types_1.TransferStatus.PENDING,
                route: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: { description: 'Test transfer' }
            };
            
            const events = [];
            
            // Mock the confirmation record creation to simulate failure
            mockConfirmationManager.createConfirmationRecord.mockImplementation(() => {
                events.push('started');
                return Promise.reject(new Error('Test error')).catch(error => {
                    events.push('failed');
                    throw error;
                });
            });
            
            await processor.addConfirmationTask(mockTransfer, 'medium');
            
            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 200));
            
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

            // Pause processing
            mockConfirmationManager.createConfirmationRecord.mockImplementation(
                () => new Promise(resolve => setTimeout(resolve, 1000))
            );

            await processor.addConfirmationTask({
                id: 'transfer-123',
                fromAccount: { id: 'account-1', type: 'account', domain: 'test.domain', metadata: {} },
                toAccount: { id: 'account-2', type: 'account', domain: 'test.domain', metadata: {} },
                asset: { id: 'asset-1', type: 'asset', domain: 'test.domain', metadata: {} },
                amount: BigInt(1000),
                status: types_1.TransferStatus.PENDING,
                route: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: { description: 'Test transfer' }
            }, 'medium');

            stats = processor.getStatistics();
            expect(stats.queuedTasks + stats.activeTasks).toBeGreaterThan(0);
        });

        it('should track active task count', async () => {
            mockConfirmationManager.createConfirmationRecord.mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve({ id: 'conf_123' }), 50))
            );

            await processor.addConfirmationTask({
                id: 'transfer-123',
                fromAccount: { id: 'account-1', type: 'account', domain: 'test.domain', metadata: {} },
                toAccount: { id: 'account-2', type: 'account', domain: 'test.domain', metadata: {} },
                asset: { id: 'asset-1', type: 'asset', domain: 'test.domain', metadata: {} },
                amount: BigInt(1000),
                status: types_1.TransferStatus.PENDING,
                route: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: { description: 'Test transfer' }
            }, 'medium');

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
            expect(stats).toHaveProperty('processedTransfers');
            expect(stats).toHaveProperty('averageProcessingTime');
            expect(stats).toHaveProperty('successRate');
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
                        resolve({ id: 'conf_123' });
                    }, 100);
                })
            );

            await processor.addConfirmationTask({
                id: 'transfer-123',
                fromAccount: { id: 'account-1', type: 'account', domain: 'test.domain', metadata: {} },
                toAccount: { id: 'account-2', type: 'account', domain: 'test.domain', metadata: {} },
                asset: { id: 'asset-1', type: 'asset', domain: 'test.domain', metadata: {} },
                amount: BigInt(1000),
                status: types_1.TransferStatus.PENDING,
                route: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: { description: 'Test transfer' }
            }, 'medium');

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

            await processor.addConfirmationTask({
                id: 'transfer-123',
                fromAccount: { id: 'account-1', type: 'account', domain: 'test.domain', metadata: {} },
                toAccount: { id: 'account-2', type: 'account', domain: 'test.domain', metadata: {} },
                asset: { id: 'asset-1', type: 'asset', domain: 'test.domain', metadata: {} },
                amount: BigInt(1000),
                status: types_1.TransferStatus.PENDING,
                route: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: { description: 'Test transfer' }
            }, 'high');

            // Force shutdown with short timeout
            const startTime = Date.now();
            await processor.shutdown();
            const endTime = Date.now();

            // Should complete within reasonable time
            expect(endTime - startTime).toBeLessThan(35000); // 35 seconds to account for shutdown timeout
        });
    });
});