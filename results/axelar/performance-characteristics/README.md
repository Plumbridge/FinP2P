# Axelar Performance Characteristics Benchmark

This directory contains the Performance Characteristics benchmark for the Axelar cross-chain protocol evaluation.

## Overview

The Performance Characteristics benchmark tests three critical performance criteria:

1. **Cross-chain Transaction Latency** - Measures P50/P95 latency for 30-50 transfers
2. **Throughput Scalability** - Tests sustainable TPS with step load 1→2→4→8 rps
3. **System Availability** - 24-hour canary monitoring with 1 operation per 5 minutes

## Files

- `axelar-performance-characteristics-benchmark.ts` - Main benchmark script
- `run-performance-benchmark.sh` - Unix/Linux run script
- `run-performance-benchmark.bat` - Windows run script
- `axelar-performance-characteristics-benchmark-results.json` - JSON results (generated)
- `axelar-performance-characteristics-benchmark-results.md` - Markdown results (generated)

## Prerequisites

1. Node.js and npm installed
2. TypeScript and ts-node installed globally or locally
3. Environment variables configured in `.env` file
4. Sufficient testnet tokens for testing

## Environment Setup

Create a `.env` file in the project root with:

```bash
# Axelar testnet configuration
AXELAR_MNEMONIC_1=your_mnemonic_phrase_here
AXELAR_MNEMONIC_2=your_second_mnemonic_phrase_here
AXELAR_ADDRESS_1=your_axelar_address_1
AXELAR_ADDRESS_2=your_axelar_address_2
AXELAR_RPC_URL=https://axelart.tendermintrpc.lava.build
AXELAR_REST_URL=https://axelart.lava.build
AXELAR_CHAIN_ID=axelar-testnet-lisbon-3
```

## Running the Benchmark

### Unix/Linux/macOS
```bash
chmod +x run-performance-benchmark.sh
./run-performance-benchmark.sh
```

### Windows
```cmd
run-performance-benchmark.bat
```

### Direct execution
```bash
npx ts-node axelar-performance-characteristics-benchmark.ts
```

## Test Criteria Details

### 1. Cross-chain Transaction Latency

**Method:** 30–50 transfers; timestamp client send & observe settled event; record both chain heights

**Metrics:**
- P50/P95 latency
- IQR (Interquartile Range)
- Success rate
- Chain heights recorded
- RPC endpoints used

**Expected Results:**
- P95 latency < 30s for "passed"
- P95 latency < 60s for "partial"
- Success rate > 90% for "passed"

### 2. Throughput Scalability

**Method:** Step load 1→2→4→8 rps for 10 minutes total (respecting faucet/RPC caps)

**Metrics:**
- Sustainable TPS at ≤5% errors
- "Knee" point where errors/latency spike
- Error breakdown by type
- Average latency per step
- P95 latency per step

**Expected Results:**
- Sustainable TPS ≥ 4 for "passed"
- Sustainable TPS ≥ 2 for "partial"
- Error rate ≤ 5% for "passed"

### 3. System Availability (lab proxy)

**Method:** 24-hour canary (1 op/5 min) with simple alert on failure

**Metrics:**
- Observed success %
- MTBF (Mean Time Between Failures)
- MTTR (Mean Time To Recovery)
- Canary log entries
- Failure categorization

**Expected Results:**
- Success rate ≥ 99.5% for "passed"
- Success rate ≥ 99.0% for "partial"

## Results Interpretation

### Status Levels
- **passed** - Meets all performance criteria
- **partial** - Meets most criteria with minor issues
- **failed** - Does not meet performance requirements

### Key Metrics
- **Latency**: Time from transaction submission to settlement confirmation
- **Throughput**: Maximum sustainable transactions per second
- **Availability**: System uptime and reliability over extended periods

## Notes

- Tests use Axelar testnet to avoid mainnet costs
- Rate limiting respects testnet faucet and RPC caps
- 24-hour canary is simulated for demonstration (1-hour simulation)
- All tests include comprehensive error handling and logging
- Results are saved in both JSON and Markdown formats

## Troubleshooting

### Common Issues

1. **Insufficient funds**: Ensure testnet wallets have sufficient tokens
2. **RPC rate limits**: Tests include delays to respect rate limits
3. **Network connectivity**: Check RPC endpoint availability
4. **Environment variables**: Verify all required env vars are set

### Debug Mode

Set `DEBUG=true` in environment to enable verbose logging:

```bash
DEBUG=true ./run-performance-benchmark.sh
```

## Performance Expectations

Based on Axelar testnet characteristics:

- **Latency**: 5-30 seconds typical, 60+ seconds under load
- **Throughput**: 1-8 TPS sustainable depending on network conditions
- **Availability**: 99%+ expected for testnet infrastructure

## Contributing

When modifying the benchmark:

1. Maintain the exact test criteria specifications
2. Preserve evidence collection and logging
3. Update this README with any changes
4. Test thoroughly on testnet before deployment
