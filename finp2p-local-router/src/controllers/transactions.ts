import { FinP2PCore } from '@finp2p/core';
import { HederaAdapter } from '@finp2p/core/adapters/HederaAdapter';
import { SuiAdapter } from '@finp2p/core/adapters/SuiAdapter';
import { createLogger } from '@finp2p/core/utils/logger';
import { Request, Response } from 'express';

// Initialize logger
const logger = createLogger('TransactionsController');

// Initialize adapters with configuration
const hederaConfig = {
  network: process.env.HEDERA_NETWORK || 'testnet',
  operatorId: process.env.HEDERA_OPERATOR_ID || '0.0.123456',
  operatorKey: process.env.HEDERA_OPERATOR_KEY || 'your-private-key-here',
  treasuryId: process.env.HEDERA_TREASURY_ID || '0.0.123456',
  treasuryKey: process.env.HEDERA_TREASURY_KEY || 'your-treasury-key-here'
};

const suiConfig = {
  network: process.env.SUI_NETWORK || 'testnet',
  privateKey: process.env.SUI_PRIVATE_KEY || 'your-sui-private-key-here',
  packageId: process.env.SUI_PACKAGE_ID || '0x1234567890abcdef'
};

// Initialize adapters
const hedera = new HederaAdapter(hederaConfig, logger);
const sui = new SuiAdapter(suiConfig, logger);

// Initialize FinP2P Core
const core = new FinP2PCore(hedera, sui);

/**
 * Initiate a cross-ledger transaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function initiateTransaction(req, res) {
  try {
    logger.info('Initiating cross-ledger transaction', { body: req.body });
    
    // Validate request body
    const { fromAccount, toAccount, assetId, amount } = req.body;
    
    if (!fromAccount || !toAccount || !assetId || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: fromAccount, toAccount, assetId, amount'
      });
    }
    
    // Initiate the transfer using FinP2P Core
    const receipt = await core.initiateTransfer(req.body);
    
    logger.info('Transaction initiated successfully', { operationId: receipt.operationId });
    res.status(200).json(receipt);
  } catch (err) {
    logger.error('Failed to initiate transaction', { error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get the status of a cross-ledger transaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getTransactionStatus(req, res) {
  try {
    const { operationId } = req.params;
    
    if (!operationId) {
      return res.status(400).json({
        error: 'Missing operationId parameter'
      });
    }
    
    logger.info('Getting transaction status', { operationId });
    
    const status = await core.getTransferStatus(operationId);
    
    res.status(200).json(status);
  } catch (err) {
    logger.error('Failed to get transaction status', { error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get transaction history
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getTransactionHistory(req, res) {
  try {
    // This is a placeholder implementation
    // In a real system, this would query a database or transaction log
    res.status(200).json({
      message: 'Transaction history endpoint - implementation pending',
      transactions: []
    });
  } catch (err) {
    logger.error('Failed to get transaction history', { error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  initiateTransaction,
  getTransactionStatus,
  getTransactionHistory
};