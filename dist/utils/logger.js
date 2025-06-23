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
    const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
    // For testing environment, use a simple format that works with console spies
    const isTest = process.env.NODE_ENV === 'test';
    const transports = [
        new winston_1.default.transports.Console({
            format: isTest ? winston_1.default.format.combine(winston_1.default.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length ? safeStringify(meta) : '';
                return `${level}: ${message} ${metaStr}`.trim();
            })) : winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        })
    ];
    if (config.file) {
        transports.push(new winston_1.default.transports.File({
            filename: path_1.default.resolve(config.file),
            format: winston_1.default.format.combine(winston_1.default.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length ? safeStringify(meta) : '';
                return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
            }))
        }));
    }
    return winston_1.default.createLogger({
        level: config.level || 'info',
        format: logFormat,
        transports,
        exitOnError: false
    });
}
exports.createLogger = createLogger;
exports.default = createLogger;
//# sourceMappingURL=logger.js.map