/**
 * Jest Setup for Real Adapter Tests
 * 
 * Simplified setup for testing real enterprise blockchain adapters
 * No need for FinP2P router mocking since we're testing external solutions
 */

// Load environment variables from .env file
require('dotenv').config({ path: '../../../../.env' });

// Set test timeout to 5 minutes for Cactus test ledger initialization
jest.setTimeout(300000);

// Mock console methods to reduce noise during tests
global.console = {
    ...console,
    // Keep important logs, reduce noise
    log: jest.fn((...args) => {
        // Only log important messages
        const message = args.join(' ');
        if (message.includes('🚀') || message.includes('📊') || message.includes('🏆') || 
            message.includes('✅') || message.includes('❌') || message.includes('🧪')) {
            console.info(...args);
        }
    }),
    info: console.info,
    warn: console.warn,
    error: console.error
};

// Global test utilities
global.testUtils = {
    // Helper to measure performance
    measurePerformance: async (operation, iterations = 1) => {
        const startTime = process.hrtime.bigint();
        const results = [];
        
        for (let i = 0; i < iterations; i++) {
            try {
                const result = await operation();
                results.push({ success: true, result, error: null });
            } catch (error) {
                results.push({ success: false, result: null, error: error.message });
            }
        }
        
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        
        const successCount = results.filter(r => r.success).length;
        const successRate = (successCount / iterations) * 100;
        
        return {
            duration,
            successCount,
            failedCount: iterations - successCount,
            successRate,
            results
        };
    },
    
    // Helper to generate test data
    generateTestData: (size = 100) => {
        const data = [];
        for (let i = 0; i < size; i++) {
            data.push({
                id: `test-${i}-${Date.now()}`,
                timestamp: Date.now() + i,
                data: `test-data-${i}-${Math.random().toString(36).substring(7)}`
            });
        }
        return data;
    },
    
    // Helper to simulate network conditions
    simulateNetworkConditions: {
        normal: () => Promise.resolve(),
        slow: () => new Promise(resolve => setTimeout(resolve, 1000)),
        unstable: () => new Promise((resolve, reject) => {
            if (Math.random() > 0.8) {
                reject(new Error('Network instability simulation'));
            } else {
                resolve();
            }
        })
    }
};

// Clean up after each test
afterEach(() => {
    jest.clearAllMocks();
});

// Global test environment setup
beforeAll(() => {
    console.log('🧪 Real Adapter Test Environment Initialized');
    console.log('📊 Testing: Chainlink CCIP and FinP2P comparison');
    
    // Debug environment variables
    console.log('🔧 Environment Variables Debug:');
    console.log(`   HEDERA_TESTNET_ROUTER: ${process.env.HEDERA_TESTNET_ROUTER || 'NOT SET'}`);
    console.log(`   DESTINATION_CHAIN_SELECTOR: ${process.env.DESTINATION_CHAIN_SELECTOR || 'NOT SET'}`);
    console.log(`   LINK_TOKEN_ADDRESS: ${process.env.LINK_TOKEN_ADDRESS || 'NOT SET'}`);
    console.log(`   CCIP_ROUTER_ADDRESS: ${process.env.CCIP_ROUTER_ADDRESS || 'NOT SET'}`);
});

afterAll(() => {
    console.log('🏁 Real Adapter Test Environment Cleaned Up');
});
