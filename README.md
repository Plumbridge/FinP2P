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
├── tests/                  # Test suites
│   ├── adapters/           # Adapter-specific tests
│   ├── confirmation/       # Confirmation mechanism tests
│   ├── helpers/            # Test helper utilities
│   ├── integration/        # Integration tests
│   ├── logs/               # Test execution logs
│   │   ├── test-results.log # Test execution results
│   │   ├── test.log        # General test logs
│   │   └── testnet-demo.log # Testnet demonstration logs
│   ├── router/             # Router component tests
│   ├── security/           # Security validation tests
│   ├── types/              # Type definition tests
│   ├── unit/               # Unit tests
│   └── utils/              # Utility function tests
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

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Docker & Docker Compose** - [Download here](https://www.docker.com/get-started)
- **Git** - [Download here](https://git-scm.com/)
- **Redis** (for local development) - [Download here](https://redis.io/download)

### 📋 Step-by-Step Setup Guide

#### Step 1: Clone and Navigate
```bash
# Clone the repository
git clone <repository-url>
cd finp2p-implementation

# Verify you're in the correct directory
ls -la  # Should see package.json, src/, etc.
```

#### Step 2: Install Dependencies
```bash
# Install all project dependencies
npm install

# Verify installation
npm list --depth=0
```

#### Step 3: Environment Configuration
```bash
# The project includes a default .env file
# For custom configuration, copy from examples:
cp configs/environments/.env.example .env.local

# Edit your configuration
nano .env.local  # or use your preferred editor
```

**Environment File Options:**
- `.env` - Default configuration (already provided)
- `configs/environments/.env.example` - Template with all options
- `configs/environments/.env.router-a` - Router A specific config
- `configs/environments/.env.router-b` - Router B specific config
- `configs/environments/.env.router-c` - Router C specific config
- `configs/environments/.env.testnet.example` - Testnet configuration

#### Step 4: Build the Project
```bash
# Compile TypeScript to JavaScript
npm run build

# Verify build success
ls dist/  # Should see compiled JavaScript files
```

#### Step 5: Choose Your Setup Method

**Option A: Docker Compose (Recommended for beginners)**
```bash
# Start complete multi-router network
docker-compose -f docker/docker-compose.yml up -d

# Check status
docker-compose -f docker/docker-compose.yml ps

# View logs
docker-compose -f docker/docker-compose.yml logs -f
```

**Option B: Local Development**
```bash
# Start Redis first
docker run -d -p 6379:6379 --name finp2p-redis redis:alpine

# Start the main router
npm start

# In separate terminals, start additional routers:
PORT=3001 ROUTER_ID=router-2 npm start
PORT=3002 ROUTER_ID=router-3 npm start
```

#### Step 6: Verify Installation
```bash
# Test the main router
curl http://localhost:3000/health

# Should return: {"status":"healthy","timestamp":"..."}

# Check router info
curl http://localhost:3000/info
```

#### Step 7: Run Tests (Optional)
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
```

### Running with Docker Compose (Recommended)

The easiest way to run a complete multi-router network:

```bash
# Start the entire network
docker-compose -f docker/docker-compose.yml up -d

# View logs
docker-compose -f docker/docker-compose.yml logs -f

# Stop the network
docker-compose -f docker/docker-compose.yml down
```

This will start:
- 3 Router instances (Bank A, B, C) on ports 3001, 3002, 3003
- Redis instance for shared state
- Mock ledger service
- Prometheus for metrics collection
- Grafana for monitoring dashboard

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

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### End-to-End Tests
```bash
# Start the network first
docker-compose -f docker/docker-compose.yml up -d

# Run E2E tests
npm run test:e2e
```

### Performance Testing
```bash
npm run test:performance
```

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