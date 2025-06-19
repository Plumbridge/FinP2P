import { 
  ValidationError, 
  NetworkError, 
  TransferError, 
  SecurityError,
  ConfigurationError,
  TimeoutError,
  InsufficientFundsError,
  UnsupportedOperationError
} from '../../src/utils/errors';

describe('Error Classes', () => {
  describe('ValidationError', () => {
    it('should create validation error with message', () => {
      const error = new ValidationError('Invalid input');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Invalid input');
      expect(error.name).toBe('ValidationError');
    });

    it('should create validation error with details', () => {
      const details = { field: 'amount', value: -100 };
      const error = new ValidationError('Invalid amount', details);
      
      expect(error.message).toBe('Invalid amount');
      expect(error.details).toEqual(details);
    });

    it('should have proper stack trace', () => {
      const error = new ValidationError('Test error');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ValidationError');
    });
  });

  describe('NetworkError', () => {
    it('should create network error with message', () => {
      const error = new NetworkError('Connection failed');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.message).toBe('Connection failed');
      expect(error.name).toBe('NetworkError');
    });

    it('should create network error with status code', () => {
      const error = new NetworkError('HTTP Error', { statusCode: 500 });
      
      expect(error.message).toBe('HTTP Error');
      expect(error.details).toEqual({ statusCode: 500 });
    });

    it('should handle timeout scenarios', () => {
      const error = new NetworkError('Request timeout', { 
        timeout: true, 
        duration: 30000 
      });
      
      expect(error.details?.timeout).toBe(true);
      expect(error.details?.duration).toBe(30000);
    });
  });

  describe('TransferError', () => {
    it('should create transfer error with message', () => {
      const error = new TransferError('Transfer failed');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(TransferError);
      expect(error.message).toBe('Transfer failed');
      expect(error.name).toBe('TransferError');
    });

    it('should create transfer error with transaction details', () => {
      const details = {
        transactionId: 'tx-123',
        fromAccount: 'account-1',
        toAccount: 'account-2',
        amount: 1000
      };
      const error = new TransferError('Transfer validation failed', details);
      
      expect(error.details).toEqual(details);
    });

    it('should handle blockchain-specific errors', () => {
      const error = new TransferError('Gas estimation failed', {
        blockchain: 'ethereum',
        gasLimit: 21000,
        gasPrice: '20000000000'
      });
      
      expect(error.details?.blockchain).toBe('ethereum');
    });
  });

  describe('SecurityError', () => {
    it('should create security error with message', () => {
      const error = new SecurityError('Unauthorized access');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SecurityError);
      expect(error.message).toBe('Unauthorized access');
      expect(error.name).toBe('SecurityError');
    });

    it('should create security error with security context', () => {
      const details = {
        userId: 'user-123',
        action: 'transfer',
        resource: 'account-456',
        reason: 'insufficient_permissions'
      };
      const error = new SecurityError('Access denied', details);
      
      expect(error.details).toEqual(details);
    });

    it('should handle authentication failures', () => {
      const error = new SecurityError('Invalid signature', {
        signatureValid: false,
        publicKey: 'pub-key-123'
      });
      
      expect(error.details?.signatureValid).toBe(false);
    });
  });

  describe('ConfigurationError', () => {
    it('should create configuration error with message', () => {
      const error = new ConfigurationError('Missing API key');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ConfigurationError);
      expect(error.message).toBe('Missing API key');
      expect(error.name).toBe('ConfigurationError');
    });

    it('should create configuration error with config details', () => {
      const details = {
        configKey: 'HEDERA_API_KEY',
        required: true,
        provided: false
      };
      const error = new ConfigurationError('Required configuration missing', details);
      
      expect(error.details).toEqual(details);
    });

    it('should handle invalid configuration values', () => {
      const error = new ConfigurationError('Invalid network configuration', {
        network: 'invalid-network',
        validNetworks: ['mainnet', 'testnet']
      });
      
      expect(error.details?.validNetworks).toEqual(['mainnet', 'testnet']);
    });
  });

  describe('TimeoutError', () => {
    it('should create timeout error with message', () => {
      const error = new TimeoutError('Operation timed out');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(TimeoutError);
      expect(error.message).toBe('Operation timed out');
      expect(error.name).toBe('TimeoutError');
    });

    it('should create timeout error with timing details', () => {
      const details = {
        timeout: 30000,
        elapsed: 35000,
        operation: 'blockchain_confirmation'
      };
      const error = new TimeoutError('Confirmation timeout', details);
      
      expect(error.details).toEqual(details);
    });

    it('should handle different timeout scenarios', () => {
      const error = new TimeoutError('Network timeout', {
        type: 'network',
        retryAttempt: 3,
        maxRetries: 5
      });
      
      expect(error.details?.retryAttempt).toBe(3);
    });
  });

  describe('InsufficientFundsError', () => {
    it('should create insufficient funds error with message', () => {
      const error = new InsufficientFundsError('Not enough balance');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(InsufficientFundsError);
      expect(error.message).toBe('Not enough balance');
      expect(error.name).toBe('InsufficientFundsError');
    });

    it('should create insufficient funds error with balance details', () => {
      const details = {
        required: 1000,
        available: 500,
        currency: 'HBAR',
        accountId: 'account-123'
      };
      const error = new InsufficientFundsError('Insufficient HBAR balance', details);
      
      expect(error.details).toEqual(details);
    });

    it('should handle gas fee scenarios', () => {
      const error = new InsufficientFundsError('Insufficient gas', {
        gasRequired: 21000,
        gasAvailable: 15000,
        gasPrice: '20000000000'
      });
      
      expect(error.details?.gasRequired).toBe(21000);
    });
  });

  describe('UnsupportedOperationError', () => {
    it('should create unsupported operation error with message', () => {
      const error = new UnsupportedOperationError('Operation not supported');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(UnsupportedOperationError);
      expect(error.message).toBe('Operation not supported');
      expect(error.name).toBe('UnsupportedOperationError');
    });

    it('should create unsupported operation error with operation details', () => {
      const details = {
        operation: 'multi_sig_transfer',
        blockchain: 'sui',
        reason: 'feature_not_implemented'
      };
      const error = new UnsupportedOperationError('Multi-sig not supported on Sui', details);
      
      expect(error.details).toEqual(details);
    });

    it('should handle version compatibility issues', () => {
      const error = new UnsupportedOperationError('Version incompatible', {
        requiredVersion: '2.0.0',
        currentVersion: '1.5.0',
        feature: 'atomic_swaps'
      });
      
      expect(error.details?.requiredVersion).toBe('2.0.0');
    });
  });

  describe('Error serialization', () => {
    it('should serialize errors to JSON', () => {
      const error = new ValidationError('Test error', { field: 'amount' });
      
      const serialized = JSON.stringify({
        name: error.name,
        message: error.message,
        details: error.details
      });
      
      expect(serialized).toContain('ValidationError');
      expect(serialized).toContain('Test error');
      expect(serialized).toContain('amount');
    });

    it('should handle errors without details', () => {
      const error = new NetworkError('Simple error');
      
      const serialized = JSON.stringify({
        name: error.name,
        message: error.message,
        details: error.details
      });
      
      expect(serialized).toContain('NetworkError');
      expect(serialized).toContain('Simple error');
    });
  });

  describe('Error inheritance', () => {
    it('should maintain proper inheritance chain', () => {
      const validationError = new ValidationError('Test');
      const networkError = new NetworkError('Test');
      const transferError = new TransferError('Test');
      
      expect(validationError instanceof Error).toBe(true);
      expect(networkError instanceof Error).toBe(true);
      expect(transferError instanceof Error).toBe(true);
      
      expect(validationError instanceof ValidationError).toBe(true);
      expect(networkError instanceof NetworkError).toBe(true);
      expect(transferError instanceof TransferError).toBe(true);
    });

    it('should have unique error names', () => {
      const errors = [
        new ValidationError('Test'),
        new NetworkError('Test'),
        new TransferError('Test'),
        new SecurityError('Test'),
        new ConfigurationError('Test'),
        new TimeoutError('Test'),
        new InsufficientFundsError('Test'),
        new UnsupportedOperationError('Test')
      ];
      
      const names = errors.map(e => e.name);
      const uniqueNames = [...new Set(names)];
      
      expect(names.length).toBe(uniqueNames.length);
    });
  });

  describe('Error details handling', () => {
    it('should handle complex nested details', () => {
      const complexDetails = {
        transaction: {
          id: 'tx-123',
          inputs: [{ id: 'input-1', amount: 100 }],
          outputs: [{ id: 'output-1', amount: 95 }],
          metadata: {
            timestamp: new Date().toISOString(),
            source: 'api'
          }
        },
        validation: {
          rules: ['amount_positive', 'balance_sufficient'],
          failed: ['balance_sufficient']
        }
      };
      
      const error = new TransferError('Complex validation failed', complexDetails);
      
      expect(error.details).toEqual(complexDetails);
      expect(error.details?.transaction?.id).toBe('tx-123');
      expect(error.details?.validation?.failed).toContain('balance_sufficient');
    });

    it('should handle undefined details gracefully', () => {
      const error = new ValidationError('Test error', undefined);
      
      expect(error.details).toBeUndefined();
      expect(error.message).toBe('Test error');
    });
  });
});