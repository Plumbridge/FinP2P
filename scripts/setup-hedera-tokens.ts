import {
    Client,
    PrivateKey,
    TokenCreateTransaction,
    TokenType,
    TokenSupplyType,
    AccountId,
} from '@hashgraph/sdk';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';

dotenv.config();

async function main() {
    const operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID || '');
    const operatorKey = PrivateKey.fromString(process.env.HEDERA_OPERATOR_KEY || '');
    const treasuryId = AccountId.fromString(process.env.HEDERA_TREASURY_ID || '');
    const treasuryKey = PrivateKey.fromString(process.env.HEDERA_TREASURY_KEY || '');

    if (!operatorId || !operatorKey || !treasuryId || !treasuryKey) {
        throw new Error('Hedera environment variables not set');
    }

    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    console.log('Creating Hedera wrapped asset token...');

    const tokenCreateTx = await new TokenCreateTransaction()
        .setTokenName('Wrapped SUI')
        .setTokenSymbol('WSUI')
        .setTokenType(TokenType.FungibleCommon)
        .setDecimals(8)
        .setInitialSupply(0) // No initial supply, will be minted on demand
        .setTreasuryAccountId(treasuryId)
        .setSupplyType(TokenSupplyType.Infinite)
        .setSupplyKey(operatorKey.publicKey)
        .freezeWith(client);

    const tokenCreateSign = await tokenCreateTx.sign(treasuryKey);
    const txResponse = await tokenCreateSign.execute(client);
    const receipt = await txResponse.getReceipt(client);

    const tokenId = receipt.tokenId;
    if (!tokenId) {
        throw new Error('Failed to create Hedera token.');
    }

    console.log(`Token created with ID: ${tokenId}`);

    const config = { hederaTokenId: tokenId.toString() };
    await fs.writeFile(path.resolve(__dirname, '../config/hedera-config.json'), JSON.stringify(config, null, 2));

    console.log('Hedera token setup complete.');
}

main().catch(console.error);