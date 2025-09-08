# FinP2P Core - Cross-Chain Atomic Swap Platform

> **Production-Ready Multi-Blockchain Atomic Swap System**

A comprehensive cross-chain atomic swap platform providing secure, efficient, and reliable transaction routing between different blockchain networks. This project implements multiple cross-chain protocols including Axelar, LayerZero, and FinP2P for seamless multi-chain atomic swaps.

## 🎯 Key Features

### **🔄 Cross-Chain Atomic Swaps**
- **Multiple cross-chain protocols** - Axelar, LayerZero, and FinP2P integration
- **Secure atomic swap coordination** with HTLC (Hash Time Locked Contracts)
- **Real-time transaction routing** between different blockchain networks
- **Production-grade reliability** with comprehensive error handling

### **🌐 Multi-Blockchain Support**
- **Ethereum/EVM**: Sepolia testnet with ethers.js integration
- **Hedera Hashgraph**: Testnet with official Hedera SDK
- **SUI Blockchain**: Testnet with Move smart contract support
- **Cosmos**: IBC-enabled chains via Axelar
- **LayerZero**: Omnichain protocol support

### **🔒 Enterprise Security**
- **External transaction signing** (no private key management)
- **HTLC-based security** for atomic swap guarantees
- **Production-grade validation** and error handling
- **Real smart contract interactions** without mocked functionality

## 🏗️ Architecture

### **Cross-Chain Atomic Swap Architecture**
```
Client Application → FinP2P Router → Cross-Chain Adapters → Blockchain Networks
                  ↓
            Atomic Swap Coordination Layer
```

**Adapter Types:**
1. **Cross-Chain Adapters** (`adapters/axelar/`, `adapters/layerzero/`) - Cross-chain protocol implementations
2. **FinP2P Adapters** (`adapters/finp2p/`) - FinP2P protocol integration
3. **Fusion Adapters** (`adapters/fusion/`) - Fusion OpenAPI compliant REST handlers
4. **Pure Adapters** (`adapters/pure/`) - Native SDK wrappers

## 📚 Quick Start

### **Installation**
```bash
git clone <repository>
cd FinP2P
npm install
```

### **Environment Setup**
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your API keys and network configurations
# See .env.example for all required environment variables
```

### **Docker Deployment (Recommended)**
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build and run individual services
docker-compose up redis finp2p-core

# View logs
docker-compose logs -f finp2p-core

# Stop services
docker-compose down
```

### **Build & Test**
```bash
# Build the project
npm run build

# Run atomic swap demos
npm run demo:atomic-swap
npm run demo:axelar
npm run demo:layerzero

# Run comprehensive tests
npm run test:all
```

## 🔌 Cross-Chain Adapters

### **Axelar Adapter**
- **Networks**: Ethereum, Cosmos, Avalanche, Polygon, BSC
- **Features**: Cross-chain token transfers, atomic swaps, IBC integration
- **SDK**: @axelar-network/axelarjs-sdk
- **Protocol**: Axelar General Message Passing (GMP)

### **LayerZero Adapter**
- **Networks**: 30+ EVM and non-EVM chains
- **Features**: Omnichain fungible tokens, cross-chain messaging
- **SDK**: @layerzerolabs/lz-sdk
- **Protocol**: LayerZero Omnichain Protocol

### **FinP2P Adapters**
- **Networks**: Hedera, SUI, Ethereum
- **Features**: FinP2P protocol integration, atomic swap coordination
- **SDK**: @owneraio/finp2p-sdk-js
- **Protocol**: FinP2P atomic swap protocol

### **Fusion Adapters**
- **Networks**: Ethereum, Hedera, SUI
- **Features**: OpenAPI compliant REST endpoints
- **SDK**: Native blockchain SDKs
- **Protocol**: Fusion OpenAPI specification

## 📋 Available Demos

### **Atomic Swap Demos**
```bash
# FinP2P atomic swap coordination
npm run demo:atomic-swap

# Axelar cross-chain atomic swap
npm run demo:axelar:true-atomic-swap

# LayerZero omnichain demo
npm run demo:layerzero

# Fusion multi-chain demo
npm run demo:fusion
```

### **Adapter Demos**
```bash
# Hedera and SUI adapters
npm run demo:adapters

# Pure adapter demos
npm run demo:fusion-pure

# LayerZero router demo
npm run demo:layerzero-router
```

## 🚀 Usage Examples

### **Axelar Cross-Chain Atomic Swap**
```typescript
import { AxelarAdapter } from './adapters/axelar';

const axelarAdapter = new AxelarAdapter(config, logger);

// Create atomic swap proposal
const swapProposal = await axelarAdapter.createAtomicSwapProposal({
  sourceChain: 'ethereum',
  destinationChain: 'avalanche',
  tokenAddress: '0x...',
  amount: '1000000000000000000', // 1 token
  recipient: '0x...',
  secretHash: '0x...'
});
```

### **LayerZero Omnichain Transfer**
```typescript
import { LayerZeroAdapter } from './adapters/layerzero';

const layerZeroAdapter = new LayerZeroAdapter(config, logger);

// Send tokens across chains
const transfer = await layerZeroAdapter.sendTokens({
  sourceChain: 'ethereum',
  destinationChain: 'polygon',
  tokenAddress: '0x...',
  amount: '1000000000000000000',
  recipient: '0x...'
});
```

### **FinP2P Atomic Swap Coordination**
```typescript
import { FinP2PIntegratedFusionAdapter } from './adapters/finp2p';

const finp2pAdapter = new FinP2PIntegratedFusionAdapter(config, logger);

// Coordinate atomic swap
const swap = await finp2pAdapter.coordinateAtomicSwap({
  participant1: { chain: 'hedera', address: '0.0.123' },
  participant2: { chain: 'sui', address: '0x...' },
  asset1: { type: 'HBAR', amount: '100' },
  asset2: { type: 'SUI', amount: '50' }
});
```

## 🧪 Testing & Validation

### **Comprehensive Test Suite**
```bash
# Run all tests
npm run test:all

# Run specific test suites
npm run test:adapters
npm run test:security
npm run test:performance
npm run test:compliance
npm run test:reliability

# Run cross-chain specific tests
npm run test:axelar
npm run test:layerzero
```

### **Benchmark Suite**
```bash
# Run comprehensive benchmarks
npm run benchmark:empirical

# Run specific protocol benchmarks
npm run benchmark:axelar
npm run benchmark:layerzero

# Run performance tests
npm run benchmark:test-performance
```

### **Test Coverage**
- ✅ **Cross-chain atomic swap** testing
- ✅ **HTLC contract validation** across protocols
- ✅ **External signing model** verification
- ✅ **Error handling** and edge cases
- ✅ **Real blockchain interactions** with testnets

## 📖 Documentation

- [Adapter Documentation](./docs/adapters/) - Detailed API reference for all adapters
- [Core Router Documentation](./docs/core/finp2p-sdk-router.md) - FinP2P SDK router guide
- [Demo Documentation](./docs/demos/) - Comprehensive demo guides
- [Benchmark Results](./results/) - Performance and reliability benchmarks

## 🔧 Configuration

### **Environment Variables**
```bash
# Ethereum/EVM Networks
ETHEREUM_SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_API_KEY
POLYGON_RPC_URL=https://polygon-rpc.com
BSC_RPC_URL=https://bsc-dataseed.binance.org

# Hedera Network
HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT
HEDERA_PRIVATE_KEY=YOUR_PRIVATE_KEY
HEDERA_NETWORK=testnet

# SUI Network
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
SUI_ADDRESS=0xYOUR_SUI_ADDRESS

# Axelar Network
AXELAR_RPC_URL=https://axelar-testnet-rpc.chainode.tech
AXELAR_CHAIN_ID=axelar-testnet-lisbon-3

# LayerZero Network
LAYERZERO_RPC_URL=https://rpc.ankr.com/eth_sepolia
LAYERZERO_CHAIN_ID=40161
```

## 🎯 Production Readiness

### **Enterprise Features**
- ✅ **External signing only** - No private key management
- ✅ **HTLC-based security** for atomic swap guarantees
- ✅ **Production error handling** with detailed logging
- ✅ **Rate limiting support** and connection pooling
- ✅ **Real blockchain validation** with proper gas estimation
- ✅ **Multi-protocol support** for maximum flexibility

### **Performance**
- ⚡ **Sub-second response times** for atomic swap coordination
- 🔄 **Connection pooling** for optimal performance
- 📊 **Comprehensive benchmarking** across all protocols
- 🚀 **Scalable architecture** for high-volume transactions

## 🛠️ Development

### **Project Structure**
```
adapters/
├── axelar/         # Axelar cross-chain protocol
│   ├── AxelarAdapter.ts
│   ├── AtomicSwapCoordinator.ts
│   └── HTLCContract.ts
├── layerzero/      # LayerZero omnichain protocol
│   ├── LayerZeroAdapter.ts
│   └── HTLCContract.ts
├── finp2p/         # FinP2P protocol integration
│   ├── FinP2PIntegratedFusionAdapter.ts
│   ├── FinP2PIntegratedHederaAdapter.ts
│   └── FinP2PIntegratedSuiAdapter.ts
├── fusion/         # Fusion OpenAPI compliant adapters
│   ├── FusionEVMAdapter.ts
│   ├── FusionHederaAdapter.ts
│   └── FusionSuiAdapter.ts
└── pure/           # Native SDK adapters
    ├── HederaAdapter.ts
    └── SuiAdapter.ts

core/               # Core routing and utilities
├── router/         # FinP2P SDK router
├── types/          # TypeScript definitions
└── utils/          # Utility functions

demos/              # Comprehensive demo suite
├── axelar/         # Axelar demos
├── layerzero/      # LayerZero demos
├── finp2p/         # FinP2P demos
├── fusion/         # Fusion demos
└── pure/           # Pure adapter demos

results/            # Benchmark results
├── axelar/         # Axelar benchmarks
├── layerzero/      # LayerZero benchmarks
└── finp2p/         # FinP2P benchmarks
```

### **Contributing**
1. Follow atomic swap security best practices
2. Maintain comprehensive test coverage for new features
3. Use real blockchain SDKs (no mocking)
4. Implement external signing model
5. Add comprehensive error handling
6. Include benchmark tests for performance validation

## 📊 Benchmarks & Performance

Comprehensive benchmark results available across all protocols:

### **Performance Characteristics**
- **Axelar**: Cross-chain transfer latency and throughput
- **LayerZero**: Omnichain message delivery times
- **FinP2P**: Atomic swap coordination efficiency

### **Security & Reliability**
- **HTLC Contract Security**: Vulnerability assessments
- **Operational Reliability**: Uptime and error rates
- **Regulatory Compliance**: Audit and compliance metrics

### **Benchmark Results**
- [Axelar Benchmarks](./results/axelar/) - Performance, security, reliability, compliance
- [LayerZero Benchmarks](./results/layerzero/) - Performance, security, reliability, compliance  
- [FinP2P Benchmarks](./results/finp2p/) - Performance, security, reliability, compliance

Run benchmarks: `npm run benchmark:empirical`

## 🐳 Docker Deployment

### **Quick Start with Docker**
```bash
# Clone and setup
git clone <repository>
cd FinP2P

# Copy environment template
cp .env.example .env
# Edit .env with your configuration

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f finp2p-core
```

### **Available Services**
- **finp2p-core**: Main application (port 3000)
- **redis**: Caching and session storage (port 6379)
- **finp2p-frontend**: Web interface (port 3001) - Optional
- **prometheus**: Metrics collection (port 9090) - Optional
- **grafana**: Monitoring dashboard (port 3002) - Optional

### **Docker Commands**
```bash
# Build and run
docker-compose up --build

# Run in background
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# View logs
docker-compose logs -f [service-name]

# Execute commands in container
docker-compose exec finp2p-core npm run test
```

### **Production Deployment**
```bash
# Set production environment
export NODE_ENV=production

# Build production image
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale services
docker-compose up -d --scale finp2p-core=3
```

## 🤝 Enterprise Support

This system is designed for enterprise cross-chain atomic swap integration:
- **Multi-protocol support** for maximum flexibility
- **HTLC-based security** for atomic swap guarantees
- **Production-grade security** with external signing
- **Comprehensive documentation** and examples
- **Extensive test coverage** with real network validation
- **Comprehensive benchmarking** for performance validation

## 📄 License

MIT License - See [LICENSE](./LICENSE) for details.

---

**Ready for production deployment with comprehensive cross-chain atomic swap capabilities.**