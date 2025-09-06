@echo off
echo Starting Axelar Regulatory Compliance Benchmark...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if ts-node is installed
npx ts-node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing ts-node...
    npm install -g ts-node
)

REM Run the benchmark
echo Running Regulatory Compliance Benchmark...
npx ts-node axelar-regulatory-compliance-benchmark.ts

echo.
echo Benchmark completed. Check the results files:
echo - axelar-regulatory-compliance-benchmark-results.json
echo - axelar-regulatory-compliance-benchmark-results.md
echo.
pause
