# Adding New Blockchain Adapters to FinP2P

This guide provides step-by-step instructions for adding support for new blockchains to the FinP2P cross-ledger transfer system.

## Overview

Adding a new blockchain adapter typically takes **6-10 hours** and involves:
1. Implementing the `LedgerAdapter` interface
2. Setting up blockchain-specific client connections
3. Implementing core operations (assets, accounts, transfers)
4. Adding comprehensive error handling
5. Writing tests and documentation

## Prerequisites

- TypeScript/JavaScript knowledge
- Understanding of the target blockchain's SDK/API
- Access to blockchain testnet
- Test accounts with funding

## Step 1: Create Adapter Structure (15-30 minutes)

### 1.1 Create the Adapter File

Create `src/adapters/YourBlockchainAdapter.ts`:

```typescript
import { Logger } from 'winston';
import {
  LedgerAdapter,
  LedgerType,
  Asset,
  Account,
  Transaction,
  TransactionStatus,
  FinID
} from '../types';

// Import blockchain-specific SDK
import { YourBlockchainClient, YourBlockchainConfig } from 'your-blockchain-sdk';

export interface YourBlockchainAdapterConfig {
  network: 'mainnet' | 'testnet' | 'devnet';
  privateKey?: string;
  rpcUrl?: string;
  // Add blockchain-specific config options
}

export class YourBlockchainAdapter implements LedgerAdapter {
  public readonly ledgerId: string = 'your-blockchain';
  public readonly name: string = 'Your Blockchain Network';
  public readonly type: LedgerType = LedgerType.YOUR_BLOCKCHAIN; // Add to enum

  private client!: YourBlockchainClient;
  private config: YourBlockchainAdapterConfig;
  private logger: Logger;
  private connected: boolean = false;

  constructor(config: YourBlockchainAdapterConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  // Implement all required methods...
}
```

### 1.2 Update Type Definitions

Add your blockchain to `src/types/index.ts`:

```typescript
export enum LedgerType {
  MOCK = 'mock',
  SUI = 'sui',
  HEDERA = 'hedera',
  YOUR_BLOCKCHAIN = 'your-blockchain' // Add this line
}
```

### 1.3 Export the Adapter

Update `src/adapters/index.ts`:

```typescript
export { MockAdapter } from './MockAdapter';
export { SuiAdapter } from './SuiAdapter';
export { HederaAdapter } from './HederaAdapter';
export { YourBlockchainAdapter } from './YourBlockchainAdapter'; // Add this line
```

## Step 2: Implement Core Methods (2-4 hours)

### 2.1 Connection Management

```typescript
async connect(): Promise<void> {
  try {
    // Initialize blockchain client
    this.client = new YourBlockchainClient({
      network: this.config.network,
      rpcUrl: this.config.rpcUrl
    });

    // Test connection
    const networkInfo = await this.client.getNetworkInfo();
    this.logger.info(`Connected to ${this.name}: ${networkInfo.chainId}`);
    
    this.connected = true;
  } catch (error) {
    this.logger.error('Failed to connect to blockchain:', error);
    throw error;
  }
}

async disconnect(): Promise<void> {
  if (this.client) {
    await this.client.disconnect();
  }
  this.connected = false;
  this.logger.info(`Disconnected from ${this.name}`);
}

isConnected(): boolean {
  return this.connected;
}
```

### 2.2 Asset Management

```typescript
async createAsset(assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset> {
  if (!this.connected) {
    throw new Error('Not connected to blockchain');
  }

  try {
    // Create asset/token on blockchain
    const transaction = await this.client.createToken({
      name: assetData.name,
      symbol: assetData.symbol,
      decimals: assetData.decimals,
      totalSupply: assetData.totalSupply.toString(),
      metadata: JSON.stringify(assetData.metadata)
    });

    // Wait for confirmation
    const receipt = await transaction.wait();
    
    if (!receipt.success) {
      throw new Error(`Asset creation failed: ${receipt.error}`);
    }

    const asset: Asset = {
      id: receipt.tokenId,
      finId: {
        id: receipt.tokenId,
        type: 'asset',
        domain: 'your-blockchain.network'
      },
      symbol: assetData.symbol,
      name: assetData.name,
      decimals: assetData.decimals,
      totalSupply: assetData.totalSupply,
      ledgerId: this.ledgerId,
      contractAddress: receipt.contractAddress,
      metadata: assetData.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.logger.info(`Created asset ${asset.symbol} with ID: ${asset.id}`);
    return asset;
  } catch (error) {
    this.logger.error('Failed to create asset:', error);
    throw error;
  }
}

async getAsset(assetId: string): Promise<Asset | null> {
  if (!this.connected) {
    throw new Error('Not connected to blockchain');
  }

  try {
    const tokenInfo = await this.client.getTokenInfo(assetId);
    
    if (!tokenInfo) {
      return null;
    }

    const asset: Asset = {
      id: assetId,
      finId: {
        id: assetId,
        type: 'asset',
        domain: 'your-blockchain.network'
      },
      symbol: tokenInfo.symbol,
      name: tokenInfo.name,
      decimals: tokenInfo.decimals,
      totalSupply: BigInt(tokenInfo.totalSupply),
      ledgerId: this.ledgerId,
      contractAddress: tokenInfo.contractAddress,
      metadata: JSON.parse(tokenInfo.metadata || '{}'),
      createdAt: new Date(tokenInfo.createdAt),
      updatedAt: new Date(tokenInfo.updatedAt)
    };

    return asset;
  } catch (error) {
    this.logger.error(`Failed to get asset ${assetId}:`, error);
    return null;
  }
}
```

### 2.3 Account Management

```typescript
async createAccount(accountData: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
  if (!this.connected) {
    throw new Error('Not connected to blockchain');
  }

  try {
    // Create or register account on blockchain
    const accountResult = await this.client.createAccount({
      address: accountData.address,
      metadata: JSON.stringify(accountData.metadata)
    });

    const account: Account = {
      id: accountResult.accountId,
      finId: {
        id: accountResult.accountId,
        type: 'account',
        domain: 'your-blockchain.network'
      },
      address: accountData.address,
      ledgerId: this.ledgerId,
      institutionId: accountData.institutionId,
      balances: new Map(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.logger.info(`Created account with ID: ${account.id}`);
    return account;
  } catch (error) {
    this.logger.error('Failed to create account:', error);
    throw error;
  }
}

async getAccount(accountId: string): Promise<Account | null> {
  if (!this.connected) {
    throw new Error('Not connected to blockchain');
  }

  try {
    const accountInfo = await this.client.getAccountInfo(accountId);
    
    if (!accountInfo) {
      return null;
    }

    const account: Account = {
      id: accountId,
      finId: {
        id: accountId,
        type: 'account',
        domain: 'your-blockchain.network'
      },
      address: accountInfo.address,
      ledgerId: this.ledgerId,
      institutionId: accountInfo.institutionId,
      balances: new Map(Object.entries(accountInfo.balances)),
      createdAt: new Date(accountInfo.createdAt),
      updatedAt: new Date(accountInfo.updatedAt)
    };

    return account;
  } catch (error) {
    this.logger.error(`Failed to get account ${accountId}:`, error);
    return null;
  }
}
```

### 2.4 Balance and Transfer Operations

```typescript
async getBalance(accountId: string, assetId: string): Promise<bigint> {
  if (!this.connected) {
    throw new Error('Not connected to blockchain');
  }

  try {
    const balance = await this.client.getBalance(accountId, assetId);
    return BigInt(balance.toString());
  } catch (error) {
    this.logger.error(`Failed to get balance for account ${accountId}, asset ${assetId}:`, error);
    throw error;
  }
}

async transfer(from: string, to: string, assetId: string, amount: bigint): Promise<string> {
  if (!this.connected) {
    throw new Error('Not connected to blockchain');
  }

  try {
    const transaction = await this.client.transfer({
      from,
      to,
      tokenId: assetId,
      amount: amount.toString()
    });

    const receipt = await transaction.wait();
    
    if (!receipt.success) {
      throw new Error(`Transfer failed: ${receipt.error}`);
    }

    const txHash = receipt.transactionHash;
    this.logger.info(`Transfer completed: ${txHash}`);
    return txHash;
  } catch (error) {
    this.logger.error('Failed to execute transfer:', error);
    throw error;
  }
}

async lockAsset(accountId: string, assetId: string, amount: bigint): Promise<string> {
  if (!this.connected) {
    throw new Error('Not connected to blockchain');
  }

  try {
    const transaction = await this.client.lockTokens({
      accountId,
      tokenId: assetId,
      amount: amount.toString()
    });

    const receipt = await transaction.wait();
    
    if (!receipt.success) {
      throw new Error(`Asset lock failed: ${receipt.error}`);
    }

    const txHash = receipt.transactionHash;
    this.logger.info(`Asset locked: ${txHash}`);
    return txHash;
  } catch (error) {
    this.logger.error('Failed to lock asset:', error);
    throw error;
  }
}

async unlockAsset(accountId: string, assetId: string, amount: bigint): Promise<string> {
  if (!this.connected) {
    throw new Error('Not connected to blockchain');
  }

  try {
    const transaction = await this.client.unlockTokens({
      accountId,
      tokenId: assetId,
      amount: amount.toString()
    });

    const receipt = await transaction.wait();
    
    if (!receipt.success) {
      throw new Error(`Asset unlock failed: ${receipt.error}`);
    }

    const txHash = receipt.transactionHash;
    this.logger.info(`Asset unlocked: ${txHash}`);
    return txHash;
  } catch (error) {
    this.logger.error('Failed to unlock asset:', error);
    throw error;
  }
}
```

## Step 3: Add Error Handling (1-2 hours)

### 3.1 Network Error Handling

```typescript
private async handleNetworkError(error: any): Promise<never> {
  if (error.code === 'NETWORK_ERROR') {
    this.logger.error('Network connectivity issue detected');
    this.connected = false;
    throw new Error('Blockchain network unreachable. Please check your connection.');
  }
  
  if (error.code === 'TIMEOUT') {
    this.logger.error('Request timeout');
    throw new Error('Blockchain request timed out. Please try again.');
  }
  
  throw error;
}
```

### 3.2 Transaction Error Handling

```typescript
private handleTransactionError(error: any): never {
  if (error.code === 'INSUFFICIENT_FUNDS') {
    throw new Error('Insufficient balance for transaction');
  }
  
  if (error.code === 'INVALID_SIGNATURE') {
    throw new Error('Invalid transaction signature');
  }
  
  if (error.code === 'GAS_LIMIT_EXCEEDED') {
    throw new Error('Transaction gas limit exceeded');
  }
  
  if (error.code === 'NONCE_TOO_LOW') {
    throw new Error('Transaction nonce too low');
  }
  
  throw new Error(`Transaction failed: ${error.message}`);
}
```

### 3.3 Retry Logic

```typescript
private async withRetry<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      this.logger.warn(`Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}
```

## Step 4: Testing & Integration (2-3 hours)

### 4.1 Unit Tests

Create `tests/adapters/YourBlockchainAdapter.test.ts`:

```typescript
import { YourBlockchainAdapter } from '../../src/adapters/YourBlockchainAdapter';
import { createLogger } from 'winston';

describe('YourBlockchainAdapter', () => {
  let adapter: YourBlockchainAdapter;
  let logger: any;

  beforeEach(() => {
    logger = createLogger({ silent: true });
    adapter = new YourBlockchainAdapter({
      network: 'testnet',
      rpcUrl: 'https://testnet.your-blockchain.com'
    }, logger);
  });

  describe('Connection', () => {
    it('should connect successfully', async () => {
      await adapter.connect();
      expect(adapter.isConnected()).toBe(true);
    });

    it('should handle connection errors', async () => {
      const invalidAdapter = new YourBlockchainAdapter({
        network: 'testnet',
        rpcUrl: 'https://invalid-url.com'
      }, logger);

      await expect(invalidAdapter.connect()).rejects.toThrow();
    });
  });

  describe('Asset Operations', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should create asset successfully', async () => {
      const assetData = {
        symbol: 'TEST',
        name: 'Test Token',
        decimals: 8,
        totalSupply: BigInt('1000000'),
        metadata: { test: true }
      };

      const asset = await adapter.createAsset(assetData);
      expect(asset.symbol).toBe('TEST');
      expect(asset.id).toBeDefined();
    });
  });

  // Add more tests for accounts, transfers, error scenarios...
});
```

### 4.2 Integration Tests

Create `tests/integration/YourBlockchainIntegration.test.ts`:

```typescript
import { YourBlockchainAdapter } from '../../src/adapters/YourBlockchainAdapter';

describe('YourBlockchain Integration Tests', () => {
  let adapter: YourBlockchainAdapter;

  beforeAll(async () => {
    // Use testnet configuration
    adapter = new YourBlockchainAdapter({
      network: 'testnet',
      privateKey: process.env.YOUR_BLOCKCHAIN_PRIVATE_KEY,
      rpcUrl: process.env.YOUR_BLOCKCHAIN_RPC_URL
    }, logger);
    
    await adapter.connect();
  });

  it('should perform end-to-end asset creation and transfer', async () => {
    // Create asset
    const asset = await adapter.createAsset({
      symbol: 'E2E',
      name: 'End-to-End Test Token',
      decimals: 8,
      totalSupply: BigInt('1000000'),
      metadata: {}
    });

    // Create accounts
    const account1 = await adapter.createAccount({
      address: 'test-address-1',
      institutionId: 'test-institution'
    });

    const account2 = await adapter.createAccount({
      address: 'test-address-2',
      institutionId: 'test-institution'
    });

    // Check initial balances
    const initialBalance = await adapter.getBalance(account1.id, asset.id);
    expect(initialBalance).toBeGreaterThan(0n);

    // Perform transfer
    const transferAmount = BigInt('1000');
    const txHash = await adapter.transfer(
      account1.id,
      account2.id,
      asset.id,
      transferAmount
    );

    expect(txHash).toBeDefined();

    // Verify balances after transfer
    const finalBalance1 = await adapter.getBalance(account1.id, asset.id);
    const finalBalance2 = await adapter.getBalance(account2.id, asset.id);

    expect(finalBalance1).toBe(initialBalance - transferAmount);
    expect(finalBalance2).toBe(transferAmount);
  });
});
```

### 4.3 Performance Benchmarks

Add your adapter to the performance test suite:

```typescript
// In performance-test-suite.js
const { YourBlockchainAdapter } = require('./dist/adapters/YourBlockchainAdapter');

// Add configuration
const YOUR_BLOCKCHAIN_CONFIG = {
  network: 'testnet',
  privateKey: process.env.YOUR_BLOCKCHAIN_PRIVATE_KEY,
  rpcUrl: process.env.YOUR_BLOCKCHAIN_RPC_URL
};

// Add to test suite
async testYourBlockchainOperations() {
  // Similar to Sui/Hedera tests
}
```

## Step 5: Documentation (30-60 minutes)

### 5.1 Update README

Add your blockchain to the main README.md:

```markdown
## Supported Blockchains

- ✅ Sui Network (Testnet/Mainnet)
- ✅ Hedera Hashgraph (Testnet/Mainnet)
- ✅ Your Blockchain (Testnet/Mainnet) <!-- Add this line -->
- 🔄 Ethereum (Coming Soon)
- 🔄 Polygon (Coming Soon)
```

### 5.2 Create Adapter Documentation

Create `docs/adapters/your-blockchain.md`:

```markdown
# Your Blockchain Adapter

## Overview

The Your Blockchain adapter enables FinP2P to interact with Your Blockchain network for cross-ledger transfers.

## Configuration

```typescript
const config = {
  network: 'testnet', // or 'mainnet'
  privateKey: 'your-private-key',
  rpcUrl: 'https://rpc.your-blockchain.com'
};
```

## Usage

```typescript
import { YourBlockchainAdapter } from '@finp2p/adapters';

const adapter = new YourBlockchainAdapter(config, logger);
await adapter.connect();

// Create asset
const asset = await adapter.createAsset({
  symbol: 'TOKEN',
  name: 'My Token',
  decimals: 8,
  totalSupply: BigInt('1000000')
});
```

## Error Handling

- Network connectivity issues
- Invalid credentials
- Insufficient balance
- Transaction failures

## Performance

- Average transaction time: ~X seconds
- Throughput: ~X TPS
- Gas costs: ~X units
```

## Step 6: Deployment Checklist

### 6.1 Pre-deployment

- [ ] All unit tests pass
- [ ] Integration tests pass on testnet
- [ ] Performance benchmarks completed
- [ ] Error handling tested
- [ ] Documentation updated
- [ ] Code review completed

### 6.2 Testnet Deployment

- [ ] Deploy to testnet environment
- [ ] Run end-to-end tests
- [ ] Monitor for 24 hours
- [ ] Performance validation
- [ ] Security audit

### 6.3 Mainnet Deployment

- [ ] Mainnet configuration ready
- [ ] Security review completed
- [ ] Monitoring setup
- [ ] Rollback plan prepared
- [ ] Gradual rollout strategy

## Common Pitfalls and Solutions

### 1. SDK Version Compatibility
**Problem:** Blockchain SDK updates breaking compatibility
**Solution:** Pin SDK versions and test thoroughly before updates

### 2. Network Latency
**Problem:** High latency affecting performance
**Solution:** Implement connection pooling and retry logic

### 3. Gas Fee Estimation
**Problem:** Transactions failing due to insufficient gas
**Solution:** Implement dynamic gas estimation with safety margins

### 4. Key Management
**Problem:** Insecure private key handling
**Solution:** Use environment variables and secure key storage

### 5. Error Mapping
**Problem:** Blockchain-specific errors not properly handled
**Solution:** Create comprehensive error mapping and user-friendly messages

## Performance Optimization Tips

1. **Connection Pooling:** Reuse connections when possible
2. **Batch Operations:** Group multiple operations together
3. **Caching:** Cache frequently accessed data
4. **Async Operations:** Use parallel processing where safe
5. **Monitoring:** Implement comprehensive metrics and alerting

## Security Considerations

1. **Private Key Security:** Never log or expose private keys
2. **Input Validation:** Validate all inputs thoroughly
3. **Rate Limiting:** Implement rate limiting for API calls
4. **Audit Trail:** Log all operations for audit purposes
5. **Network Security:** Use secure RPC endpoints

## Support and Troubleshooting

### Common Issues

1. **Connection Timeout**
   - Check network connectivity
   - Verify RPC URL
   - Check firewall settings

2. **Invalid Signature**
   - Verify private key format
   - Check key permissions
   - Validate transaction parameters

3. **Insufficient Balance**
   - Check account balance
   - Verify gas/fee requirements
   - Ensure proper token associations

### Getting Help

- Documentation: [Link to docs]
- GitHub Issues: [Link to issues]
- Community Discord: [Link to Discord]
- Support Email: support@finp2p.io

---

**Estimated Development Time: 6-10 hours**

**Required Skills:**
- TypeScript/JavaScript
- Blockchain SDK knowledge
- Async programming
- Error handling
- Testing frameworks