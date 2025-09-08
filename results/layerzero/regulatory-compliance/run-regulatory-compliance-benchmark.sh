#!/bin/bash

echo "Starting LayerZero Regulatory Compliance Benchmark..."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if TypeScript is installed
if ! npx tsc --version &> /dev/null; then
    echo "Error: TypeScript is not installed"
    echo "Installing TypeScript..."
    npm install -g typescript
fi

# Check if ts-node is available
if ! npx ts-node --version &> /dev/null; then
    echo "Error: ts-node is not available"
    echo "Installing ts-node..."
    npm install -g ts-node
fi

echo
echo "Running LayerZero Regulatory Compliance Benchmark..."
echo "This will test 5 regulatory compliance criteria:"
echo "1. Atomicity Enforcement (30 cross-network transfers with retries and RPC outage)"
echo "2. Identity & Access Management (Local RBAC/permissions at the adapter boundary)"
echo "3. Logging & Monitoring (Minimum evidence set present)"
echo "4. Data Sovereignty Controls (Policy enforcement signals)"
echo "5. Certifications Coverage (Machine-verifiable runtime indicators)"
echo

# Run the benchmark
npx ts-node layerzero-regulatory-compliance-benchmark.ts

echo
echo "Benchmark completed. Check the generated reports:"
echo "- layerzero-regulatory-compliance-benchmark-results.json"
echo "- layerzero-regulatory-compliance-benchmark-results.md"
echo "- layerzero-regulatory-compliance-comprehensive-report.md"
echo
