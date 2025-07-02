import { SuiAdapter } from '../src/adapters/SuiAdapter';
import { HederaAdapter } from '../src/adapters/HederaAdapter';
import { FinP2PRouter } from '../src/adapters/FinP2PRouter';
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log('Starting cross-chain transfer demo...');

    // Load configs
    const suiConfig = JSON.parse(await fs.readFile(path.resolve(__dirname, '../config/sui-config.json'), 'utf-8'));
    const hederaConfig = JSON.parse(await fs.readFile(path.resolve(__dirname, '../config/hedera-config.json'), 'utf-8'));

    // Initialize adapters
    const logger = { info: console.log, error: console.error, warn: console.warn, debug: console.log };
    const suiAdapter = new SuiAdapter(suiConfig, logger as any);
    const hederaAdapter = new HederaAdapter(hederaConfig, logger as any);
    const router = new FinP2PRouter(suiAdapter, hederaAdapter, logger as any);

    // Connect adapters
    await suiAdapter.connect();
    await hederaAdapter.connect();
    await router.connect();

    console.log('Adapters connected.');

    const amount = '100000000'; // 1 SUI
    const recipient = process.env.HEDERA_TREASURY_ID || '';

    console.log(`Initiating transfer of ${amount} from Sui to Hedera recipient ${recipient}`);

    const startTime = Date.now();

    // Initiate the swap
    const swapId = await router.initiateSwap('SUI', 'HEDERA', 'SUI', 'SUI', parseInt(amount));

    console.log(`Swap initiated with ID: ${swapId}`);

    // Listen for completion
    return new Promise<void>((resolve, reject) => {
        router.on('swapCompleted', (completedSwapId) => {
            if (completedSwapId === swapId) {
                const endTime = Date.now();
                const duration = (endTime - startTime) / 1000;
                console.log(`Swap ${swapId} completed successfully in ${duration} seconds.`);
                generatePerformanceReport(duration);
                resolve(undefined);
            }
        });

        router.on('swapFailed', (failedSwapId) => {
            if (failedSwapId === swapId) {
                console.error(`Swap ${swapId} failed.`);
                reject(new Error('Swap failed'));
            }
        });
    });
}

function generatePerformanceReport(duration: number) {
    const report = {
        test: 'Cross-Chain Transfer: SUI to HEDERA',
        timestamp: new Date().toISOString(),
        durationSeconds: duration,
        // In a real scenario, you would collect more detailed metrics
        metrics: {
            latency: duration,
            suiGas: 'N/A',
            hederaGas: 'N/A',
            redisThroughput: 'N/A',
        }
    };

    fs.writeFile(path.resolve(__dirname, `../reports/performance-report-${Date.now()}.json`), JSON.stringify(report, null, 2));
    console.log('Performance report generated.');
}

main().catch(console.error).finally(() => process.exit(0));