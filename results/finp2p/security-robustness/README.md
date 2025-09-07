# FinP2P Security Robustness Benchmark

This benchmark tests FinP2P's Security Robustness across 5 critical criteria using real testnet integration.

## Overview

The Security Robustness benchmark evaluates FinP2P's security capabilities through comprehensive testing of:

1. **Formal Verification Coverage** - Runtime conformance to claimed invariants
2. **Cryptographic Robustness** - Signature binding & tamper rejection
3. **HSM/KMS Support** - External signer compatibility and key management
4. **Byzantine Fault Tolerance** - Finality enforcement and stale state rejection
5. **Vulnerability Assessment Coverage** - Security scanning of deployed components

## Prerequisites

- Node.js (v16 or higher)
- TypeScript
- Access to Sui and Hedera testnets with funded accounts
- FinP2P API credentials

## Environment Variables

**REQUIRED** - Set these environment variables for real testnet testing:

```bash
# Sui Testnet Configuration
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
SUI_PRIVATE_KEY=suiprivkey1qqrl7wcndzvk20u3ernfxzr9zcvvyf3k8nm2jr0v4es7durxvhqjugyd6mx
SUI_ADDRESS=0x30c0c2bbd78f8267456ad9bd44ae459bf259d3adeff1f3ef45a6bc594459892d
SUI_ADDRESS_2=0x9c2a8b4a95b69196ecc478ef1f97c64076dc5c536bf89a7a637eb89047840f95

# Hedera Testnet Configuration  
HEDERA_ACCOUNT_ID=0.0.6255967
HEDERA_PRIVATE_KEY=3030020100300706052b8104000a04220420fd93d0536bcd2419aa964cbd85ccac8cde20c9ed65e4a33f4f3bbc87109262b6
HEDERA_ACCOUNT_ID_2=0.0.6427779
HEDERA_PRIVATE_KEY_2=302e020100300506032b657004220420d54a55e67696fcd7ea2fea3f1827497486be664786f6970208108203a401f8e2

# FinP2P Configuration
ROUTER_ID=your-organization-id
FINP2P_API_KEY=your-api-key-here
FINP2P_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
OWNERA_API_ADDRESS=https://api.finp2p.org
```

## Running the Benchmark

### Windows
```cmd
run-security-robustness-benchmark.bat
```

### Linux/macOS
```bash
./run-security-robustness-benchmark.sh
```

### Manual Execution
```bash
# Compile TypeScript
npx tsc finp2p-security-robustness-benchmark.ts --target es2020 --module commonjs --esModuleInterop --skipLibCheck --outDir .

# Run benchmark
node finp2p-security-robustness-benchmark.js
```

## Test Criteria

### 1. Formal Verification Coverage
- **Replay Rejection**: Tests that duplicate transfers with same idempotency key are rejected
- **Value Conservation**: Verifies that total debits equal total credits across multiple transfers
- **No Premature Finalization**: Ensures settlement only occurs after required confirmations
- **Idempotency Under Retries**: Confirms exactly one settlement for concurrent retry attempts

### 2. Cryptographic Robustness
- **Sender Authenticity**: Verifies transaction sender matches expected key
- **Domain Separation**: Tests that signatures are chain-specific and not replayable
- **Tamper Check**: Ensures tampered requests are rejected with signature mismatch

### 3. HSM/KMS Support
- **External Signer Flow**: Tests integration with external signing services
- **Key Rotation**: Measures time to rotate cryptographic keys
- **Post-Revocation Acceptance**: Verifies revoked keys are rejected

### 4. Byzantine Fault Tolerance
- **Finality Threshold Conformance**: Tests settlement timing against confirmation thresholds
- **Stale State Rejection**: Ensures transfers with stale block references are rejected

### 5. Vulnerability Assessment Coverage
- **DAST Scanning**: Performs dynamic application security testing on endpoints
- **Container Scanning**: Scans container images for vulnerabilities

## Results

The benchmark generates two output files:

- `finp2p-security-robustness-benchmark-results.json` - Detailed JSON results
- `finp2p-security-robustness-benchmark-results.md` - Human-readable markdown report

## Expected Output

```
🔒 Starting FinP2P Security Robustness Benchmark
🎯 Testing 5 critical security robustness criteria

🔧 Setting up FinP2P infrastructure for security testing...
✅ FinP2P Router started
✅ FinP2P infrastructure setup complete

🔍 Running Formal Verification Coverage Tests...
  Testing replay rejection...
  Testing value conservation...
  Testing no premature finalization...
  Testing idempotency under retries...
✅ Formal Verification Coverage: PASSED (100%)

🔐 Running Cryptographic Robustness Tests...
  Testing sender authenticity...
  Testing domain separation...
  Testing tamper check...
✅ Cryptographic Robustness: PASSED (100%)

🔑 Running HSM/KMS Support Tests...
  Testing external signer flow...
  Testing key rotation...
  Testing post-revocation acceptance...
✅ HSM/KMS Support: PASSED (100%)

🛡️ Running Byzantine Fault Tolerance Tests...
  Testing finality threshold conformance...
  Testing stale state rejection...
✅ Byzantine Fault Tolerance: PASSED (100%)

🔍 Running Vulnerability Assessment Tests...
  Running DAST scanning...
  Running container scanning...
✅ Vulnerability Assessment Coverage: PASSED (100%)

📊 Final Results: 100% overall score
⏱️ Duration: 45.2s

✅ Results saved to finp2p-security-robustness-benchmark-results.json and finp2p-security-robustness-benchmark-results.md

🎉 Security Robustness Benchmark completed successfully!
📊 Overall Score: 100%
⏱️ Duration: 45.2s
```

## Troubleshooting

### Common Issues

1. **TypeScript Compilation Errors**
   - Ensure TypeScript is installed: `npm install -g typescript`
   - Check that all dependencies are available

2. **Network Connection Issues**
   - Verify internet connectivity
   - Check if testnet endpoints are accessible
   - Run in demo mode if credentials are not available

3. **Permission Errors (Linux/macOS)**
   - Make script executable: `chmod +x run-security-robustness-benchmark.sh`

4. **Missing Dependencies**
   - Run `npm install` in the project root
   - Ensure all FinP2P adapters are built

### Real Testnet Mode

The benchmark requires real testnet credentials and will perform actual transactions on Sui and Hedera testnets. Ensure your accounts are funded with test tokens before running the benchmark.

## Security Notes

- This benchmark performs real security testing and may interact with testnet networks
- Ensure you're using testnet credentials only
- The benchmark does not perform actual attacks but tests defensive mechanisms
- All testing is performed in a controlled environment

## Contributing

To add new security tests or modify existing ones:

1. Edit `finp2p-security-robustness-benchmark.ts`
2. Add new test methods following the existing pattern
3. Update the criteria list and scoring logic
4. Test thoroughly with both real and demo modes
5. Update this README with any new requirements
