import winston from 'winston';
import path from 'path';

export interface LoggingConfig {
  level: string;
  file?: string;
}

// Helper to safely stringify objects with circular references
function safeStringify(obj: any): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  }, 2);
}

export function createLogger(config?: LoggingConfig): winston.Logger {
  const logConfig = config || { level: 'info' };
  const isTest = process.env.NODE_ENV === 'test';
  
  const transports: winston.transport[] = [];
  
  // Console transport configuration for test environment
  if (isTest) {
    // In test mode, use a custom transport to control output
    // Test spies will capture process.stdout.write calls when needed
    transports.push(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.printf(({ level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ' ' + safeStringify(meta) : '';
          const output = `${level}: ${message}${metaStr}`;
          // Only write to stdout when explicitly testing logger functionality
          if (process.env.LOGGER_TEST_MODE === 'true') {
            process.stdout.write(output + '\n');
          }
          // Return empty string to prevent Winston's default console output
          return process.env.LOGGER_TEST_MODE === 'true' ? output : '';
        })
      )
    }));
  } else {
    transports.push(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }));
  }

  // File transport - add regardless of environment if specified
  if (logConfig.file) {
    transports.push(
      new winston.transports.File({
        filename: path.resolve(logConfig.file),
        format: winston.format.combine(
          winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
          }),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? safeStringify(meta) : '';
            return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
          })
        )
      })
    );
  }

  return winston.createLogger({
    level: logConfig.level || 'info',
    format: winston.format.json(),
    transports,
    exitOnError: false,
    silent: false
  });
}

export default createLogger;