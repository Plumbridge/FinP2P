/**
 * Router cleanup helper for tests
 * Ensures proper shutdown of router instances to prevent hanging tests
 */

import { FinP2PRouter } from '../../src/router/Router';

/**
 * Safely stop a router instance with timeout
 * @param router - The router instance to stop
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 */
export async function stopRouterSafely(router: FinP2PRouter | null, timeoutMs: number = 5000): Promise<void> {
  if (!router) {
    return;
  }

  try {
    // Check if router is running before attempting to stop
    if (router.isRunning && router.isRunning()) {
      let timeoutId: NodeJS.Timeout;

      // Create a timeout promise that resolves instead of rejecting
      const timeoutPromise = new Promise<string>((resolve) => {
        timeoutId = setTimeout(() => {
          console.warn(`Router stop timeout after ${timeoutMs}ms - continuing anyway`);
          resolve('timeout');
        }, timeoutMs);
      });

      // Race between router.stop() and timeout
      const result = await Promise.race([
        router.stop().then(() => {
          if (timeoutId) clearTimeout(timeoutId);
          return 'success';
        }).catch(err => {
          if (timeoutId) clearTimeout(timeoutId);
          console.warn('Router stop error:', err);
          return 'error';
        }),
        timeoutPromise
      ]);

      if (result === 'timeout' || result === 'error') {
        console.warn('Router stop did not complete cleanly, but continuing...');
      }
    }
  } catch (error) {
    console.warn('Warning: Router stop failed:', error);
    // Don't throw - we want tests to continue even if cleanup fails
  }
}

/**
 * Stop multiple routers safely
 * @param routers - Array of router instances to stop
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 */
export async function stopRoutersSafely(routers: (FinP2PRouter | null)[], timeoutMs: number = 5000): Promise<void> {
  const stopPromises = routers.map(router => stopRouterSafely(router, timeoutMs));
  await Promise.allSettled(stopPromises);
}

/**
 * Create a cleanup function for use in afterEach/afterAll hooks
 * @param getRouter - Function that returns the router instance
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 */
export function createRouterCleanup(getRouter: () => FinP2PRouter | null, timeoutMs: number = 5000) {
  return async () => {
    await stopRouterSafely(getRouter(), timeoutMs);
  };
}

/**
 * Create a cleanup function for multiple routers
 * @param getRouters - Function that returns array of router instances
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 */
export function createRoutersCleanup(getRouters: () => (FinP2PRouter | null)[], timeoutMs: number = 5000) {
  return async () => {
    await stopRoutersSafely(getRouters(), timeoutMs);
  };
}