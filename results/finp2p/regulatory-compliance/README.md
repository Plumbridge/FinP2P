# FinP2P Regulatory Compliance Benchmark

This benchmark tests the FinP2P system against 5 critical regulatory compliance criteria, ensuring the system meets enterprise-grade regulatory requirements for financial services.

## Overview

The regulatory compliance benchmark evaluates FinP2P's adherence to financial industry standards through comprehensive testing of:

1. **Atomicity Enforcement** - Ensures transaction atomicity across network failures
2. **Identity & Access Management** - Validates RBAC and permission enforcement
3. **Logging & Monitoring** - Verifies comprehensive audit trail capabilities
4. **Data Sovereignty Controls** - Tests policy enforcement and regional compliance
5. **Certifications Coverage** - Validates cryptographic and security certifications

## Test Criteria

### 1. Atomicity Enforcement (unchanged core)

**Method**: 30 cross-network transfers with injected client retries and one intentional RPC outage (15s drop)

**Metrics**:
- % atomic (no partial states)
- Retries per success
- Failure taxonomy with transaction hashes on both chains

**Target**: ≥95% atomicity rate with proper failure handling

### 2. Identity & Access Management → "Local RBAC/permissions at adapter boundary"

**Method**: Create two principals (API keys/users) within deployment: "Viewer" vs "Operator"
- Try restricted operation (transfer) with Viewer (expect deny)
- Try restricted operation (transfer) with Operator (expect allow)
- Rotate Operator's key and prove old key is refused

**Metrics**:
- Denial rate for forbidden operations (target 100%)
- Revocation time-to-effect (seconds)

**Target**: 100% denial rate for unauthorized access, <5s revocation time

### 3. Logging & Monitoring → "Minimum evidence set present"

**Method**: Trigger 5 critical events (authN fail, config change, submit, settle, failure)
- Check logs for: timestamp (UTC), actor/principal, request ID, source/target chain IDs, result, correlation ID
- If metrics endpoint exists, scrape counters (requests, failures, latency)

**Metrics**:
- Field completeness across events (target ≥5/5)
- Metrics presence (Y/N)

**Target**: 100% field completeness, metrics endpoint available

### 4. Data Sovereignty Controls → "Policy enforcement signals"

**Method**: If adapter exposes region/policy flag (even if local), set disallowed region or "EU-only" policy
- Attempt transfer flagged for disallowed region
- Expect denial and audit log

**Metrics**:
- Policy-violation acceptance rate (target 0%)
- Auditability (Y/N)

**Target**: 0% policy violation acceptance, full audit trail

### 5. Certifications Coverage → "Machine-verifiable runtime indicators"

**Method**: Check for runtime FIPS/approved-cipher mode toggle
- Confirm only approved ciphers/curves are used by process
- Capture signed build artifacts if project publishes them (cosign attestations)

**Metrics**:
- FIPS/approved-mode asserted (Y/N) with evidence
- Build attestation verified (Y/N)

**Target**: Evidence of approved cryptographic standards

## Prerequisites

### Required Software
- Node.js (v16 or higher)
- TypeScript (v4.5 or higher)
- npm or yarn package manager

### Environment Variables

The benchmark can run in two modes:

#### Demo Mode (Default)
Uses simulated credentials and mock data for demonstration purposes.

#### Production Mode
Requires real testnet credentials:

```bash
# Sui Testnet Configuration
export SUI_RPC_URL="https://fullnode.testnet.sui.io:443"
export SUI_PRIVATE_KEY="your_sui_private_key"
export SUI_ADDRESS="your_sui_address"
export SUI_ADDRESS_2="your_second_sui_address"

# Hedera Testnet Configuration
export HEDERA_ACCOUNT_ID="0.0.123456"
export HEDERA_PRIVATE_KEY="your_hedera_private_key"
export HEDERA_ACCOUNT_ID_2="0.0.123457"
export HEDERA_PRIVATE_KEY_2="your_second_hedera_private_key"

# FinP2P Configuration
export FINP2P_ROUTER_ID="your_router_id"
export FINP2P_ORG_ID="your_org_id"
export FINP2P_CUSTODIAN_ORG_ID="your_custodian_org_id"
export OWNERA_API_ADDRESS="https://api.finp2p.org"
export FINP2P_API_KEY="your_api_key"
export FINP2P_PRIVATE_KEY="your_private_key"
```

## Running the Benchmark

### Windows
```cmd
cd results/finp2p/regulatory-compliance
run-regulatory-compliance-benchmark.bat
```

### Linux/macOS
```bash
cd results/finp2p/regulatory-compliance
./run-regulatory-compliance-benchmark.sh
```

### Manual Execution
```bash
# Compile TypeScript
npx tsc finp2p-regulatory-compliance-benchmark.ts --outDir ../../../dist/results/finp2p/regulatory-compliance --target es2020 --module commonjs --moduleResolution node --esModuleInterop --allowSyntheticDefaultImports --skipLibCheck --resolveJsonModule --declaration --declarationMap --sourceMap

# Run benchmark
node ../../../dist/results/finp2p/regulatory-compliance/finp2p-regulatory-compliance-benchmark.js
```

## Output

The benchmark generates two output files:

### 1. JSON Results (`finp2p-regulatory-compliance-benchmark-results.json`)
Structured data containing:
- Test execution metadata
- Individual test results and scores
- Detailed metrics and evidence
- Technical implementation details

### 2. Markdown Report (`finp2p-regulatory-compliance-benchmark-results.md`)
Human-readable report with:
- Executive summary
- Test-by-test breakdown
- Compliance scoring
- Recommendations and findings

## Test Architecture

The benchmark follows the established FinP2P testing pattern:

```
FinP2P Router (Mock Mode)
├── Sui Testnet Adapter
│   ├── Real network connection (if credentials provided)
│   └── Mock operations (if demo mode)
├── Hedera Testnet Adapter
│   ├── Real network connection (if credentials provided)
│   └── Mock operations (if demo mode)
└── Cross-chain coordination
    ├── Atomic swap testing
    ├── Permission enforcement
    ├── Audit logging
    └── Policy validation
```

## Compliance Scoring

Each test criterion is scored on a 0-100 scale:

- **90-100**: Excellent compliance
- **80-89**: Good compliance with minor issues
- **70-79**: Acceptable compliance with notable gaps
- **60-69**: Poor compliance requiring attention
- **0-59**: Non-compliant, significant issues

Overall score is the average of all criterion scores.

## Troubleshooting

### Common Issues

1. **TypeScript Compilation Errors**
   - Ensure all dependencies are installed: `npm install`
   - Check TypeScript version: `npx tsc --version`

2. **Network Connection Failures**
   - Verify RPC URLs are accessible
   - Check firewall settings
   - Use demo mode for testing without real credentials

3. **Permission Denied (Linux/macOS)**
   - Make script executable: `chmod +x run-regulatory-compliance-benchmark.sh`

4. **Environment Variable Issues**
   - Verify all required variables are set
   - Check variable format and encoding
   - Use demo mode defaults if unsure

### Debug Mode

Set `DEBUG=true` environment variable for verbose logging:

```bash
export DEBUG=true
./run-regulatory-compliance-benchmark.sh
```

## Integration with CI/CD

The benchmark can be integrated into continuous integration pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Regulatory Compliance Benchmark
  run: |
    cd results/finp2p/regulatory-compliance
    ./run-regulatory-compliance-benchmark.sh
  env:
    SUI_RPC_URL: ${{ secrets.SUI_RPC_URL }}
    SUI_PRIVATE_KEY: ${{ secrets.SUI_PRIVATE_KEY }}
    # ... other environment variables
```

## Contributing

When modifying the benchmark:

1. Maintain the established test structure
2. Update documentation for new test criteria
3. Ensure backward compatibility with existing results
4. Add appropriate error handling and logging
5. Test both demo and production modes

## License

This benchmark is part of the FinP2P project and follows the same licensing terms.
