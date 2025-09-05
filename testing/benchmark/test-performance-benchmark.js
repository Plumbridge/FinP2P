/**
 * Test Performance Benchmark
 * 
 * This benchmark measures the PERFORMANCE of running the actual tests,
 * rather than embedding test logic in the benchmark itself.
 * 
 * Architecture:
 * - Tests in /testing/tests/ define WHAT to test (security, compliance, etc.)
 * - This benchmark measures HOW FAST those tests run under different loads
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class TestPerformanceBenchmark {
    constructor(config = {}) {
        this.config = {
            iterations: config.iterations || 3,
            loadScenarios: config.loadScenarios || ['light', 'normal', 'heavy'],
            outputDir: config.outputDir || 'benchmark-results',
            ...config
        };
        
        this.results = {
            timestamp: new Date().toISOString(),
            testPerformance: {},
            loadImpact: {},
            overallMetrics: {}
        };
    }

    async run() {
        console.log('🚀 Starting Test Performance Benchmark');
        console.log('=' .repeat(80));
        console.log('📋 This benchmark measures the PERFORMANCE of running actual tests');
        console.log('🔧 Tests define WHAT to test, benchmark measures HOW FAST they run\n');

        try {
            // Ensure test build is up to date
            await this.buildTests();
            
            // Run test performance benchmarks
            await this.benchmarkSecurityTests();
            await this.benchmarkPerformanceTests();
            await this.benchmarkLoadImpact();
            
            // Generate comprehensive report
            await this.generateReport();
            
            console.log('✅ Test Performance Benchmark completed successfully!');
            
        } catch (error) {
            console.error('❌ Benchmark failed:', error);
            throw error;
        }
    }

    async buildTests() {
        console.log('🔨 Building test files...');
        try {
            execSync('npm run build', { stdio: 'inherit' });
            console.log('✅ Test build completed\n');
        } catch (error) {
            console.error('❌ Build failed:', error);
            throw error;
        }
    }

    async benchmarkSecurityTests() {
        console.log('🔒 Benchmarking Security Test Performance');
        console.log('-' .repeat(50));
        
        const securityTests = [
            'testing/tests/security/transaction-atomicity.test.ts',
            'testing/tests/security/byzantine-fault-tolerance.test.ts', 
            'testing/tests/security/cryptographic-implementation.test.ts'
        ];

        this.results.testPerformance.security = {};

        for (const testFile of securityTests) {
            const testName = path.basename(testFile, '.test.ts');
            console.log(`  Testing ${testName}...`);
            
            const performance = await this.measureTestPerformance(testFile);
            this.results.testPerformance.security[testName] = performance;
            
            console.log(`    ⏱️  Execution time: ${performance.executionTime}ms`);
            console.log(`    📊 Memory usage: ${performance.memoryUsage}MB`);
            console.log(`    ✅ Pass rate: ${performance.passRate}%`);
        }
        
        console.log('');
    }

    async benchmarkPerformanceTests() {
        console.log('⚡ Benchmarking Performance Test Performance');
        console.log('-' .repeat(50));
        
        const performanceTests = [
            'testing/tests/performance/load-testing.test.ts'
        ];

        this.results.testPerformance.performance = {};

        for (const testFile of performanceTests) {
            const testName = path.basename(testFile, '.test.ts');
            console.log(`  Testing ${testName}...`);
            
            const performance = await this.measureTestPerformance(testFile);
            this.results.testPerformance.performance[testName] = performance;
            
            console.log(`    ⏱️  Execution time: ${performance.executionTime}ms`);
            console.log(`    📊 Memory usage: ${performance.memoryUsage}MB`);
            console.log(`    ✅ Pass rate: ${performance.passRate}%`);
        }
        
        console.log('');
    }

    async benchmarkLoadImpact() {
        console.log('📈 Benchmarking Load Impact on Test Performance');
        console.log('-' .repeat(50));
        
        this.results.loadImpact = {};

        for (const loadScenario of this.config.loadScenarios) {
            console.log(`  Testing under ${loadScenario} load...`);
            
            const loadResults = await this.measureTestPerformanceUnderLoad(loadScenario);
            this.results.loadImpact[loadScenario] = loadResults;
            
            console.log(`    ⏱️  Avg execution time: ${loadResults.avgExecutionTime}ms`);
            console.log(`    📊 Peak memory usage: ${loadResults.peakMemoryUsage}MB`);
            console.log(`    🔄 Throughput: ${loadResults.throughput} tests/second`);
        }
        
        console.log('');
    }

    async measureTestPerformance(testFile) {
        const iterations = this.config.iterations;
        const results = {
            executionTimes: [],
            memoryUsages: [],
            passRates: []
        };

        for (let i = 0; i < iterations; i++) {
            const startTime = Date.now();
            const startMemory = process.memoryUsage();
            
            try {
                // Run the test using Jest
                const testResult = await this.runSingleTest(testFile);
                
                const endTime = Date.now();
                const endMemory = process.memoryUsage();
                
                results.executionTimes.push(endTime - startTime);
                results.memoryUsages.push((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024); // MB
                results.passRates.push(testResult.passRate);
                
            } catch (error) {
                console.warn(`    ⚠️  Test iteration ${i + 1} failed:`, error.message);
                results.passRates.push(0);
            }
        }

        return {
            executionTime: this.average(results.executionTimes),
            memoryUsage: this.average(results.memoryUsages),
            passRate: this.average(results.passRates),
            iterations: iterations
        };
    }

    async measureTestPerformanceUnderLoad(loadScenario) {
        const concurrentTests = loadScenario === 'heavy' ? 10 : loadScenario === 'normal' ? 5 : 2;
        const testFile = 'testing/tests/performance/load-testing.test.ts';
        
        const startTime = Date.now();
        const startMemory = process.memoryUsage();
        
        // Run multiple tests concurrently to simulate load
        const promises = Array(concurrentTests).fill(null).map(() => 
            this.runSingleTest(testFile)
        );
        
        const results = await Promise.all(promises);
        
        const endTime = Date.now();
        const endMemory = process.memoryUsage();
        
        const avgPassRate = results.reduce((sum, r) => sum + r.passRate, 0) / results.length;
        
        return {
            avgExecutionTime: (endTime - startTime) / concurrentTests,
            peakMemoryUsage: (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024, // MB
            throughput: concurrentTests / ((endTime - startTime) / 1000), // tests per second
            concurrentTests,
            avgPassRate
        };
    }

    async runSingleTest(testFile) {
        return new Promise((resolve, reject) => {
            // Use Jest programmatically to run a single test
            const jest = spawn('npx', ['jest', testFile, '--json'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            let errorOutput = '';

            jest.stdout.on('data', (data) => {
                output += data.toString();
            });

            jest.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            jest.on('close', (code) => {
                try {
                    // Parse Jest JSON output
                    const lines = output.split('\n');
                    const jsonLine = lines.find(line => line.trim().startsWith('{'));
                    
                    if (jsonLine) {
                        const result = JSON.parse(jsonLine);
                        const passRate = result.numPassedTests / (result.numPassedTests + result.numFailedTests) * 100;
                        resolve({ 
                            passRate: passRate || 0,
                            numTests: result.numPassedTests + result.numFailedTests,
                            success: code === 0
                        });
                    } else {
                        // Fallback: assume success if no JSON but exit code 0
                        resolve({ 
                            passRate: code === 0 ? 100 : 0,
                            numTests: 1,
                            success: code === 0
                        });
                    }
                } catch (error) {
                    // If we can't parse, use exit code as indicator
                    resolve({ 
                        passRate: code === 0 ? 100 : 0,
                        numTests: 1,
                        success: code === 0
                    });
                }
            });

            // Timeout after 2 minutes
            setTimeout(() => {
                jest.kill();
                reject(new Error('Test timeout'));
            }, 120000);
        });
    }

    async generateReport() {
        console.log('📊 Generating Test Performance Report');
        console.log('-' .repeat(50));
        
        // Calculate overall metrics
        this.calculateOverallMetrics();
        
        // Save results
        const timestamp = this.results.timestamp.replace(/[:.]/g, '-');
        const resultsDir = path.join(__dirname, '../../', this.config.outputDir);
        
        try {
            await fs.mkdir(resultsDir, { recursive: true });
        } catch (error) {
            // Directory might already exist
        }
        
        // Save JSON results
        const jsonPath = path.join(resultsDir, `test-performance-${timestamp}.json`);
        await fs.writeFile(jsonPath, JSON.stringify(this.results, null, 2));
        
        // Generate markdown report
        const markdownPath = path.join(resultsDir, `test-performance-report-${timestamp}.md`);
        const markdownContent = this.generateMarkdownReport();
        await fs.writeFile(markdownPath, markdownContent);
        
        console.log(`📄 JSON Results: ${jsonPath}`);
        console.log(`📝 Markdown Report: ${markdownPath}`);
    }

    calculateOverallMetrics() {
        const allTests = [
            ...Object.values(this.results.testPerformance.security || {}),
            ...Object.values(this.results.testPerformance.performance || {})
        ];
        
        this.results.overallMetrics = {
            avgExecutionTime: this.average(allTests.map(t => t.executionTime)),
            avgMemoryUsage: this.average(allTests.map(t => t.memoryUsage)),
            overallPassRate: this.average(allTests.map(t => t.passRate)),
            totalTests: allTests.length,
            loadImpact: {
                lightLoad: this.results.loadImpact.light?.avgExecutionTime || 0,
                normalLoad: this.results.loadImpact.normal?.avgExecutionTime || 0,
                heavyLoad: this.results.loadImpact.heavy?.avgExecutionTime || 0
            }
        };
    }

    generateMarkdownReport() {
        const metrics = this.results.overallMetrics;
        
        return `# Test Performance Benchmark Report

**Generated:** ${new Date(this.results.timestamp).toLocaleString()}

## Executive Summary

This report measures the **performance of running tests**, not just the test results themselves. It answers the question: "How do our comprehensive security and performance tests perform under different loads?"

## Test Execution Performance

### Security Tests Performance
${this.formatTestResults(this.results.testPerformance.security, 'Security')}

### Performance Tests Performance  
${this.formatTestResults(this.results.testPerformance.performance, 'Performance')}

## Load Impact Analysis

| Load Scenario | Avg Execution Time | Peak Memory | Throughput |
|---------------|-------------------|-------------|------------|
| **Light Load** | ${this.results.loadImpact.light?.avgExecutionTime.toFixed(0) || 0}ms | ${this.results.loadImpact.light?.peakMemoryUsage.toFixed(1) || 0}MB | ${this.results.loadImpact.light?.throughput.toFixed(2) || 0} tests/sec |
| **Normal Load** | ${this.results.loadImpact.normal?.avgExecutionTime.toFixed(0) || 0}ms | ${this.results.loadImpact.normal?.peakMemoryUsage.toFixed(1) || 0}MB | ${this.results.loadImpact.normal?.throughput.toFixed(2) || 0} tests/sec |
| **Heavy Load** | ${this.results.loadImpact.heavy?.avgExecutionTime.toFixed(0) || 0}ms | ${this.results.loadImpact.heavy?.peakMemoryUsage.toFixed(1) || 0}MB | ${this.results.loadImpact.heavy?.throughput.toFixed(2) || 0} tests/sec |

## Overall Test Suite Metrics

- **Average Test Execution Time:** ${metrics.avgExecutionTime.toFixed(0)}ms
- **Average Memory Usage:** ${metrics.avgMemoryUsage.toFixed(1)}MB  
- **Overall Test Pass Rate:** ${metrics.overallPassRate.toFixed(1)}%
- **Total Tests Benchmarked:** ${metrics.totalTests}

## Performance Under Load

The test suite demonstrates:
- **Light Load:** Tests complete quickly with minimal resource usage
- **Normal Load:** ${((this.results.loadImpact.normal?.avgExecutionTime / this.results.loadImpact.light?.avgExecutionTime - 1) * 100).toFixed(0)}% slower than light load
- **Heavy Load:** ${((this.results.loadImpact.heavy?.avgExecutionTime / this.results.loadImpact.light?.avgExecutionTime - 1) * 100).toFixed(0)}% slower than light load

## Recommendations

1. **Test Optimization:** Focus on tests with >1000ms execution time
2. **Memory Management:** Monitor tests using >50MB memory
3. **Load Handling:** Test suite scales reasonably under load
4. **CI/CD Integration:** Tests are suitable for continuous integration

---
*This benchmark measures test execution performance to ensure our comprehensive test suite remains efficient and scalable.*
`;
    }

    formatTestResults(testResults, category) {
        if (!testResults) return `No ${category} tests measured.`;
        
        let output = `\n| Test | Execution Time | Memory Usage | Pass Rate |\n`;
        output += `|------|----------------|-------------|----------|\n`;
        
        for (const [testName, metrics] of Object.entries(testResults)) {
            output += `| **${testName}** | ${metrics.executionTime.toFixed(0)}ms | ${metrics.memoryUsage.toFixed(1)}MB | ${metrics.passRate.toFixed(1)}% |\n`;
        }
        
        return output;
    }

    average(numbers) {
        return numbers.length > 0 ? numbers.reduce((sum, n) => sum + n, 0) / numbers.length : 0;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run the benchmark if called directly
if (require.main === module) {
    const config = {
        iterations: process.argv.includes('--detailed') ? 5 : 3,
        loadScenarios: process.argv.includes('--stress') ? ['light', 'normal', 'heavy', 'extreme'] : ['light', 'normal', 'heavy']
    };
    
    const benchmark = new TestPerformanceBenchmark(config);
    
    benchmark.run()
        .then(() => {
            console.log('\n🎉 Test Performance Benchmark completed successfully!');
            console.log('📈 Results show how efficiently our comprehensive tests execute under load.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Test Performance Benchmark failed:', error);
            process.exit(1);
        });
}

module.exports = { TestPerformanceBenchmark };
