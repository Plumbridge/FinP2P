#!/bin/bash

# LayerZero Operational Reliability Benchmark Runner (Unix/Linux/macOS)
# This script runs the LayerZero operational reliability benchmark tests

echo ""
echo "========================================"
echo "LayerZero Operational Reliability Benchmark"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if TypeScript is installed
if ! npx tsc --version &> /dev/null; then
    echo "WARNING: TypeScript not found, installing..."
    npm install -g typescript
fi

# Check if .env file exists
if [ ! -f "../../../.env" ]; then
    echo "WARNING: .env file not found in project root"
    echo "Please create a .env file with your testnet credentials"
    echo "See README.md for required environment variables"
    echo ""
fi

# Change to the script directory
cd "$(dirname "$0")"

echo "Starting LayerZero Operational Reliability Benchmark..."
echo ""
echo "Test Criteria:"
echo "  1. Observability Readiness"
echo "  2. Fault Recovery Capabilities"
echo "  3. Lifecycle Management Process"
echo ""

# Run the benchmark
echo "Executing benchmark script..."
npx ts-node layerzero-operational-reliability-benchmark.ts

# Check if the benchmark completed successfully
if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "Benchmark completed successfully!"
    echo "========================================"
    echo ""
    echo "Results generated:"
    echo "  - layerzero-operational-reliability-benchmark-results.json"
    echo "  - layerzero-operational-reliability-benchmark-results.md"
    echo ""
else
    echo ""
    echo "========================================"
    echo "Benchmark failed with error code $?"
    echo "========================================"
    echo ""
    echo "Please check the error messages above and:"
    echo "  1. Verify your .env file is configured correctly"
    echo "  2. Ensure you have testnet funds"
    echo "  3. Check network connectivity"
    echo "  4. Review the README.md for troubleshooting"
    echo ""
    exit 1
fi
