/**
 * Logger Re-export for Mobile API Services
 * 
 * Re-exports the logger from the main API to maintain consistent logging
 * across the monorepo. Provides appLogger and errorLogger aliases for
 * backward compatibility with existing service imports.
 */

import { logger } from '../../snipshift-next-restored/api/src/utils/logger';

// Export aliases for existing service imports
export const appLogger = logger;
export const errorLogger = logger;

