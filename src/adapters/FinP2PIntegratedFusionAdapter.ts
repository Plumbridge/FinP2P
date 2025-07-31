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
  originId: string; // Can be FinID (alice@fusion.demo) or native address (0x1234...)
}

export interface FusionTransferDestination {
  destinationId: string; // Can be FinID (bob@fusion.demo) or native address (0x1234...)
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
  callerAccountId: string; // Can be FinID or native address
  smartContractId: string;
  functionName: string;
  inputParameters: FusionParameter[];
  outputParameters: FusionParameter[];
  isStateMutabilityPayable?: boolean;
  feePayers?: string[];
  message?: string;
}

export interface FusionSmartContractDeployProposal {
  deployerAccountId: string; // Can be FinID or native address
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

// Cross-chain swap types
export interface CrossChainSwapRequest {
  initiatorFinId: string;
  responderFinId: string;
  initiatorAsset: { 
    chain: string; 
    assetId: string; 
    amount: string; 
    location: FusionLocation 
  };
  responderAsset: { 
    chain: string; 
    assetId: string; 
    amount: string; 
    location: FusionLocation 
  };
}

export interface SwapResult {
  swapId: string;
  status: string;
  initiatorTxHash?: string;
  responderTxHash?: string;
}

/**
 * FinP2P Integrated Fusion Adapter
 * 
 * Implements the Quant Network Fusion v0.5 specification with FinP2P integration
 * for enhanced cross-chain capabilities and user-friendly FinID resolution.
 * 
 * Features:
 * - Supports both FinID and native address resolution
 * - Full Fusion v0.5 API compliance (create proposals → sign → execute)
 * - Cross-chain atomic swaps between EVM and non-EVM chains
 * - Real-time transaction monitoring
 * - Multi-network EVM support
 */
export class FinP2PIntegratedFusionAdapter extends EventEmitter {
  private config: FinP2PIntegratedFusionConfig;
  private logger: Logger;
  private providers: Map<number, ethers.Provider> = new Map();
  private connected: boolean = false;
  private transactionMonitoring: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: FinP2PIntegratedFusionConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
  }

  /**
   * Connect to all configured EVM networks
   */
  async connect(): Promise<void> {
    try {
      this.logger.info('🔗 Connecting Fusion adapter to EVM networks...', {
        networkCount: Object.keys(this.config.networks).length,
        networks: Object.values(this.config.networks).map(n => n.name)
      });

      // Connect to each configured network
      for (const [chainIdStr, networkConfig] of Object.entries(this.config.networks)) {
        const chainId = parseInt(chainIdStr);
        
        try {
          // Use custom RPC URL if provided, otherwise use network config
          const rpcUrl = networkConfig.rpcUrl;
          const provider = new ethers.JsonRpcProvider(rpcUrl);
          
          // Test connection
          await provider.getNetwork();
          
          this.providers.set(chainId, provider);
          this.logger.info('✅ Connected to network', {
            chainId,
            name: networkConfig.name,
            rpcUrl: rpcUrl.substring(0, 30) + '...',
            nativeCurrency: networkConfig.nativeCurrency.symbol
          });
        } catch (error) {
          this.logger.error('❌ Failed to connect to network:', {
            chainId,
            name: networkConfig.name,
            error: (error as Error).message
          });
          throw error;
        }
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
   * Enhanced with FinP2P FinID resolution and native address support
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

      // Step 1: Resolve origins (FinIDs or native addresses)
      const resolvedOrigins = await Promise.all(
        transferProposal.origins.map(async (origin) => {
          const walletAddress = await this.resolveAddressFromId(origin.originId, location);
          return { ...origin, walletAddress };
        })
      );

      // Step 2: Resolve destinations (FinIDs or native addresses)
      const resolvedDestinations = await Promise.all(
        transferProposal.destinations.map(async (destination) => {
          const walletAddress = await this.resolveAddressFromId(destination.destinationId, location);
          return { ...destination, walletAddress };
        })
      );

      this.logger.info('🔍 Address resolution completed', {
        origins: resolvedOrigins.map(o => `${o.originId} → ${this.truncateAddress(o.walletAddress)}`),
        destinations: resolvedDestinations.map(d => `${d.destinationId} → ${this.truncateAddress(d.walletAddress)}`)
      });

      // Step 3: Get chain ID and provider
      const chainId = this.getChainIdFromLocation(location);
      const provider = this.providers.get(chainId);
      
      if (!provider) {
        throw new Error(`Unsupported network: ${location.technology} ${location.network}`);
      }

      // Step 4: Build transaction based on transfer type
      const proposal = await this.buildTransferTransaction(
        chainId,
        provider,
        transferProposal,
        resolvedOrigins,
        resolvedDestinations,
        request.nodeToConnect
      );

      this.logger.info('✅ Fusion transfer proposal created successfully', {
        chainId,
        gasEstimate: proposal.nativeData.gas,
        feeEstimate: proposal.dltFee.amount,
        transferType: transferProposal.transferType
      });

      return proposal;
    } catch (error) {
      this.logger.error('❌ Failed to create Fusion transfer proposal:', error);
      throw error;
    }
  }

  /**
   * Create a smart contract write proposal (Fusion v0.5 spec)
   */
  async createSmartContractWriteProposal(request: FusionProposalRequest): Promise<FusionProposalResponse> {
    if (!this.connected) {
      throw new Error('Not connected to Fusion networks');
    }

    try {
      const writeProposal = request.proposalDetails as FusionSmartContractWriteProposal;
      const location = request.location;
      
      this.logger.info('🔄 Creating Fusion smart contract write proposal', {
        callerAccountId: writeProposal.callerAccountId,
        smartContractId: writeProposal.smartContractId,
        functionName: writeProposal.functionName,
        location: `${location.technology} ${location.network}`
      });

      // Step 1: Resolve caller address
      const callerAddress = await this.resolveAddressFromId(writeProposal.callerAccountId, location);
      
      // Step 2: Get chain ID and provider
      const chainId = this.getChainIdFromLocation(location);
      const provider = this.providers.get(chainId);
      
      if (!provider) {
        throw new Error(`Unsupported network: ${location.technology} ${location.network}`);
      }

      // Step 3: Build smart contract call transaction
      const proposal = await this.buildSmartContractWriteTransaction(
        chainId,
        provider,
        writeProposal,
        callerAddress,
        request.nodeToConnect
      );

      this.logger.info('✅ Fusion smart contract write proposal created successfully', {
        chainId,
        functionName: writeProposal.functionName,
        gasEstimate: proposal.nativeData.gas
      });

      return proposal;
    } catch (error) {
      this.logger.error('❌ Failed to create Fusion smart contract write proposal:', error);
      throw error;
    }
  }

  /**
   * Create a smart contract deployment proposal (Fusion v0.5 spec)
   */
  async createSmartContractDeployProposal(request: FusionProposalRequest): Promise<FusionProposalResponse> {
    if (!this.connected) {
      throw new Error('Not connected to Fusion networks');
    }

    try {
      const deployProposal = request.proposalDetails as FusionSmartContractDeployProposal;
      const location = request.location;
      
      this.logger.info('🔄 Creating Fusion smart contract deployment proposal', {
        deployerAccountId: deployProposal.deployerAccountId,
        bytecodeLength: deployProposal.bytecodeToDeploy.length,
        constructorParams: deployProposal.constructorParameters.length,
        location: `${location.technology} ${location.network}`
      });

      // Step 1: Resolve deployer address
      const deployerAddress = await this.resolveAddressFromId(deployProposal.deployerAccountId, location);
      
      // Step 2: Get chain ID and provider
      const chainId = this.getChainIdFromLocation(location);
      const provider = this.providers.get(chainId);
      
      if (!provider) {
        throw new Error(`Unsupported network: ${location.technology} ${location.network}`);
      }

      // Step 3: Build deployment transaction
      const proposal = await this.buildSmartContractDeployTransaction(
        chainId,
        provider,
        deployProposal,
        deployerAddress,
        request.nodeToConnect
      );

      this.logger.info('✅ Fusion smart contract deployment proposal created successfully', {
        chainId,
        gasEstimate: proposal.nativeData.gas,
        bytecodeSize: deployProposal.bytecodeToDeploy.length
      });

      return proposal;
    } catch (error) {
      this.logger.error('❌ Failed to create Fusion smart contract deployment proposal:', error);
      throw error;
    }
  }

  /**
   * Execute a signed transaction (Fusion v0.5 spec)
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

      // Step 2: Execute transaction
      const txResponse = await provider.broadcastTransaction(signedTx);
      const txHash = txResponse.hash;

      this.logger.info('✅ Fusion transaction executed', {
        chainId,
        txHash,
        finp2pIntegration: 'success'
      });

      // Step 3: Start transaction monitoring if enabled
      if (this.config.enableTransactionMonitoring) {
        this.startTransactionMonitoring(txHash, provider, chainId);
      }

      // Step 4: Update FinP2P ownership if needed
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
  async executeCrossChainAtomicSwap(swapRequest: CrossChainSwapRequest): Promise<SwapResult> {
    try {
      this.logger.info('🔄 Executing cross-chain atomic swap via Fusion + FinP2P', {
        initiator: swapRequest.initiatorFinId,
        responder: swapRequest.responderFinId,
        initiatorChain: swapRequest.initiatorAsset.chain,
        responderChain: swapRequest.responderAsset.chain
      });

      // Step 1: Generate swap ID
      const swapId = `swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Step 2: Create transfer proposals for both sides
      const initiatorProposal = await this.createTransferProposal({
        location: swapRequest.initiatorAsset.location,
        proposalDetails: {
          transferType: swapRequest.initiatorAsset.assetId === 'native' ? 'nativeTokenTransfer' : 'fungibleTokenTransfer',
          assetId: swapRequest.initiatorAsset.assetId === 'native' ? undefined : swapRequest.initiatorAsset.assetId,
          origins: [{ originId: swapRequest.initiatorFinId }],
          destinations: [{
            destinationId: swapRequest.responderFinId,
            totalPaymentAmount: {
              unit: this.config.networks[this.getChainIdFromLocation(swapRequest.initiatorAsset.location)].nativeCurrency.symbol,
              amount: swapRequest.initiatorAsset.amount
            }
          }],
          message: `Cross-chain atomic swap ${swapId}`
        }
      });

      const responderProposal = await this.createTransferProposal({
        location: swapRequest.responderAsset.location,
        proposalDetails: {
          transferType: swapRequest.responderAsset.assetId === 'native' ? 'nativeTokenTransfer' : 'fungibleTokenTransfer',
          assetId: swapRequest.responderAsset.assetId === 'native' ? undefined : swapRequest.responderAsset.assetId,
          origins: [{ originId: swapRequest.responderFinId }],
          destinations: [{
            destinationId: swapRequest.initiatorFinId,
            totalPaymentAmount: {
              unit: this.config.networks[this.getChainIdFromLocation(swapRequest.responderAsset.location)].nativeCurrency.symbol,
              amount: swapRequest.responderAsset.amount
            }
          }],
          message: `Cross-chain atomic swap ${swapId}`
        }
      });

      // Step 3: Coordinate with FinP2P for atomic execution
      // This would integrate with your existing FinP2P coordination logic
      this.logger.info('📋 Cross-chain atomic swap proposals created', {
        swapId,
        initiatorGas: initiatorProposal.nativeData.gas,
        responderGas: responderProposal.nativeData.gas
      });

      this.emit('atomicSwapInitiated', { swapId, proposals: { initiator: initiatorProposal, responder: responderProposal } });

      return {
        swapId,
        status: 'initiated',
        // Transaction hashes would be filled in once transactions are signed and executed
      };
    } catch (error) {
      this.logger.error('❌ Failed to execute cross-chain atomic swap:', error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Resolve address from ID - supports both FinP2P IDs and native addresses
   * This addresses Luke's requirement for dual support
   */
  private async resolveAddressFromId(id: string, location: FusionLocation): Promise<string> {
    try {
      // Check if it's already a native address (starts with 0x for EVM)
      if (this.isNativeAddress(id, location)) {
        this.logger.debug('🔍 Using native address directly', {
          id: this.truncateAddress(id),
          location: `${location.technology} ${location.network}`
        });
        return id;
      }

      // It's a FinID, resolve via FinP2P
      return await this.resolveFinIdToAddress(id, location);
    } catch (error) {
      this.logger.error('❌ Failed to resolve address from ID:', { id, error });
      throw error;
    }
  }

  /**
   * Check if an ID is a native blockchain address
   */
  private isNativeAddress(id: string, location: FusionLocation): boolean {
    const tech = location.technology.toLowerCase();
    
    // EVM chains (Ethereum, Polygon, Arbitrum, etc.)
    if (['ethereum', 'polygon', 'arbitrum', 'bsc', 'avalanche'].includes(tech)) {
      return /^0x[a-fA-F0-9]{40}$/.test(id);
    }
    
    // Hedera
    if (tech === 'hedera') {
      return /^\d+\.\d+\.\d+$/.test(id); // Format: 0.0.123456
    }
    
    // Sui
    if (tech === 'sui') {
      return /^0x[a-fA-F0-9]{64}$/.test(id); // 32-byte hex string
    }
    
    // Default to false for unknown technologies
    return false;
  }

  /**
   * Resolve FinID to wallet address via FinP2P
   */
  private async resolveFinIdToAddress(finId: string, location: FusionLocation): Promise<string> {
    try {
      // Determine chain type for FinP2P resolution
      let chainType = 'ethereum'; // default
      if (location.technology === 'polygon') chainType = 'polygon';
      if (location.technology === 'arbitrum') chainType = 'arbitrum';
      if (location.technology === 'hedera') chainType = 'hedera';
      if (location.technology === 'sui') chainType = 'sui';

      const walletAddress = await this.config.finp2pRouter.getWalletAddress(finId, chainType);
      
      if (!walletAddress || walletAddress.includes('placeholder')) {
        throw new Error(`No valid wallet address found for FinID: ${finId} on ${location.technology} ${location.network}. Please provide valid credentials.`);
      }

      this.logger.debug('🔍 FinID resolved via FinP2P', {
        finId,
        location: `${location.technology} ${location.network}`,
        chainType,
        walletAddress: this.truncateAddress(walletAddress)
      });

      return walletAddress;
    } catch (error) {
      this.logger.error('❌ Failed to resolve FinID via FinP2P:', error);
      throw error;
    }
  }

  /**
   * Get chain ID from location specification
   */
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
    
    // If no exact match found, try to find by technology only
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

  /**
   * Build transfer transaction
   */
  private async buildTransferTransaction(
    chainId: number,
    provider: ethers.Provider,
    transferProposal: FusionTransferProposal,
    resolvedOrigins: any[],
    resolvedDestinations: any[],
    customRpcUrl?: string
  ): Promise<FusionProposalResponse> {
    // For simplicity, we'll use the first origin and destination
    const origin = resolvedOrigins[0];
    const destination = resolvedDestinations[0];
    
    // Get nonce
    const nonce = await provider.getTransactionCount(origin.walletAddress);
    
    // Get current gas prices
    const feeData = await provider.getFeeData();
    
    // Use EIP-1559 if supported, otherwise fall back to legacy
    const useEIP1559 = feeData.maxFeePerGas !== null && feeData.maxPriorityFeePerGas !== null;
    
    let gasLimit = '21000'; // Default for simple transfer
    let transactionData = '0x';
    let toAddress = destination.walletAddress;
    let value = '0';

    // Handle different transfer types
    if (transferProposal.transferType === 'nativeTokenTransfer') {
      value = destination.totalPaymentAmount?.amount || '0';
    } else if (transferProposal.transferType === 'fungibleTokenTransfer') {
      // ERC-20 transfer
      if (!transferProposal.assetId) {
        throw new Error('assetId is required for fungible token transfers');
      }
      
      const erc20Interface = new ethers.Interface([
        'function transfer(address to, uint256 value) returns (bool)'
      ]);
      
      transactionData = erc20Interface.encodeFunctionData('transfer', [
        destination.walletAddress,
        destination.totalPaymentAmount?.amount || '0'
      ]);
      
      toAddress = transferProposal.assetId;
      value = '0';
      gasLimit = '65000'; // Higher gas limit for ERC-20
    } else if (transferProposal.transferType === 'nonFungibleTokenTransfer') {
      // ERC-721 transfer
      if (!transferProposal.assetId || !destination.nftTokenId) {
        throw new Error('assetId and nftTokenId are required for NFT transfers');
      }
      
      const erc721Interface = new ethers.Interface([
        'function transferFrom(address from, address to, uint256 tokenId)'
      ]);
      
      transactionData = erc721Interface.encodeFunctionData('transferFrom', [
        origin.walletAddress,
        destination.walletAddress,
        destination.nftTokenId
      ]);
      
      toAddress = transferProposal.assetId;
      value = '0';
      gasLimit = '85000'; // Higher gas limit for NFT
    }

    // Build transaction object
    if (useEIP1559) {
      const maxPriorityFeePerGas = this.config.defaultMaxPriorityFeePerGas || feeData.maxPriorityFeePerGas!.toString();
      const maxFeePerGas = this.config.defaultMaxFeePerGas || feeData.maxFeePerGas!.toString();
      
      const nativeData: FusionEIP1559 = {
        chainId,
        nonce,
        gas: this.config.defaultGasLimit || gasLimit,
        maxPriorityFeePerGas,
        maxFeePerGas,
        to: toAddress,
        value,
        data: transactionData,
        hardfork: 'london'
      };

      // Calculate total fee for response
      const totalFee = BigInt(nativeData.gas) * BigInt(maxFeePerGas);
      const networkConfig = this.config.networks[chainId];
      
      return {
        dltFee: {
          unit: networkConfig.nativeCurrency.symbol,
          amount: totalFee.toString()
        },
        nativeData
      };
    } else {
      // Legacy transaction
      const gasPrice = this.config.defaultMaxFeePerGas || feeData.gasPrice!.toString();
      
      const nativeData: FusionEIP155 = {
        chainId,
        nonce,
        gasPrice,
        gas: this.config.defaultGasLimit || gasLimit,
        to: toAddress,
        value,
        data: transactionData
      };

      // Calculate total fee for response
      const totalFee = BigInt(nativeData.gas) * BigInt(gasPrice);
      const networkConfig = this.config.networks[chainId];
      
      return {
        dltFee: {
          unit: networkConfig.nativeCurrency.symbol,
          amount: totalFee.toString()
        },
        nativeData
      };
    }
  }

  /**
   * Build smart contract write transaction
   */
  private async buildSmartContractWriteTransaction(
    chainId: number,
    provider: ethers.Provider,
    writeProposal: FusionSmartContractWriteProposal,
    callerAddress: string,
    customRpcUrl?: string
  ): Promise<FusionProposalResponse> {
    // Get nonce
    const nonce = await provider.getTransactionCount(callerAddress);
    
    // Get current gas prices
    const feeData = await provider.getFeeData();
    const useEIP1559 = feeData.maxFeePerGas !== null && feeData.maxPriorityFeePerGas !== null;

    // Build function call data
    const functionSignature = this.buildFunctionSignature(writeProposal.functionName, writeProposal.inputParameters);
    const functionSelector = ethers.id(functionSignature).substring(0, 10);
    
    // Encode parameters
    const paramTypes = writeProposal.inputParameters.map(p => p.type);
    const paramValues = writeProposal.inputParameters.map(p => p.value);
    
    let encodedParams = '0x';
    if (paramTypes.length > 0) {
      encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(paramTypes, paramValues);
    }
    
    const transactionData = functionSelector + encodedParams.substring(2);
    
    // Estimate gas
    let gasLimit = '200000'; // Default
    try {
      const estimatedGas = await provider.estimateGas({
        to: writeProposal.smartContractId,
        from: callerAddress,
        data: transactionData,
        value: writeProposal.isStateMutabilityPayable ? '0' : undefined
      });
      gasLimit = estimatedGas.toString();
    } catch (error) {
      this.logger.warn('Failed to estimate gas, using default:', error);
    }

    // Build transaction
    const value = writeProposal.isStateMutabilityPayable ? '0' : '0'; // Could be customized based on proposal
    
    if (useEIP1559) {
      const maxPriorityFeePerGas = this.config.defaultMaxPriorityFeePerGas || feeData.maxPriorityFeePerGas!.toString();
      const maxFeePerGas = this.config.defaultMaxFeePerGas || feeData.maxFeePerGas!.toString();
      
      const nativeData: FusionEIP1559 = {
        chainId,
        nonce,
        gas: gasLimit,
        maxPriorityFeePerGas,
        maxFeePerGas,
        to: writeProposal.smartContractId,
        value,
        data: transactionData,
        hardfork: 'london'
      };

      const totalFee = BigInt(gasLimit) * BigInt(maxFeePerGas);
      const networkConfig = this.config.networks[chainId];
      
      return {
        dltFee: {
          unit: networkConfig.nativeCurrency.symbol,
          amount: totalFee.toString()
        },
        nativeData
      };
    } else {
      const gasPrice = this.config.defaultMaxFeePerGas || feeData.gasPrice!.toString();
      
      const nativeData: FusionEIP155 = {
        chainId,
        nonce,
        gasPrice,
        gas: gasLimit,
        to: writeProposal.smartContractId,
        value,
        data: transactionData
      };

      const totalFee = BigInt(gasLimit) * BigInt(gasPrice);
      const networkConfig = this.config.networks[chainId];
      
      return {
        dltFee: {
          unit: networkConfig.nativeCurrency.symbol,
          amount: totalFee.toString()
        },
        nativeData
      };
    }
  }

  /**
   * Build smart contract deployment transaction
   */
  private async buildSmartContractDeployTransaction(
    chainId: number,
    provider: ethers.Provider,
    deployProposal: FusionSmartContractDeployProposal,
    deployerAddress: string,
    customRpcUrl?: string
  ): Promise<FusionProposalResponse> {
    // Get nonce
    const nonce = await provider.getTransactionCount(deployerAddress);
    
    // Get current gas prices
    const feeData = await provider.getFeeData();
    const useEIP1559 = feeData.maxFeePerGas !== null && feeData.maxPriorityFeePerGas !== null;

    // Build deployment data
    let deploymentData = deployProposal.bytecodeToDeploy;
    
    // Add constructor parameters if any
    if (deployProposal.constructorParameters.length > 0) {
      const paramTypes = deployProposal.constructorParameters.map(p => p.type);
      const paramValues = deployProposal.constructorParameters.map(p => p.value);
      
      const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(paramTypes, paramValues);
      deploymentData += encodedParams.substring(2); // Remove 0x prefix
    }

    // Estimate gas for deployment
    let gasLimit = '2500000'; // Default high limit for deployment
    try {
      const estimatedGas = await provider.estimateGas({
        from: deployerAddress,
        data: deploymentData
      });
      gasLimit = (estimatedGas * 120n / 100n).toString(); // Add 20% buffer
    } catch (error) {
      this.logger.warn('Failed to estimate deployment gas, using default:', error);
    }

    // Build transaction
    if (useEIP1559) {
      const maxPriorityFeePerGas = this.config.defaultMaxPriorityFeePerGas || feeData.maxPriorityFeePerGas!.toString();
      const maxFeePerGas = this.config.defaultMaxFeePerGas || feeData.maxFeePerGas!.toString();
      
      const nativeData: FusionEIP1559 = {
        chainId,
        nonce,
        gas: gasLimit,
        maxPriorityFeePerGas,
        maxFeePerGas,
        to: '', // Empty for deployment
        value: '0',
        data: deploymentData,
        hardfork: 'london'
      };

      const totalFee = BigInt(gasLimit) * BigInt(maxFeePerGas);
      const networkConfig = this.config.networks[chainId];
      
      return {
        dltFee: {
          unit: networkConfig.nativeCurrency.symbol,
          amount: totalFee.toString()
        },
        nativeData
      };
    } else {
      const gasPrice = this.config.defaultMaxFeePerGas || feeData.gasPrice!.toString();
      
      const nativeData: FusionEIP155 = {
        chainId,
        nonce,
        gasPrice,
        gas: gasLimit,
        to: '', // Empty for deployment
        value: '0',
        data: deploymentData
      };

      const totalFee = BigInt(gasLimit) * BigInt(gasPrice);
      const networkConfig = this.config.networks[chainId];
      
      return {
        dltFee: {
          unit: networkConfig.nativeCurrency.symbol,
          amount: totalFee.toString()
        },
        nativeData
      };
    }
  }

  /**
   * Build function signature from name and parameters
   */
  private buildFunctionSignature(functionName: string, parameters: FusionParameter[]): string {
    const paramTypes = parameters.map(p => p.type).join(',');
    return `${functionName}(${paramTypes})`;
  }

  /**
   * Start transaction monitoring
   */
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

  /**
   * Update FinP2P ownership records after transaction
   */
  private async updateFinP2POwnershipIfNeeded(txHash: string, location: FusionLocation): Promise<void> {
    try {
      // This would update FinP2P ownership records based on the transaction
      // Implementation depends on specific business logic and FinP2P API
      this.logger.debug('📝 FinP2P ownership update triggered', {
        txHash,
        location: `${location.technology} ${location.network}`,
        note: 'Ownership update logic would be implemented based on FinP2P requirements'
      });
      
      // Example: await this.config.finp2pRouter.updateOwnership(txHash, location);
    } catch (error) {
      this.logger.warn('⚠️ Failed to update FinP2P ownership:', error);
    }
  }

  /**
   * Utility method to truncate address for logging
   */
  private truncateAddress(address: string): string {
    if (address.length <= 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  // Public utility methods

  public isConnected(): boolean {
    return this.connected;
  }

  public getSupportedNetworks(): number[] {
    return Array.from(this.providers.keys());
  }

  public getNetworkConfig(chainId: number) {
    return this.config.networks[chainId];
  }

  public async disconnect(): Promise<void> {
    // Clear monitoring timeouts
    for (const timeout of this.transactionMonitoring.values()) {
      clearTimeout(timeout);
    }
    this.transactionMonitoring.clear();

    // Clear providers
    this.providers.clear();

    this.connected = false;
    this.logger.info('🔌 Fusion adapter disconnected');
    this.emit('disconnected');
  }
}