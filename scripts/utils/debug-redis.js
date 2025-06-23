const { FinP2PRouter } = require('./dist/router');
const { createLogger } = require('./dist/utils/logger');

const logger = createLogger('debug');

const config = {
  routerId: 'test-router',
  host: 'localhost',
  port: 0,
  redis: { url: 'redis://invalid:6379' },
  network: { peers: [] },
  ledgers: {},
  security: { privateKey: 'test-key' }
};

const router = new FinP2PRouter(config, logger);

router.start()
  .then(() => {
    console.log('Router started successfully - this should NOT happen');
    process.exit(0);
  })
  .catch(err => {
    console.log('Router failed to start as expected:', err.message);
    console.log('Error type:', err.constructor.name);
    process.exit(0);
  });