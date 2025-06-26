module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.test.js'],
  setupFiles: ['<rootDir>/tests/jest-env-setup.js'],
  transform: {
    '^.+\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowJs: true,
      },
    }],
    '^.+\.js$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  testTimeout: 15000,
  bail: false,
  detectOpenHandles: true,
  forceExit: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};