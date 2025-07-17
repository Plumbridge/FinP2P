# FinP2P Cross-Chain Atomic Swap System

A comprehensive **cross-chain atomic swap implementation** featuring FinP2P protocol coordination, enterprise Overledger management integration, and performance benchmarking. This project demonstrates real blockchain interoperability between Sui and Hedera networks with quantitative research data.

## 🎯 What This System Demonstrates

### **Two Complete Integration Patterns + Performance Analysis:**

1. **🔄 Direct FinP2P Cross-Chain Coordination**
   - Alice trades SUI tokens → Bob trades HBAR tokens (SUI→Hedera atomic swap)
   - FinP2P Router handles all cross-chain coordination logic
   - Real blockchain operations on Sui and Hedera testnets
   - FinID resolution abstracts complex wallet addresses

2. **🌐 Overledger-Managed Cross-Chain Operations**
   - Overledger API acts as enterprise management layer
   - Authentication, authorization, and access control through Overledger
   - **FinP2P Router still handles cross-chain coordination** (same SUI→Hedera atomic swap)
   - Enterprise gateway pattern with Overledger managing access to FinP2P capabilities

3. **📊 Performance Research & Benchmarking**
   - **Proper comparison**: Pure FinP2P vs Overledger-managed FinP2P (both doing identical work)
   - Quantitative analysis measuring Overledger's management overhead
   - Statistical data for academic research and dissertation work
   - Realistic performance measurement (1-5% overhead, not artificial delays)

## 🏗️ Architecture

### **Corrected Architecture Flow**

```
User Request → Overledger Account (Auth/Management) → FinP2P Router (Coordination) → SUI/Hedera Networks
```

**Key Roles:**
- **Overledger**: Enterprise management layer (authentication, authorization, access control)
- **FinP2P Router**: Cross-chain coordination engine (atomic swaps, blockchain transactions)  
- **Networks**: SUI and Hedera blockchain execution

### Core Components

1. **FinP2PSDKRouter** (`src/router/FinP2PSDKRouter.ts`)
   - **Primary coordinator** for all atomic swaps between blockchain adapters
   - Cross-chain coordination logic and atomic guarantees
   - FinID to wallet address resolution system
   - Event-driven architecture with timeout protection

2. **Blockchain Adapters** (`src/adapters/`)
   - **FinP2PIntegratedSuiAdapter**: Real Sui testnet operations
   - **FinP2PIntegratedHederaAdapter**: Real Hedera testnet operations
   - **FinP2PIntegratedOverledgerAdapter**: Enterprise management layer (delegates to FinP2P Router)

3. **Benchmarking & Demos**
   - **Unified Benchmark**: Compares Pure FinP2P vs Overledger-managed performance
   - **Real Testnet Demos**: Working examples with actual blockchain transactions
   - **Performance Analysis**: Statistical overhead measurement

### FinP2P Identity Resolution Flow

**How the Implementation Works:**

1. **FinP2P Router extracts your real wallet addresses** from environment variables
2. **FinP2P Router maps user-friendly FinIDs to your real addresses**:
   - `alice@atomic-swap.demo` → Your actual Sui address (`0x30c0c2bb...`)
   - `bob@atomic-swap.demo` → Your actual Hedera account (`0.0.6255967`)
3. **Adapters only know FinIDs** - they never see your real wallet addresses directly
4. **When an adapter needs an address**, it asks FinP2P: "What's the Sui address for alice@atomic-swap.demo (FinID)?"
5. **FinP2P returns the real address** that was mapped in step 2
6. **Adapter performs real blockchain transaction** using the resolved address
7. **Your wallet balance actually changes** because real addresses are used

**Key Innovation**: Users work with simple FinIDs (`alice@demo.com`) instead of complex blockchain addresses (`0x30c0c2bb...`), but real blockchain operations still happen with actual wallet addresses.

## 📁 Complete Project Structure

```
finp2p-cross-chain-system/
├── demos/                                  # Working demonstrations
│   ├── finp2p-cross-chain-coordination-demo.js # Direct FinP2P atomic swaps
│   └── overledger-finp2p-integration-demo.js # Enterprise coordination demo
├── scripts/                               # Performance benchmarking
│   ├── benchmark-unified.js               # Comprehensive performance comparison
│   └── utils/                              # Benchmarking utilities
├── src/                                   # Core implementation
│   ├── adapters/
│   │   ├── FinP2PIntegratedSuiAdapter.ts   # Sui blockchain operations
│   │   ├── FinP2PIntegratedHederaAdapter.ts # Hedera blockchain operations
│   │   ├── FinP2PIntegratedOverledgerAdapter.ts # Enterprise management layer
│   │   └── index.ts
│   ├── router/
│   │   ├── FinP2PSDKRouter.ts              # Central cross-chain coordinator
│   │   └── index.ts
│   ├── config/                             # Centralized configuration
│   ├── types/                              # TypeScript definitions
│   ├── utils/                              # Security and utilities
│   └── index.ts
├── tests/                                  # Security & functionality tests
│   ├── utils/                              # Crypto, validation, error tests
│   ├── types/                              # Type safety tests
│   └── helpers/                            # Test configuration
├── benchmark-results/                      # Generated performance data
├── .env                                    # Your testnet credentials
├── PROJECT-OVERVIEW.md                     # Complete documentation
└── package.json                            # All npm commands
```

## 🚀 Quick Start - Three Use Cases

### **🎯 Immediate Demo (No Setup Required)**
```bash
# Works in mock mode - demonstrates all functionality
npm install && npm run build

# Try all three use cases:
npm run demo:cross-chain        # 🔄 FinP2P atomic swaps
npm run demo:overledger         # 🌐 Enterprise coordination
npm run benchmark               # 📊 Performance analysis
```

### **🔧 For Real Blockchain Operations (Optional)**

**Prerequisites:**
- **Node.js 18+**
- **Sui Testnet Wallet** (optional - get free SUI from [Sui faucet](https://docs.sui.io/guides/developer/getting-started/get-coins))
- **Hedera Testnet Account** (optional - get free HBAR from [Hedera portal](https://portal.hedera.com/))
- **Overledger API Access** (optional - for enterprise demo)

**Setup:**
1. **Clone and Install**
```bash
git clone <repository-url>
cd finp2p-cross-chain-system
npm install && npm run build
```

2. **Configure Environment** (Optional - works without credentials)
```bash
# Edit .env file with your testnet credentials

# Sui Network (optional - enables real Sui transactions)
SUI_PRIVATE_KEY=suiprivkey1...your-private-key
SUI_NETWORK=testnet
SUI_RPC_URL=https://fullnode.testnet.sui.io:443

# Hedera Network (optional - enables real Hedera transactions)
HEDERA_ACCOUNT_ID=0.0.123456
HEDERA_PRIVATE_KEY=302e...your-private-key
HEDERA_NETWORK=testnet

# Overledger API (optional - enables enterprise management demo)
OVERLEDGER_CLIENT_ID=your-client-id
OVERLEDGER_CLIENT_SECRET=your-client-secret
OVERLEDGER_BASE_URL=https://api.overledger.dev
```

### **🎯 Three Main Usage Patterns**

#### **1. 🔄 Basic FinP2P Atomic Swaps**
```bash
npm run demo:cross-chain
```
- **Shows:** Direct Sui ↔ Hedera atomic swaps via FinP2P
- **Features:** FinID resolution, atomic guarantees, real blockchain ops
- **Perfect for:** Understanding core FinP2P atomic swap protocol

#### **2. 🌐 Enterprise Overledger Coordination**
```bash
npm run demo:overledger
```
- **Shows:** Overledger API coordinating cross-chain operations through FinP2P
- **Features:** Enterprise gateway patterns, automatic lifecycle management
- **Perfect for:** Enterprise integration and coordination layer patterns

#### **3. 📊 Performance Benchmarking & Research**
```bash
npm run benchmark               # Full analysis (30 iterations)
npm run benchmark:detailed     # Detailed analysis with extra metrics
```
- **Shows:** Quantitative performance comparison (FinP2P vs Overledger+FinP2P)
- **Output:** CSV tables, JSON data, markdown reports in `benchmark-results/`
- **Perfect for:** Academic research, performance analysis, overhead measurement


## 🔥 What the Demo Does

When you run `npm run demo:cross-chain`, you'll see:

### 1. **Configuration Check**
```
🔧 Configuration Status:
  "sui": { "hasPrivateKey": true }
  "hedera": { "hasAccountId": true, "hasPrivateKey": true }
🎯 FULL REAL TESTNET MODE - All blockchain operations will be real!
```

### 2. **FinP2P Identity Resolution** 
```
✅ Extracted Sui address from private key: {"address":"0x30c0c2bb..."}
🔧 Mock wallet mappings configured: {
  "alice@atomic-swap.demo": {"sui":"0x30c0c2bb...","hedera":"0.0.6255967"}
}
```

### 3. **Real Blockchain Connections**
```
✅ Connected to Sui network: {"network":"testnet","chainId":"4c78adac"}
✅ Connected to real Hedera network: {"accountId":"0.0.6255967","balance":"999.999 ℏ"}
```

### 4. **Atomic Swap Execution**
```
🔒 Locking Sui assets for atomic swap: 0.1 SUI
🔒 Hedera responder: Locking HBAR assets for atomic swap: 10 HBAR
✅ Sui assets locked: {"txHash":"DQTynhPhATyuB2jvGRj..."}
✅ Hedera assets locked: {"txHash":"0.0.6255967@1752143791..."}
```

### 5. **Real Balance Changes**
```
📊 Post-Swap Balances:
  alice_sui: 995982360 MIST (REAL)    ← -0.1 SUI + gas fees
  bob_hedera: 99999888534 tinybars (REAL)  ← -10 HBAR + gas fees
```

### Prerequisites
- **Docker & Docker Compose** - [Download here](https://www.docker.com/get-started)

### Docker Setup
```bash
# Start all services (Redis, routers, monitoring)
docker-compose -f docker/docker-compose.yml up -d

# Setup test environment
npm run test:setup

# Verify everything is running
docker-compose -f docker/docker-compose.yml ps

# View logs if needed
npm run compose:logs
```

### Run Tests with Docker
```bash
# Ensure Redis is running first
docker ps | grep redis

# Run full test suite
npm test
```

### Cleanup Docker Environment
```bash
# Stop Docker Compose services
docker-compose -f docker/docker-compose.yml down

# Clean build artifacts
npm run clean

# Clean Redis setup
npm run test:teardown

# Clean Redis port
node scripts/setup-test-redis.js cleanup

# Clean test artifacts
npm run test:teardown
```

## 🛠️ Development

Build the project:
```bash
npm run build              # Build once
npm run build:watch        # Build continuously
```

Code quality:
```bash
npm run lint               # Check code style
npm run lint:fix           # Fix code style issues  
npm run format             # Format code with Prettier
```

## 🔧 Troubleshooting

### Type Check
```bash
npm run type-check         # Check TypeScript without building
```

### Complete Project Reset
```bash
# Stop and remove all containers
docker-compose -f docker/docker-compose.yml down -v

# Remove Docker artifacts
docker system prune -f
docker volume prune -f

# Rebuild and restart
npm run rebuild
docker-compose -f docker/docker-compose.yml up -d --build
npm run test:setup
```

### Testnet Configuration Issues

If you have issues with testnet connections, verify your credentials:

**Sui Testnet:**
- Get free SUI: [Sui Testnet Faucet](https://docs.sui.io/guides/developer/getting-started/get-coins)
- Private key format: `suiprivkey1...` (70 characters)

**Hedera Testnet:**
- Get free HBAR: [Hedera Portal](https://portal.hedera.com/)
- Account format: `0.0.123456`
- Private key format: `302e...` (64+ characters)

## 📚 Key Technologies

- **FinP2P SDK**: `@owneraio/finp2p-sdk-js` v0.24.2 - Primary cross-chain coordination
- **Overledger SDK**: Quant Network API integration - Enterprise coordination layer
- **Sui SDK**: `@mysten/sui` for Sui blockchain integration
- **Hedera SDK**: `@hashgraph/sdk` for Hedera blockchain integration  
- **TypeScript**: For type safety and development experience
- **Jest**: For comprehensive testing

## 🎯 For Dissertation Research

This implementation demonstrates:
- **Cross-chain interoperability** via FinP2P protocol
- **Atomic swap mechanisms** ensuring transaction atomicity
- **Identity abstraction** through FinP2P's FinID system
- **Real blockchain integration** with production-ready patterns
- **Academic accessibility** without requiring production credentials

Perfect for MSc dissertation research on blockchain interoperability and cross-chain protocols.