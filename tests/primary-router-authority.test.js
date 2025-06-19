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

const { expect } = require('chai');
const sinon = require('sinon');
const PrimaryRouterAuthority = require('../src/core/PrimaryRouterAuthority');
const ConfirmationRecordManager = require('../src/core/ConfirmationRecordManager');
const Redis = require('ioredis');

describe('Primary Router Authority', () => {
  let authority;
  let confirmationManager;
  let redisClient;
  let redisStub;

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

      const result = await authority.registerAsset(assetData);

      expect(result.success).to.be.true;
      expect(result.registration.assetId).to.equal(assetData.assetId);
      expect(result.registration.primaryRouterId).to.equal('test-router-id');
      expect(result.registration.backupRouterIds).to.deep.equal(assetData.backupRouterIds);
      expect(redisStub.hset.calledOnce).to.be.true;
    });

    it('should reject registration of existing asset', async () => {
      const assetData = {
        assetId: 'EXISTING-ASSET',
        metadata: { symbol: 'TEST' },
        backupRouterIds: []
      };

      redisStub.exists.resolves(1); // Asset exists

      const result = await authority.registerAsset(assetData);

      expect(result.success).to.be.false;
      expect(result.error).to.include('already registered');
      expect(redisStub.hset.called).to.be.false;
    });

    it('should validate required asset fields', async () => {
      const invalidAssetData = {
        // Missing assetId
        metadata: { symbol: 'TEST' },
        backupRouterIds: []
      };

      const result = await authority.registerAsset(invalidAssetData);

      expect(result.success).to.be.false;
      expect(result.error).to.include('assetId is required');
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
      redisStub.hset.resolves(1);

      const result = await authority.transferAuthority(
        'TRANSFER-TEST-ASSET',
        'backup-1',
        'Primary router maintenance'
      );

      expect(result.success).to.be.true;
      expect(result.newPrimaryRouterId).to.equal('backup-1');
      expect(result.reason).to.equal('Primary router maintenance');
      
      // Verify Redis update was called
      expect(redisStub.hset.calledWith(
        'finp2p:asset:TRANSFER-TEST-ASSET',
        'primaryRouterId',
        'backup-1'
      )).to.be.true;
    });

    it('should reject transfer to unauthorized router', async () => {
      const result = await authority.transferAuthority(
        'TRANSFER-TEST-ASSET',
        'unauthorized-router',
        'Invalid transfer'
      );

      expect(result.success).to.be.false;
      expect(result.error).to.include('not authorized');
    });

    it('should reject transfer from non-primary router', async () => {
      // Change authority instance to simulate different router
      const unauthorizedAuthority = new PrimaryRouterAuthority('backup-1', redisClient);
      
      const result = await unauthorizedAuthority.transferAuthority(
        'TRANSFER-TEST-ASSET',
        'backup-1',
        'Unauthorized transfer attempt'
      );

      expect(result.success).to.be.false;
      expect(result.error).to.include('Only primary router can transfer authority');
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
        'pending'
      );

      expect(confirmationResult.success).to.be.true;
      expect(confirmationResult.record.transferId).to.equal(transferData.id);
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
      expect(result.error).to.include('Redis connection failed');
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
      expect(result.error).to.include('Failed to parse');
    });

    it('should validate asset ID format', async () => {
      const invalidAssetData = {
        assetId: '', // Empty asset ID
        metadata: { symbol: 'TEST' },
        backupRouterIds: []
      };

      const result = await authority.registerAsset(invalidAssetData);

      expect(result.success).to.be.false;
      expect(result.error).to.include('assetId is required');
    });

    it('should handle concurrent registration attempts', async () => {
      const assetData = {
        assetId: 'CONCURRENT-TEST',
        metadata: { symbol: 'TEST' },
        backupRouterIds: []
      };

      // First call succeeds
      redisStub.exists.onFirstCall().resolves(0);
      redisStub.hset.onFirstCall().resolves(1);
      
      // Second call fails (asset now exists)
      redisStub.exists.onSecondCall().resolves(1);

      const [result1, result2] = await Promise.all([
        authority.registerAsset(assetData),
        authority.registerAsset(assetData)
      ]);

      // One should succeed, one should fail
      const successes = [result1, result2].filter(r => r.success);
      const failures = [result1, result2].filter(r => !r.success);
      
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

      const result = await authority.registerAsset(protocolCompliantAsset);

      expect(result.success).to.be.true;
      expect(result.registration.metadata.finp2pVersion).to.equal('1.0');
      expect(result.registration.metadata.complianceLevel).to.equal('FULL');
    });

    it('should validate minimum backup router requirements', async () => {
      const assetWithoutBackups = {
        assetId: 'NO-BACKUP-ASSET',
        metadata: { symbol: 'TEST' },
        backupRouterIds: [] // No backup routers
      };

      redisStub.exists.resolves(0);
      redisStub.hset.resolves(1);
      redisStub.expire.resolves(1);

      const result = await authority.registerAsset(assetWithoutBackups);

      // Should still succeed but with warning
      expect(result.success).to.be.true;
      expect(result.warnings).to.include('No backup routers specified');
    });

    it('should track authority validation metrics', async () => {
      // Mock multiple validation calls
      redisStub.hgetall.resolves({
        assetId: 'METRICS-TEST-ASSET',
        primaryRouterId: 'test-router-id',
        backupRouterIds: JSON.stringify(['backup-1']),
        registeredAt: new Date().toISOString(),
        metadata: JSON.stringify({ symbol: 'TEST' })
      });

      // Perform multiple validations
      await authority.validateAuthority('METRICS-TEST-ASSET', 'test-router-id');
      await authority.validateAuthority('METRICS-TEST-ASSET', 'backup-1');
      await authority.validateAuthority('METRICS-TEST-ASSET', 'unauthorized');

      const metrics = authority.getValidationMetrics();

      expect(metrics.totalValidations).to.equal(3);
      expect(metrics.successfulValidations).to.equal(2);
      expect(metrics.failedValidations).to.equal(1);
    });
  });
});

// Additional test utilities
class TestHelper {
  static createMockAsset(overrides = {}) {
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

  static createMockTransfer(overrides = {}) {
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