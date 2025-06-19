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
├── docker/                 # Docker configurations
├── docs/                   # Documentation
├── docker-compose.yml      # Multi-router network setup
├── Dockerfile             # Container definition
└── package.json           # Dependencies and scripts
```

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

- Node.js 18 or higher
- Docker and Docker Compose
- Redis (for local development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd finp2p-implementation
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

### Running with Docker Compose (Recommended)

The easiest way to run a complete multi-router network:

```bash
# Start the entire network
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the network
docker-compose down
```

This will start:
- 3 Router instances (Bank A, B, C) on ports 3001, 3002, 3003
- Redis instance for shared state
- Mock ledger service
- Prometheus for metrics collection
- Grafana for monitoring dashboard

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
docker-compose up -d

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

## 📞 Support

For questions, issues, or contributions:
- Create an issue in the repository
- Contact the development team
- Check the documentation in the `/docs` folder

---

**Note**: This is a research implementation for academic purposes. For production use, additional security audits and optimizations are recommended.