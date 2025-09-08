@echo off
echo Starting LayerZero Regulatory Compliance Benchmark...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if TypeScript is installed
npx tsc --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: TypeScript is not installed
    echo Installing TypeScript...
    npm install -g typescript
)

REM Check if ts-node is available
npx ts-node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: ts-node is not available
    echo Installing ts-node...
    npm install -g ts-node
)

echo.
echo Running LayerZero Regulatory Compliance Benchmark...
echo This will test 5 regulatory compliance criteria:
echo 1. Atomicity Enforcement (30 cross-network transfers with retries and RPC outage)
echo 2. Identity & Access Management (Local RBAC/permissions at the adapter boundary)
echo 3. Logging & Monitoring (Minimum evidence set present)
echo 4. Data Sovereignty Controls (Policy enforcement signals)
echo 5. Certifications Coverage (Machine-verifiable runtime indicators)
echo.

REM Run the benchmark
npx ts-node layerzero-regulatory-compliance-benchmark.ts

echo.
echo Benchmark completed. Check the generated reports:
echo - layerzero-regulatory-compliance-benchmark-results.json
echo - layerzero-regulatory-compliance-benchmark-results.md
echo - layerzero-regulatory-compliance-comprehensive-report.md
echo.
pause
