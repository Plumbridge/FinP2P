import { Router } from 'express';
import { getHealth } from '../controllers/health';

const router = Router();

/**
 * @route GET /health
 * @description Health check endpoint
 * @access Public
 */
router.get('/', getHealth);

export default router;