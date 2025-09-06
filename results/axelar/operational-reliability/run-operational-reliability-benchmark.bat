@echo off
REM Axelar Operational Reliability Benchmark Runner (Windows)
REM This script runs the operational reliability benchmark tests for Axelar

echo ========================================
echo Axelar Operational Reliability Benchmark
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist "..\..\..\.env" (
    echo ERROR: .env file not found in project root
    echo Please create a .env file with required environment variables
    echo Required variables:
    echo - AXELAR_MNEMONIC_1
    echo - AXELAR_MNEMONIC_2
    echo - AXELAR_ADDRESS_1
    echo - AXELAR_ADDRESS_2
    echo - AXELAR_RPC_URL
    echo - AXELAR_REST_URL
    echo - AXELAR_CHAIN_ID
    pause
    exit /b 1
)

echo Starting Axelar Operational Reliability Benchmark...
echo.

REM Run the benchmark
npx ts-node axelar-operational-reliability-benchmark.ts

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo Benchmark completed successfully!
    echo ========================================
    echo.
    echo Results saved to:
    echo - axelar-operational-reliability-benchmark-results.json
    echo - axelar-operational-reliability-benchmark-results.md
    echo.
) else (
    echo.
    echo ========================================
    echo Benchmark failed with error code %errorlevel%
    echo ========================================
    echo.
)

pause
