import { Router, Request, Response } from 'express';
import { getTransfers, getTransferById, createTransfer, updateTransfer, cancelTransfer } from '../controllers/transfers';

const router = Router();

// GET /transfers - Get all transfers
router.get('/', getTransfers);

// GET /transfers/:id - Get transfer by ID
router.get('/:id', getTransferById);

// POST /transfers - Create new transfer
router.post('/', createTransfer);

// PUT /transfers/:id - Update transfer
router.put('/:id', updateTransfer);

// DELETE /transfers/:id - Cancel transfer
router.delete('/:id', cancelTransfer);

// POST /transfers/:id/cancel - Cancel transfer
router.post('/:id/cancel', (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({
    transferId: id,
    status: 'cancelled',
    message: 'Transfer cancellation endpoint - implementation pending',
    timestamp: new Date().toISOString()
  });
});

export default router;