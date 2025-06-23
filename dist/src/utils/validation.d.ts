import { Message } from '../types';
export declare class MessageValidator {
    private messageSchema;
    private transferSchema;
    private assetSchema;
    private accountSchema;
    constructor();
    validate(message: Message): Promise<boolean>;
    validateTransfer(transferData: any): {
        isValid: boolean;
        errors?: string[];
    };
    validateAsset(assetData: any): {
        isValid: boolean;
        errors?: string[];
    };
    validateAccount(accountData: any): {
        isValid: boolean;
        errors?: string[];
    };
    validateFinID(finId: any): boolean;
    validateAmount(amount: string): boolean;
    sanitizeInput(input: any): any;
}
//# sourceMappingURL=validation.d.ts.map