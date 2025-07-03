#!/usr/bin/env ts-node

/**
 * Verification script for real testnet connections
 * This script tests actual connections to Sui and Hedera testnets
 * 
 * Usage:
 *   npm run verify:testnet
 * 
 * Environment variables required:
 *   - SUI_RPC_URL (optional, defaults to Sui testnet)
 *   - SUI_PRIVATE_KEY (required for Sui tests)
 *   - HEDERA_OPERATOR_ID (required for Hedera tests)
 *   - HEDERA_OPERATOR_KEY (required for Hedera tests)
 *   - HEDERA_TREASURY_ID (optional, defaults to operator)
 *   - HEDERA_TREASURY_KEY (optional, defaults to operator key)
 */

import { SuiAdapter } from '../src/adapters/SuiAdapter';
import { HederaAdapter } from '../src/adapters/HederaAdapter';
import { createLogger } from '../src/utils/logger';
import { LedgerType } from '../src/types';

const logger = createLogger({ level: 'info' });

interface TestResult {
  adapter: string;
  test: string;
  success: boolean;
  error?: string;
  duration?: number;
}

class TestnetVerifier {
  private results: TestResult[] = [];

  private addResult(adapter: string, test: string, success: boolean, error?: string, duration?: number) {
    this.results.push({ adapter, test, success, error, duration });
  }

  private async timeTest<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      return { result, duration };
    } catch (error) {
      const duration = Date.now() - start;
      throw { error, duration };
    }
  }

  async verifySuiTestnet(): Promise<void> {
    console.log('\n🔍 Verifying Sui Testnet Connection...');
    
    const privateKey = process.env.SUI_PRIVATE_KEY;
    if (!privateKey) {
      this.addResult('Sui', 'Environment Check', false, 'SUI_PRIVATE_KEY not provided');
      console.log('❌ SUI_PRIVATE_KEY environment variable is required');
      return;
    }

    const rpcUrl = process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443';
    
    try {
      const config = {
        rpcUrl,
        privateKey,
        packageId: '0x1', // Default package for testing
        network: 'testnet' as const
      };

      const adapter = new SuiAdapter(config, logger);
      
      // Test 1: Connection
      try {
        const { duration } = await this.timeTest(() => adapter.connect());
        this.addResult('Sui', 'Connection', true, undefined, duration);
        console.log(`✅ Connected to Sui testnet (${duration}ms)`);
      } catch (err: any) {
        this.addResult('Sui', 'Connection', false, err.error?.message || err.message, err.duration);
        console.log(`❌ Failed to connect to Sui testnet: ${err.error?.message || err.message}`);
        return;
      }

      // Test 2: Check if connected
      const isConnected = adapter.isConnected();
      this.addResult('Sui', 'Connection Status', isConnected);
      console.log(`${isConnected ? '✅' : '❌'} Connection status: ${isConnected}`);

      // Test 3: Get account info
      try {
        const { result: account, duration } = await this.timeTest(() => 
          adapter.getAccount((adapter as any).address)
        );
        this.addResult('Sui', 'Account Retrieval', true, undefined, duration);
        console.log(`✅ Retrieved account info (${duration}ms)`);
        if (account) {
          console.log(`   Address: ${account.finId.id}`);
          console.log(`   Balances: ${Object.keys(account.balances).length} assets`);
        }
      } catch (err: any) {
        this.addResult('Sui', 'Account Retrieval', false, err.error?.message || err.message, err.duration);
        console.log(`❌ Failed to retrieve account: ${err.error?.message || err.message}`);
      }

      // Test 4: Get balance
      try {
        const { result: balance, duration } = await this.timeTest(() => 
          adapter.getBalance((adapter as any).address, 'SUI')
        );
        this.addResult('Sui', 'Balance Query', true, undefined, duration);
        console.log(`✅ Retrieved SUI balance: ${balance} (${duration}ms)`);
      } catch (err: any) {
        this.addResult('Sui', 'Balance Query', false, err.error?.message || err.message, err.duration);
        console.log(`❌ Failed to get balance: ${err.error?.message || err.message}`);
      }

      // Cleanup
      await adapter.disconnect();
      console.log('✅ Disconnected from Sui testnet');

    } catch (error: any) {
      this.addResult('Sui', 'General', false, error.message);
      console.log(`❌ Sui testnet verification failed: ${error.message}`);
    }
  }

  async verifyHederaTestnet(): Promise<void> {
    console.log('\n🔍 Verifying Hedera Testnet Connection...');
    
    const operatorId = process.env.HEDERA_OPERATOR_ID;
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    
    if (!operatorId || !operatorKey) {
      this.addResult('Hedera', 'Environment Check', false, 'HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY required');
      console.log('❌ HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY environment variables are required');
      return;
    }

    try {
      const config = {
        network: 'testnet' as const,
        operatorId,
        operatorKey,
        treasuryId: process.env.HEDERA_TREASURY_ID || operatorId,
        treasuryKey: process.env.HEDERA_TREASURY_KEY || operatorKey
      };

      const adapter = new HederaAdapter(config, logger);
      
      // Test 1: Connection
      try {
        const { duration } = await this.timeTest(() => adapter.connect());
        this.addResult('Hedera', 'Connection', true, undefined, duration);
        console.log(`✅ Connected to Hedera testnet (${duration}ms)`);
      } catch (err: any) {
        this.addResult('Hedera', 'Connection', false, err.error?.message || err.message, err.duration);
        console.log(`❌ Failed to connect to Hedera testnet: ${err.error?.message || err.message}`);
        return;
      }

      // Test 2: Check if connected
      const isConnected = adapter.isConnected();
      this.addResult('Hedera', 'Connection Status', isConnected);
      console.log(`${isConnected ? '✅' : '❌'} Connection status: ${isConnected}`);

      // Test 3: Get account info
      try {
        const { result: account, duration } = await this.timeTest(() => 
          adapter.getAccount(operatorId)
        );
        this.addResult('Hedera', 'Account Retrieval', true, undefined, duration);
        console.log(`✅ Retrieved account info (${duration}ms)`);
        if (account) {
          console.log(`   Account ID: ${account.finId.id}`);
          console.log(`   Balances: ${Object.keys(account.balances).length} assets`);
        }
      } catch (err: any) {
        this.addResult('Hedera', 'Account Retrieval', false, err.error?.message || err.message, err.duration);
        console.log(`❌ Failed to retrieve account: ${err.error?.message || err.message}`);
      }

      // Test 4: Get HBAR balance
      try {
        const { result: balance, duration } = await this.timeTest(() => 
          adapter.getBalance(operatorId, 'HBAR')
        );
        this.addResult('Hedera', 'Balance Query', true, undefined, duration);
        console.log(`✅ Retrieved HBAR balance: ${balance} tinybars (${duration}ms)`);
      } catch (err: any) {
        this.addResult('Hedera', 'Balance Query', false, err.error?.message || err.message, err.duration);
        console.log(`❌ Failed to get balance: ${err.error?.message || err.message}`);
      }

      // Cleanup
      await adapter.disconnect();
      console.log('✅ Disconnected from Hedera testnet');

    } catch (error: any) {
      this.addResult('Hedera', 'General', false, error.message);
      console.log(`❌ Hedera testnet verification failed: ${error.message}`);
    }
  }

  printSummary(): void {
    console.log('\n📊 Test Summary');
    console.log('================');
    
    const suiResults = this.results.filter(r => r.adapter === 'Sui');
    const hederaResults = this.results.filter(r => r.adapter === 'Hedera');
    
    console.log('\nSui Testnet:');
    suiResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = result.duration ? ` (${result.duration}ms)` : '';
      const error = result.error ? ` - ${result.error}` : '';
      console.log(`  ${status} ${result.test}${duration}${error}`);
    });
    
    console.log('\nHedera Testnet:');
    hederaResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = result.duration ? ` (${result.duration}ms)` : '';
      const error = result.error ? ` - ${result.error}` : '';
      console.log(`  ${status} ${result.test}${duration}${error}`);
    });
    
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`\nOverall: ${passedTests}/${totalTests} tests passed`);
    if (failedTests > 0) {
      console.log(`❌ ${failedTests} test(s) failed`);
      process.exit(1);
    } else {
      console.log('✅ All tests passed!');
    }
  }
}

async function main() {
  console.log('🚀 Starting Testnet Connection Verification');
  console.log('===========================================');
  
  const verifier = new TestnetVerifier();
  
  await verifier.verifySuiTestnet();
  await verifier.verifyHederaTestnet();
  
  verifier.printSummary();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
}

export { TestnetVerifier };