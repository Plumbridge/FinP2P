# LayerZero Performance Characteristics Benchmark Report

## Test Summary
- **Test Date**: 07/09/2025, 15:40:19
- **Duration**: 511s
- **Overall Score**: 33.33%
- **Domain**: Performance Characteristics

## Results Overview
- **Total Criteria**: 3
- **Passed**: 1 (33.3%)
- **Partial**: 0 (0.0%)
- **Failed**: 2 (66.7%)

## Test Results

| Criterion | Status | Value | Unit | Method |
|-----------|--------|-------|------|--------|
| Cross-chain Transaction Latency | FAILED | 17831 | milliseconds | 30-50 transfers; timestamp client send & observe settled event; record both chain heights |
| Throughput Scalability | FAILED | 0 | requests per second | Step load 1→2→4→8 rps for 10 minutes total (respecting faucet/RPC caps) |
| System Availability | PASSED | 100 | percentage | 24-hour canary (1 op/5 min) with simple alert on failure - SIMULATED |

## Detailed Results


### Cross-chain Transaction Latency
- **Status**: FAILED
- **Value**: 17831 milliseconds
- **Method**: 30-50 transfers; timestamp client send & observe settled event; record both chain heights

#### Key Metrics
- **totalTransfers**: 30
- **successfulTransfers**: 14
- **successRate**: 46.666666666666664
- **p50Latency**: 17831
- **p95Latency**: 37717




### Throughput Scalability
- **Status**: FAILED
- **Value**: 0 requests per second
- **Method**: Step load 1→2→4→8 rps for 10 minutes total (respecting faucet/RPC caps)

#### Key Metrics
- **successRate**: 0
- **sustainableTps**: 0
- **kneePoint**: 0
- **averageLatency**: 0
- **p95Latency**: 0




### System Availability
- **Status**: PASSED
- **Value**: 100 percentage
- **Method**: 24-hour canary (1 op/5 min) with simple alert on failure - SIMULATED

#### Key Metrics
- **successRate**: 100
- **mtbf**: 10
- **mttr**: 32155
- **averageLatency**: 32155

- **Note**: Results simulated due to RPC rate limits on free tiers


## Test Environment
- **LayerZero Adapter**: Version 1.0.0
- **Test Networks**: Sepolia, Polygon Amoy
- **Test Duration**: 511s
- **Simulation**: Yes (due to RPC rate limits)

## Conclusion
The LayerZero Performance Characteristics benchmark achieved an overall score of 33.33% with 1 criteria passing, 0 criteria partially meeting requirements, and 2 criteria failing to meet requirements.

Performance characteristics criteria require significant improvement.
