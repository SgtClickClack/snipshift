import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which transports the logger must use
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
      winston.format.colorize({ all: true }),
      winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
      )
    ),
  }),
];

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  transports,
  // Do not exit on handled exceptions
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logging
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Security logging functions
export const securityLogger = {
  loginAttempt: (email: string, success: boolean, ip?: string) => {
    logger.info('Login attempt', {
      type: 'security',
      event: 'login_attempt',
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Mask email
      success,
      ip,
      timestamp: new Date().toISOString(),
    });
  },

  passwordChange: (userId: string, success: boolean) => {
    logger.info('Password change attempt', {
      type: 'security',
      event: 'password_change',
      userId,
      success,
      timestamp: new Date().toISOString(),
    });
  },

  roleChange: (userId: string, oldRoles: string[], newRoles: string[], changedBy: string) => {
    logger.info('Role change', {
      type: 'security',
      event: 'role_change',
      userId,
      oldRoles,
      newRoles,
      changedBy,
      timestamp: new Date().toISOString(),
    });
  },

  unauthorizedAccess: (endpoint: string, userId?: string, ip?: string) => {
    logger.warn('Unauthorized access attempt', {
      type: 'security',
      event: 'unauthorized_access',
      endpoint,
      userId,
      ip,
      timestamp: new Date().toISOString(),
    });
  },

  suspiciousActivity: (activity: string, details: Record<string, unknown>) => {
    logger.warn('Suspicious activity detected', {
      type: 'security',
      event: 'suspicious_activity',
      activity,
      details,
      timestamp: new Date().toISOString(),
    });
  },
};

// Application logging functions
export const appLogger = {
  databaseConnection: (success: boolean, error?: string) => {
    if (success) {
      logger.info('Database connection established');
    } else {
      logger.error('Database connection failed', { error });
    }
  },

  serverStart: (port: number, environment: string) => {
    logger.info(`Server started on port ${port} in ${environment} mode`);
  },

  apiRequest: (method: string, url: string, statusCode: number, responseTime: number, userId?: string) => {
    logger.http('API Request', {
      method,
      url,
      statusCode,
      responseTime: `${responseTime}ms`,
      userId,
    });
  },

  jobCreated: (jobId: string, hubId: string, title: string) => {
    logger.info('Job created', {
      type: 'business',
      event: 'job_created',
      jobId,
      hubId,
      title,
      timestamp: new Date().toISOString(),
    });
  },

  jobApplication: (jobId: string, professionalId: string, hubId: string) => {
    logger.info('Job application submitted', {
      type: 'business',
      event: 'job_application',
      jobId,
      professionalId,
      hubId,
      timestamp: new Date().toISOString(),
    });
  },
};

// Error logging with context
export const errorLogger = {
  databaseError: (operation: string, error: Error, context?: Record<string, unknown>) => {
    logger.error('Database error', {
      type: 'error',
      category: 'database',
      operation,
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });
  },

  validationError: (field: string, value: unknown, error: string) => {
    logger.warn('Validation error', {
      type: 'error',
      category: 'validation',
      field,
      value: typeof value === 'string' ? value.substring(0, 100) : value,
      error,
      timestamp: new Date().toISOString(),
    });
  },

  authenticationError: (reason: string, context?: Record<string, unknown>) => {
    logger.warn('Authentication error', {
      type: 'error',
      category: 'authentication',
      reason,
      context,
      timestamp: new Date().toISOString(),
    });
  },

  unexpectedError: (error: Error, context?: Record<string, unknown>) => {
    logger.error('Unexpected error', {
      type: 'error',
      category: 'unexpected',
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });
  },
};

// Export the main logger
export default logger;
