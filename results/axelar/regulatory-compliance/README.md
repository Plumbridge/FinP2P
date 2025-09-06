# Axelar Regulatory Compliance Benchmark

This directory contains the regulatory compliance benchmark for the Axelar adapter, implementing empirical testing methods for the 5 regulatory compliance criteria from the dissertation evaluation framework.

## Regulatory Compliance Criteria (5)

### 1. Atomicity Enforcement (unchanged core)
- **Method**: 30 cross-network transfers with injected client retries and one intentional RPC outage (15s drop)
- **Metric**: % atomic (no partial states); retries per success; failure taxonomy with tx hashes on both chains
- **Target**: High atomicity rate with minimal partial states

### 2. Identity & Access Management → "Local RBAC/permissions at the adapter boundary"
- **Method**: Create two principals (API keys/users) within deployment: "Viewer" vs "Operator." Try restricted op (transfer) with Viewer (expect deny) and with Operator (expect allow). Rotate Operator's key and prove old key is refused.
- **Metric**: Denial rate for forbidden op (target 100%); revocation time-to-effect (s)
- **Target**: 100% denial rate for forbidden operations

### 3. Logging & Monitoring → "Minimum evidence set present"
- **Method**: Trigger 5 critical events (authN fail, config change, submit, settle, failure). Check logs for: timestamp (UTC), actor/principal, request ID, source/target chain IDs, result, correlation ID. If a metrics endpoint exists, scrape counters (requests, failures, latency).
- **Metric**: Field completeness across events (target ≥5/5); metrics presence (Y/N)
- **Target**: High field completeness and metrics presence

### 4. Data Sovereignty Controls → "Policy enforcement signals"
- **Method**: If the adapter exposes a region/policy flag (even if local), set a disallowed region or "EU-only" policy; attempt a transfer flagged for disallowed region; expect denial and an audit log.
- **Metric**: Policy-violation acceptance rate (target 0%); auditability (Y/N)
- **Target**: 0% policy violation acceptance rate with full auditability

### 5. Certifications Coverage → "Machine-verifiable runtime indicators (if present)"
- **Method**: Check for a runtime FIPS/approved-cipher mode toggle and confirm only approved ciphers/curves are used by your process (e.g., crypto lib reports, or SDK exposes mode). Capture signed build artefacts if the project publishes them (cosign attestations).
- **Metric**: FIPS/approved-mode asserted (Y/N) with evidence; build attestation verified (Y/N)
- **Target**: FIPS mode and build attestations verified

## Files

- `axelar-regulatory-compliance-benchmark.ts` - Main benchmark script
- `run-regulatory-compliance-benchmark.bat` - Windows batch file to run benchmark
- `run-regulatory-compliance-benchmark.sh` - Linux/Mac shell script to run benchmark
- `README.md` - This documentation file

## Usage

### Prerequisites

1. Node.js installed
2. TypeScript and ts-node available
3. Environment variables configured in `.env` file:
   - `AXELAR_MNEMONIC_1` - First wallet mnemonic
   - `AXELAR_MNEMONIC_2` - Second wallet mnemonic
   - `AXELAR_ADDRESS_1` - First wallet address
   - `AXELAR_ADDRESS_2` - Second wallet address
   - `AXELAR_RPC_URL` - Axelar RPC URL (optional, defaults to testnet)
   - `AXELAR_REST_URL` - Axelar REST URL (optional, defaults to testnet)

### Running the Benchmark

#### Windows
```bash
cd results/axelar/regulatory-compliance
run-regulatory-compliance-benchmark.bat
```

#### Linux/Mac
```bash
cd results/axelar/regulatory-compliance
chmod +x run-regulatory-compliance-benchmark.sh
./run-regulatory-compliance-benchmark.sh
```

#### Direct execution
```bash
cd results/axelar/regulatory-compliance
npx ts-node axelar-regulatory-compliance-benchmark.ts
```

## Output

The benchmark generates two output files:

1. **JSON Report** (`axelar-regulatory-compliance-benchmark-results.json`):
   - Machine-readable results
   - Detailed metrics and evidence
   - Timestamps and test parameters

2. **Markdown Report** (`axelar-regulatory-compliance-benchmark-results.md`):
   - Human-readable summary
   - Criteria results table
   - Overall compliance score

## Test Methodology

The benchmark uses real testnet connections and empirical methods:

- **Real Transactions**: All tests use actual Axelar testnet transactions
- **Evidence Collection**: Comprehensive logging of all test activities
- **Failure Analysis**: Detailed categorization of failures and errors
- **Compliance Scoring**: Quantitative scoring based on regulatory requirements

## Notes

- Tests are designed to work with Axelar testnet environment
- Some tests may show expected failures due to testnet limitations
- All evidence is collected for audit purposes
- Results are timestamped and include detailed methodology

## Regulatory Compliance Focus

This benchmark specifically tests regulatory compliance aspects:

- **Atomicity**: Ensures no partial state transactions
- **Access Control**: Verifies proper permission enforcement
- **Audit Trail**: Confirms comprehensive logging
- **Data Sovereignty**: Tests policy enforcement capabilities
- **Certifications**: Validates security compliance indicators

The benchmark provides empirical evidence of regulatory compliance capabilities in the Axelar adapter implementation.
