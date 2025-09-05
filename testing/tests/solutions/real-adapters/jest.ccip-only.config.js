module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/ccip-transaction-test.ts'],
    setupFilesAfterEnv: ['./jest-real-adapters-setup.js'],
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    testTimeout: 30000,
    clearMocks: true,
    restoreMocks: true,
    coverageThreshold: {
        global: {
            statements: 70,
            branches: 55,
            functions: 60,
            lines: 70
        }
    }
};
