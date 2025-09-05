/**
 * Jest Configuration for Real Adapter Tests
 * 
 * Standalone configuration for testing enterprise blockchain adapters
 * No dependency on main project build or FinP2P router
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest-real-adapters-setup.js'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 300000, // Increased to 5 minutes for Cactus test ledger initialization
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      statements: 70, // Realistic for adapter/integration code
      branches: 55,   // Error paths hard to test
      functions: 60,  // Some functions are utilities/fallbacks
      lines: 70       // Realistic for adapter/integration code
    }
  },
  clearMocks: true,
  restoreMocks: true,
  resetModules: true,
  testPathIgnorePatterns: ['/node_modules/', '/dist/']
};
