# Axelar Adapter

The Axelar Adapter provides cross-chain asset transfer capabilities using the Axelar network. It supports multiple EVM chains and integrates with the official Axelar SDK.

## Features

- **Cross-chain transfers** between supported EVM chains
- **Multiple wallet support** with configurable wallet indices
- **Automatic provider initialization** for all supported chains
- **Real-time transfer status** monitoring
- **Fallback mechanisms** for SDK compatibility issues
- **Environment-based configuration** using `.env` file

## Supported Chains

The adapter supports the following testnet chains:
- Ethereum Sepolia (`ethereum-sepolia`)
- Base Sepolia (`base-sepolia`)
- Arbitrum Sepolia (`arbitrum-sepolia`)
- Avalanche (`avalanche`)
- Binance (`binance`)
- Fantom (`fantom`)
- Moonbeam (`moonbeam`)
- Polygon (`polygon`)

## Configuration

### Environment Variables

Create a `.env` file in your project root with the following variables:

```bash
# Your wallet mnemonic phrases (24 words) for signing transactions
AXELAR_MNEMONIC_1=tiger symbol meadow funny ignore note cable entire water raccoon float save
AXELAR_MNEMONIC_2=tiger symbol meadow funny ignore note cable entire water raccoon float save

# Your wallet public addresses
AXELAR_ADDRESS_1=axelar14lgyh9gcvxcs4g3qwrfhraxgrha8gnk7pqnapr
AXELAR_ADDRESS_2=axelar14lgyh9gcvxcs4g3qwrfhraxgrha8gnk7pqnapr

# Axelar RPC endpoint for testnet
AXELAR_RPC_URL=https://axelart.tendermintrpc.lava.build

# Axelar REST API endpoint for testnet
AXELAR_REST_URL=https://axelart.lava.build

# Axelar chain ID for testnet
AXELAR_CHAIN_ID=axelar-testnet-lisbon-3
```

### Constructor Options

You can also pass configuration directly to the constructor:

```typescript
import { AxelarAdapter, AxelarConfig } from './adapters/axelar';

const config: AxelarConfig = {
  environment: Environment.TESTNET,
  rpcUrl: 'https://axelart.tendermintrpc.lava.build',
  restUrl: 'https://axelart.lava.build',
  chainId: 'axelar-testnet-lisbon-3',
  mnemonic1: 'your mnemonic phrase here',
  mnemonic2: 'your second mnemonic phrase here'
};

const axelarAdapter = new AxelarAdapter(config);
```

## Usage

### Basic Setup

```typescript
import { AxelarAdapter } from './adapters/axelar';

// Initialize adapter (will load from environment variables)
const axelarAdapter = new AxelarAdapter();

// Connect to Axelar network
await axelarAdapter.connect();

// Check connection status
if (axelarAdapter.isConnected()) {
  console.log('Connected to Axelar network');
}
```

### Cross-Chain Transfer

```typescript
import { TransferRequest } from './adapters/axelar';

const transferRequest: TransferRequest = {
  sourceChain: 'ethereum-sepolia',
  destChain: 'base-sepolia',
  tokenSymbol: 'dev', // DEV token on testnets
  amount: '1000000000000000', // 0.001 ETH in wei
  destinationAddress: '0x...',
  walletIndex: 1 // Use wallet 1
};

try {
  const result = await axelarAdapter.transferToken(transferRequest);
  console.log('Transfer initiated:', result.id);
  console.log('Transaction hash:', result.txHash);
} catch (error) {
  console.error('Transfer failed:', error.message);
}
```

### Check Transfer Status

```typescript
const status = await axelarAdapter.getTransferStatus(transferId);
console.log('Transfer status:', status);
```

### Get Wallet Balances

```typescript
// Get balance for specific chain
const balance = await axelarAdapter.getWalletBalance(1, 'ethereum-sepolia');
console.log('Balance:', balance.balanceInEth, 'ETH');

// Get balances for all chains
const allBalances = await axelarAdapter.getWalletBalance(1);
allBalances.forEach(balance => {
  console.log(`${balance.chain}: ${balance.balanceInEth} ETH`);
});
```

### Get Chain Information

```typescript
const chainInfo = await axelarAdapter.getChainInfo('ethereum-sepolia');
if (chainInfo) {
  console.log('Chain:', chainInfo.name);
  console.log('RPC URL:', chainInfo.rpcUrl);
  console.log('Supported:', chainInfo.supported);
}
```

## Event Handling

The adapter extends `EventEmitter` and emits the following events:

```typescript
axelarAdapter.on('connected', (data) => {
  console.log('Connected to Axelar network:', data);
});

axelarAdapter.on('disconnected', (data) => {
  console.log('Disconnected from Axelar network:', data);
});

axelarAdapter.on('transferInitiated', (result) => {
  console.log('Transfer initiated:', result);
});

axelarAdapter.on('transferFailed', (result) => {
  console.log('Transfer failed:', result);
});
```

## Demo

Run the demo to test the adapter:

```bash
# JavaScript demo
npm run build && node demos/axelar/axelar-adapter-demo.js

# TypeScript demo
npx ts-node demos/axelar/axelar-adapter-demo.ts
```

## Error Handling

The adapter includes comprehensive error handling:

- **Connection errors**: Network connectivity issues
- **Wallet errors**: Invalid mnemonic or wallet initialization failures
- **Transfer errors**: SDK compatibility issues or insufficient funds
- **Provider errors**: RPC endpoint failures

## Fallback Mechanisms

If the Axelar SDK encounters compatibility issues:

1. **Simulated transfers**: For testing and development
2. **Provider fallbacks**: Multiple RPC endpoints per chain
3. **Error recovery**: Graceful degradation with informative error messages

## Dependencies

- `@axelar-network/axelarjs-sdk`: Official Axelar SDK
- `ethers`: Ethereum library for wallet and provider management
- `dotenv`: Environment variable loading

## Notes

- **Testnet only**: This adapter is configured for testnet use
- **SDK compatibility**: Some SDK versions may have compatibility issues
- **Gas fees**: Ensure wallets have sufficient funds for gas fees
- **Token symbols**: Use correct token symbols for each chain (e.g., 'dev' for testnet ETH)

## Troubleshooting

### Common Issues

1. **"Wallet not initialized"**: Check mnemonic phrases in `.env` file
2. **"Provider not available"**: Verify RPC endpoints are accessible
3. **"Transfer failed"**: Check wallet balances and gas fees
4. **"SDK compatibility"**: Consider using fallback methods for testing

### Debug Mode

Enable detailed logging by setting environment variables:

```bash
DEBUG=axelar:*
NODE_ENV=development
```

## License

MIT License - see project root for details.
