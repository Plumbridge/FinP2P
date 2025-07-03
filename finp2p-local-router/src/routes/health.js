const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health');

/**
 * @route GET /health
 * @description Health check endpoint
 * @access Public
 */
router.get('/', healthController.getHealth);

module.exports = router;