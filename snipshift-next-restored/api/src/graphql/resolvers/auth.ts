import bcrypt from 'bcryptjs';
import { GraphQLContext } from '../context.js';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';
import { logger } from '../../utils/logger.js';
import { eq } from 'drizzle-orm';
import { users } from '../../database/schema.js';
import { InputValidator, ValidationSchemas, RateLimiter, SecurityUtils, GraphQLErrorHandler } from '../../middleware/validation.js';

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
        // Rate limiting
        const rateLimiter = RateLimiter.getInstance();
        if (!rateLimiter.checkLimit(`register:${input.email}`, 5, 300000)) { // 5 attempts per 5 minutes
          throw new Error('Rate limit exceeded for registration');
        }

        // Input validation
        const sanitizedInput = InputValidator.validateInput(input, ValidationSchemas.createUser);

        const { email, password, displayName, roles, currentRole, googleId, profileImage } = sanitizedInput;

        // Check if user already exists
        const existingUser = await context.db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existingUser.length > 0) {
          throw new Error('User already exists with this email');
        }

        // Validate password if provided
        if (password) {
          const passwordValidation = SecurityUtils.validatePassword(password);
          if (!passwordValidation.valid) {
            throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
          }
        }

        // Hash password if provided
        let hashedPassword = null;
        if (password) {
          hashedPassword = await bcrypt.hash(password, 12);
        }

        // Validate roles
        const validRoles = ['CLIENT', 'HUB', 'PROFESSIONAL', 'BRAND', 'TRAINER'];
        const invalidRoles = roles.filter(role => !validRoles.includes(role));
        if (invalidRoles.length > 0) {
          throw new Error(`Invalid roles: ${invalidRoles.join(', ')}`);
        }

        // Create user
        const [newUser] = await context.db
          .insert(users)
          .values({
            email,
            password: hashedPassword,
            displayName: displayName || null,
            roles,
            currentRole: currentRole as typeof users.$inferInsert.currentRole || null,
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
        throw GraphQLErrorHandler.handleError(error, 'register');
      }
    },

    login: async (
      _: any,
      { email, password }: { email: string; password: string },
      context: GraphQLContext
    ) => {
      try {
        // Rate limiting
        const rateLimiter = RateLimiter.getInstance();
        if (!rateLimiter.checkLimit(`login:${email}`, 10, 300000)) { // 10 attempts per 5 minutes
          throw new Error('Rate limit exceeded for login');
        }

        // Input validation
        const sanitizedInput = InputValidator.validateInput(
          { email, password },
          {
            email: { required: true, type: 'email', maxLength: 255, sanitize: true },
            password: { required: true, type: 'string', minLength: 1, maxLength: 128 },
          }
        );

        // Find user
        const [user] = await context.db
          .select()
          .from(users)
          .where(eq(users.email, sanitizedInput.email))
          .limit(1);

        if (!user) {
          throw new Error('Invalid email or password');
        }

        // Check password
        if (!user.password) {
          throw new Error('This account uses Google authentication');
        }

        const isValidPassword = await bcrypt.compare(sanitizedInput.password, user.password);
        if (!isValidPassword) {
          throw new Error('Invalid email or password');
        }

        // Reset rate limit on successful login
        rateLimiter.resetLimit(`login:${email}`);

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
        throw GraphQLErrorHandler.handleError(error, 'login');
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
