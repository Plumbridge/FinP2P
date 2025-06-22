# Testing Setup Guide

This guide explains how to set up and run tests for the FinP2P implementation with Docker-based Redis.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ installed
- npm or yarn package manager

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Tests with Docker Redis
```bash
# Run all tests (automatically starts/stops Redis)
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (Redis stays running)
npm run test:watch
```

### 3. Manual Redis Management
```bash
# Start Redis container manually
npm run test:setup

# Stop Redis container
npm run test:teardown
```

## Docker Configuration

The test setup uses `docker-compose.test.yml` which provides:

- **Redis 7 Alpine**: Lightweight Redis instance
- **Port 6379**: Standard Redis port
- **Persistent Storage**: Uses appendonly mode
- **Health Checks**: Ensures Redis is ready before tests
- **16 Databases**: Multiple databases for test isolation

## Test Scripts

| Script | Description |
|--------|-------------|
| `npm test` | Run all tests with automatic Redis setup/teardown |
| `npm run test:watch` | Run tests in watch mode with Redis |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:setup` | Start Redis container only |
| `npm run test:teardown` | Stop Redis container only |

## Test Configuration

### Timeouts
- **Global timeout**: 10 seconds (configurable in `jest.config.js`)
- **Individual test timeout**: Can be set per test using `jest.setTimeout()`
- **Router cleanup timeout**: 5 seconds (configurable in router cleanup helper)

### Environment Variables
- `TEST_REDIS_URL`: Redis connection URL (default: `redis://localhost:6379`)
- `NODE_ENV`: Set to `test` automatically
- `LOG_LEVEL`: Set to `error` to reduce test noise

## Test Structure

### Real Redis Integration
All tests now use real Redis instances instead of mocks:

```typescript
import { createTestRedisClient, cleanupRedis, closeRedisConnection } from '../helpers/redis';
import { stopRouterSafely } from '../helpers/router-cleanup';

describe('My Test Suite', () => {
  let redisClient: RedisClientType;
  let router: FinP2PRouter;

  beforeAll(async () => {
    redisClient = await createTestRedisClient();
  });

  beforeEach(async () => {
    await cleanupRedis(redisClient);
  });

  afterEach(async () => {
    await stopRouterSafely(router);
  });

  afterAll(async () => {
    await closeRedisConnection(redisClient);
  });
});
```

### Router Cleanup
Use the router cleanup helper to prevent hanging tests:

```typescript
import { stopRouterSafely, stopRoutersSafely } from '../helpers/router-cleanup';

// Single router
afterEach(async () => {
  await stopRouterSafely(router);
});

// Multiple routers
afterAll(async () => {
  await stopRoutersSafely([router1, router2, router3]);
});
```

## Troubleshooting

### Tests Hanging
If tests hang or don't exit properly:

1. **Check Redis connection**: Ensure Redis container is running
2. **Verify cleanup**: Make sure all routers are stopped in `afterEach`/`afterAll`
3. **Clear timers**: Use `jest.clearAllTimers()` in cleanup
4. **Force exit**: Use `--forceExit` flag in Jest

### Redis Connection Issues
```bash
# Check if Redis container is running
docker ps

# View Redis logs
docker-compose -f docker-compose.test.yml logs redis-test

# Restart Redis container
npm run test:teardown && npm run test:setup
```

### Port Conflicts
If port 6379 is already in use:

1. Stop existing Redis instances
2. Modify `docker-compose.test.yml` to use different port
3. Update `TEST_REDIS_URL` environment variable

### Memory Issues
```bash
# Clean up Docker resources
docker system prune

# Remove test containers
docker-compose -f docker-compose.test.yml down --volumes
```

## Performance Tips

1. **Use `--runInBand`**: Tests run sequentially to avoid Redis conflicts
2. **Cleanup between tests**: Use `cleanupRedis()` in `beforeEach`
3. **Timeout management**: Set appropriate timeouts for slow operations
4. **Resource cleanup**: Always stop routers and close Redis connections

## CI/CD Integration

For continuous integration:

```yaml
# Example GitHub Actions step
- name: Run tests
  run: |
    npm ci
    npm test
```

The Docker setup ensures consistent test environments across different machines and CI systems.