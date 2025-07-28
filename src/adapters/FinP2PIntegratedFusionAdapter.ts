import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import { Logger } from 'winston';
import { FinP2PSDKRouter } from '../router/FinP2PSDKRouter';

// Fusion Adapter v0.5 Types (from Quant Network specification)
export interface FusionLocation {
  technology: string;
  network: string;
}

export interface FusionFeeInfo {
  unit: string;
  amount: string;
}

export interface FusionParameter {
  name?: string;
  type: string;
  value: string | number | boolean | object | any[];
}

export interface FusionTransferOrigin {
  originId: string; // Will be FinID in our implementation
}

export interface FusionTransferDestination {
  destinationId: string; // Will be FinID in our implementation
  totalPaymentAmount?: FusionFeeInfo;
  nftTokenId?: string;
}

export interface FusionTransferProposal {
  transferType: 'nativeTokenTransfer' | 'fungibleTokenTransfer' | 'nonFungibleTokenTransfer';
  assetId?: string;
  origins: FusionTransferOrigin[];
  destinations: FusionTransferDestination[];
  message?: string;
  feePayers?: string[];
}

export interface FusionSmartContractWriteProposal {
  callerAccountId: string; // Will be FinID in our implementation
  smartContractId: string;
  functionName: string;
  inputParameters: FusionParameter[];
  outputParameters: FusionParameter[];
  isStateMutabilityPayable?: boolean;
  feePayers?: string[];
  message?: string;
}

export interface FusionSmartContractDeployProposal {
  deployerAccountId: string; // Will be FinID in our implementation
  bytecodeToDeploy: string;
  constructorParameters: FusionParameter[];
  feePayers?: string[];
  message?: string;
}

export interface FusionProposalRequest {
  location: FusionLocation;
  nodeToConnect?: string;
  proposalDetails: FusionTransferProposal | FusionSmartContractWriteProposal | FusionSmartContractDeployProposal;
}

export interface FusionEIP155 {
  chainId: number;
  nonce: number;
  gasPrice: string;
  gas: string;
  to: string;
  value: string;
  data: string;
}

export interface FusionEIP1559 {
  chainId: number;
  nonce: number;
  gas: string;
  maxPriorityFeePerGas: string;
  maxFeePerGas: string;
  to: string;
  value: string;
  data: string;
  hardfork: string;
}

export interface FusionProposalResponse {
  dltFee: FusionFeeInfo;
  nativeData: FusionEIP155 | FusionEIP1559;
}

export interface FusionStatus {
  message: string;
  txHash?: string;
  value: 'pending' | 'success' | 'failed';
  timestamp: string;
}

export interface FusionExecuteRequest {
  location: FusionLocation;
  nodeToConnect?: string;
  signedTransaction: string;
}

export interface FusionExecuteResponse {
  status: FusionStatus;
}

// FinP2P Integration Configuration
export interface FinP2PIntegratedFusionConfig {
  // EVM Network Configuration
  networks: {
    [chainId: number]: {
      name: string;
      rpcUrl: string;
      chainId: number;
      nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
      };
      blockExplorer?: string;
    };
  };
  
  // FinP2P Integration
  finp2pRouter: FinP2PSDKRouter;
  
  // Optional: Default gas settings
  defaultGasLimit?: string;
  defaultMaxPriorityFeePerGas?: string;
  defaultMaxFeePerGas?: string;
  
  // Optional: Transaction monitoring
  enableTransactionMonitoring?: boolean;
  transactionTimeoutMs?: number;
}

/**
 * FinP2P-Integrated Fusion Adapter
 * 
 * This adapter implements the Quant Network Fusion v0.5 specification
 * while integrating with FinP2P for:
 * - FinID resolution (user-friendly addresses)
 * - Cross-chain atomic swap coordination
 * - Ownership tracking and verification
 * 
 * Architecture: Fusion API → FinP2P Router → EVM Networks
 * 
 * Key Features:
 * - Proposal-based workflow (create → sign → execute)
 * - FinID to wallet address resolution
 * - EVM transaction format support (EIP155, EIP1559)
 * - Cross-chain atomic swap integration
 * - Real-time transaction monitoring
 */
export class FinP2PIntegratedFusionAdapter extends EventEmitter {
  private config: FinP2PIntegratedFusionConfig;
  private logger: Logger;
  private connected: boolean = false;
  private providers: Map<number, ethers.Provider> = new Map();
  private signers: Map<number, ethers.Wallet> = new Map();
  private activeTransactions: Map<string, any> = new Map();
  private transactionMonitoring: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: FinP2PIntegratedFusionConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;

    this.logger.info('🔗 FinP2P-Integrated Fusion Adapter initialized', {
      supportedNetworks: Object.keys(config.networks).length,
      finp2pIntegration: 'enabled',
      fusionSpecVersion: 'v0.5',
      crossChainSupport: 'enabled'
    });

    // Listen for atomic swap events from FinP2P router
    this.setupAtomicSwapListeners();
  }

  /**
   * Connect to all configured EVM networks
   */
  async connect(): Promise<void> {
    if (this.connected) {
      this.logger.warn('Already connected to Fusion networks');
      return;
    }

    try {
      this.logger.info('🔌 Connecting to EVM networks for Fusion adapter...');

      // Initialize providers for each network
      for (const [chainId, networkConfig] of Object.entries(this.config.networks)) {
        const chainIdNum = parseInt(chainId);
        
        // Create provider
        const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
        this.providers.set(chainIdNum, provider);

        // Test connection
        const blockNumber = await provider.getBlockNumber();
        
        this.logger.info(`✅ Connected to ${networkConfig.name}`, {
          chainId: chainIdNum,
          rpcUrl: networkConfig.rpcUrl,
          blockNumber,
          nativeCurrency: networkConfig.nativeCurrency.symbol
        });
      }

      this.connected = true;
      this.logger.info('✅ Fusion adapter connected to all networks', {
        networkCount: this.providers.size,
        networks: Array.from(this.providers.keys())
      });

      this.emit('connected');
    } catch (error) {
      this.logger.error('❌ Failed to connect to Fusion networks:', error);
      throw error;
    }
  }

  /**
   * Create a transfer proposal (Fusion v0.5 spec)
   * Enhanced with FinP2P FinID resolution
   */
  async createTransferProposal(request: FusionProposalRequest): Promise<FusionProposalResponse> {
    if (!this.connected) {
      throw new Error('Not connected to Fusion networks');
    }

    try {
      const transferProposal = request.proposalDetails as FusionTransferProposal;
      const location = request.location;
      
      this.logger.info('🔄 Creating Fusion transfer proposal with FinP2P integration', {
        transferType: transferProposal.transferType,
        origins: transferProposal.origins.map(o => o.originId),
        destinations: transferProposal.destinations.map(d => d.destinationId),
        location: `${location.technology} ${location.network}`,
        finp2pIntegration: 'enabled'
      });

      // Step 1: Resolve FinIDs to wallet addresses via FinP2P
      const resolvedOrigins = await Promise.all(
        transferProposal.origins.map(async (origin) => {
          const walletAddress = await this.resolveFinIdToAddress(origin.originId, location);
          return { ...origin, walletAddress };
        })
      );

      const resolvedDestinations = await Promise.all(
        transferProposal.destinations.map(async (destination) => {
          const walletAddress = await this.resolveFinIdToAddress(destination.destinationId, location);
          return { ...destination, walletAddress };
        })
      );

      this.logger.info('🔍 FinID resolution completed', {
        origins: resolvedOrigins.map(o => `${o.originId} → ${o.walletAddress.substring(0, 10)}...`),
        destinations: resolvedDestinations.map(d => `${d.destinationId} → ${d.walletAddress.substring(0, 10)}...`)
      });

      // Step 2: Get chain ID from location
      const chainId = this.getChainIdFromLocation(location);
      
      const provider = this.providers.get(chainId);
      if (!provider) {
        throw new Error(`Unsupported network: ${location.technology} ${location.network}`);
      }

      // Step 3: Create transaction proposal
      const proposal = await this.buildTransferTransaction(
        chainId,
        provider,
        transferProposal,
        resolvedOrigins,
        resolvedDestinations
      );

      this.logger.info('✅ Fusion transfer proposal created', {
        chainId,
        gasEstimate: proposal.nativeData.gas,
        feeEstimate: proposal.dltFee.amount,
        finp2pIntegration: 'success'
      });

      return proposal;
    } catch (error) {
      this.logger.error('❌ Failed to create Fusion transfer proposal:', error);
      throw error;
    }
  }

  /**
   * Create a smart contract write proposal (Fusion v0.5 spec)
   * Enhanced with FinP2P FinID resolution
   */
  async createSmartContractWriteProposal(request: FusionProposalRequest): Promise<FusionProposalResponse> {
    if (!this.connected) {
      throw new Error('Not connected to Fusion networks');
    }

    try {
      const contractProposal = request.proposalDetails as FusionSmartContractWriteProposal;
      const location = request.location;
      
      this.logger.info('🔄 Creating Fusion smart contract write proposal with FinP2P integration', {
        callerAccountId: contractProposal.callerAccountId,
        smartContractId: contractProposal.smartContractId,
        functionName: contractProposal.functionName,
        location: `${location.technology} ${location.network}`,
        finp2pIntegration: 'enabled'
      });

      // Step 1: Resolve caller FinID to wallet address
      const callerAddress = await this.resolveFinIdToAddress(contractProposal.callerAccountId, location);

      // Step 2: Get chain ID and provider
      const chainId = this.getChainIdFromLocation(location);
      
      const provider = this.providers.get(chainId);
      if (!provider) {
        throw new Error(`Unsupported network: ${location.technology} ${location.network}`);
      }

      // Step 3: Create contract interaction proposal
      const proposal = await this.buildContractWriteTransaction(
        chainId,
        provider,
        contractProposal,
        callerAddress
      );

      this.logger.info('✅ Fusion smart contract write proposal created', {
        chainId,
        callerAddress: callerAddress.substring(0, 10) + '...',
        gasEstimate: proposal.nativeData.gas,
        feeEstimate: proposal.dltFee.amount,
        finp2pIntegration: 'success'
      });

      return proposal;
    } catch (error) {
      this.logger.error('❌ Failed to create Fusion smart contract write proposal:', error);
      throw error;
    }
  }

  /**
   * Create a smart contract deploy proposal (Fusion v0.5 spec)
   * Enhanced with FinP2P FinID resolution
   */
  async createSmartContractDeployProposal(request: FusionProposalRequest): Promise<FusionProposalResponse> {
    if (!this.connected) {
      throw new Error('Not connected to Fusion networks');
    }

    try {
      const deployProposal = request.proposalDetails as FusionSmartContractDeployProposal;
      const location = request.location;
      
      this.logger.info('🔄 Creating Fusion smart contract deploy proposal with FinP2P integration', {
        deployerAccountId: deployProposal.deployerAccountId,
        bytecodeLength: deployProposal.bytecodeToDeploy.length,
        location: `${location.technology} ${location.network}`,
        finp2pIntegration: 'enabled'
      });

      // Step 1: Resolve deployer FinID to wallet address
      const deployerAddress = await this.resolveFinIdToAddress(deployProposal.deployerAccountId, location);

      // Step 2: Get chain ID and provider
      const chainId = this.getChainIdFromLocation(location);
      const provider = this.providers.get(chainId);
      
      if (!provider) {
        throw new Error(`Unsupported network: ${location.technology} ${location.network}`);
      }

      // Step 3: Create contract deployment proposal
      const proposal = await this.buildContractDeployTransaction(
        chainId,
        provider,
        deployProposal,
        deployerAddress
      );

      this.logger.info('✅ Fusion smart contract deploy proposal created', {
        chainId,
        deployerAddress: deployerAddress.substring(0, 10) + '...',
        gasEstimate: proposal.nativeData.gas,
        feeEstimate: proposal.dltFee.amount,
        finp2pIntegration: 'success'
      });

      return proposal;
    } catch (error) {
      this.logger.error('❌ Failed to create Fusion smart contract deploy proposal:', error);
      throw error;
    }
  }

  /**
   * Execute a signed transaction (Fusion v0.5 spec)
   * Enhanced with FinP2P transaction tracking
   */
  async executeTransaction(request: FusionExecuteRequest): Promise<FusionExecuteResponse> {
    if (!this.connected) {
      throw new Error('Not connected to Fusion networks');
    }

    try {
      const location = request.location;
      const signedTx = request.signedTransaction;
      
      this.logger.info('🔄 Executing Fusion transaction with FinP2P integration', {
        location: `${location.technology} ${location.network}`,
        signedTxLength: signedTx.length,
        finp2pIntegration: 'enabled'
      });

      // Step 1: Get chain ID and provider
      const chainId = this.getChainIdFromLocation(location);
      
      const provider = this.providers.get(chainId);
      
      if (!provider) {
        throw new Error(`Unsupported network: ${location.technology} ${location.network}`);
      }

      // Step 3: Execute transaction
      const txResponse = await provider.broadcastTransaction(signedTx);
      const txHash = txResponse.hash;

      this.logger.info('✅ Fusion transaction executed', {
        chainId,
        txHash,
        finp2pIntegration: 'success'
      });

      // Step 4: Start transaction monitoring if enabled
      if (this.config.enableTransactionMonitoring) {
        this.startTransactionMonitoring(txHash, provider, chainId);
      }

      // Step 5: Update FinP2P ownership if this was a transfer
      await this.updateFinP2POwnershipIfNeeded(txHash, location);

      const status: FusionStatus = {
        message: 'Transaction submitted successfully',
        txHash,
        value: 'pending',
        timestamp: new Date().toISOString()
      };

      return { status };
    } catch (error) {
      this.logger.error('❌ Failed to execute Fusion transaction:', error);
      
      const status: FusionStatus = {
        message: `Transaction failed: ${(error as Error).message}`,
        value: 'failed',
        timestamp: new Date().toISOString()
      };

      return { status };
    }
  }

  /**
   * Execute cross-chain atomic swap using FinP2P coordination
   * This extends Fusion's single-chain capabilities with cross-chain atomic swaps
   */
  async executeCrossChainAtomicSwap(swapRequest: {
    initiatorFinId: string;
    responderFinId: string;
    initiatorAsset: { chain: string; assetId: string; amount: string; location: FusionLocation };
    responderAsset: { chain: string; assetId: string; amount: string; location: FusionLocation };
  }): Promise<{ swapId: string; status: string }> {
    try {
      this.logger.info('🔄 Executing cross-chain atomic swap via Fusion + FinP2P', {
        initiator: swapRequest.initiatorFinId,
        responder: swapRequest.responderFinId,
        initiatorAsset: swapRequest.initiatorAsset,
        responderAsset: swapRequest.responderAsset,
        integration: 'fusion-finp2p-cross-chain'
      });

      // Step 1: Create atomic swap through FinP2P router
      const swapResponse = await this.config.finp2pRouter.executeAtomicSwap({
        initiatorFinId: swapRequest.initiatorFinId,
        responderFinId: swapRequest.responderFinId,
        initiatorAsset: {
          chain: swapRequest.initiatorAsset.chain,
          assetId: swapRequest.initiatorAsset.assetId,
          amount: swapRequest.initiatorAsset.amount
        },
        responderAsset: {
          chain: swapRequest.responderAsset.chain,
          assetId: swapRequest.responderAsset.assetId,
          amount: swapRequest.responderAsset.amount
        },
        timeoutBlocks: 100 // Default timeout of 100 blocks
      });

      this.logger.info('✅ Cross-chain atomic swap initiated via Fusion + FinP2P', {
        swapId: swapResponse.swapId,
        status: swapResponse.status,
        integration: 'fusion-finp2p-cross-chain'
      });

      return {
        swapId: swapResponse.swapId,
        status: swapResponse.status
      };
    } catch (error) {
      this.logger.error('❌ Failed to execute cross-chain atomic swap:', error);
      throw error;
    }
  }

  // Private helper methods

  private setupAtomicSwapListeners(): void {
    // Listen for atomic swap events from FinP2P router
    this.config.finp2pRouter.on('atomicSwapInitiated', (swapData: any) => {
      this.logger.info('🎯 Fusion adapter received atomic swap event', {
        swapId: swapData.swapId,
        event: 'atomicSwapInitiated',
        integration: 'fusion-finp2p'
      });
    });

    this.config.finp2pRouter.on('atomicSwapCompleted', (swapData: any) => {
      this.logger.info('✅ Fusion adapter received atomic swap completion', {
        swapId: swapData.swapId,
        event: 'atomicSwapCompleted',
        integration: 'fusion-finp2p'
      });
    });
  }

  private async resolveFinIdToAddress(finId: string, location: FusionLocation): Promise<string> {
    try {
      // Map Fusion location to FinP2P chain type
      let chainType = 'ethereum'; // Default for EVM
      
      // Map specific technologies if needed
      if (location.technology === 'polygon') chainType = 'polygon';
      if (location.technology === 'binance') chainType = 'bsc';
      if (location.technology === 'arbitrum') chainType = 'arbitrum';

      const walletAddress = await this.config.finp2pRouter.getWalletAddress(finId, chainType);
      
      if (!walletAddress) {
        throw new Error(`No wallet address found for FinID: ${finId} on ${location.technology} ${location.network}`);
      }

      this.logger.debug('🔍 FinID resolved via FinP2P', {
        finId,
        location: `${location.technology} ${location.network}`,
        chainType,
        walletAddress: `${walletAddress.substring(0, 10)}...`
      });

      return walletAddress;
    } catch (error) {
      this.logger.error('❌ Failed to resolve FinID via FinP2P:', error);
      throw error;
    }
  }

  private getChainIdFromLocation(location: FusionLocation): number {
    // Find matching network configuration
    for (const [chainId, networkConfig] of Object.entries(this.config.networks)) {
      const networkNameLower = networkConfig.name.toLowerCase();
      const technologyLower = location.technology.toLowerCase();
      const networkLower = location.network.toLowerCase();
      
      // Check if network name contains both technology and network parts
      if (networkNameLower.includes(technologyLower) && networkNameLower.includes(networkLower)) {
        return parseInt(chainId);
      }
    }
    
    // If no match found, try to find by technology only for common cases
    for (const [chainId, networkConfig] of Object.entries(this.config.networks)) {
      const networkNameLower = networkConfig.name.toLowerCase();
      const technologyLower = location.technology.toLowerCase();
      
      if (networkNameLower.includes(technologyLower)) {
        this.logger.warn(`Network match found by technology only: ${location.technology} ${location.network} -> ${networkConfig.name}`);
        return parseInt(chainId);
      }
    }
    
    throw new Error(`No network configuration found for: ${location.technology} ${location.network}`);
  }

  private async buildTransferTransaction(
    chainId: number,
    provider: ethers.Provider,
    transferProposal: FusionTransferProposal,
    resolvedOrigins: any[],
    resolvedDestinations: any[]
  ): Promise<FusionProposalResponse> {
    // For simplicity, we'll use the first origin and destination
    const origin = resolvedOrigins[0];
    const destination = resolvedDestinations[0];
    
    // Get nonce
    const nonce = await provider.getTransactionCount(origin.walletAddress);
    
    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      from: origin.walletAddress,
      to: destination.walletAddress,
      value: destination.totalPaymentAmount?.amount || '0'
    });

    // Get gas price
    const feeData = await provider.getFeeData();
    
    // Build transaction
    const transaction: FusionEIP1559 = {
      chainId,
      nonce,
      gas: gasEstimate.toString(),
      maxPriorityFeePerGas: this.config.defaultMaxPriorityFeePerGas || feeData.maxPriorityFeePerGas?.toString() || '2000000000',
      maxFeePerGas: this.config.defaultMaxFeePerGas || feeData.maxFeePerGas?.toString() || '20000000000',
      to: destination.walletAddress,
      value: destination.totalPaymentAmount?.amount || '0',
      data: '0x',
      hardfork: 'london'
    };

    return {
      dltFee: {
        unit: this.config.networks[chainId].nativeCurrency.symbol,
        amount: (BigInt(transaction.maxFeePerGas) * BigInt(transaction.gas)).toString()
      },
      nativeData: transaction
    };
  }

  private async buildContractWriteTransaction(
    chainId: number,
    provider: ethers.Provider,
    contractProposal: FusionSmartContractWriteProposal,
    callerAddress: string
  ): Promise<FusionProposalResponse> {
    // Get nonce
    const nonce = await provider.getTransactionCount(callerAddress);
    
    // Build function call data
    const iface = new ethers.Interface([
      `function ${contractProposal.functionName}(${contractProposal.inputParameters.map(p => p.type).join(',')})`
    ]);
    
    const functionData = iface.encodeFunctionData(
      contractProposal.functionName,
      contractProposal.inputParameters.map(p => p.value)
    );

    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      from: callerAddress,
      to: contractProposal.smartContractId,
      data: functionData
    });

    // Get gas price
    const feeData = await provider.getFeeData();
    
    // Build transaction
    const transaction: FusionEIP1559 = {
      chainId,
      nonce,
      gas: gasEstimate.toString(),
      maxPriorityFeePerGas: this.config.defaultMaxPriorityFeePerGas || feeData.maxPriorityFeePerGas?.toString() || '2000000000',
      maxFeePerGas: this.config.defaultMaxFeePerGas || feeData.maxFeePerGas?.toString() || '20000000000',
      to: contractProposal.smartContractId,
      value: contractProposal.isStateMutabilityPayable ? '0' : '0',
      data: functionData,
      hardfork: 'london'
    };

    return {
      dltFee: {
        unit: this.config.networks[chainId].nativeCurrency.symbol,
        amount: (BigInt(transaction.maxFeePerGas) * BigInt(transaction.gas)).toString()
      },
      nativeData: transaction
    };
  }

  private async buildContractDeployTransaction(
    chainId: number,
    provider: ethers.Provider,
    deployProposal: FusionSmartContractDeployProposal,
    deployerAddress: string
  ): Promise<FusionProposalResponse> {
    // Get nonce
    const nonce = await provider.getTransactionCount(deployerAddress);
    
    // Build constructor data if parameters provided
    let constructorData = '0x';
    if (deployProposal.constructorParameters.length > 0) {
      // This would need proper ABI encoding based on constructor parameters
      // For now, we'll use a simplified approach
      constructorData = '0x'; // Placeholder
    }

    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      from: deployerAddress,
      data: deployProposal.bytecodeToDeploy + constructorData.slice(2)
    });

    // Get gas price
    const feeData = await provider.getFeeData();
    
    // Build transaction
    const transaction: FusionEIP1559 = {
      chainId,
      nonce,
      gas: gasEstimate.toString(),
      maxPriorityFeePerGas: this.config.defaultMaxPriorityFeePerGas || feeData.maxPriorityFeePerGas?.toString() || '2000000000',
      maxFeePerGas: this.config.defaultMaxFeePerGas || feeData.maxFeePerGas?.toString() || '20000000000',
      to: '0x', // Contract deployment
      value: '0',
      data: deployProposal.bytecodeToDeploy + constructorData.slice(2),
      hardfork: 'london'
    };

    return {
      dltFee: {
        unit: this.config.networks[chainId].nativeCurrency.symbol,
        amount: (BigInt(transaction.maxFeePerGas) * BigInt(transaction.gas)).toString()
      },
      nativeData: transaction
    };
  }

  private startTransactionMonitoring(txHash: string, provider: ethers.Provider, chainId: number): void {
    const timeout = this.config.transactionTimeoutMs || 300000; // 5 minutes default
    
    const monitoringTimeout = setTimeout(async () => {
      try {
        const receipt = await provider.getTransactionReceipt(txHash);
        
        if (receipt) {
          const status: FusionStatus = {
            message: receipt.status === 1 ? 'Transaction successful' : 'Transaction failed',
            txHash,
            value: receipt.status === 1 ? 'success' : 'failed',
            timestamp: new Date().toISOString()
          };

          this.emit('transactionStatus', { txHash, status, chainId });
          this.transactionMonitoring.delete(txHash);
        }
      } catch (error) {
        this.logger.warn('⚠️ Transaction monitoring failed:', error);
      }
    }, timeout);

    this.transactionMonitoring.set(txHash, monitoringTimeout);
  }

  private async updateFinP2POwnershipIfNeeded(txHash: string, location: FusionLocation): Promise<void> {
    try {
      // This would update FinP2P ownership records based on the transaction
      // Implementation depends on specific business logic
      this.logger.debug('📝 FinP2P ownership update triggered', {
        txHash,
        location: `${location.technology} ${location.network}`,
        note: 'Ownership update logic would be implemented here'
      });
    } catch (error) {
      this.logger.warn('⚠️ Failed to update FinP2P ownership:', error);
    }
  }

  // Public utility methods

  public isConnected(): boolean {
    return this.connected;
  }

  public getSupportedNetworks(): number[] {
    return Array.from(this.providers.keys());
  }

  public async disconnect(): Promise<void> {
    // Clear monitoring timeouts
    for (const timeout of this.transactionMonitoring.values()) {
      clearTimeout(timeout);
    }
    this.transactionMonitoring.clear();

    this.connected = false;
    this.logger.info('🔌 Fusion adapter disconnected');
  }
} 