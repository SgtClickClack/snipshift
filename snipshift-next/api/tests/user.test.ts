import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createTestContext, generateTestUser } from './utils/testUtils.js';
import { userResolvers } from '../src/graphql/resolvers/user.js';

describe('User Resolvers', () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('me query', () => {
    it('should return current user', async () => {
      const testUser = generateTestUser();

      mockDb.select.mockResolvedValue([testUser]);

      const context = createTestContext(testUser);
      context.db = mockDb;

      const result = await userResolvers.Query.me(null, null, context);

      expect(result).toEqual(testUser);
      expect(mockDb.select).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          where: expect.any(Function),
        })
      );
    });

    it('should throw error when not authenticated', async () => {
      const context = createTestContext(); // No user

      await expect(
        userResolvers.Query.me(null, null, context)
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('user query', () => {
    it('should return user by id', async () => {
      const testUser = generateTestUser();

      mockDb.select.mockResolvedValue([testUser]);

      const context = createTestContext();
      context.db = mockDb;

      const result = await userResolvers.Query.user(null, { id: testUser.id }, context);

      expect(result).toEqual(testUser);
    });

    it('should return null for non-existent user', async () => {
      mockDb.select.mockResolvedValue([]);

      const context = createTestContext();
      context.db = mockDb;

      const result = await userResolvers.Query.user(null, { id: 'non-existent' }, context);

      expect(result).toBeUndefined();
    });
  });

  describe('users query', () => {
    it('should return users filtered by role', async () => {
      const testUsers = [
        generateTestUser({ roles: ['hub'] }),
        generateTestUser({ roles: ['professional'] }),
        generateTestUser({ roles: ['client'] }),
      ];

      mockDb.select.mockResolvedValue(testUsers);

      const context = createTestContext();
      context.db = mockDb;

      const result = await userResolvers.Query.users(
        null,
        { role: 'hub', verified: true },
        context
      );

      expect(result).toEqual(testUsers);
    });

    it('should return all users when no filters', async () => {
      const testUsers = [
        generateTestUser(),
        generateTestUser(),
      ];

      mockDb.select.mockResolvedValue(testUsers);

      const context = createTestContext();
      context.db = mockDb;

      const result = await userResolvers.Query.users(null, {}, context);

      expect(result).toEqual(testUsers);
    });
  });

  describe('updateUser mutation', () => {
    it('should update user successfully', async () => {
      const testUser = generateTestUser();
      const updateInput = {
        displayName: 'Updated Name',
        profileImage: 'new-image.jpg',
        currentRole: 'professional',
      };

      const updatedUser = { ...testUser, ...updateInput };

      mockDb.update.mockResolvedValue([updatedUser]);

      const context = createTestContext(testUser);
      context.db = mockDb;

      const result = await userResolvers.Mutation.updateUser(
        null,
        { input: updateInput },
        context
      );

      expect(result).toEqual(updatedUser);
    });

    it('should throw error when not authenticated', async () => {
      const updateInput = {
        displayName: 'Updated Name',
      };

      const context = createTestContext(); // No user

      await expect(
        userResolvers.Mutation.updateUser(null, { input: updateInput }, context)
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('updateUserRole mutation', () => {
    it('should add role successfully', async () => {
      const testUser = generateTestUser({ roles: ['client'] });
      const targetUser = generateTestUser({ roles: ['client'] });
      const updatedUser = { ...targetUser, roles: ['client', 'hub'] };

      mockDb.select.mockResolvedValue([targetUser]);
      mockDb.update.mockResolvedValue([updatedUser]);

      const context = createTestContext(testUser);
      context.db = mockDb;

      const result = await userResolvers.Mutation.updateUserRole(
        null,
        { userId: targetUser.id, role: 'hub', action: 'add' },
        context
      );

      expect(result.roles).toContain('hub');
      expect(result.roles).toContain('client');
    });

    it('should remove role successfully', async () => {
      const testUser = generateTestUser({ roles: ['client'] });
      const targetUser = generateTestUser({ roles: ['client', 'hub'] });
      const updatedUser = { ...targetUser, roles: ['client'] };

      mockDb.select.mockResolvedValue([targetUser]);
      mockDb.update.mockResolvedValue([updatedUser]);

      const context = createTestContext(testUser);
      context.db = mockDb;

      const result = await userResolvers.Mutation.updateUserRole(
        null,
        { userId: targetUser.id, role: 'hub', action: 'remove' },
        context
      );

      expect(result.roles).not.toContain('hub');
      expect(result.roles).toContain('client');
    });
  });

  describe('updateProfile mutation', () => {
    it('should update hub profile successfully', async () => {
      const testUser = generateTestUser({ roles: ['hub'] });
      const profileData = {
        businessName: 'Test Hub',
        businessType: 'Barbershop',
        address: {
          street: '123 Main St',
          city: 'Test City',
          state: 'Test State',
          postcode: '12345',
          country: 'Test Country',
        },
      };

      mockDb.select.mockResolvedValue([]); // No existing profile
      mockDb.insert.mockResolvedValue([profileData]);

      const context = createTestContext(testUser);
      context.db = mockDb;

      const result = await userResolvers.Mutation.updateProfile(
        null,
        {
          profileType: 'hub',
          data: JSON.stringify(profileData),
        },
        context
      );

      expect(result.id).toBe(testUser.id);
    });

    it('should update professional profile successfully', async () => {
      const testUser = generateTestUser({ roles: ['professional'] });
      const profileData = {
        isVerified: true,
        skills: ['cutting', 'styling'],
        experience: '5 years',
      };

      mockDb.select.mockResolvedValue([]); // No existing profile
      mockDb.insert.mockResolvedValue([profileData]);

      const context = createTestContext(testUser);
      context.db = mockDb;

      const result = await userResolvers.Mutation.updateProfile(
        null,
        {
          profileType: 'professional',
          data: JSON.stringify(profileData),
        },
        context
      );

      expect(result.id).toBe(testUser.id);
    });

    it('should throw error for invalid profile type', async () => {
      const testUser = generateTestUser({ roles: ['client'] });

      const context = createTestContext(testUser);
      context.db = mockDb;

      await expect(
        userResolvers.Mutation.updateProfile(
          null,
          {
            profileType: 'invalid',
            data: JSON.stringify({}),
          },
          context
        )
      ).rejects.toThrow('Invalid profile type');
    });

    it('should throw error when user does not have required role', async () => {
      const testUser = generateTestUser({ roles: ['client'] });

      const context = createTestContext(testUser);
      context.db = mockDb;

      await expect(
        userResolvers.Mutation.updateProfile(
          null,
          {
            profileType: 'hub',
            data: JSON.stringify({ businessName: 'Test' }),
          },
          context
        )
      ).rejects.toThrow('User does not have hub role');
    });
  });
});
