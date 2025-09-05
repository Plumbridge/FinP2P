@echo off
REM Axelar Criteria Benchmark Runner (Windows)
REM This script runs the comprehensive Axelar criteria benchmark

echo 🚀 Starting Axelar Criteria Benchmark
echo 📊 Testing 20 criteria across 5 domains
echo ⏰ Started at: %date% %time%
echo ================================================

REM Change to project root directory
cd /d "%~dp0\..\..\.."

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  Warning: .env file not found. Some tests may fail without proper configuration.
    echo 💡 Create a .env file with your Axelar configuration for full testing.
)

REM Run the benchmark
echo 🔧 Running TypeScript benchmark...
npx ts-node results\axelar\benchmark-test\axelar-criteria-benchmark.ts

REM Check if benchmark completed successfully
if %errorlevel% equ 0 (
    echo.
    echo ✅ Axelar criteria benchmark completed successfully!
    echo 📊 Results saved in results\axelar\benchmark-test\
    echo 📄 Check axelar-criteria-benchmark-results.json and .md files
) else (
    echo.
    echo ❌ Axelar criteria benchmark failed!
    echo 🔍 Check the error messages above for details
    exit /b 1
)
