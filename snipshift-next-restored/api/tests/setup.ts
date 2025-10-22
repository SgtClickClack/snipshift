import { jest } from '@jest/globals';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/snipshift_test';

// Mock Redis for tests
jest.mock('../src/config/redis.ts', () => ({
  initializeRedis: jest.fn().mockResolvedValue(undefined),
  getRedis: jest.fn().mockReturnValue({
    publish: jest.fn().mockResolvedValue(1),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  }),
  closeRedis: jest.fn().mockResolvedValue(undefined),
}));

// Mock Winston logger
jest.mock('../src/utils/logger.ts', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Global test utilities
global.testUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  roles: ['client'],
  currentRole: 'client',
};

global.testAuthHeader = 'Bearer test-jwt-token';

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Clean up after all tests
afterAll(async () => {
  // Close any open connections
  jest.restoreAllMocks();
});
