import { ComprehensiveDomainBenchmark } from './benchmark/benchmark-comprehensive-domains';

async function testPerformanceMetrics() {
    console.log('🧪 Testing Performance Metrics Capture...');
    
    const benchmark = new ComprehensiveDomainBenchmark({
        iterations: 3,
        timeout: 30000,
        retries: 2
    });
    
    try {
        await benchmark.initialize();
        
        // Test just the performance metrics
        console.log('\n📊 Testing Cross-Chain Transaction Latency...');
        const latencyResults = await benchmark.testCrossChainTransactionLatency('finp2p');
        console.log('Latency Results:', JSON.stringify(latencyResults, null, 2));
        
        console.log('\n📊 Testing Throughput Scalability...');
        const throughputResults = await benchmark.testThroughputScalability('finp2p');
        console.log('Throughput Results:', JSON.stringify(throughputResults, null, 2));
        
        console.log('\n📊 Testing Fault Recovery...');
        const recoveryResults = await benchmark.testFaultRecoveryCapabilities('finp2p');
        console.log('Recovery Results:', JSON.stringify(recoveryResults, null, 2));
        
        await benchmark.cleanup();
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testPerformanceMetrics();
