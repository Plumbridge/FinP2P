import { Router } from 'express';
import { getRouterInfo } from '../controllers/info';

const router = Router();

/**
 * @route GET /info
 * @description Get router information
 * @access Public
 */
router.get('/', getRouterInfo);

export default router;