# Axelar Criteria Benchmark

This directory contains the comprehensive benchmark script for testing Axelar against the 20 evaluation criteria defined in the dissertation, with a focus on atomic swap functionality as per FinP2P requirements.

## Overview

The benchmark tests **3 out of 20 criteria** that can be tested with the Axelar adapter and testnet using atomic swap methodology:

**Testable Criteria:**
- **Regulatory Compliance** (1/5 criteria): Atomicity Enforcement
- **Performance Characteristics** (2/3 criteria): Transaction Latency, Throughput Scalability

**Skipped Criteria (17/20):**
- **Security Robustness** (5/5): Requires documentation analysis, audit reports, hardware testing
- **Regulatory Compliance** (4/5): Requires enterprise IAM, monitoring, multi-region deployment
- **Performance Characteristics** (1/3): System Availability requires 30+ day monitoring
- **Operational Reliability** (3/3): Requires enterprise monitoring and infrastructure testing
- **Economic Factors** (4/4): Requires pricing analysis and cost calculations

**Note**: This benchmark focuses on atomic swap testing with 10 iterations per criterion, as cross-chain testing is not available on testnets and atomic swaps are the core functionality of FinP2P.

## Expected Performance Characteristics

**Latency (3-9 seconds):**
- Cosmos Tendermint consensus has ~6-7 second block times
- Testnet network latency is higher than mainnet
- Gas estimation and transaction processing overhead

**Throughput (0.5-2 TPS):**
- Limited by Cosmos block time and network capacity
- Testnet has lower throughput than mainnet
- Controlled concurrency (2 parallel) to avoid overwhelming the network

**These are realistic testnet performance metrics, not production benchmarks.**

## Files

- `axelar-criteria-benchmark.ts` - Main benchmark script
- `run-axelar-benchmark.sh` - Unix/Linux run script
- `run-axelar-benchmark.bat` - Windows run script
- `README.md` - This file

## Usage

### Prerequisites

1. Ensure you have a `.env` file in the project root with Axelar configuration:
   ```env
   AXELAR_RPC_URL=https://axelart.tendermintrpc.lava.build
   AXELAR_REST_URL=https://axelart.lava.build
   AXELAR_CHAIN_ID=axelar-testnet-lisbon-3
   AXELAR_MNEMONIC_1=your_mnemonic_here
   AXELAR_MNEMONIC_2=your_second_mnemonic_here
   AXELAR_ADDRESS_1=your_address_1
   AXELAR_ADDRESS_2=your_address_2
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Benchmark

#### Option 1: Direct TypeScript execution
```bash
npm run benchmark:axelar
```

#### Option 2: Using run scripts

**Unix/Linux/macOS:**
```bash
npm run benchmark:axelar:run
```

**Windows:**
```bash
npm run benchmark:axelar:run:win
```

#### Option 3: Manual execution
```bash
npx ts-node results/axelar/benchmark-test/axelar-criteria-benchmark.ts
```

## Output

The benchmark generates two output files:

1. **`axelar-criteria-benchmark-results.json`** - Detailed JSON results
2. **`axelar-criteria-benchmark-results.md`** - Human-readable Markdown report

## Test Criteria

### Security Robustness
1. **Formal Verification Coverage** - % of critical components formally verified
2. **Cryptographic Robustness** - % of critical audit findings remediated
3. **HSM/KMS Support** - Binary support for hardware security modules
4. **Byzantine Fault Tolerance** - Binary support with documented fault tolerance
5. **Vulnerability Assessment Coverage** - Findings per 10 KLOC

### Regulatory Compliance
1. **Atomicity Enforcement** - % of atomic swaps completed successfully
2. **Identity & Access Management** - Binary support for IAM features
3. **Logging & Monitoring** - Checklist score for audit-grade logging
4. **Data Sovereignty Controls** - Number of supported regions
5. **Certifications Coverage** - % of required certifications

### Performance Characteristics
1. **Cross-chain Transaction Latency** - P95 latency for atomic swaps in milliseconds
2. **Throughput Scalability** - Stable atomic swap TPS under load
3. **System Availability** - % availability over monitoring window

### Operational Reliability
1. **Observability Readiness** - Checklist score for monitoring features
2. **Fault Recovery Capabilities** - Mean Time To Recovery (MTTR)
3. **Lifecycle Management Process** - Checklist score for deployment processes

### Economic Factors
1. **Pricing Transparency** - Binary availability of public pricing
2. **1-Year TCO** - Total cost of ownership for reference workload
3. **Cost per 1,000 Transactions** - Transaction cost in GBP
4. **Support & SLA Coverage** - Number of support tiers available

## Notes

- The benchmark uses real Axelar testnet connections where possible
- Some tests are simulated due to the nature of the criteria (e.g., formal verification)
- Results are based on empirical testing methods specified in the dissertation
- The benchmark follows the exact format specified in the criteria table

## Troubleshooting

1. **Connection Issues**: Ensure your `.env` file has correct Axelar configuration
2. **Test Failures**: Some tests may fail due to network conditions or insufficient funds
3. **Timeout Issues**: Increase timeout values in the script if needed
4. **Permission Issues**: Ensure run scripts have execute permissions on Unix systems

## Example Output

```
🚀 Starting Axelar Criteria Benchmark
📊 Testing 20 criteria across 5 domains
⏰ Started at: 2024-01-15T10:30:00.000Z
================================================

✅ Connected to Axelar network

🔒 Testing Security Robustness Domain...
  📋 Testing Formal Verification Coverage...
  🔐 Testing Cryptographic Robustness...
  🔑 Testing HSM/KMS Support...
  🛡️ Testing Byzantine Fault Tolerance...
  🔍 Testing Vulnerability Assessment Coverage...

📋 Testing Regulatory Compliance Domain...
  ⚛️ Testing Atomicity Enforcement...
  👤 Testing Identity & Access Management...
  📊 Testing Logging & Monitoring...
  🌍 Testing Data Sovereignty Controls...
  🏆 Testing Certifications Coverage...

⚡ Testing Performance Characteristics Domain...
  ⏱️ Testing Cross-chain Transaction Latency...
  📈 Testing Throughput Scalability...
  🟢 Testing System Availability...

🔧 Testing Operational Reliability Domain...
  👁️ Testing Observability Readiness...
  🔄 Testing Fault Recovery Capabilities...
  🔄 Testing Lifecycle Management Process...

💰 Testing Economic Factors Domain...
  💵 Testing Pricing Transparency...
  📊 Testing 1-Year TCO...
  💸 Testing Cost per 1,000 Transactions...
  🎧 Testing Support & SLA Coverage...

📊 Generating Benchmark Report...
✅ JSON report saved: results/axelar/benchmark-test/axelar-criteria-benchmark-results.json
✅ Markdown report saved: results/axelar/benchmark-test/axelar-criteria-benchmark-results.md

📈 BENCHMARK SUMMARY
==================================================
Overall Score: 75.0% (15/20 criteria passed)
Test Duration: 45.2 seconds

Domain Scores:
  Security Robustness: 80.0% (4/5)
  Regulatory Compliance: 60.0% (3/5)
  Performance Characteristics: 100.0% (3/3)
  Operational Reliability: 66.7% (2/3)
  Economic Factors: 75.0% (3/4)

✅ Axelar criteria benchmark completed successfully!
```
