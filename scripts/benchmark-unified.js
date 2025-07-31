#!/usr/bin/env node

// Load environment variables from .env file
require('dotenv').config();

const { 
    FinP2PSDKRouter,
    FinP2PIntegratedSuiAdapter,
    FinP2PIntegratedHederaAdapter
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
 * Adapter Performance Benchmark
 * 
 * Compares two approaches:
 * 1. FinP2P Adapter Mode: Using FinID resolution + transfer (transferByFinId)
 * 2. Direct Adapter Mode: Using direct wallet addresses (transfer)
 * 
 * This measures the overhead of FinP2P ID resolution vs direct blockchain access
 */
class AdapterBenchmark {
    constructor(iterations = 10) {
        this.testParams = {
            iterations,
            suiAmount: BigInt(1000000), // 0.001 SUI in MIST
            hederaAmount: BigInt(100000000) // 0.1 HBAR in tinybars
        };
        
        this.router = null;
        this.suiAdapter = null;
        this.hederaAdapter = null;
        
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
                routerId: 'adapter-benchmark-router',
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
                mockMode: true
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
                accountId: process.env.HEDERA_ACCOUNT_ID || '0.0.123456',
                privateKey: process.env.HEDERA_PRIVATE_KEY,
                finp2pRouter: this.router
            }, this.logger);
            await this.hederaAdapter.connect();
            
            console.log('✅ All adapters initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize adapters:', error.message);
            throw error;
        }
    }

    async benchmarkFinP2PAdapterMode() {
        console.log('\n🔄 Benchmarking FinP2P Adapter Mode (FinID Resolution + Transfer)...');
        
        const results = {
            approach: 'FinP2P Adapter Mode',
            description: 'Using FinID resolution + transfer (transferByFinId)',
            transfers: [],
            resolutionTimes: [],
            transferTimes: [],
            totalTimes: []
        };
        
        // Check credentials
        const hasRealSuiCredentials = !!(process.env.SUI_PRIVATE_KEY && process.env.SUI_PRIVATE_KEY.length > 20);
        const hasRealHederaCredentials = !!(process.env.HEDERA_ACCOUNT_ID && process.env.HEDERA_PRIVATE_KEY);
        const hasRealCredentials = hasRealSuiCredentials && hasRealHederaCredentials;
        
        results.mode = hasRealCredentials ? 'real_blockchain' : 'mock_mode';
        
        console.log(`  🔧 Mode: ${results.mode}`);
        console.log(`    - SUI: ${hasRealSuiCredentials ? 'Real' : 'Mock'}`);
        console.log(`    - Hedera: ${hasRealHederaCredentials ? 'Real' : 'Mock'}`);
        console.log(`    - Approach: FinID resolution + blockchain transfer`);
        
        for (let i = 0; i < this.testParams.iterations; i++) {
            const overallStart = process.hrtime.bigint();
            
            try {
                console.log(`  FinP2P Transfer ${i + 1}/${this.testParams.iterations}...`);
                
                // Measure FinID resolution time
                const resolutionStart = process.hrtime.bigint();
                
                // Resolve FinIDs to addresses
                const aliceSuiAddress = await this.router.getWalletAddress('alice@atomic-swap.demo', 'sui');
                const bobSuiAddress = await this.router.getWalletAddress('bob@atomic-swap.demo', 'sui');
                
                const resolutionEnd = process.hrtime.bigint();
                const resolutionTime = Number(resolutionEnd - resolutionStart) / 1000000;
                
                // Measure transfer time
                const transferStart = process.hrtime.bigint();
                
                // Execute transfer using FinP2P adapter mode
                const transferResult = await this.suiAdapter.transferByFinId(
                    'alice@atomic-swap.demo',
                    'bob@atomic-swap.demo',
                    this.testParams.suiAmount,
                    true
                );
                
                const transferEnd = process.hrtime.bigint();
                const transferTime = Number(transferEnd - transferStart) / 1000000;
                
                const overallEnd = process.hrtime.bigint();
                const totalTime = Number(overallEnd - overallStart) / 1000000;
                
                results.transfers.push({
                    iteration: i + 1,
                    success: true,
                    resolution_time_ms: resolutionTime,
                    transfer_time_ms: transferTime,
                    total_time_ms: totalTime,
                    tx_hash: transferResult.txHash,
                    from_finid: 'alice@atomic-swap.demo',
                    to_finid: 'bob@atomic-swap.demo',
                    from_address: aliceSuiAddress,
                    to_address: bobSuiAddress,
                    amount: this.testParams.suiAmount.toString()
                });
                
                results.resolutionTimes.push(resolutionTime);
                results.transferTimes.push(transferTime);
                results.totalTimes.push(totalTime);
                
                console.log(`    ✅ Success in ${totalTime.toFixed(2)}ms (resolution: ${resolutionTime.toFixed(2)}ms, transfer: ${transferTime.toFixed(2)}ms)`);
                
            } catch (error) {
                const overallEnd = process.hrtime.bigint();
                const totalTime = Number(overallEnd - overallStart) / 1000000;
                
                results.transfers.push({
                    iteration: i + 1,
                    success: false,
                    total_time_ms: totalTime,
                    error: error.message
                });
                
                console.log(`    ❌ Failed in ${totalTime.toFixed(2)}ms: ${error.message}`);
            }
            
            await this.delay(1000);
        }
        
        this.calculateStats(results);
        return results;
    }

    async benchmarkDirectAdapterMode() {
        console.log('\n🎯 Benchmarking Direct Adapter Mode (Direct Wallet Address Transfer)...');
        
        const results = {
            approach: 'Direct Adapter Mode',
            description: 'Using direct wallet addresses (transfer)',
            transfers: [],
            transferTimes: []
        };
        
        // Check credentials
        const hasRealSuiCredentials = !!(process.env.SUI_PRIVATE_KEY && process.env.SUI_PRIVATE_KEY.length > 20);
        const hasRealHederaCredentials = !!(process.env.HEDERA_ACCOUNT_ID && process.env.HEDERA_PRIVATE_KEY);
        const hasRealCredentials = hasRealSuiCredentials && hasRealHederaCredentials;
        
        results.mode = hasRealCredentials ? 'real_blockchain' : 'mock_mode';
        
        console.log(`  🔧 Mode: ${results.mode}`);
        console.log(`    - SUI: ${hasRealSuiCredentials ? 'Real' : 'Mock'}`);
        console.log(`    - Hedera: ${hasRealHederaCredentials ? 'Real' : 'Mock'}`);
        console.log(`    - Approach: Direct blockchain transfer (no FinID resolution)`);
        
        // Get addresses for direct transfer
        const fromAddress = process.env.SUI_ADDRESS || '0x1234567890abcdef';
        const toAddress = process.env.SUI_ADDRESS_2 || '0xabcdef1234567890';
        
        for (let i = 0; i < this.testParams.iterations; i++) {
            const overallStart = process.hrtime.bigint();
            
            try {
                console.log(`  Direct Transfer ${i + 1}/${this.testParams.iterations}...`);
                
                // Execute transfer using direct adapter mode
                const transferResult = await this.suiAdapter.transfer(
                    fromAddress,
                    toAddress,
                    this.testParams.suiAmount,
                    'SUI'
                );
                
                const overallEnd = process.hrtime.bigint();
                const totalTime = Number(overallEnd - overallStart) / 1000000;
                
                results.transfers.push({
                    iteration: i + 1,
                    success: true,
                    transfer_time_ms: totalTime,
                    tx_hash: transferResult.txHash,
                    from_address: fromAddress,
                    to_address: toAddress,
                    amount: this.testParams.suiAmount.toString()
                });
                
                results.transferTimes.push(totalTime);
                
                console.log(`    ✅ Success in ${totalTime.toFixed(2)}ms`);
                
            } catch (error) {
                const overallEnd = process.hrtime.bigint();
                const totalTime = Number(overallEnd - overallStart) / 1000000;
                
                results.transfers.push({
                    iteration: i + 1,
                    success: false,
                    transfer_time_ms: totalTime,
                    error: error.message
                });
                
                console.log(`    ❌ Failed in ${totalTime.toFixed(2)}ms: ${error.message}`);
            }
            
            await this.delay(1000);
        }
        
        this.calculateStats(results);
        return results;
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    calculateStats(results) {
        if (results.totalTimes && results.totalTimes.length > 0) {
            const times = results.totalTimes;
            results.stats = {
                count: times.length,
                mean: times.reduce((a, b) => a + b, 0) / times.length,
                median: times.sort((a, b) => a - b)[Math.floor(times.length / 2)],
                min: Math.min(...times),
                max: Math.max(...times),
                stdDev: Math.sqrt(times.reduce((sq, n) => sq + Math.pow(n - times.reduce((a, b) => a + b, 0) / times.length, 2), 0) / times.length)
            };
        } else if (results.transferTimes && results.transferTimes.length > 0) {
            const times = results.transferTimes;
            results.stats = {
                count: times.length,
                mean: times.reduce((a, b) => a + b, 0) / times.length,
                median: times.sort((a, b) => a - b)[Math.floor(times.length / 2)],
                min: Math.min(...times),
                max: Math.max(...times),
                stdDev: Math.sqrt(times.reduce((sq, n) => sq + Math.pow(n - times.reduce((a, b) => a + b, 0) / times.length, 2), 0) / times.length)
            };
        }
    }

    generateReport(finp2pResults, directResults) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        const report = {
            timestamp,
            summary: {
                finp2p_mode: {
                    approach: finp2pResults.approach,
                    description: finp2pResults.description,
                    mode: finp2pResults.mode,
                    total_transfers: finp2pResults.transfers.length,
                    successful_transfers: finp2pResults.transfers.filter(t => t.success).length,
                    success_rate: (finp2pResults.transfers.filter(t => t.success).length / finp2pResults.transfers.length * 100).toFixed(2) + '%',
                    stats: finp2pResults.stats
                },
                direct_mode: {
                    approach: directResults.approach,
                    description: directResults.description,
                    mode: directResults.mode,
                    total_transfers: directResults.transfers.length,
                    successful_transfers: directResults.transfers.filter(t => t.success).length,
                    success_rate: (directResults.transfers.filter(t => t.success).length / directResults.transfers.length * 100).toFixed(2) + '%',
                    stats: directResults.stats
                }
            },
            comparison: this.compareResults(finp2pResults, directResults),
            detailed_results: {
                finp2p: finp2pResults,
                direct: directResults
            }
        };
        
        return report;
    }

    compareResults(finp2p, direct) {
        const finp2pMean = finp2p.stats?.mean || 0;
        const directMean = direct.stats?.mean || 0;
        const overhead = finp2pMean - directMean;
        const overheadPercentage = directMean > 0 ? (overhead / directMean * 100) : 0;
        
        return {
            performance_overhead: {
                absolute_ms: overhead.toFixed(2),
                percentage: overheadPercentage.toFixed(2) + '%',
                description: overhead > 0 ? 'FinP2P mode is slower' : 'FinP2P mode is faster'
            },
            efficiency_comparison: {
                finp2p_mean_ms: finp2pMean.toFixed(2),
                direct_mean_ms: directMean.toFixed(2),
                ratio: directMean > 0 ? (finp2pMean / directMean).toFixed(2) : 'N/A'
            },
            success_rate_comparison: {
                finp2p_success_rate: finp2p.transfers.filter(t => t.success).length / finp2p.transfers.length * 100,
                direct_success_rate: direct.transfers.filter(t => t.success).length / direct.transfers.length * 100
            }
        };
    }

    async saveResults(report, timestamp) {
        const resultsDir = path.join(__dirname, '../benchmark-results');
        
        try {
            await fs.mkdir(resultsDir, { recursive: true });
        } catch (error) {
            // Directory might already exist
        }
        
        // Save JSON report
        const jsonPath = path.join(resultsDir, `adapter-benchmark-${timestamp}.json`);
        await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
        
        // Save Markdown report
        const markdownPath = path.join(resultsDir, `adapter-benchmark-report-${timestamp}.md`);
        const markdownContent = this.generateMarkdownReport(report);
        await fs.writeFile(markdownPath, markdownContent);
        
        // Save CSV summary
        const csvPath = path.join(resultsDir, `adapter-benchmark-summary-${timestamp}.csv`);
        const csvContent = this.generateCSVSummary(report);
        await fs.writeFile(csvPath, csvContent);
        
        console.log(`\n📊 Results saved:`);
        console.log(`  📄 JSON: ${jsonPath}`);
        console.log(`  📝 Markdown: ${markdownPath}`);
        console.log(`  📊 CSV: ${csvPath}`);
    }

    generateMarkdownReport(report) {
        return `# Adapter Performance Benchmark Report

**Generated:** ${new Date(report.timestamp.replace(/-/g, ':')).toLocaleString()}

## Executive Summary

This benchmark compares two adapter usage modes:
1. **FinP2P Adapter Mode**: Using FinID resolution + transfer
2. **Direct Adapter Mode**: Using direct wallet addresses

## Performance Comparison

### FinP2P Adapter Mode
- **Approach**: ${report.summary.finp2p_mode.approach}
- **Description**: ${report.summary.finp2p_mode.description}
- **Mode**: ${report.summary.finp2p_mode.mode}
- **Success Rate**: ${report.summary.finp2p_mode.success_rate}
- **Mean Time**: ${report.summary.finp2p_mode.stats?.mean?.toFixed(2)}ms
- **Median Time**: ${report.summary.finp2p_mode.stats?.median?.toFixed(2)}ms

### Direct Adapter Mode
- **Approach**: ${report.summary.direct_mode.approach}
- **Description**: ${report.summary.direct_mode.description}
- **Mode**: ${report.summary.direct_mode.mode}
- **Success Rate**: ${report.summary.direct_mode.success_rate}
- **Mean Time**: ${report.summary.direct_mode.stats?.mean?.toFixed(2)}ms
- **Median Time**: ${report.summary.direct_mode.stats?.median?.toFixed(2)}ms

## Key Findings

### Performance Overhead
- **Absolute Overhead**: ${report.comparison.performance_overhead.absolute_ms}ms
- **Percentage Overhead**: ${report.comparison.performance_overhead.percentage}
- **Description**: ${report.comparison.performance_overhead.description}

### Efficiency Ratio
- **FinP2P Mean**: ${report.comparison.efficiency_comparison.finp2p_mean_ms}ms
- **Direct Mean**: ${report.comparison.efficiency_comparison.direct_mean_ms}ms
- **Ratio**: ${report.comparison.efficiency_comparison.ratio}

### Success Rates
- **FinP2P Success Rate**: ${report.comparison.success_rate_comparison.finp2p_success_rate.toFixed(2)}%
- **Direct Success Rate**: ${report.comparison.success_rate_comparison.direct_success_rate.toFixed(2)}%

## Detailed Results

### FinP2P Adapter Mode Statistics
- **Total Transfers**: ${report.summary.finp2p_mode.total_transfers}
- **Successful Transfers**: ${report.summary.finp2p_mode.successful_transfers}
- **Minimum Time**: ${report.summary.finp2p_mode.stats?.min?.toFixed(2)}ms
- **Maximum Time**: ${report.summary.finp2p_mode.stats?.max?.toFixed(2)}ms
- **Standard Deviation**: ${report.summary.finp2p_mode.stats?.stdDev?.toFixed(2)}ms

### Direct Adapter Mode Statistics
- **Total Transfers**: ${report.summary.direct_mode.total_transfers}
- **Successful Transfers**: ${report.summary.direct_mode.successful_transfers}
- **Minimum Time**: ${report.summary.direct_mode.stats?.min?.toFixed(2)}ms
- **Maximum Time**: ${report.summary.direct_mode.stats?.max?.toFixed(2)}ms
- **Standard Deviation**: ${report.summary.direct_mode.stats?.stdDev?.toFixed(2)}ms

## Conclusion

${report.comparison.performance_overhead.description}. The FinP2P adapter mode adds ${report.comparison.performance_overhead.percentage} overhead compared to direct mode, primarily due to FinID resolution and FinP2P coordination.

This overhead represents the cost of the additional abstraction layer that FinP2P provides, enabling user-friendly FinID-based transfers at the expense of some performance.
`;
    }

    generateCSVSummary(report) {
        return `Approach,Mode,Total Transfers,Successful Transfers,Success Rate,Mean Time (ms),Median Time (ms),Min Time (ms),Max Time (ms),Std Dev (ms)
${report.summary.finp2p_mode.approach},${report.summary.finp2p_mode.mode},${report.summary.finp2p_mode.total_transfers},${report.summary.finp2p_mode.successful_transfers},${report.summary.finp2p_mode.success_rate},${report.summary.finp2p_mode.stats?.mean?.toFixed(2)},${report.summary.finp2p_mode.stats?.median?.toFixed(2)},${report.summary.finp2p_mode.stats?.min?.toFixed(2)},${report.summary.finp2p_mode.stats?.max?.toFixed(2)},${report.summary.finp2p_mode.stats?.stdDev?.toFixed(2)}
${report.summary.direct_mode.approach},${report.summary.direct_mode.mode},${report.summary.direct_mode.total_transfers},${report.summary.direct_mode.successful_transfers},${report.summary.direct_mode.success_rate},${report.summary.direct_mode.stats?.mean?.toFixed(2)},${report.summary.direct_mode.stats?.median?.toFixed(2)},${report.summary.direct_mode.stats?.min?.toFixed(2)},${report.summary.direct_mode.stats?.max?.toFixed(2)},${report.summary.direct_mode.stats?.stdDev?.toFixed(2)}`;
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up...');
        
        try {
            if (this.suiAdapter) {
                await this.suiAdapter.disconnect();
                console.log('✅ Sui adapter disconnected');
            }
            
            if (this.hederaAdapter) {
                await this.hederaAdapter.disconnect();
                console.log('✅ Hedera adapter disconnected');
            }
            
            if (this.router) {
                await this.router.stop();
                console.log('✅ Router stopped');
            }
            
        } catch (error) {
            console.warn('⚠️ Cleanup warning:', error.message);
        }
    }

    async run() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        try {
            console.log('🚀 Starting Adapter Performance Benchmark');
            console.log('=' .repeat(60));
            console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
            console.log(`🔄 Iterations: ${this.testParams.iterations}`);
            console.log(`💰 SUI Amount: ${this.testParams.suiAmount} MIST`);
            console.log(`💰 Hedera Amount: ${this.testParams.hederaAmount} tinybars`);
            console.log('=' .repeat(60));
            
            // Initialize adapters
            await this.initializeAdapters();
            
            // Run benchmarks
            const finp2pResults = await this.benchmarkFinP2PAdapterMode();
            const directResults = await this.benchmarkDirectAdapterMode();
            
            // Generate and save report
            const report = this.generateReport(finp2pResults, directResults);
            await this.saveResults(report, timestamp);
            
            // Display summary
            console.log('\n📊 Benchmark Summary:');
            console.log('=' .repeat(60));
            console.log(`FinP2P Mode: ${finp2pResults.stats?.mean?.toFixed(2)}ms mean (${finp2pResults.transfers.filter(t => t.success).length}/${finp2pResults.transfers.length} successful)`);
            console.log(`Direct Mode: ${directResults.stats?.mean?.toFixed(2)}ms mean (${directResults.transfers.filter(t => t.success).length}/${directResults.transfers.length} successful)`);
            console.log(`Overhead: ${report.comparison.performance_overhead.absolute_ms}ms (${report.comparison.performance_overhead.percentage})`);
            console.log('=' .repeat(60));
            
        } catch (error) {
            console.error('❌ Benchmark failed:', error);
            throw error;
        } finally {
            await this.cleanup();
        }
    }
}

// Run the benchmark
if (require.main === module) {
    const iterations = process.argv.includes('--detailed') ? 20 : 10;
    const benchmark = new AdapterBenchmark(iterations);
    
    benchmark.run()
        .then(() => {
            console.log('\n🎉 Benchmark completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Benchmark failed:', error);
            process.exit(1);
        });
}

module.exports = { AdapterBenchmark }; 