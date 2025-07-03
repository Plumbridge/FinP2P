/**
 * Info Controller
 * Handles router information operations
 */

import { Request, Response } from 'express';

export const getRouterInfo = (req: Request, res: Response) => {
  try {
    const routerInfo = {
      id: process.env.ROUTER_ID || 'local-router-001',
      name: process.env.ROUTER_NAME || 'Local FinP2P Router',
      institutionId: process.env.INSTITUTION_ID || 'local-institution',
      endpoint: `http://localhost:${process.env.PORT || 3000}`,
      publicKey: process.env.PUBLIC_KEY || '',
      supportedLedgers: ['ethereum', 'sui', 'hedera'],
      status: 'online',
      lastSeen: new Date().toISOString(),
      metadata: {
        version: '1.0.0',
        capabilities: ['transfer', 'routing', 'asset_creation'],
        institution: {
          name: process.env.INSTITUTION_NAME || 'Local Institution',
          country: process.env.INSTITUTION_COUNTRY || 'US'
        }
      }
    };

    res.json(routerInfo);
  } catch (error) {
    console.error('Router info error:', error);
    res.status(500).json({
      error: 'Failed to get router info',
      message: error.message,
      code: 500,
      timestamp: new Date().toISOString()
    });
  }
};