import { Logger } from 'winston';

/**
 * Base error class for FinP2P operations
 */
export abstract class FinP2PError extends Error {
  public readonly code: string;
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();
    this.context = context;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  get details(): any {
    return this.context;
  }

  toJSON(): Record<string, unknown> {
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

/**
 * Connection related errors
 */
export class ConnectionError extends FinP2PError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONNECTION_ERROR', context);
  }
}

/**
 * Validation related errors
 */
export class ValidationError extends FinP2PError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
  }
}

/**
 * Transfer related errors
 */
export class TransferError extends FinP2PError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'TRANSFER_ERROR', context);
  }
}

/**
 * Asset related errors
 */
export class AssetError extends FinP2PError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'ASSET_ERROR', context);
  }
}

/**
 * Ledger adapter related errors
 */
export class LedgerError extends FinP2PError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'LEDGER_ERROR', context);
  }
}

/**
 * Router related errors
 */
export class RouterError extends FinP2PError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'ROUTER_ERROR', context);
  }
}

/**
 * Crypto related errors
 */
export class CryptoError extends FinP2PError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CRYPTO_ERROR', context);
  }
}

/**
 * Network related errors
 */
export class NetworkError extends FinP2PError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', context);
  }
}

/**
 * Security related errors
 */
export class SecurityError extends FinP2PError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'SECURITY_ERROR', context);
  }
}

/**
 * Configuration related errors
 */
export class ConfigurationError extends FinP2PError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', context);
  }
}

/**
 * Timeout related errors
 */
export class TimeoutError extends FinP2PError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'TIMEOUT_ERROR', context);
  }
}

/**
 * Insufficient funds related errors
 */
export class InsufficientFundsError extends FinP2PError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'INSUFFICIENT_FUNDS_ERROR', context);
  }
}

/**
 * Unsupported operation related errors
 */
export class UnsupportedOperationError extends FinP2PError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'UNSUPPORTED_OPERATION_ERROR', context);
  }
}

/**
 * Error handler utility class
 */
export class ErrorHandler {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Handle and log errors consistently
   */
  handle(error: Error, context?: Record<string, unknown>): void {
    if (error instanceof FinP2PError) {
      this.logger.error('FinP2P Error:', {
        ...error.toJSON(),
        additionalContext: context
      });
    } else {
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
  createErrorResponse(error: Error): {
    success: false;
    error: {
      code: string;
      message: string;
      timestamp: string;
      context?: Record<string, unknown>;
    };
  } {
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
  async wrapAsync<T>(
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.handle(error as Error, context);
      throw error;
    }
  }
}

/**
 * Utility function to create typed errors
 */
export function createError(
  type: 'connection' | 'validation' | 'transfer' | 'asset' | 'ledger' | 'router' | 'crypto',
  message: string,
  context?: Record<string, unknown>
): FinP2PError {
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
