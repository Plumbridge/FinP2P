import { SuiAdapter, HederaAdapter, FinP2PRouter } from '../../src/adapters';
import winston from 'winston';
import Docker from 'dockerode';

describe('Cross-Chain Transfer Integration Test', () => {
  let suiAdapter: SuiAdapter;
  let hederaAdapter: HederaAdapter;
  let router: FinP2PRouter;
  let docker: Docker;
  let redisContainer: Docker.Container;

  const logger = winston.createLogger({
    transports: [new winston.transports.Console()],
  });

  beforeAll(async () => {
    // Start Redis container
    docker = new Docker();
    redisContainer = await docker.createContainer({
      Image: 'redis:latest',
      HostConfig: { PortBindings: { '6379/tcp': [{ HostPort: '6379' }] } },
    });
    await redisContainer.start();
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for Redis to start

    // Initialize adapters and router
    const suiConfig = { network: 'testnet' as const, rpcUrl: '', privateKey: '', packageId: '' };
    const hederaConfig = { operatorId: '', operatorKey: '', treasuryId: '', treasuryKey: '', network: 'testnet' as const };
    
    suiAdapter = new SuiAdapter(suiConfig, logger);
    hederaAdapter = new HederaAdapter(hederaConfig, logger);
    router = new FinP2PRouter(suiAdapter, hederaAdapter, logger);

    await suiAdapter.connect();
    await hederaAdapter.connect();
    await router.connect();

    // Event listeners for inter-adapter communication
    router.on('lockAsset', (job) => suiAdapter.lockAsset('account', job.fromAsset, BigInt(job.amount)));
    suiAdapter.on('AssetLocked', (event) => router.handleAssetLocked(event));
    router.on('mintToken', (job) => hederaAdapter.mintToken(job.toAsset, job.amount)); // Pass the asset and amount
    hederaAdapter.on('MintCompleted', (event) => router.handleHederaMintCompleted(event));
  }, 60000);

  afterAll(async () => {
    await redisContainer.stop();
    await redisContainer.remove();
    await suiAdapter.disconnect();
    await hederaAdapter.disconnect();
    await router.disconnect();
  });

  test('should perform a successful end-to-end transfer from Sui to Hedera', async () => {
    const fromAsset = 'SUI_MOCK_ASSET';
    const toAsset = 'HEDERA_MOCK_ASSET';
    const amount = 100;

    const startTime = Date.now();

    const transferId = await router.initiateSwap('sui', 'hedera', fromAsset, toAsset, amount);
    
    const result = await new Promise((resolve) => {
      router.on('SwapCompleted', (data) => {
        if (data.jobId === transferId) {
          resolve(data);
        }
      });
    });

    const endTime = Date.now();
    const latency = endTime - startTime;

    console.log(`End-to-end latency: ${latency}ms`);

    // Verify balances
    // const suiBalance = await suiAdapter.getBalance('sui_account', fromAsset);
    // const hederaBalance = await hederaAdapter.getBalance('hedera_account', toAsset);
    // expect(suiBalance).toBe('some_value');
    // expect(hederaBalance).toBe('some_value');

    expect(transferId).toBeDefined();
  }, 30000);

  test('should handle rollback when Hedera minting fails', async () => {
    jest.spyOn(hederaAdapter, 'mintToken').mockRejectedValue(new Error('Minting failed'));

    const fromAsset = 'SUI_MOCK_ASSET_FAIL';
    const toAsset = 'HEDERA_MOCK_ASSET_FAIL';
    const amount = 50;

    const transferId = await router.initiateSwap('sui', 'hedera', fromAsset, toAsset, amount);
    
    const result = await new Promise<any>((resolve) => {
      router.on('SwapRolledBack', (data) => {
        if (data.jobId === transferId) {
          resolve(data);
        }
      });
    });

    expect(result).toBeDefined();
    expect((result as any).reason).toContain('Minting failed');
  });
});