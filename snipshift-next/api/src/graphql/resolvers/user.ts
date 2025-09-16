import bcrypt from 'bcryptjs';
import { GraphQLContext } from '../context.js';
import { eq, or, and, like, sql } from 'drizzle-orm';
import { users, hubProfiles, professionalProfiles, brandProfiles, trainerProfiles } from '../../database/schema.js';
import { logger } from '../../utils/logger.js';

export const userResolvers = {
  Query: {
    me: async (_: any, __: any, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const [user] = await context.db
        .select()
        .from(users)
        .where(eq(users.id, context.user.id))
        .limit(1);

      return user;
    },

    user: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const [user] = await context.db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      return user;
    },

    users: async (
      _: any,
      { role, verified }: { role?: string; verified?: boolean },
      context: GraphQLContext
    ) => {
      let conditions = [];

      if (role) {
        // This is a simplified check - in reality you'd need to check if role is in the roles array
        // For now, we'll filter by currentRole
        conditions.push(sql`${users.currentRole} = ${role}`);
      }

      if (verified !== undefined) {
        conditions.push(eq(users.isVerified, verified));
      }

      const userList = await context.db
        .select()
        .from(users)
        .where(and(...conditions));

      return userList;
    },
  },

  Mutation: {
    updateUser: async (
      _: any,
      { input }: { input: { displayName?: string; profileImage?: string; currentRole?: string } },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const updateData: any = {};
      if (input.displayName !== undefined) updateData.displayName = input.displayName;
      if (input.profileImage !== undefined) updateData.profileImage = input.profileImage;
      if (input.currentRole !== undefined) updateData.currentRole = input.currentRole;

      const [updatedUser] = await context.db
        .update(users)
        .set(updateData)
        .where(eq(users.id, context.user.id))
        .returning();

      logger.info(`User updated: ${context.user.email}`);
      return updatedUser;
    },

    updateUserRole: async (
      _: any,
      { userId, role, action }: { userId: string; role: string; action: string },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      // Check if user can update roles (admin check would go here)
      const [targetUser] = await context.db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!targetUser) {
        throw new Error('User not found');
      }

      let updatedRoles = [...(targetUser.roles as string[])];

      if (action === 'add' && !updatedRoles.includes(role)) {
        updatedRoles.push(role);
      } else if (action === 'remove') {
        updatedRoles = updatedRoles.filter(r => r !== role);
      }

      const [updatedUser] = await context.db
        .update(users)
        .set({ roles: updatedRoles })
        .where(eq(users.id, userId))
        .returning();

      logger.info(`User role updated: ${targetUser.email} - ${action} ${role}`);
      return updatedUser;
    },

    updateProfile: async (
      _: any,
      { profileType, data }: { profileType: string; data: string },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const profileData = JSON.parse(data);

      try {
        switch (profileType) {
          case 'hub':
            if (!context.user.roles.includes('hub')) {
              throw new Error('User does not have hub role');
            }

            const [existingHubProfile] = await context.db
              .select()
              .from(hubProfiles)
              .where(eq(hubProfiles.userId, context.user.id))
              .limit(1);

            if (existingHubProfile) {
              await context.db
                .update(hubProfiles)
                .set(profileData)
                .where(eq(hubProfiles.userId, context.user.id));
            } else {
              await context.db
                .insert(hubProfiles)
                .values({ ...profileData, userId: context.user.id });
            }
            break;

          case 'professional':
            if (!context.user.roles.includes('professional')) {
              throw new Error('User does not have professional role');
            }

            const [existingProProfile] = await context.db
              .select()
              .from(professionalProfiles)
              .where(eq(professionalProfiles.userId, context.user.id))
              .limit(1);

            if (existingProProfile) {
              await context.db
                .update(professionalProfiles)
                .set(profileData)
                .where(eq(professionalProfiles.userId, context.user.id));
            } else {
              await context.db
                .insert(professionalProfiles)
                .values({ ...profileData, userId: context.user.id });
            }
            break;

          case 'brand':
            if (!context.user.roles.includes('brand')) {
              throw new Error('User does not have brand role');
            }

            const [existingBrandProfile] = await context.db
              .select()
              .from(brandProfiles)
              .where(eq(brandProfiles.userId, context.user.id))
              .limit(1);

            if (existingBrandProfile) {
              await context.db
                .update(brandProfiles)
                .set(profileData)
                .where(eq(brandProfiles.userId, context.user.id));
            } else {
              await context.db
                .insert(brandProfiles)
                .values({ ...profileData, userId: context.user.id });
            }
            break;

          case 'trainer':
            if (!context.user.roles.includes('trainer')) {
              throw new Error('User does not have trainer role');
            }

            const [existingTrainerProfile] = await context.db
              .select()
              .from(trainerProfiles)
              .where(eq(trainerProfiles.userId, context.user.id))
              .limit(1);

            if (existingTrainerProfile) {
              await context.db
                .update(trainerProfiles)
                .set(profileData)
                .where(eq(trainerProfiles.userId, context.user.id));
            } else {
              await context.db
                .insert(trainerProfiles)
                .values({ ...profileData, userId: context.user.id });
            }
            break;

          default:
            throw new Error('Invalid profile type');
        }

        // Return updated user
        const [updatedUser] = await context.db
          .select()
          .from(users)
          .where(eq(users.id, context.user.id))
          .limit(1);

        logger.info(`Profile updated: ${context.user.email} - ${profileType}`);
        return updatedUser;
      } catch (error) {
        logger.error('Profile update error:', error);
        throw new Error('Failed to update profile');
      }
    },
  },
};
