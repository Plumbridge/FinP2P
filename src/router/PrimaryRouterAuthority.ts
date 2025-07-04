import { createLogger } from '../utils/logger';
import { RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';

export interface AssetRegistration {
  assetId: string;
  primaryRouterId: string;
  backupRouterIds: string[];
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    assetType: string;
    blockchain: string;
    contractAddress?: string;
    symbol: string;
    decimals: number;
  };
}

export interface AuthorityValidationResult {
  isAuthorized: boolean;
  reason?: string;
  primaryRouter?: string;
  backupRouters?: string[];
}

export interface ValidationMetrics {
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
}

export class PrimaryRouterAuthority {
  private redis: RedisClientType;
  private logger = createLogger({ level: 'info' });
  private routerId: string;
  private readonly ASSET_REGISTRY_KEY = 'finp2p:asset_registry';
  private readonly ROUTER_ASSETS_KEY = 'finp2p:router_assets';
  private validationMetrics: ValidationMetrics = {
    totalValidations: 0,
    successfulValidations: 0,
    failedValidations: 0
  };

  constructor(redis: RedisClientType, routerId: string) {
    this.redis = redis;
    this.routerId = routerId;
    this.logger.info(`Initialized Primary Router Authority for router: ${routerId}`);
  }

  /**
   * Register a new asset with this router as the primary authority
   */
  async registerAsset(
    assetId: string,
    metadata: AssetRegistration['metadata'],
    backupRouterIds: string[] = []
  ): Promise<AssetRegistration> {
    this.logger.info(`Registering asset ${assetId} with primary router ${this.routerId}`);

    // Check if asset already exists
    const existingAsset = await this.getAssetRegistration(assetId);
    if (existingAsset) {
      throw new Error(`Asset ${assetId} is already registered with primary router ${existingAsset.primaryRouterId}`);
    }

    const registration: AssetRegistration = {
      assetId,
      primaryRouterId: this.routerId,
      backupRouterIds,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata
    };

    // Store in Redis
    await this.redis.hSet(
      this.ASSET_REGISTRY_KEY,
      assetId,
      JSON.stringify(registration)
    );

    // Add to router's asset list
    await this.redis.sAdd(
      `${this.ROUTER_ASSETS_KEY}:${this.routerId}`,
      assetId
    );

    this.logger.info(`Successfully registered asset ${assetId}`);
    return registration;
  }

  /**
   * Get asset registration details
   */
  async getAssetRegistration(assetId: string): Promise<AssetRegistration | null> {
    const registrationData = await this.redis.hGet(this.ASSET_REGISTRY_KEY, assetId);
    if (!registrationData) {
      return null;
    }

    try {
      return JSON.parse(registrationData);
    } catch (error) {
      this.logger.error(`Failed to parse asset registration data for ${assetId}:`, error);
      throw new Error(`Failed to parse asset registration data for ${assetId}`);
    }
  }

  /**
   * Validate if a router has authority to process transfers for an asset
   */
  async validateAuthority(
    assetId: string,
    requestingRouterId: string
  ): Promise<AuthorityValidationResult> {
    this.validationMetrics.totalValidations++;
    
    try {
      const registration = await this.getAssetRegistration(assetId);
      
      if (!registration) {
        this.validationMetrics.failedValidations++;
        return {
          isAuthorized: false,
          reason: `Asset ${assetId} is not registered in the system`
        };
      }

    // Check if requesting router is the primary authority
    if (registration.primaryRouterId === requestingRouterId) {
      this.validationMetrics.successfulValidations++;
      return {
        isAuthorized: true,
        primaryRouter: registration.primaryRouterId,
        backupRouters: registration.backupRouterIds
      };
    }

    // Check if requesting router is a backup authority
    if (registration.backupRouterIds.includes(requestingRouterId)) {
      // Check if primary router is available
      const primaryAvailability = await this.checkPrimaryRouterAvailability(assetId);
      
      if (primaryAvailability.isAvailable) {
        this.validationMetrics.failedValidations++;
        return {
          isAuthorized: false,
          reason: `Router ${requestingRouterId} is backup for asset ${assetId}, but primary router ${registration.primaryRouterId} is available`,
          primaryRouter: registration.primaryRouterId,
          backupRouters: registration.backupRouterIds
        };
      } else {
        // Primary is unavailable, authorize backup router
        this.validationMetrics.successfulValidations++;
        return {
          isAuthorized: true,
          reason: `Primary router unavailable, backup router ${requestingRouterId} authorized for asset ${assetId}`,
          primaryRouter: registration.primaryRouterId,
          backupRouters: registration.backupRouterIds
        };
      }
    }

    this.validationMetrics.failedValidations++;
    return {
      isAuthorized: false,
      reason: `Router ${requestingRouterId} has no authority over asset ${assetId}`,
      primaryRouter: registration.primaryRouterId,
      backupRouters: registration.backupRouterIds
    };
    } catch (error) {
      this.validationMetrics.failedValidations++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        isAuthorized: false,
        reason: `Failed to validate authority: ${errorMessage}`
      };
    }
  }

  /**
   * Get all assets managed by this router
   */
  async getRouterAssets(routerId?: string): Promise<string[]> {
    const targetRouterId = routerId || this.routerId;
    const assets = await this.redis.sMembers(`${this.ROUTER_ASSETS_KEY}:${targetRouterId}`);
    return assets;
  }

  /**
   * Get all registered assets in the system
   */
  async getAllAssets(): Promise<AssetRegistration[]> {
    const assetData = await this.redis.hGetAll(this.ASSET_REGISTRY_KEY);
    return Object.values(assetData).map(data => JSON.parse(data as string));
  }

  /**
   * Transfer primary authority to another router
   */
  async transferAuthority(
    assetId: string,
    newPrimaryRouterId: string
  ): Promise<void> {
    const registration = await this.getAssetRegistration(assetId);
    if (!registration) {
      throw new Error(`Asset ${assetId} not found`);
    }

    if (registration.primaryRouterId !== this.routerId) {
      throw new Error(`Only primary router ${registration.primaryRouterId} can transfer authority for asset ${assetId}`);
    }

    // Validate that the new primary router is authorized (must be in backup routers list)
    if (!registration.backupRouterIds.includes(newPrimaryRouterId)) {
      throw new Error(`Router ${newPrimaryRouterId} is not authorized as a backup router for asset ${assetId}`);
    }

    // Update registration
    const updatedRegistration: AssetRegistration = {
      ...registration,
      primaryRouterId: newPrimaryRouterId,
      backupRouterIds: registration.backupRouterIds.filter(id => id !== newPrimaryRouterId),
      updatedAt: new Date()
    };

    // Add old primary as backup if not already there
    if (!updatedRegistration.backupRouterIds.includes(this.routerId)) {
      updatedRegistration.backupRouterIds.push(this.routerId);
    }

    // Update Redis
    await this.redis.hSet(
      this.ASSET_REGISTRY_KEY,
      assetId,
      JSON.stringify(updatedRegistration)
    );

    // Update router asset lists
    await this.redis.sRem(`${this.ROUTER_ASSETS_KEY}:${this.routerId}`, assetId);
    await this.redis.sAdd(`${this.ROUTER_ASSETS_KEY}:${newPrimaryRouterId}`, assetId);

    this.logger.info(`Transferred authority for asset ${assetId} from ${this.routerId} to ${newPrimaryRouterId}`);
  }

  /**
   * Check if primary router is available (for backup router failover)
   */
  async isPrimaryRouterAvailable(primaryRouterId: string): Promise<boolean> {
    // TODO: Implement router health check
    // This could check router heartbeat, last seen timestamp, etc.
    const lastHeartbeat = await this.redis.get(`finp2p:router_heartbeat:${primaryRouterId}`);
    if (!lastHeartbeat) {
      return false;
    }

    const lastSeenTimestamp = parseInt(lastHeartbeat, 10);
    const now = Date.now();
    const timeDiff = now - lastSeenTimestamp;
    
    // Consider router unavailable if no heartbeat for 30 seconds
    return timeDiff < 30000;
  }

  /**
   * Check primary router availability with detailed information
   */
  async checkPrimaryRouterAvailability(assetId: string): Promise<{
    isAvailable: boolean;
    reason?: string;
    lastHeartbeat?: number;
  }> {
    const registration = await this.getAssetRegistration(assetId);
    if (!registration) {
      return {
        isAvailable: false,
        reason: `Asset ${assetId} is not registered`
      };
    }

    const lastHeartbeat = await this.redis.get(`finp2p:router_heartbeat:${registration.primaryRouterId}`);
    if (!lastHeartbeat) {
      return {
        isAvailable: false,
        reason: 'No heartbeat found for primary router'
      };
    }

    const lastSeenTimestamp = parseInt(lastHeartbeat, 10);
    const now = Date.now();
    const timeDiff = now - lastSeenTimestamp;
    
    if (timeDiff >= 30000) {
      return {
        isAvailable: false,
        reason: 'Primary router heartbeat expired',
        lastHeartbeat: parseInt(lastHeartbeat)
      };
    }

    return {
      isAvailable: true,
      lastHeartbeat: parseInt(lastHeartbeat)
    };
  }

  /**
   * Enable backup router to take over if primary is unavailable
   */
  async validateBackupAuthority(
    assetId: string,
    backupRouterId: string
  ): Promise<AuthorityValidationResult> {
    const registration = await this.getAssetRegistration(assetId);
    
    if (!registration) {
      return {
        isAuthorized: false,
        reason: `Asset ${assetId} is not registered`
      };
    }

    if (!registration.backupRouterIds.includes(backupRouterId)) {
      return {
        isAuthorized: false,
        reason: `Router ${backupRouterId} is not a backup for asset ${assetId}`
      };
    }

    const isPrimaryAvailable = await this.isPrimaryRouterAvailable(registration.primaryRouterId);
    
    if (isPrimaryAvailable) {
      return {
        isAuthorized: false,
        reason: `Primary router ${registration.primaryRouterId} is still available for asset ${assetId}`
      };
    }

    return {
      isAuthorized: true,
      reason: `Primary router unavailable, backup router ${this.routerId} authorized for asset ${assetId}`,
      primaryRouter: registration.primaryRouterId,
      backupRouters: registration.backupRouterIds
    };
  }

  /**
   * Get validation metrics
   */
  getValidationMetrics(): ValidationMetrics {
    return { ...this.validationMetrics };
  }

  /**
   * Check if this router is authorized to handle a transfer
   */
  async checkAuthorization(asset: string, operation: string, routerId: string): Promise<boolean> {
    // Simple authorization check - in production this would be more sophisticated
    return true; // Default to authorized for testing
  }
}