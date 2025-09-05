// Load environment variables from .env file
require('dotenv').config();

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/testing/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    '<rootDir>/dist/**/*.js',
    '!<rootDir>/dist/**/*.d.ts',
    '!<rootDir>/dist/**/__tests__/**',
    '!<rootDir>/dist/**/node_modules/**',
  ],
  // setupFilesAfterEnv: ['<rootDir>/testing/tests/jest-simple-setup.js'],
  testTimeout: 60000, // 60 seconds for comprehensive tests
  verbose: true,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/dist/$1',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
  ],
};
