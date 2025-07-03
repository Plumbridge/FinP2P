const express = require('express');
const transactionsController = require('../controllers/transactions');

const router = express.Router();

/**
 * @swagger
 * /api/transactions/initiate:
 *   post:
 *     summary: Initiate a cross-ledger transaction
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromAccount
 *               - toAccount
 *               - assetId
 *               - amount
 *             properties:
 *               operationId:
 *                 type: string
 *                 description: Optional operation ID (will be generated if not provided)
 *               fromAccount:
 *                 type: string
 *                 description: Source account identifier
 *               toAccount:
 *                 type: string
 *                 description: Destination account identifier
 *               assetId:
 *                 type: string
 *                 description: Asset identifier to transfer
 *               amount:
 *                 type: string
 *                 description: Amount to transfer (as string to handle large numbers)
 *               metadata:
 *                 type: object
 *                 description: Additional metadata for the transfer
 *     responses:
 *       200:
 *         description: Transaction initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 operationId:
 *                   type: string
 *                 status:
 *                   type: string
 *                 details:
 *                   type: object
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/initiate', transactionsController.initiateTransaction);

/**
 * @swagger
 * /api/transactions/status/{operationId}:
 *   get:
 *     summary: Get the status of a cross-ledger transaction
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: operationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The operation ID of the transaction
 *     responses:
 *       200:
 *         description: Transaction status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [pending, completed, failed]
 *                 details:
 *                   type: object
 *                   properties:
 *                     hedera:
 *                       type: string
 *                     sui:
 *                       type: string
 *       400:
 *         description: Bad request - missing operationId
 *       500:
 *         description: Internal server error
 */
router.get('/status/:operationId', transactionsController.getTransactionStatus);

/**
 * @swagger
 * /api/transactions/history:
 *   get:
 *     summary: Get transaction history
 *     tags: [Transactions]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of transactions to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of transactions to skip
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactions:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Internal server error
 */
router.get('/history', transactionsController.getTransactionHistory);

module.exports = router;