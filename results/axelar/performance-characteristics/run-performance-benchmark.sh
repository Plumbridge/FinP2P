#!/bin/bash

# Axelar Performance Characteristics Benchmark Runner
# Unix/Linux/macOS script to run the performance benchmark

set -e  # Exit on any error

echo "⚡ Starting Axelar Performance Characteristics Benchmark"
echo "========================================================"

# Check if we're in the right directory
if [ ! -f "axelar-performance-characteristics-benchmark.ts" ]; then
    echo "❌ Error: axelar-performance-characteristics-benchmark.ts not found"
    echo "   Please run this script from the performance-characteristics directory"
    exit 1
fi

# Check if .env file exists in project root
if [ ! -f "../../../.env" ]; then
    echo "⚠️  Warning: .env file not found in project root"
    echo "   Please create .env file with required environment variables"
    echo "   See README.md for required variables"
fi

# Check if ts-node is available
if ! command -v ts-node &> /dev/null; then
    echo "❌ Error: ts-node not found"
    echo "   Please install ts-node: npm install -g ts-node"
    echo "   Or install locally: npm install ts-node"
    exit 1
fi

# Check if required dependencies are available
echo "🔍 Checking dependencies..."

# Check if we can import the Axelar adapter
if ! node -e "require('../../../adapters/axelar/AxelarAdapter')" 2>/dev/null; then
    echo "❌ Error: Cannot import AxelarAdapter"
    echo "   Please ensure the adapter is properly built and available"
    exit 1
fi

echo "✅ Dependencies check passed"

# Create results directory if it doesn't exist
mkdir -p results

# Run the benchmark
echo "🚀 Running Performance Characteristics benchmark..."
echo "   This may take several minutes depending on test configuration"
echo ""

# Set environment variables for the benchmark
export NODE_ENV=test
export BENCHMARK_MODE=performance

# Run with ts-node
if [ "$DEBUG" = "true" ]; then
    echo "🐛 Debug mode enabled"
    ts-node --transpile-only axelar-performance-characteristics-benchmark.ts
else
    ts-node --transpile-only axelar-performance-characteristics-benchmark.ts 2>/dev/null
fi

# Check if results were generated
if [ -f "axelar-performance-characteristics-benchmark-results.json" ]; then
    echo ""
    echo "✅ Benchmark completed successfully!"
    echo "📊 Results saved:"
    echo "   - axelar-performance-characteristics-benchmark-results.json"
    echo "   - axelar-performance-characteristics-benchmark-results.md"
    echo ""
    
    # Show summary from JSON results
    if command -v jq &> /dev/null; then
        echo "📈 Quick Summary:"
        echo "   Overall Score: $(jq -r '.overallScore' axelar-performance-characteristics-benchmark-results.json)"
        echo "   Passed Criteria: $(jq -r '.passedCriteria' axelar-performance-characteristics-benchmark-results.json)/$(jq -r '.totalCriteria' axelar-performance-characteristics-benchmark-results.json)"
        echo "   Duration: $(jq -r '.duration' axelar-performance-characteristics-benchmark-results.json)"
    fi
else
    echo "❌ Error: Benchmark failed or results not generated"
    echo "   Check the output above for error details"
    exit 1
fi

echo ""
echo "🎉 Performance Characteristics benchmark completed!"
echo "   Check the generated files for detailed results"
