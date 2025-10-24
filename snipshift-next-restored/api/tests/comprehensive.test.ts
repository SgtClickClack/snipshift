import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from '../graphql/schema.js';
import { resolvers } from '../graphql/resolvers.js';
import { context } from '../graphql/context.js';
import { db, connectDatabase, closeDatabase } from '../database/connection.js';
import { initializeRedis, closeRedis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

// Test utilities
export class TestUtils {
  static async createTestServer(): Promise<ApolloServer> {
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      context,
    });
    
    return server;
  }

  static async executeQuery(server: ApolloServer, query: string, variables?: any, token?: string) {
    const headers: any = {};
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }

    const result = await server.executeOperation(
      { query, variables },
      { req: { headers } }
    );

    return result;
  }

  static generateTestUser(overrides: any = {}) {
    return {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      displayName: 'Test User',
      roles: ['PROFESSIONAL'],
      currentRole: 'PROFESSIONAL',
      ...overrides,
    };
  }

  static generateTestJob(overrides: any = {}) {
    return {
      title: 'Test Job',
      description: 'This is a test job description',
      skillsRequired: ['haircut', 'styling'],
      payRate: 50.0,
      payType: 'hourly',
      location: {
        city: 'Test City',
        state: 'Test State',
        country: 'Test Country',
      },
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      startTime: '09:00',
      endTime: '17:00',
      hubId: 'test-hub-id',
      ...overrides,
    };
  }

  static async cleanupTestData() {
    try {
      // Clean up test data in reverse dependency order
      await db.execute('DELETE FROM applications WHERE professional_id LIKE \'test-%\'');
      await db.execute('DELETE FROM jobs WHERE hub_id LIKE \'test-%\'');
      await db.execute('DELETE FROM users WHERE email LIKE \'test-%@example.com\'');
      
      logger.info('Test data cleaned up successfully');
    } catch (error) {
      logger.error('Error cleaning up test data:', error);
    }
  }
}

// Test database setup
export class TestDatabase {
  static async setup() {
    try {
      await connectDatabase();
      logger.info('Test database connected');
    } catch (error) {
      logger.error('Failed to connect to test database:', error);
      throw error;
    }
  }

  static async teardown() {
    try {
      await TestUtils.cleanupTestData();
      await closeDatabase();
      logger.info('Test database disconnected');
    } catch (error) {
      logger.error('Error during test database teardown:', error);
    }
  }
}

// Test Redis setup
export class TestRedis {
  static async setup() {
    try {
      await initializeRedis();
      logger.info('Test Redis connected');
    } catch (error) {
      logger.warn('Redis not available for testing:', error);
    }
  }

  static async teardown() {
    try {
      await closeRedis();
      logger.info('Test Redis disconnected');
    } catch (error) {
      logger.error('Error during test Redis teardown:', error);
    }
  }
}

// Authentication tests
describe('Authentication', () => {
  let server: ApolloServer;

  beforeAll(async () => {
    await TestDatabase.setup();
    await TestRedis.setup();
    server = await TestUtils.createTestServer();
  });

  afterAll(async () => {
    await TestDatabase.teardown();
    await TestRedis.teardown();
  });

  beforeEach(async () => {
    await TestUtils.cleanupTestData();
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const testUser = TestUtils.generateTestUser();
      
      const mutation = `
        mutation Register($input: CreateUserInput!) {
          register(input: $input) {
            user {
              id
              email
              displayName
              roles
            }
            token
            refreshToken
          }
        }
      `;

      const result = await TestUtils.executeQuery(server, mutation, {
        input: testUser,
      });

      expect(result.body.kind).toBe('single');
      expect(result.body.singleResult.errors).toBeUndefined();
      expect(result.body.singleResult.data?.register.user.email).toBe(testUser.email);
      expect(result.body.singleResult.data?.register.token).toBeDefined();
    });

    it('should reject registration with invalid email', async () => {
      const testUser = TestUtils.generateTestUser({ email: 'invalid-email' });
      
      const mutation = `
        mutation Register($input: CreateUserInput!) {
          register(input: $input) {
            user {
              id
              email
            }
            token
          }
        }
      `;

      const result = await TestUtils.executeQuery(server, mutation, {
        input: testUser,
      });

      expect(result.body.kind).toBe('single');
      expect(result.body.singleResult.errors).toBeDefined();
      expect(result.body.singleResult.errors?.[0].extensions?.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with weak password', async () => {
      const testUser = TestUtils.generateTestUser({ password: 'weak' });
      
      const mutation = `
        mutation Register($input: CreateUserInput!) {
          register(input: $input) {
            user {
              id
              email
            }
            token
          }
        }
      `;

      const result = await TestUtils.executeQuery(server, mutation, {
        input: testUser,
      });

      expect(result.body.kind).toBe('single');
      expect(result.body.singleResult.errors).toBeDefined();
      expect(result.body.singleResult.errors?.[0].message).toContain('Password validation failed');
    });

    it('should reject duplicate email registration', async () => {
      const testUser = TestUtils.generateTestUser();
      
      const mutation = `
        mutation Register($input: CreateUserInput!) {
          register(input: $input) {
            user {
              id
              email
            }
            token
          }
        }
      `;

      // First registration should succeed
      await TestUtils.executeQuery(server, mutation, { input: testUser });

      // Second registration should fail
      const result = await TestUtils.executeQuery(server, mutation, { input: testUser });

      expect(result.body.kind).toBe('single');
      expect(result.body.singleResult.errors).toBeDefined();
      expect(result.body.singleResult.errors?.[0].message).toContain('User already exists');
    });
  });

  describe('User Login', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      testUser = TestUtils.generateTestUser();
      
      // Register user first
      const registerMutation = `
        mutation Register($input: CreateUserInput!) {
          register(input: $input) {
            user {
              id
              email
            }
            token
          }
        }
      `;

      const registerResult = await TestUtils.executeQuery(server, registerMutation, {
        input: testUser,
      });

      authToken = registerResult.body.singleResult.data?.register.token;
    });

    it('should login with valid credentials', async () => {
      const loginMutation = `
        mutation Login($email: String!, $password: String!) {
          login(email: $email, password: $password) {
            user {
              id
              email
              displayName
            }
            token
            refreshToken
          }
        }
      `;

      const result = await TestUtils.executeQuery(server, loginMutation, {
        email: testUser.email,
        password: testUser.password,
      });

      expect(result.body.kind).toBe('single');
      expect(result.body.singleResult.errors).toBeUndefined();
      expect(result.body.singleResult.data?.login.user.email).toBe(testUser.email);
      expect(result.body.singleResult.data?.login.token).toBeDefined();
    });

    it('should reject login with invalid password', async () => {
      const loginMutation = `
        mutation Login($email: String!, $password: String!) {
          login(email: $email, password: $password) {
            user {
              id
              email
            }
            token
          }
        }
      `;

      const result = await TestUtils.executeQuery(server, loginMutation, {
        email: testUser.email,
        password: 'wrongpassword',
      });

      expect(result.body.kind).toBe('single');
      expect(result.body.singleResult.errors).toBeDefined();
      expect(result.body.singleResult.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('should reject login with non-existent email', async () => {
      const loginMutation = `
        mutation Login($email: String!, $password: String!) {
          login(email: $email, password: $password) {
            user {
              id
              email
            }
            token
          }
        }
      `;

      const result = await TestUtils.executeQuery(server, loginMutation, {
        email: 'nonexistent@example.com',
        password: 'anypassword',
      });

      expect(result.body.kind).toBe('single');
      expect(result.body.singleResult.errors).toBeDefined();
      expect(result.body.singleResult.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
    });
  });
});

// Job management tests
describe('Job Management', () => {
  let server: ApolloServer;
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    await TestDatabase.setup();
    await TestRedis.setup();
    server = await TestUtils.createTestServer();
  });

  afterAll(async () => {
    await TestDatabase.teardown();
    await TestRedis.teardown();
  });

  beforeEach(async () => {
    await TestUtils.cleanupTestData();
    
    // Create authenticated user
    testUser = TestUtils.generateTestUser({ roles: ['HUB'], currentRole: 'HUB' });
    
    const registerMutation = `
      mutation Register($input: CreateUserInput!) {
        register(input: $input) {
          user {
            id
            email
          }
          token
        }
      }
    `;

    const registerResult = await TestUtils.executeQuery(server, registerMutation, {
      input: testUser,
    });

    authToken = registerResult.body.singleResult.data?.register.token;
  });

  describe('Job Creation', () => {
    it('should create a job successfully', async () => {
      const testJob = TestUtils.generateTestJob({ hubId: 'test-hub-id' });
      
      const mutation = `
        mutation CreateJob($input: CreateJobInput!) {
          createJob(input: $input) {
            id
            title
            description
            payRate
            status
            hub {
              id
              email
            }
          }
        }
      `;

      const result = await TestUtils.executeQuery(server, mutation, {
        input: testJob,
      }, authToken);

      expect(result.body.kind).toBe('single');
      expect(result.body.singleResult.errors).toBeUndefined();
      expect(result.body.singleResult.data?.createJob.title).toBe(testJob.title);
      expect(result.body.singleResult.data?.createJob.status).toBe('OPEN');
    });

    it('should reject job creation with invalid input', async () => {
      const invalidJob = {
        title: '', // Empty title should fail validation
        description: 'Test description',
        skillsRequired: ['haircut'],
        payRate: -10, // Negative pay rate should fail
        payType: 'hourly',
        location: { city: 'Test City', state: 'Test State', country: 'Test Country' },
        date: new Date().toISOString(),
        startTime: '09:00',
        endTime: '17:00',
        hubId: 'test-hub-id',
      };
      
      const mutation = `
        mutation CreateJob($input: CreateJobInput!) {
          createJob(input: $input) {
            id
            title
          }
        }
      `;

      const result = await TestUtils.executeQuery(server, mutation, {
        input: invalidJob,
      }, authToken);

      expect(result.body.kind).toBe('single');
      expect(result.body.singleResult.errors).toBeDefined();
      expect(result.body.singleResult.errors?.[0].extensions?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Job Queries', () => {
    it('should fetch jobs with filters', async () => {
      const query = `
        query GetJobs($filters: JobFilters) {
          jobs(filters: $filters) {
            jobs {
              id
              title
              description
              payRate
              status
            }
            totalCount
            hasNextPage
          }
        }
      `;

      const result = await TestUtils.executeQuery(server, query, {
        filters: {
          status: 'OPEN',
          payMin: 20,
          payMax: 100,
        },
      });

      expect(result.body.kind).toBe('single');
      expect(result.body.singleResult.errors).toBeUndefined();
      expect(result.body.singleResult.data?.jobs).toBeDefined();
      expect(Array.isArray(result.body.singleResult.data?.jobs.jobs)).toBe(true);
    });
  });
});

// Performance tests
describe('Performance', () => {
  let server: ApolloServer;

  beforeAll(async () => {
    await TestDatabase.setup();
    await TestRedis.setup();
    server = await TestUtils.createTestServer();
  });

  afterAll(async () => {
    await TestDatabase.teardown();
    await TestRedis.teardown();
  });

  it('should respond to health check within acceptable time', async () => {
    const start = Date.now();
    
    const query = `
      query HealthCheck {
        __typename
      }
    `;

    const result = await TestUtils.executeQuery(server, query);
    const duration = Date.now() - start;

    expect(result.body.kind).toBe('single');
    expect(result.body.singleResult.errors).toBeUndefined();
    expect(duration).toBeLessThan(1000); // Should respond within 1 second
  });

  it('should handle concurrent requests', async () => {
    const query = `
      query TestQuery {
        __typename
      }
    `;

    const promises = Array.from({ length: 10 }, () => 
      TestUtils.executeQuery(server, query)
    );

    const results = await Promise.all(promises);

    results.forEach(result => {
      expect(result.body.kind).toBe('single');
      expect(result.body.singleResult.errors).toBeUndefined();
    });
  });
});

// Security tests
describe('Security', () => {
  let server: ApolloServer;

  beforeAll(async () => {
    await TestDatabase.setup();
    await TestRedis.setup();
    server = await TestUtils.createTestServer();
  });

  afterAll(async () => {
    await TestDatabase.teardown();
    await TestRedis.teardown();
  });

  it('should reject requests with invalid tokens', async () => {
    const query = `
      query Me {
        me {
          id
          email
        }
      }
    `;

    const result = await TestUtils.executeQuery(server, query, {}, 'invalid-token');

    expect(result.body.kind).toBe('single');
    expect(result.body.singleResult.errors).toBeDefined();
    expect(result.body.singleResult.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
  });

  it('should sanitize user input', async () => {
    const maliciousInput = '<script>alert("xss")</script>';
    
    const mutation = `
      mutation Register($input: CreateUserInput!) {
        register(input: $input) {
          user {
            displayName
          }
        }
      }
    `;

    const result = await TestUtils.executeQuery(server, mutation, {
      input: TestUtils.generateTestUser({ displayName: maliciousInput }),
    });

    expect(result.body.kind).toBe('single');
    expect(result.body.singleResult.errors).toBeUndefined();
    expect(result.body.singleResult.data?.register.user.displayName).not.toContain('<script>');
  });
});

export { TestUtils, TestDatabase, TestRedis };
