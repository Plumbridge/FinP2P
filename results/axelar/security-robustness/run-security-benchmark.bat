@echo off
REM Axelar Security Robustness Benchmark Runner
REM This script runs the Security Robustness benchmark for Axelar

echo 🔒 Axelar Security Robustness Benchmark Runner
echo ==============================================
echo.

REM Check if we're in the right directory
if not exist "axelar-security-robustness-benchmark.ts" (
    echo ❌ Error: axelar-security-robustness-benchmark.ts not found
    echo Please run this script from the results/axelar/benchmark-test directory
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist "..\..\..\.env" (
    echo ⚠️  Warning: .env file not found in project root
    echo Please ensure environment variables are set:
    echo   - AXELAR_RPC_URL
    echo   - AXELAR_REST_URL
    echo   - AXELAR_CHAIN_ID
    echo   - AXELAR_MNEMONIC_1
    echo   - AXELAR_MNEMONIC_2
    echo   - AXELAR_ADDRESS_1
    echo   - AXELAR_ADDRESS_2
    echo.
)

REM Check if node_modules exists
if not exist "..\..\..\node_modules" (
    echo 📦 Installing dependencies...
    cd ..\..\..\
    call npm install
    cd results\axelar\benchmark-test
)

REM Check if npx is available
where npx >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Error: npx not found. Please install Node.js and npm
    pause
    exit /b 1
)

REM Run the benchmark
echo 🚀 Starting Security Robustness benchmark...
echo.

call npx ts-node axelar-security-robustness-benchmark.ts

echo.
echo ✅ Benchmark completed!
echo.
echo 📊 Reports generated:
echo   - axelar-security-robustness-benchmark-results.json
echo   - axelar-security-robustness-benchmark-results.md
echo.
echo 📖 For detailed documentation, see README-Security-Robustness.md
echo.
pause
