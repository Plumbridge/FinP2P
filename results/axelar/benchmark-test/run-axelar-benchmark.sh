#!/bin/bash

# Axelar Criteria Benchmark Runner
# This script runs the comprehensive Axelar criteria benchmark

echo "🚀 Starting Axelar Criteria Benchmark"
echo "📊 Testing 20 criteria across 5 domains"
echo "⏰ Started at: $(date)"
echo "================================================"

# Change to project root directory
cd "$(dirname "$0")/../../.."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Some tests may fail without proper configuration."
    echo "💡 Create a .env file with your Axelar configuration for full testing."
fi

# Run the benchmark
echo "🔧 Running TypeScript benchmark..."
npx ts-node results/axelar/benchmark-test/axelar-criteria-benchmark.ts

# Check if benchmark completed successfully
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Axelar criteria benchmark completed successfully!"
    echo "📊 Results saved in results/axelar/benchmark-test/"
    echo "📄 Check axelar-criteria-benchmark-results.json and .md files"
else
    echo ""
    echo "❌ Axelar criteria benchmark failed!"
    echo "🔍 Check the error messages above for details"
    exit 1
fi
