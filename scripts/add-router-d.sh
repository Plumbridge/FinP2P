#!/bin/bash

echo "Adding Router D to the running FinP2P network..."
echo

echo "Step 1: Starting Router D with discovery profile"
docker-compose --profile with-router-d up -d router-bank-d

echo
echo "Step 2: Waiting for Router D to start and discover peers..."
sleep 10

echo
echo "Step 3: Checking Router D status"
curl -s http://localhost:3004/info | jq .

echo
echo "Step 4: Verifying peer connections on Router D"
curl -s http://localhost:3004/peers | jq .

echo
echo "Step 5: Checking that other routers discovered Router D"
echo "Router A peers:"
curl -s http://localhost:3001/peers | jq .
echo "Router B peers:"
curl -s http://localhost:3002/peers | jq .
echo "Router C peers:"
curl -s http://localhost:3003/peers | jq .

echo
echo "Router D has been successfully added to the network!"
echo "All routers should now be aware of each other through peer discovery."