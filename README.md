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
- **Sui Adapter**: Full integration with Sui blockchain using Sui SDK
- **Hedera Adapter**: Complete Hedera Hashgraph integration with HCS support
- **Mock Adapter**: Testing and development environment
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
│   │   └── MockAdapter.ts
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
│   ├── __mocks__/          # Jest mock configurations
│   ├── adapters/           # DLT adapter tests (Sui, Hedera, Mock)
│   ├── confirmation/       # Confirmation mechanism tests
│   ├── helpers/            # Test helper utilities and setup
│   ├── integration/        # Integration tests (Redis, router networks)
│   │   └── redis-connection.test.ts # Redis connectivity tests
│   ├── router/             # Router component tests
│   │   ├── minimal-router-test.test.js # Basic router functionality
│   │   ├── primary-router-authority.test.js # Primary router authority
│   │   └── primary-router-authority.test.ts # TypeScript version
│   ├── security/           # Security validation tests
│   ├── types/              # TypeScript type definition tests
│   ├── unit/               # Unit tests for individual components
│   ├── utils/              # Utility function tests
│   ├── jest-env-setup.js   # Jest environment configuration
│   ├── setup.js            # Test setup and configuration
│   ├── setup.ts            # TypeScript test setup
│   └── tsconfig.json       # TypeScript configuration for tests
├── configs/                # Configuration files
│   ├── environments/       # Environment configurations
│   │   ├── .env.example    # Environment template
│   │   ├── .env.router-a   # Router A configuration
│   │   ├── .env.router-b   # Router B configuration
│   │   ├── .env.router-c   # Router C configuration
│   │   ├── .env.router-d   # Router D configuration
│   │   └── .env.testnet.example # Testnet configuration
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

Before starting, ensure you have the following installed:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Docker & Docker Compose** - [Download here](https://www.docker.com/get-started)
- **Git** - [Download here](https://git-scm.com/)

### 📋 Step-by-Step Setup Guide

#### Step 1: Clone the Repository
```bash
# Clone the repository
git clone <repository-url>
cd finp2p-implementation

# Verify you're in the correct directory
ls -la  # Should see package.json, src/, tests/, etc.
```

#### Step 2: Install Dependencies
```bash
# Install all project dependencies
npm install

# Verify installation completed successfully
npm list --depth=0

# Builds the project
npm run build

```

#### Step 3: Start the Project (Choose One Method)

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

This will start:
- **Redis database** (port 6379) - Automatically initialized with persistence
- **3 Router instances** (ports 3001, 3002, 3003) - Connected to Redis
- **Mock ledger service** (port 4000) - For testing transactions
- **Monitoring tools** - Prometheus (9090) & Grafana (3000)

**💻 Method B: Local Development**

For development and testing with manual Redis setup:

```bash
# 1. Start Redis database with persistence
docker run -d -p 6379:6379 --name finp2p-redis \
  -v finp2p_redis_data:/data \
  redis:7-alpine redis-server --appendonly yes

# 2. Wait for Redis to initialize
sleep 5

# 3. Verify Redis is running
docker exec finp2p-redis redis-cli ping
# Expected response: PONG

# 4. Build the project
npm run build

# 5. Start the main router
npm start

# 6. (Optional) Start additional routers in separate terminals:
PORT=3001 ROUTER_ID=router-2 npm start
PORT=3002 ROUTER_ID=router-3 npm start
```

**🔧 Method C: Quick Test (No Docker)**

For rapid testing without Docker:

```bash
# Run tests without Docker dependencies
npm run test:no-docker

# Start in development mode (uses in-memory storage)
npm run dev
```

#### Step 4: Verify Everything is Working

```bash
# Test the main router health
curl http://localhost:3000/health
# Expected response: {"status":"healthy","timestamp":"..."}

# Check router information
curl http://localhost:3000/info

# For Docker Compose setup, test other routers:
curl http://localhost:3001/health
curl http://localhost:3002/health
```

#### Step 5: Run Tests (Optional but Recommended)

```bash
# Ensure Redis is running first!
docker ps | grep redis

# Setup for tests
npm run test:setup

# Run all tests
npm test

# Or run tests without Docker setup/teardown
npm run test:no-docker
```

## Cleanup

```bash 
#Stop Docker Compose services
docker-compose -f docker/docker-compose.yml down

# Stop manual Redis
docker stop finp2p-redis
docker rm finp2p-redis

# Clean build artifacts
npm run clean

# Clean test artifacts
npm run test:teardown
```

## 🔧 Troubleshooting

### Common Docker Issues

**Problem: Docker build is very slow**
```bash
# Solution: Clean Docker cache and rebuild
docker system prune -f
docker-compose -f docker/docker-compose.yml build --no-cache
docker-compose -f docker/docker-compose.yml up -d
```

**Problem: Services fail to start**
```bash
# Check service status
docker-compose -f docker/docker-compose.yml ps

# View detailed logs
docker-compose -f docker/docker-compose.yml logs [service-name]

# Restart specific service
docker-compose -f docker/docker-compose.yml restart [service-name]
```

**Problem: Port conflicts**
```bash
# Check what's using the ports
netstat -tulpn | grep :3001
netstat -tulpn | grep :6379

# Stop conflicting services
docker stop $(docker ps -q)
```

### Redis Connection Issues

**Problem: "Redis connection failed"**
```bash
# Check Redis is running
docker exec finp2p-redis redis-cli ping

# If using Docker Compose:
docker-compose -f docker/docker-compose.yml exec redis redis-cli ping

# Check Redis logs
docker logs finp2p-redis
```

**Problem: Redis data persistence**
```bash
# Verify Redis data volume
docker volume ls | grep redis

# Backup Redis data
docker exec finp2p-redis redis-cli BGSAVE
```

### Quick Reset

If everything fails, use this complete reset:

```bash
# Stop and remove all containers
docker-compose -f docker/docker-compose.yml down -v

# Remove all project-related containers and volumes
docker system prune -f
docker volume prune -f

# Rebuild and restart
docker-compose -f docker/docker-compose.yml up -d --build

# Wait for initialization
sleep 15

# Test the setup
curl http://localhost:3001/health
```

#### Step 6: Explore the System

**Access Monitoring (Docker Compose only):**
- Grafana Dashboard: http://localhost:3001 (admin/admin)
- Prometheus Metrics: http://localhost:9090

**Try Demo Applications:**
```bash
# Run a basic demo
node demos/basic-demo.js

# Try a complete transfer scenario
node demos/complete-scenario-demo.js
```

**Stop the System:**
```bash
# For Docker Compose:
docker-compose -f docker/docker-compose.yml down

# For local development:
# Press Ctrl+C in each terminal, then:
docker stop finp2p-redis
docker rm finp2p-redis
```

### 🎯 What's Next?

1. **Read the Documentation**: Check the `docs/` folder for detailed guides
2. **Explore APIs**: See the API endpoints section below
3. **Run Demos**: Try the demo applications in the `demos/` folder
4. **Customize Configuration**: Modify environment files in `configs/environments/`
5. **Add New Adapters**: Follow the guide in `docs/NEW_ADAPTER_GUIDE.md`

### 🔧 Advanced Configuration

**Environment Variables:**
The project includes pre-configured environment files:
- `.env` - Default configuration (already provided)
- `configs/environments/.env.example` - Template with all options
- `configs/environments/.env.router-a` - Router A specific config
- `configs/environments/.env.router-b` - Router B specific config
- `configs/environments/.env.router-c` - Router C specific config
- `configs/environments/.env.testnet.example` - Testnet configuration

**Custom Configuration:**
```bash
# Copy and modify environment template
cp configs/environments/.env.example .env.local

# Edit your configuration
nano .env.local  # or use your preferred editor
```

### 📁 Test Organization

The test suite has been comprehensively organized for better maintainability:

**Test Structure:**
- **`tests/router/`** - Router-specific tests including minimal router tests and primary router authority
- **`tests/integration/`** - Integration tests including Redis connectivity and network tests
- **`tests/adapters/`** - DLT adapter tests for Sui, Hedera, and Mock adapters
- **`tests/unit/`** - Unit tests for individual components
- **`tests/security/`** - Security validation and authentication tests
- **`tests/utils/`** - Utility function tests
- **`tests/helpers/`** - Test helper utilities and shared setup functions
- **`tests/__mocks__/`** - Jest mock configurations for external dependencies

**Test Configuration:**
- **`jest-env-setup.js`** - Jest environment configuration
- **`setup.js/ts`** - Test setup and initialization
- **`tsconfig.json`** - TypeScript configuration for tests

All debug and temporary test files have been removed to maintain a clean test environment.

### 🔧 Troubleshooting Setup Issues

#### Common Issues and Solutions

**1. Port Already in Use**
```bash
# Check what's using the port
netstat -tulpn | grep :3000
# or on Windows:
netstat -ano | findstr :3000

# Kill the process or use a different port
PORT=3001 npm start
```

**2. Redis Connection Failed**
```bash
# Check if Redis is running
docker ps | grep redis

# Start Redis if not running
docker run -d -p 6379:6379 --name finp2p-redis redis:alpine

# Test Redis connection
redis-cli ping
```

**3. Build Errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear TypeScript cache
npx tsc --build --clean
npm run build
```

**4. Docker Issues**
```bash
# Reset Docker environment
docker-compose -f docker/docker-compose.yml down -v
docker system prune -f
docker-compose -f docker/docker-compose.yml up -d
```

**5. Environment Configuration**
```bash
# Verify environment file exists
ls -la .env

# Check environment variables are loaded
node -e "require('dotenv').config(); console.log(process.env.ROUTER_ID)"
```

### Running Locally

1. **Start Redis**
   ```bash
   docker run -d -p 6379:6379 redis:alpine
   ```

2. **Start a router instance**
   ```bash
   npm start
   ```

3. **Start additional routers** (in separate terminals)
   ```bash
   PORT=3001 ROUTER_ID=router-2 npm start
   PORT=3002 ROUTER_ID=router-3 npm start
   ```

## 🔧 Configuration

### Environment Variables

Key configuration options:

| Variable | Description | Default |
|----------|-------------|----------|
| `ROUTER_ID` | Unique router identifier | `router-1` |
| `PORT` | HTTP server port | `3000` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `PEERS` | Comma-separated peer URLs | `[]` |
| `LOG_LEVEL` | Logging level | `info` |

### Ledger Configuration

#### Sui Configuration
```bash
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
SUI_PRIVATE_KEY=your-sui-private-key
SUI_NETWORK=testnet
```

#### Hedera Configuration
```bash
HEDERA_ACCOUNT_ID=0.0.123456
HEDERA_PRIVATE_KEY=your-hedera-private-key
HEDERA_NETWORK=testnet
```

## 📡 API Endpoints

### Health & Status
- `GET /health` - Health check
- `GET /info` - Router information
- `GET /metrics` - Prometheus metrics

### Asset Management
- `POST /assets` - Create new asset
- `GET /assets/:id` - Get asset details
- `GET /assets` - List all assets

### Account Management
- `POST /accounts` - Create new account
- `GET /accounts/:id` - Get account details
- `GET /accounts/:id/balance/:assetId` - Get account balance

### Transfers
- `POST /transfers` - Initiate transfer
- `GET /transfers/:id` - Get transfer status
- `GET /transfers` - List transfers

### Routing
- `GET /routing/table` - View routing table
- `POST /routing/discover` - Discover routes
- `GET /routing/topology` - Network topology

## 🧪 Testing

The project features a comprehensive, well-organized test suite with strategic mocking and real component testing.

### Test Categories

**Unit Tests**
```bash
npm test                    # Run all tests
npm run test:unit          # Unit tests only
```

**Integration Tests**
```bash
npm run test:integration   # Integration tests with Redis
```

**Router Tests**
```bash
npm run test:router        # Router-specific functionality
```

**Adapter Tests**
```bash
npm run test:adapters      # DLT adapter tests
```

**End-to-End Tests**
```bash
# Start the network first
docker-compose -f docker/docker-compose.yml up -d

# Run E2E tests
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
- **`tests/adapters/`** - Blockchain adapter tests (Sui, Hedera, Mock)
- **`tests/unit/`** - Individual component unit tests
- **`tests/security/`** - Security validation tests
- **`tests/utils/`** - Utility function tests
- **`tests/helpers/`** - Shared test utilities and setup functions

### Testing Architecture & Component Mocking Strategy

The FinP2P implementation uses a sophisticated testing strategy that balances real component testing with strategic mocking to ensure reliable, fast, and isolated tests.

#### Real Components (Not Mocked)

**Core Router Logic**
- `FinP2PRouter` - The main router implementation runs with full functionality
- `LedgerManager` - Manages adapter lifecycle and routing decisions
- `RoutingEngine` - Handles message routing and peer communication
- All utility functions and validation logic

**Redis Database**
- Uses a real Redis instance (database 1 for tests)
- Configured via `docker-compose.test.yml` with `redis:7-alpine`
- Provides authentic caching and state management behavior
- Test cleanup handled by `tests/helpers/redis.ts`

#### Mocked Components

**Blockchain Network Adapters**
- **Sui Network**: `SuiClient`, `Ed25519Keypair`, `Transaction` from `@mysten/sui` are fully mocked
- **Hedera Network**: All `@hashgraph/sdk` components are mocked including:
  - `Client`, `AccountId`, `PrivateKey`
  - `TokenCreateTransaction`, `TransferTransaction`, `AccountCreateTransaction`
  - `AccountBalanceQuery`, `AccountInfoQuery`
- Mock implementations return predefined success responses and test-friendly values

**MockAdapter (Intentional Test Ledger)**
- `MockAdapter` serves as an in-memory simulation ledger
- Provides realistic blockchain behavior without external dependencies
- Supports asset creation, account management, transfers, and balance tracking
- Includes configurable latency and failure rates for testing edge cases

#### Testing Strategy Benefits

**Isolation**: External blockchain networks don't affect test reliability or speed

**Speed**: Tests run quickly without network calls or blockchain confirmations

**Determinism**: Mocked responses ensure consistent test results

**Coverage**: Real Redis and router logic provide authentic integration testing

**Flexibility**: `MockAdapter` allows testing various scenarios and edge cases

#### Test Environment Setup

```bash
# Redis test environment (uses database 1)
TEST_REDIS_CONFIG = {
  host: 'localhost',
  port: 6379,
  db: 1  # Separate from production database 0
}

# Mock ledger configuration
ledgers: {
  mock: {
    type: LedgerType.MOCK,
    config: {
      latency: 100,
      failureRate: 0,
      enableBalanceHistory: true,
      balanceReconciliationDelay: 50
    }
  }
}
```

#### Running Tests with Proper Setup

```bash
# Start Redis for tests
docker-compose -f docker-compose.test.yml up -d redis-test

# Run all tests
npm test

# Run specific test categories
npm run test:unit        # Unit tests with mocked dependencies
npm run test:integration # Integration tests with real Redis
npm run test:router      # Router-specific tests
npm run test:adapters    # Adapter tests (mostly mocked)
```

This architecture ensures that tests are both comprehensive and maintainable, providing confidence in the core router functionality while avoiding the complexity and unreliability of testing against live blockchain networks.

## 📊 Monitoring

### Prometheus Metrics
Access metrics at `http://localhost:9090/metrics`

Key metrics:
- `finp2p_transfers_total` - Total transfers processed
- `finp2p_transfer_duration` - Transfer processing time
- `finp2p_peer_connections` - Active peer connections
- `finp2p_ledger_operations` - Ledger operation counts

### Grafana Dashboard
Access dashboard at `http://localhost:3001` (admin/admin)

Pre-configured dashboards for:
- Network topology visualization
- Transfer flow monitoring
- Performance metrics
- Error tracking

## 🔄 Cross-Ledger Transfer Flow

1. **Initiation**: Client submits transfer request to source router
2. **Validation**: Router validates transfer parameters and balances
3. **Route Discovery**: Find optimal path to destination ledger
4. **Asset Locking**: Lock assets on source ledger
5. **Message Routing**: Send transfer message through router network
6. **Destination Processing**: Destination router processes transfer
7. **Asset Minting/Transfer**: Create or transfer assets on destination ledger
8. **Confirmation**: Confirm completion and unlock/burn source assets
9. **Settlement**: Update routing tables and emit events

## 🛡️ Security Features

- **Message Signing**: All inter-router messages are cryptographically signed
- **Rate Limiting**: Configurable rate limits per endpoint
- **Input Validation**: Comprehensive input sanitization
- **Secure Key Management**: Environment-based key configuration
- **Audit Logging**: Complete audit trail of all operations

## 🔌 Extending the System

### Adding New DLT Adapters

1. Implement the `LedgerAdapter` interface
2. Add configuration options to types
3. Register in `LedgerManager`
4. Add environment variables
5. Update documentation

Example:
```typescript
export class NewLedgerAdapter implements LedgerAdapter {
  // Implement required methods
}
```

### Custom Message Types

1. Extend the `MessageType` enum
2. Add message handlers in router
3. Update validation schemas
4. Add tests

## 📚 Research Applications

This implementation supports various research scenarios:

### Performance Analysis
- Latency measurements across different DLTs
- Throughput testing under various loads
- Network topology impact on performance

### Interoperability Studies
- Cross-chain asset transfer patterns
- Protocol overhead analysis
- Failure mode investigation

### Security Research
- Attack vector analysis
- Consensus mechanism interactions
- Privacy preservation techniques

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- FinP2P Working Group for protocol specifications
- Quant Network for Overledger Fusion integration guidance
- Sui Foundation for blockchain integration support
- Hedera Hashgraph for DLT adapter development resources

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

- **`API_REFERENCE.md`** - Complete API endpoint documentation
- **`NEW_ADAPTER_GUIDE.md`** - Step-by-step guide for adding new blockchain adapters
- **`PEER_DISCOVERY.md`** - Peer discovery mechanism documentation
- **`REAL_BLOCKCHAIN_SETUP.md`** - Setup guide for real blockchain networks
- **`SECURITY.md`** - Security guidelines and best practices
- **`TESTING_SETUP.md`** - Comprehensive testing setup instructions
- **`VERIFICATION_GUIDE.md`** - Transaction verification procedures
- **`performance-analysis-report.md`** - Detailed performance analysis and benchmarks

## 🎯 Demo Applications

Explore working examples in the `demos/` directory:

- **`basic-demo.js`** - Basic router functionality demonstration
- **`blockchain-integration-demo.js`** - Real blockchain integration examples
- **`complete-scenario-demo.js`** - End-to-end transfer scenarios
- **`dual-confirmation-demo.js`** - Dual confirmation mechanism demos
- **`parallel-confirmation-demo.js`** - Parallel processing demonstrations
- **`primary-router-authority-demo.js`** - Primary router authority examples
- **`real-blockchain-testnet-demo.js`** - Live testnet integration demos

Run any demo with:
```bash
node demos/<demo-name>.js
```

## 📞 Support

For questions, issues, or contributions:
- Create an issue in the repository
- Contact the development team
- Check the comprehensive documentation in the `docs/` folder
- Review demo applications in the `demos/` directory
- Use utility scripts in `scripts/utils/` for debugging and testing

---

**Note**: This is a research implementation for academic purposes. For production use, additional security audits and optimizations are recommended.