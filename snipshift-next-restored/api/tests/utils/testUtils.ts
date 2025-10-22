import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from '../../src/graphql/schema.js';
import { resolvers } from '../../src/graphql/resolvers.js';
import { context } from '../../src/graphql/context.js';
import { Request, Response } from 'express';

export interface TestContext {
  user?: {
    id: string;
    email: string;
    roles: string[];
    currentRole?: string;
  };
}

export function createMockRequest(user?: TestContext['user']): Request {
  const req = {
    headers: {},
    body: {},
    query: {},
    params: {},
    get: jest.fn(),
    res: {} as Response,
  } as Request;

  if (user) {
    req.headers.authorization = `Bearer mock-jwt-token-${user.id}`;
  }

  return req;
}

export function createMockResponse(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    getHeader: jest.fn(),
    headersSent: false,
  } as any;
}

export function createTestContext(user?: TestContext['user']) {
  const mockReq = createMockRequest(user);
  const mockRes = createMockResponse();

  return {
    req: mockReq,
    res: mockRes,
    user,
    db: {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
}

export async function createTestServer() {
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  const server = new ApolloServer({
    schema,
  });

  await server.start();
  return server;
}

export function generateTestUser(overrides = {}) {
  return {
    id: `user-${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    displayName: 'Test User',
    roles: ['client'],
    currentRole: 'client',
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function generateTestJob(overrides = {}) {
  return {
    id: `job-${Date.now()}`,
    title: 'Test Job',
    description: 'Test job description',
    skillsRequired: ['cutting', 'styling'],
    payRate: 25.00,
    payType: 'hourly',
    location: {
      city: 'Test City',
      state: 'Test State',
      country: 'Test Country',
    },
    date: new Date(),
    startTime: '09:00',
    endTime: '17:00',
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
