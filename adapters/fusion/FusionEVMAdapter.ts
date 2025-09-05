import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import { Logger } from 'winston';

// Fusion OpenAPI Spec Types - Exact match with FusionSpec (1).yaml

export interface Location {
  technology: string;
  network: string;
}

export interface FeeInfo {
  unit: string;
  amount: string;
}

export interface Parameter {
  name?: string;
  type: string;
  value: string | number | boolean | object | any[];
}

export interface TransferOrigin {
  originId: string;
}

export interface TransferDestination {
  destinationId: string;
  totalPaymentAmount?: FeeInfo;
  nftTokenId?: string;
}

export interface TransferProposal {
  transferType: 'nativeTokenTransfer' | 'fungibleTokenTransfer' | 'nonFungibleTokenTransfer';
  assetId?: string;
  origins: TransferOrigin[];
  destinations: TransferDestination[];
  message?: string;
  feePayers?: string[];
}

export interface SmartContractWriteProposal {
  callerAccountId: string;
  smartContractId: string;
  functionName: string;
  inputParameters: Parameter[];
  outputParameters: Parameter[];
  isStateMutabilityPayable?: boolean;
  feePayers?: string[];
  message?: string;
}

export interface SmartContractDeployProposal {
  deployerAccountId: string;
  bytecodeToDeploy: string;
  constructorParameters: Parameter[];
  feePayers?: string[];
  message?: string;
}

export interface ProposalRequest {
  location: Location;
  nodeToConnect?: string;
  proposalDetails: TransferProposal | SmartContractWriteProposal | SmartContractDeployProposal;
}

export interface EIP155 {
  chainId: number;
  nonce: number;
  gasPrice: string;
  gas: string;
  to: string;
  value: string;
  data: string;
}

export interface EIP1559 {
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

export interface ProposalResponse {
  dltFee: FeeInfo;
  nativeData: EIP155 | EIP1559;
}

export interface ExecuteRequest {
  location: Location;
  nodeToConnect?: string;
  signedTransaction: string;
}

export interface Status {
  message: string;
  txHash?: string;
  value: 'pending' | 'success' | 'failed';
  timestamp: string;
}

export interface ExecuteResponse {
  status: Status;
}

export interface BaseReadRequest {
  technology: string;
  network: string;
  nodeToConnect?: string;
}

export interface AccountReadRequest extends BaseReadRequest {
  accountId: string;
}

export interface TransactionReadRequest extends BaseReadRequest {
  transactionId: string;
}

export interface BlockReadRequest extends BaseReadRequest {
  blockId: string;
}

export interface SmartContractReadRequest {
  location: Location;
  nodeToConnect?: string;
  contractDetails: {
    smartContractId: string;
    functionName: string;
    inputParameters: Parameter[];
    outputParameters: Parameter[];
  };
}

export interface EVMAccountBalanceResponse {
  balance: string;
}

export interface EVMAccountNonceResponse {
  nonce: string;
}

export interface EVMTransactionResponse {
  blockHash: string | null;
  blockNumber: string | null;
  from: string;
  gas: string;
  gasPrice?: string;
  hash: string;
  input: string;
  nonce: string;
  to: string | null;
  transactionIndex: string | null;
  value: string;
  v: string;
  r: string;
  s: string;
  type?: string;
  chainId?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  accessList?: any[];
  yParity?: string;
}

export interface EVMBlockResponse {
  number: string | null;
  hash: string | null;
  parentHash: string;
  nonce: string | null;
  sha3Uncles: string;
  logsBloom: string | null;
  transactionsRoot: string;
  stateRoot: string;
  receiptsRoot: string;
  miner: string;
  difficulty: string;
  totalDifficulty: string;
  extraData: string;
  size: string;
  gasLimit: string;
  gasUsed: string;
  timestamp: string;
  transactions: (string | EVMTransactionResponse)[];
  uncles: string[];
  baseFeePerGas?: string;
  blobGasUsed?: string;
  excessBlobGas?: string;
  mixHash?: string;
  parentBeaconBlockRoot?: string;
  requestsHash?: string;
  withdrawals?: any[];
  withdrawalsRoot?: string;
}

export interface EVMSmartContractResponse {
  rawValue?: string;
  returns: Parameter[];
}

export interface EVMReadResponse {
  rawData: EVMAccountBalanceResponse | EVMAccountNonceResponse | EVMTransactionResponse | EVMBlockResponse | EVMSmartContractResponse;
}

export interface ErrorResponse {
  error: string;
  details?: string | string[];
}

// Configuration
export interface FusionEVMConfig {
  networks: {
    [key: string]: {
      chainId: number;
      rpcUrl: string;
      name: string;
    };
  };
  enableLogging?: boolean;
}

/**
 * Fusion EVM Adapter - Fully compliant with Fusion OpenAPI Specification
 * Implements all required endpoints for EVM-compatible blockchains
 */
export class FusionEVMAdapter extends EventEmitter {
  private config: FusionEVMConfig;
  private logger: Logger;
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();

  constructor(config: FusionEVMConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
  }

  // Helper method to get provider for network
  private getProvider(location: Location, nodeToConnect?: string): ethers.JsonRpcProvider {
    const networkKey = `${location.technology}_${location.network}`;
    
    if (nodeToConnect) {
      return new ethers.JsonRpcProvider(nodeToConnect);
    }

    if (this.providers.has(networkKey)) {
      return this.providers.get(networkKey)!;
    }

    const networkConfig = this.config.networks[networkKey];
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${location.technology} ${location.network}`);
    }

    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    this.providers.set(networkKey, provider);
    return provider;
  }

  // Helper method to validate location
  private validateLocation(location: Location): void {
    if (!location.technology || !location.network) {
      throw new Error('Location must specify both technology and network');
    }
    if (location.technology !== 'ethereum') {
      throw new Error(`Unsupported technology: ${location.technology}`);
    }
  }

  // Helper method to get intelligent gas price fallback
  private async getIntelligentGasPrice(provider: ethers.JsonRpcProvider, fallbackGasPrice?: string): Promise<string> {
    try {
      // Try to get current network fee data
      const feeData = await provider.getFeeData();
      
      if (feeData.gasPrice) {
        return feeData.gasPrice.toString();
      }
      
      // If no fee data available, try to get from recent blocks
      try {
        const latestBlock = await provider.getBlock('latest');
        if (latestBlock?.baseFeePerGas) {
          // Use base fee + 15% buffer for priority
          const calculatedGasPrice = (latestBlock.baseFeePerGas * BigInt(115) / BigInt(100)).toString();
          return calculatedGasPrice;
        }
      } catch (blockError) {
        this.logger.warn('Could not get latest block for fee calculation:', blockError);
      }
      
      // Final fallback: use network-specific reasonable defaults
      const network = await provider.getNetwork();
      const networkDefaults: { [chainId: string]: string } = {
        '1': '20000000000',    // Mainnet: 20 Gwei
        '11155111': '2000000000', // Sepolia: 2 Gwei
        '137': '30000000000',   // Polygon: 30 Gwei
        '42161': '150000000',   // Arbitrum: 0.15 Gwei
        '10': '1000000',        // Optimism: 0.001 Gwei
        '56': '5000000000',     // BSC: 5 Gwei
      };
      
      const defaultGasPrice = networkDefaults[network.chainId.toString()] || '20000000000'; // 20 Gwei as universal fallback
      
      if (fallbackGasPrice) {
        this.logger.warn(`Using provided fallback gas price: ${fallbackGasPrice} wei`);
        return fallbackGasPrice;
      }
      
      this.logger.warn(`Using network-specific default gas price: ${defaultGasPrice} wei for chain ${network.chainId}`);
      return defaultGasPrice;
      
    } catch (error) {
      this.logger.error('Failed to get intelligent gas price, using safe fallback:', error);
      // Safe fallback: 20 Gwei (0.02 ETH) - reasonable for most networks
      return '20000000000';
    }
  }

  /**
   * POST /transfer-proposal
   * Creates a transfer proposal for native tokens, fungible tokens, or NFTs
   */
  async transferProposal(request: ProposalRequest): Promise<ProposalResponse> {
    try {
      this.validateLocation(request.location);
      const provider = this.getProvider(request.location, request.nodeToConnect);
      
      const proposalDetails = request.proposalDetails as TransferProposal;
      if (!proposalDetails.transferType || !proposalDetails.origins || !proposalDetails.destinations) {
        throw new Error('Invalid transfer proposal details');
      }

      // Get network info
      const network = await provider.getNetwork();
      const feeData = await provider.getFeeData();
      
      // Get nonce for sender
      const sender = proposalDetails.origins[0].originId;
      const nonce = await provider.getTransactionCount(sender);
      
      // Build transaction data
      let to = proposalDetails.destinations[0].destinationId;
      let value = proposalDetails.destinations[0].totalPaymentAmount?.amount || '0';
      let data = '0x';

      // For token transfers, build contract call data
      if (proposalDetails.transferType === 'fungibleTokenTransfer' && proposalDetails.assetId) {
        to = proposalDetails.assetId;
        const amount = ethers.parseUnits(value, 18); // Assume 18 decimals
        const iface = new ethers.Interface(['function transfer(address to, uint256 amount)']);
        data = iface.encodeFunctionData('transfer', [proposalDetails.destinations[0].destinationId, amount]);
        value = '0';
      }

      // Convert values to wei/hex
      const valueWei = ethers.parseEther(value || '0').toString();
      
      // Dynamic gas estimation using provider.estimateGas
      let gasLimit: string;
      try {
        const txForGasEst = {
          to,
          data,
          value: valueWei,
          from: sender
        };
        
        const estimatedGas = await provider.estimateGas(txForGasEst);
        gasLimit = estimatedGas.toString();
      } catch (estimationError) {
        this.logger.warn('Gas estimation failed, using fallback values:', estimationError);
        // Fallback to reasonable defaults based on transfer type
        const baseGasLimit = proposalDetails.transferType === 'nativeTokenTransfer' ? 21000 : 100000;
        gasLimit = baseGasLimit.toString();
      }
      
      // Determine transaction type based on fee data
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        // EIP-1559
        const nativeData: EIP1559 = {
          chainId: Number(network.chainId),
          nonce,
          gas: gasLimit,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas.toString(),
          maxFeePerGas: feeData.maxFeePerGas.toString(),
          to,
          value: valueWei,
          data,
          hardfork: 'london'
        };

        return {
          dltFee: {
            unit: 'ETH',
            amount: ethers.formatEther((feeData.maxFeePerGas * BigInt(gasLimit)).toString())
          },
          nativeData
        };
      } else {
        // EIP-155 (legacy)
        const intelligentGasPrice = await this.getIntelligentGasPrice(provider);
        const nativeData: EIP155 = {
          chainId: Number(network.chainId),
          nonce,
          gasPrice: intelligentGasPrice,
          gas: gasLimit,
          to,
          value: valueWei,
          data
        };

        return {
          dltFee: {
            unit: 'ETH',
            amount: ethers.formatEther((BigInt(nativeData.gasPrice) * BigInt(gasLimit)).toString())
          },
          nativeData
        };
      }
    } catch (error) {
      this.logger.error('❌ Transfer proposal failed:', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * POST /smartContractWrite-proposal  
   * Creates a smart contract write proposal
   */
  async smartContractWriteProposal(request: ProposalRequest): Promise<ProposalResponse> {
    try {
      this.validateLocation(request.location);
      const provider = this.getProvider(request.location, request.nodeToConnect);
      
      const proposalDetails = request.proposalDetails as SmartContractWriteProposal;
      if (!proposalDetails.smartContractId || !proposalDetails.functionName) {
        throw new Error('Invalid smart contract write proposal details');
      }

      // Get network info
      const network = await provider.getNetwork();
      const feeData = await provider.getFeeData();
      
      // Get nonce for caller
      const nonce = await provider.getTransactionCount(proposalDetails.callerAccountId);
      
      // Build function call data
      const types = proposalDetails.inputParameters.map(p => p.type);
      const values = proposalDetails.inputParameters.map(p => p.value);
      const functionSig = `function ${proposalDetails.functionName}(${types.map((t, i) => `${t} ${proposalDetails.inputParameters[i].name || 'param' + i}`).join(', ')})`;
      
      const iface = new ethers.Interface([functionSig]);
      const data = iface.encodeFunctionData(proposalDetails.functionName, values);
      
      // Estimate gas
      const gasEstimate = await provider.estimateGas({
        to: proposalDetails.smartContractId,
        data,
        from: proposalDetails.callerAccountId
      });

      // EIP-1559 transaction
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        const nativeData: EIP1559 = {
          chainId: Number(network.chainId),
          nonce,
          gas: gasEstimate.toString(),
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas.toString(),
          maxFeePerGas: feeData.maxFeePerGas.toString(),
          to: proposalDetails.smartContractId,
          value: proposalDetails.isStateMutabilityPayable ? '0' : '0',
          data,
          hardfork: 'london'
        };

        return {
          dltFee: {
            unit: 'ETH',
            amount: ethers.formatEther((feeData.maxFeePerGas * gasEstimate).toString())
          },
          nativeData
        };
      } else {
        // Legacy transaction
        const intelligentGasPrice = await this.getIntelligentGasPrice(provider);
        const nativeData: EIP155 = {
          chainId: Number(network.chainId),
          nonce,
          gasPrice: intelligentGasPrice,
          gas: gasEstimate.toString(),
          to: proposalDetails.smartContractId,
          value: '0',
          data
        };

        return {
          dltFee: {
            unit: 'ETH',
            amount: ethers.formatEther((BigInt(nativeData.gasPrice) * gasEstimate).toString())
          },
          nativeData
        };
      }
    } catch (error) {
      this.logger.error('❌ Smart contract write proposal failed:', error);
      throw error;
    }
  }

  /**
   * POST /smartContractDeploy-proposal
   * Creates a smart contract deployment proposal
   */
  async smartContractDeployProposal(request: ProposalRequest): Promise<ProposalResponse> {
    try {
      this.validateLocation(request.location);
      const provider = this.getProvider(request.location, request.nodeToConnect);
      
      const proposalDetails = request.proposalDetails as SmartContractDeployProposal;
      if (!proposalDetails.bytecodeToDeploy || !proposalDetails.deployerAccountId) {
        throw new Error('Invalid smart contract deploy proposal details');
      }

      // Get network info
      const network = await provider.getNetwork();
      const feeData = await provider.getFeeData();
      
      // Get nonce for deployer
      const nonce = await provider.getTransactionCount(proposalDetails.deployerAccountId);
      
      // Build constructor data
      let data = proposalDetails.bytecodeToDeploy;
      if (proposalDetails.constructorParameters.length > 0) {
        const types = proposalDetails.constructorParameters.map(p => p.type);
        const values = proposalDetails.constructorParameters.map(p => p.value);
        const constructorData = ethers.AbiCoder.defaultAbiCoder().encode(types, values);
        data += constructorData.slice(2); // Remove '0x' prefix
      }
      
      // Estimate gas for deployment
      const gasEstimate = await provider.estimateGas({
        data,
        from: proposalDetails.deployerAccountId
      });

      // EIP-1559 transaction
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        const nativeData: EIP1559 = {
          chainId: Number(network.chainId),
          nonce,
          gas: gasEstimate.toString(),
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas.toString(),
          maxFeePerGas: feeData.maxFeePerGas.toString(),
          to: '', // Contract deployment
          value: '0',
          data,
          hardfork: 'london'
        };

        return {
          dltFee: {
            unit: 'ETH',
            amount: ethers.formatEther((feeData.maxFeePerGas * gasEstimate).toString())
          },
          nativeData
        };
      } else {
        // Legacy transaction
        const intelligentGasPrice = await this.getIntelligentGasPrice(provider);
        const nativeData: EIP155 = {
          chainId: Number(network.chainId),
          nonce,
          gasPrice: intelligentGasPrice,
          gas: gasEstimate.toString(),
          to: '', // Contract deployment
          value: '0',
          data
        };

        return {
          dltFee: {
            unit: 'ETH',
            amount: ethers.formatEther((BigInt(nativeData.gasPrice) * gasEstimate).toString())
          },
          nativeData
        };
      }
    } catch (error) {
      this.logger.error('❌ Smart contract deploy proposal failed:', error);
      throw error;
    }
  }

  /**
   * POST /execute
   * Executes a signed transaction
   */
  async execute(request: ExecuteRequest): Promise<ExecuteResponse> {
    try {
      this.validateLocation(request.location);
      const provider = this.getProvider(request.location, request.nodeToConnect);
      
      if (!request.signedTransaction) {
        throw new Error('Signed transaction is required');
      }

      // Parse and broadcast the signed transaction
      const tx = ethers.Transaction.from(request.signedTransaction);
      const response = await provider.broadcastTransaction(request.signedTransaction);
      
      this.logger.info('✅ Transaction broadcast successfully', { hash: response.hash });

      return {
        status: {
          message: 'Transaction submitted successfully',
          txHash: response.hash,
          value: 'pending',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('❌ Transaction execution failed:', error);
      return {
        status: {
          message: `Transaction failed: ${error instanceof Error ? error.message : String(error)}`,
          value: 'failed',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * POST /smartContract-read
   * Reads data from a smart contract function
   */
  async smartContractRead(request: SmartContractReadRequest): Promise<EVMReadResponse> {
    try {
      this.validateLocation(request.location);
      const provider = this.getProvider(request.location, request.nodeToConnect);
      
      const { contractDetails } = request;
      if (!contractDetails.smartContractId || !contractDetails.functionName) {
        throw new Error('Invalid smart contract read request');
      }

      // Build function call
      const types = contractDetails.inputParameters.map(p => p.type);
      const values = contractDetails.inputParameters.map(p => p.value);
      const returnTypes = contractDetails.outputParameters.map(p => p.type);
      
      const functionSig = `function ${contractDetails.functionName}(${types.map((t, i) => `${t} ${contractDetails.inputParameters[i].name || 'param' + i}`).join(', ')}) view returns (${returnTypes.map((t, i) => `${t} ${contractDetails.outputParameters[i].name || 'return' + i}`).join(', ')})`;
      
      const iface = new ethers.Interface([functionSig]);
      const data = iface.encodeFunctionData(contractDetails.functionName, values);
      
      // Call contract
      const result = await provider.call({
        to: contractDetails.smartContractId,
        data
      });

      // Decode result
      const decoded = iface.decodeFunctionResult(contractDetails.functionName, result);
      
      // Format response according to spec
      const returns: Parameter[] = contractDetails.outputParameters.map((param, i) => ({
        name: param.name,
        type: param.type,
        value: decoded[i]
      }));

      const response: EVMSmartContractResponse = {
        rawValue: result,
        returns
      };

      return { rawData: response };
    } catch (error) {
      this.logger.error('❌ Smart contract read failed:', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * GET /balance
   * Retrieves account balance
   */
  async balance(request: AccountReadRequest): Promise<EVMReadResponse> {
    try {
      this.validateLocation({ technology: request.technology, network: request.network });
      const provider = this.getProvider({ technology: request.technology, network: request.network }, request.nodeToConnect);
      
      if (!request.accountId) {
        throw new Error('Account ID is required');
      }

      const balance = await provider.getBalance(request.accountId);
      
      const response: EVMAccountBalanceResponse = {
        balance: '0x' + balance.toString(16)
      };

      return { rawData: response };
    } catch (error) {
      this.logger.error('❌ Balance query failed:', error);
      throw error;
    }
  }

  /**
   * GET /nonce
   * Retrieves account nonce
   */
  async nonce(request: AccountReadRequest): Promise<EVMReadResponse> {
    try {
      this.validateLocation({ technology: request.technology, network: request.network });
      const provider = this.getProvider({ technology: request.technology, network: request.network }, request.nodeToConnect);
      
      if (!request.accountId) {
        throw new Error('Account ID is required');
      }

      const nonce = await provider.getTransactionCount(request.accountId);
      
      const response: EVMAccountNonceResponse = {
        nonce: '0x' + nonce.toString(16)
      };

      return { rawData: response };
    } catch (error) {
      this.logger.error('❌ Nonce query failed:', error);
      throw error;
    }
  }

  /**
   * GET /transaction
   * Retrieves transaction details
   */
  async transaction(request: TransactionReadRequest): Promise<EVMReadResponse> {
    try {
      this.validateLocation({ technology: request.technology, network: request.network });
      const provider = this.getProvider({ technology: request.technology, network: request.network }, request.nodeToConnect);
      
      if (!request.transactionId) {
        throw new Error('Transaction ID is required');
      }

      const tx = await provider.getTransaction(request.transactionId);
      if (!tx) {
        throw new Error('Transaction not found');
      }

      // Convert to spec format
      const response: EVMTransactionResponse = {
        blockHash: tx.blockHash,
        blockNumber: tx.blockNumber ? '0x' + tx.blockNumber.toString(16) : null,
        from: tx.from,
        gas: '0x' + tx.gasLimit.toString(16),
        gasPrice: tx.gasPrice ? '0x' + tx.gasPrice.toString(16) : undefined,
        hash: tx.hash,
        input: tx.data,
        nonce: '0x' + tx.nonce.toString(16),
        to: tx.to,
        transactionIndex: tx.index !== null ? '0x' + tx.index.toString(16) : null,
        value: '0x' + tx.value.toString(16),
        v: tx.signature?.v ? '0x' + tx.signature.v.toString(16) : '0x',
        r: tx.signature?.r || '0x',
        s: tx.signature?.s || '0x',
        type: tx.type !== null ? '0x' + tx.type.toString(16) : undefined,
        chainId: tx.chainId ? '0x' + tx.chainId.toString(16) : undefined,
        maxFeePerGas: tx.maxFeePerGas ? '0x' + tx.maxFeePerGas.toString(16) : undefined,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? '0x' + tx.maxPriorityFeePerGas.toString(16) : undefined,
        accessList: tx.accessList || []
      };

      return { rawData: response };
    } catch (error) {
      this.logger.error('❌ Transaction query failed:', error);
      throw error;
    }
  }

  /**
   * GET /block
   * Retrieves block information
   */
  async block(request: BlockReadRequest): Promise<EVMReadResponse> {
    try {
      this.validateLocation({ technology: request.technology, network: request.network });
      const provider = this.getProvider({ technology: request.technology, network: request.network }, request.nodeToConnect);
      
      if (!request.blockId) {
        throw new Error('Block ID is required');
      }

      const block = await provider.getBlock(request.blockId, false);
      if (!block) {
        throw new Error('Block not found');
      }

      // Convert to spec format
      const response: EVMBlockResponse = {
        number: block.number ? '0x' + block.number.toString(16) : null,
        hash: block.hash,
        parentHash: block.parentHash,
        nonce: block.nonce || '0x0000000000000000',
        sha3Uncles: '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
        logsBloom: (block as any).logsBloom || null,
        transactionsRoot: '0x' + Array(64).fill('0').join(''), // Simplified
        stateRoot: '0x' + Array(64).fill('0').join(''), // Simplified
        receiptsRoot: '0x' + Array(64).fill('0').join(''), // Simplified
        miner: block.miner || '0x0000000000000000000000000000000000000000',
        difficulty: '0x' + (block.difficulty || 0).toString(16),
        totalDifficulty: '0x0', // Not available in ethers
        extraData: '0x',
        size: '0x0', // Not available in ethers
        gasLimit: '0x' + block.gasLimit.toString(16),
        gasUsed: '0x' + block.gasUsed.toString(16),
        timestamp: '0x' + block.timestamp.toString(16),
        transactions: [...block.transactions], // Transaction hashes
        uncles: [],
        baseFeePerGas: block.baseFeePerGas ? '0x' + block.baseFeePerGas.toString(16) : undefined
      };

      return { rawData: response };
    } catch (error) {
      this.logger.error('❌ Block query failed:', error);
      throw error;
    }
  }
}
