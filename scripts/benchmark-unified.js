#!/usr/bin/env node

// Load environment variables from .env file (MUST BE FIRST!)
require('dotenv').config();

const { 
    FinP2PSDKRouter,
    FinP2PIntegratedSuiAdapter,
    FinP2PIntegratedHederaAdapter,
    FinP2PIntegratedOverledgerAdapter
} = require('../dist/src/index');
const { createLogger } = require('../dist/src/utils/logger');
const fs = require('fs').promises;
const path = require('path');

// Dynamic port allocation utility
async function findAvailablePort(startPort = 6380) {
    const net = require('net');
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(startPort + Math.floor(Math.random() * 1000) + 1000);
            } else {
                reject(err);
            }
        });
        
        server.listen(startPort, () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
    });
}

/**
 * Unified Blockchain Performance Benchmark
 * 
 * Proper comparison:
 * 1. Pure FinP2P Cross-Chain: Direct SUI→Hedera atomic swap via FinP2P router
 * 2. Overledger Managed Cross-Chain: Same SUI→Hedera swap but managed through Overledger
 * 
 * Both tests do the SAME underlying work, measuring the management overhead of Overledger
 */
class UnifiedBenchmark {
    constructor(iterations = 10) {
        this.testParams = {
            iterations,
            suiAmount: '100000000', // 0.1 SUI in MIST (BigInt compatible)
            hederaAmount: '1000000000' // 10 HBAR in tinybars (BigInt compatible)
        };
        
        this.router = null;
        this.suiAdapter = null;
        this.hederaAdapter = null;
        this.overledgerAdapter = null;
        
        this.logger = createLogger({ level: 'info' });
    }

    async initializeAdapters() {
        try {
            console.log('🔧 Initializing adapters...');
            
            // Find available port for router
            const routerPort = await findAvailablePort();
            console.log(`📡 Router will use port: ${routerPort}`);
            
            // Initialize router first with proper configuration
            this.router = new FinP2PSDKRouter({
                routerId: 'unified-benchmark-router',
                port: routerPort,
                host: 'localhost',
                orgId: 'benchmark-org',
                custodianOrgId: 'benchmark-org',
                owneraAPIAddress: 'mock-api-address-for-benchmark',
                authConfig: {
                    apiKey: 'mock-api-key-for-benchmark',
                    secret: {
                        type: 1,
                        raw: 'mock-private-key-for-benchmark'
                    }
                },
                mockMode: true // Enable mock mode for benchmark
            });
            await this.router.start();
            
            // Initialize SUI adapter
            this.suiAdapter = new FinP2PIntegratedSuiAdapter({
                network: 'testnet',
                rpcUrl: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443',
                privateKey: process.env.SUI_PRIVATE_KEY,
                finp2pRouter: this.router
            }, this.logger);
            await this.suiAdapter.connect();
            
            // Initialize Hedera adapter  
            this.hederaAdapter = new FinP2PIntegratedHederaAdapter({
                network: 'testnet',
                accountId: process.env.HEDERA_ACCOUNT_ID,
                privateKey: process.env.HEDERA_PRIVATE_KEY,
                finp2pRouter: this.router
            }, this.logger);
            await this.hederaAdapter.connect();
            
            // Initialize Overledger management layer with network adapters
            this.overledgerAdapter = new FinP2PIntegratedOverledgerAdapter({
                environment: process.env.OVERLEDGER_ENVIRONMENT || 'sandbox',
                baseUrl: process.env.OVERLEDGER_BASE_URL,
                clientId: process.env.OVERLEDGER_CLIENT_ID || '',
                clientSecret: process.env.OVERLEDGER_CLIENT_SECRET || '',
                transactionSigningKeyId: process.env.OVERLEDGER_TRANSACTION_SIGNING_KEY_ID || '',
                transactionSigningKeyPublic: process.env.OVERLEDGER_TRANSACTION_SIGNING_KEY_PUBLIC || '',
                finp2pRouter: this.router
            }, this.logger);
            
            // Configure managed network adapters for Overledger coordination
            this.overledgerAdapter.setNetworkAdapters(this.suiAdapter, this.hederaAdapter);
            
            await this.overledgerAdapter.connect();
            
            console.log('✅ All adapters initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize adapters:', error);
            throw error;
        }
    }

    async benchmarkPureFinP2PCrossChain() {
        console.log('\n🔄 Benchmarking Pure FinP2P Cross-Chain Coordination...');
        
        const results = {
            approach: 'Pure FinP2P Cross-Chain',
            transfers: [],
            coordinationTimes: []
        };
        
        // Check credentials
        const hasRealSuiCredentials = !!(process.env.SUI_PRIVATE_KEY && process.env.SUI_PRIVATE_KEY.length > 20);
        const hasRealHederaCredentials = !!(process.env.HEDERA_ACCOUNT_ID && process.env.HEDERA_PRIVATE_KEY);
        const hasRealCredentials = hasRealSuiCredentials && hasRealHederaCredentials;
        
        results.mode = hasRealCredentials ? 'real_blockchain' : 'mock_mode';
        
        console.log(`  🔧 Mode: ${results.mode}`);
        console.log(`    - SUI: ${hasRealSuiCredentials ? 'Real' : 'Mock'}`);
        console.log(`    - Hedera: ${hasRealHederaCredentials ? 'Real' : 'Mock'}`);
        console.log(`    - Coordination: Direct FinP2P cross-chain atomic swap`);
        
        for (let i = 0; i < this.testParams.iterations; i++) {
            const overallStart = process.hrtime.bigint();
            
            try {
                console.log(`  Cross-Chain ${i + 1}/${this.testParams.iterations}...`);
                
                // Direct FinP2P cross-chain atomic swap (same operation as Overledger will manage)
                const swapResult = await this.router.executeAtomicSwap({
                    initiatorFinId: 'alice@atomic-swap.demo',
                    responderFinId: 'bob@atomic-swap.demo',
                    initiatorAsset: { 
                        chain: 'sui', 
                        assetId: 'sui-native-token', 
                        amount: this.testParams.suiAmount 
                    },
                    responderAsset: { 
                        chain: 'hedera', 
                        assetId: 'hedera-native-token', 
                        amount: this.testParams.hederaAmount 
                    },
                    timeoutBlocks: 100
                });
                
                const overallEnd = process.hrtime.bigint();
                const totalDuration = Number(overallEnd - overallStart) / 1000000;
                
                results.transfers.push({
                    iteration: i + 1,
                    success: true,
                    duration_ms: totalDuration,
                    swap_id: swapResult.swapId,
                    coordinator: 'Pure FinP2P Router',
                    status: swapResult.status
                });
                
                results.coordinationTimes.push(totalDuration);
                
                console.log(`    ✅ Success in ${totalDuration.toFixed(2)}ms (swap: ${swapResult.swapId})`);
                
            } catch (error) {
                const overallEnd = process.hrtime.bigint();
                const totalDuration = Number(overallEnd - overallStart) / 1000000;
                
                results.transfers.push({
                    iteration: i + 1,
                    success: false,
                    duration_ms: totalDuration,
                    error: error.message
                });
                
                console.log(`    ❌ Failed in ${totalDuration.toFixed(2)}ms: ${error.message}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        this.calculateStats(results);
        return results;
    }

    async benchmarkOverledgerManagedCrossChain() {
        console.log('\n🎯 Benchmarking Overledger Managed Cross-Chain Coordination...');
        
        const results = {
            approach: 'Overledger Managed Cross-Chain',
            transfers: [],
            managementOverhead: []
        };
        
        // Check credentials
        const hasRealSuiCredentials = !!(process.env.SUI_PRIVATE_KEY && process.env.SUI_PRIVATE_KEY.length > 20);
        const hasRealHederaCredentials = !!(process.env.HEDERA_ACCOUNT_ID && process.env.HEDERA_PRIVATE_KEY);
        const hasRealCredentials = hasRealSuiCredentials && hasRealHederaCredentials;
        
        results.mode = hasRealCredentials ? 'real_blockchain' : 'mock_mode';
        
        console.log(`  🔧 Mode: ${results.mode}`);
        console.log(`    - SUI: ${hasRealSuiCredentials ? 'Real' : 'Mock'}`);
        console.log(`    - Hedera: ${hasRealHederaCredentials ? 'Real' : 'Mock'}`);
        console.log(`    - Management: Overledger coordinates same FinP2P cross-chain swap`);
        
        for (let i = 0; i < this.testParams.iterations; i++) {
            const overallStart = process.hrtime.bigint();
            
            try {
                console.log(`  Managed ${i + 1}/${this.testParams.iterations}...`);
                
                // SAME cross-chain operation but managed through Overledger
                const managedResult = await this.overledgerAdapter.managedCrossChainTransfer({
                    overledgerAccountId: 'benchmark-enterprise-account',
                    fromFinId: 'alice@atomic-swap.demo',
                    toFinId: 'bob@atomic-swap.demo',
                    fromAsset: { chain: 'SUI', amount: this.testParams.suiAmount },
                    toAsset: { chain: 'Hedera', amount: this.testParams.hederaAmount }
                });
                
                const overallEnd = process.hrtime.bigint();
                const totalDuration = Number(overallEnd - overallStart) / 1000000;
                
                results.transfers.push({
                    iteration: i + 1,
                    success: true,
                    total_duration_ms: totalDuration,
                    management_overhead_ms: managedResult.managementOverhead,
                    finp2p_coordination_ms: totalDuration - managedResult.managementOverhead,
                    overhead_percentage: (managedResult.managementOverhead / totalDuration * 100).toFixed(2),
                    management_id: managedResult.managementId,
                    finp2p_swap_id: managedResult.finp2pSwapId,
                    coordinator: 'Overledger → FinP2P Router'
                });
                
                results.managementOverhead.push(managedResult.managementOverhead);
                
                console.log(`    ✅ Success in ${totalDuration.toFixed(2)}ms (${managedResult.managementOverhead.toFixed(2)}ms management overhead)`);
                
            } catch (error) {
                const overallEnd = process.hrtime.bigint();
                const totalDuration = Number(overallEnd - overallStart) / 1000000;
                
                results.transfers.push({
                    iteration: i + 1,
                    success: false,
                    total_duration_ms: totalDuration,
                    error: error.message
                });
                
                console.log(`    ❌ Failed in ${totalDuration.toFixed(2)}ms: ${error.message}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        this.calculateOverledgerStats(results);
        return results;
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    calculateStats(results) {
        const successful = results.transfers.filter(t => t.success);
        const durations = successful.map(t => t.duration_ms);
        
        if (durations.length === 0) {
            results.stats = {
                success_rate: 0,
                average_latency: 0,
                throughput: 0,
                std_deviation: 0
            };
            return;
        }
        
        const sum = durations.reduce((a, b) => a + b, 0);
        const average = sum / durations.length;
        const variance = durations.reduce((a, b) => a + Math.pow(b - average, 2), 0) / durations.length;
        const stdDev = Math.sqrt(variance);
        
        results.stats = {
            success_rate: (successful.length / results.transfers.length) * 100,
            average_latency: average,
            throughput: 1000 / average, // TPS
            std_deviation: stdDev
        };
    }

    calculateOverledgerStats(results) {
        const successful = results.transfers.filter(t => t.success);
        const totalDurations = successful.map(t => t.total_duration_ms);
        const overheadDurations = successful.map(t => t.management_overhead_ms);
        
        if (totalDurations.length === 0) {
            results.stats = {
                success_rate: 0,
                average_total_latency: 0,
                average_management_overhead: 0,
                average_coordination_time: 0,
                overhead_percentage: 0,
                throughput: 0,
                std_deviation: 0
            };
            return;
        }
        
        const totalSum = totalDurations.reduce((a, b) => a + b, 0);
        const overheadSum = overheadDurations.reduce((a, b) => a + b, 0);
        const avgTotal = totalSum / totalDurations.length;
        const avgOverhead = overheadSum / overheadDurations.length;
        const avgCoordination = avgTotal - avgOverhead;
        
        const variance = totalDurations.reduce((a, b) => a + Math.pow(b - avgTotal, 2), 0) / totalDurations.length;
        const stdDev = Math.sqrt(variance);
        
        results.stats = {
            success_rate: (successful.length / results.transfers.length) * 100,
            average_total_latency: avgTotal,
            average_management_overhead: avgOverhead,
            average_coordination_time: avgCoordination,
            overhead_percentage: (avgOverhead / avgTotal) * 100,
            throughput: 1000 / avgTotal,
            std_deviation: stdDev
        };
    }

    generateReport(pureFinP2PResults, overledgerResults) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Generate comprehensive report
        const report = {
            timestamp,
            configuration: {
                iterations: this.testParams.iterations,
                sui_amount: this.testParams.suiAmount + ' MIST (0.1 SUI)',
                hedera_amount: this.testParams.hederaAmount + ' tinybars (10 HBAR)',
                test_type: 'Cross-Chain Coordination Comparison'
            },
            results: {
                pure_finp2p_cross_chain: pureFinP2PResults,
                overledger_managed_cross_chain: overledgerResults
            },
            analysis: {
                comparison: this.compareResults(pureFinP2PResults, overledgerResults)
            }
        };
        
        return { report, timestamp };
    }

    compareResults(pureFinP2P, overledger) {
        if (!pureFinP2P.stats || !overledger.stats) {
            return { error: 'Insufficient data for comparison' };
        }
        
        const pureLatency = pureFinP2P.stats.average_latency;
        const overledgerLatency = overledger.stats.average_total_latency;
        const managementOverhead = overledger.stats.average_management_overhead;
        
        return {
            latency_comparison: {
                pure_finp2p_ms: pureLatency,
                overledger_total_ms: overledgerLatency,
                management_overhead_ms: managementOverhead,
                overhead_percentage: overledger.stats.overhead_percentage,
                performance_impact: overledgerLatency > pureLatency ? 'slower' : 'faster',
                difference_ms: overledgerLatency - pureLatency
            },
            throughput_comparison: {
                pure_finp2p_tps: pureFinP2P.stats.throughput,
                overledger_tps: overledger.stats.throughput,
                throughput_impact_percent: ((overledger.stats.throughput - pureFinP2P.stats.throughput) / pureFinP2P.stats.throughput) * 100
            },
            reliability_comparison: {
                pure_finp2p_success_rate: pureFinP2P.stats.success_rate,
                overledger_success_rate: overledger.stats.success_rate
            }
        };
    }

    async saveResults(report, timestamp) {
        const resultsDir = './benchmark-results';
        
        try {
            await fs.mkdir(resultsDir, { recursive: true });
            
            // Save JSON report
            const jsonPath = path.join(resultsDir, `cross-chain-benchmark-${timestamp}.json`);
            await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
            
            // Generate and save markdown report
            const markdownReport = this.generateMarkdownReport(report);
            const mdPath = path.join(resultsDir, `cross-chain-benchmark-report-${timestamp}.md`);
            await fs.writeFile(mdPath, markdownReport);
            
            // Generate and save CSV summary
            const csvSummary = this.generateCSVSummary(report);
            const csvPath = path.join(resultsDir, `cross-chain-benchmark-summary-${timestamp}.csv`);
            await fs.writeFile(csvPath, csvSummary);
            
            return { jsonPath, mdPath, csvPath };
        } catch (error) {
            console.error('❌ Failed to save results:', error);
            throw error;
        }
    }

    generateMarkdownReport(report) {
        const pure = report.results.pure_finp2p_cross_chain;
        const overledger = report.results.overledger_managed_cross_chain;
        const analysis = report.analysis.comparison;
        
        return `# Cross-Chain Coordination Performance Benchmark Report

## Test Configuration
- **Timestamp**: ${report.timestamp}
- **Test Type**: ${report.configuration.test_type}
- **Iterations**: ${report.configuration.iterations} per approach
- **SUI Amount**: ${report.configuration.sui_amount}
- **Hedera Amount**: ${report.configuration.hedera_amount}

## Performance Summary

### 🏆 Results Overview
- **Management Overhead**: ${analysis.latency_comparison?.overhead_percentage?.toFixed(2) || 'N/A'}%
- **Performance Impact**: ${analysis.latency_comparison?.performance_impact || 'Unknown'}
- **Latency Difference**: ${analysis.latency_comparison?.difference_ms?.toFixed(2) || 'N/A'}ms

### 📊 Pure FinP2P Cross-Chain Coordination
- **Mode**: ${pure.mode} ${pure.mode === 'real_blockchain' ? '🔥 REAL CROSS-CHAIN' : '🎭 MOCK'}
- **Success Rate**: ${pure.stats?.success_rate?.toFixed(2) || 'N/A'}%
- **Average Latency**: ${pure.stats?.average_latency?.toFixed(2) || 'N/A'}ms
- **Throughput**: ${pure.stats?.throughput?.toFixed(2) || 'N/A'} TPS
- **Standard Deviation**: ${pure.stats?.std_deviation?.toFixed(2) || 'N/A'}ms

### 📊 Overledger Managed Cross-Chain Coordination
- **Mode**: ${overledger.mode} ${overledger.mode === 'real_blockchain' ? '🔥 REAL CROSS-CHAIN' : '🎭 MOCK'}
- **Success Rate**: ${overledger.stats?.success_rate?.toFixed(2) || 'N/A'}%
- **Average Total Latency**: ${overledger.stats?.average_total_latency?.toFixed(2) || 'N/A'}ms
- **Management Overhead**: ${overledger.stats?.average_management_overhead?.toFixed(2) || 'N/A'}ms (${overledger.stats?.overhead_percentage?.toFixed(2) || 'N/A'}%)
- **FinP2P Coordination**: ${overledger.stats?.average_coordination_time?.toFixed(2) || 'N/A'}ms
- **Throughput**: ${overledger.stats?.throughput?.toFixed(2) || 'N/A'} TPS

## Impact Analysis

### Performance Impact
- **Pure FinP2P**: ${pure.stats?.average_latency?.toFixed(2) || 'N/A'}ms average
- **Overledger Managed**: ${overledger.stats?.average_total_latency?.toFixed(2) || 'N/A'}ms average
- **Management Overhead**: ${analysis.latency_comparison?.management_overhead_ms?.toFixed(2) || 'N/A'}ms additional

### Throughput Impact
- **Pure FinP2P**: ${pure.stats?.throughput?.toFixed(2) || 'N/A'} TPS
- **Overledger Managed**: ${overledger.stats?.throughput?.toFixed(2) || 'N/A'} TPS
- **Throughput Change**: ${analysis.throughput_comparison?.throughput_impact_percent?.toFixed(2) || 'N/A'}%

## Recommendations

- **For Pure Cross-Chain**: Use direct FinP2P coordination for minimal latency
- **For Enterprise Management**: Overledger adds ${analysis.latency_comparison?.overhead_percentage?.toFixed(2) || 'N/A'}% overhead but provides enterprise features
- **Trade-off**: ${analysis.latency_comparison?.management_overhead_ms?.toFixed(2) || 'N/A'}ms additional latency for enterprise management capabilities

`;
    }

    generateCSVSummary(report) {
        const pure = report.results.pure_finp2p_cross_chain;
        const overledger = report.results.overledger_managed_cross_chain;
        
        return `Approach,Mode,Success_Rate_%,Avg_Latency_ms,Throughput_TPS,Management_Overhead_ms,Overhead_Percentage_%
Pure_FinP2P_Cross_Chain,${pure.mode},${pure.stats?.success_rate?.toFixed(2) || 'N/A'},${pure.stats?.average_latency?.toFixed(2) || 'N/A'},${pure.stats?.throughput?.toFixed(2) || 'N/A'},0,0
Overledger_Managed_Cross_Chain,${overledger.mode},${overledger.stats?.success_rate?.toFixed(2) || 'N/A'},${overledger.stats?.average_total_latency?.toFixed(2) || 'N/A'},${overledger.stats?.throughput?.toFixed(2) || 'N/A'},${overledger.stats?.average_management_overhead?.toFixed(2) || 'N/A'},${overledger.stats?.overhead_percentage?.toFixed(2) || 'N/A'}`;
    }

    async cleanup() {
        try {
            console.log('🧹 Cleaning up adapters...');
            
            if (this.suiAdapter) {
                await this.suiAdapter.disconnect();
            }
            
            if (this.hederaAdapter) {
                await this.hederaAdapter.disconnect();
            }
            
            if (this.overledgerAdapter) {
                await this.overledgerAdapter.disconnect();
            }
            
            if (this.router) {
                await this.router.stop();
            }
            
            console.log('✅ Cleanup completed');
        } catch (error) {
            console.error('⚠️ Cleanup error:', error);
        }
    }

    async run() {
        console.log('🚀 Starting Cross-Chain Coordination Benchmark');
        console.log(`📊 Comparing Pure FinP2P vs Overledger Managed Cross-Chain Coordination`);
        console.log(`🔄 Running ${this.testParams.iterations} iterations per approach`);
        console.log(`💰 Test amounts: 0.1 SUI, 10 HBAR (cross-chain atomic swap)`);
        
        try {
            await this.initializeAdapters();
            
            console.log('\n📈 Starting benchmark runs...');
            
            // Run the proper comparison benchmarks
            const pureFinP2PResults = await this.benchmarkPureFinP2PCrossChain();
            const overledgerResults = await this.benchmarkOverledgerManagedCrossChain();
            
            console.log('\n📊 Generating reports...');
            const { report, timestamp } = this.generateReport(pureFinP2PResults, overledgerResults);
            const savedPaths = await this.saveResults(report, timestamp);
            
            console.log('\n📄 Reports generated:');
            console.log(`  📊 JSON: ${savedPaths.jsonPath}`);
            console.log(`  📝 Markdown: ${savedPaths.mdPath}`);
            console.log(`  📈 CSV: ${savedPaths.csvPath}`);
            
            // Print summary
            console.log('\n🏁 Benchmark Complete!');
            console.log('========================');
            
            const analysis = report.analysis.comparison;
            if (analysis && analysis.latency_comparison) {
                console.log(`🏆 Pure FinP2P: ${analysis.latency_comparison.pure_finp2p_ms?.toFixed(2)}ms`);
                console.log(`🎯 Overledger: ${analysis.latency_comparison.overledger_total_ms?.toFixed(2)}ms`);
                console.log(`📈 Management Overhead: ${analysis.latency_comparison.overhead_percentage?.toFixed(2)}%`);
            }
            
            // Auto-exit after a delay
            setTimeout(() => {
                console.log('📤 Benchmark auto-exiting...');
                process.exit(0);
            }, 2000);
            
        } catch (error) {
            console.error('❌ Benchmark failed:', error);
            await this.cleanup();
            setTimeout(() => process.exit(1), 1000);
        } finally {
            await this.cleanup();
        }
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const iterations = args.length > 0 ? parseInt(args[0]) : 10;

if (isNaN(iterations) || iterations < 1) {
    console.error('❌ Invalid iterations parameter. Usage: node benchmark-unified.js [iterations]');
    process.exit(1);
}

// Run the benchmark
const benchmark = new UnifiedBenchmark(iterations);
benchmark.run().catch(console.error); 