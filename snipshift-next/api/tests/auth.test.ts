import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createTestServer, createTestContext, generateTestUser } from './utils/testUtils.js';
import { authResolvers } from '../src/graphql/resolvers/auth.js';

describe('Authentication Resolvers', () => {
  let testServer: any;
  let mockDb: any;

  beforeEach(async () => {
    testServer = await createTestServer();
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
  });

  afterEach(async () => {
    if (testServer) {
      await testServer.stop();
    }
    jest.clearAllMocks();
  });

  describe('register mutation', () => {
    it('should register a new user successfully', async () => {
      const testUser = generateTestUser();
      const input = {
        email: testUser.email,
        password: 'password123',
        displayName: testUser.displayName,
        roles: testUser.roles,
        currentRole: testUser.currentRole,
      };

      // Mock database responses
      mockDb.select.mockResolvedValue([]);
      mockDb.insert.mockResolvedValue([testUser]);

      const context = createTestContext();
      context.db = mockDb;

      const result = await authResolvers.Mutation.register(
        null,
        { input },
        context
      );

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(input.email);
      expect(result.user.roles).toEqual(input.roles);
    });

    it('should throw error for existing user', async () => {
      const existingUser = generateTestUser();
      const input = {
        email: existingUser.email,
        password: 'password123',
        displayName: existingUser.displayName,
        roles: existingUser.roles,
        currentRole: existingUser.currentRole,
      };

      // Mock existing user
      mockDb.select.mockResolvedValue([existingUser]);

      const context = createTestContext();
      context.db = mockDb;

      await expect(
        authResolvers.Mutation.register(null, { input }, context)
      ).rejects.toThrow('User already exists with this email');
    });

    it('should handle Google authentication', async () => {
      const googleUser = {
        email: 'google@example.com',
        name: 'Google User',
        googleId: 'google-id-123',
        picture: 'https://example.com/avatar.jpg',
      };

      const input = {
        googleId: googleUser.googleId,
        email: googleUser.email,
        displayName: googleUser.name,
        roles: ['client'],
      };

      // Mock no existing user
      mockDb.select.mockResolvedValue([]);
      mockDb.insert.mockResolvedValue([generateTestUser({
        email: googleUser.email,
        googleId: googleUser.googleId,
        displayName: googleUser.name,
      })]);

      const context = createTestContext();
      context.db = mockDb;

      const result = await authResolvers.Mutation.register(
        null,
        { input },
        context
      );

      expect(result.user.email).toBe(googleUser.email);
      expect(result.user.googleId).toBe(googleUser.googleId);
      expect(result.user.isVerified).toBe(true); // Google users are pre-verified
    });
  });

  describe('login mutation', () => {
    it('should login user with correct credentials', async () => {
      const testUser = generateTestUser();
      const loginInput = {
        email: testUser.email,
        password: 'correctpassword',
      };

      // Mock user exists and password is correct
      mockDb.select.mockResolvedValue([{
        ...testUser,
        password: '$2a$12$hashedpassword', // Mock hashed password
      }]);

      // Mock bcrypt compare to return true
      const bcrypt = await import('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const context = createTestContext();
      context.db = mockDb;

      const result = await authResolvers.Mutation.login(
        null,
        loginInput,
        context
      );

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(testUser.email);
    });

    it('should throw error for non-existent user', async () => {
      const loginInput = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      // Mock no user found
      mockDb.select.mockResolvedValue([]);

      const context = createTestContext();
      context.db = mockDb;

      await expect(
        authResolvers.Mutation.login(null, loginInput, context)
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for incorrect password', async () => {
      const testUser = generateTestUser();
      const loginInput = {
        email: testUser.email,
        password: 'wrongpassword',
      };

      // Mock user exists
      mockDb.select.mockResolvedValue([{
        ...testUser,
        password: '$2a$12$hashedpassword',
      }]);

      // Mock bcrypt compare to return false
      const bcrypt = await import('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      const context = createTestContext();
      context.db = mockDb;

      await expect(
        authResolvers.Mutation.login(null, loginInput, context)
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('refreshToken mutation', () => {
    it('should refresh token successfully', async () => {
      const testUser = generateTestUser();
      const refreshTokenInput = {
        refreshToken: 'valid-refresh-token',
      };

      // Mock user exists
      mockDb.select.mockResolvedValue([testUser]);

      const context = createTestContext();
      context.db = mockDb;

      // Mock JWT verification
      const jwtUtils = await import('../src/utils/jwt.js');
      jest.spyOn(jwtUtils, 'verifyRefreshToken').mockResolvedValue({ id: testUser.id });

      const result = await authResolvers.Mutation.refreshToken(
        null,
        refreshTokenInput,
        context
      );

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.id).toBe(testUser.id);
    });

    it('should throw error for invalid refresh token', async () => {
      const refreshTokenInput = {
        refreshToken: 'invalid-refresh-token',
      };

      const context = createTestContext();
      context.db = mockDb;

      // Mock JWT verification to throw error
      const jwtUtils = await import('../src/utils/jwt.js');
      jest.spyOn(jwtUtils, 'verifyRefreshToken').mockRejectedValue(new Error('Invalid token'));

      await expect(
        authResolvers.Mutation.refreshToken(null, refreshTokenInput, context)
      ).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout mutation', () => {
    it('should logout successfully', async () => {
      const context = createTestContext();

      const result = await authResolvers.Mutation.logout(null, null, context);

      expect(result).toBe(true);
    });
  });
});
