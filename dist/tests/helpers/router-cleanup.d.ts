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
export declare function stopRouterSafely(router: FinP2PRouter | null, timeoutMs?: number): Promise<void>;
/**
 * Stop multiple routers safely
 * @param routers - Array of router instances to stop
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 */
export declare function stopRoutersSafely(routers: (FinP2PRouter | null)[], timeoutMs?: number): Promise<void>;
/**
 * Create a cleanup function for use in afterEach/afterAll hooks
 * @param getRouter - Function that returns the router instance
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 */
export declare function createRouterCleanup(getRouter: () => FinP2PRouter | null, timeoutMs?: number): () => Promise<void>;
/**
 * Create a cleanup function for multiple routers
 * @param getRouters - Function that returns array of router instances
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 */
export declare function createRoutersCleanup(getRouters: () => (FinP2PRouter | null)[], timeoutMs?: number): () => Promise<void>;
//# sourceMappingURL=router-cleanup.d.ts.map