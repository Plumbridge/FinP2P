import { RedisClientType } from 'redis';
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
export declare class PrimaryRouterAuthority {
    private redis;
    private logger;
    private routerId;
    private readonly ASSET_REGISTRY_KEY;
    private readonly ROUTER_ASSETS_KEY;
    private validationMetrics;
    constructor(redis: RedisClientType, routerId: string);
    /**
     * Register a new asset with this router as the primary authority
     */
    registerAsset(assetId: string, metadata: AssetRegistration['metadata'], backupRouterIds?: string[]): Promise<AssetRegistration>;
    /**
     * Get asset registration details
     */
    getAssetRegistration(assetId: string): Promise<AssetRegistration | null>;
    /**
     * Validate if a router has authority to process transfers for an asset
     */
    validateAuthority(assetId: string, requestingRouterId: string): Promise<AuthorityValidationResult>;
    /**
     * Get all assets managed by this router
     */
    getRouterAssets(routerId?: string): Promise<string[]>;
    /**
     * Get all registered assets in the system
     */
    getAllAssets(): Promise<AssetRegistration[]>;
    /**
     * Transfer primary authority to another router
     */
    transferAuthority(assetId: string, newPrimaryRouterId: string): Promise<void>;
    /**
     * Check if primary router is available (for backup router failover)
     */
    isPrimaryRouterAvailable(primaryRouterId: string): Promise<boolean>;
    /**
     * Check primary router availability with detailed information
     */
    checkPrimaryRouterAvailability(assetId: string): Promise<{
        isAvailable: boolean;
        reason?: string;
        lastHeartbeat?: number;
    }>;
    /**
     * Enable backup router to take over if primary is unavailable
     */
    validateBackupAuthority(assetId: string, backupRouterId: string): Promise<AuthorityValidationResult>;
    /**
     * Get validation metrics
     */
    getValidationMetrics(): ValidationMetrics;
    /**
     * Check if this router is authorized to handle a transfer
     */
    checkAuthorization(asset: string, operation: string, routerId: string): Promise<boolean>;
}
//# sourceMappingURL=PrimaryRouterAuthority.d.ts.map