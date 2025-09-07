#!/bin/bash

# FinP2P Regulatory Compliance Benchmark Runner (Linux/macOS)
# This script runs the regulatory compliance benchmark for FinP2P system

echo "========================================"
echo "FinP2P Regulatory Compliance Benchmark"
echo "========================================"
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# No TypeScript compilation needed - using JavaScript directly

# Set environment variables for demo mode if not already set
export SUI_RPC_URL=${SUI_RPC_URL:-"https://fullnode.testnet.sui.io:443"}
export SUI_PRIVATE_KEY=${SUI_PRIVATE_KEY:-"suiprivkey1demo..."}
export SUI_ADDRESS=${SUI_ADDRESS:-"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12"}
export SUI_ADDRESS_2=${SUI_ADDRESS_2:-"0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab"}
export HEDERA_ACCOUNT_ID=${HEDERA_ACCOUNT_ID:-"0.0.123456"}
export HEDERA_PRIVATE_KEY=${HEDERA_PRIVATE_KEY:-"302e020100300506032b657004220420..."}
export HEDERA_ACCOUNT_ID_2=${HEDERA_ACCOUNT_ID_2:-"0.0.123457"}
export HEDERA_PRIVATE_KEY_2=${HEDERA_PRIVATE_KEY_2:-"302e020100300506032b657004220420..."}

# Set FinP2P configuration
export FINP2P_ROUTER_ID=${FINP2P_ROUTER_ID:-"regulatory-benchmark-router"}
export FINP2P_ORG_ID=${FINP2P_ORG_ID:-"regulatory-benchmark-org"}
export FINP2P_CUSTODIAN_ORG_ID=${FINP2P_CUSTODIAN_ORG_ID:-"regulatory-benchmark-org"}
export OWNERA_API_ADDRESS=${OWNERA_API_ADDRESS:-"https://api.finp2p.org"}
export FINP2P_API_KEY=${FINP2P_API_KEY:-"demo-api-key"}
export FINP2P_PRIVATE_KEY=${FINP2P_PRIVATE_KEY:-"demo-private-key"}

echo "Environment Configuration:"
echo "  SUI_RPC_URL: $SUI_RPC_URL"
echo "  SUI_ADDRESS: ${SUI_ADDRESS:0:10}..."
echo "  SUI_ADDRESS_2: ${SUI_ADDRESS_2:0:10}..."
echo "  HEDERA_ACCOUNT_ID: $HEDERA_ACCOUNT_ID"
echo "  HEDERA_ACCOUNT_ID_2: $HEDERA_ACCOUNT_ID_2"
echo "  FINP2P_ROUTER_ID: $FINP2P_ROUTER_ID"
echo "  FINP2P_ORG_ID: $FINP2P_ORG_ID"
echo

echo "Starting regulatory compliance benchmark..."
echo

# Run the JavaScript benchmark directly
echo "Running regulatory compliance benchmark..."
echo

node finp2p-regulatory-compliance-benchmark.js

if [ $? -ne 0 ]; then
    echo
    echo "ERROR: Benchmark execution failed"
    exit 1
fi

echo
echo "========================================"
echo "Benchmark completed successfully!"
echo "========================================"
echo
echo "Results saved to:"
echo "  - finp2p-regulatory-compliance-benchmark-results.json"
echo "  - finp2p-regulatory-compliance-benchmark-results.md"
echo
