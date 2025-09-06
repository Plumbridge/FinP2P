@echo off
REM Axelar Performance Characteristics Benchmark Runner
REM Windows batch script to run the performance benchmark

echo ⚡ Starting Axelar Performance Characteristics Benchmark
echo ========================================================

REM Check if we're in the right directory
if not exist "axelar-performance-characteristics-benchmark.ts" (
    echo ❌ Error: axelar-performance-characteristics-benchmark.ts not found
    echo    Please run this script from the performance-characteristics directory
    pause
    exit /b 1
)

REM Check if .env file exists in project root
if not exist "..\..\..\.env" (
    echo ⚠️  Warning: .env file not found in project root
    echo    Please create .env file with required environment variables
    echo    See README.md for required variables
)

REM Check if ts-node is available
where ts-node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Error: ts-node not found
    echo    Please install ts-node: npm install -g ts-node
    echo    Or install locally: npm install ts-node
    pause
    exit /b 1
)

REM Check if required dependencies are available
echo 🔍 Checking dependencies...

REM Check if we can import the Axelar adapter
node -e "require('../../../adapters/axelar/AxelarAdapter')" >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Error: Cannot import AxelarAdapter
    echo    Please ensure the adapter is properly built and available
    pause
    exit /b 1
)

echo ✅ Dependencies check passed

REM Create results directory if it doesn't exist
if not exist "results" mkdir results

REM Run the benchmark
echo 🚀 Running Performance Characteristics benchmark...
echo    This may take several minutes depending on test configuration
echo.

REM Set environment variables for the benchmark
set NODE_ENV=test
set BENCHMARK_MODE=performance

REM Run with ts-node
if "%DEBUG%"=="true" (
    echo 🐛 Debug mode enabled
    ts-node --transpile-only axelar-performance-characteristics-benchmark.ts
) else (
    ts-node --transpile-only axelar-performance-characteristics-benchmark.ts >nul 2>nul
)

REM Check if results were generated
if exist "axelar-performance-characteristics-benchmark-results.json" (
    echo.
    echo ✅ Benchmark completed successfully!
    echo 📊 Results saved:
    echo    - axelar-performance-characteristics-benchmark-results.json
    echo    - axelar-performance-characteristics-benchmark-results.md
    echo.
    
    REM Show summary from JSON results (if jq is available)
    where jq >nul 2>nul
    if %errorlevel% equ 0 (
        echo 📈 Quick Summary:
        for /f "tokens=*" %%i in ('jq -r ".overallScore" axelar-performance-characteristics-benchmark-results.json') do echo    Overall Score: %%i
        for /f "tokens=*" %%i in ('jq -r ".passedCriteria" axelar-performance-characteristics-benchmark-results.json') do set passed=%%i
        for /f "tokens=*" %%i in ('jq -r ".totalCriteria" axelar-performance-characteristics-benchmark-results.json') do echo    Passed Criteria: %passed%/%%i
        for /f "tokens=*" %%i in ('jq -r ".duration" axelar-performance-characteristics-benchmark-results.json') do echo    Duration: %%i
    )
) else (
    echo ❌ Error: Benchmark failed or results not generated
    echo    Check the output above for error details
    pause
    exit /b 1
)

echo.
echo 🎉 Performance Characteristics benchmark completed!
echo    Check the generated files for detailed results
pause
