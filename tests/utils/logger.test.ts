import { createLogger } from '../../src/utils/logger';

describe('Logger', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('createLogger', () => {
    it('should create logger with default configuration', () => {
      const logger = createLogger();
      
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should create logger with custom level', () => {
      const logger = createLogger({ level: 'error' });
      
      expect(logger).toBeDefined();
    });

    it('should create logger with custom format', () => {
      const logger = createLogger({ 
        format: 'json',
        level: 'info'
      });
      
      expect(logger).toBeDefined();
    });
  });

  describe('logging levels', () => {
    it('should log info messages', () => {
      const logger = createLogger({ level: 'info' });
      
      logger.info('Test info message');
      logger.info('Info with data', { key: 'value' });
      
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      const logger = createLogger({ level: 'error' });
      
      logger.error('Test error message');
      logger.error('Error with stack', new Error('Test error'));
      
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log warning messages', () => {
      const logger = createLogger({ level: 'warn' });
      
      logger.warn('Test warning message');
      logger.warn('Warning with data', { warning: true });
      
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log debug messages when level allows', () => {
      const logger = createLogger({ level: 'debug' });
      
      logger.debug('Test debug message');
      logger.debug('Debug with context', { context: 'test' });
      
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should not log debug messages when level is higher', () => {
      const logger = createLogger({ level: 'error' });
      
      logger.debug('This should not be logged');
      
      // Debug messages should be filtered out at error level
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('This should not be logged')
      );
    });
  });

  describe('structured logging', () => {
    it('should handle object metadata', () => {
      const logger = createLogger({ level: 'info' });
      const metadata = {
        userId: 'user-123',
        action: 'transfer',
        amount: 1000
      };
      
      logger.info('User action', metadata);
      
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle error objects', () => {
      const logger = createLogger({ level: 'error' });
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      
      logger.error('Operation failed', error);
      
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle nested objects', () => {
      const logger = createLogger({ level: 'info' });
      const complexData = {
        transfer: {
          id: 'transfer-123',
          from: { id: 'account-1' },
          to: { id: 'account-2' },
          metadata: {
            timestamp: new Date().toISOString(),
            source: 'api'
          }
        }
      };
      
      logger.info('Complex transfer data', complexData);
      
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('performance logging', () => {
    it('should log performance metrics', () => {
      const logger = createLogger({ level: 'info' });
      const metrics = {
        operation: 'transfer_validation',
        duration: 150,
        memory: 1024,
        cpu: 25.5
      };
      
      logger.info('Performance metrics', metrics);
      
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle timing information', (done) => {
      const logger = createLogger({ level: 'debug' });
      const startTime = Date.now();
      
      // Simulate some work
      setTimeout(() => {
        const duration = Date.now() - startTime;
        logger.debug('Operation completed', { duration });
        expect(consoleSpy).toHaveBeenCalled();
        done();
      }, 10);
      
      expect(logger).toBeDefined();
    });
  });

  describe('security logging', () => {
    it('should log security events without sensitive data', () => {
      const logger = createLogger({ level: 'warn' });
      
      logger.warn('Authentication failed', {
        userId: 'user-123',
        ip: '192.168.1.1',
        timestamp: new Date().toISOString()
        // Note: should not log passwords or tokens
      });
      
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log access control events', () => {
      const logger = createLogger({ level: 'info' });
      
      logger.info('Access granted', {
        userId: 'user-123',
        resource: 'transfer-endpoint',
        action: 'create'
      });
      
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('correlation IDs', () => {
    it('should support correlation ID tracking', () => {
      const logger = createLogger({ level: 'info' });
      const correlationId = 'req-123-456';
      
      logger.info('Request started', { correlationId });
      logger.info('Processing transfer', { correlationId });
      logger.info('Request completed', { correlationId });
      
      expect(consoleSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('error handling', () => {
    it('should handle circular references in objects', () => {
      const logger = createLogger({ level: 'info' });
      const obj: any = { name: 'test' };
      obj.self = obj; // Create circular reference
      
      expect(() => {
        logger.info('Object with circular reference', obj);
      }).not.toThrow();
    });

    it('should handle undefined and null values', () => {
      const logger = createLogger({ level: 'info' });
      
      expect(() => {
        logger.info('Undefined value', undefined);
        logger.info('Null value', null);
        logger.info('Mixed values', { a: undefined, b: null, c: 'valid' });
      }).not.toThrow();
    });

    it('should handle very large objects', () => {
      const logger = createLogger({ level: 'info' });
      const largeObj = {
        data: new Array(1000).fill(0).map((_, i) => ({ id: i, value: `item-${i}` }))
      };
      
      expect(() => {
        logger.info('Large object', largeObj);
      }).not.toThrow();
    });
  });
});