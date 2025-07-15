module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.test.js'],

  transform: {
    '^.+\.[tj]sx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowJs: true,
      },
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@mysten/sui/transactions$': '<rootDir>/tests/__mocks__/@mysten/sui/transactions.js'
  },
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  testTimeout: 15000,
  bail: false,
  detectOpenHandles: true,
  forceExit: true,
  setupFiles: ['<rootDir>/tests/jest-env-setup.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};