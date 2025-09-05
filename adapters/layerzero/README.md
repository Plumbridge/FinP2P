# LayerZero Adapter

This adapter provides cross-chain functionality using the LayerZero protocol. It supports multiple EVM networks and can execute real transactions on testnet.

## Features

- **Multi-chain Support**: Ethereum Sepolia, Polygon Mumbai, Arbitrum Sepolia, Base Sepolia
- **Real Transaction Execution**: Executes actual blockchain transactions on testnet
- **Environment Configuration**: Reads configuration from environment variables
- **Event-driven Architecture**: Emits events for transfer status updates
- **Fee Estimation**: Provides LayerZero fee estimation
- **Wallet Management**: Supports multiple wallet configurations

## Environment Variables

The adapter automatically reads the following environment variables from your `.env` file:

### EVM Networks

```bash
# Ethereum Sepolia
ETHEREUM_SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
SEPOLIA_PRIVATE_KEY=your_private_key_here
SEPOLIA_WALLET_ADDRESS=your_wallet_address_here

# Polygon Amoy
POLYGON_AMOY_TESTNET_RPC_URL=https://polygon-amoy.drpc.org
POLYGON_AMOY_TESTNET_PRIVATE_KEY=your_private_key_here
POLYGON_AMOY_TESTNET_ADDRESS=your_wallet_address_here

# Arbitrum Sepolia
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
ARBITRUM_SEPOLIA_PRIVATE_KEY=your_private_key_here
ARBITRUM_SEPOLIA_WALLET_ADDRESS=your_wallet_address_here

# Base Sepolia
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_SEPOLIA_PRIVATE_KEY=your_private_key_here
BASE_SEPOLIA_WALLET_ADDRESS=your_wallet_address_here
```

### Non-EVM Networks (Placeholder Support)

```bash
# Sui Testnet
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
SUI_PRIVATE_KEY=your_sui_private_key_here
SUI_ADDRESS=your_sui_address_here

# Hedera Testnet
HEDERA_ACCOUNT_ID=your_hedera_account_id
HEDERA_PRIVATE_KEY=your_hedera_private_key_here
HEDERA_NETWORK=testnet
```

### LayerZero Specific

```bash
# LayerZero Contract Addresses (optional for now)
LAYERZERO_ENDPOINT_V2_ADDRESS=your_endpoint_address
LAYERZERO_OFT_CONTRACT_ADDRESS=your_oft_contract_address
```

### Gas Settings

```bash
MAX_GAS_LIMIT=500000
GAS_PRICE=20000000000
```

## Usage

### Basic Setup

```typescript
import { LayerZeroAdapter } from './adapters/layerzero';

// Create adapter instance
const adapter = new LayerZeroAdapter();

// Connect to networks
await adapter.connect();

// Execute cross-chain transfer
const result = await adapter.transferToken({
  sourceChain: 'sepolia',
  destChain: 'mumbai',
  tokenSymbol: 'ETH',
  amount: '0.001',
  destinationAddress: '0x...'
});

console.log('Transfer result:', result);
```

### Event Handling

```typescript
// Listen for transfer events
adapter.on('transferInitiated', (result) => {
  console.log('Transfer initiated:', result);
});

adapter.on('transferFailed', (result) => {
  console.log('Transfer failed:', result);
});

adapter.on('connected', (info) => {
  console.log('Connected to LayerZero:', info);
});
```

### Chain Information

```typescript
// Get supported chains
const chains = adapter.getSupportedChains();
console.log('Supported chains:', chains);

// Get chain info
const chainInfo = await adapter.getChainInfo('sepolia');
console.log('Sepolia info:', chainInfo);

// Get wallet addresses
const addresses = adapter.getWalletAddresses();
console.log('Wallet addresses:', addresses);
```

### Balance and Fees

```typescript
// Get wallet balance
const balance = await adapter.getWalletBalance(1);
console.log('Wallet balance:', balance);

// Estimate transfer fee
const fee = await adapter.estimateTransferFee('sepolia', 'mumbai', '0.001');
console.log('Transfer fee:', fee);
```

## Supported Chains

| Chain Name | Chain ID | LayerZero Chain ID | Status |
|------------|----------|-------------------|---------|
| Ethereum Sepolia | 11155111 | 10161 | ✅ Full Support |
| Polygon Amoy | 80002 | 10109 | ✅ Full Support |
| Arbitrum Sepolia | 421614 | 10231 | ✅ Full Support |
| Base Sepolia | 84532 | 10160 | ✅ Full Support (Uses Sepolia ETH) |
| Sui Testnet | 0x1 | 10154 | 🔄 Placeholder |
| Hedera Testnet | 0x1 | 10129 | 🔄 Placeholder |

## Current Limitations

1. **Sui and Hedera Integration**: Currently placeholder implementations - would need respective SDKs for full functionality
2. **LayerZero Contracts**: Adapter runs in test mode without actual LayerZero contract addresses
3. **Token Transfers**: Currently executes simple ETH transfers instead of actual LayerZero cross-chain token transfers

## Future Enhancements

1. **Full LayerZero Integration**: Integrate with actual LayerZero contracts and endpoints
2. **Multi-token Support**: Support for various token types (ERC20, ERC721, etc.)
3. **Advanced Fee Management**: Dynamic fee calculation and optimization
4. **Transaction Monitoring**: Real-time transaction status tracking
5. **Batch Operations**: Support for multiple concurrent transfers

## Testing

The adapter is configured for testnet use by default. Make sure you have:

1. Testnet ETH/tokens on the networks you want to use
2. Valid private keys for the wallets
3. Proper RPC endpoints configured

## Security Notes

- Never commit private keys to version control
- Use environment variables for sensitive configuration
- Test thoroughly on testnet before mainnet use
- Monitor gas prices and adjust limits as needed
