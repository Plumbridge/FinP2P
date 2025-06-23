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

export function createLogger(config: LoggingConfig): winston.Logger {
  const logFormat = winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  // For testing environment, use a simple format that works with console spies
  const isTest = process.env.NODE_ENV === 'test';
  
  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: isTest ? winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? safeStringify(meta) : '';
          return `${level}: ${message} ${metaStr}`.trim();
        })
      ) : winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ];

  if (config.file) {
    transports.push(
      new winston.transports.File({
        filename: path.resolve(config.file),
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
    level: config.level || 'info',
    format: logFormat,
    transports,
    exitOnError: false
  });
}

export default createLogger;