# Axelar Criteria Benchmark Results

**Test Date:** 2025-09-05T17:21:48.127Z
**Duration:** 795.4 seconds
**Overall Score:** 53.33% (8/15 criteria passed)

## Domain Results

### Security Robustness
**Score:** 0.0% (0/4)

| Criterion | Value | Status | Method |
|-----------|-------|--------|--------|
| Formal Verification Coverage | 60 % modules verified | partial | SBOM/provenance verification + property test suite on live API |
| Cryptographic Robustness | 100 % endpoints compliant | failed | TLS cipher scan + test vector verification + invalid-proof rejection testing |
| HSM/KMS Support | true Binary (Y/N) | failed | External-signing flow validation with software KMS substitute |
| Byzantine Fault Tolerance | false Binary (Y/N) + documented f | failed | Quorum enforcement validation at verification boundary |

### Regulatory Compliance
**Score:** 60.0% (3/5)

| Criterion | Value | Status | Method |
|-----------|-------|--------|--------|
| Atomicity Enforcement | 100 % atomic (of 30) | passed | 30 cross-network transfers with retry injection and RPC outage simulation |
| Identity & Access Management | 0 % forbidden ops denied | failed | RBAC testing with Viewer vs Operator principals + key rotation |
| Logging & Monitoring | 5 Field completeness score (0-5) | passed | Structured log verification + metrics endpoint scraping |
| Data Sovereignty Controls | 63.63636363636363 % policy violations accepted | failed | Region policy enforcement testing with disallowed regions and sinks |
| Certifications Coverage | 100 % endpoints constrained to approved ciphers | passed | FIPS mode verification + SBOM/provenance attestation checking |

### Performance Characteristics
**Score:** 66.7% (2/3)

| Criterion | Value | Status | Method |
|-----------|-------|--------|--------|
| Cross-chain Transaction Latency | 9354 ms (P95) | passed | 30-50 end-to-end transfers with P50/P95 calculation |
| Throughput Scalability | 0.17 TPS (sustainable) | failed | 10-minute open-loop load test with step rates (1,2,4,8 rps) |
| System Availability | 100 % success ratio | passed | 24-hour synthetic canary (1 op/5 min) with alert on failure |

### Operational Reliability
**Score:** 100.0% (3/3)

| Criterion | Value | Status | Method |
|-----------|-------|--------|--------|
| Observability Readiness | 6 Triad presence + field completeness (0-6) | passed | Tracing + structured logging + metrics + dashboard building |
| Fault Recovery Capabilities | 3410 ms (MTTR) | passed | Process kill/restart testing during idle and mid-transfer states |
| Lifecycle Management Process | 9 seconds (downtime) | passed | Minor upgrade + rollback testing with backward compatibility validation |

