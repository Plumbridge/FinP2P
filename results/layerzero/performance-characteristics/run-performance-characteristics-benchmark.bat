@echo off
echo Starting LayerZero Performance Characteristics Benchmark...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist "..\..\..\.env" (
    echo Error: .env file not found in project root
    echo Please create a .env file with the required environment variables
echo Required variables:
echo   - SEPOLIA_PRIVATE_KEY
echo   - SEPOLIA_PRIVATE_KEY_2
echo   - POLYGON_AMOY_TESTNET_PRIVATE_KEY
echo   - POLYGON_AMOY_TESTNET_PRIVATE_KEY_2
echo   - ETHEREUM_SEPOLIA_RPC_URL
echo   - POLYGON_AMOY_TESTNET_RPC_URL
echo.
echo WARNING: This benchmark executes REAL transactions on testnets!
echo Make sure you have sufficient testnet tokens in your wallets.
    pause
    exit /b 1
)

echo Environment check passed
echo.

REM Install dependencies if needed
if not exist "..\..\..\node_modules" (
    echo Installing dependencies...
    cd ..\..\..\
    npm install
    cd results\layerzero\performance-characteristics\
    echo.
)

echo Running LayerZero Performance Characteristics Benchmark...
echo This will test:
echo   - Cross-chain Transaction Latency (40 transfers)
echo   - Throughput Scalability (1→2→4→8 RPS for 10 minutes)
echo   - System Availability (1 hour canary test)
echo.
echo WARNING: This test will execute real transactions on testnets!
echo Make sure you have sufficient testnet tokens in your wallets.
echo.

pause

REM Run the benchmark
npx ts-node layerzero-performance-characteristics-benchmark.ts

if %errorlevel% equ 0 (
    echo.
    echo ✅ Benchmark completed successfully!
    echo Results saved to:
    echo   - layerzero-performance-characteristics-benchmark-results.json
    echo   - layerzero-performance-characteristics-benchmark-results.md
) else (
    echo.
    echo ❌ Benchmark failed with error code %errorlevel%
)

echo.
pause
