@echo off
REM LayerZero Operational Reliability Benchmark Runner (Windows)
REM This script runs the LayerZero operational reliability benchmark tests

echo.
echo ========================================
echo LayerZero Operational Reliability Benchmark
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

REM Check if TypeScript is installed
npx tsc --version >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: TypeScript not found, installing...
    npm install -g typescript
)

REM Check if .env file exists
if not exist "..\..\..\.env" (
    echo WARNING: .env file not found in project root
    echo Please create a .env file with your testnet credentials
    echo See README.md for required environment variables
    echo.
)

REM Change to the script directory
cd /d "%~dp0"

echo Starting LayerZero Operational Reliability Benchmark...
echo.
echo Test Criteria:
echo   1. Observability Readiness
echo   2. Fault Recovery Capabilities  
echo   3. Lifecycle Management Process
echo.

REM Run the benchmark
echo Executing benchmark script...
npx ts-node layerzero-operational-reliability-benchmark.ts

REM Check if the benchmark completed successfully
if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo Benchmark completed successfully!
    echo ========================================
    echo.
    echo Results generated:
    echo   - layerzero-operational-reliability-benchmark-results.json
    echo   - layerzero-operational-reliability-benchmark-results.md
    echo.
) else (
    echo.
    echo ========================================
    echo Benchmark failed with error code %errorlevel%
    echo ========================================
    echo.
    echo Please check the error messages above and:
    echo   1. Verify your .env file is configured correctly
    echo   2. Ensure you have testnet funds
    echo   3. Check network connectivity
    echo   4. Review the README.md for troubleshooting
    echo.
)

echo Press any key to exit...
pause >nul
