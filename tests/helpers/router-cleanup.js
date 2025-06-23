"use strict";
/**
 * Router cleanup helper for tests
 * Ensures proper shutdown of router instances to prevent hanging tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoutersCleanup = exports.createRouterCleanup = exports.stopRoutersSafely = exports.stopRouterSafely = void 0;
/**
 * Safely stop a router instance with timeout
 * @param router - The router instance to stop
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 */
async function stopRouterSafely(router, timeoutMs = 5000) {
    if (!router) {
        return;
    }
    try {
        // Check if router is running before attempting to stop
        if (router.isRunning && router.isRunning()) {
            let timeoutId;
            // Create a timeout promise that resolves instead of rejecting
            const timeoutPromise = new Promise((resolve) => {
                timeoutId = setTimeout(() => {
                    console.warn(`Router stop timeout after ${timeoutMs}ms - continuing anyway`);
                    resolve('timeout');
                }, timeoutMs);
            });
            // Race between router.stop() and timeout
            const result = await Promise.race([
                router.stop().then(() => {
                    clearTimeout(timeoutId);
                    return 'success';
                }).catch(err => {
                    clearTimeout(timeoutId);
                    console.warn('Router stop error:', err);
                    return 'error';
                }),
                timeoutPromise
            ]);
            
            // Clear timeout if it hasn't fired yet
            if (timeoutId && result !== 'timeout') {
                clearTimeout(timeoutId);
            }
            
            if (result === 'timeout' || result === 'error') {
                console.warn('Router stop did not complete cleanly, but continuing...');
            }
        }
    }
    catch (error) {
        console.warn('Warning: Router stop failed:', error);
        // Don't throw - we want tests to continue even if cleanup fails
    }
}
exports.stopRouterSafely = stopRouterSafely;
/**
 * Stop multiple routers safely
 * @param routers - Array of router instances to stop
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 */
async function stopRoutersSafely(routers, timeoutMs = 5000) {
    const stopPromises = routers.map(router => stopRouterSafely(router, timeoutMs));
    await Promise.allSettled(stopPromises);
}
exports.stopRoutersSafely = stopRoutersSafely;
/**
 * Create a cleanup function for use in afterEach/afterAll hooks
 * @param getRouter - Function that returns the router instance
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 */
function createRouterCleanup(getRouter, timeoutMs = 5000) {
    return async () => {
        await stopRouterSafely(getRouter(), timeoutMs);
    };
}
exports.createRouterCleanup = createRouterCleanup;
/**
 * Create a cleanup function for multiple routers
 * @param getRouters - Function that returns array of router instances
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 */
function createRoutersCleanup(getRouters, timeoutMs = 5000) {
    return async () => {
        await stopRoutersSafely(getRouters(), timeoutMs);
    };
}
exports.createRoutersCleanup = createRoutersCleanup;
//# sourceMappingURL=router-cleanup.js.map