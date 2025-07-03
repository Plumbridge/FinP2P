const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');

/**
 * @route POST /auth/login
 * @description Authenticate a user and get a token
 * @access Public
 */
router.post('/login', authController.login);

/**
 * @route POST /auth/token
 * @description Get a new access token using a refresh token
 * @access Public
 */
router.post('/token', authController.refreshToken);

/**
 * @route POST /auth/logout
 * @description Logout a user and invalidate their tokens
 * @access Private
 */
router.post('/logout', authController.logout);

/**
 * @route GET /auth/verify
 * @description Verify a token is valid
 * @access Public
 */
router.get('/verify', authController.verifyToken);

module.exports = router;