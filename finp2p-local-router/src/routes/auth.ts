import { Router } from 'express';
import { login, refreshToken, logout, verifyToken } from '../controllers/auth';

const router = Router();

/**
 * @route POST /auth/login
 * @description Authenticate a user and get a token
 * @access Public
 */
router.post('/login', login);

/**
 * @route POST /auth/token
 * @description Get a new access token using a refresh token
 * @access Public
 */
router.post('/token', refreshToken);

/**
 * @route POST /auth/logout
 * @description Logout a user and invalidate their tokens
 * @access Private
 */
router.post('/logout', logout);

/**
 * @route GET /auth/verify
 * @description Verify a token is valid
 * @access Public
 */
router.get('/verify', verifyToken);

export default router;