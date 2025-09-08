# LayerZero Regulatory Compliance Benchmark

This benchmark tests LayerZero's compliance with regulatory requirements across 5 critical domains using real cross-chain transfers on testnets.

## Overview

The LayerZero Regulatory Compliance Benchmark evaluates the adapter's adherence to regulatory standards through empirical testing with actual blockchain transactions. It tests atomicity enforcement, identity management, logging capabilities, data sovereignty controls, and certification coverage.

## Test Environment

- **Testnet Networks:** LayerZero (Sepolia, Polygon Amoy)
- **Testing Method:** Empirical regulatory compliance testing with real cross-chain transfers
- **Evidence Collection:** Transaction hashes, audit logs, policy enforcement records
- **Cross-chain Testing:** Atomic swaps between Sepolia and Polygon Amoy

## Regulatory Compliance Criteria

### 1. Atomicity Enforcement
**Method:** 30 cross-network transfers with injected client retries and one intentional RPC outage (15s drop)

**Metrics:**
- % atomic (no partial states)
- Retries per success
- Failure taxonomy with transaction hashes on both chains

**Target:** ≥90% atomicity rate

### 2. Identity & Access Management
**Method:** Local RBAC/permissions at the adapter boundary

**Test Process:**
- Create two principals: "Viewer" vs "Operator"
- Attempt restricted operation (transfer) with Viewer (expect deny)
- Attempt restricted operation with Operator (expect allow)
- Rotate Operator's key and prove old key is refused

**Metrics:**
- Denial rate for forbidden operations (target 100%)
- Revocation time-to-effect (seconds)

### 3. Logging & Monitoring
**Method:** Minimum evidence set present

**Test Process:**
- Trigger 5 critical events (authN fail, config change, submit, settle, failure)
- Check logs for required fields: timestamp (UTC), actor/principal, request ID, source/target chain IDs, result, correlation ID
- Check for metrics endpoint presence

**Metrics:**
- Field completeness across events (target ≥5/5)
- Metrics presence (Y/N)

### 4. Data Sovereignty Controls
**Method:** Policy enforcement signals

**Test Process:**
- Set disallowed region or "EU-only" policy
- Attempt transfer flagged for disallowed region
- Expect denial and audit log

**Metrics:**
- Policy-violation acceptance rate (target 0%)
- Auditability (Y/N)

### 5. Certifications Coverage
**Method:** Machine-verifiable runtime indicators (if present)

**Test Process:**
- Check for runtime FIPS/approved-cipher mode toggle
- Confirm only approved ciphers/curves are used
- Capture signed build artifacts if available

**Metrics:**
- FIPS/approved-mode asserted (Y/N) with evidence
- Build attestation verified (Y/N)

## Prerequisites

### Environment Variables
Create a `.env` file in the project root with the following variables:

```env
# Ethereum Sepolia Testnet
ETHEREUM_SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_KEY
SEPOLIA_PRIVATE_KEY=your_sepolia_private_key
SEPOLIA_PRIVATE_KEY_2=your_second_sepolia_private_key

# Polygon Amoy Testnet
POLYGON_AMOY_TESTNET_RPC_URL=https://polygon-amoy.infura.io/v3/YOUR_KEY
POLYGON_AMOY_TESTNET_PRIVATE_KEY=your_polygon_private_key
POLYGON_AMOY_TESTNET_PRIVATE_KEY_2=your_second_polygon_private_key
```

### Dependencies
- Node.js (≥18.0.0)
- TypeScript
- ts-node
- ethers.js
- LayerZero SDK

## Running the Benchmark

### Windows
```bash
run-regulatory-compliance-benchmark.bat
```

### Linux/macOS
```bash
./run-regulatory-compliance-benchmark.sh
```

### Manual Execution
```bash
npx ts-node layerzero-regulatory-compliance-benchmark.ts
```

## Output Files

The benchmark generates three output files:

### 1. JSON Report
`layerzero-regulatory-compliance-benchmark-results.json`
- Machine-readable results
- Detailed metrics and evidence
- Structured data for analysis

### 2. Basic Markdown Report
`layerzero-regulatory-compliance-benchmark-results.md`
- Human-readable summary
- Quick overview of results
- Status indicators

### 3. Comprehensive Report
`layerzero-regulatory-compliance-comprehensive-report.md`
- Detailed analysis of each criterion
- Evidence summaries
- Technical details and recommendations
- Executive summary with score breakdown

## Test Results Interpretation

### Score Ranges
- **Passed (90-100%):** Meets regulatory requirements
- **Partial (70-89%):** Partially compliant, needs improvement
- **Failed (0-69%):** Non-compliant, requires immediate attention

### Key Metrics

#### Atomicity Enforcement
- **Atomicity Rate:** Percentage of transfers that complete atomically
- **Retries per Success:** Average retry attempts needed
- **Failure Taxonomy:** Categorization of failure types

#### Identity & Access Management
- **Denial Rate:** Percentage of unauthorized operations blocked
- **Revocation Time:** Time for key rotation to take effect
- **Audit Log Entries:** Number of security events logged

#### Logging & Monitoring
- **Field Completeness:** Percentage of required log fields present
- **Metrics Availability:** Whether monitoring endpoints are accessible
- **Critical Events Logged:** Number of security events captured

#### Data Sovereignty Controls
- **Policy Violation Rate:** Percentage of policy violations accepted
- **Auditability:** Whether policy decisions are logged
- **Region Compliance:** Adherence to geographic restrictions

#### Certifications Coverage
- **FIPS Mode:** Whether FIPS-compliant cryptography is enabled
- **Build Attestation:** Whether build artifacts are signed and verified
- **Approved Ciphers:** Use of only approved cryptographic algorithms

## Troubleshooting

### Common Issues

1. **RPC Connection Errors**
   - Verify RPC URLs are correct and accessible
   - Check API key validity
   - Ensure sufficient testnet tokens

2. **Transaction Failures**
   - Verify wallet private keys are correct
   - Check wallet balances for gas fees
   - Ensure testnet tokens are available

3. **Permission Errors**
   - Check file permissions for output directories
   - Ensure write access to results folder

4. **Dependency Issues**
   - Run `npm install` to install dependencies
   - Update Node.js to latest LTS version
   - Clear npm cache if needed

### Debug Mode
Set environment variable for verbose logging:
```bash
DEBUG=layerzero:regulatory-compliance npx ts-node layerzero-regulatory-compliance-benchmark.ts
```

## Architecture

### Mock Systems
The benchmark includes several mock systems for testing:

- **MockRBACSystem:** Simulates role-based access control
- **MockDataSovereigntySystem:** Simulates data sovereignty policies
- **Audit Logging:** Captures all security-relevant events

### Test Flow
1. Initialize LayerZero adapter and testnet connections
2. Execute atomicity enforcement tests (30 transfers)
3. Test identity and access management (RBAC)
4. Trigger and analyze logging events
5. Test data sovereignty policy enforcement
6. Verify certification compliance
7. Generate comprehensive reports

## Compliance Standards

This benchmark tests compliance with:

- **Financial Services Regulations:** Atomicity and audit requirements
- **Data Protection Laws:** Sovereignty and privacy controls
- **Security Standards:** Identity management and monitoring
- **Cryptographic Standards:** FIPS and approved cipher usage

## Contributing

To extend or modify the benchmark:

1. Add new test cases to the appropriate test method
2. Update the evidence collection structure
3. Modify the report generation if needed
4. Update this README with new requirements

## License

This benchmark is part of the FinP2P project and follows the same MIT license.

## Support

For issues or questions:
- Check the troubleshooting section
- Review the comprehensive report for detailed analysis
- Ensure all prerequisites are met
- Verify testnet connectivity and wallet configuration
