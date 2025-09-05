module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/testing/tests/**/*.test.js'],
  testTimeout: 30000, // 30 seconds
  verbose: true,
  collectCoverageFrom: [
    '**/testing/tests/**/*.js',
    '!**/node_modules/**',
  ],
};
