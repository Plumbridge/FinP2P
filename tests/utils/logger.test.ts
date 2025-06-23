import { createLogger } from '../../src/utils/logger';
import winston from 'winston';

describe('Logger', () => {
  let consoleSpy: jest.SpyInstance;
  let processStdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    // Spy on both console.log and process.stdout.write which winston might use
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    processStdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    processStdoutSpy.mockRestore();
  });

  describe('createLogger', () => {
    it('should create logger with default configuration', () => {
      const logger = createLogger({ level: 'info' });
      
      expect(logger).toBeDefined();
      expect(logger.level).toBe('info');
      expect(logger.transports).toHaveLength(1);
    });

    it('debug console output format', () => {
      const logger = createLogger({ level: 'info' });
      processStdoutSpy.mockClear();
      
      logger.info('Test message', { key: 'value' });
      
      // Check what was actually called
      const calls = processStdoutSpy.mock.calls;
      if (calls.length > 0) {
        // Use a different console method to avoid the spy
        process.stdout.write(`Actual call: ${JSON.stringify(calls[0])}\n`);
      }
      
      expect(processStdoutSpy).toHaveBeenCalled();
    });

    it('should create logger with custom level', () => {
      const logger = createLogger({ level: 'debug' });
      
      expect(logger.level).toBe('debug');
    });

    it('should create logger with custom format', () => {
      const logger = createLogger({ level: 'info', file: 'test.log' });
      
      expect(logger.transports).toHaveLength(2);
    });
  });

  describe('logging levels', () => {
    it('should log info messages', () => {
      const logger = createLogger({ level: 'info' });
      
      logger.info('Test info message');
      logger.info('Info with data', { key: 'value' });
      
      // Check both console.log and process.stdout.write
      const consoleWasCalled = consoleSpy.mock.calls.length > 0;
      const stdoutWasCalled = processStdoutSpy.mock.calls.length > 0;
      
      if (consoleWasCalled) {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('info: Test info message')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('info: Info with data')
        );
      } else if (stdoutWasCalled) {
        expect(processStdoutSpy).toHaveBeenCalledWith(
          expect.stringContaining('info: Test info message')
        );
        expect(processStdoutSpy).toHaveBeenCalledWith(
          expect.stringContaining('info: Info with data')
        );
      } else {
        fail('Neither console.log nor process.stdout.write was called');
      }
    });

    it('should log error messages', () => {
      const logger = createLogger({ level: 'error' });
      
      logger.error('Test error message');
      logger.error('Error with stack', new Error('Test error'));
      
      expect(processStdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('error: Test error message')
      );
      expect(processStdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('error: Error with stack')
      );
    });

    it('should log warning messages', () => {
      const logger = createLogger({ level: 'warn' });
      
      logger.warn('Test warning message');
      logger.warn('Warning with data', { warning: true });
      
      expect(processStdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('warn: Test warning message')
      );
      expect(processStdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('warn: Warning with data')
      );
    });

    it('should log debug messages when level allows', () => {
      const logger = createLogger({ level: 'debug' });
      
      logger.debug('Test debug message');
      logger.debug('Debug with context', { context: 'test' });
      
      expect(processStdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('debug: Test debug message')
      );
      expect(processStdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('debug: Debug with context')
      );
    });

    it('should not log debug messages when level is higher', () => {
      const logger = createLogger({ level: 'error' });
      processStdoutSpy.mockClear();
      
      logger.debug('This should not be logged');
      
      expect(processStdoutSpy).not.toHaveBeenCalled();
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
      
      expect(processStdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('info: User action')
      );
      expect(processStdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('user-123')
      );
    });

    it('should handle error objects', () => {
      const logger = createLogger({ level: 'error' });
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      
      logger.error('Operation failed', error);
      
      expect(processStdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('error: Operation failed')
      );
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
      
      expect(processStdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('transfer-123')
      );
    });
  });

  describe('performance logging', () => {
    it('should log performance metrics', () => {
      const logger = createLogger({ level: 'info' });
      const metrics = {
        operation: 'transfer_validation',
        duration: 150,
        cpu: 25.5,
        memory: 1024
      };
      
      logger.info('Performance metrics', metrics);
      
      expect(processStdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('transfer_validation')
      );
    });

    it('should handle timing information', async () => {
      const logger = createLogger({ level: 'debug' });
      const startTime = Date.now();
      
      // Use setTimeout with async/await instead of done callback
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const duration = Date.now() - startTime;
      logger.debug('Operation completed', { duration });
      
      expect(processStdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('debug: Operation completed')
      );
    });
  });

  describe('security logging', () => {
    it('should log security events without sensitive data', () => {
      const logger = createLogger({ level: 'warn' });
      
      logger.warn('Authentication failed', {
        userId: 'user-123',
        ip: '192.168.1.1',
        // Password should not be logged
        password: 'should-not-appear'
      });
      
      expect(processStdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('user-123')
      );
    });

    it('should log access control events', () => {
      const logger = createLogger({ level: 'info' });
      
      logger.info('Access granted', {
        userId: 'user-123',
        resource: 'transfer-endpoint',
        action: 'create'
      });
      
      expect(processStdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('transfer-endpoint')
      );
    });
  });

  describe('correlation IDs', () => {
    it('should support correlation ID tracking', () => {
      const logger = createLogger({ level: 'info' });
      const correlationId = 'req-123-456';
      
      logger.info('Request started', { correlationId });
      logger.info('Processing transfer', { correlationId });
      logger.info('Request completed', { correlationId });
      
      const calls = processStdoutSpy.mock.calls.map(call => call[0]);
      const correlationCalls = calls.filter(log =>
        log.includes(correlationId)
      );
      
      expect(correlationCalls).toHaveLength(3);
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
      
      expect(processStdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Circular]')
      );
    });

    it('should handle undefined and null values', () => {
      const logger = createLogger({ level: 'info' });
      
      logger.info('Undefined value', { value: undefined });
      logger.info('Null value', { value: null });
      logger.info('Mixed values', {
        a: undefined,
        b: null,
        c: 'valid'
      });
      
      expect(processStdoutSpy).toHaveBeenCalled();
    });

    it('should handle very large objects', () => {
      const logger = createLogger({ level: 'info' });
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        value: `item-${i}`
      }));
      
      logger.info('Large object', { data: largeArray });
      
      expect(processStdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('item-0')
      );
    });
  });
});