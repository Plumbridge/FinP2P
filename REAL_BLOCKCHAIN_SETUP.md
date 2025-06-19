# Real Blockchain Integration Setup Guide

This guide will help you set up real blockchain connections for the FinP2P cross-ledger transfer demo.

## Prerequisites

### 1. Sui Testnet Setup

#### Install Sui CLI
```bash
# Install Sui CLI
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
```

#### Create Sui Wallet
```bash
# Create new wallet
sui client new-address ed25519

# Get testnet SUI tokens
sui client faucet

# Export private key
sui keytool export --key-identity <address> --json
```

#### Environment Variables for Sui
Add to your `.env` file:
```env
# Sui Configuration
SUI_PRIVATE_KEY=your_base64_private_key_here
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
SUI_NETWORK=testnet
```

### 2. Hedera Testnet Setup

#### Create Hedera Account
1. Go to [Hedera Portal](https://portal.hedera.com/)
2. Create testnet account
3. Fund with test HBAR from faucet
4. Get your Account ID and Private Key

#### Environment Variables for Hedera
Add to your `.env` file:
```env
# Hedera Configuration
HEDERA_OPERATOR_ID=0.0.your_account_id
HEDERA_OPERATOR_KEY=your_private_key_here
HEDERA_NETWORK=testnet
```

## Complete .env File Example

Create a `.env` file in your project root:

```env
# Sui Testnet Configuration
SUI_PRIVATE_KEY=suiprivkey1qq...
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
SUI_NETWORK=testnet

# Hedera Testnet Configuration
HEDERA_OPERATOR_ID=0.0.123456
HEDERA_OPERATOR_KEY=302e020100300506032b657004220420...
HEDERA_NETWORK=testnet

# Optional: Custom RPC endpoints
# SUI_RPC_URL=https://your-custom-sui-rpc.com
# HEDERA_MIRROR_NODE=https://testnet.mirrornode.hedera.com
```

## Installation Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Build TypeScript
```bash
npm run build
```

### 3. Verify Blockchain Connections
```bash
# Test Sui connection
node -e "const { SuiAdapter } = require('./dist/adapters/SuiAdapter'); const adapter = new SuiAdapter({ network: 'testnet', privateKey: process.env.SUI_PRIVATE_KEY }, console); adapter.connect().then(() => console.log('Sui connected!')).catch(console.error);"

# Test Hedera connection
node -e "const { HederaAdapter } = require('./dist/adapters/HederaAdapter'); const adapter = new HederaAdapter({ network: 'testnet', operatorId: process.env.HEDERA_OPERATOR_ID, operatorKey: process.env.HEDERA_OPERATOR_KEY }, console); adapter.connect().then(() => console.log('Hedera connected!')).catch(console.error);"
```

### 4. Run Real Blockchain Demo
```bash
node real-blockchain-demo.js
```

## Troubleshooting

### Common Issues

#### 1. "SUI_PRIVATE_KEY not found"
- Make sure your `.env` file is in the project root
- Verify the private key format (should be base64 encoded)
- Check that you're using the correct key from `sui keytool export`

#### 2. "Insufficient funds"
- Get testnet tokens from Sui faucet: `sui client faucet`
- Get testnet HBAR from Hedera faucet
- Wait for transactions to confirm before retrying

#### 3. "Network connection failed"
- Check your internet connection
- Verify RPC URLs are correct
- Try using default RPC endpoints

#### 4. "Invalid account ID"
- Hedera account ID format: `0.0.123456`
- Make sure account exists on testnet
- Verify private key matches the account

### Debug Mode

Enable debug logging:
```env
DEBUG=finp2p:*
LOG_LEVEL=debug
```

### Network Status

Check network status:
- [Sui Status](https://status.sui.io/)
- [Hedera Status](https://status.hedera.com/)

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit private keys to version control**
2. **Use testnet only for development**
3. **Rotate keys regularly**
4. **Use environment variables for sensitive data**
5. **Consider using hardware wallets for mainnet**

## What the Real Demo Does

Unlike the mock demo, this real blockchain demo:

✅ **Actually connects to Sui and Hedera testnets**
✅ **Creates real assets on both blockchains**
✅ **Executes real transactions with gas fees**
✅ **Provides real transaction hashes**
✅ **Can be verified on blockchain explorers**
✅ **Shows actual network latency and costs**
✅ **Demonstrates real atomic swaps**

## Expected Output

When successful, you'll see:
- Real transaction hashes
- Links to blockchain explorers
- Actual gas costs
- Real network timing
- Verifiable on-chain state changes

## Next Steps

1. **Monitor transactions** on blockchain explorers
2. **Analyze performance** metrics
3. **Test edge cases** (timeouts, failures)
4. **Scale testing** with multiple transfers
5. **Deploy to mainnet** (with proper security)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify your environment setup
3. Test individual blockchain connections
4. Review the logs for specific error messages