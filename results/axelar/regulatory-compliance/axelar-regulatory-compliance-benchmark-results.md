# Axelar Regulatory Compliance Benchmark Results

**Test Date:** 2025-09-08T01:28:57.246Z
**Duration:** 461.3 seconds
**Overall Score:** 80.00% (4/5 criteria passed)
**Domain:** Regulatory Compliance

## Criteria Results

| Criterion | Value | Status | Method |
|-----------|-------|--------|--------|
| Atomicity Enforcement (unchanged core) | 100.00 Atomicity rate (%) | passed | 30 cross-chain atomic swaps (Sepolia ETH ↔ Moonbeam DEV) with injected client retries and real RPC outage testing |
| Identity & Access Management → "Local RBAC/permissions at the adapter boundary" | 100.00 Denial rate for forbidden operations (%) | passed | Create two principals (API keys/users) within deployment: "Viewer" vs "Operator." Try restricted op (cross-chain atomic swap) with Viewer (expect deny) and with Operator (expect allow). Rotate Operator's key and prove old key is refused. |
| Logging & Monitoring → "Minimum evidence set present" | 100.00 Field completeness across events (%) | passed | Trigger 5 critical events (authN fail, config change, submit, settle, failure). Check logs for: timestamp (UTC), actor/principal, request ID, source/target chain IDs, result, correlation ID. If a metrics endpoint exists, scrape counters (requests, failures, latency). |
| Data Sovereignty Controls → "Policy enforcement signals" | 100% / Y Policy-violation acceptance rate (%) / Auditability (Y/N) | failed | If the adapter exposes a region/policy flag (even if local), set a disallowed region or "EU-only" policy; attempt a cross-chain atomic swap flagged for disallowed region; expect denial and an audit log. |
| Certifications Coverage → "Machine-verifiable runtime indicators (if present)" | 100.00 Certification compliance score (%) | passed | Check for a runtime FIPS/approved-cipher mode toggle and confirm only approved ciphers/curves are used by your process (e.g., crypto lib reports, or SDK exposes mode). Capture signed build artefacts if the project publishes them (cosign attestations). |
