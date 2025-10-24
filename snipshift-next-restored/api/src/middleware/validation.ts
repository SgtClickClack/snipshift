import { GraphQLError } from 'graphql';
import { logger } from '../utils/logger.js';
import validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';

// Input validation schemas
export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'uuid';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
  sanitize?: boolean;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

// Enhanced input validation
export class InputValidator {
  static validateInput(input: any, schema: ValidationSchema): any {
    const errors: string[] = [];
    const sanitized: any = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = input[field];

      // Check required fields
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      // Skip validation if field is not provided and not required
      if (value === undefined || value === null) {
        sanitized[field] = value;
        continue;
      }

      // Type validation
      if (rules.type) {
        const typeError = this.validateType(value, rules.type, field);
        if (typeError) {
          errors.push(typeError);
          continue;
        }
      }

      // String-specific validations
      if (typeof value === 'string') {
        // Length validations
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters long`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field} must be no more than ${rules.maxLength} characters long`);
        }

        // Pattern validation
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(`${field} format is invalid`);
        }

        // Sanitization
        if (rules.sanitize) {
          sanitized[field] = DOMPurify.sanitize(value);
        } else {
          sanitized[field] = value;
        }
      }

      // Number-specific validations
      if (typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`${field} must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`${field} must be no more than ${rules.max}`);
        }
        sanitized[field] = value;
      }

      // Custom validation
      if (rules.custom && !rules.custom(value)) {
        errors.push(`${field} validation failed`);
      }

      // Default sanitization for strings
      if (typeof value === 'string' && !rules.sanitize) {
        sanitized[field] = validator.escape(value);
      }
    }

    if (errors.length > 0) {
      throw new GraphQLError(`Validation failed: ${errors.join(', ')}`, {
        extensions: {
          code: 'VALIDATION_ERROR',
          fieldErrors: errors,
        },
      });
    }

    return sanitized;
  }

  private static validateType(value: any, type: string, field: string): string | null {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return `${field} must be a string`;
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return `${field} must be a number`;
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return `${field} must be a boolean`;
        }
        break;
      case 'email':
        if (typeof value !== 'string' || !validator.isEmail(value)) {
          return `${field} must be a valid email address`;
        }
        break;
      case 'url':
        if (typeof value !== 'string' || !validator.isURL(value)) {
          return `${field} must be a valid URL`;
        }
        break;
      case 'uuid':
        if (typeof value !== 'string' || !validator.isUUID(value)) {
          return `${field} must be a valid UUID`;
        }
        break;
    }
    return null;
  }
}

// Common validation schemas
export const ValidationSchemas = {
  createUser: {
    email: { required: true, type: 'email' as const, maxLength: 255, sanitize: true },
    password: { required: false, type: 'string' as const, minLength: 8, maxLength: 128 },
    displayName: { required: false, type: 'string' as const, maxLength: 100, sanitize: true },
    roles: { required: true, custom: (value: any) => Array.isArray(value) },
    currentRole: { required: false, type: 'string' as const },
    googleId: { required: false, type: 'string' as const, maxLength: 255 },
    profileImage: { required: false, type: 'url' as const, maxLength: 500 },
  },

  createJob: {
    title: { required: true, type: 'string', minLength: 5, maxLength: 200, sanitize: true },
    description: { required: true, type: 'string', minLength: 10, maxLength: 2000, sanitize: true },
    skillsRequired: { required: true, type: 'string' },
    payRate: { required: true, type: 'number', min: 0, max: 10000 },
    payType: { required: true, type: 'string', maxLength: 50 },
    location: { required: true, type: 'string' },
    date: { required: true, type: 'string' },
    startTime: { required: true, type: 'string', maxLength: 10 },
    endTime: { required: true, type: 'string', maxLength: 10 },
    hubId: { required: true, type: 'uuid' },
  },

  createSocialPost: {
    content: { required: true, type: 'string', minLength: 1, maxLength: 2000, sanitize: true },
    imageUrl: { required: false, type: 'url', maxLength: 500 },
    postType: { required: true, type: 'string', maxLength: 50 },
    eventDate: { required: false, type: 'string' },
    discountCode: { required: false, type: 'string', maxLength: 50 },
    discountPercentage: { required: false, type: 'number', min: 0, max: 100 },
  },

  createTrainingContent: {
    title: { required: true, type: 'string', minLength: 5, maxLength: 200, sanitize: true },
    description: { required: true, type: 'string', minLength: 10, maxLength: 2000, sanitize: true },
    contentType: { required: true, type: 'string', maxLength: 50 },
    videoUrl: { required: false, type: 'url', maxLength: 500 },
    price: { required: false, type: 'number', min: 0, max: 10000 },
    duration: { required: true, type: 'string', maxLength: 50 },
    level: { required: true, type: 'string', maxLength: 50 },
    category: { required: true, type: 'string', maxLength: 100 },
    tags: { required: false, type: 'string' },
  },

  sendMessage: {
    chatId: { required: true, type: 'uuid' },
    receiverId: { required: true, type: 'uuid' },
    content: { required: true, type: 'string', minLength: 1, maxLength: 1000, sanitize: true },
  },
};

// Rate limiting
export class RateLimiter {
  private static instance: RateLimiter;
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();

  public static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  checkLimit(identifier: string, maxAttempts: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record || now > record.resetTime) {
      // Reset or create new record
      this.attempts.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (record.count >= maxAttempts) {
      logger.warn(`Rate limit exceeded for ${identifier}`);
      return false;
    }

    record.count++;
    return true;
  }

  resetLimit(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

// Security utilities
export class SecurityUtils {
  static sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html);
  }

  static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static validateFileUpload(file: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!file) {
      errors.push('No file provided');
      return { valid: false, errors };
    }

    if (file.size > maxSize) {
      errors.push('File size must be less than 10MB');
    }

    if (!allowedTypes.includes(file.mimetype)) {
      errors.push('File type not allowed. Only JPEG, PNG, GIF, and WebP are supported');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// GraphQL error handling
export class GraphQLErrorHandler {
  static handleError(error: any, operation: string): GraphQLError {
    logger.error(`GraphQL error in ${operation}:`, error);

    // Handle validation errors
    if (error.extensions?.code === 'VALIDATION_ERROR') {
      return new GraphQLError(error.message, {
        extensions: {
          code: 'VALIDATION_ERROR',
          fieldErrors: error.extensions.fieldErrors,
        },
      });
    }

    // Handle authentication errors
    if (error.message.includes('Invalid email or password') || 
        error.message.includes('User not found') ||
        error.message.includes('Invalid token')) {
      return new GraphQLError('Authentication failed', {
        extensions: {
          code: 'UNAUTHENTICATED',
        },
      });
    }

    // Handle authorization errors
    if (error.message.includes('Access denied') || 
        error.message.includes('Insufficient permissions')) {
      return new GraphQLError('Access denied', {
        extensions: {
          code: 'FORBIDDEN',
        },
      });
    }

    // Handle rate limiting
    if (error.message.includes('Rate limit exceeded')) {
      return new GraphQLError('Too many requests. Please try again later.', {
        extensions: {
          code: 'RATE_LIMITED',
        },
      });
    }

    // Generic error for security
    return new GraphQLError('An error occurred. Please try again.', {
      extensions: {
        code: 'INTERNAL_ERROR',
      },
    });
  }
}
