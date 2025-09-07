@echo off
echo ========================================
echo FinP2P Performance Characteristics Benchmark
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

echo Starting FinP2P Performance Characteristics Benchmark...
echo.

REM Run the benchmark directly
echo Running Performance Characteristics Benchmark...
echo.
node finp2p-performance-characteristics-benchmark.js

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
echo - finp2p-performance-characteristics-benchmark-results.json
echo - finp2p-performance-characteristics-benchmark-results.md
echo.

pause