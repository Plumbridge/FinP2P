import Joi from 'joi';
import { Message, MessageType, Transfer, Asset, Account } from '../types';

export class MessageValidator {
  private messageSchema: Joi.ObjectSchema;
  private transferSchema: Joi.ObjectSchema;
  private assetSchema: Joi.ObjectSchema;
  private accountSchema: Joi.ObjectSchema;

  constructor() {
    this.messageSchema = Joi.object({
      id: Joi.string().uuid().required(),
      type: Joi.string().valid(...Object.values(MessageType)).required(),
      fromRouter: Joi.string().required(),
      toRouter: Joi.string().required(),
      payload: Joi.any().required(),
      signature: Joi.string().required(),
      timestamp: Joi.date().required(),
      ttl: Joi.number().positive().required()
    });

    this.transferSchema = Joi.object({
      fromAccount: Joi.object({
        id: Joi.string().required(),
        type: Joi.string().valid('institution', 'asset', 'account').required(),
        domain: Joi.string().required()
      }).required(),
      toAccount: Joi.object({
        id: Joi.string().required(),
        type: Joi.string().valid('institution', 'asset', 'account').required(),
        domain: Joi.string().required()
      }).required(),
      asset: Joi.object({
        id: Joi.string().required(),
        type: Joi.string().valid('institution', 'asset', 'account').required(),
        domain: Joi.string().required()
      }).required(),
      amount: Joi.string().pattern(/^\d+$/).required(), // BigInt as string
      metadata: Joi.object().optional()
    });

    this.assetSchema = Joi.object({
      symbol: Joi.string().min(1).max(10).required(),
      name: Joi.string().min(1).max(100).required(),
      decimals: Joi.number().integer().min(0).max(18).required(),
      totalSupply: Joi.string().pattern(/^\d+$/).required(),
      ledgerId: Joi.string().required(),
      metadata: Joi.object({
        description: Joi.string().optional(),
        imageUrl: Joi.string().uri().optional(),
        externalUrl: Joi.string().uri().optional(),
        attributes: Joi.array().items(
          Joi.object({
            trait_type: Joi.string().required(),
            value: Joi.alternatives().try(Joi.string(), Joi.number()).required()
          })
        ).optional()
      }).optional()
    });

    this.accountSchema = Joi.object({
      institutionId: Joi.string().required(),
      ledgerId: Joi.string().required()
    });
  }

  async validate(message: Message): Promise<boolean> {
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
    } catch (error) {
      console.error('Message validation failed:', error);
      return false;
    }
  }

  validateTransfer(transferData: any): { isValid: boolean; errors?: string[] } {
    const { error } = this.transferSchema.validate(transferData);
    if (error) {
      return {
        isValid: false,
        errors: error.details.map(detail => detail.message)
      };
    }
    return { isValid: true };
  }

  validateAsset(assetData: any): { isValid: boolean; errors?: string[] } {
    const { error } = this.assetSchema.validate(assetData);
    if (error) {
      return {
        isValid: false,
        errors: error.details.map(detail => detail.message)
      };
    }
    return { isValid: true };
  }

  validateAccount(accountData: any): { isValid: boolean; errors?: string[] } {
    const { error } = this.accountSchema.validate(accountData);
    if (error) {
      return {
        isValid: false,
        errors: error.details.map(detail => detail.message)
      };
    }
    return { isValid: true };
  }

  validateFinID(finId: any): boolean {
    const schema = Joi.object({
      id: Joi.string().required(),
      type: Joi.string().valid('institution', 'asset', 'account').required(),
      domain: Joi.string().domain().required(),
      metadata: Joi.object().optional()
    });

    const { error } = schema.validate(finId);
    return !error;
  }

  validateAmount(amount: string): boolean {
    try {
      const bigIntAmount = BigInt(amount);
      return bigIntAmount >= 0;
    } catch {
      return false;
    }
  }

  sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return input.trim().replace(/[<>"'&]/g, '');
    }
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    return input;
  }
}
