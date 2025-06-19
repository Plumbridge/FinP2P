@echo off
setlocal enabledelayedexpansion

echo 🚀 Starting FinP2P Development Environment
echo ===========================================

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✅ Node.js detected

REM Check if Docker is installed and running
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker first.
    pause
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker first.
    pause
    exit /b 1
)

echo ✅ Docker is running

REM Check if Docker Compose is available
docker-compose --version >nul 2>&1
if errorlevel 1 (
    docker compose version >nul 2>&1
    if errorlevel 1 (
        echo ❌ Docker Compose is not available. Please install Docker Compose.
        pause
        exit /b 1
    )
)

echo ✅ Docker Compose is available

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
) else (
    echo ✅ Dependencies already installed
)

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo ⚙️  Creating environment configuration...
    copy ".env.example" ".env" >nul
    echo ✅ Created .env file from .env.example
    echo 💡 You can customize the .env file for your specific needs
) else (
    echo ✅ Environment configuration exists
)

REM Build the project
echo 🔨 Building the project...
npm run build

REM Start Redis if not running
echo 🔍 Checking Redis...
docker ps | findstr redis >nul
if errorlevel 1 (
    echo 🚀 Starting Redis container...
    docker run -d --name finp2p-redis -p 6379:6379 redis:alpine
    echo ✅ Redis started on port 6379
) else (
    echo ✅ Redis is already running
)

REM Wait a moment for Redis to be ready
timeout /t 2 /nobreak >nul

echo.
echo 🎉 Development environment is ready!
echo.
echo Available commands:
echo   npm run dev          - Start development server with hot reload
echo   npm start            - Start production server
echo   npm test             - Run tests
echo   npm run compose:up   - Start full multi-router network with Docker
echo.
echo Quick start options:
echo.
echo 1. Single router development:
echo    npm run dev
echo.
echo 2. Multi-router network:
echo    npm run compose:up
echo    # Access routers at:
echo    # - Bank A: http://localhost:3001
echo    # - Bank B: http://localhost:3002
echo    # - Bank C: http://localhost:3003
echo    # - Grafana: http://localhost:3000 (admin/admin)
echo.
echo 3. Run tests:
echo    npm test
echo.
echo 📚 Check README.md for detailed documentation
echo 🐛 Report issues at: https://github.com/yourusername/finp2p-implementation/issues
echo.

REM Ask user what they want to do
set /p choice="What would you like to do? [1] Dev server [2] Multi-router [3] Tests [q] Quit: "

if "%choice%"=="1" (
    echo 🚀 Starting development server...
    npm run dev
) else if "%choice%"=="2" (
    echo 🚀 Starting multi-router network...
    npm run compose:up
    echo ✅ Multi-router network started!
    echo 📊 View logs: npm run compose:logs
    echo 🛑 Stop network: npm run compose:down
) else if "%choice%"=="3" (
    echo 🧪 Running tests...
    npm test
) else if /i "%choice%"=="q" (
    echo 👋 Goodbye!
    exit /b 0
) else (
    echo 💡 Invalid choice. Run this script again to see options.
    pause
    exit /b 1
)

pause