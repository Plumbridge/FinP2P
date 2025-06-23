module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts',
    '**/?(*.)+(spec|test).js'
  ],
  transform: {
    '^.+\.ts$': ['ts-jest', {
      tsconfig: {
        project: './tests/tsconfig.json'
      }
    }]
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  reporters: [
    'default'
  ],
  bail: false,
  clearMocks: true,
  collectCoverage: false,
  displayName: {
    name: 'FinP2P Tests',
    color: 'blue'
  }
};