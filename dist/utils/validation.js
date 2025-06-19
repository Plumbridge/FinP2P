"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageValidator = void 0;
const joi_1 = __importDefault(require("joi"));
const types_1 = require("../types");
class MessageValidator {
    constructor() {
        this.messageSchema = joi_1.default.object({
            id: joi_1.default.string().uuid().required(),
            type: joi_1.default.string().valid(...Object.values(types_1.MessageType)).required(),
            fromRouter: joi_1.default.string().required(),
            toRouter: joi_1.default.string().required(),
            payload: joi_1.default.any().required(),
            signature: joi_1.default.string().required(),
            timestamp: joi_1.default.date().required(),
            ttl: joi_1.default.number().positive().required()
        });
        this.transferSchema = joi_1.default.object({
            fromAccount: joi_1.default.object({
                id: joi_1.default.string().required(),
                type: joi_1.default.string().valid('institution', 'asset', 'account').required(),
                domain: joi_1.default.string().required()
            }).required(),
            toAccount: joi_1.default.object({
                id: joi_1.default.string().required(),
                type: joi_1.default.string().valid('institution', 'asset', 'account').required(),
                domain: joi_1.default.string().required()
            }).required(),
            asset: joi_1.default.object({
                id: joi_1.default.string().required(),
                type: joi_1.default.string().valid('institution', 'asset', 'account').required(),
                domain: joi_1.default.string().required()
            }).required(),
            amount: joi_1.default.string().pattern(/^\d+$/).required(), // BigInt as string
            metadata: joi_1.default.object().optional()
        });
        this.assetSchema = joi_1.default.object({
            symbol: joi_1.default.string().min(1).max(10).required(),
            name: joi_1.default.string().min(1).max(100).required(),
            decimals: joi_1.default.number().integer().min(0).max(18).required(),
            totalSupply: joi_1.default.string().pattern(/^\d+$/).required(),
            ledgerId: joi_1.default.string().required(),
            metadata: joi_1.default.object({
                description: joi_1.default.string().optional(),
                imageUrl: joi_1.default.string().uri().optional(),
                externalUrl: joi_1.default.string().uri().optional(),
                attributes: joi_1.default.array().items(joi_1.default.object({
                    trait_type: joi_1.default.string().required(),
                    value: joi_1.default.alternatives().try(joi_1.default.string(), joi_1.default.number()).required()
                })).optional()
            }).optional()
        });
        this.accountSchema = joi_1.default.object({
            institutionId: joi_1.default.string().required(),
            ledgerId: joi_1.default.string().required()
        });
    }
    async validate(message) {
        try {
            // Validate message structure
            const { error } = this.messageSchema.validate(message);
            if (error) {
                throw new Error(`Message validation failed: ${error.message}`);
            }
            // Check if message is expired
            const now = new Date();
            const messageAge = now.getTime() - message.timestamp.getTime();
            if (messageAge > message.ttl) {
                throw new Error('Message has expired');
            }
            // TODO: Verify signature
            // This would involve cryptographic verification of the message signature
            // For now, we just check that signature exists
            if (!message.signature || message.signature.length === 0) {
                throw new Error('Message signature is missing');
            }
            return true;
        }
        catch (error) {
            console.error('Message validation failed:', error);
            return false;
        }
    }
    validateTransfer(transferData) {
        const { error } = this.transferSchema.validate(transferData);
        if (error) {
            return {
                isValid: false,
                errors: error.details.map(detail => detail.message)
            };
        }
        return { isValid: true };
    }
    validateAsset(assetData) {
        const { error } = this.assetSchema.validate(assetData);
        if (error) {
            return {
                isValid: false,
                errors: error.details.map(detail => detail.message)
            };
        }
        return { isValid: true };
    }
    validateAccount(accountData) {
        const { error } = this.accountSchema.validate(accountData);
        if (error) {
            return {
                isValid: false,
                errors: error.details.map(detail => detail.message)
            };
        }
        return { isValid: true };
    }
    validateFinID(finId) {
        const schema = joi_1.default.object({
            id: joi_1.default.string().required(),
            type: joi_1.default.string().valid('institution', 'asset', 'account').required(),
            domain: joi_1.default.string().domain().required(),
            metadata: joi_1.default.object().optional()
        });
        const { error } = schema.validate(finId);
        return !error;
    }
    validateAmount(amount) {
        try {
            const bigIntAmount = BigInt(amount);
            return bigIntAmount >= 0;
        }
        catch {
            return false;
        }
    }
    sanitizeInput(input) {
        if (typeof input === 'string') {
            return input.trim().replace(/[<>"'&]/g, '');
        }
        if (typeof input === 'object' && input !== null) {
            const sanitized = {};
            for (const [key, value] of Object.entries(input)) {
                sanitized[key] = this.sanitizeInput(value);
            }
            return sanitized;
        }
        return input;
    }
}
exports.MessageValidator = MessageValidator;
//# sourceMappingURL=validation.js.map