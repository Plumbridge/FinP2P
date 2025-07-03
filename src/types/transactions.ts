import { TransactionStatus } from './index';

/**
 * Represents a request to initiate a cross-ledger transfer
 */
export interface TransactionRequest {
  /**
   * Unique identifier for the transaction (optional, will be generated if not provided)
   */
  operationId?: string;
  
  /**
   * Source account identifier
   */
  fromAccount: string;
  
  /**
   * Destination account identifier
   */
  toAccount: string;
  
  /**
   * Asset identifier to transfer
   */
  assetId: string;
  
  /**
   * Amount to transfer
   */
  amount: bigint;
  
  /**
   * Optional metadata for the transaction
   */
  metadata?: {
    /**
     * External reference ID (e.g., invoice number)
     */
    reference?: string;
    
    /**
     * Human-readable description of the transfer
     */
    description?: string;
    
    /**
     * Optional tags for categorization
     */
    tags?: string[];
    
    /**
     * Any additional custom metadata
     */
    [key: string]: any;
  };
}

/**
 * Represents a ledger-specific transaction result
 */
export interface LedgerTransactionResult {
  /**
   * Operation ID for the transaction
   */
  operationId: string;
  
  /**
   * Transaction hash or ID on the specific ledger
   */
  transactionHash?: string;
  
  /**
   * Current status of the transaction
   */
  status: string;
  
  /**
   * Timestamp when the transaction was initiated
   */
  timestamp: string;
  
  /**
   * Any additional ledger-specific details
   */
  [key: string]: any;
}

/**
 * Represents the response for a cross-ledger transfer
 */
export interface TransactionResponse {
  /**
   * Unique identifier for the cross-ledger operation
   */
  operationId: string;
  
  /**
   * Overall status of the cross-ledger transaction
   */
  status: string;
  
  /**
   * Detailed information about the transactions on each ledger
   */
  details: {
    /**
     * Transaction details from the source ledger
     */
    from: LedgerTransactionResult;
    
    /**
     * Transaction details from the destination ledger
     */
    to: LedgerTransactionResult;
  };
}