import { Router, Request, Response } from 'express';
import { getAssets, getAssetById, createAsset, updateAsset, deleteAsset } from '../controllers/assets';

const router = Router();

// GET /assets - Get all assets
router.get('/', getAssets);

// GET /assets/:id - Get asset by ID
router.get('/:id', getAssetById);

// GET /assets/:id/balance - Get asset balance
router.get('/:id/balance', (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({
    balance: '0',
    message: `Asset ${id} balance endpoint - implementation pending`,
    timestamp: new Date().toISOString()
  });
});

// POST /assets - Create new asset
router.post('/', createAsset);

// PUT /assets/:id - Update asset
router.put('/:id', updateAsset);

// DELETE /assets/:id - Delete asset
router.delete('/:id', deleteAsset);

export default router;