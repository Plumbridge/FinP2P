"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("../../src/utils/crypto");
describe('CryptoUtils', () => {
    let cryptoUtils;
    beforeEach(() => {
        // Use auto-generated key pair for testing
        cryptoUtils = new crypto_1.CryptoUtils();
    });
    describe('constructor and key management', () => {
        it('should initialize with provided private key', () => {
            const testKey = 'test-key';
            const utils = new crypto_1.CryptoUtils(testKey);
            expect(utils.getPrivateKey()).toBe(testKey);
            expect(utils.getPublicKey()).toContain('-----BEGIN PUBLIC KEY-----');
        });
        it('should generate key pair when no private key provided', () => {
            const utils = new crypto_1.CryptoUtils();
            expect(utils.getPrivateKey()).toBeTruthy();
            expect(utils.getPublicKey()).toBeTruthy();
            expect(utils.getPublicKey()).toContain('-----BEGIN PUBLIC KEY-----');
        });
    });
    describe('sign', () => {
        it('should sign data successfully', async () => {
            const data = 'test data to sign';
            const signature = await cryptoUtils.sign(data);
            expect(signature).toBeDefined();
            expect(typeof signature).toBe('string');
            expect(signature.length).toBeGreaterThan(0);
        });
        it('should produce different signatures for different data', async () => {
            const data1 = 'first data';
            const data2 = 'second data';
            const signature1 = await cryptoUtils.sign(data1);
            const signature2 = await cryptoUtils.sign(data2);
            expect(signature1).not.toBe(signature2);
        });
        it('should handle empty data', async () => {
            const signature = await cryptoUtils.sign('');
            expect(signature).toBeDefined();
            expect(typeof signature).toBe('string');
        });
    });
    describe('verify', () => {
        it('should verify valid signatures', async () => {
            const data = 'test message to verify';
            const signature = await cryptoUtils.sign(data);
            const isValid = await cryptoUtils.verify(data, signature);
            expect(isValid).toBe(true);
        });
        it('should reject invalid signatures', async () => {
            const data = 'test message';
            const invalidSignature = 'invalid-signature';
            const isValid = await cryptoUtils.verify(data, invalidSignature);
            expect(isValid).toBe(false);
        });
        it('should verify with external public key', async () => {
            const data = 'test message';
            const signature = await cryptoUtils.sign(data);
            const publicKey = cryptoUtils.getPublicKey();
            const isValid = await cryptoUtils.verify(data, signature, publicKey);
            expect(isValid).toBe(true);
        });
        it('should reject signatures for different data', async () => {
            const originalData = 'original message';
            const modifiedData = 'modified message';
            const signature = await cryptoUtils.sign(originalData);
            const isValid = await cryptoUtils.verify(modifiedData, signature);
            expect(isValid).toBe(false);
        });
    });
    describe('hash', () => {
        it('should generate consistent hash for same input', () => {
            const data = 'test data to hash';
            const hash1 = cryptoUtils.hash(data);
            const hash2 = cryptoUtils.hash(data);
            expect(hash1).toBe(hash2);
            expect(hash1).toBeDefined();
            expect(typeof hash1).toBe('string');
            expect(hash1.length).toBeGreaterThan(0);
        });
        it('should generate different hashes for different inputs', () => {
            const data1 = 'first data';
            const data2 = 'second data';
            const hash1 = cryptoUtils.hash(data1);
            const hash2 = cryptoUtils.hash(data2);
            expect(hash1).not.toBe(hash2);
        });
        it('should support different hash algorithms', () => {
            const data = 'test data';
            const sha256Hash = cryptoUtils.hash(data, 'sha256');
            const sha512Hash = cryptoUtils.hash(data, 'sha512');
            expect(sha256Hash).not.toBe(sha512Hash);
            expect(sha256Hash.length).toBeLessThan(sha512Hash.length);
        });
        it('should handle empty input', () => {
            const hash = cryptoUtils.hash('');
            expect(hash).toBeDefined();
            expect(typeof hash).toBe('string');
        });
    });
    describe('generateNonce', () => {
        it('should generate unique nonces', () => {
            const nonce1 = cryptoUtils.generateNonce();
            const nonce2 = cryptoUtils.generateNonce();
            expect(nonce1).toBeDefined();
            expect(nonce2).toBeDefined();
            expect(typeof nonce1).toBe('string');
            expect(typeof nonce2).toBe('string');
            expect(nonce1).not.toBe(nonce2);
            expect(nonce1.length).toBeGreaterThan(0);
            expect(nonce2.length).toBeGreaterThan(0);
        });
        it('should generate nonces of consistent length', () => {
            const nonce1 = cryptoUtils.generateNonce();
            const nonce2 = cryptoUtils.generateNonce();
            expect(nonce1.length).toBe(nonce2.length);
        });
        it('should generate hexadecimal nonces', () => {
            const nonce = cryptoUtils.generateNonce();
            expect(nonce).toMatch(/^[0-9a-f]+$/i);
        });
    });
    describe('generateId', () => {
        it('should generate unique UUIDs', () => {
            const id1 = cryptoUtils.generateId();
            const id2 = cryptoUtils.generateId();
            expect(id1).toBeDefined();
            expect(id2).toBeDefined();
            expect(typeof id1).toBe('string');
            expect(typeof id2).toBe('string');
            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });
    });
    describe('generateToken', () => {
        it('should generate secure random tokens', () => {
            const token1 = cryptoUtils.generateToken();
            const token2 = cryptoUtils.generateToken();
            expect(token1).toBeDefined();
            expect(token2).toBeDefined();
            expect(typeof token1).toBe('string');
            expect(typeof token2).toBe('string');
            expect(token1).not.toBe(token2);
            expect(token1.length).toBe(64); // 32 bytes * 2 (hex)
        });
        it('should generate tokens of specified length', () => {
            const token = cryptoUtils.generateToken(16);
            expect(token.length).toBe(32); // 16 bytes * 2 (hex)
        });
    });
    describe('encrypt', () => {
        it('should encrypt data successfully', () => {
            const data = 'sensitive data to encrypt';
            const key = 'encryption-key-123';
            const result = cryptoUtils.encrypt(data, key);
            expect(result).toBeDefined();
            expect(result.encrypted).toBeDefined();
            expect(result.iv).toBeDefined();
            expect(typeof result.encrypted).toBe('string');
            expect(typeof result.iv).toBe('string');
            expect(result.encrypted).not.toBe(data);
        });
        it('should generate different encrypted data for same input with different keys', () => {
            const data = 'test data';
            const key1 = 'key1';
            const key2 = 'key2';
            const result1 = cryptoUtils.encrypt(data, key1);
            const result2 = cryptoUtils.encrypt(data, key2);
            expect(result1.encrypted).not.toBe(result2.encrypted);
        });
        it('should generate different encrypted data on multiple calls with same input', () => {
            const data = 'test data';
            const key = 'same-key';
            const result1 = cryptoUtils.encrypt(data, key);
            const result2 = cryptoUtils.encrypt(data, key);
            expect(result1.encrypted).not.toBe(result2.encrypted);
            expect(result1.iv).not.toBe(result2.iv);
        });
        it('should handle empty data', () => {
            const key = 'test-key';
            const result = cryptoUtils.encrypt('', key);
            expect(result).toBeDefined();
            expect(result.encrypted).toBeDefined();
            expect(result.iv).toBeDefined();
        });
    });
    describe('MAC operations', () => {
        it('should create and verify MAC', () => {
            const data = 'test data for MAC';
            const secret = 'secret-key';
            const mac = cryptoUtils.createMAC(data, secret);
            const isValid = cryptoUtils.verifyMAC(data, mac, secret);
            expect(mac).toBeDefined();
            expect(typeof mac).toBe('string');
            expect(isValid).toBe(true);
        });
        it('should reject invalid MAC', () => {
            const data = 'test data';
            const secret = 'secret-key';
            const invalidMac = 'invalid-mac';
            const isValid = cryptoUtils.verifyMAC(data, invalidMac, secret);
            expect(isValid).toBe(false);
        });
    });
    describe('key derivation', () => {
        it('should derive keys consistently', () => {
            const password = 'test-password';
            const salt = cryptoUtils.generateSalt();
            const key1 = cryptoUtils.deriveKey(password, salt);
            const key2 = cryptoUtils.deriveKey(password, salt);
            expect(key1).toBe(key2);
            expect(key1).toBeDefined();
            expect(typeof key1).toBe('string');
        });
        it('should generate unique salts', () => {
            const salt1 = cryptoUtils.generateSalt();
            const salt2 = cryptoUtils.generateSalt();
            expect(salt1).not.toBe(salt2);
            expect(salt1.length).toBe(salt2.length);
        });
    });
    describe('decrypt', () => {
        it('should decrypt encrypted data', () => {
            const originalData = 'secret message';
            const key = 'decryption-key';
            const encrypted = cryptoUtils.encrypt(originalData, key);
            const decrypted = cryptoUtils.decrypt(encrypted.encrypted, key, encrypted.iv);
            expect(decrypted).toBe(originalData);
        });
        it('should handle empty data encryption/decryption', () => {
            const originalData = '';
            const key = 'test-key';
            const encrypted = cryptoUtils.encrypt(originalData, key);
            const decrypted = cryptoUtils.decrypt(encrypted.encrypted, key, encrypted.iv);
            expect(decrypted).toBe(originalData);
        });
    });
    describe('generateDeterministicId', () => {
        it('should generate consistent IDs for same input', () => {
            const data = 'test data';
            const id1 = cryptoUtils.generateDeterministicId(data);
            const id2 = cryptoUtils.generateDeterministicId(data);
            expect(id1).toBe(id2);
            expect(id1.length).toBe(16);
        });
        it('should generate different IDs for different inputs', () => {
            const data1 = 'first data';
            const data2 = 'second data';
            const id1 = cryptoUtils.generateDeterministicId(data1);
            const id2 = cryptoUtils.generateDeterministicId(data2);
            expect(id1).not.toBe(id2);
        });
    });
});
//# sourceMappingURL=crypto.test.js.map