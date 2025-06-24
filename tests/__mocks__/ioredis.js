// Mock for ioredis to prevent Redis connection issues in tests
const mockRedis = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue('OK'),
  disconnect: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  expire: jest.fn().mockResolvedValue(1),
  flushdb: jest.fn().mockResolvedValue('OK'),
  keys: jest.fn().mockResolvedValue([]),
  hget: jest.fn().mockResolvedValue(null),
  hset: jest.fn().mockResolvedValue(1),
  hdel: jest.fn().mockResolvedValue(1),
  hgetall: jest.fn().mockResolvedValue({}),
  lpush: jest.fn().mockResolvedValue(1),
  rpop: jest.fn().mockResolvedValue(null),
  llen: jest.fn().mockResolvedValue(0),
  publish: jest.fn().mockResolvedValue(0),
  subscribe: jest.fn().mockResolvedValue(undefined),
  unsubscribe: jest.fn().mockResolvedValue(undefined),
  isOpen: true,
  status: 'ready',
  readyState: 'ready'
};

module.exports = jest.fn(() => mockRedis);