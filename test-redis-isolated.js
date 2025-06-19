const { FinP2PRouter } = require('./dist/router/Router');
const { createLogger } = require('./dist/utils/Logger');

const logger = createLogger('test', 'error');

const config = {
  routerId: 'test-router',
  port: 0,
  redis: {
    url: 'redis://invalid:6379'
  },
  network: {
    peers: [],
    maxConnections: 10,
    connectionTimeout: 5000
  },
  security: {
    enableAuth: false,
    jwtSecret: 'test-secret',
    encryptionKey: 'test-encryption-key-32-chars!!',
    privateKey: 'test-key',
    rateLimitWindow: 900000,
    rateLimitMax: 100
  },
  ledgers: {
    bitcoin: { enabled: false },
    ethereum: { enabled: false },
    stellar: { enabled: false }
  },
  monitoring: {
    enabled: false
  }
};

async function testRouter() {
  const router = new FinP2PRouter(config, logger);
  
  try {
    console.log('Starting router...');
    await router.start();
    console.log('Router started successfully - THIS SHOULD NOT HAPPEN');
    return 'resolved';
  } catch (error) {
    console.log('Router failed to start as expected:', error.message);
    console.log('Error type:', error.constructor.name);
    return 'rejected';
  }
}

testRouter().then(result => {
  console.log('Test result:', result);
  process.exit(result === 'rejected' ? 0 : 1);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});