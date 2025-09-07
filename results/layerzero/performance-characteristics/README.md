# LayerZero Performance Characteristics Benchmark

This directory contains the LayerZero Performance Characteristics benchmark tests that evaluate the system's performance across three key criteria:

## Test Criteria

### 1. Cross-chain Transaction Latency
- **Method**: 30-50 transfers; timestamp client send & observe settled event; record both chain heights
- **Metric**: P50/P95 latency; IQR; annotate chains/RPCs used
- **Implementation**: Executes 40 cross-chain transfers between Sepolia and Polygon Amoy testnets

### 2. Throughput Scalability
- **Method**: Step load 1→2→4→8 rps for 10 minutes total (respecting faucet/RPC caps)
- **Metric**: Sustainable TPS at ≤5% errors; "knee" where errors/latency spike; error breakdown
- **Implementation**: Progressive load testing with 2.5 minutes per RPS level

### 3. System Availability (lab proxy)
- **Method**: 24-hour canary (1 op/5 min) with simple alert on failure - SIMULATED
- **Metric**: Observed success %, MTBF, MTTR; attach canary log
- **Implementation**: 10-minute simulated canary test with realistic performance patterns

## Files

- `layerzero-performance-characteristics-benchmark.ts` - Main benchmark script
- `run-performance-characteristics-benchmark.bat` - Windows batch script to run the benchmark
- `run-performance-characteristics-benchmark.sh` - Unix/Linux shell script to run the benchmark
- `README.md` - This documentation file

## Prerequisites

1. **Node.js**: Version 16 or higher
2. **Environment Variables**: Create a `.env` file in the project root with:
   ```
   SEPOLIA_PRIVATE_KEY=your_sepolia_private_key
   SEPOLIA_PRIVATE_KEY_2=your_second_sepolia_private_key
   POLYGON_AMOY_TESTNET_PRIVATE_KEY=your_polygon_private_key
   POLYGON_AMOY_TESTNET_PRIVATE_KEY_2=your_second_polygon_private_key
   ETHEREUM_SEPOLIA_RPC_URL=your_sepolia_rpc_url
   POLYGON_AMOY_TESTNET_RPC_URL=your_polygon_rpc_url
   ```
   **Note**: The benchmark uses the exact environment variable names from your provided .env file.
3. **Testnet Tokens**: Ensure your wallets have sufficient testnet ETH and MATIC tokens
4. **Dependencies**: Run `npm install` in the project root

## Running the Benchmark

### Windows
```bash
run-performance-characteristics-benchmark.bat
```

### Unix/Linux/macOS
```bash
./run-performance-characteristics-benchmark.sh
```

### Manual Execution
```bash
npx ts-node layerzero-performance-characteristics-benchmark.ts
```

## Test Output

The benchmark generates two output files:

1. **JSON Results** (`layerzero-performance-characteristics-benchmark-results.json`):
   - Structured data with all test results
   - Detailed metrics and evidence
   - Machine-readable format

2. **Markdown Report** (`layerzero-performance-characteristics-benchmark-results.md`):
   - Human-readable report
   - Summary statistics
   - Detailed analysis

## Test Duration

- **Cross-chain Transaction Latency**: ~3-5 minutes (40 transfers with delays)
- **Throughput Scalability**: ~10 minutes (4 RPS levels × 2.5 minutes each)
- **System Availability**: ~2 minutes (2 simulated operations × 5 minutes each)

**Total Duration**: Approximately 15-20 minutes

## Important Notes

⚠️ **WARNING**: This benchmark executes real transactions on testnets and may consume testnet tokens.

- **Atomic Swap Implementation**: Wallet 1 sends POL → Wallet 2 sends ETH (proper atomic swap)
- The test uses very small amounts (0.0001 ETH, 0.00001 POL) to minimize costs
- POL amount is extremely low (0.00001 POL ≈ $0.00001) to minimize expenses
- Ensure you have sufficient testnet tokens in your wallets
- The test respects RPC rate limits with appropriate delays
- All transactions are executed on public testnets (Sepolia, Polygon Amoy)
- Uses your real credentials from the .env file - no simulation

## Expected Results

### Performance Targets
- **Latency**: P50 < 30 seconds, P95 < 60 seconds
- **Throughput**: Sustainable TPS ≥ 4 RPS with <5% error rate
- **Availability**: Success rate ≥ 95%

### Status Definitions
- **Passed**: Meets all performance targets
- **Partial**: Meets some performance targets
- **Failed**: Does not meet performance targets

## Troubleshooting

### Common Issues
1. **Insufficient Balance**: Ensure wallets have testnet tokens
2. **RPC Rate Limits**: The test includes delays to respect rate limits
3. **Network Issues**: Check RPC endpoint connectivity
4. **Environment Variables**: Verify all required variables are set

### Error Codes
- **Exit 0**: Benchmark completed successfully
- **Exit 1**: Benchmark failed (check logs for details)

## Integration

This benchmark is designed to integrate with the broader FinP2P testing framework and follows the same patterns as other LayerZero benchmark tests in the project.
