import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { requestSuiFromFaucetV0, getFaucetHost } from '@mysten/sui/faucet';
import { AccountId, Client } from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

async function fundSuiAccount() {
    console.log('Funding Sui account...');
    const privateKey = process.env.SUI_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error('SUI_PRIVATE_KEY environment variable not set');
    }
    const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(privateKey, 'hex'));
    const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
    const address = keypair.getPublicKey().toSuiAddress();

    await requestSuiFromFaucetV0({
        host: getFaucetHost('testnet'),
        recipient: address,
    });

    const balance = await suiClient.getBalance({ owner: address });
    console.log(`Sui account ${address} funded. Current balance: ${balance.totalBalance}`);
}

async function fundHederaAccount() {
    console.log('Funding Hedera account...');
    const accountId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID || '');
    // Hedera testnet accounts are typically funded via the Hedera portal
    // This is a placeholder for checking the balance
    const client = Client.forTestnet();
    // In a real scenario, you might use an API to request funds if available
    // For now, we just log the instructions.
    console.log(`Please fund Hedera account ${accountId} through the official Hedera portal.`);
}

async function main() {
    await fundSuiAccount();
    await fundHederaAccount();
    console.log('Test account funding process complete.');
}

main().catch(console.error);