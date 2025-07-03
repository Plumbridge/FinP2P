# FinP2P Implementation for DLT Interoperability

A comprehensive FinP2P (Financial Peer-to-Peer) implementation for MSc dissertation research on Distributed Ledger Technology (DLT) interoperability. This project integrates with Quant's Overledger Fusion and provides adapters for emerging blockchains including Sui, Hedera, and Aptos.

## 🏗️ Architecture Overview

FinP2P is a peer-to-peer routing protocol designed for financial institutions to enable seamless asset transfers across different distributed ledgers. Each institution operates a "Router" that:

- Connects to multiple DLTs via standardized adapters
- Communicates bilaterally with other routers
- Routes asset transfers between different ledgers
- Maintains assets on their original chains while updating ownership

## 🚀 Features

### Core Router Capabilities
- **Unique FinID Management**: Standardized identity system for entities across networks
- **Message Routing**: Efficient peer-to-peer communication between routers
- **Transaction Validation**: Comprehensive validation and confirmation mechanisms
- **Event Emission**: Real-time transfer and state change notifications
- **Cross-Ledger Transfers**: Seamless asset movement between different DLTs

### DLT Adapters
- **Sui Adapter**: Full integration with Sui testnet using Sui SDK
- **Hedera Adapter**: Complete Hedera testnet integration with HCS support
- **Extensible Pattern**: Easy addition of new blockchain adapters

### Network Features
- **Multi-Router Network**: Support for 2-3+ router instances
- **Peer Discovery**: Automatic peer detection and connection management
- **Load Balancing**: Intelligent routing based on network topology
- **Fault Tolerance**: Automatic retry and failover mechanisms

## 📁 Project Structure

```
finp2p-implementation/
├── src/
│   ├── adapters/           # DLT adapter implementations
│   │   ├── SuiAdapter.ts
│   │   ├── HederaAdapter.ts
│   ├── router/             # Core router implementation
│   │   ├── Router.ts
│   │   ├── RoutingEngine.ts
│   │   └── LedgerManager.ts
│   ├── utils/              # Utility functions
│   │   ├── logger.ts
│   │   ├── validation.ts
│   │   └── crypto.ts
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts
│   └── index.ts            # Application entry point
├── tests/                  # Organized test suites
│   ├── adapters/           # DLT adapter tests (Sui, Hedera)
│   ├── confirmation/       # Confirmation mechanism tests
│   ├── helpers/            # Test helper utilities and setup
│   ├── integration/        # Integration tests (Redis, router networks)
│   ├── router/             # Router component tests
│   ├── security/           # Security validation tests
│   ├── types/              # TypeScript type definition tests
│   ├── unit/               # Unit tests for individual components
│   ├── utils/              # Utility function tests
│   ├── jest-env-setup.js   # Jest environment configuration
│   ├── setup.ts            # TypeScript test setup
│   └── tsconfig.json       # TypeScript configuration for tests
├── configs/                # Configuration files
│   ├── environments/       # Environment configurations
│   │   ├── .env.example    # Environment template
│   │   ├── .env.router-a   # Router A configuration
│   │   ├── .env.router-b   # Router B configuration
│   │   ├── .env.router-c   # Router C configuration
│   │   └── .env.router-d   # Router D configuration
├── .env.testnet.example    # Testnet configuration template
│   ├── babel.config.js     # Babel configuration
│   ├── jest.config.bypass.js  # Jest bypass configuration
│   └── jest.config.nocheck.js # Jest no-check configuration
├── docs/                   # Documentation
│   ├── API_REFERENCE.md    # API documentation
│   ├── NEW_ADAPTER_GUIDE.md # Guide for adding new adapters
│   ├── PEER_DISCOVERY.md   # Peer discovery documentation
│   ├── REAL_BLOCKCHAIN_SETUP.md # Real blockchain setup guide
│   ├── SECURITY.md         # Security guidelines
│   ├── TESTING_SETUP.md    # Testing setup instructions
│   ├── VERIFICATION_GUIDE.md # Verification procedures
│   └── performance-analysis-report.md # Performance analysis
├── demos/                  # Demo applications
│   ├── basic-demo.js       # Basic functionality demo
│   ├── blockchain-integration-demo.js # Blockchain integration demo
│   ├── complete-scenario-demo.js # Complete scenario demo
│   ├── comprehensive-dual-confirmation-demo.js # Dual confirmation demo
│   ├── dual-confirmation-demo.js # Simple dual confirmation
│   ├── parallel-confirmation-demo.js # Parallel confirmation demo
│   ├── primary-router-authority-demo.js # Primary router demo
│   └── real-blockchain-testnet-demo.js # Real blockchain testnet demo
├── scripts/                # Build and utility scripts
│   ├── utils/              # Utility scripts
│   │   ├── debug-redis.js  # Redis debugging utility
│   │   ├── performance-test-suite.js # Performance testing
│   │   ├── run-tests-with-output.js # Test runner with output
│   │   └── test-redis-isolated.js # Isolated Redis testing
│   ├── add-router-d.bat    # Windows router addition script
│   ├── add-router-d.sh     # Unix router addition script
│   ├── start-dev.bat       # Windows development startup
│   ├── start-dev.sh        # Unix development startup
│   └── start-router.bat    # Windows router startup
├── monitoring/             # Monitoring configurations
│   ├── grafana/            # Grafana dashboards
│   └── prometheus.yml      # Prometheus configuration
├── .github/                # GitHub workflows
│   └── workflows/          # CI/CD workflows
├── config/                 # Runtime configuration
├── docker/                 # Docker configurations
│   ├── Dockerfile          # Container definition
│   ├── Dockerfile.ledger   # Ledger service container
│   ├── docker-compose.yml  # Multi-router network setup
│   └── docker-compose.test.yml # Test environment setup
├── .env                   # Default environment configuration
├── jest.config.js         # Main Jest configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

## 📋 Project Organization

The project has been organized into a clean, modular structure:

### 📂 Directory Structure
- **`configs/`** - All configuration files (Babel, Jest configurations)
  - **`configs/environments/`** - Environment configuration files for different setups
- **`docs/`** - Comprehensive documentation including API references, guides, and reports
- **`demos/`** - Working demonstration scripts for various scenarios
- **`docker/`** - Docker configurations and container definitions
- **`scripts/`** - Build scripts and utilities
  - **`scripts/utils/`** - Utility scripts for debugging, testing, and performance analysis
- **`tests/`** - Organized test suites by category (unit, integration, security, etc.)
  - **`tests/logs/`** - Test execution logs and results
- **`monitoring/`** - Grafana and Prometheus configurations


## 🛠️ Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: Redis (for routing tables and state)
- **Containerization**: Docker & Docker Compose
- **Monitoring**: Prometheus & Grafana
- **Testing**: Jest
- **DLT SDKs**: Sui SDK, Hedera SDK

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Docker & Docker Compose** - [Download here](https://www.docker.com/get-started)
- **Git** - [Download here](https://git-scm.com/)

### 📋 Setup Guide

#### Step 1: Clone and Install
```bash
git clone <repository-url>
cd finp2p-implementation
npm install
npm run build
```

#### Step 2: Start the Project (Choose One Method)

**🐳 Method A: Docker Compose (Recommended - Production-like)**

This method starts everything you need with one command and includes Redis initialization:

```bash
# Navigate to project directory
cd finp2p-implementation

# Start all services (Redis, 3 routers, monitoring)
docker-compose -f docker/docker-compose.yml up -d

# sets up test
npm run test:setup

# Verify everything is running
docker-compose -f docker/docker-compose.yml ps

# View logs if needed
docker-compose -f docker/docker-compose.yml logs
# OR: npm run compose:logs
```

#### Step 3: Run Tests (Runs all test)

```bash
# Ensure Redis is running first!
docker ps | grep redis

# Run all tests
npm test

# Or run tests without Docker setup/teardown
npm run test:no-docker
```

#### Step 4: Test Real Blockchain Connections (Optional)

To test with real Sui and Hedera testnets:

```bash
# Copy testnet configuration template
cp .env.testnet.example .env.testnet

# Edit .env.testnet with your testnet credentials:
# - SUI_PRIVATE_KEY (Sui testnet private key)
# - HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY (Hedera testnet credentials)

# Test real testnet connections
npm run verify:testnet

# Test adapter implementations
npm run test:adapters
```

## Cleanup

```bash 
#Stop Docker Compose services
docker-compose -f docker/docker-compose.yml down

# Clean build artifacts
npm run clean

# Clean Redis port
node scripts/setup-test-redis.js cleanup

# Clean test artifacts
npm run test:teardown
```
## 🔧 Troubleshooting

**Complete reset**
```bash
# Stop and remove all containers
docker-compose -f docker/docker-compose.yml down -v

# Remove project-related containers and volumes
docker system prune -f
docker volume prune -f

# Rebuild and restart
docker-compose -f docker/docker-compose.yml up -d --build

# Set up test environment
npm run test:setup
```

### Testnet Configuration

For real blockchain testing, configure your `.env.testnet` file:

#### Sui Testnet
```bash
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
SUI_PRIVATE_KEY=your-sui-testnet-private-key
SUI_NETWORK=testnet
```

#### Hedera Testnet
```bash
HEDERA_ACCOUNT_ID=0.0.123456
HEDERA_PRIVATE_KEY=your-hedera-testnet-private-key
HEDERA_NETWORK=testnet
```

**Note**: Get testnet credentials from:
- Sui: [Sui Testnet Faucet](https://docs.sui.io/guides/developer/getting-started/get-coins)
- Hedera: [Hedera Portal](https://portal.hedera.com/)


## 🧪 Testing

The project features a comprehensive, well-organized test suite with strategic mocking and real component testing.

### Test Categories

**Comprehensive Test Suite**
```bash
npm test                    # Run all tests (unit, integration, adapters)
npm run test:unit          # Unit tests only (utils, types)
npm run test:no-integration # All tests except integration and adapters
```

**Testnet Connection Verification**
```bash
npm run build              # Build the project first
npm run verify:testnet     # Test real blockchain connections with balance changes
npm run test:adapters      # Test adapter implementations specifically
```

**Integration Tests**
```bash
npm run test:integration   # Integration tests with Redis
```

**Router Tests**
```bash
npm run test:router        # Router-specific functionality
```

**End-to-End Tests**
```bash
npm run test:e2e
```

**Performance Testing**
```bash
npm run test:performance
```

### Test Organization

The test suite is organized into logical categories:

- **`tests/router/`** - Core router functionality tests
- **`tests/integration/`** - Redis connectivity and network integration tests
- **`tests/adapters/`** - Real blockchain adapter tests (Sui, Hedera)
- **`tests/unit/`** - Individual component unit tests
- **`tests/security/`** - Security validation tests
- **`tests/utils/`** - Utility function tests
- **`tests/helpers/`** - Shared test utilities and setup functions

#### Running Tests

```bash
# Unit tests only (fast, no external dependencies)
npm run test:unit

# All tests except integration and adapters
npm run test:no-integration

# Integration tests (requires Redis)
npm run test:integration

# Real testnet verification
npm run verify:testnet

# Test adapter implementations
npm run test:adapters

# All tests
npm test
```