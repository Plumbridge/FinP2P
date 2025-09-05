#!/usr/bin/env node

/**
 * RUN EMPIRICAL BENCHMARK SCRIPT
 * 
 * This script runs the empirical blockchain interoperability benchmark
 * that implements the exact methodology described in the dissertation.
 * 
 * Usage: node scripts/run-empirical-benchmark.js
 */

const path = require('path');
const EmpiricalBenchmark = require('../testing/benchmark/empirical-benchmark');

async function main() {
    console.log('🚀 Starting Empirical Blockchain Interoperability Benchmark');
    console.log('📋 Implementing dissertation methodology for real measurements');
    console.log('=' .repeat(80));
    
    try {
        // Create benchmark instance with dissertation-specified parameters
        const benchmark = new EmpiricalBenchmark({
            iterations: 10, // 10 iterations for statistical significance
            loadTestDuration: 60000, // 60 seconds for throughput testing
            availabilityCheckInterval: 60000, // 60 seconds as per dissertation
            availabilityTestDuration: 300000 // 5 minutes for availability monitoring
        });
        
        console.log('\n📊 Benchmark Configuration:');
        console.log(`   🔄 Iterations: ${benchmark.config.iterations}`);
        console.log(`   ⚡ Load Test Duration: ${benchmark.config.loadTestDuration / 1000} seconds`);
        console.log(`   📡 Availability Check Interval: ${benchmark.config.availabilityCheckInterval / 1000} seconds`);
        console.log(`   ⏱️  Availability Test Duration: ${benchmark.config.availabilityTestDuration / 1000 / 60} minutes`);
        console.log('=' .repeat(80));
        
        // Run the empirical benchmark
        const results = await benchmark.run();
        
        console.log('\n✅ Empirical benchmark completed successfully!');
        console.log('📊 Reports generated:');
        console.log(`   📄 JSON: ${results.jsonPath}`);
        console.log(`   📄 Markdown: ${results.mdPath}`);
        
        console.log('\n🎯 Key Findings:');
        console.log('   • Real performance metrics collected for all solutions');
        console.log('   • Cross-chain transaction latency measured in milliseconds');
        console.log('   • Throughput scalability tested under continuous load');
        console.log('   • System availability monitored with 60-second intervals');
        console.log('   • Fault recovery time measured in real failure scenarios');
        
        console.log('\n📋 Next Steps:');
        console.log('   1. Review generated reports for empirical data');
        console.log('   2. Analyze performance characteristics across solutions');
        console.log('   3. Use results for dissertation empirical validation');
        console.log('   4. Consider additional testing scenarios if needed');
        
    } catch (error) {
        console.error('\n❌ Empirical benchmark failed:', error);
        console.error('\n🔧 Troubleshooting:');
        console.error('   1. Check environment variables are set correctly');
        console.error('   2. Ensure blockchain networks are accessible');
        console.error('   3. Verify adapter configurations');
        console.error('   4. Check network connectivity');
        
        process.exit(1);
    }
}

// Run the main function
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };
