/**
 * Environment Variable Test
 * 
 * Simple test to verify .env file loading
 */

describe('Environment Variables Test', () => {
    
    test('should load environment variables from .env file', () => {
        console.log('\n🔧 Environment Variables Test');
        console.log('=' .repeat(50));
        
        // Test all the variables we need
        const envVars = {
            'CCIP_ROUTER_ADDRESS': process.env.CCIP_ROUTER_ADDRESS,
            'HEDERA_TESTNET_ROUTER': process.env.HEDERA_TESTNET_ROUTER,
            'DESTINATION_CHAIN_SELECTOR': process.env.DESTINATION_CHAIN_SELECTOR,
            'LINK_TOKEN_ADDRESS': process.env.LINK_TOKEN_ADDRESS,
            'ETHEREUM_RPC_URL': process.env.ETHEREUM_RPC_URL,
            'PRIVATE_KEY': process.env.PRIVATE_KEY
        };
        
        console.log('📋 Environment Variables Status:');
        let workingVars = 0;
        
        for (const [name, value] of Object.entries(envVars)) {
            if (value) {
                console.log(`   ✅ ${name}: ${value.substring(0, 20)}...`);
                workingVars++;
            } else {
                console.log(`   ❌ ${name}: NOT SET`);
            }
        }
        
        console.log(`\n📊 Summary: ${workingVars}/${Object.keys(envVars).length} variables loaded`);
        
        // Test passes if we have the essential variables
        expect(workingVars).toBeGreaterThan(3); // At least 4 should work
    });
    
    test('should have working CCIP configuration', () => {
        console.log('\n🎯 CCIP Configuration Test');
        console.log('=' .repeat(40));
        
        // Check essential CCIP variables
        const ccipConfig = {
            sourceRouter: process.env.CCIP_ROUTER_ADDRESS,
            hederaRouter: process.env.HEDERA_TESTNET_ROUTER,
            hederaSelector: process.env.DESTINATION_CHAIN_SELECTOR,
            linkToken: process.env.LINK_TOKEN_ADDRESS
        };
        
        console.log('🔧 CCIP Configuration:');
        for (const [name, value] of Object.entries(ccipConfig)) {
            if (value) {
                console.log(`   ✅ ${name}: ${value.substring(0, 20)}...`);
            } else {
                console.log(`   ❌ ${name}: NOT SET`);
            }
        }
        
        // All CCIP variables should be set
        const missingVars = Object.values(ccipConfig).filter(v => !v).length;
        expect(missingVars).toBe(0);
    });
});
