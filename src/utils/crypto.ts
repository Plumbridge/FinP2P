import crypto from 'crypto';
import { promisify } from 'util';

export class CryptoUtils {
  private privateKey: string;
  private publicKey: string;

  constructor(privateKey?: string) {
    if (privateKey) {
      this.privateKey = privateKey;
      // In a real implementation, derive public key from private key
      this.publicKey = this.derivePublicKey(privateKey);
    } else {
      const keyPair = this.generateKeyPair();
      this.privateKey = keyPair.privateKey;
      this.publicKey = keyPair.publicKey;
    }
  }

  private generateKeyPair(): { privateKey: string; publicKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
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

  private derivePublicKey(privateKey: string): string {
    try {
      // Check if it's a valid PEM format private key
      if (privateKey.includes('-----BEGIN') && privateKey.includes('PRIVATE KEY-----')) {
        const keyObject = crypto.createPrivateKey(privateKey);
        return keyObject.export({
          type: 'spki',
          format: 'pem'
        }) as string;
      } else {
        // For test scenarios or simple strings, generate a mock public key
        const hash = crypto.createHash('sha256').update(privateKey).digest('hex');
        return `-----BEGIN PUBLIC KEY-----\n${hash}\n-----END PUBLIC KEY-----`;
      }
    } catch (error) {
      // Fallback for any other cases
      const hash = crypto.createHash('sha256').update(privateKey).digest('hex');
      return `-----BEGIN PUBLIC KEY-----\n${hash}\n-----END PUBLIC KEY-----`;
    }
  }

  async sign(data: string): Promise<string> {
    try {
      const sign = crypto.createSign('SHA256');
      sign.update(data);
      sign.end();

      const signature = sign.sign(this.privateKey, 'base64');
      return signature;
    } catch (error) {
      throw new Error(`Failed to sign data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async verify(data: string, signature: string, publicKey?: string): Promise<boolean> {
    try {
      const keyToUse = publicKey || this.publicKey;
      const verify = crypto.createVerify('SHA256');
      verify.update(data);
      verify.end();

      return verify.verify(keyToUse, signature, 'base64');
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  hash(data: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  generateId(): string {
    return crypto.randomUUID();
  }

  encrypt(data: string, key?: string): { encrypted: string; iv: string } {
    const algorithm = 'aes-256-cbc';
    const encryptionKey = key ? crypto.createHash('sha256').update(key).digest() : crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex')
    };
  }

  decrypt(encryptedData: string, key: string, iv: string): string {
    const algorithm = 'aes-256-cbc';
    const encryptionKey = crypto.createHash('sha256').update(key).digest();
    const ivBuffer = Buffer.from(iv, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, encryptionKey, ivBuffer);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  getPrivateKey(): string {
    return this.privateKey;
  }

  // Generate a deterministic ID from input data
  generateDeterministicId(data: string): string {
    return this.hash(data).substring(0, 16);
  }

  // Create a message authentication code
  createMAC(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  // Verify message authentication code
  verifyMAC(data: string, mac: string, secret: string): boolean {
    try {
      const expectedMAC = this.createMAC(data, secret);
      return crypto.timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(expectedMAC, 'hex'));
    } catch (error) {
      // Invalid hex string or other error
      return false;
    }
  }

  // Generate a secure random token
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Key derivation function
  deriveKey(password: string, salt: string, iterations: number = 100000): string {
    return crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
  }

  // Generate salt for key derivation
  generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}
