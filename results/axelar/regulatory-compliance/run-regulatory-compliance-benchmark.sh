#!/bin/bash

echo "Starting Axelar Regulatory Compliance Benchmark..."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed or not in PATH"
    exit 1
fi

# Check if ts-node is installed
if ! command -v npx &> /dev/null; then
    echo "Error: npx is not available"
    exit 1
fi

# Run the benchmark
echo "Running Regulatory Compliance Benchmark..."
npx ts-node axelar-regulatory-compliance-benchmark.ts

echo
echo "Benchmark completed. Check the results files:"
echo "- axelar-regulatory-compliance-benchmark-results.json"
echo "- axelar-regulatory-compliance-benchmark-results.md"
echo
