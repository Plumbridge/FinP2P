import { MockAdapter } from '../../src/adapters/MockAdapter';
import { LedgerManager } from '../../src/router/LedgerManager';
import { Asset, LedgerType } from '../../src/types';
import { Logger } from 'winston';
import { createLogger, format, transports } from 'winston';

describe('Enhanced Balance Tracking', () => {
  let mockAdapter: MockAdapter;
  let ledgerManager: LedgerManager;
  let logger: Logger;
  let testAsset: Asset;
  let testAssetId: string;
  let testAccount1: string;
  let testAccount2: string;

  beforeEach(async () => {
    logger = createLogger({
      level: 'error', // Reduce noise in tests
      format: format.simple(),
      transports: [new transports.Console({ silent: true })]
    });

    // Create MockAdapter with enhanced features enabled
    mockAdapter = new MockAdapter({
      enableBalanceHistory: true,
      enableConcurrencySimulation: true,
      networkPartitionRate: 0, // Disabled for most tests
      balanceReconciliationDelay: 100,
      latency: 10,
      failureRate: 0
    }, logger);

    await mockAdapter.connect();

    // Create LedgerManager
    const ledgerConfig = {
      mock: {
        type: LedgerType.MOCK,
        config: {
          enableBalanceHistory: true,
          enableConcurrencySimulation: true
        }
      }
    };
    
    ledgerManager = new LedgerManager(ledgerConfig, logger);
    ledgerManager['adapters'].set('mock', mockAdapter);

    // Create test asset
    testAsset = await mockAdapter.createAsset({
      finId: {
        id: 'test-asset-1',
        type: 'asset',
        domain: 'test.local'
      },
      symbol: 'TEST',
      name: 'Test Token',
      decimals: 18,
      totalSupply: BigInt('1000000000000000000000000'), // 1M tokens
      ledgerId: 'mock-ledger',
      metadata: {
        description: 'Test token for balance tracking tests'
      }
    });
    testAssetId = testAsset.id;

    const account1 = await mockAdapter.createAccount('test-institution-1');
    const account2 = await mockAdapter.createAccount('test-institution-2');
    testAccount1 = account1.finId.id;
    testAccount2 = account2.finId.id;

    // Mint initial balances
      await mockAdapter.mintTokens(testAccount1, testAssetId, BigInt('100000000000000000000')); // 100 tokens
      await mockAdapter.mintTokens(testAccount2, testAssetId, BigInt('50000000000000000000'));  // 50 tokens
  });

  afterEach(async () => {
    await mockAdapter.disconnect();
  });

  describe('MockAdapter Enhanced Features', () => {
    it('should track balance history', async () => {
      const initialHistory = mockAdapter.getBalanceHistory(testAccount1);
      expect(initialHistory).toHaveLength(1); // Initial mint
      expect(initialHistory[0].operation).toBe('mintTokens');
      expect(initialHistory[0].balance).toBe(BigInt('100000000000000000000'));

      // Perform a transfer
      await mockAdapter.transfer(testAccount1, testAccount2, testAssetId, BigInt('10000000000000000000'));

      const updatedHistory = mockAdapter.getBalanceHistory(testAccount1);
      expect(updatedHistory).toHaveLength(2);
      expect(updatedHistory[1].operation).toBe('transfer_out');
      expect(updatedHistory[1].balance).toBe(BigInt('90000000000000000000'));
    });

    it('should simulate concurrent operations', async () => {
      mockAdapter.simulateConcurrentTransfers(testAccount1, testAssetId, 3);
      
      const pendingOps = mockAdapter.getPendingOperations();
      expect(pendingOps).toHaveLength(3);
      expect(pendingOps[0].operation).toBe('concurrent_transfer');
      expect(pendingOps[0].accountId).toBe(testAccount1);
    });

    it('should simulate insufficient balance scenarios', async () => {
      mockAdapter.simulateInsufficientBalance(testAccount1, testAssetId);
      
      const balance = await mockAdapter.getBalance(testAccount1, testAssetId);
      expect(balance).toBe(BigInt(0));

      await expect(
        mockAdapter.transfer(testAccount1, testAccount2, testAssetId, BigInt('1000000000000000000'))
      ).rejects.toThrow('Insufficient balance');
    });

    it('should simulate network partitions', async () => {
      mockAdapter.simulateNetworkPartition(true);
      
      await expect(
        mockAdapter.getBalance(testAccount1, testAssetId)
      ).rejects.toThrow('Network partition');

      mockAdapter.simulateNetworkPartition(false);
      
      // Should work normally now
      const balance = await mockAdapter.getBalance(testAccount1, testAssetId);
      expect(balance).toBe(BigInt('100000000000000000000'));
    });

    it('should handle balance reconciliation', async () => {
      const correctBalance = BigInt('200000000000000000000');
      
      await mockAdapter.simulateBalanceReconciliation(testAccount1, testAssetId, correctBalance);
      
      const balance = await mockAdapter.getBalance(testAccount1, testAssetId);
      expect(balance).toBe(correctBalance);

      const history = mockAdapter.getBalanceHistory(testAccount1);
      const lastEntry = history[history.length - 1];
      expect(lastEntry.operation).toBe('reconciliation');
      expect(lastEntry.balance).toBe(correctBalance);
    });

    it('should calculate available balance correctly', async () => {
      const totalBalance = await mockAdapter.getBalance(testAccount1, testAssetId);
      expect(totalBalance).toBe(BigInt('100000000000000000000'));

      // Lock some balance
      await mockAdapter.lockAsset(testAccount1, testAssetId, BigInt('30000000000000000000'));
      
      const availableBalance = mockAdapter.getAvailableBalance(testAccount1, testAssetId);
      expect(availableBalance).toBe(BigInt('70000000000000000000'));

      const lockedBalance = mockAdapter.getLockedBalance(testAccount1, testAssetId);
      expect(lockedBalance).toBe(BigInt('30000000000000000000'));
    });
  });

  describe('LedgerManager Enhanced Features', () => {
    it('should validate balance availability', async () => {
      const validation = await ledgerManager.validateBalanceAvailability(
        'mock',
        testAccount1,
        testAssetId,
        BigInt('50000000000000000000')
      );

      expect(validation.available).toBe(true);
      expect(validation.currentBalance).toBe(BigInt('100000000000000000000'));
      expect(validation.availableBalance).toBe(BigInt('100000000000000000000'));
    });

    it('should reserve and release balance', async () => {
      const reservation = await ledgerManager.reserveBalance(
        'mock',
        testAccount1,
        testAssetId,
        BigInt('30000000000000000000')
      );

      expect(reservation.success).toBe(true);
      expect(reservation.reservationId).toBeDefined();

      // Check that reserved amount affects availability
      const validation = await ledgerManager.validateBalanceAvailability(
        'mock',
        testAccount1,
        testAssetId,
        BigInt('80000000000000000000')
      );

      expect(validation.available).toBe(false);
      expect(validation.availableBalance).toBe(BigInt('70000000000000000000'));

      // Release reservation
      const release = await ledgerManager.releaseReservation(reservation.reservationId!);
      expect(release.success).toBe(true);

      // Check availability is restored
      const validationAfter = await ledgerManager.validateBalanceAvailability(
        'mock',
        testAccount1,
        testAssetId,
        BigInt('80000000000000000000')
      );

      expect(validationAfter.available).toBe(true);
    });

    it('should lock and unlock reserved balance', async () => {
      const reservation = await ledgerManager.reserveBalance(
        'mock',
        testAccount1,
        testAssetId,
        BigInt('25000000000000000000')
      );

      expect(reservation.success).toBe(true);

      const lock = await ledgerManager.lockReservedBalance(reservation.reservationId!);
      expect(lock.success).toBe(true);
      expect(lock.lockTxHash).toBeDefined();

      // Check that locked amount affects available balance
      const availableBalance = mockAdapter.getAvailableBalance(testAccount1, testAssetId);
      expect(availableBalance).toBe(BigInt('75000000000000000000'));

      // Release with unlock
      const release = await ledgerManager.releaseReservation(reservation.reservationId!, true);
      expect(release.success).toBe(true);

      // Check that balance is fully available again
      const finalAvailable = mockAdapter.getAvailableBalance(testAccount1, testAssetId);
      expect(finalAvailable).toBe(BigInt('100000000000000000000'));
    });

    it('should handle cross-ledger transfer initiation', async () => {
      // This test demonstrates the framework for cross-ledger transfers
      const crossTransfer = await ledgerManager.initiateCrossLedgerTransfer(
        'mock',
        'mock', // Same ledger for testing
        testAccount1,
        testAccount2,
        testAssetId,
        BigInt('20000000000000000000')
      );

      expect(crossTransfer.success).toBe(true);
      expect(crossTransfer.operationId).toBeDefined();

      const operations = ledgerManager.getCrossLedgerOperations();
      expect(operations).toHaveLength(1);
      expect(operations[0].status).toBe('pending');
      expect(operations[0].amount).toBe(BigInt('20000000000000000000'));
    });

    it('should rollback cross-ledger operations', async () => {
      const crossTransfer = await ledgerManager.initiateCrossLedgerTransfer(
        'mock',
        'mock',
        testAccount1,
        testAccount2,
        testAssetId,
        BigInt('15000000000000000000')
      );

      expect(crossTransfer.success).toBe(true);

      const rollback = await ledgerManager.rollbackCrossLedgerOperation(crossTransfer.operationId!);
      expect(rollback.success).toBe(true);

      const operations = ledgerManager.getCrossLedgerOperations();
      expect(operations[0].status).toBe('rolled_back');

      // Check that balance is fully available again
      const validation = await ledgerManager.validateBalanceAvailability(
        'mock',
        testAccount1,
        testAssetId,
        BigInt('100000000000000000000')
      );
      expect(validation.available).toBe(true);
    });

    it('should handle insufficient balance scenarios gracefully', async () => {
      // Try to reserve more than available
      const reservation = await ledgerManager.reserveBalance(
        'mock',
        testAccount1,
        testAssetId,
        BigInt('150000000000000000000') // More than the 100 tokens available
      );

      expect(reservation.success).toBe(false);
      expect(reservation.reason).toContain('Insufficient');
    });

    it('should clean up expired reservations', async () => {
      // Set a very short timeout for testing
      ledgerManager.setReservationTimeout(100); // 100ms

      const reservation = await ledgerManager.reserveBalance(
        'mock',
        testAccount1,
        testAssetId,
        BigInt('10000000000000000000')
      );

      expect(reservation.success).toBe(true);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 200));

      // Trigger cleanup manually (normally done by timer)
      (ledgerManager as any).cleanupExpiredReservations();

      const activeReservations = ledgerManager.getActiveReservations();
      expect(activeReservations).toHaveLength(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle high-volume transfers with proper balance tracking', async () => {
      const transferCount = 10;
      const transferAmount = BigInt('5000000000000000000'); // 5 tokens each
      
      // Ensure sufficient balance
      await mockAdapter.mintTokens(testAccount1, testAssetId, BigInt('50000000000000000000')); // Add 50 more tokens
      
      const promises = [];
      for (let i = 0; i < transferCount; i++) {
        promises.push(
          mockAdapter.transfer(testAccount1, testAccount2, testAssetId, transferAmount)
        );
      }

      await Promise.all(promises);

      const finalBalance1 = await mockAdapter.getBalance(testAccount1, testAssetId);
      const finalBalance2 = await mockAdapter.getBalance(testAccount2, testAssetId);
      
      const expectedBalance1 = BigInt('100000000000000000000'); // 150 - 50 = 100
      const expectedBalance2 = BigInt('100000000000000000000'); // 50 + 50 = 100
      
      expect(finalBalance1).toBe(expectedBalance1);
      expect(finalBalance2).toBe(expectedBalance2);

      // Check balance history
      const history = mockAdapter.getBalanceHistory(testAccount1);
      expect(history.length).toBeGreaterThan(transferCount);
    });

    it('should maintain consistency under concurrent operations', async () => {
      const concurrentOps = 5;
      const operationAmount = BigInt('10000000000000000000'); // 10 tokens each
      
      // Add more balance to handle concurrent operations
      await mockAdapter.mintTokens(testAccount1, testAssetId, BigInt('100000000000000000000'));
      
      const reservationPromises = [];
      for (let i = 0; i < concurrentOps; i++) {
        reservationPromises.push(
          ledgerManager.reserveBalance('mock', testAccount1, testAssetId, operationAmount)
        );
      }

      const reservations = await Promise.all(reservationPromises);
      
      // All reservations should succeed
      reservations.forEach(reservation => {
        expect(reservation.success).toBe(true);
      });

      // Total reserved should be tracked correctly
      const validation = await ledgerManager.validateBalanceAvailability(
        'mock',
        testAccount1,
        testAssetId,
        BigInt('150000000000000000000') // Should fail due to reservations
      );

      expect(validation.available).toBe(false);
      expect(validation.availableBalance).toBe(BigInt('150000000000000000000')); // 200 - 50 reserved

      // Release all reservations
      for (const reservation of reservations) {
        await ledgerManager.releaseReservation(reservation.reservationId!);
      }

      // Should be fully available again
      const finalValidation = await ledgerManager.validateBalanceAvailability(
        'mock',
        testAccount1,
        testAssetId,
        BigInt('200000000000000000000')
      );
      expect(finalValidation.available).toBe(true);
    });
  });
});