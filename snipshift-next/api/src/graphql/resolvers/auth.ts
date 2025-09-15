import bcrypt from 'bcryptjs';
import { GraphQLContext } from '../context.js';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';
import { logger } from '../../utils/logger.js';
import { eq } from 'drizzle-orm';
import { users } from '../../database/schema.js';

export const authResolvers = {
  Mutation: {
    register: async (
      _: any,
      {
        input,
      }: {
        input: {
          email: string;
          password?: string;
          displayName?: string;
          roles: string[];
          currentRole?: string;
          googleId?: string;
          profileImage?: string;
        };
      },
      context: GraphQLContext
    ) => {
      try {
        const { email, password, displayName, roles, currentRole, googleId, profileImage } = input;

        // Check if user already exists
        const existingUser = await context.db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existingUser.length > 0) {
          throw new Error('User already exists with this email');
        }

        // Hash password if provided
        let hashedPassword = null;
        if (password) {
          hashedPassword = await bcrypt.hash(password, 12);
        }

        // Create user
        const [newUser] = await context.db
          .insert(users)
          .values({
            email,
            password: hashedPassword,
            displayName: displayName || null,
            roles,
            currentRole: currentRole || null,
            googleId: googleId || null,
            profileImage: profileImage || null,
            provider: googleId ? 'google' : 'email',
            isVerified: !!googleId, // Google users are pre-verified
          })
          .returning();

        // Generate tokens
        const token = await generateToken({
          id: newUser.id,
          email: newUser.email,
          roles: newUser.roles as string[],
          currentRole: newUser.currentRole || undefined,
        });

        const refreshToken = await generateRefreshToken({ id: newUser.id });

        logger.info(`New user registered: ${email}`);

        return {
          user: newUser,
          token,
          refreshToken,
        };
      } catch (error) {
        logger.error('Registration error:', error);
        throw new Error('Failed to register user');
      }
    },

    login: async (
      _: any,
      { email, password }: { email: string; password: string },
      context: GraphQLContext
    ) => {
      try {
        // Find user
        const [user] = await context.db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user) {
          throw new Error('Invalid email or password');
        }

        // Check password
        if (!user.password) {
          throw new Error('This account uses Google authentication');
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          throw new Error('Invalid email or password');
        }

        // Generate tokens
        const token = await generateToken({
          id: user.id,
          email: user.email,
          roles: user.roles as string[],
          currentRole: user.currentRole || undefined,
        });

        const refreshToken = await generateRefreshToken({ id: user.id });

        logger.info(`User logged in: ${email}`);

        return {
          user,
          token,
          refreshToken,
        };
      } catch (error) {
        logger.error('Login error:', error);
        throw error;
      }
    },

    googleAuth: async (
      _: any,
      { idToken }: { idToken: string },
      context: GraphQLContext
    ) => {
      try {
        // Note: In a real implementation, you'd verify the Google ID token
        // For now, we'll assume it's valid and extract user info
        // You would use Google's OAuth2 client library here

        // Mock Google user info (replace with actual Google token verification)
        const googleUser = {
          email: 'google-user@example.com', // Extract from token
          name: 'Google User', // Extract from token
          googleId: 'google-id-123', // Extract from token
          picture: 'https://example.com/avatar.jpg', // Extract from token
        };

        // Check if user exists
        let [user] = await context.db
          .select()
          .from(users)
          .where(eq(users.googleId, googleUser.googleId))
          .limit(1);

        if (!user) {
          // Create new user
          [user] = await context.db
            .insert(users)
            .values({
              email: googleUser.email,
              displayName: googleUser.name,
              googleId: googleUser.googleId,
              profileImage: googleUser.picture,
              roles: ['client'], // Default role
              provider: 'google',
              isVerified: true,
            })
            .returning();
        }

        // Generate tokens
        const token = await generateToken({
          id: user.id,
          email: user.email,
          roles: user.roles as string[],
          currentRole: user.currentRole || undefined,
        });

        const refreshToken = await generateRefreshToken({ id: user.id });

        logger.info(`Google auth successful: ${user.email}`);

        return {
          user,
          token,
          refreshToken,
        };
      } catch (error) {
        logger.error('Google auth error:', error);
        throw new Error('Google authentication failed');
      }
    },

    refreshToken: async (
      _: any,
      { refreshToken }: { refreshToken: string },
      context: GraphQLContext
    ) => {
      try {
        // Verify refresh token
        const { id } = await verifyRefreshToken(refreshToken);

        // Get user
        const [user] = await context.db
          .select()
          .from(users)
          .where(eq(users.id, id))
          .limit(1);

        if (!user) {
          throw new Error('User not found');
        }

        // Generate new tokens
        const token = await generateToken({
          id: user.id,
          email: user.email,
          roles: user.roles as string[],
          currentRole: user.currentRole || undefined,
        });

        const newRefreshToken = await generateRefreshToken({ id: user.id });

        return {
          user,
          token,
          refreshToken: newRefreshToken,
        };
      } catch (error) {
        logger.error('Refresh token error:', error);
        throw new Error('Invalid refresh token');
      }
    },

    logout: async (_: any, __: any, context: GraphQLContext) => {
      // In a real implementation, you might want to blacklist the token
      // For now, just return success
      logger.info('User logged out');
      return true;
    },
  },
};
