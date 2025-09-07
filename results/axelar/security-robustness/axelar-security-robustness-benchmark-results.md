# Axelar Security Robustness Benchmark Results

**Test Date:** 2025-09-06T18:09:14.997Z
**Duration:** 338.4 seconds
**Overall Score:** 80.00% (4/5 criteria passed)
**Domain:** Security Robustness

## Criteria Results

| Criterion | Value | Status | Method |
|-----------|-------|--------|--------|
| Formal Verification Coverage | 100.00 FVC compliance score (%) | passed | Runtime conformance to claimed invariants (black-box) |
| Cryptographic Robustness | 100.00 Crypto compliance score (%) | passed | Signature binding & tamper rejection (on-chain verifiable) |
| HSM/KMS Support | 100.00 HSM compliance score (%) | passed | Signer abstraction / external-signer compatibility (software proxy) |
| Byzantine Fault Tolerance | 66.67 BFT compliance score (%) | failed | Quorum/finality enforcement at the API boundary |
| Vulnerability Assessment Coverage | 100.00 Vuln compliance score (%) | passed | Surface scan of deployed components only |
