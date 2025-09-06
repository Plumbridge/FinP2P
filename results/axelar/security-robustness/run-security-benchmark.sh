#!/bin/bash

# Axelar Security Robustness Benchmark Runner
# This script runs the Security Robustness benchmark for Axelar

set -e

echo "🔒 Axelar Security Robustness Benchmark Runner"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "axelar-security-robustness-benchmark.ts" ]; then
    echo "❌ Error: axelar-security-robustness-benchmark.ts not found"
    echo "Please run this script from the results/axelar/benchmark-test directory"
    exit 1
fi

# Check if .env file exists
if [ ! -f "../../../.env" ]; then
    echo "⚠️  Warning: .env file not found in project root"
    echo "Please ensure environment variables are set:"
    echo "  - AXELAR_RPC_URL"
    echo "  - AXELAR_REST_URL"
    echo "  - AXELAR_CHAIN_ID"
    echo "  - AXELAR_MNEMONIC_1"
    echo "  - AXELAR_MNEMONIC_2"
    echo "  - AXELAR_ADDRESS_1"
    echo "  - AXELAR_ADDRESS_2"
    echo ""
fi

# Check if node_modules exists
if [ ! -d "../../../node_modules" ]; then
    echo "📦 Installing dependencies..."
    cd ../../../
    npm install
    cd results/axelar/benchmark-test
fi

# Check if TypeScript is available
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx not found. Please install Node.js and npm"
    exit 1
fi

# Run the benchmark
echo "🚀 Starting Security Robustness benchmark..."
echo ""

npx ts-node axelar-security-robustness-benchmark.ts

echo ""
echo "✅ Benchmark completed!"
echo ""
echo "📊 Reports generated:"
echo "  - axelar-security-robustness-benchmark-results.json"
echo "  - axelar-security-robustness-benchmark-results.md"
echo ""
echo "📖 For detailed documentation, see README-Security-Robustness.md"
