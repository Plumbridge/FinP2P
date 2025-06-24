import { PrimaryRouterAuthority } from '../src/router/PrimaryRouterAuthority';
import { createTestRedisClient, cleanupRedis, closeRedisConnection } from './helpers/redis';
import { RedisClientType } from 'redis';

describe('Primary Router Authority', () => {
  let authority: PrimaryRouterAuthority;
  let redisClient: RedisClientType;

  beforeAll(async () => {
    redisClient = await createTestRedisClient();
  });

  beforeEach(async () => {
    await cleanupRedis(redisClient);
    authority = new PrimaryRouterAuthority(redisClient, 'test-router-id');
  });

  afterAll(async () => {
    await closeRedisConnection(redisClient);
  });

  describe('Asset Registration', () => {
    it('should register a new asset with primary authority', async () => {
      const assetData = {
        assetId: 'TEST-ASSET',
        metadata: {
          assetType: 'cryptocurrency',
          blockchain: 'ethereum',
          symbol: 'TEST',
          decimals: 18
        },
        backupRouterIds: ['backup-1', 'backup-2']
      };

      const result = await authority.registerAsset(
        assetData.assetId,
        assetData.metadata,
        assetData.backupRouterIds
      );

      expect(result.assetId).toBe(assetData.assetId);
      expect(result.primaryRouterId).toBe('test-router-id');
      expect(result.backupRouterIds).toEqual(assetData.backupRouterIds);
    });

    it('should reject registration of existing asset', async () => {
      const assetData = {
        assetId: 'DUPLICATE-ASSET',
        metadata: {
          assetType: 'cryptocurrency',
          blockchain: 'ethereum',
          symbol: 'DUP',
          decimals: 18
        },
        backupRouterIds: []
      };

      // First registration should succeed
      await authority.registerAsset(assetData.assetId, assetData.metadata, assetData.backupRouterIds);

      // Second registration should fail
      await expect(
        authority.registerAsset(assetData.assetId, assetData.metadata, assetData.backupRouterIds)
      ).rejects.toThrow('already registered');
    });
  });

  describe('Authority Validation', () => {
    beforeEach(async () => {
      // Register test asset first
      await authority.registerAsset('TEST-ASSET', {
        assetType: 'cryptocurrency',
        blockchain: 'ethereum',
        symbol: 'TEST',
        decimals: 18
      }, ['backup-1']);
    });

    it('should validate primary router authority', async () => {
      const result = await authority.validateAuthority('TEST-ASSET', 'test-router-id');

      expect(result.isAuthorized).toBe(true);
      expect(result.primaryRouter).toBe('test-router-id');
    });

    it('should validate backup router authority', async () => {
      // Set up primary router heartbeat to make it available
      await redisClient.set(`finp2p:router_heartbeat:test-router-id`, Date.now().toString());
      
      const result = await authority.validateAuthority('TEST-ASSET', 'backup-1');

      expect(result.isAuthorized).toBe(false); // Should be false since primary is available
      expect(result.backupRouters).toContain('backup-1');
    });

    it('should reject unauthorized router', async () => {
      const result = await authority.validateAuthority('TEST-ASSET', 'unauthorized-router');

      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toContain('no authority');
    });

    it('should handle non-existent asset', async () => {
      const result = await authority.validateAuthority('NON-EXISTENT', 'test-router-id');

      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toContain('not registered');
    });
  });
});