# LayerZero Router - Standalone Cross-Chain Transfer Router

A standalone, production-ready router for executing cross-chain transfers using the LayerZero protocol. This router is completely independent of FinP2P and focuses specifically on cross-chain functionality.

## 🎯 **Primary Cross-Chain Route**

**Sepolia ETH → Polygon Amoy**

- **Source Chain**: Ethereum Sepolia (Chain ID: 11155111)
- **Destination Chain**: Polygon Amoy (Chain ID: 80002)
- **Token**: ETH
- **Estimated Fee**: 0.0015 ETH
- **Transfer Time**: 2-5 minutes

## ✨ **Features**

- **Standalone Architecture**: No dependencies on FinP2P or other systems
- **Priority Queue System**: High, Medium, Low priority transfers
- **Concurrent Processing**: Up to 3 simultaneous transfers
- **Automatic Retry Logic**: Failed transfers retry up to 3 times
- **Real-time Monitoring**: Event-driven status updates
- **Transfer Statistics**: Comprehensive tracking and reporting
- **Graceful Shutdown**: Waits for active transfers to complete

## 🚀 **Quick Start**

### 1. **Install Dependencies**
```bash
npm install
```

### 2. **Configure Environment**
Ensure your `.env` file has the required variables:
```bash
# Sepolia Configuration
ETHEREUM_SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_KEY
SEPOLIA_PRIVATE_KEY=your_private_key
SEPOLIA_WALLET_ADDRESS=your_wallet_address

# Polygon Amoy Configuration
POLYGON_AMOY_TESTNET_RPC_URL=https://polygon-amoy.drpc.org
POLYGON_AMOY_TESTNET_PRIVATE_KEY=your_private_key
POLYGON_AMOY_TESTNET_ADDRESS=your_wallet_address
```

### 3. **Run the Demo**
```bash
npm run demo:layerzero-router:ts
```

## 📖 **Usage Examples**

### **Basic Router Setup**
```typescript
import { LayerZeroRouter } from './layerzero-router';

const router = new LayerZeroRouter();

// Initialize the router
await router.initialize();

// Execute a cross-chain transfer
const transferId = await router.executeCrossChainTransfer({
  tokenSymbol: 'ETH',
  amount: '0.001',
  destinationAddress: '0x...'
}, 'high'); // High priority

console.log('Transfer ID:', transferId);
```

### **Event Handling**
```typescript
// Listen for router events
router.on('routerReady', (info) => {
  console.log('Router ready:', info);
});

router.on('transferQueued', (item) => {
  console.log('Transfer queued:', item.id, item.priority);
});

router.on('transferInitiated', (result) => {
  console.log('Transfer started:', result.id);
});

router.on('transferCompleted', (result) => {
  console.log('Transfer completed:', result.id);
});

router.on('transferFailed', (result) => {
  console.log('Transfer failed:', result.id, result.error);
});
```

### **Monitoring and Control**
```typescript
// Get router statistics
const stats = router.getRouterStats();
console.log('Total transfers:', stats.totalTransfers);
console.log('Success rate:', stats.successfulTransfers / stats.totalTransfers);

// Check queue status
const queueStatus = router.getQueueStatus();
console.log('Queued:', queueStatus.queued);
console.log('Active:', queueStatus.active);
console.log('Completed:', queueStatus.completed);

// Get transfer status
const transferStatus = router.getTransferStatus(transferId);
if (transferStatus) {
  console.log('Status:', transferStatus.status);
  console.log('Transaction Hash:', transferStatus.txHash);
}
```

## 🔧 **API Reference**

### **LayerZeroRouter Class**

#### **Methods**

- `initialize()`: Initialize the router and connect to networks
- `executeCrossChainTransfer(request, priority)`: Queue a cross-chain transfer
- `getRouterStats()`: Get comprehensive router statistics
- `getTransferStatus(transferId)`: Get status of a specific transfer
- `getQueueStatus()`: Get current queue status
- `getActiveRoutes()`: Get available cross-chain routes
- `getEstimatedFee(sourceChain, destChain, amount)`: Estimate transfer fees
- `getWalletBalance(chainName)`: Get wallet balance on specific chain
- `shutdown()`: Gracefully shutdown the router
- `isRouterRunning()`: Check if router is active

#### **Events**

- `routerReady`: Emitted when router is fully initialized
- `transferQueued`: Emitted when transfer is added to queue
- `transferInitiated`: Emitted when transfer execution begins
- `transferCompleted`: Emitted when transfer completes successfully
- `transferFailed`: Emitted when transfer fails

### **Transfer Request Interface**
```typescript
interface TransferRequest {
  tokenSymbol: string;        // Token to transfer (e.g., 'ETH')
  amount: string;             // Amount to transfer (e.g., '0.001')
  destinationAddress: string; // Destination wallet address
}
```

### **Priority Levels**
- `'high'`: Highest priority, processed first
- `'medium'`: Default priority
- `'low'`: Lowest priority, processed last

## 📊 **Transfer Queue System**

The router uses a sophisticated queue system:

1. **Priority Sorting**: High priority transfers are processed first
2. **Timestamp Ordering**: Same priority transfers are processed FIFO
3. **Concurrent Limits**: Maximum 3 active transfers at once
4. **Automatic Retry**: Failed transfers retry up to 3 times
5. **Queue Management**: Automatic queue processing and monitoring

## 🛡️ **Error Handling & Retry Logic**

- **Network Errors**: Automatic retry with exponential backoff
- **Gas Issues**: Retry with adjusted gas parameters
- **Failed Transactions**: Retry up to 3 times before marking as failed
- **Graceful Degradation**: Continue processing other transfers if one fails

## 📈 **Performance & Monitoring**

### **Real-time Statistics**
- Total transfers executed
- Success/failure rates
- Transfer volume (total ETH moved)
- Average transfer time
- Queue performance metrics

### **Health Monitoring**
- Router status (running/stopped)
- Network connectivity
- Wallet balance monitoring
- Transfer queue health

## 🔒 **Security Features**

- **Private Key Protection**: Uses environment variables only
- **Transaction Validation**: Validates all transfer parameters
- **Balance Verification**: Checks sufficient balance before execution
- **Rate Limiting**: Prevents excessive concurrent transfers
- **Graceful Shutdown**: Ensures no transfers are lost during shutdown

## 🧪 **Testing & Development**

### **Run Tests**
```bash
# Run the demo
npm run demo:layerzero-router:ts

# Build the project
npm run build

# Type checking
npm run type-check
```

### **Development Mode**
```bash
# Watch mode for development
npm run build:watch
```

## 🚨 **Important Notes**

1. **Testnet Only**: This router is configured for testnet use
2. **ETH Requirements**: Ensure sufficient ETH balance for transfers and gas fees
3. **Network Stability**: Monitor network conditions for optimal performance
4. **Gas Optimization**: Router automatically adjusts gas parameters
5. **Backup Wallets**: Consider using backup wallets for production

## 🔮 **Future Enhancements**

- **Multi-token Support**: ERC20, ERC721 token transfers
- **Additional Routes**: Support for more chain combinations
- **Advanced Analytics**: Detailed performance metrics and reporting
- **Web Interface**: Real-time monitoring dashboard
- **API Endpoints**: REST API for external integration
- **Mobile Support**: Mobile app for transfer monitoring

## 📞 **Support & Issues**

For issues or questions:
1. Check the logs for detailed error information
2. Verify environment variable configuration
3. Ensure sufficient wallet balance
4. Check network connectivity and RPC endpoints

## 📄 **License**

MIT License - See LICENSE file for details.
