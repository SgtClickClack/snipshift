/**
 * Transaction Management Helpers
 * 
 * Provides utilities for wrapping multi-step database operations in transactions
 * Uses Drizzle ORM's built-in transaction support with PostgreSQL
 */

import { getDb } from './index.js';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type * as schema from './schema.js';

type Transaction = PgTransaction<
  'postgres',
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

/**
 * Execute a function within a database transaction
 * 
 * Uses Drizzle ORM's transaction support to ensure atomicity.
 * If the callback throws, the transaction is automatically rolled back.
 * 
 * @param callback Function to execute within the transaction
 * @returns Result of the callback function
 * @throws Error if transaction fails (automatically rolled back)
 * 
 * @example
 * ```typescript
 * const result = await withTransaction(async (tx) => {
 *   await tx.update(shifts).set({ status: 'confirmed' }).where(...);
 *   await tx.insert(applications).values({ ... });
 *   return { success: true };
 * });
 * ```
 */
export async function withTransaction<T>(
  callback: (tx: Transaction) => Promise<T>
): Promise<T> {
  const db = getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  try {
    return await db.transaction(async (tx) => {
      return await callback(tx);
    });
  } catch (error) {
    console.error('[TRANSACTION] Transaction failed:', error);
    throw error;
  }
}

/**
 * Execute multiple operations in a transaction
 * All operations must succeed, or all will be rolled back
 * 
 * @deprecated Use withTransaction with a single callback that performs all operations
 */
export async function executeTransaction<T>(
  operations: Array<(tx: Transaction) => Promise<any>>
): Promise<T[]> {
  const db = getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  try {
    return await db.transaction(async (tx) => {
      const results = await Promise.all(operations.map((op) => op(tx)));
      return results as T[];
    });
  } catch (error) {
    console.error('[TRANSACTION] Multi-operation transaction failed:', error);
    throw error;
  }
}

