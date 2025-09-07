@echo off
REM FinP2P Regulatory Compliance Benchmark Runner (Windows)
REM This script runs the regulatory compliance benchmark for FinP2P system

echo ========================================
echo FinP2P Regulatory Compliance Benchmark
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

REM No TypeScript compilation needed - using JavaScript directly

REM Set environment variables for demo mode if not already set
if not defined SUI_RPC_URL set SUI_RPC_URL=https://fullnode.testnet.sui.io:443
if not defined SUI_PRIVATE_KEY set SUI_PRIVATE_KEY=suiprivkey1demo...
if not defined SUI_ADDRESS set SUI_ADDRESS=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12
if not defined SUI_ADDRESS_2 set SUI_ADDRESS_2=0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab
if not defined HEDERA_ACCOUNT_ID set HEDERA_ACCOUNT_ID=0.0.123456
if not defined HEDERA_PRIVATE_KEY set HEDERA_PRIVATE_KEY=302e020100300506032b657004220420...
if not defined HEDERA_ACCOUNT_ID_2 set HEDERA_ACCOUNT_ID_2=0.0.123457
if not defined HEDERA_PRIVATE_KEY_2 set HEDERA_PRIVATE_KEY_2=302e020100300506032b657004220420...

REM Set FinP2P configuration
if not defined FINP2P_ROUTER_ID set FINP2P_ROUTER_ID=regulatory-benchmark-router
if not defined FINP2P_ORG_ID set FINP2P_ORG_ID=regulatory-benchmark-org
if not defined FINP2P_CUSTODIAN_ORG_ID set FINP2P_CUSTODIAN_ORG_ID=regulatory-benchmark-org
if not defined OWNERA_API_ADDRESS set OWNERA_API_ADDRESS=https://api.finp2p.org
if not defined FINP2P_API_KEY set FINP2P_API_KEY=demo-api-key
if not defined FINP2P_PRIVATE_KEY set FINP2P_PRIVATE_KEY=demo-private-key

echo Environment Configuration:
echo   SUI_RPC_URL: %SUI_RPC_URL%
echo   SUI_ADDRESS: %SUI_ADDRESS:~0,10%...
echo   SUI_ADDRESS_2: %SUI_ADDRESS_2:~0,10%...
echo   HEDERA_ACCOUNT_ID: %HEDERA_ACCOUNT_ID%
echo   HEDERA_ACCOUNT_ID_2: %HEDERA_ACCOUNT_ID_2%
echo   FINP2P_ROUTER_ID: %FINP2P_ROUTER_ID%
echo   FINP2P_ORG_ID: %FINP2P_ORG_ID%
echo.

echo Starting regulatory compliance benchmark...
echo.

REM Run the JavaScript benchmark directly
echo Running regulatory compliance benchmark...
echo.

node finp2p-regulatory-compliance-benchmark.js

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Benchmark execution failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo Benchmark completed successfully!
echo ========================================
echo.
echo Results saved to:
echo   - finp2p-regulatory-compliance-benchmark-results.json
echo   - finp2p-regulatory-compliance-benchmark-results.md
echo.

pause
