# FinP2P Cross-Chain Atomic Swap Implementation

A FinP2P (Financial Peer-to-Peer) implementation demonstrating **real cross-chain atomic swaps** between Sui and Hedera testnets. This project shows how FinP2P enables seamless asset transfers across different blockchains while maintaining assets on their original chains.

## 🎯 What This Demonstrates

This implementation showcases **true cross-chain atomic swaps** where:
- **Alice** trades her SUI tokens ↔ **Bob** trades his HBAR tokens
- **FinP2P Protocol** coordinates the atomic swap (ensures both succeed or both fail)
- **Real Blockchain Operations** on Sui and Hedera testnets
- **Assets Never Move Chains** - only ownership transfers via FinP2P identity resolution

## 🏗️ Architecture

### Core Components

1. **FinP2PSDKRouter** (`src/router/FinP2PSDKRouter.ts`)
   - Coordinates atomic swaps between adapters
   - Maps FinIDs to real wallet addresses
   - Only FinP2P credentials are mocked (for academic use)

2. **FinP2PIntegratedSuiAdapter** (`src/adapters/FinP2PIntegratedSuiAdapter.ts`)
   - Performs real Sui testnet operations
   - Listens for FinP2P atomic swap events
   - Resolves FinIDs to Sui wallet addresses

3. **FinP2PIntegratedHederaAdapter** (`src/adapters/FinP2PIntegratedHederaAdapter.ts`)
   - Performs real Hedera testnet operations
   - Coordinates with Sui adapter via FinP2P events
   - Resolves FinIDs to Hedera account IDs

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

## 📁 Project Structure

```
finp2p-implementation/
├── demos/
│   └── atomic-swap-real-testnet-demo.js    # MAIN WORKING DEMO
├── src/
│   ├── adapters/
│   │   ├── FinP2PIntegratedSuiAdapter.ts   # Sui blockchain integration
│   │   ├── FinP2PIntegratedHederaAdapter.ts # Hedera blockchain integration
│   │   └── index.ts
│   ├── router/
│   │   ├── FinP2PSDKRouter.ts              # Core FinP2P router
│   │   └── index.ts
│   ├── types/                              # TypeScript definitions
│   ├── utils/                              # Utilities (logger, crypto, etc.)
│   └── index.ts
├── tests/                                  # Test suites
├── scripts/
│   └── setup-test-redis.js                # Redis setup for tests
├── .env                                    # Your testnet credentials
├── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **Sui Testnet Wallet** (get free SUI from [Sui faucet](https://docs.sui.io/guides/developer/getting-started/get-coins))
- **Hedera Testnet Account** (get free HBAR from [Hedera portal](https://portal.hedera.com/))

### Setup

1. **Clone and Install**
```bash
git clone <repository-url>
cd finp2p-implementation
npm install
npm run build
```

2. **Configure Environment**
```bash
# Edit .env file with your testnet credentials
# Organization/Router Identity
ROUTER_ID=your-organization-id
FINP2P_API_KEY=your-api-key-here

# FinP2P Network Endpoints  
OWNERA_API_ADDRESS=https://api.finp2p.org
OWNERA_RAS_ADDRESS=https://ras.finp2p.org

# Authentication - MOCKED for academic use
FINP2P_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
FINP2P_CERTIFICATE=-----BEGIN CERTIFICATE-----...

# Sui Testnet Configuration
SUI_PRIVATE_KEY=suiprivkey1...your-private-key
SUI_ADDRESS=0x...your-sui-address  
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
SUI_NETWORK=testnet

# Hedera Testnet Configuration
HEDERA_ACCOUNT_ID=0.0.123456  # Your account ID
HEDERA_PRIVATE_KEY=302e...your-private-key
HEDERA_NETWORK=testnet
```

3. **Run the Atomic Swap Demo**
```bash
npm run demo:atomic-swap
```

## 🔥 What the Demo Does

When you run `npm run demo:atomic-swap`, you'll see:

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

- **FinP2P SDK**: `@owneraio/finp2p-sdk-js` v0.24.2
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