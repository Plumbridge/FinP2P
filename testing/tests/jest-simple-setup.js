/**
 * Simple Jest setup for standalone security/performance tests
 * No Redis or external dependencies required
 */

// Mock external dependencies for standalone testing
jest.mock('../../../dist/core/index', () => ({
  FinP2PSDKRouter: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    isRunning: true,
    getRouterInfo: jest.fn().mockReturnValue({ version: '1.0.0', status: 'running' })
  }))
}));

jest.mock('../../../dist/adapters/finp2p/index', () => ({
  FinP2PIntegratedSuiAdapter: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    transferByFinId: jest.fn().mockResolvedValue({
      success: true,
      txHash: 'mock-tx-hash',
      amount: 1000
    }),
    getBalance: jest.fn().mockResolvedValue(BigInt(1000000))
  })),
  FinP2PIntegratedHederaAdapter: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined)
  }))
}));

jest.mock('../../../dist/adapters/pure/index', () => ({
  SuiAdapter: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    getBalance: jest.fn().mockResolvedValue(BigInt(1000000))
  })),
  HederaAdapter: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined)
  }))
}));

// Set test timeout
jest.setTimeout(30000); // 30 seconds

console.log('🧪 Simple Jest setup loaded - standalone testing mode');
console.log('📝 External dependencies mocked for focused security/performance testing');
