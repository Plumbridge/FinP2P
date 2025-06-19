import winston from 'winston';
import path from 'path';

export interface LoggingConfig {
  level: string;
  file?: string;
}

export function createLogger(config: LoggingConfig): winston.Logger {
  const logFormat = winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
    })
  );

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ];

  if (config.file) {
    transports.push(
      new winston.transports.File({
        filename: path.resolve(config.file),
        format: logFormat
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