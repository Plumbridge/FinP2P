"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
// Helper to safely stringify objects with circular references
function safeStringify(obj) {
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
function createLogger(config) {
    const logConfig = config || { level: 'info' };
    const isTest = process.env.NODE_ENV === 'test';
    const transports = [];
    // Console transport - simplified for tests
    if (isTest) {
        // In test mode, use a custom transport to control output
        // Test spies will capture process.stdout.write calls when needed
        transports.push(new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.printf(({ level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length ? ' ' + safeStringify(meta) : '';
                const output = `${level}: ${message}${metaStr}`;
                // Only write to stdout when explicitly testing logger functionality
                if (process.env.LOGGER_TEST_MODE === 'true') {
                    process.stdout.write(output + '\n');
                }
                // Return empty string to prevent Winston's default console output
                return process.env.LOGGER_TEST_MODE === 'true' ? output : '';
            }))
        }));
    }
    else {
        transports.push(new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        }));
    }
    // File transport - add regardless of environment if specified
    if (logConfig.file) {
        transports.push(new winston_1.default.transports.File({
            filename: path_1.default.resolve(logConfig.file),
            format: winston_1.default.format.combine(winston_1.default.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length ? safeStringify(meta) : '';
                return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
            }))
        }));
    }
    return winston_1.default.createLogger({
        level: logConfig.level || 'info',
        format: winston_1.default.format.json(),
        transports,
        exitOnError: false,
        silent: false
    });
}
exports.createLogger = createLogger;
exports.default = createLogger;
//# sourceMappingURL=logger.js.map