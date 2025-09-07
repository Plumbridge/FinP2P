import { ethers } from 'ethers';
import { HTLCContract, HTLCData, HTLCResult } from './HTLCContract';

export interface AtomicSwapRequest {
  initiator: string;
  responder: string;
  amount1: string;
  amount2: string;
  chain1: string;
  chain2: string;
  token1: string;
  token2: string;
  timelock1: number; // blocks
  timelock2: number; // blocks
  secret?: string; // if not provided, will be generated
}

export interface AtomicSwapState {
  swapId: string;
  secret: string;
  secretHash: string;
  initiator: string;
  responder: string;
  amount1: string;
  amount2: string;
  chain1: string;
  chain2: string;
  token1: string;
  token2: string;
  timelock1: number;
  timelock2: number;
  status: 'pending' | 'initiated' | 'responded' | 'completed' | 'expired' | 'failed';
  timestamp: number;
  expiry: number;
  // HTLC contract details
  htlc1?: {
    contractAddress: string;
    htlcId: string;
    transactionHash: string;
    blockNumber: number;
  };
  htlc2?: {
    contractAddress: string;
    htlcId: string;
    transactionHash: string;
    blockNumber: number;
  };
  // Execution results
  claim1TxHash?: string;
  claim2TxHash?: string;
  refund1TxHash?: string;
  refund2TxHash?: string;
}

/**
 * Real Atomic Swap Coordinator using actual HTLC contracts
 * This implements true cross-chain atomic swaps with hash time-locked contracts
 */
export class AtomicSwapCoordinator {
  private swaps: Map<string, AtomicSwapState> = new Map();
  private htlcContracts: Map<string, HTLCContract> = new Map();
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();
  private signers: Map<string, ethers.Wallet> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize providers for supported chains
    const chainProviders = {
      'ethereum-sepolia': 'https://rpc.sepolia.org',
      'moonbeam': 'https://rpc.api.moonbase.moonbeam.network',
      'base-sepolia': 'https://sepolia.base.org',
      'arbitrum-sepolia': 'https://sepolia-rollup.arbitrum.io/rpc',
      'avalanche': 'https://api.avax-test.network/ext/bc/C/rpc',
      'binance': 'https://data-seed-prebsc-1-s1.binance.org:8545',
      'fantom': 'https://rpc.testnet.fantom.network',
      'polygon': 'https://rpc.mumbai.maticvigil.com'
    };

    for (const [chain, rpcUrl] of Object.entries(chainProviders)) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        this.providers.set(chain, provider);
        console.log(`✅ Provider initialized for ${chain}: ${rpcUrl}`);
      } catch (error) {
        console.warn(`⚠️  Failed to initialize provider for ${chain}:`, error);
      }
    }
  }

  /**
   * Add signer for a specific chain
   */
  addSigner(chain: string, privateKey: string): void {
    const provider = this.providers.get(chain);
    if (!provider) {
      throw new Error(`Provider not found for chain: ${chain}`);
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    this.signers.set(chain, wallet);
    console.log(`✅ Signer added for ${chain}: ${wallet.address}`);
  }

  /**
   * Deploy HTLC contract on a specific chain
   */
  async deployHTLCContract(chain: string): Promise<string> {
    const provider = this.providers.get(chain);
    const signer = this.signers.get(chain);
    
    if (!provider || !signer) {
      throw new Error(`Provider or signer not found for chain: ${chain}`);
    }

    const htlcContract = new HTLCContract({ provider, signer });
    const result = await htlcContract.deployContract();
    
    this.htlcContracts.set(chain, htlcContract);
    console.log(`✅ HTLC contract deployed on ${chain}: ${result.contractAddress}`);
    
    return result.contractAddress;
  }

  /**
   * Generate cryptographic secret and hash
   */
  generateSecret(): string {
    return '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  hashSecret(secret: string): string {
    return ethers.keccak256(secret);
  }

  /**
   * Initiate atomic swap
   */
  async initiateSwap(request: AtomicSwapRequest): Promise<AtomicSwapState> {
    const swapId = `swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const secret = request.secret || this.generateSecret();
    const secretHash = this.hashSecret(secret);
    const timestamp = Date.now();
    const expiry = timestamp + (Math.max(request.timelock1, request.timelock2) * 12000); // 12 seconds per block

    const swapState: AtomicSwapState = {
      swapId,
      secret,
      secretHash,
      initiator: request.initiator,
      responder: request.responder,
      amount1: request.amount1,
      amount2: request.amount2,
      chain1: request.chain1,
      chain2: request.chain2,
      token1: request.token1,
      token2: request.token2,
      timelock1: request.timelock1,
      timelock2: request.timelock2,
      status: 'pending',
      timestamp,
      expiry
    };

    this.swaps.set(swapId, swapState);

    console.log('🔐 Generated swap secret and hash:');
    console.log(`   Secret: ${secret.substring(0, 20)}...`);
    console.log(`   Hash: ${secretHash.substring(0, 20)}...`);
    console.log(`   Expiry: ${new Date(expiry).toISOString()}`);

    return swapState;
  }

  /**
   * Execute atomic swap with real HTLC contracts
   */
  async executeAtomicSwap(swapId: string): Promise<boolean> {
    const swap = this.swaps.get(swapId);
    if (!swap) {
      throw new Error('Swap not found');
    }

    if (swap.status !== 'pending') {
      throw new Error('Swap already executed or expired');
    }

    if (Date.now() > swap.expiry) {
      swap.status = 'expired';
      throw new Error('Swap expired');
    }

    try {
      console.log('🔄 Executing REAL atomic swap with HTLC contracts...');
      console.log(`   Swap ID: ${swapId}`);
      console.log(`   Route: ${swap.chain1} ↔ ${swap.chain2}`);
      console.log(`   Amount: ${swap.amount1} ${swap.token1} ↔ ${swap.amount2} ${swap.token2}`);

      // Step 1: Create HTLC on chain 1
      console.log(`\n🔒 Step 1: Creating HTLC on ${swap.chain1}...`);
      swap.status = 'initiated';
      
      const htlc1Result = await this.createHTLCOnChain(
        swap.chain1,
        swap.initiator,
        swap.secretHash,
        swap.responder,
        swap.amount1,
        swap.timelock1,
        swap.token1
      );

      swap.htlc1 = {
        contractAddress: htlc1Result.contractAddress,
        htlcId: this.generateHTLCId(swap.chain1, swap.secretHash, swap.responder, swap.amount1),
        transactionHash: htlc1Result.transactionHash,
        blockNumber: htlc1Result.blockNumber
      };

      console.log(`✅ HTLC created on ${swap.chain1}`);
      console.log(`   Contract: ${htlc1Result.contractAddress}`);
      console.log(`   Transaction: ${htlc1Result.transactionHash}`);

      // Step 2: Create HTLC on chain 2
      console.log(`\n🔒 Step 2: Creating HTLC on ${swap.chain2}...`);
      swap.status = 'responded';
      
      const htlc2Result = await this.createHTLCOnChain(
        swap.chain2,
        swap.responder,
        swap.secretHash,
        swap.initiator,
        swap.amount2,
        swap.timelock2,
        swap.token2
      );

      swap.htlc2 = {
        contractAddress: htlc2Result.contractAddress,
        htlcId: this.generateHTLCId(swap.chain2, swap.secretHash, swap.initiator, swap.amount2),
        transactionHash: htlc2Result.transactionHash,
        blockNumber: htlc2Result.blockNumber
      };

      console.log(`✅ HTLC created on ${swap.chain2}`);
      console.log(`   Contract: ${htlc2Result.contractAddress}`);
      console.log(`   Transaction: ${htlc2Result.transactionHash}`);

      // Step 3: Claim HTLCs with secret
      console.log(`\n🔓 Step 3: Claiming HTLCs with secret...`);
      
      // Claim HTLC on chain 1
      const claim1Result = await this.claimHTLCOnChain(
        swap.chain1,
        swap.htlc1.htlcId,
        swap.secret
      );
      swap.claim1TxHash = claim1Result.transactionHash;

      // Claim HTLC on chain 2
      const claim2Result = await this.claimHTLCOnChain(
        swap.chain2,
        swap.htlc2.htlcId,
        swap.secret
      );
      swap.claim2TxHash = claim2Result.transactionHash;

      // Step 4: Swap completed
      console.log(`\n🎉 Step 4: Atomic swap completed!`);
      swap.status = 'completed';
      
      console.log('✅ REAL atomic swap completed successfully with HTLC contracts!');
      console.log('💰 Assets have been transferred between chains');
      console.log(`🔓 Secret revealed: ${swap.secret.substring(0, 20)}...`);

      this.swaps.set(swapId, swap);
      return true;

    } catch (error) {
      console.error('❌ Atomic swap execution failed:', error);
      swap.status = 'failed';
      this.swaps.set(swapId, swap);
      return false;
    }
  }

  /**
   * Create HTLC on specific chain
   */
  private async createHTLCOnChain(
    chain: string,
    sender: string,
    secretHash: string,
    recipient: string,
    amount: string,
    timelock: number,
    token: string
  ): Promise<HTLCResult> {
    const htlcContract = this.htlcContracts.get(chain);
    if (!htlcContract) {
      throw new Error(`HTLC contract not deployed on ${chain}`);
    }

    const htlcData: HTLCData = {
      id: this.generateHTLCId(chain, secretHash, recipient, amount),
      secretHash,
      recipient,
      amount,
      timelock
    };

    // For now, assume native token (ETH/DEV) - in production you'd handle ERC20 tokens
    return await htlcContract.createHTLC(htlcData);
  }

  /**
   * Claim HTLC on specific chain
   */
  private async claimHTLCOnChain(
    chain: string,
    htlcId: string,
    secret: string
  ): Promise<HTLCResult> {
    const htlcContract = this.htlcContracts.get(chain);
    if (!htlcContract) {
      throw new Error(`HTLC contract not deployed on ${chain}`);
    }

    return await htlcContract.claimHTLC(htlcId, secret);
  }

  /**
   * Generate HTLC ID
   */
  private generateHTLCId(chain: string, secretHash: string, recipient: string, amount: string): string {
    const dataString = `${chain}${secretHash}${recipient}${amount}`;
    return ethers.keccak256(ethers.toUtf8Bytes(dataString));
  }

  /**
   * Get swap details
   */
  getSwap(swapId: string): AtomicSwapState | undefined {
    return this.swaps.get(swapId);
  }

  /**
   * Get all swaps
   */
  getAllSwaps(): AtomicSwapState[] {
    return Array.from(this.swaps.values());
  }

  /**
   * Clean up expired swaps
   */
  cleanupExpiredSwaps(): void {
    const now = Date.now();
    const expiredSwaps = Array.from(this.swaps.entries())
      .filter(([_, swap]) => now > swap.expiry && swap.status === 'pending')
      .map(([id, _]) => id);

    for (const swapId of expiredSwaps) {
      const swap = this.swaps.get(swapId);
      if (swap) {
        swap.status = 'expired';
        this.swaps.set(swapId, swap);
        console.log(`⏰ Swap ${swapId} expired`);
      }
    }

    console.log(`🧹 Cleaned up ${expiredSwaps.length} expired swaps`);
  }
}
