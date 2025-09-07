#!/bin/bash

echo "========================================"
echo "FinP2P Performance Characteristics Benchmark"
echo "========================================"
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "Starting FinP2P Performance Characteristics Benchmark..."
echo

# Run the benchmark directly
echo "Running Performance Characteristics Benchmark..."
echo
node finp2p-performance-characteristics-benchmark.js

if [ $? -ne 0 ]; then
    echo
    echo "ERROR: Benchmark execution failed"
    exit 1
fi

echo
echo "========================================"
echo "Benchmark completed successfully!"
echo "========================================"
echo
echo "Results saved to:"
echo "- finp2p-performance-characteristics-benchmark-results.json"
echo "- finp2p-performance-characteristics-benchmark-results.md"
echo