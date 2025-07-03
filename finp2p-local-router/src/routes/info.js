const express = require('express');
const router = express.Router();
const infoController = require('../controllers/info');

/**
 * @route GET /info
 * @description Get router information
 * @access Public
 */
router.get('/', infoController.getRouterInfo);

module.exports = router;