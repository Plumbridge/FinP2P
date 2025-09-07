@echo off
REM LayerZero Security Robustness Benchmark Runner
REM This script runs the LayerZero security robustness benchmark tests

echo 🚀 Starting LayerZero Security Robustness Benchmark...
echo 🔒 Testing LayerZero security robustness across 5 critical domains
echo ⚠️  This will execute REAL transactions on Sepolia and Polygon Amoy testnets
echo.

REM Check if we're in the right directory
if not exist "layerzero-security-robustness-benchmark.ts" (
    echo ❌ Error: layerzero-security-robustness-benchmark.ts not found
    echo    Please run this script from the results/layerzero/security-robustness/ directory
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
echo 🔧 Running LayerZero Security Robustness Benchmark...
echo    This may take several minutes as it executes real testnet transactions
echo    Testing: Formal Verification, Cryptographic Robustness, HSM/KMS Support, BFT, Vulnerability Assessment
echo.

REM Set environment variables for the benchmark
set NODE_ENV=test
set BENCHMARK_MODE=true

REM Run the TypeScript benchmark script
npx ts-node layerzero-security-robustness-benchmark.ts

REM Check if the benchmark completed successfully
if errorlevel 1 (
    echo.
    echo ❌ LayerZero Security Robustness Benchmark failed!
    echo    Check the error messages above for details
    exit /b 1
) else (
    echo.
    echo ✅ LayerZero Security Robustness Benchmark completed successfully!
    echo 📊 Results saved to:
    echo    - layerzero-security-robustness-benchmark-results.json
    echo    - layerzero-security-robustness-benchmark-results.md
    echo    - layerzero-security-robustness-comprehensive-report.md
    echo.
    echo 📋 Summary:
    if exist "layerzero-security-robustness-benchmark-results.json" (
        echo    - Check the JSON file for detailed results
        echo    - Check the Markdown file for formatted results
        echo    - Check the comprehensive report for analysis
    )
)

echo.
echo 🎯 Benchmark execution complete!
pause
