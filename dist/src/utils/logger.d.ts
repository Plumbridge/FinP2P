import winston from 'winston';
export interface LoggingConfig {
    level: string;
    file?: string;
}
export declare function createLogger(config: LoggingConfig): winston.Logger;
export default createLogger;
//# sourceMappingURL=logger.d.ts.map