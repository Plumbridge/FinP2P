import { Logger } from 'winston';
/**
 * Base error class for FinP2P operations
 */
export declare abstract class FinP2PError extends Error {
    readonly code: string;
    readonly timestamp: Date;
    readonly context?: Record<string, unknown>;
    constructor(message: string, code: string, context?: Record<string, unknown>);
    get details(): any;
    toJSON(): Record<string, unknown>;
}
/**
 * Connection related errors
 */
export declare class ConnectionError extends FinP2PError {
    constructor(message: string, context?: Record<string, unknown>);
}
/**
 * Validation related errors
 */
export declare class ValidationError extends FinP2PError {
    constructor(message: string, context?: Record<string, unknown>);
}
/**
 * Transfer related errors
 */
export declare class TransferError extends FinP2PError {
    constructor(message: string, context?: Record<string, unknown>);
}
/**
 * Asset related errors
 */
export declare class AssetError extends FinP2PError {
    constructor(message: string, context?: Record<string, unknown>);
}
/**
 * Ledger adapter related errors
 */
export declare class LedgerError extends FinP2PError {
    constructor(message: string, context?: Record<string, unknown>);
}
/**
 * Router related errors
 */
export declare class RouterError extends FinP2PError {
    constructor(message: string, context?: Record<string, unknown>);
}
/**
 * Crypto related errors
 */
export declare class CryptoError extends FinP2PError {
    constructor(message: string, context?: Record<string, unknown>);
}
/**
 * Network related errors
 */
export declare class NetworkError extends FinP2PError {
    constructor(message: string, context?: Record<string, unknown>);
}
/**
 * Security related errors
 */
export declare class SecurityError extends FinP2PError {
    constructor(message: string, context?: Record<string, unknown>);
}
/**
 * Configuration related errors
 */
export declare class ConfigurationError extends FinP2PError {
    constructor(message: string, context?: Record<string, unknown>);
}
/**
 * Timeout related errors
 */
export declare class TimeoutError extends FinP2PError {
    constructor(message: string, context?: Record<string, unknown>);
}
/**
 * Insufficient funds related errors
 */
export declare class InsufficientFundsError extends FinP2PError {
    constructor(message: string, context?: Record<string, unknown>);
}
/**
 * Unsupported operation related errors
 */
export declare class UnsupportedOperationError extends FinP2PError {
    constructor(message: string, context?: Record<string, unknown>);
}
/**
 * Error handler utility class
 */
export declare class ErrorHandler {
    private logger;
    constructor(logger: Logger);
    /**
     * Handle and log errors consistently
     */
    handle(error: Error, context?: Record<string, unknown>): void;
    /**
     * Create a standardized error response
     */
    createErrorResponse(error: Error): {
        success: false;
        error: {
            code: string;
            message: string;
            timestamp: string;
            context?: Record<string, unknown>;
        };
    };
    /**
     * Wrap async operations with error handling
     */
    wrapAsync<T>(operation: () => Promise<T>, context?: Record<string, unknown>): Promise<T>;
}
/**
 * Utility function to create typed errors
 */
export declare function createError(type: 'connection' | 'validation' | 'transfer' | 'asset' | 'ledger' | 'router' | 'crypto', message: string, context?: Record<string, unknown>): FinP2PError;
//# sourceMappingURL=errors.d.ts.map