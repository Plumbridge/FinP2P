import { MessageValidator } from '../../utils/validation';
import { Transfer, TransferStatus } from '../../../core/types';

describe('MessageValidator', () => {
  let validator: MessageValidator;

  beforeEach(() => {
    validator = new MessageValidator();
  });

  describe('validateTransfer', () => {
    const validTransfer = {
      fromAccount: { id: 'account-1', type: 'account' as const, domain: 'test.com' },
      toAccount: { id: 'account-2', type: 'account' as const, domain: 'test.com' },
      asset: { id: 'asset-1', type: 'asset' as const, domain: 'test.com' },
      amount: '1000',
      metadata: {}
    };

    it('should validate correct transfer data', () => {
      const result = validator.validateTransfer(validTransfer);
      expect(result.isValid).toBe(true);
    });

    it('should reject transfer with missing required fields', () => {
      const invalidTransfer = { amount: '1000' };
      const result = validator.validateTransfer(invalidTransfer);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject transfer with invalid amount format', () => {
      const invalidTransfer = { ...validTransfer, amount: 'invalid' };
      const result = validator.validateTransfer(invalidTransfer);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('validateAccount', () => {
    const validAccount = {
      institutionId: 'inst-1',
      ledgerId: 'ledger-1'
    };

    it('should validate a valid account', () => {
      const result = validator.validateAccount(validAccount);
      expect(result.isValid).toBe(true);
    });

    it('should reject account with missing institution id', () => {
      const invalidAccount = { ledgerId: 'ledger-1' };
      const result = validator.validateAccount(invalidAccount);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject account with missing ledger id', () => {
      const invalidAccount = { institutionId: 'inst-1' };
      const result = validator.validateAccount(invalidAccount);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });


  });

  describe('validateAsset', () => {
    const validAsset = {
      symbol: 'USD',
      name: 'US Dollar',
      decimals: 2,
      totalSupply: '1000000',
      ledgerId: 'ledger-1',
      metadata: {
        description: 'US Dollar asset'
      }
    };

    it('should validate a valid asset', () => {
      const result = validator.validateAsset(validAsset);
      expect(result.isValid).toBe(true);
    });

    it('should reject asset with missing symbol', () => {
      const invalidAsset = { ...validAsset, symbol: undefined };
      const result = validator.validateAsset(invalidAsset);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject asset with invalid symbol length', () => {
      const invalidAsset = { ...validAsset, symbol: 'VERYLONGSYMBOL' };
      const result = validator.validateAsset(invalidAsset);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject asset with negative decimals', () => {
      const invalidAsset = { ...validAsset, decimals: -1 };
      const result = validator.validateAsset(invalidAsset);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject asset with decimals too high', () => {
      const invalidAsset = { ...validAsset, decimals: 25 };
      const result = validator.validateAsset(invalidAsset);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('amount validation', () => {
    it('should validate positive amounts', () => {
      expect(validator.validateAmount('1000')).toBe(true);
      expect(validator.validateAmount('0')).toBe(true);
    });

    it('should reject negative amounts', () => {
      expect(validator.validateAmount('-100')).toBe(false);
    });

    it('should reject invalid amount formats', () => {
      expect(validator.validateAmount('abc')).toBe(false);
      expect(validator.validateAmount('12.34')).toBe(false);
    });
  });

  describe('FinID validation', () => {
    it('should validate correct FinID objects', () => {
      const finId = {
        id: 'test-id',
        type: 'account',
        domain: 'example.com'
      };
      
      expect(validator.validateFinID(finId)).toBe(true);
    });

    it('should reject invalid FinID objects', () => {
      const invalidFinId = {
        id: 'test-id',
        type: 'invalid-type',
        domain: 'example.com'
      };
      
      expect(validator.validateFinID(invalidFinId)).toBe(false);
    });

    it('should reject FinID with missing fields', () => {
      const incompleteFinId = {
        id: 'test-id'
        // missing type and domain
      };
      
      expect(validator.validateFinID(incompleteFinId)).toBe(false);
    });
  });

  describe('input sanitization', () => {
    it('should sanitize string inputs', () => {
      const input = '<script>alert("xss")</script>';
      const sanitized = validator.sanitizeInput(input);
      
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });

    it('should sanitize object inputs', () => {
      const input = {
        name: '<script>alert("xss")</script>',
        description: 'Safe text'
      };
      const sanitized = validator.sanitizeInput(input) as any;
      
      expect(sanitized.name).not.toContain('<');
      expect(sanitized.description).toBe('Safe text');
    });

    it('should handle non-string inputs', () => {
      expect(validator.sanitizeInput(123)).toBe(123);
      expect(validator.sanitizeInput(null)).toBe(null);
      expect(validator.sanitizeInput(undefined)).toBe(undefined);
    });
  });
});