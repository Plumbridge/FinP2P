# LayerZero Regulatory Compliance Benchmark

This directory contains the LayerZero regulatory compliance benchmark tests that evaluate the adapter against 5 key regulatory compliance criteria.

## Overview

The benchmark tests LayerZero's cross-chain infrastructure against regulatory compliance requirements using real testnet transactions on Sepolia and Polygon Amoy testnets.

## Test Criteria

### 1. Atomicity Enforcement (unchanged core)
- **Method**: 30 cross-network transfers with injected client retries and one intentional RPC outage (15s drop)
- **Metric**: % atomic (no partial states); retries per success; failure taxonomy with tx hashes on both chains
- **Target**: ≥90% atomicity rate

### 2. Identity & Access Management → "Local RBAC/permissions at the adapter boundary"
- **Method**: Create two principals (API keys/users) within deployment: "Viewer" vs "Operator." Try restricted op (transfer) with Viewer (expect deny) and with Operator (expect allow). Rotate Operator's key and prove old key is refused.
- **Metric**: Denial rate for forbidden operations (target 100%); revocation time-to-effect (s)
- **Target**: ≥90% denial rate for forbidden operations

### 3. Logging & Monitoring → "Minimum evidence set present"
- **Method**: Trigger 5 critical events (authN fail, config change, submit, settle, failure). Check logs for: timestamp (UTC), actor/principal, request ID, source/target chain IDs, result, correlation ID. If a metrics endpoint exists, scrape counters (requests, failures, latency).
- **Metric**: Field completeness across events (target ≥5/5); metrics presence (Y/N)
- **Target**: ≥80% field completeness

### 4. Data Sovereignty Controls → "Policy enforcement signals"
- **Method**: If the adapter exposes a region/policy flag (even if local), set a disallowed region or "EU-only" policy; attempt a transfer flagged for disallowed region; expect denial and an audit log.
- **Metric**: Policy-violation acceptance rate (target 0%); auditability (Y/N)
- **Target**: ≤10% policy violation acceptance rate

### 5. Certifications Coverage → "Machine-verifiable runtime indicators (if present)"
- **Method**: Check for a runtime FIPS/approved-cipher mode toggle and confirm only approved ciphers/curves are used by your process (e.g., crypto lib reports, or SDK exposes mode). Capture signed build artefacts if the project publishes them (cosign attestations).
- **Metric**: FIPS/approved-mode asserted (Y/N) with evidence; build attestation verified (Y/N)
- **Target**: ≥75% certification compliance score

## Files

- `layerzero-regulatory-compliance-benchmark.ts` - Main benchmark script
- `run-regulatory-compliance-benchmark.sh` - Unix/Linux shell script to run the benchmark
- `run-regulatory-compliance-benchmark.bat` - Windows batch file to run the benchmark
- `layerzero-regulatory-compliance-benchmark-results.json` - Detailed JSON results (generated after run)
- `layerzero-regulatory-compliance-benchmark-results.md` - Formatted Markdown results (generated after run)

## Prerequisites

1. **Node.js** (v16 or higher)
2. **npm** or **yarn**
3. **TypeScript** (installed globally or via npx)
4. **Environment Variables** (see below)

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Sepolia Testnet
ETHEREUM_SEPOLIA_URL=https://ethereum-sepolia-rpc.publicnode.com
SEPOLIA_PRIVATE_KEY=your_sepolia_private_key
SEPOLIA_WALLET_ADDRESS=your_sepolia_wallet_address
SEPOLIA_PRIVATE_KEY_2=your_second_sepolia_private_key

# Polygon Amoy Testnet
POLYGON_AMOY_PRIVATE_KEY_1=your_polygon_amoy_private_key_1
POLYGON_AMOY_PRIVATE_KEY_2=your_polygon_amoy_private_key_2

# Optional: Other testnets
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
ARBITRUM_SEPOLIA_PRIVATE_KEY=your_arbitrum_sepolia_private_key
ARBITRUM_SEPOLIA_WALLET_ADDRESS=your_arbitrum_sepolia_wallet_address

BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_SEPOLIA_PRIVATE_KEY=your_base_sepolia_private_key
BASE_SEPOLIA_WALLET_ADDRESS=your_base_sepolia_wallet_address
```

## Running the Benchmark

### Option 1: Using the Shell Script (Unix/Linux/macOS)
```bash
cd results/layerzero/regulatory-compliance
./run-regulatory-compliance-benchmark.sh
```

### Option 2: Using the Batch File (Windows)
```cmd
cd results\layerzero\regulatory-compliance
run-regulatory-compliance-benchmark.bat
```

### Option 3: Direct TypeScript Execution
```bash
cd results/layerzero/regulatory-compliance
npx ts-node layerzero-regulatory-compliance-benchmark.ts
```

## Important Notes

⚠️ **REAL TRANSACTIONS**: This benchmark executes real transactions on testnets:
- Real ETH will be spent on gas fees
- Real testnet tokens will be transferred
- Balances will actually change on the blockchain
- This is NOT a simulation

## Expected Results

The benchmark will generate:
1. **JSON Results**: Detailed machine-readable results with all metrics and evidence
2. **Markdown Results**: Human-readable formatted results
3. **Console Output**: Real-time progress and status updates

## Troubleshooting

### Common Issues

1. **"No supported chains configured"**
   - Ensure environment variables are properly set
   - Check that private keys and wallet addresses are valid

2. **"Insufficient balance"**
   - Ensure testnet wallets have sufficient ETH for gas fees
   - Get testnet ETH from faucets if needed

3. **"RPC connection failed"**
   - Check internet connection
   - Verify RPC URLs are correct and accessible

4. **"TypeScript not found"**
   - Install TypeScript globally: `npm install -g typescript`
   - Or use npx: `npx ts-node` instead of `ts-node`

### Getting Testnet Tokens

- **Sepolia ETH**: https://sepoliafaucet.com/
- **Polygon Amoy POL**: https://faucet.polygon.technology/

## Benchmark Duration

The benchmark typically takes 5-10 minutes to complete, depending on:
- Network conditions
- RPC response times
- Number of retries needed
- Testnet congestion

## Results Interpretation

- **Passed**: Criterion meets or exceeds the target threshold
- **Failed**: Criterion does not meet the target threshold
- **Partial**: Criterion partially meets requirements
- **Not Applicable**: Criterion cannot be tested in current environment

## Support

For issues or questions about this benchmark, please refer to the main project documentation or create an issue in the project repository.
