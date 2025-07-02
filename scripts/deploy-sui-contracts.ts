import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
    const privateKey = process.env.SUI_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error('SUI_PRIVATE_KEY environment variable not set');
    }
    const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(privateKey, 'hex'));

    console.log('Deploying Sui contracts...');

    // This is a placeholder for your actual Move contract path
    const contractPath = path.resolve(__dirname, '../sui_contracts/asset_lock');

    // Compile the contract
    const buildOutput = execSync(`sui move build --path ${contractPath} --json`, { encoding: 'utf-8' });
    const compiledModules = JSON.parse(buildOutput).modules;

    // Create a new transaction
    const tx = new Transaction();
    const [upgradeCap] = tx.publish({ modules: compiledModules, dependencies: [] });
    tx.transferObjects([upgradeCap], keypair.getPublicKey().toSuiAddress());

    // Sign and execute the transaction
    const result = await suiClient.signAndExecuteTransaction({ 
        signer: keypair, 
        transaction: tx,
        options: {
            showEffects: true,
        }
    });

    const packageId = result.effects?.created?.find(c => c.owner === 'Immutable')?.reference.objectId;

    if (!packageId) {
        throw new Error('Failed to deploy contract and get package ID.');
    }

    console.log(`Contract deployed with Package ID: ${packageId}`);

    // Save the package ID to a config file for other scripts to use
    const config = { suiPackageId: packageId };
    await fs.writeFile(path.resolve(__dirname, '../config/sui-config.json'), JSON.stringify(config, null, 2));

    console.log('Sui contract deployment complete.');
}

main().catch(console.error);