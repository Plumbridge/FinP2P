/**
 * Health Controller
 * Handles health check operations
 */

const getHealth = (req, res) => {
  try {
    const healthResponse = {
      status: 'healthy',
      router: {
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
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      sdk: {
        nodeId: process.env.NODE_ID || 'local-node-001',
        custodianOrgId: process.env.CUSTODIAN_ORG_ID || 'local-custodian'
      }
    };

    res.json(healthResponse);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      error: 'Health check failed',
      message: error.message,
      code: 500,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  getHealth
};