/**
 * Main Application Entry Point
 * 
 * Wires up all dependencies and exports the configured AppFacade instance
 * for use by the application's server framework (e.g., Express).
 */

import { AppFacade } from './controllers/AppFacade';
import { createDatabaseConnection } from './config/database';
import { PostgresPairingRepository } from './repositories/PostgresPairingRepository';
import { PostgresUserRepository } from './repositories/PostgresUserRepository';
import { PostgresUserBankRepository } from './repositories/PostgresUserBankRepository';
import { PostgresPairingCodeRepository } from './repositories/PostgresPairingCodeRepository';
import { DatabasePairingRepository } from './repositories/DatabasePairingRepository';
import { DatabaseUserRepository } from './repositories/DatabaseUserRepository';
import { DatabaseUserBankRepository } from './repositories/DatabaseUserBankRepository';
import { InMemoryPairingCodeRepository } from './repositories/InMemoryPairingCodeRepository';
import { UserPairingService } from './services/UserPairingService';
import { BribeBankService } from './services/BribeBankService';
import { PairingRepository } from './repositories/PairingRepository';
import { UserRepository } from './repositories/UserRepository';
import { UserBankRepository } from './repositories/UserBankRepository';
import { PairingCodeRepository } from './repositories/PairingCodeRepository';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Setup global error handlers for unhandled promise rejections and uncaught exceptions
 * This ensures the application doesn't crash silently and logs errors properly
 */
function setupGlobalErrorHandlers(): void {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // In production, you might want to exit the process, but for now we'll just log
    if (process.env.NODE_ENV === 'production') {
      console.error('Exiting due to unhandled rejection in production');
      process.exit(1);
    }
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    // Always exit on uncaught exceptions as the application is in an undefined state
    process.exit(1);
  });
}

// Setup error handlers immediately
setupGlobalErrorHandlers();

/**
 * Runs database migrations if DATABASE_URL is configured
 */
async function runMigrations(pool: any): Promise<void> {
  // Try multiple paths to find migration file (works in both dev and production)
  // Priority: dist/scripts/migrations/ first (most reliable in Docker), then fallback paths
  // When running from dist/main.js, __dirname is /app/dist, so we check dist/scripts/migrations/ directly
  const possiblePaths = [
    path.join(__dirname, 'scripts/migrations/001_initial_schema.sql'), // dist/scripts/migrations/ (when __dirname is /app/dist)
    path.join(process.cwd(), 'dist/scripts/migrations/001_initial_schema.sql'), // Explicit dist path from cwd (/app)
    path.join(process.cwd(), 'scripts/migrations/001_initial_schema.sql'), // Project root fallback
    path.join(__dirname, '../scripts/migrations/001_initial_schema.sql'), // Alternative fallback
    path.join(__dirname, '../../scripts/migrations/001_initial_schema.sql') // Alternative fallback
  ];

  let migrationPath: string | null = null;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      migrationPath = possiblePath;
      console.log(`Found migration file at: ${migrationPath}`);
      break;
    }
  }

  if (!migrationPath) {
    const errorMessage = `Migration file not found in any expected location. Searched paths:\n${possiblePaths.map(p => `  - ${p}`).join('\n')}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  const client = await pool.connect();
  
  try {
    await client.query(migrationSQL);
    console.log('Database migrations completed successfully');
  } catch (error: any) {
    // Ignore "already exists" errors
    if (error.code !== '42P07' && !error.message.includes('already exists')) {
      console.error('Migration error:', error.message);
      throw error;
    }
    console.log('Database schema already exists, skipping migrations');
  } finally {
    client.release();
  }
}

/**
 * Instantiates repositories based on DATABASE_URL configuration
 * Uses PostgreSQL if DATABASE_URL is set, otherwise falls back to in-memory repositories
 */
let pairingRepo: PairingRepository;
let userBankRepo: UserBankRepository;
let userRepo: UserRepository;
let pairingCodeRepo: PairingCodeRepository;
let appFacade: AppFacade;
let isInitialized: boolean = false;

/**
 * Initializes the application asynchronously
 * Runs database migrations if DATABASE_URL is configured, then initializes all repositories and services
 * 
 * @throws Error if migrations fail or initialization fails
 */
export async function initializeApp(): Promise<AppFacade> {
  databasePool = createDatabaseConnection();

  if (databasePool) {
    // Use PostgreSQL repositories
    console.log('Using PostgreSQL repositories');
    
    // Run migrations synchronously before initializing repositories
    try {
      await runMigrations(databasePool);
    } catch (error) {
      console.error('Failed to run migrations:', error);
      throw error;
    }

    pairingRepo = new PostgresPairingRepository(databasePool);
    userBankRepo = new PostgresUserBankRepository(databasePool);
    userRepo = new PostgresUserRepository(databasePool);
    pairingCodeRepo = new PostgresPairingCodeRepository(databasePool);
  } else {
    // Use in-memory repositories (fallback)
    console.log('Using in-memory repositories (DATABASE_URL not configured)');
    pairingRepo = new DatabasePairingRepository();
    userBankRepo = new DatabaseUserBankRepository();
    userRepo = new DatabaseUserRepository();
    pairingCodeRepo = new InMemoryPairingCodeRepository();
  }

  /**
   * Instantiates all services with their dependencies
   */
  const userPairingService = new UserPairingService(userRepo, pairingCodeRepo);
  const bribeBankService = new BribeBankService(userBankRepo);

  /**
   * Instantiates the AppFacade with all dependencies
   */
  appFacade = new AppFacade(
    pairingRepo,
    userRepo,
    userPairingService,
    bribeBankService
  );

  console.log('Chore Motivation App Core Initialized and Dependencies Wired');
  isInitialized = true;
  return appFacade;
}

/**
 * Checks if the application has been initialized
 * @returns true if initialized, false otherwise
 */
export function isAppInitialized(): boolean {
  return isInitialized;
}

/**
 * Application startup function
 * Logs confirmation that the application core is initialized
 * @deprecated Use initializeApp() instead for async initialization
 */
export function startApp(): void {
  console.log('Chore Motivation App Core Initialized and Dependencies Wired');
}

/**
 * Exports the fully configured AppFacade instance
 * Note: This will be undefined until initializeApp() is called
 */
export { appFacade };

/**
 * Gets the database pool if it exists
 * Used for graceful shutdown
 */
let databasePool: any = null;

export function getDatabasePool(): any {
  return databasePool;
}

