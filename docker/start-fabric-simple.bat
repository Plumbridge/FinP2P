@echo off
echo Starting Hyperledger Fabric Network (Simplified)...

REM Create necessary directories
if not exist "crypto" mkdir crypto
if not exist "scripts" mkdir scripts

REM Start Fabric network
echo Starting Fabric containers...
docker-compose -f fabric-simple-working.yml up -d

REM Wait for containers to be ready
echo Waiting for Fabric network to be ready...
timeout /t 10 /nobreak > nul

REM Check container status
echo Checking container status...
docker ps --filter "name=fabric"

echo.
echo Fabric network should be running on:
echo - CA: localhost:7054
echo - Orderer: localhost:7050  
echo - Peer: localhost:7051
echo - Tools: fabric-tools container
echo.
echo To test connection, run: npm run test:real-adapters
echo To stop: docker-compose -f fabric-simple-working.yml down
