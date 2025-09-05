import { createServer } from 'net';

/**
 * Find an available port starting from a given port number
 * @param startPort - Starting port to check from
 * @param maxAttempts - Maximum number of ports to try
 * @returns Promise<number> - Available port number
 */
export async function findAvailablePort(startPort: number = 6380, maxAttempts: number = 100): Promise<number> {
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found in range ${startPort}-${startPort + maxAttempts}`);
}

/**
 * Check if a specific port is available
 * @param port - Port number to check
 * @returns Promise<boolean> - True if port is available
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.listen(port, () => {
      server.close(() => {
        resolve(true);
      });
    });

    server.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Get a random port in a safe range (avoiding well-known ports)
 * @param min - Minimum port number (default: 49152)
 * @param max - Maximum port number (default: 65535)
 * @returns Promise<number> - Available random port
 */
export async function getRandomAvailablePort(min: number = 49152, max: number = 65535): Promise<number> {
  const maxAttempts = 50;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = Math.floor(Math.random() * (max - min + 1)) + min;
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  // Fallback to sequential search if random fails
  return findAvailablePort(min, max - min);
}

/**
 * Generate Redis URL with dynamic port
 * @param host - Redis host (default: localhost)
 * @param startPort - Starting port to search from (default: 6380)
 * @returns Promise<{url: string, port: number}> - Redis URL and port
 */
export async function generateRedisUrl(host: string = 'localhost', startPort: number = 6380): Promise<{url: string, port: number}> {
  const port = await findAvailablePort(startPort);
  return {
    url: `redis://${host}:${port}`,
    port
  };
}
