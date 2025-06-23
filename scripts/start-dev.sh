#!/bin/bash

# FinP2P Development Startup Script
# This script helps you get started with the FinP2P implementation quickly

set -e

echo "🚀 Starting FinP2P Development Environment"
echo "==========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is running"

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker Compose is available"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️  Creating environment configuration..."
    cp .env.example .env
    echo "✅ Created .env file from .env.example"
    echo "💡 You can customize the .env file for your specific needs"
else
    echo "✅ Environment configuration exists"
fi

# Build the project
echo "🔨 Building the project..."
npm run build

# Start Redis if not running
echo "🔍 Checking Redis..."
if ! docker ps | grep -q redis; then
    echo "🚀 Starting Redis container..."
    docker run -d --name finp2p-redis -p 6379:6379 redis:alpine
    echo "✅ Redis started on port 6379"
else
    echo "✅ Redis is already running"
fi

# Wait a moment for Redis to be ready
sleep 2

echo ""
echo "🎉 Development environment is ready!"
echo ""
echo "Available commands:"
echo "  npm run dev          - Start development server with hot reload"
echo "  npm start            - Start production server"
echo "  npm test             - Run tests"
echo "  npm run compose:up   - Start full multi-router network with Docker"
echo ""
echo "Quick start options:"
echo ""
echo "1. Single router development:"
echo "   npm run dev"
echo ""
echo "2. Multi-router network:"
echo "   npm run compose:up"
echo "   # Access routers at:"
echo "   # - Bank A: http://localhost:3001"
echo "   # - Bank B: http://localhost:3002"
echo "   # - Bank C: http://localhost:3003"
echo "   # - Grafana: http://localhost:3000 (admin/admin)"
echo ""
echo "3. Run tests:"
echo "   npm test"
echo ""
echo "📚 Check README.md for detailed documentation"
echo "🐛 Report issues at: https://github.com/yourusername/finp2p-implementation/issues"
echo ""

# Ask user what they want to do
read -p "What would you like to do? [1] Dev server [2] Multi-router [3] Tests [q] Quit: " choice

case $choice in
    1)
        echo "🚀 Starting development server..."
        npm run dev
        ;;
    2)
        echo "🚀 Starting multi-router network..."
        npm run compose:up
        echo "✅ Multi-router network started!"
        echo "📊 View logs: npm run compose:logs"
        echo "🛑 Stop network: npm run compose:down"
        ;;
    3)
        echo "🧪 Running tests..."
        npm test
        ;;
    q|Q)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "💡 Invalid choice. Run this script again to see options."
        exit 1
        ;;
esac