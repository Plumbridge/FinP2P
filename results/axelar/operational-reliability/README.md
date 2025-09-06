# Axelar Operational Reliability Benchmark

This directory contains the operational reliability benchmark tests for the Axelar adapter, implementing the 3 Operational Reliability criteria from the dissertation evaluation framework.

## Overview

The operational reliability benchmark tests the following criteria:

1. **Observability Readiness** - Enable logs + metrics + traces, demonstrate successful and failed transfers with correlating IDs
2. **Fault Recovery Capabilities** - Kill/restart relayer, measure MTTR and exactly-once completion
3. **Lifecycle Management Process** - Upgrade/rollback container, measure downtime and compatibility

## Files

- `axelar-operational-reliability-benchmark.ts` - Main benchmark script
- `run-operational-reliability-benchmark.bat` - Windows runner script
- `run-operational-reliability-benchmark.sh` - Unix/Linux/macOS runner script
- `README.md` - This documentation file

## Prerequisites

1. **Node.js** - Version 16 or higher
2. **Environment Variables** - Create a `.env` file in the project root with:
   ```
   AXELAR_MNEMONIC_1=your_axelar_mnemonic_1
   AXELAR_MNEMONIC_2=your_axelar_mnemonic_2
   AXELAR_ADDRESS_1=your_axelar_address_1
   AXELAR_ADDRESS_2=your_axelar_address_2
   AXELAR_RPC_URL=https://axelart.tendermintrpc.lava.build
   AXELAR_REST_URL=https://axelart.lava.build
   AXELAR_CHAIN_ID=axelar-testnet-lisbon-3
   ```

## Running the Benchmark

### Windows
```bash
run-operational-reliability-benchmark.bat
```

### Unix/Linux/macOS
```bash
./run-operational-reliability-benchmark.sh
```

### Direct Execution
```bash
npx ts-node axelar-operational-reliability-benchmark.ts
```

## Test Details

### 1. Observability Readiness
- **Method**: Enable logs + metrics + traces on process; demonstrate one successful and one failed transfer with correlating IDs
- **Metric**: Triad present (Y/N) + 5-field completeness score
- **Evidence**: Logs, metrics, traces, correlation IDs

### 2. Fault Recovery Capabilities
- **Method**: Kill local relayer/client mid-transfer and during idle; restart
- **Metric**: MTTR (s), exactly-once completion rate after restart, manual steps (count)
- **Evidence**: Recovery times, completion rates, error logs

### 3. Lifecycle Management Process
- **Method**: Upgrade running container/binary to minor version, then rollback. Re-run transfer without client changes
- **Metric**: Upgrade (Y/N), rollback (Y/N), downtime seconds, schema/API compatibility issues (count)
- **Evidence**: Upgrade/rollback logs, downtime measurements, compatibility tests

## Output

The benchmark generates two output files:

1. **`axelar-operational-reliability-benchmark-results.json`** - Detailed JSON results with all test data
2. **`axelar-operational-reliability-benchmark-results.md`** - Human-readable Markdown report

## Test Status

- **Passed**: All criteria met with expected values
- **Partial**: Some criteria met but with suboptimal values
- **Failed**: Criteria not met or significant issues encountered

## Evidence Collection

The benchmark collects comprehensive evidence for each test:

- **Logs**: Console logs with timestamps and correlation IDs
- **Metrics**: Memory usage, CPU usage, uptime, connection status
- **Traces**: Distributed tracing with span IDs and operation context
- **Recovery Data**: MTTR measurements, completion rates, manual steps
- **Lifecycle Data**: Upgrade/rollback success, downtime, compatibility issues

## Troubleshooting

### Common Issues

1. **Connection Failed**: Check RPC URLs and network connectivity
2. **Authentication Failed**: Verify mnemonic phrases and addresses
3. **Transfer Failed**: Ensure sufficient balance for test transfers
4. **Timeout Errors**: Check network stability and RPC endpoint availability

### Debug Mode

Set `DEBUG=true` in your environment to enable verbose logging:

```bash
DEBUG=true npx ts-node axelar-operational-reliability-benchmark.ts
```

## Integration

This benchmark is designed to integrate with the broader FinP2P evaluation framework and can be run as part of the comprehensive testing suite.

## Support

For issues or questions regarding this benchmark, please refer to the main project documentation or create an issue in the project repository.
