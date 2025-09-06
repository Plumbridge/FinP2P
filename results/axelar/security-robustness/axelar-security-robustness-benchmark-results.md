# Axelar Security Robustness Benchmark Results

**Test Date:** 2025-09-05T20:20:29.842Z
**Duration:** 169.8 seconds
**Overall Score:** 60.00% (3/5 criteria passed)
**Domain:** Security Robustness

## Criteria Results

| Criterion | Value | Status | Method |
|-----------|-------|--------|--------|
| Formal Verification Coverage | 75.00 FVC compliance score (%) | failed | Runtime conformance to claimed invariants (black-box) |
| Cryptographic Robustness | 100.00 Crypto compliance score (%) | passed | Signature binding & tamper rejection (on-chain verifiable) |
| HSM/KMS Support | 100.00 HSM compliance score (%) | passed | Signer abstraction / external-signer compatibility (software proxy) |
| Byzantine Fault Tolerance | 41.67 BFT compliance score (%) | failed | Quorum/finality enforcement at the API boundary |
| Vulnerability Assessment Coverage | 100.00 Vuln compliance score (%) | passed | Surface scan of deployed components only |
