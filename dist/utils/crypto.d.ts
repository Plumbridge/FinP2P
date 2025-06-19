export declare class CryptoUtils {
    private privateKey;
    private publicKey;
    constructor(privateKey?: string);
    private generateKeyPair;
    private derivePublicKey;
    sign(data: string): Promise<string>;
    verify(data: string, signature: string, publicKey?: string): Promise<boolean>;
    hash(data: string, algorithm?: string): string;
    generateNonce(): string;
    generateId(): string;
    encrypt(data: string, key?: string): {
        encrypted: string;
        iv: string;
    };
    decrypt(encryptedData: string, key: string, iv: string): string;
    getPublicKey(): string;
    getPrivateKey(): string;
    generateDeterministicId(data: string): string;
    createMAC(data: string, secret: string): string;
    verifyMAC(data: string, mac: string, secret: string): boolean;
    generateToken(length?: number): string;
    deriveKey(password: string, salt: string, iterations?: number): string;
    generateSalt(): string;
}
//# sourceMappingURL=crypto.d.ts.map