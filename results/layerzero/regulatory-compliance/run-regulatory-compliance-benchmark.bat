@echo off
REM LayerZero Regulatory Compliance Benchmark Runner
REM This script runs the LayerZero regulatory compliance benchmark tests

echo 🚀 Starting LayerZero Regulatory Compliance Benchmark...
echo 📡 Testing LayerZero cross-chain infrastructure on testnets
echo ⚠️  This will execute REAL transactions on Sepolia and Polygon Amoy testnets
echo.

REM Check if we're in the right directory
if not exist "layerzero-regulatory-compliance-benchmark.ts" (
    echo ❌ Error: layerzero-regulatory-compliance-benchmark.ts not found
    echo    Please run this script from the results/layerzero/regulatory-compliance/ directory
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Node.js is not installed
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: npm is not installed
    exit /b 1
)

REM Check if .env file exists in project root
if not exist "..\..\..\.env" (
    echo ⚠️  Warning: .env file not found at ../../../.env
    echo    Some tests may fail without proper environment configuration
    echo.
)

REM Create results directory if it doesn't exist
if not exist "results" mkdir results

REM Run the benchmark
echo 🔧 Running LayerZero Regulatory Compliance Benchmark...
echo    This may take several minutes as it executes real testnet transactions
echo.

REM Set environment variables for the benchmark
set NODE_ENV=test
set BENCHMARK_MODE=true

REM Run the TypeScript benchmark script
npx ts-node layerzero-regulatory-compliance-benchmark.ts

REM Check if the benchmark completed successfully
if errorlevel 1 (
    echo.
    echo ❌ LayerZero Regulatory Compliance Benchmark failed!
    echo    Check the error messages above for details
    exit /b 1
) else (
    echo.
    echo ✅ LayerZero Regulatory Compliance Benchmark completed successfully!
    echo 📊 Results saved to:
    echo    - layerzero-regulatory-compliance-benchmark-results.json
    echo    - layerzero-regulatory-compliance-benchmark-results.md
    echo.
    echo 📋 Summary:
    if exist "layerzero-regulatory-compliance-benchmark-results.json" (
        echo    - Check the JSON file for detailed results
        echo    - Check the Markdown file for formatted results
    )
)

echo.
echo 🎯 Benchmark execution complete!
pause
