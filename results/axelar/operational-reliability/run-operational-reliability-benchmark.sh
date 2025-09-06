#!/bin/bash

# Axelar Operational Reliability Benchmark Runner (Unix/Linux/macOS)
# This script runs the operational reliability benchmark tests for Axelar

echo "========================================"
echo "Axelar Operational Reliability Benchmark"
echo "========================================"
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if .env file exists
if [ ! -f "../../../.env" ]; then
    echo "ERROR: .env file not found in project root"
    echo "Please create a .env file with required environment variables"
    echo "Required variables:"
    echo "- AXELAR_MNEMONIC_1"
    echo "- AXELAR_MNEMONIC_2"
    echo "- AXELAR_ADDRESS_1"
    echo "- AXELAR_ADDRESS_2"
    echo "- AXELAR_RPC_URL"
    echo "- AXELAR_REST_URL"
    echo "- AXELAR_CHAIN_ID"
    exit 1
fi

echo "Starting Axelar Operational Reliability Benchmark..."
echo

# Run the benchmark
npx ts-node axelar-operational-reliability-benchmark.ts

if [ $? -eq 0 ]; then
    echo
    echo "========================================"
    echo "Benchmark completed successfully!"
    echo "========================================"
    echo
    echo "Results saved to:"
    echo "- axelar-operational-reliability-benchmark-results.json"
    echo "- axelar-operational-reliability-benchmark-results.md"
    echo
else
    echo
    echo "========================================"
    echo "Benchmark failed with error code $?"
    echo "========================================"
    echo
    exit 1
fi
