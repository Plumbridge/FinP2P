"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
// Using Jest's built-in expect and mocking
const PrimaryRouterAuthority_1 = require("../src/router/PrimaryRouterAuthority");
const ConfirmationRecordManager_1 = require("../src/router/ConfirmationRecordManager");
const types_1 = require("../src/types");
describe('Primary Router Authority', () => {
    let authority;
    let confirmationManager;
    let redisClient;
    let redisStub;
    let logger;
    beforeEach(async () => {
        // Clean up any existing Redis connections
        if (redisClient && redisClient.isOpen) {
            try {
                await redisClient.quit();
            }
            catch (error) {
                // Ignore cleanup errors
            }
        }
        // Mock Redis client
        redisStub = {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            hget: jest.fn(),
            hGet: jest.fn(),
            hset: jest.fn(),
            hSet: jest.fn(),
            hdel: jest.fn(),
            hDel: jest.fn(),
            hgetall: jest.fn(),
            hGetAll: jest.fn(),
            exists: jest.fn(),
            expire: jest.fn(),
            keys: jest.fn(),
            srem: jest.fn(),
            sRem: jest.fn(),
            sadd: jest.fn(),
            sAdd: jest.fn(),
            isOpen: false,
            quit: jest.fn().mockResolvedValue('OK')
        };
        // Mock logger
        logger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };
        redisClient = redisStub;
        authority = new PrimaryRouterAuthority_1.PrimaryRouterAuthority(redisClient, 'test-router-id');
        confirmationManager = new ConfirmationRecordManager_1.ConfirmationRecordManager(redisClient, logger, 'test-router-id');
    });
    afterEach(async () => {
        // Clear all mocks
        jest.clearAllMocks();
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
            redisStub.exists.mockResolvedValue(0); // Asset doesn't exist
            redisStub.hSet.mockResolvedValue(1);
            redisStub.expire.mockResolvedValue(1);
            const result = await authority.registerAsset(assetData.assetId, assetData.metadata, assetData.backupRouterIds);
            expect(result.assetId).toBe(assetData.assetId);
            expect(result.primaryRouterId).toBe('test-router-id');
            expect(result.backupRouterIds).toEqual(assetData.backupRouterIds);
            expect(redisStub.hset).toHaveBeenCalledTimes(1);
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
            redisStub.hGet.mockResolvedValue(JSON.stringify({
                assetId: 'EXISTING-ASSET',
                primaryRouterId: 'existing-router',
                backupRouterIds: JSON.stringify([]),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                metadata: JSON.stringify({ symbol: 'TEST' })
            }));
            redisStub.hGet.mockResolvedValue(JSON.stringify({
                assetId: assetData.assetId,
                primaryRouterId: 'existing-router',
                backupRouterIds: JSON.stringify(assetData.backupRouterIds),
                registeredAt: new Date().toISOString(),
                metadata: assetData.metadata
            }));
            redisStub.hgetall.mockResolvedValue({
                assetId: 'EXISTING-ASSET',
                primaryRouterId: 'existing-router',
                backupRouterIds: JSON.stringify([]),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                metadata: JSON.stringify({ symbol: 'TEST' })
            });
            try {
                await authority.registerAsset(assetData.assetId, assetData.metadata, assetData.backupRouterIds);
                fail('Should have thrown an error');
            }
            catch (error) {
                expect(error.message).toContain('already registered');
            }
            expect(redisStub.hSet).not.toHaveBeenCalled();
        });
        it('should validate required asset fields', async () => {
            const invalidMetadata = {
                // Missing required fields
                symbol: 'TEST'
            };
            try {
                await authority.registerAsset('', // Empty assetId
                invalidMetadata, []);
                fail('Should have thrown an error');
            }
            catch (error) {
                expect(error).toBeDefined();
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
            redisStub.hgetall.mockResolvedValue({
                assetId: mockRegistration.assetId,
                primaryRouterId: mockRegistration.primaryRouterId,
                backupRouterIds: JSON.stringify(mockRegistration.backupRouterIds),
                registeredAt: mockRegistration.registeredAt,
                metadata: JSON.stringify(mockRegistration.metadata)
            });
        });
        it('should validate primary router authority', async () => {
            const result = await authority.validateAuthority('TEST-ASSET', 'test-router-id');
            expect(result.isAuthorized).toBe(true);
            expect(result.primaryRouter).toBe('test-router-id');
        });
        it('should validate backup router authority', async () => {
            const result = await authority.validateAuthority('TEST-ASSET', 'backup-1');
            expect(result.isAuthorized).toBe(true);
            expect(result.backupRouters).toContain('backup-1');
        });
        it('should reject unauthorized router', async () => {
            const result = await authority.validateAuthority('TEST-ASSET', 'unauthorized-router');
            expect(result.isAuthorized).toBe(false);
            expect(result.reason).toContain('not authorized');
        });
        it('should handle non-existent asset', async () => {
            redisStub.hgetall.mockResolvedValue(null);
            const result = await authority.validateAuthority('NON-EXISTENT', 'test-router-id');
            expect(result.isAuthorized).toBe(false);
            expect(result.reason).toContain('not found');
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
            redisStub.hgetall.mockResolvedValue({
                assetId: mockRegistration.assetId,
                primaryRouterId: mockRegistration.primaryRouterId,
                backupRouterIds: JSON.stringify(mockRegistration.backupRouterIds),
                registeredAt: mockRegistration.registeredAt,
                metadata: mockRegistration.metadata
            });
        });
        it('should transfer primary authority to backup router', async () => {
            redisStub.hSet.mockResolvedValue(1);
            redisStub.sRem.mockResolvedValue(1);
            redisStub.sAdd.mockResolvedValue(1);
            // Should not throw an error
            await authority.transferAuthority('TRANSFER-TEST-ASSET', 'backup-1');
            // Verify Redis update was called
            expect(redisStub.hSet).toHaveBeenCalled();
            expect(redisStub.sRem).toHaveBeenCalled();
            expect(redisStub.sAdd).toHaveBeenCalled();
        });
        it('should reject transfer to unauthorized router', async () => {
            try {
                await authority.transferAuthority('TRANSFER-TEST-ASSET', 'unauthorized-router');
                fail('Should have thrown an error');
            }
            catch (error) {
                expect(error.message).toContain('Only primary router');
            }
        });
        it('should reject transfer from non-primary router', async () => {
            // Change authority instance to simulate different router
            const unauthorizedAuthority = new PrimaryRouterAuthority_1.PrimaryRouterAuthority(redisClient, 'backup-1');
            try {
                await unauthorizedAuthority.transferAuthority('TRANSFER-TEST-ASSET', 'backup-1');
                fail('Should have thrown an error');
            }
            catch (error) {
                expect(error.message).toContain('Only primary router');
            }
        });
    });
    describe('Primary Router Availability Check', () => {
        it('should detect available primary router', async () => {
            redisStub.get.mockResolvedValue(Date.now().toString());
            const result = await authority.checkPrimaryRouterAvailability('TEST-ASSET');
            expect(result.isAvailable).toBe(true);
            expect(typeof result.lastHeartbeat).toBe('number');
        });
        it('should detect unavailable primary router', async () => {
            // Simulate old heartbeat (more than 30 seconds ago)
            const oldHeartbeat = Date.now() - 60000;
            redisStub.get.mockResolvedValue(oldHeartbeat.toString());
            const result = await authority.checkPrimaryRouterAvailability('TEST-ASSET');
            expect(result.isAvailable).toBe(false);
            expect(result.reason).toContain('heartbeat expired');
        });
        it('should handle missing heartbeat', async () => {
            redisStub.get.mockResolvedValue(null);
            const result = await authority.checkPrimaryRouterAvailability('TEST-ASSET');
            expect(result.isAvailable).toBe(false);
            expect(result.reason).toContain('No heartbeat found');
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
            redisStub.hgetall.mockResolvedValue({
                assetId: mockRegistration.assetId,
                primaryRouterId: mockRegistration.primaryRouterId,
                backupRouterIds: JSON.stringify(mockRegistration.backupRouterIds),
                registeredAt: mockRegistration.registeredAt,
                metadata: mockRegistration.metadata
            });
        });
        it('should validate backup authority when primary is unavailable', async () => {
            // Simulate unavailable primary router
            redisStub.get.mockResolvedValue(null);
            const backupAuthority = new PrimaryRouterAuthority_1.PrimaryRouterAuthority(redisClient, 'backup-1');
            const result = await backupAuthority.validateBackupAuthority('BACKUP-TEST-ASSET', 'backup-1');
            expect(result.isAuthorized).toBe(true);
            expect(result.reason).toContain('Primary router unavailable');
        });
        it('should reject backup authority when primary is available', async () => {
            // Simulate available primary router
            redisStub.get.mockResolvedValue(Date.now().toString());
            const backupAuthority = new PrimaryRouterAuthority_1.PrimaryRouterAuthority(redisClient, 'backup-1');
            const result = await backupAuthority.validateBackupAuthority('BACKUP-TEST-ASSET', 'backup-1');
            expect(result.isAuthorized).toBe(false);
            expect(result.reason).toContain('Primary router is available');
        });
        it('should reject unauthorized backup router', async () => {
            redisStub.get.mockResolvedValue(null); // Primary unavailable
            const unauthorizedAuthority = new PrimaryRouterAuthority_1.PrimaryRouterAuthority(redisClient, 'unauthorized-router');
            const result = await unauthorizedAuthority.validateBackupAuthority('BACKUP-TEST-ASSET', 'unauthorized-backup-router');
            expect(result.isAuthorized).toBe(false);
            expect(result.reason).toContain('not a backup router');
        });
    });
    describe('Integration with Confirmation Records', () => {
        it('should create confirmation record for authorized router', async () => {
            const transferData = {
                id: 'test-transfer-123',
                fromAccount: {
                    id: 'from-account',
                    type: 'account',
                    domain: 'ethereum',
                    metadata: { address: '0x123' }
                },
                toAccount: {
                    id: 'to-account',
                    type: 'account',
                    domain: 'sui',
                    metadata: { address: '0x456' }
                },
                asset: {
                    id: 'TEST-ASSET',
                    type: 'asset',
                    domain: 'test',
                    metadata: { symbol: 'TEST' }
                },
                amount: BigInt('1000000'),
                status: types_1.TransferStatus.PENDING,
                route: [],
                metadata: {
                    reference: 'test-ref',
                    description: 'Test transfer'
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };
            // Mock successful authority validation
            redisStub.hgetall.mockResolvedValue({
                assetId: 'TEST-ASSET',
                primaryRouterId: 'test-router-id',
                backupRouterIds: JSON.stringify(['backup-1']),
                registeredAt: new Date().toISOString(),
                metadata: JSON.stringify({ symbol: 'TEST' })
            });
            redisStub.hset.mockResolvedValue(1);
            redisStub.expire.mockResolvedValue(1);
            // Validate authority first
            const authorityResult = await authority.validateAuthority(transferData.asset.id, 'test-router-id');
            expect(authorityResult.isAuthorized).toBe(true);
            // Create confirmation record
            const confirmationResult = await confirmationManager.createConfirmationRecord(transferData, 'confirmed');
            expect(confirmationResult).toBeDefined();
            expect(confirmationResult.transferId).toBe(transferData.id);
            expect(confirmationResult.status).toBe('confirmed');
        });
        it('should reject confirmation record for unauthorized router', async () => {
            const transferData = {
                id: 'test-transfer-456',
                fromAccount: {
                    id: 'from-account-2',
                    type: 'account',
                    domain: 'ethereum',
                    metadata: { address: '0x123' }
                },
                toAccount: {
                    id: 'to-account-2',
                    type: 'account',
                    domain: 'sui',
                    metadata: { address: '0x456' }
                },
                asset: {
                    id: 'TEST-ASSET',
                    type: 'asset',
                    domain: 'test',
                    metadata: { symbol: 'TEST' }
                },
                amount: BigInt('1000000'),
                status: types_1.TransferStatus.PENDING,
                route: [],
                metadata: {
                    reference: 'test-ref-2',
                    description: 'Test transfer 2'
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };
            // Mock asset registration
            redisStub.hgetall.mockResolvedValue({
                assetId: 'TEST-ASSET',
                primaryRouterId: 'test-router-id',
                backupRouterIds: JSON.stringify(['backup-1']),
                registeredAt: new Date().toISOString(),
                metadata: JSON.stringify({ symbol: 'TEST' })
            });
            // Validate authority (should fail)
            const authorityResult = await authority.validateAuthority(transferData.asset.id, 'unauthorized-router');
            expect(authorityResult.isAuthorized).toBe(false);
            expect(authorityResult.reason).toContain('not authorized');
        });
    });
    describe('Error Handling and Edge Cases', () => {
        it('should handle Redis connection errors gracefully', async () => {
            redisStub.hgetall.mockRejectedValue(new Error('Redis connection failed'));
            const result = await authority.validateAuthority('TEST-ASSET', 'test-router-id');
            expect(result.isAuthorized).toBe(false);
            expect(result.reason).toContain('Redis connection failed');
        });
        it('should handle malformed asset data in Redis', async () => {
            redisStub.hgetall.mockResolvedValue({
                assetId: 'MALFORMED-ASSET',
                primaryRouterId: 'test-router-id',
                backupRouterIds: 'invalid-json', // Invalid JSON
                registeredAt: new Date().toISOString(),
                metadata: 'also-invalid-json'
            });
            const result = await authority.validateAuthority('MALFORMED-ASSET', 'test-router-id');
            expect(result.isAuthorized).toBe(false);
            expect(result.reason).toContain('Failed to parse');
        });
        it('should validate asset ID format', async () => {
            const invalidMetadata = {
                assetType: 'cryptocurrency',
                blockchain: 'ethereum',
                symbol: 'TEST',
                decimals: 18
            };
            try {
                await authority.registerAsset('', // Empty asset ID
                invalidMetadata, []);
                fail('Should have thrown an error');
            }
            catch (error) {
                expect(error).toBeDefined();
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
            redisStub.hgetall.mockResolvedValueOnce(null);
            redisStub.hset.mockResolvedValue(1);
            redisStub.expire.mockResolvedValue(1);
            // Second call fails (asset now exists)
            redisStub.hgetall.mockResolvedValueOnce({
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
            expect(successes.length).toBe(1);
            expect(failures.length).toBe(1);
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
            redisStub.exists.mockResolvedValue(0);
            redisStub.hset.mockResolvedValue(1);
            redisStub.expire.mockResolvedValue(1);
            const result = await authority.registerAsset(protocolCompliantAsset.assetId, protocolCompliantAsset.metadata, protocolCompliantAsset.backupRouterIds);
            expect(result.assetId).toBe(protocolCompliantAsset.assetId);
            expect(result.metadata.symbol).toBe('USDC');
            expect(result.metadata.decimals).toBe(6);
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
            redisStub.exists.mockResolvedValue(0);
            redisStub.hset.mockResolvedValue(1);
            redisStub.expire.mockResolvedValue(1);
            const result = await authority.registerAsset(assetWithoutBackups.assetId, assetWithoutBackups.metadata, assetWithoutBackups.backupRouterIds);
            // Should still succeed
            expect(result.assetId).toBe(assetWithoutBackups.assetId);
            expect(result.backupRouterIds).toEqual([]);
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
//# sourceMappingURL=primary-router-authority.test.js.map