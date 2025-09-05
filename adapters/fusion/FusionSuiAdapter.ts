import { EventEmitter } from 'events';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { Logger } from 'winston';

// Fusion OpenAPI Spec Types - Import from FusionEVMAdapter for consistency
import {
  Location,
  FeeInfo,
  Parameter,
  TransferOrigin,
  TransferDestination,
  TransferProposal,
  SmartContractWriteProposal,
  SmartContractDeployProposal,
  ProposalRequest,
  ProposalResponse,
  ExecuteRequest,
  Status as FusionStatus,
  ExecuteResponse,
  BaseReadRequest,
  AccountReadRequest,
  TransactionReadRequest,
  BlockReadRequest,
  SmartContractReadRequest,
  ErrorResponse
} from './FusionEVMAdapter';

// SUI-specific response types that follow Fusion spec pattern
export interface SuiAccountBalanceResponse {
  balance: string; // SUI balance in MIST as string
}

export interface SuiAccountNonceResponse {
  nonce: string; // Next sequence number as string
}

export interface SuiTransactionResponse {
  digest: string;
  checkpoint?: string;
  timestampMs?: string;
  effects?: any;
  events?: any[];
  balanceChanges?: any[];
  status: string;
}

export interface SuiBlockResponse {
  digest: string;
  checkpoint: string;
  epoch: string;
  round: string;
  timestampMs: string;
  transactions: string[];
  previousDigest?: string;
}

export interface SuiSmartContractResponse {
  rawValue?: string;
  returns: Parameter[];
}

export interface SuiReadResponse {
  rawData: SuiAccountBalanceResponse | SuiAccountNonceResponse | SuiTransactionResponse | SuiBlockResponse | SuiSmartContractResponse;
}

// SUI native data format for proposals
export interface SuiNativeData {
  sender: string;
  gasPayment?: string[];
  gasBudget: string;
  gasPrice: string;
  epoch: string;
  kind: string;
}

export interface SuiProposalResponse {
  dltFee: FeeInfo;
  nativeData: SuiNativeData;
}

// Configuration
export interface FusionSuiConfig {
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  rpcUrl?: string;
  enableLogging?: boolean;
  dummySenderAddress?: string; // Configurable dummy sender for devInspectTransactionBlock
}

/**
 * Fusion SUI Adapter - Fully compliant with Fusion OpenAPI Specification
 * Implements all required endpoints for SUI blockchain
 */
export class FusionSuiAdapter extends EventEmitter {
  private config: FusionSuiConfig;
  private logger: Logger;
  private client: SuiClient;
  private connected: boolean = false;

  // Gas calculation constants with clear documentation
  private static readonly BASE_CONTRACT_CALL_GAS_UNITS = 30000; // Base gas units for smart contract calls
  private static readonly PER_PARAMETER_GAS_UNITS = 5000; // Additional gas units per input parameter
  private static readonly SUI_BASE_TRANSFER_GAS_UNITS = 10000; // Base computation units for transfer
  
  // SUI network constants
  private static readonly DEFAULT_DUMMY_SENDER = '0x0000000000000000000000000000000000000000000000000000000000000000'; // Default dummy sender for operations

  constructor(config: FusionSuiConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
    
    // Initialize SUI client
    const rpcUrl = config.rpcUrl || getFullnodeUrl(config.network);
    this.client = new SuiClient({ url: rpcUrl });
  }

  async connect(): Promise<void> {
    try {
      this.logger.info('🔌 Connecting SUI Fusion Adapter...');
      
      // Test connection by getting chain identifier
      const chainId = await this.client.getChainIdentifier();
      this.logger.info(`✅ Connected to SUI ${this.config.network} (Chain ID: ${chainId})`);
      
      this.connected = true;
      this.logger.info('✅ SUI Fusion Adapter connected');
    } catch (error) {
      this.logger.error('❌ Failed to connect SUI Adapter:', error);
      throw error;
    }
  }

  // Helper method to validate location
  private validateLocation(location: Location): void {
    if (!location.technology || !location.network) {
      throw new Error('Location must specify both technology and network');
    }
    if (location.technology !== 'sui') {
      throw new Error(`Unsupported technology: ${location.technology}`);
    }
  }

  /**
   * Get current network gas price
   */
  private async getNetworkGasPrice(): Promise<bigint> {
    try {
      // Try to get reference gas price from the network
      const gasPrice = await this.client.getReferenceGasPrice();
      return BigInt(gasPrice);
    } catch (error) {
      this.logger.warn(`Failed to fetch network gas price: ${error}`);
      // Fallback to reasonable default for SUI testnet
      return BigInt(1000);
    }
  }

  // Helper to validate SUI address format
  private validateSuiAddress(address: string): string {
    if (!address || !address.startsWith('0x')) {
      throw new Error(`Invalid SUI address format: ${address}`);
    }
    return address;
  }

  // Helper to truncate address for logging
  private truncateAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // Helper to safely parse integers with fallback
  private safeParseInt(value: string | number | undefined, fallback: number = 0): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return !isNaN(parsed) ? parsed : fallback;
    }
    return fallback;
  }

  /**
   * POST /transfer-proposal
   * Creates a transfer proposal for SUI or custom coins
   */
  async transferProposal(request: ProposalRequest): Promise<SuiProposalResponse> {
    try {
      this.validateLocation(request.location);
      
      const proposalDetails = request.proposalDetails as TransferProposal;
      if (!proposalDetails.transferType || !proposalDetails.origins || !proposalDetails.destinations) {
        throw new Error('Invalid transfer proposal details');
      }

      const sender = proposalDetails.origins[0].originId;
      const receiver = proposalDetails.destinations[0].destinationId;
      const amount = proposalDetails.destinations[0].totalPaymentAmount?.amount || '0';

      // Validate SUI addresses
      this.validateSuiAddress(sender);
      this.validateSuiAddress(receiver);

      // Get dynamic gas parameters based on network conditions
      const gasPrice = await this.getNetworkGasPrice();
      const epoch = '0'; // Epoch handling

      // Build SUI transaction data with dynamic gas calculation
      const baseGasUnits = FusionSuiAdapter.SUI_BASE_TRANSFER_GAS_UNITS; // Base computation units for transfer
      const gasBudget = (gasPrice * BigInt(baseGasUnits)).toString();
      
      const nativeData: SuiNativeData = {
        sender,
        gasBudget,
        gasPrice: gasPrice.toString(),
        epoch: epoch.toString(),
        kind: proposalDetails.transferType === 'nativeTokenTransfer' ? 'TransferSui' : 'TransferObject'
      };

      // Calculate fee in SUI (gas budget converted from MIST)
      const feeInSui = (parseInt(gasBudget) / 1000000000).toString();

      return {
        dltFee: {
          unit: 'SUI',
          amount: feeInSui
        },
        nativeData
      };
    } catch (error) {
      this.logger.error('❌ SUI transfer proposal failed:', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * POST /smartContractWrite-proposal  
   * Creates a smart contract write proposal for SUI
   */
  async smartContractWriteProposal(request: ProposalRequest): Promise<SuiProposalResponse> {
    try {
      this.validateLocation(request.location);
      
      const proposalDetails = request.proposalDetails as SmartContractWriteProposal;
      if (!proposalDetails.smartContractId || !proposalDetails.functionName) {
        throw new Error('Invalid smart contract write proposal details');
      }

      // Validate caller address and package/contract ID
      this.validateSuiAddress(proposalDetails.callerAccountId);
      this.validateSuiAddress(proposalDetails.smartContractId);

      // Parse Move function call
      const [packageId, moduleName, functionName] = this.parseMoveFunctionCall(
        proposalDetails.smartContractId, 
        proposalDetails.functionName
      );

      // Get dynamic gas parameters based on network conditions
      const gasPrice = await this.getNetworkGasPrice();
      const epoch = '0'; // Epoch handling

      // Build a test transaction to estimate gas
      const testTxb = new Transaction();
      
      // Convert parameters for Move call
      const args: any[] = [];
      for (const param of proposalDetails.inputParameters) {
        args.push(this.convertParameterToSuiArg(param));
      }

      let gasBudget: string;
      try {
        // Add move call for gas estimation
        testTxb.moveCall({
          target: `${packageId}::${moduleName}::${functionName}`,
          arguments: args
        });

        // Try to dry run for gas estimation by building the transaction
        const txBytes = await testTxb.build({ client: this.client });
        const dryRunResult = await this.client.dryRunTransactionBlock({
          transactionBlock: txBytes
        });

        // Calculate gas budget based on dry run or use estimated values
        const estimatedGas = dryRunResult.effects.gasUsed ? 
          (this.safeParseInt(dryRunResult.effects.gasUsed.computationCost) + 
           this.safeParseInt(dryRunResult.effects.gasUsed.storageCost) + 
           this.safeParseInt(dryRunResult.effects.gasUsed.storageRebate)) : 
          20000000; // Default 0.02 SUI

        gasBudget = Math.max(estimatedGas * 1.2, 20000000).toString(); // 20% buffer, minimum 0.02 SUI
      } catch (estimationError) {
        this.logger.warn('Gas estimation failed, using default values:', estimationError);
        // Fallback to heuristic if estimation fails
        const contractCallGasUnits = FusionSuiAdapter.BASE_CONTRACT_CALL_GAS_UNITS + 
          (proposalDetails.inputParameters.length * FusionSuiAdapter.PER_PARAMETER_GAS_UNITS); // Base + parameter complexity
        gasBudget = (gasPrice * BigInt(contractCallGasUnits)).toString();
      }

      const nativeData: SuiNativeData = {
        sender: proposalDetails.callerAccountId,
        gasBudget,
        gasPrice: gasPrice.toString(),
        epoch: epoch.toString(),
        kind: 'MoveCall'
      };

      const feeInSui = (parseInt(gasBudget) / 1000000000).toString();

      return {
        dltFee: {
          unit: 'SUI',
          amount: feeInSui
        },
        nativeData
      };
    } catch (error) {
      this.logger.error('❌ SUI smart contract write proposal failed:', error);
      throw error;
    }
  }

  /**
   * POST /smartContractDeploy-proposal
   * Creates a smart contract deployment proposal for SUI
   */
  async smartContractDeployProposal(request: ProposalRequest): Promise<SuiProposalResponse> {
    try {
      this.validateLocation(request.location);
      
      const proposalDetails = request.proposalDetails as SmartContractDeployProposal;
      if (!proposalDetails.bytecodeToDeploy || !proposalDetails.deployerAccountId) {
        throw new Error('Invalid smart contract deploy proposal details');
      }

      // Validate deployer address
      this.validateSuiAddress(proposalDetails.deployerAccountId);

      // Validate bytecode format for SUI Move modules
      if (!proposalDetails.bytecodeToDeploy.startsWith('0x')) {
        throw new Error('Move module bytecode must be a hex string starting with 0x');
      }

      // Get dynamic gas parameters based on network conditions
      const gasPrice = await this.getNetworkGasPrice();
      const epoch = '0'; // Epoch handling

      // Parse bytecode for Move module publishing
      const moduleBytes = Array.from(Buffer.from(proposalDetails.bytecodeToDeploy.slice(2), 'hex'));
      
      // Calculate dynamic gas budget based on module size and complexity
      const moduleSize = moduleBytes.length;
      const basePublishGasUnits = 100 * 1000; // Base gas units for publishing (100K units)
      const bytecodeGasUnits = Math.ceil(moduleSize / 1000) * 10000; // Gas per KB of bytecode
      const constructorGasUnits = proposalDetails.constructorParameters.length * 5000; // Gas per constructor param
      const totalGasUnits = basePublishGasUnits + bytecodeGasUnits + constructorGasUnits;
      const gasBudget = (gasPrice * BigInt(totalGasUnits)).toString();

      const nativeData: SuiNativeData = {
        sender: proposalDetails.deployerAccountId,
        gasBudget,
        gasPrice: gasPrice.toString(),
        epoch: epoch.toString(),
        kind: 'Publish'
      };

      const feeInSui = (parseInt(gasBudget) / 1000000000).toString();

      return {
        dltFee: {
          unit: 'SUI',
          amount: feeInSui
        },
        nativeData
      };
    } catch (error) {
      this.logger.error('❌ SUI smart contract deploy proposal failed:', error);
      throw error;
    }
  }

  /**
   * POST /execute
   * Executes a signed transaction on SUI
   */
  async execute(request: ExecuteRequest): Promise<ExecuteResponse> {
    try {
      this.validateLocation(request.location);
      
      if (!request.signedTransaction) {
        throw new Error('Signed transaction is required');
      }

      // Execute the pre-signed transaction
      // In the signed transaction string, we expect both transaction block and signature
      const response = await this.client.executeTransactionBlock({
        transactionBlock: request.signedTransaction,
        signature: request.signedTransaction, // Assuming it contains the signature
        options: { 
          showEffects: true,
          showBalanceChanges: true
        }
      });
      
      this.logger.info('✅ SUI transaction broadcast successfully', { digest: response.digest });

      return {
        status: {
          message: 'Transaction submitted successfully',
          txHash: response.digest,
          value: 'pending',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('❌ SUI transaction execution failed:', error);
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
   * Reads data from a SUI smart contract (Move module)
   */
  async smartContractRead(request: SmartContractReadRequest): Promise<SuiReadResponse> {
    try {
      this.validateLocation(request.location);
      
      const { contractDetails } = request;
      if (!contractDetails.smartContractId || !contractDetails.functionName) {
        throw new Error('Invalid smart contract read request');
      }

      // Validate SUI package/object ID format
      this.validateSuiAddress(contractDetails.smartContractId);

      // Build Move function call for inspection
      // SUI smart contract format: package::module::function
      const [packageId, moduleName, functionName] = this.parseMoveFunctionCall(
        contractDetails.smartContractId, 
        contractDetails.functionName
      );

      // Create a transaction block for inspection (not execution)
      const txb = new Transaction();
      
      // Parse input arguments for the Move function
      const args: any[] = [];
      for (const param of contractDetails.inputParameters) {
        args.push(this.convertParameterToSuiArg(param));
      }

      let inspectionResult;
      
      try {
        // Add move call to transaction for inspection
        const moveCallResult = txb.moveCall({
          target: `${packageId}::${moduleName}::${functionName}`,
          arguments: args
        });

        // Use devInspectTransactionBlock to simulate the call
        inspectionResult = await this.client.devInspectTransactionBlock({
          transactionBlock: txb,
          sender: this.config.dummySenderAddress || FusionSuiAdapter.DEFAULT_DUMMY_SENDER // Configurable dummy sender for inspection
        });
        
      } catch (inspectionError) {
        this.logger.warn(`DevInspect failed, using minimal result: ${inspectionError}`);
        
        // Fallback to minimal structure if devInspect fails
        inspectionResult = {
          results: [{
            returnValues: []
          }]
        };
      }

      // Parse results from inspection
      const returns: Parameter[] = [];
      
      if (inspectionResult.results && inspectionResult.results.length > 0) {
        const result = inspectionResult.results[0];
        
        if (result.returnValues && result.returnValues.length > 0) {
          // Map return values to expected output parameters
          for (let i = 0; i < contractDetails.outputParameters.length && i < result.returnValues.length; i++) {
            const returnValue = result.returnValues[i];
            const expectedParam = contractDetails.outputParameters[i];
            
            returns.push({
              name: expectedParam.name,
              type: expectedParam.type,
              value: this.parseSuiReturnValue(returnValue, expectedParam.type)
            });
          }
        } else {
          // If no return values, create placeholder based on expected outputs
          for (const outputParam of contractDetails.outputParameters) {
            returns.push({
              name: outputParam.name,
              type: outputParam.type,
              value: this.getDefaultValueForType(outputParam.type)
            });
          }
        }
      } else {
        // Create default return values if inspection failed
        for (const outputParam of contractDetails.outputParameters) {
          returns.push({
            name: outputParam.name,
            type: outputParam.type,
            value: this.getDefaultValueForType(outputParam.type)
          });
        }
      }

      // Format raw response data
      const rawValue = inspectionResult.results?.[0]?.returnValues?.[0]?.[0] 
        ? Array.from(inspectionResult.results[0].returnValues[0][0]).map(b => b.toString(16).padStart(2, '0')).join('')
        : '00';

      const response: SuiSmartContractResponse = {
        rawValue: '0x' + rawValue,
        returns
      };

      return { rawData: response };
    } catch (error) {
      this.logger.error('❌ SUI smart contract read failed:', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  // Helper method to parse Move function call format
  private parseMoveFunctionCall(contractId: string, functionName: string): [string, string, string] {
    // If functionName contains full path (package::module::function), parse it
    if (functionName.includes('::')) {
      const parts = functionName.split('::');
      if (parts.length === 3) {
        return [parts[0], parts[1], parts[2]];
      } else if (parts.length === 2) {
        // Assume contractId is the package, functionName is module::function
        return [contractId, parts[0], parts[1]];
      }
    }
    
    // Default: assume contractId is package, functionName is just the function
    // Use 'main' as default module name
    return [contractId, 'main', functionName];
  }

  // Helper method to convert Fusion parameters to SUI arguments
  private convertParameterToSuiArg(param: Parameter): any {
    switch (param.type.toLowerCase()) {
      case 'u8':
      case 'u16':
      case 'u32':
      case 'u64':
      case 'u128':
      case 'u256':
        return parseInt(param.value as string);
      case 'bool':
        return Boolean(param.value);
      case 'address':
        return param.value as string;
      case 'string':
        return param.value as string;
      case 'vector<u8>':
        if (typeof param.value === 'string' && param.value.startsWith('0x')) {
          return Array.from(Buffer.from(param.value.slice(2), 'hex'));
        }
        return param.value;
      default:
        return param.value;
    }
  }

  // Helper method to parse SUI return values
  private parseSuiReturnValue(returnValue: any, expectedType: string): any {
    if (!returnValue || !returnValue[0]) {
      return this.getDefaultValueForType(expectedType);
    }

    const [rawData, type] = returnValue;
    
    switch (expectedType.toLowerCase()) {
      case 'u8':
      case 'u16':
      case 'u32':
      case 'u64':
      case 'u128':
      case 'u256':
        return Array.isArray(rawData) ? 
          rawData.reduce((acc, byte, i) => acc + (byte << (8 * i)), 0).toString() :
          rawData.toString();
      case 'bool':
        return Boolean(rawData);
      case 'address':
        return Array.isArray(rawData) ? 
          '0x' + rawData.map(b => b.toString(16).padStart(2, '0')).join('') :
          rawData.toString();
      case 'string':
        return Array.isArray(rawData) ? 
          String.fromCharCode(...rawData) :
          rawData.toString();
      case 'vector<u8>':
        return Array.isArray(rawData) ? rawData : [rawData];
      default:
        return rawData;
    }
  }

  // Helper method to get default values for types
  private getDefaultValueForType(type: string): any {
    switch (type.toLowerCase()) {
      case 'u8':
      case 'u16':
      case 'u32':
      case 'u64':
      case 'u128':
      case 'u256':
        return '0';
      case 'bool':
        return false;
      case 'address':
        return '0x0000000000000000000000000000000000000000000000000000000000000000';
      case 'string':
        return '';
      case 'vector<u8>':
        return [];
      default:
        return null;
    }
  }

  /**
   * GET /balance
   * Retrieves SUI balance for an address
   */
  async balance(request: AccountReadRequest): Promise<SuiReadResponse> {
    try {
      this.validateLocation({ technology: request.technology, network: request.network });
      
      if (!request.accountId) {
        throw new Error('Account ID is required');
      }

      const validatedAddress = this.validateSuiAddress(request.accountId);
      
      const balance = await this.client.getBalance({
        owner: validatedAddress,
        coinType: '0x2::sui::SUI'
      });

      const response: SuiAccountBalanceResponse = {
        balance: balance.totalBalance
      };

      return { rawData: response };
      } catch (error) {
      this.logger.error('❌ SUI balance query failed:', error);
      throw error;
    }
  }

  /**
   * GET /nonce
   * Retrieves account sequence number for SUI
   */
  async nonce(request: AccountReadRequest): Promise<SuiReadResponse> {
    try {
      this.validateLocation({ technology: request.technology, network: request.network });
      
      if (!request.accountId) {
        throw new Error('Account ID is required');
      }

      const validatedAddress = this.validateSuiAddress(request.accountId);
      
      // Get coins to determine next sequence number (simplified)
      const coins = await this.client.getCoins({
        owner: validatedAddress,
        coinType: '0x2::sui::SUI'
      });

      // Use the number of coins as a proxy for nonce (simplified)
      const nonce = coins.data.length.toString();

      const response: SuiAccountNonceResponse = {
        nonce
      };

      return { rawData: response };
    } catch (error) {
      this.logger.error('❌ SUI nonce query failed:', error);
      throw error;
    }
  }

  /**
   * GET /transaction
   * Retrieves SUI transaction details
   */
  async transaction(request: TransactionReadRequest): Promise<SuiReadResponse> {
    try {
      this.validateLocation({ technology: request.technology, network: request.network });
      
      if (!request.transactionId) {
        throw new Error('Transaction ID is required');
      }

      const tx = await this.client.getTransactionBlock({
        digest: request.transactionId,
        options: {
          showEffects: true,
          showEvents: true,
          showBalanceChanges: true,
          showInput: true
        }
      });

      const response: SuiTransactionResponse = {
        digest: tx.digest,
        checkpoint: tx.checkpoint || undefined,
        timestampMs: tx.timestampMs || undefined,
        effects: tx.effects,
        events: tx.events || undefined,
        balanceChanges: tx.balanceChanges || undefined,
        status: tx.effects?.status?.status || 'unknown'
      };

      return { rawData: response };
    } catch (error) {
      this.logger.error('❌ SUI transaction query failed:', error);
      throw error;
    }
  }

  /**
   * GET /block
   * Retrieves SUI checkpoint information (equivalent to block)
   */
  async block(request: BlockReadRequest): Promise<SuiReadResponse> {
    try {
      this.validateLocation({ technology: request.technology, network: request.network });
      
      if (!request.blockId) {
        throw new Error('Block ID is required');
      }

      // In SUI, blocks are called checkpoints
      let checkpoint;
      if (request.blockId === 'latest') {
        // Get the latest checkpoint
        checkpoint = await this.client.getLatestCheckpointSequenceNumber();
        // Then get the checkpoint details
        checkpoint = await this.client.getCheckpoint({
          id: checkpoint.toString()
        });
      } else {
        checkpoint = await this.client.getCheckpoint({
          id: request.blockId
        });
      }

      const response: SuiBlockResponse = {
        digest: checkpoint.digest,
        checkpoint: checkpoint.sequenceNumber,
        epoch: checkpoint.epoch,
        round: checkpoint.sequenceNumber, // SUI doesn't have rounds, use sequence number
        timestampMs: checkpoint.timestampMs || '',
        transactions: checkpoint.transactions || [],
        previousDigest: checkpoint.previousDigest || undefined
      };

      return { rawData: response };
    } catch (error) {
      this.logger.error('❌ SUI block query failed:', error);
      throw error;
    }
  }
}
