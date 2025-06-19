"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createError = exports.ErrorHandler = exports.UnsupportedOperationError = exports.InsufficientFundsError = exports.TimeoutError = exports.ConfigurationError = exports.SecurityError = exports.NetworkError = exports.CryptoError = exports.RouterError = exports.LedgerError = exports.AssetError = exports.TransferError = exports.ValidationError = exports.ConnectionError = exports.FinP2PError = void 0;
/**
 * Base error class for FinP2P operations
 */
class FinP2PError extends Error {
    constructor(message, code, context) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.timestamp = new Date();
        this.context = context;
        // Maintains proper stack trace for where our error was thrown
        Error.captureStackTrace(this, this.constructor);
    }
    get details() {
        return this.context;
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            timestamp: this.timestamp.toISOString(),
            context: this.context,
            stack: this.stack
        };
    }
}
exports.FinP2PError = FinP2PError;
/**
 * Connection related errors
 */
class ConnectionError extends FinP2PError {
    constructor(message, context) {
        super(message, 'CONNECTION_ERROR', context);
    }
}
exports.ConnectionError = ConnectionError;
/**
 * Validation related errors
 */
class ValidationError extends FinP2PError {
    constructor(message, context) {
        super(message, 'VALIDATION_ERROR', context);
    }
}
exports.ValidationError = ValidationError;
/**
 * Transfer related errors
 */
class TransferError extends FinP2PError {
    constructor(message, context) {
        super(message, 'TRANSFER_ERROR', context);
    }
}
exports.TransferError = TransferError;
/**
 * Asset related errors
 */
class AssetError extends FinP2PError {
    constructor(message, context) {
        super(message, 'ASSET_ERROR', context);
    }
}
exports.AssetError = AssetError;
/**
 * Ledger adapter related errors
 */
class LedgerError extends FinP2PError {
    constructor(message, context) {
        super(message, 'LEDGER_ERROR', context);
    }
}
exports.LedgerError = LedgerError;
/**
 * Router related errors
 */
class RouterError extends FinP2PError {
    constructor(message, context) {
        super(message, 'ROUTER_ERROR', context);
    }
}
exports.RouterError = RouterError;
/**
 * Crypto related errors
 */
class CryptoError extends FinP2PError {
    constructor(message, context) {
        super(message, 'CRYPTO_ERROR', context);
    }
}
exports.CryptoError = CryptoError;
/**
 * Network related errors
 */
class NetworkError extends FinP2PError {
    constructor(message, context) {
        super(message, 'NETWORK_ERROR', context);
    }
}
exports.NetworkError = NetworkError;
/**
 * Security related errors
 */
class SecurityError extends FinP2PError {
    constructor(message, context) {
        super(message, 'SECURITY_ERROR', context);
    }
}
exports.SecurityError = SecurityError;
/**
 * Configuration related errors
 */
class ConfigurationError extends FinP2PError {
    constructor(message, context) {
        super(message, 'CONFIGURATION_ERROR', context);
    }
}
exports.ConfigurationError = ConfigurationError;
/**
 * Timeout related errors
 */
class TimeoutError extends FinP2PError {
    constructor(message, context) {
        super(message, 'TIMEOUT_ERROR', context);
    }
}
exports.TimeoutError = TimeoutError;
/**
 * Insufficient funds related errors
 */
class InsufficientFundsError extends FinP2PError {
    constructor(message, context) {
        super(message, 'INSUFFICIENT_FUNDS_ERROR', context);
    }
}
exports.InsufficientFundsError = InsufficientFundsError;
/**
 * Unsupported operation related errors
 */
class UnsupportedOperationError extends FinP2PError {
    constructor(message, context) {
        super(message, 'UNSUPPORTED_OPERATION_ERROR', context);
    }
}
exports.UnsupportedOperationError = UnsupportedOperationError;
/**
 * Error handler utility class
 */
class ErrorHandler {
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Handle and log errors consistently
     */
    handle(error, context) {
        if (error instanceof FinP2PError) {
            this.logger.error('FinP2P Error:', {
                ...error.toJSON(),
                additionalContext: context
            });
        }
        else {
            this.logger.error('Unexpected Error:', {
                name: error.name,
                message: error.message,
                stack: error.stack,
                context
            });
        }
    }
    /**
     * Create a standardized error response
     */
    createErrorResponse(error) {
        if (error instanceof FinP2PError) {
            return {
                success: false,
                error: {
                    code: error.code,
                    message: error.message,
                    timestamp: error.timestamp.toISOString(),
                    context: error.context
                }
            };
        }
        return {
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        };
    }
    /**
     * Wrap async operations with error handling
     */
    async wrapAsync(operation, context) {
        try {
            return await operation();
        }
        catch (error) {
            this.handle(error, context);
            throw error;
        }
    }
}
exports.ErrorHandler = ErrorHandler;
/**
 * Utility function to create typed errors
 */
function createError(type, message, context) {
    switch (type) {
        case 'connection':
            return new ConnectionError(message, context);
        case 'validation':
            return new ValidationError(message, context);
        case 'transfer':
            return new TransferError(message, context);
        case 'asset':
            return new AssetError(message, context);
        case 'ledger':
            return new LedgerError(message, context);
        case 'router':
            return new RouterError(message, context);
        case 'crypto':
            return new CryptoError(message, context);
        default:
            throw new Error(`Unknown error type: ${type}`);
    }
}
exports.createError = createError;
//# sourceMappingURL=errors.js.map