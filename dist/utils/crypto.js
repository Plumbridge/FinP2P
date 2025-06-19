"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoUtils = void 0;
const crypto_1 = __importDefault(require("crypto"));
class CryptoUtils {
    constructor(privateKey) {
        if (privateKey) {
            this.privateKey = privateKey;
            // In a real implementation, derive public key from private key
            this.publicKey = this.derivePublicKey(privateKey);
        }
        else {
            const keyPair = this.generateKeyPair();
            this.privateKey = keyPair.privateKey;
            this.publicKey = keyPair.publicKey;
        }
    }
    generateKeyPair() {
        const { publicKey, privateKey } = crypto_1.default.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
        return { privateKey, publicKey };
    }
    derivePublicKey(privateKey) {
        try {
            // Check if it's a valid PEM format private key
            if (privateKey.includes('-----BEGIN') && privateKey.includes('PRIVATE KEY-----')) {
                const keyObject = crypto_1.default.createPrivateKey(privateKey);
                return keyObject.export({
                    type: 'spki',
                    format: 'pem'
                });
            }
            else {
                // For test scenarios or simple strings, generate a mock public key
                const hash = crypto_1.default.createHash('sha256').update(privateKey).digest('hex');
                return `-----BEGIN PUBLIC KEY-----\n${hash}\n-----END PUBLIC KEY-----`;
            }
        }
        catch (error) {
            // Fallback for any other cases
            const hash = crypto_1.default.createHash('sha256').update(privateKey).digest('hex');
            return `-----BEGIN PUBLIC KEY-----\n${hash}\n-----END PUBLIC KEY-----`;
        }
    }
    async sign(data) {
        try {
            const sign = crypto_1.default.createSign('SHA256');
            sign.update(data);
            sign.end();
            const signature = sign.sign(this.privateKey, 'base64');
            return signature;
        }
        catch (error) {
            throw new Error(`Failed to sign data: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async verify(data, signature, publicKey) {
        try {
            const keyToUse = publicKey || this.publicKey;
            const verify = crypto_1.default.createVerify('SHA256');
            verify.update(data);
            verify.end();
            return verify.verify(keyToUse, signature, 'base64');
        }
        catch (error) {
            console.error('Signature verification failed:', error);
            return false;
        }
    }
    hash(data, algorithm = 'sha256') {
        return crypto_1.default.createHash(algorithm).update(data).digest('hex');
    }
    generateNonce() {
        return crypto_1.default.randomBytes(16).toString('hex');
    }
    generateId() {
        return crypto_1.default.randomUUID();
    }
    encrypt(data, key) {
        const algorithm = 'aes-256-cbc';
        const encryptionKey = key ? crypto_1.default.createHash('sha256').update(key).digest() : crypto_1.default.randomBytes(32);
        const iv = crypto_1.default.randomBytes(16);
        const cipher = crypto_1.default.createCipheriv(algorithm, encryptionKey, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return {
            encrypted,
            iv: iv.toString('hex')
        };
    }
    decrypt(encryptedData, key, iv) {
        const algorithm = 'aes-256-cbc';
        const encryptionKey = crypto_1.default.createHash('sha256').update(key).digest();
        const ivBuffer = Buffer.from(iv, 'hex');
        const decipher = crypto_1.default.createDecipheriv(algorithm, encryptionKey, ivBuffer);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    getPublicKey() {
        return this.publicKey;
    }
    getPrivateKey() {
        return this.privateKey;
    }
    // Generate a deterministic ID from input data
    generateDeterministicId(data) {
        return this.hash(data).substring(0, 16);
    }
    // Create a message authentication code
    createMAC(data, secret) {
        return crypto_1.default.createHmac('sha256', secret).update(data).digest('hex');
    }
    // Verify message authentication code
    verifyMAC(data, mac, secret) {
        try {
            const expectedMAC = this.createMAC(data, secret);
            return crypto_1.default.timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(expectedMAC, 'hex'));
        }
        catch (error) {
            // Invalid hex string or other error
            return false;
        }
    }
    // Generate a secure random token
    generateToken(length = 32) {
        return crypto_1.default.randomBytes(length).toString('hex');
    }
    // Key derivation function
    deriveKey(password, salt, iterations = 100000) {
        return crypto_1.default.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
    }
    // Generate salt for key derivation
    generateSalt() {
        return crypto_1.default.randomBytes(16).toString('hex');
    }
}
exports.CryptoUtils = CryptoUtils;
//# sourceMappingURL=crypto.js.map