# FinP2P Demo Collection

This directory contains consolidated demo scripts that showcase the FinP2P protocol's capabilities. The demos have been streamlined from 8 separate files into 3 comprehensive demonstrations.

## Available Demos

### 1. `consolidated-basic-demo.js`
**Purpose**: Introduction to FinP2P fundamentals

**Features**:
- Router initialization and health checks
- Basic asset transfers
- Simple confirmation workflows
- Router communication patterns
- Multi-router scenarios

**Best for**: New users learning FinP2P basics

### 2. `consolidated-confirmation-demo.js`
**Purpose**: Advanced confirmation and processing systems

**Features**:
- Dual confirmation record management
- Parallel processing capabilities
- Router database synchronization
- Regulatory reporting
- Rollback scenarios and error handling
- Redis integration for performance

**Best for**: Understanding confirmation mechanisms and error handling

### 3. `consolidated-blockchain-demo.js`
**Purpose**: Real blockchain integration and cross-chain operations

**Features**:
- Multi-blockchain support (Ethereum, Sui, Hedera)
- Primary Router Authority validation
- Cross-chain asset transfers
- Real testnet operations
- Performance metrics and analysis
- Authority-based routing

**Best for**: Blockchain developers and cross-chain implementations

## Prerequisites

### Environment Setup
1. Install dependencies:
   ```bash
   npm install axios winston uuid dotenv
   ```

2. Configure environment variables (create `.env` file):
   ```env
   # Blockchain RPC URLs
   ETH_RPC_URL=https://mainnet.infura.io/v3/your-key
   ETH_TESTNET_RPC_URL=https://sepolia.infura.io/v3/your-key
   SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
   SUI_TESTNET_RPC_URL=https://fullnode.testnet.sui.io:443
   HEDERA_RPC_URL=https://mainnet-public.mirrornode.hedera.com
   HEDERA_TESTNET_RPC_URL=https://testnet.mirrornode.hedera.com
   
   # Blockchain Credentials (for real testnet operations)
   SUI_PRIVATE_KEY=your-sui-private-key
   SUI_PACKAGE_ID=your-sui-package-id
   HEDERA_OPERATOR_ID=0.0.your-operator-id
   HEDERA_OPERATOR_KEY=your-operator-private-key
   HEDERA_TREASURY_ID=0.0.your-treasury-id
   HEDERA_TREASURY_KEY=your-treasury-private-key
   
   # Redis (for confirmation demo)
   REDIS_URL=redis://localhost:6379
   REDIS_PORT=6379
   REDIS_HOST=localhost
   ```

### Router Setup
Ensure FinP2P routers are running on the expected ports:
- Primary Router: `http://localhost:3001` (configurable via `PRIMARY_ROUTER_URL`)
- Secondary Router: `http://localhost:3002` (configurable via `SECONDARY_ROUTER_URL`)
- Backup Router: `http://localhost:3003` (configurable via `BACKUP_ROUTER_URL`)

## Running the Demos

### Basic Demo
```bash
node consolidated-basic-demo.js
```

### Confirmation Demo
```bash
node consolidated-confirmation-demo.js
```

### Blockchain Demo
```bash
node consolidated-blockchain-demo.js
```

## Demo Progression

For the best learning experience, run the demos in this order:

1. **Basic Demo** - Learn fundamental concepts
2. **Confirmation Demo** - Understand advanced processing
3. **Blockchain Demo** - Explore real-world integration

## Output and Logging

- All demos provide detailed console output with step-by-step progress
- Blockchain demo generates `blockchain-demo.log` for detailed logging
- Confirmation demo creates performance reports in JSON format
- Error handling and recovery scenarios are demonstrated

## Customization

Each demo can be customized by modifying:
- Router endpoints and configurations
- Asset definitions and metadata
- Blockchain network settings
- Processing parameters and timeouts

## Troubleshooting

### Common Issues

1. **Router Connection Errors**
   - Ensure routers are running on expected ports
   - Check firewall and network connectivity
   - Verify router health endpoints

2. **Blockchain Connection Issues**
   - Verify RPC URLs and API keys
   - Check network connectivity to blockchain nodes
   - Ensure testnet credentials are valid

3. **Redis Connection (Confirmation Demo)**
   - Start Redis server: `redis-server`
   - Verify Redis URL in environment variables
   - Check Redis connectivity: `redis-cli ping`

### Getting Help

- Check the console output for detailed error messages
- Review log files for additional debugging information
- Ensure all prerequisites are properly configured
- Verify environment variables are set correctly

## Migration from Previous Demos

If you were using the previous 8 demo files, here's the mapping:

| Old Demo | New Consolidated Demo |
|----------|----------------------|
| `basic-demo.js` | `consolidated-basic-demo.js` |
| `complete-scenario-demo.js` | `consolidated-basic-demo.js` |
| `dual-confirmation-demo.js` | `consolidated-confirmation-demo.js` |
| `comprehensive-dual-confirmation-demo.js` | `consolidated-confirmation-demo.js` |
| `parallel-confirmation-demo.js` | `consolidated-confirmation-demo.js` |
| `blockchain-integration-demo.js` | `consolidated-blockchain-demo.js` |
| `primary-router-authority-demo.js` | `consolidated-blockchain-demo.js` |
| `real-blockchain-testnet-demo.js` | `consolidated-blockchain-demo.js` |

The new demos include all functionality from the previous versions with improved organization and reduced redundancy.