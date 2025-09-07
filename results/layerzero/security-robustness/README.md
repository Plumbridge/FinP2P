# LayerZero Security Robustness Benchmark

This directory contains the LayerZero security robustness benchmark tests that evaluate the adapter against 5 key security robustness criteria.

## Overview

The benchmark tests LayerZero's cross-chain infrastructure against security robustness requirements using real testnet transactions on Sepolia and Polygon Amoy testnets.

## Test Criteria

### 1. Formal Verification Coverage
- **Method**: Runtime conformance to claimed invariants (black-box)
- **Metric**: FVC compliance score (%)
- **Target**: ≥90% FVC compliance
- **Tests**: Replay rejection, value conservation, finalization timing, idempotency

### 2. Cryptographic Robustness
- **Method**: Signature binding & tamper rejection (on-chain verifiable)
- **Metric**: Crypto compliance score (%)
- **Target**: ≥95% crypto compliance
- **Tests**: Sender authenticity, domain separation, tamper rejection

### 3. HSM/KMS Support
- **Method**: Signer abstraction / external-signer compatibility (software proxy)
- **Metric**: HSM compliance score (%)
- **Target**: ≥80% HSM compliance
- **Tests**: External signer compatibility, key rotation simulation

### 4. Byzantine Fault Tolerance
- **Method**: Quorum/finality enforcement at the API boundary
- **Metric**: BFT compliance score (%)
- **Target**: ≥85% BFT compliance
- **Tests**: Finality threshold conformance, stale state rejection

### 5. Vulnerability Assessment Coverage
- **Method**: Surface scan of deployed components only
- **Metric**: Vuln compliance score (%)
- **Target**: ≥75% vuln compliance
- **Tests**: Container scan, dependency audit, endpoint scan

## Files

- `layerzero-security-robustness-benchmark.ts` - Main benchmark script
- `run-security-robustness-benchmark.sh` - Unix/Linux shell script to run the benchmark
- `run-security-robustness-benchmark.bat` - Windows batch file to run the benchmark
- `layerzero-security-robustness-benchmark-results.json` - Detailed JSON results (generated after run)
- `layerzero-security-robustness-benchmark-results.md` - Formatted Markdown results (generated after run)

## Prerequisites

1. **Node.js** (v16 or higher)
2. **npm** or **yarn**
3. **TypeScript** (installed globally or via npx)
4. **Environment Variables** (see below)

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Sepolia Testnet
ETHEREUM_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
SEPOLIA_PRIVATE_KEY=your_sepolia_private_key
SEPOLIA_WALLET_ADDRESS=your_sepolia_wallet_address
SEPOLIA_PRIVATE_KEY_2=your_second_sepolia_private_key

# Polygon Amoy Testnet
POLYGON_AMOY_TESTNET_RPC_URL=https://polygon-amoy.infura.io/v3/YOUR_KEY
POLYGON_AMOY_TESTNET_PRIVATE_KEY=your_polygon_amoy_private_key
POLYGON_AMOY_TESTNET_PRIVATE_KEY_2=your_second_polygon_amoy_private_key

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
cd results/layerzero/security-robustness
./run-security-robustness-benchmark.sh
```

### Option 2: Using the Batch File (Windows)
```cmd
cd results\layerzero\security-robustness
run-security-robustness-benchmark.bat
```

### Option 3: Direct TypeScript Execution
```bash
cd results/layerzero/security-robustness
npx ts-node layerzero-security-robustness-benchmark.ts
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
2. **Markdown Results**: Human-readable formatted results with exact percentages and failure rates

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

### Score Interpretation
- **90-100%**: Excellent security posture
- **70-89%**: Good security posture with minor issues
- **50-69%**: Moderate security posture requiring attention
- **0-49%**: Poor security posture requiring immediate action

### Testnet Considerations

Some tests may show "partial" or "failed" results due to testnet characteristics:
- **Fast Finality**: Testnets often have faster finality than mainnet
- **Relaxed Enforcement**: Some security checks may be relaxed on testnets
- **RPC Limitations**: Free-tier RPC providers may have rate limits

These results should be interpreted in the context of the testnet environment.

## Support

For issues or questions about this benchmark, please refer to the main project documentation or create an issue in the project repository.