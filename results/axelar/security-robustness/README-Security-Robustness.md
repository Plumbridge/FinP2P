# Axelar Security Robustness Benchmark

This benchmark script tests the 5 Security Robustness criteria for the Axelar cross-chain adapter using real testnet connections and empirical methods.

## Security Robustness Criteria (5)

### 1. Formal Verification Coverage
**Method:** Runtime conformance to claimed invariants (black-box)
- **Replay rejection:** Submit the same logical transfer twice (same idempotency key / same params)
- **Value conservation:** Track source & destination balances across N transfers; assert Σ debits = Σ credits ± fees
- **No premature finalization:** Set confirmations=N and prove settlement events only occur ≥N confs later
- **Idempotency under retries:** Burst client retries for the same transfer while first is in-flight; expect exactly one settlement

**Metric:** Invariant violation rate across the suite (target 0%)

### 2. Cryptographic Robustness
**Method:** Signature binding & tamper rejection (on-chain verifiable)
- **Sender authenticity:** For each submitted transaction, fetch the chain receipt and verify the sender address matches the key used
- **Domain separation:** Sign a message for chain A; attempt to replay the signed payload against chain B; expect rejection
- **Tamper check:** Sign a request, mutate a parameter before broadcast, broadcast; node should reject with signature mismatch

**Metric:** Mismatch acceptance rate (target 0%)

### 3. HSM/KMS Support
**Method:** Signer abstraction / external-signer compatibility (software proxy)
- **External signer flow:** Configure the client/SDK to use a custom signer function instead of in-process keys
- **Key rotation:** Rotate to a new key, then revoke the old key by removing it from the signer
- **Post-revocation test:** Run a transfer before/after revocation

**Metric:** External-signer flow works (Y/N), time-to-rotation (seconds), post-revocation acceptance rate (target 0%)

### 4. Byzantine Fault Tolerance
**Method:** Quorum/finality enforcement at the API boundary
- **Finality threshold conformance:** Vary confirmations N=0/1/2; for each, run 20 transfers; settlement events must occur only after ≥N source confirmations
- **Stale/contradictory state rejection:** Attempt to submit using stale source block references; transfers referencing reorged blocks must not finalize

**Metric:** Premature-finalization rate (target 0%); % of attempts referencing stale/reorged state that still finalize (target 0%)

### 5. Vulnerability Assessment Coverage
**Method:** Surface scan of deployed components only
- **Container scan:** Run Trivy/Grype on container images (if running in container)
- **Dependency audit:** Run npm audit to check for known vulnerabilities
- **Endpoint scan:** Check for exposed local endpoints

**Metric:** High/critical findings count with fix availability

## Prerequisites

1. **Environment Setup:**
   ```bash
   # Install dependencies
   npm install
   
   # Set up environment variables in .env file
   AXELAR_RPC_URL=https://axelart.tendermintrpc.lava.build
   AXELAR_REST_URL=https://axelart.lava.build
   AXELAR_CHAIN_ID=axelar-testnet-lisbon-3
   AXELAR_MNEMONIC_1="your testnet mnemonic 1"
   AXELAR_MNEMONIC_2="your testnet mnemonic 2"
   AXELAR_ADDRESS_1="your testnet address 1"
   AXELAR_ADDRESS_2="your testnet address 2"
   ```

2. **Testnet Tokens:**
   - Ensure you have AXL tokens on Axelar testnet for testing
   - Get testnet tokens from Axelar faucet if needed

3. **Optional Tools:**
   - Trivy (for container vulnerability scanning)
   - Docker (if running in container)

## Usage

### Run the Security Robustness Benchmark

```bash
# Navigate to the benchmark directory
cd results/axelar/benchmark-test

# Run the Security Robustness benchmark
npx ts-node axelar-security-robustness-benchmark.ts
```

### Expected Output

The benchmark will:
1. Connect to Axelar testnet
2. Run all 5 Security Robustness criteria tests
3. Generate detailed evidence and logs
4. Create JSON and Markdown reports
5. Display a summary of results

### Sample Output

```
🔒 Starting Axelar Security Robustness Benchmark
📊 Testing 5 Security Robustness criteria
⏰ Started at: 2024-01-15T10:30:00.000Z
================================================

🔗 Connecting to Axelar network...
✅ Connected to Axelar network

🔒 Testing Security Robustness Domain (5/5 criteria)...

  📋 Testing Formal Verification Coverage...
    Testing replay rejection...
    Testing value conservation...
    Testing finalization timing...
    Testing idempotency under retries...

  🔐 Testing Cryptographic Robustness...
    Testing sender authenticity...
    Testing domain separation...
    Testing tamper rejection...

  🔑 Testing HSM/KMS Support...
    Testing external signer compatibility...
    Testing key rotation...

  🛡️ Testing Byzantine Fault Tolerance...
    Testing finality threshold conformance...
    Testing stale state rejection...

  🔍 Testing Vulnerability Assessment Coverage...
    Scanning container images...
    Checking dependency vulnerabilities...
    Checking exposed endpoints...

📊 Generating Security Robustness Benchmark Report...
✅ JSON report saved: axelar-security-robustness-benchmark-results.json
✅ Markdown report saved: axelar-security-robustness-benchmark-results.md

📈 SECURITY ROBUSTNESS BENCHMARK SUMMARY
==================================================
Overall Score: 85.0% (4/5 criteria passed)
Test Duration: 45.2 seconds

Criteria Results:
  ✅ Formal Verification Coverage: passed
  ✅ Cryptographic Robustness: passed
  ✅ HSM/KMS Support: passed
  ⚠️ Byzantine Fault Tolerance: partial
  ❌ Vulnerability Assessment Coverage: failed
```

## Reports

The benchmark generates two types of reports:

### 1. JSON Report (`axelar-security-robustness-benchmark-results.json`)
Contains structured data with:
- Test metadata (date, duration, overall score)
- Detailed results for each criterion
- Evidence and proof data
- Error logs and traces

### 2. Markdown Report (`axelar-security-robustness-benchmark-results.md`)
Human-readable report with:
- Summary table of all criteria
- Pass/fail status for each test
- Detailed methodology descriptions

## Test Evidence

Each test collects comprehensive evidence including:
- **Transaction hashes** for verification
- **Timestamps** for timing analysis
- **Balance snapshots** for conservation checks
- **Error logs** for debugging
- **Configuration details** for reproducibility
- **Proof data** for audit trails

## Troubleshooting

### Common Issues

1. **Connection Failed:**
   - Check RPC URLs are accessible
   - Verify network connectivity
   - Ensure testnet is operational

2. **Insufficient Balance:**
   - Get testnet tokens from faucet
   - Check wallet addresses are correct
   - Verify mnemonic phrases

3. **Transaction Failures:**
   - Check gas fees are sufficient
   - Verify destination addresses are valid
   - Ensure chains are supported

4. **Vulnerability Scan Issues:**
   - Install required tools (Trivy, etc.)
   - Check file permissions
   - Verify container environment

### Debug Mode

For detailed debugging, set environment variable:
```bash
DEBUG=axelar:* npx ts-node axelar-security-robustness-benchmark.ts
```

## Security Considerations

- **Testnet Only:** This benchmark uses testnet environments only
- **No Real Funds:** All tests use testnet tokens with no real value
- **Evidence Collection:** Sensitive data is logged for analysis - ensure proper handling
- **Network Access:** Benchmark requires internet access to testnet RPC endpoints

## Contributing

To add new tests or modify existing ones:
1. Follow the existing test structure
2. Add comprehensive evidence collection
3. Include proper error handling
4. Update documentation
5. Test thoroughly on testnet

## License

This benchmark is part of the cross-chain adapter evaluation framework and follows the same license terms.
