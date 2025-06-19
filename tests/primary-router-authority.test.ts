/**
 * Primary Router Authority Test Suite
 * 
 * Comprehensive tests for FinP2P Primary Router Authority implementation:
 * 1. Asset registration and authority validation
 * 2. Cross-chain transfer authorization
 * 3. Backup router failover scenarios
 * 4. Authority transfer mechanisms
 * 5. Dual confirmation integration
 * 6. Error handling and edge cases
 * 7. Protocol compliance validation
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { PrimaryRouterAuthority } from '../src/router/PrimaryRouterAuthority';
import { ConfirmationRecordManager } from '../src/router/ConfirmationRecordManager';
import Redis from 'ioredis';

describe('Primary Router Authority', () => {
  let authority: PrimaryRouterAuthority;
  let confirmationManager: ConfirmationRecordManager;
  let redisClient: any;
  let redisStub: any;

  beforeEach(() => {
    // Mock Redis client
    redisStub = {
      get: sinon.stub(),
      set: sinon.stub(),
      del: sinon.stub(),
      hget: sinon.stub(),
      hset: sinon.stub(),
      hdel: sinon.stub(),
      hgetall: sinon.stub(),
      exists: sinon.stub(),
      expire: sinon.stub(),
      keys: sinon.stub()
    };
    
    redisClient = redisStub;
    authority = new PrimaryRouterAuthority('test-router-id', redisClient);
    confirmationManager = new ConfirmationRecordManager(redisClient);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Asset Registration', () => {
    it('should register a new asset with primary authority', async () => {
      const assetData = {
        assetId: 'USDC-ETH-0xa0b86a33e6ba3b936f0b85ae3e3c1e0b',
        metadata: {
          assetType: 'stablecoin',
          blockchain: 'ethereum',
          contractAddress: '0xa0b86a33e6ba3b936f0b85ae3e3c1e0b',
          symbol: 'USDC',
          decimals: 6
        },
        backupRouterIds: ['backup-router-1', 'backup-router-2']
      };

      redisStub.exists.resolves(0); // Asset doesn't exist
      redisStub.hset.resolves(1);
      redisStub.expire.resolves(1);

      const result = await authority.registerAsset(
        assetData.assetId,
        assetData.metadata,
        assetData.backupRouterIds
      );

      expect(result.assetId).to.equal(assetData.assetId);
      expect(result.primaryRouterId).to.equal('test-router-id');
      expect(result.backupRouterIds).to.deep.equal(assetData.backupRouterIds);
      expect(redisStub.hset.calledOnce).to.be.true;
    });

    it('should reject registration of existing asset', async () => {
      const assetData = {
        assetId: 'EXISTING-ASSET',
        metadata: {
          assetType: 'cryptocurrency',
          blockchain: 'ethereum',
          symbol: 'TEST',
          decimals: 18
        },
        backupRouterIds: []
      };

      redisStub.hgetall.resolves({
        assetId: 'EXISTING-ASSET',
        primaryRouterId: 'existing-router',
        backupRouterIds: JSON.stringify([]),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: JSON.stringify({ symbol: 'TEST' })
      });

      try {
        await authority.registerAsset(
          assetData.assetId,
          assetData.metadata,
          assetData.backupRouterIds
        );
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('already registered');
      }
      expect(redisStub.hset.called).to.be.false;
    });

    it('should validate required asset fields', async () => {
      const invalidMetadata = {
        // Missing required fields
        symbol: 'TEST'
      };

      try {
        await authority.registerAsset(
          '', // Empty assetId
          invalidMetadata as any,
          []
        );
        expect.fail('Should have thrown an error');
      } catch (error) {
         expect(error).to.exist;
       }
     });
  });

  describe('Authority Validation', () => {
    beforeEach(() => {
      // Setup existing asset registration
      const mockRegistration = {
        assetId: 'TEST-ASSET',
        primaryRouterId: 'test-router-id',
        backupRouterIds: ['backup-1', 'backup-2'],
        registeredAt: new Date().toISOString(),
        metadata: { symbol: 'TEST' }
      };
      
      redisStub.hgetall.resolves({
        assetId: mockRegistration.assetId,
        primaryRouterId: mockRegistration.primaryRouterId,
        backupRouterIds: JSON.stringify(mockRegistration.backupRouterIds),
        registeredAt: mockRegistration.registeredAt,
        metadata: JSON.stringify(mockRegistration.metadata)
      });
    });

    it('should validate primary router authority', async () => {
      const result = await authority.validateAuthority('TEST-ASSET', 'test-router-id');

      expect(result.isAuthorized).to.be.true;
      expect(result.authorityType).to.equal('primary');
      expect(result.routerId).to.equal('test-router-id');
    });

    it('should validate backup router authority', async () => {
      const result = await authority.validateAuthority('TEST-ASSET', 'backup-1');

      expect(result.isAuthorized).to.be.true;
      expect(result.authorityType).to.equal('backup');
      expect(result.routerId).to.equal('backup-1');
    });

    it('should reject unauthorized router', async () => {
      const result = await authority.validateAuthority('TEST-ASSET', 'unauthorized-router');

      expect(result.isAuthorized).to.be.false;
      expect(result.reason).to.include('not authorized');
    });

    it('should handle non-existent asset', async () => {
      redisStub.hgetall.resolves(null);

      const result = await authority.validateAuthority('NON-EXISTENT', 'test-router-id');

      expect(result.isAuthorized).to.be.false;
      expect(result.reason).to.include('not found');
    });
  });

  describe('Authority Transfer', () => {
    beforeEach(() => {
      const mockRegistration = {
        assetId: 'TRANSFER-TEST-ASSET',
        primaryRouterId: 'test-router-id',
        backupRouterIds: ['backup-1'],
        registeredAt: new Date().toISOString(),
        metadata: JSON.stringify({ symbol: 'TEST' })
      };
      
      redisStub.hgetall.resolves({
        assetId: mockRegistration.assetId,
        primaryRouterId: mockRegistration.primaryRouterId,
        backupRouterIds: JSON.stringify(mockRegistration.backupRouterIds),
        registeredAt: mockRegistration.registeredAt,
        metadata: mockRegistration.metadata
      });
    });

    it('should transfer primary authority to backup router', async () => {
      redisStub.hSet.resolves(1);
      redisStub.sRem.resolves(1);
      redisStub.sAdd.resolves(1);

      // Should not throw an error
      await authority.transferAuthority(
        'TRANSFER-TEST-ASSET',
        'backup-1'
      );
      
      // Verify Redis update was called
      expect(redisStub.hSet.called).to.be.true;
      expect(redisStub.sRem.called).to.be.true;
      expect(redisStub.sAdd.called).to.be.true;
    });

    it('should reject transfer to unauthorized router', async () => {
      try {
        await authority.transferAuthority(
          'TRANSFER-TEST-ASSET',
          'unauthorized-router'
        );
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Only primary router');
      }
    });

    it('should reject transfer from non-primary router', async () => {
      // Change authority instance to simulate different router
      const unauthorizedAuthority = new PrimaryRouterAuthority('backup-1', redisClient);
      
      try {
        await unauthorizedAuthority.transferAuthority(
          'TRANSFER-TEST-ASSET',
          'backup-1'
        );
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Only primary router');
      }
    });
  });

  describe('Primary Router Availability Check', () => {
    it('should detect available primary router', async () => {
      redisStub.get.resolves(Date.now().toString());

      const result = await authority.checkPrimaryRouterAvailability('TEST-ASSET');

      expect(result.isAvailable).to.be.true;
      expect(result.lastHeartbeat).to.be.a('number');
    });

    it('should detect unavailable primary router', async () => {
      // Simulate old heartbeat (more than 30 seconds ago)
      const oldHeartbeat = Date.now() - 60000;
      redisStub.get.resolves(oldHeartbeat.toString());

      const result = await authority.checkPrimaryRouterAvailability('TEST-ASSET');

      expect(result.isAvailable).to.be.false;
      expect(result.reason).to.include('heartbeat expired');
    });

    it('should handle missing heartbeat', async () => {
      redisStub.get.resolves(null);

      const result = await authority.checkPrimaryRouterAvailability('TEST-ASSET');

      expect(result.isAvailable).to.be.false;
      expect(result.reason).to.include('No heartbeat found');
    });
  });

  describe('Backup Authority Validation', () => {
    beforeEach(() => {
      const mockRegistration = {
        assetId: 'BACKUP-TEST-ASSET',
        primaryRouterId: 'primary-router',
        backupRouterIds: ['backup-1', 'backup-2'],
        registeredAt: new Date().toISOString(),
        metadata: JSON.stringify({ symbol: 'TEST' })
      };
      
      redisStub.hgetall.resolves({
        assetId: mockRegistration.assetId,
        primaryRouterId: mockRegistration.primaryRouterId,
        backupRouterIds: JSON.stringify(mockRegistration.backupRouterIds),
        registeredAt: mockRegistration.registeredAt,
        metadata: mockRegistration.metadata
      });
    });

    it('should validate backup authority when primary is unavailable', async () => {
      // Simulate unavailable primary router
      redisStub.get.resolves(null);
      
      const backupAuthority = new PrimaryRouterAuthority('backup-1', redisClient);
      const result = await backupAuthority.validateBackupAuthority('BACKUP-TEST-ASSET');

      expect(result.canActAsPrimary).to.be.true;
      expect(result.reason).to.include('Primary router unavailable');
    });

    it('should reject backup authority when primary is available', async () => {
      // Simulate available primary router
      redisStub.get.resolves(Date.now().toString());
      
      const backupAuthority = new PrimaryRouterAuthority('backup-1', redisClient);
      const result = await backupAuthority.validateBackupAuthority('BACKUP-TEST-ASSET');

      expect(result.canActAsPrimary).to.be.false;
      expect(result.reason).to.include('Primary router is available');
    });

    it('should reject unauthorized backup router', async () => {
      redisStub.get.resolves(null); // Primary unavailable
      
      const unauthorizedAuthority = new PrimaryRouterAuthority('unauthorized-router', redisClient);
      const result = await unauthorizedAuthority.validateBackupAuthority('BACKUP-TEST-ASSET');

      expect(result.canActAsPrimary).to.be.false;
      expect(result.reason).to.include('not a backup router');
    });
  });

  describe('Integration with Confirmation Records', () => {
    it('should create confirmation record with authority validation', async () => {
      const transferData = {
        id: 'test-transfer-123',
        assetId: 'TEST-ASSET',
        from: { ledger: 'ethereum', address: '0x123' },
        to: { ledger: 'sui', address: '0x456' },
        amount: '1000000',
        routerId: 'test-router-id'
      };

      // Mock successful authority validation
      redisStub.hgetall.resolves({
        assetId: 'TEST-ASSET',
        primaryRouterId: 'test-router-id',
        backupRouterIds: JSON.stringify(['backup-1']),
        registeredAt: new Date().toISOString(),
        metadata: JSON.stringify({ symbol: 'TEST' })
      });

      redisStub.hset.resolves(1);
      redisStub.expire.resolves(1);

      // Validate authority first
      const authorityResult = await authority.validateAuthority(
        transferData.assetId,
        transferData.routerId
      );

      expect(authorityResult.isAuthorized).to.be.true;

      // Create confirmation record
      const confirmationResult = await confirmationManager.createConfirmationRecord(
        transferData,
        'confirmed'
      );

      expect(confirmationResult).to.exist;
      expect(confirmationResult.transferId).to.equal(transferData.id);
      expect(confirmationResult.status).to.equal('confirmed');
    });

    it('should reject confirmation record for unauthorized router', async () => {
      const transferData = {
        id: 'test-transfer-456',
        assetId: 'TEST-ASSET',
        from: { ledger: 'ethereum', address: '0x123' },
        to: { ledger: 'sui', address: '0x456' },
        amount: '1000000',
        routerId: 'unauthorized-router'
      };

      // Mock asset registration
      redisStub.hgetall.resolves({
        assetId: 'TEST-ASSET',
        primaryRouterId: 'test-router-id',
        backupRouterIds: JSON.stringify(['backup-1']),
        registeredAt: new Date().toISOString(),
        metadata: JSON.stringify({ symbol: 'TEST' })
      });

      // Validate authority (should fail)
      const authorityResult = await authority.validateAuthority(
        transferData.assetId,
        transferData.routerId
      );

      expect(authorityResult.isAuthorized).to.be.false;
      expect(authorityResult.reason).to.include('not authorized');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle Redis connection errors gracefully', async () => {
      redisStub.hgetall.rejects(new Error('Redis connection failed'));

      const result = await authority.validateAuthority('TEST-ASSET', 'test-router-id');

      expect(result.isAuthorized).to.be.false;
      expect(result.reason).to.include('Redis connection failed');
    });

    it('should handle malformed asset data in Redis', async () => {
      redisStub.hgetall.resolves({
        assetId: 'MALFORMED-ASSET',
        primaryRouterId: 'test-router-id',
        backupRouterIds: 'invalid-json', // Invalid JSON
        registeredAt: new Date().toISOString(),
        metadata: 'also-invalid-json'
      });

      const result = await authority.validateAuthority('MALFORMED-ASSET', 'test-router-id');

      expect(result.isAuthorized).to.be.false;
      expect(result.reason).to.include('Failed to parse');
    });

    it('should validate asset ID format', async () => {
      const invalidMetadata = {
        assetType: 'cryptocurrency',
        blockchain: 'ethereum',
        symbol: 'TEST',
        decimals: 18
      };

      try {
        await authority.registerAsset(
          '', // Empty asset ID
          invalidMetadata,
          []
        );
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('should handle concurrent registration attempts', async () => {
      const assetMetadata = {
        assetType: 'cryptocurrency',
        blockchain: 'ethereum',
        symbol: 'TEST',
        decimals: 18
      };

      // First call succeeds
      redisStub.hgetall.onFirstCall().resolves(null);
      redisStub.hset.resolves(1);
      redisStub.expire.resolves(1);
      
      // Second call fails (asset now exists)
      redisStub.hgetall.onSecondCall().resolves({
        assetId: 'CONCURRENT-TEST',
        primaryRouterId: 'primary-router',
        backupRouterIds: JSON.stringify([]),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: JSON.stringify(assetMetadata)
      });

      const results = await Promise.allSettled([
        authority.registerAsset('CONCURRENT-TEST', assetMetadata, []),
        authority.registerAsset('CONCURRENT-TEST', assetMetadata, [])
      ]);

      // One should succeed, one should fail
      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected');
      
      expect(successes.length).to.equal(1);
      expect(failures.length).to.equal(1);
    });
  });

  describe('Protocol Compliance Validation', () => {
    it('should enforce FinP2P protocol requirements', async () => {
      const protocolCompliantAsset = {
        assetId: 'FINP2P-COMPLIANT-ASSET',
        metadata: {
          assetType: 'stablecoin',
          blockchain: 'ethereum',
          contractAddress: '0xa0b86a33e6ba3b936f0b85ae3e3c1e0b',
          symbol: 'USDC',
          decimals: 6,
          finp2pVersion: '1.0',
          complianceLevel: 'FULL'
        },
        backupRouterIds: ['backup-1', 'backup-2']
      };

      redisStub.exists.resolves(0);
      redisStub.hset.resolves(1);
      redisStub.expire.resolves(1);

      const result = await authority.registerAsset(
        protocolCompliantAsset.assetId,
        protocolCompliantAsset.metadata,
        protocolCompliantAsset.backupRouterIds
      );

      expect(result.assetId).to.equal(protocolCompliantAsset.assetId);
      expect(result.metadata.symbol).to.equal('USDC');
      expect(result.metadata.decimals).to.equal(6);
    });

    it('should validate minimum backup router requirements', async () => {
      const assetWithoutBackups = {
        assetId: 'ASSET-NO-BACKUPS',
        metadata: {
          assetType: 'cryptocurrency',
          blockchain: 'ethereum',
          symbol: 'TEST',
          decimals: 18
        },
        backupRouterIds: [] // No backup routers
      };

      redisStub.exists.resolves(0);
      redisStub.hset.resolves(1);
      redisStub.expire.resolves(1);

      const result = await authority.registerAsset(
        assetWithoutBackups.assetId,
        assetWithoutBackups.metadata,
        assetWithoutBackups.backupRouterIds
      );

      // Should still succeed
      expect(result.assetId).to.equal(assetWithoutBackups.assetId);
      expect(result.backupRouterIds).to.deep.equal([]);
    });

    // TODO: Implement getValidationMetrics method in PrimaryRouterAuthority
    // it('should track authority validation metrics', async () => {
    //   // Mock multiple validation calls
    //   redisStub.hgetall.resolves({
    //     assetId: 'METRICS-TEST-ASSET',
    //     primaryRouterId: 'test-router-id',
    //     backupRouterIds: JSON.stringify(['backup-1']),
    //     registeredAt: new Date().toISOString(),
    //     metadata: JSON.stringify({ symbol: 'TEST' })
    //   });

    //   // Perform multiple validations
    //   await authority.validateAuthority('METRICS-TEST-ASSET', 'test-router-id');
    //   await authority.validateAuthority('METRICS-TEST-ASSET', 'backup-1');
    //   await authority.validateAuthority('METRICS-TEST-ASSET', 'unauthorized');

    //   const metrics = authority.getValidationMetrics();

    //   expect(metrics.totalValidations).to.equal(3);
    //   expect(metrics.successfulValidations).to.equal(2);
    //   expect(metrics.failedValidations).to.equal(1);
    // });
  });
});

// Additional test utilities
class TestHelper {
  static createMockAsset(overrides: any = {}) {
    return {
      assetId: 'TEST-ASSET-' + Math.random().toString(36).substr(2, 9),
      metadata: {
        assetType: 'cryptocurrency',
        blockchain: 'ethereum',
        symbol: 'TEST',
        decimals: 18,
        ...overrides.metadata
      },
      backupRouterIds: ['backup-1', 'backup-2'],
      ...overrides
    };
  }

  static createMockTransfer(overrides: any = {}) {
    return {
      id: 'transfer-' + Math.random().toString(36).substr(2, 9),
      assetId: 'TEST-ASSET',
      from: { ledger: 'ethereum', address: '0x123' },
      to: { ledger: 'sui', address: '0x456' },
      amount: '1000000',
      routerId: 'test-router-id',
      ...overrides
    };
  }
}

module.exports = { TestHelper };