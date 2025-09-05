# Real Adapter Testnet Configuration

This directory contains **REAL implementations** of enterprise blockchain adapters that connect to actual testnets. **NO SIMULATION** is used - all transactions are real blockchain operations.

## ⚠️ IMPORTANT: Real Testnet Connections

These adapters will submit **REAL TRANSACTIONS** to testnets. Make sure you have:
- Sufficient testnet tokens for gas fees
- Valid testnet credentials
- Understanding that real money/time will be spent

## 🔗 Chainlink CCIP Adapter (Real Testnet)

### Environment Variables Required:
```bash
# Ethereum Sepolia Testnet
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
# OR
ETHEREUM_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# Private Key (with testnet ETH)
PRIVATE_KEY=your_sepolia_private_key_here
# OR
SEPOLIA_PRIVATE_KEY=your_sepolia_private_key_here

# CCIP Router Address (Sepolia Testnet)
CCIP_ROUTER_ADDRESS=0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59

# Gas Settings
MAX_GAS_LIMIT=500000
GAS_PRICE=20000000000  # 20 gwei in wei

# Enable Real CCIP
USE_REAL_CCIP=true
```

### Supported Testnet Chains:
- **Ethereum Sepolia**: `16015286601757825753`
- **Polygon Mumbai**: `12532609583862916517`
- **Arbitrum Sepolia**: `3478487238524512106`
- **Optimism Sepolia**: `11155420`
- **Base Sepolia**: `13264668187771770619`
- **Avalanche Fuji**: `144545313136048`
- **BSC Testnet**: `14767482510784806043`
- **Fantom Testnet**: `4002`

### What It Does:
- ✅ Connects to real Sepolia testnet
- ✅ Submits real CCIP cross-chain messages
- ✅ Gets real fee estimates from router
- ✅ Waits for real blockchain confirmations
- ✅ No simulation or fallbacks



### Environment Variables Required:
```bash
# Enable Real Fabric
USE_REAL_FABRIC=true

# Fabric Connection Profile
FABRIC_CONNECTION_PROFILE=./fabric-testnet-connection.json

# Fabric Network Details
FABRIC_CHANNEL=mychannel

FABRIC_IDENTITY=admin
FABRIC_MSP_ID=Org1MSP

# Consortium Configuration
FABRIC_CONSORTIUM_ID=your-consortium-id
FABRIC_CONSORTIUM_NAME=Your Consortium Name

# Member Public Keys (optional)
FABRIC_MEMBER_1_PUBLIC_KEY=0x1234567890abcdef
FABRIC_MEMBER_2_PUBLIC_KEY=0xabcdef1234567890
FABRIC_MEMBER_3_PUBLIC_KEY=0x7890abcdef123456
FABRIC_MEMBER_4_PUBLIC_KEY=0x4567890abcdef123
```

### What It Does:
- ✅ Connects to real Fabric network
- ✅ Submits real chaincode transactions
- ✅ Executes real consortium voting
- ✅ Performs real cross-chain queries
- ✅ No simulation or fallbacks

## 🧪 Running Tests

### 1. Set Environment Variables
```bash
# Copy from your .env file or set directly
export ETHEREUM_RPC_URL="https://sepolia.infura.io/v3/YOUR_PROJECT_ID"
export PRIVATE_KEY="your_sepolia_private_key"
export CCIP_ROUTER_ADDRESS="0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59"
export USE_REAL_CCIP="true"
export USE_REAL_FABRIC="true"
export FABRIC_CONNECTION_PROFILE="./fabric-testnet-connection.json"
```

### 2. Run Real Adapter Tests
```bash
npm run test:real-adapters
```

### 3. Individual Adapter Tests
```bash
# Test CCIP only
npm run test:real-adapters -- --testNamePattern="Chainlink CCIP"


```

## 📊 Expected Results

### CCIP Adapter:
- **Success Rate**: >90% (testnet reliability)
- **Average Latency**: <10 seconds (real blockchain time)
- **Gas Usage**: Real on-chain gas consumption
- **Fees**: Real CCIP router fees


- **Success Rate**: >85% (consortium voting)
- **Approval Time**: <30 seconds (real voting process)
- **Transactions**: Real Fabric chaincode execution
- **Consensus**: Real consortium governance

## 🔧 Troubleshooting

### CCIP Connection Issues:
- Verify RPC URL is accessible
- Check private key has sufficient testnet ETH
- Confirm router address is correct for testnet
- Ensure network supports CCIP

### Fabric Connection Issues:
- Verify connection profile paths
- Check Fabric network is running
- Confirm MSP and identity configuration
- Ensure chaincode is deployed

### Common Errors:
```
❌ "Failed to load CCIP contracts"
   → Check @chainlink/contracts-ccip package installation

❌ "No contract found at router address"
   → Verify CCIP_ROUTER_ADDRESS is correct for testnet

❌ "Failed to connect to Fabric network"
   → Check FABRIC_CONNECTION_PROFILE and network status

❌ "Insufficient ETH balance"
   → Get testnet ETH from faucet
```

## 💰 Testnet Faucets

### Ethereum Sepolia:
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
- [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)

### Polygon Mumbai:
- [Polygon Faucet](https://faucet.polygon.technology/)
- [Alchemy Mumbai Faucet](https://mumbaifaucet.com/)

### Other Testnets:
- [Chainlink Faucet](https://faucets.chain.link/)
- [Arbitrum Sepolia Faucet](https://faucet.quicknode.com/arbitrum/sepolia)

## 🚀 Production Considerations

When moving to production:
1. Use mainnet RPC endpoints
2. Implement proper key management
3. Add monitoring and alerting
4. Set appropriate gas limits
5. Implement retry mechanisms
6. Add comprehensive error handling

## 📚 Documentation

- [Chainlink CCIP Documentation](https://docs.chain.link/ccip)
- [Hyperledger Fabric Documentation](https://hyperledger-fabric.readthedocs.io/)

