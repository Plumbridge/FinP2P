import { HederaAdapter } from "../adapters/HederaAdapter";
import { SuiAdapter } from "../adapters/SuiAdapter";
import type { TransactionRequest, TransactionResponse } from "../types/index";
import { TransactionStatus } from "../types";

/**
 * FinP2P Core orchestration module
 * Coordinates cross-ledger transfers between different blockchain adapters
 */
export class FinP2PCore {
  constructor(
    private hedera: HederaAdapter,
    private sui: SuiAdapter,
  ) {}

  /**
   * Initiates a cross-ledger transfer
   * @param req - Transaction request containing transfer details
   * @returns Promise resolving to transaction response
   */
  async initiateTransfer(req: TransactionRequest): Promise<TransactionResponse> {
    try {
      // 1) Validate certificates/KYA (omit here for now)
      // TODO: Implement certificate and KYA validation
      
      // 2) Call into the "from" ledger
      const fromTx = await this.hedera.createTransfer(req);
      
      // 3) Poll until fromTx is final
      await this.hedera.getTransactionStatus(fromTx.operationId);
      
      // 4) Call "to" ledger
      const toTx = await this.sui.createTransfer({
        ...req,
        operationId: fromTx.operationId,
      });
      
      // 5) Return a combined receipt
      return {
        operationId: fromTx.operationId,
        status: toTx.status,
        details: { from: fromTx, to: toTx }
      };
    } catch (error) {
      throw new Error(`Transfer initiation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets the status of a cross-ledger transfer
   * @param operationId - The operation ID to check
   * @returns Promise resolving to transaction status
   */
  async getTransferStatus(operationId: string): Promise<{ status: string; details?: any }> {
    try {
      // Check status on both ledgers
      const hederaStatus = await this.hedera.getTransactionStatus(operationId);
      const suiStatus = await this.sui.getTransactionStatus(operationId);
      
      // Map the transaction statuses to a combined status
      let status = 'pending';
      if (hederaStatus === TransactionStatus.CONFIRMED && suiStatus === TransactionStatus.CONFIRMED) {
        status = 'completed';
      } else if (hederaStatus === TransactionStatus.FAILED || suiStatus === TransactionStatus.FAILED) {
        status = 'failed';
      }
      
      return {
        status,
        details: {
          hedera: hederaStatus,
          sui: suiStatus
        }
      };
    } catch (error) {
      throw new Error(`Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}