#!/bin/bash

# LayerZero Regulatory Compliance Benchmark Runner
# This script runs the LayerZero regulatory compliance benchmark tests

set -e

echo "🚀 Starting LayerZero Regulatory Compliance Benchmark..."
echo "📡 Testing LayerZero cross-chain infrastructure on testnets"
echo "⚠️  This will execute REAL transactions on Sepolia and Polygon Amoy testnets"
echo ""

# Check if we're in the right directory
if [ ! -f "layerzero-regulatory-compliance-benchmark.ts" ]; then
    echo "❌ Error: layerzero-regulatory-compliance-benchmark.ts not found"
    echo "   Please run this script from the results/layerzero/regulatory-compliance/ directory"
    exit 1
fi

# Check if Node.js and npm are installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed"
    exit 1
fi

# Check if TypeScript is available
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx is not available"
    exit 1
fi

# Check if .env file exists in project root
ENV_FILE="../../../.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  Warning: .env file not found at $ENV_FILE"
    echo "   Some tests may fail without proper environment configuration"
    echo ""
fi

# Create results directory if it doesn't exist
mkdir -p results

# Run the benchmark
echo "🔧 Running LayerZero Regulatory Compliance Benchmark..."
echo "   This may take several minutes as it executes real testnet transactions"
echo ""

# Set environment variables for the benchmark
export NODE_ENV=test
export BENCHMARK_MODE=true

# Run the TypeScript benchmark script
npx ts-node layerzero-regulatory-compliance-benchmark.ts

# Check if the benchmark completed successfully
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ LayerZero Regulatory Compliance Benchmark completed successfully!"
    echo "📊 Results saved to:"
    echo "   - layerzero-regulatory-compliance-benchmark-results.json"
    echo "   - layerzero-regulatory-compliance-benchmark-results.md"
    echo ""
    echo "📋 Summary:"
    if [ -f "layerzero-regulatory-compliance-benchmark-results.json" ]; then
        # Extract summary from JSON results
        echo "   - Check the JSON file for detailed results"
        echo "   - Check the Markdown file for formatted results"
    fi
else
    echo ""
    echo "❌ LayerZero Regulatory Compliance Benchmark failed!"
    echo "   Check the error messages above for details"
    exit 1
fi

echo ""
echo "🎯 Benchmark execution complete!"
