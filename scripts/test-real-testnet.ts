#!/usr/bin/env ts-node

/**
 * Real Testnet Connection Verification Script
 * 
 * This script tests actual connections to Sui and Hedera testnets
 * using real network endpoints and credentials.
 * 
 * Usage:
 *   npm run test:testnet
 *   or
 *   npx ts-node scripts/test-real-testnet.ts
 * 
 * Environment Variables Required:
 *   - SUI_PRIVATE_KEY: Private key for Sui testnet
 *   - SUI_RPC_URL: (optional) Sui RPC endpoint, defaults to official testnet
 *   - HEDERA_OPERATOR_ID: Hedera operator account ID
 *   - HEDERA_OPERATOR_KEY: Hedera operator private key
 *   - HEDERA_TREASURY_ID: (optional) Treasury account ID
 *   - HEDERA_TREASURY_KEY: (optional) Treasury private key
 */

import { TestnetVerifier } from './verify-testnet-connections';
import * as dotenv from 'dotenv';
import { createLogger } from '../src/utils/logger';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.testnet' });

const logger = createLogger({ level: 'info' });

class RealTestnetRunner {
  private verifier: TestnetVerifier;

  constructor() {
    this.verifier = new TestnetVerifier();
  }

  async validateEnvironment(): Promise<boolean> {
    console.log('🔍 Validating Environment Variables...');
    
    const requiredVars = {
      'SUI_PRIVATE_KEY': process.env.SUI_PRIVATE_KEY,
      'HEDERA_OPERATOR_ID': process.env.HEDERA_OPERATOR_ID,
      'HEDERA_OPERATOR_KEY': process.env.HEDERA_OPERATOR_KEY
    };

    const optionalVars = {
      'SUI_RPC_URL': process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443',
      'HEDERA_TREASURY_ID': process.env.HEDERA_TREASURY_ID || process.env.HEDERA_OPERATOR_ID,
      'HEDERA_TREASURY_KEY': process.env.HEDERA_TREASURY_KEY || process.env.HEDERA_OPERATOR_KEY
    };

    let allValid = true;

    // Check required variables
    for (const [key, value] of Object.entries(requiredVars)) {
      if (!value) {
        console.log(`❌ Missing required environment variable: ${key}`);
        allValid = false;
      } else {
        console.log(`✅ ${key}: ${this.maskSensitiveValue(value)}`);
      }
    }

    // Show optional variables
    console.log('\n📋 Optional Variables (using defaults if not set):');
    for (const [key, value] of Object.entries(optionalVars)) {
      console.log(`ℹ️  ${key}: ${this.maskSensitiveValue(value || 'not set')}`);
    }

    if (!allValid) {
      console.log('\n❌ Please set all required environment variables before running testnet verification.');
      console.log('\n💡 You can create a .env.testnet file with your credentials:');
      console.log('   SUI_PRIVATE_KEY=your_sui_private_key');
      console.log('   HEDERA_OPERATOR_ID=0.0.xxxxx');
      console.log('   HEDERA_OPERATOR_KEY=your_hedera_private_key');
    }

    return allValid;
  }

  private maskSensitiveValue(value: string): string {
    if (value.length <= 8) {
      return '*'.repeat(value.length);
    }
    return value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4);
  }

  async runTests(): Promise<void> {
    console.log('\n🚀 Starting Real Testnet Connection Tests');
    console.log('==========================================');
    console.log('⚠️  This will make actual network calls to testnets');
    console.log('⚠️  Ensure you have sufficient testnet funds\n');

    try {
      // Run Sui testnet verification
      await this.verifier.verifySuiTestnet();
      
      // Add a small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Run Hedera testnet verification
      await this.verifier.verifyHederaTestnet();
      
      // Print summary
      this.verifier.printSummary();
      
    } catch (error: any) {
      console.error('❌ Testnet verification failed:', error.message);
      logger.error('Testnet verification error:', error);
      process.exit(1);
    }
  }

  async run(): Promise<void> {
    console.log('🔗 Real Testnet Connection Verifier');
    console.log('===================================\n');
    
    // Validate environment first
    const envValid = await this.validateEnvironment();
    if (!envValid) {
      process.exit(1);
    }

    // Run the actual tests
    await this.runTests();
  }
}

// Main execution
async function main() {
  const runner = new RealTestnetRunner();
  await runner.run();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  });
}

export { RealTestnetRunner };