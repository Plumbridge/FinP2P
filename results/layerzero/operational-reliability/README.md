# LayerZero Operational Reliability Benchmark

This directory contains the operational reliability benchmark tests for LayerZero, implementing the 3 criteria from the dissertation evaluation framework.

## Overview

The LayerZero Operational Reliability Benchmark tests three key criteria:

1. **Observability Readiness** - Tests logs, metrics, and traces with correlation IDs
2. **Fault Recovery Capabilities** - Tests system recovery after failures with MTTR measurement
3. **Lifecycle Management Process** - Tests configuration changes and connection state management

## Files

- `layerzero-operational-reliability-benchmark.ts` - Main benchmark script
- `run-operational-reliability-benchmark.bat` - Windows batch script to run the benchmark
- `run-operational-reliability-benchmark.sh` - Unix shell script to run the benchmark
- `README.md` - This documentation file

## Prerequisites

1. **Node.js** (v16 or higher)
2. **TypeScript** (`npm install -g typescript`)
3. **Environment Variables** - Set up your `.env` file with:
   ```
   # Sepolia Testnet
   ETHEREUM_SEPOLIA_URL=https://ethereum-sepolia-rpc.publicnode.com
   SEPOLIA_PRIVATE_KEY=your_private_key_here
   SEPOLIA_WALLET_ADDRESS=your_wallet_address_here
   
   # Polygon Amoy Testnet
   POLYGON_AMOY_TESTNET_RPC_URL=https://rpc-amoy.polygon.technology
   POLYGON_AMOY_TESTNET_PRIVATE_KEY_1=your_private_key_1_here
   POLYGON_AMOY_TESTNET_PRIVATE_KEY_2=your_private_key_2_here
   
   # Optional: Other testnets
   ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
   ARBITRUM_SEPOLIA_PRIVATE_KEY=your_private_key_here
   ARBITRUM_SEPOLIA_WALLET_ADDRESS=your_wallet_address_here
   
   BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
   BASE_SEPOLIA_PRIVATE_KEY=your_private_key_here
   BASE_SEPOLIA_WALLET_ADDRESS=your_wallet_address_here
   ```

## Running the Benchmark

### Windows
```bash
run-operational-reliability-benchmark.bat
```

### Unix/Linux/macOS
```bash
chmod +x run-operational-reliability-benchmark.sh
./run-operational-reliability-benchmark.sh
```

### Manual Execution
```bash
npx ts-node layerzero-operational-reliability-benchmark.ts
```

## Test Criteria Details

### 1. Observability Readiness

**Method:** Enable logs + metrics + traces, demonstrate successful and failed transfers with correlating IDs

**Metrics:**
- Triad present (Y/N) - Are logs, metrics, and traces all present?
- 5-field completeness score - Are all required fields present in logs?

**Test Process:**
1. Execute successful transfer with full observability
2. Execute failed transfer with full observability
3. Analyze correlation IDs across logs, metrics, and traces
4. Calculate completeness score for log fields

### 2. Fault Recovery Capabilities

**Method:** Kill local relayer/client mid-transfer and during idle; restart

**Metrics:**
- MTTR (Mean Time To Recovery) in seconds
- Exactly-once completion rate after restart
- Manual steps count

**Test Process:**
1. Test idle restart recovery (disconnect/reconnect when idle)
2. Test mid-transfer restart recovery (disconnect during transfer)
3. Measure recovery times and success rates
4. Count manual intervention steps

### 3. Lifecycle Management Process

**Method:** Test configuration changes, connection state management, and system resilience during operational changes

**Metrics:**
- Configuration change success (Y/N)
- Connection resilience (Y/N)
- State transition time (seconds)
- Operational compatibility issues (count)

**Test Process:**
1. Test configuration changes (RPC URL updates)
2. Test connection state management (disconnect/reconnect cycles)
3. Test state transitions and measure transition times
4. Count compatibility issues during changes

## Expected Results

The benchmark will generate:

1. **JSON Results** - `layerzero-operational-reliability-benchmark-results.json`
2. **Markdown Report** - `layerzero-operational-reliability-benchmark-results.md`

## Test Environment

- **Primary Chains:** Ethereum Sepolia ↔ Polygon Amoy
- **Testnet Mode:** Enabled
- **Real Transactions:** Yes (uses actual testnet transactions)
- **Test Wallets:** 4 wallets (2 per chain)

## Limitations

1. **LayerZero Adapter Limitations:**
   - No automatic fault recovery - requires manual reconnection
   - Transfers are not automatically retried after disconnection
   - Limited observability compared to enterprise solutions

2. **Testnet Limitations:**
   - Network latency may affect timing measurements
   - Testnet stability may impact test results
   - Limited transaction history for analysis

## Troubleshooting

### Common Issues

1. **"No supported chains configured"**
   - Check your `.env` file has the required private keys and wallet addresses
   - Ensure RPC URLs are accessible

2. **"Insufficient balance"**
   - Get testnet ETH from Sepolia faucets
   - Get testnet MATIC from Polygon Amoy faucets

3. **"Network connection failed"**
   - Check RPC URL accessibility
   - Verify network connectivity
   - Try alternative RPC endpoints

### Debug Mode

Set `DEBUG=true` in your environment to enable verbose logging:

```bash
DEBUG=true npx ts-node layerzero-operational-reliability-benchmark.ts
```

## Contributing

When modifying the benchmark:

1. Maintain the same test structure and metrics
2. Update documentation for any new tests
3. Ensure all tests use real testnet transactions
4. Add proper error handling and cleanup
5. Update the README with any new requirements

## Related Files

- `../../../adapters/layerzero/LayerZeroAdapter.ts` - LayerZero adapter implementation
- `../../../adapters/layerzero/HTLCContract.ts` - HTLC contract for atomic swaps
- `../../../demos/layerzero/layerzero-adapter-demo.ts` - LayerZero demo script
