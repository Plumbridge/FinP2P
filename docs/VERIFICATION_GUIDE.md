# Testing Verification Guide

This guide provides step-by-step verification commands to ensure your Docker-based Redis testing setup is working correctly.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ installed
- All dependencies installed (`npm install`)

## Verification Steps

### Step 1: Clear Jest Cache

Clear any existing Jest cache to ensure clean test runs:

```bash
npx jest --clearCache
```

### Step 2: Start Redis for Testing

Start the Redis service using Docker Compose:

```bash
docker-compose -f docker-compose.test.yml up -d
```

Verify Redis is running:

```bash
docker-compose -f docker-compose.test.yml ps
```

### Step 3: Run Tests with Verbose Output

Run all tests with detailed output and handle detection:

```bash
npm test -- --verbose --detectOpenHandles
```

### Step 4: Run Individual Test Files

If specific tests fail, run them individually for debugging:

```bash
# Run confirmation tests
npx jest tests/confirmation/ConfirmationRecordManager.test.ts --verbose

# Run router tests
npx jest tests/router/Router.test.ts --verbose

# Run integration tests
npx jest tests/integration/RouterIntegration.test.ts --verbose
```

### Step 5: Check for Hanging Tests

Run tests with handle detection and force exit:

```bash
npm test -- --detectOpenHandles --forceExit
```

### Step 6: Run Coverage Tests

Generate test coverage reports:

```bash
npm run test:coverage
```

### Step 7: Watch Mode for Development

Run tests in watch mode during development:

```bash
npm run test:watch
```

## Troubleshooting

### Redis Connection Issues

If tests fail with Redis connection errors:

1. Check Redis container status:
   ```bash
   docker-compose -f docker-compose.test.yml logs redis
   ```

2. Verify Redis is accessible:
   ```bash
   docker exec -it project-files-redis-test-1 redis-cli ping
   ```

3. Check port availability:
   ```bash
   netstat -an | findstr 6379
   ```

### Test Timeout Issues

If tests timeout:

1. Increase timeout in individual tests:
   ```javascript
   test('test name', async () => {
     // test code
   }, 15000); // 15 second timeout
   ```

2. Check for hanging processes:
   ```bash
   npm test -- --detectOpenHandles --verbose
   ```

### Memory Issues

If tests fail due to memory:

1. Run tests with increased memory:
   ```bash
   node --max-old-space-size=4096 ./node_modules/.bin/jest
   ```

2. Run tests in sequence:
   ```bash
   npm test -- --runInBand
   ```

## Cleanup

After testing, clean up resources:

```bash
# Stop and remove test containers
npm run test:teardown

# Or manually
docker-compose -f docker-compose.test.yml down -v
```

## CI/CD Verification

The GitHub Actions workflow will automatically:

1. Start a Redis service
2. Install dependencies
3. Build the project
4. Run all tests
5. Clean up resources

Check the Actions tab in your GitHub repository to verify CI/CD pipeline execution.

## Performance Tips

1. **Parallel Execution**: Tests run in parallel by default for faster execution
2. **Resource Cleanup**: Router cleanup helpers prevent resource leaks
3. **Docker Health Checks**: Ensure Redis is ready before tests start
4. **Timeout Management**: Proper timeouts prevent hanging tests

## Success Indicators

✅ All tests pass without timeout errors  
✅ No hanging processes detected  
✅ Redis connections are properly closed  
✅ Router instances are cleanly shutdown  
✅ Coverage reports generate successfully  
✅ CI/CD pipeline completes successfully  

## Next Steps

After successful verification:

1. Commit all changes to version control
2. Push to trigger CI/CD pipeline
3. Monitor test execution in GitHub Actions
4. Update documentation as needed