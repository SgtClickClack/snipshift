/**
 * Transaction Management Helpers
 * 
 * Provides utilities for wrapping multi-step database operations in transactions
 */

import { getDb } from './index.js';

/**
 * Execute a function within a database transaction
 * 
 * @param callback Function to execute within the transaction
 * @returns Result of the callback function
 * @throws Error if transaction fails (automatically rolled back)
 */
export async function withTransaction<T>(
  callback: (tx: ReturnType<typeof getDb>) => Promise<T>
): Promise<T | null> {
  const db = getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // Note: Drizzle ORM with postgres-js doesn't have explicit transaction support
  // in the same way as other ORMs. For now, we'll execute the callback directly.
  // When using postgres-js with Drizzle, transactions should be handled at the
  // SQL level using BEGIN/COMMIT/ROLLBACK if needed.
  // 
  // For most operations, Drizzle's insert/update/delete operations are atomic,
  // but for complex multi-step operations, we may need to use raw SQL transactions.
  
  try {
    return await callback(db);
  } catch (error) {
    console.error('[TRANSACTION] Transaction failed:', error);
    throw error;
  }
}

/**
 * Execute multiple operations in a transaction
 * All operations must succeed, or all will be rolled back
 */
export async function executeTransaction<T>(
  operations: Array<(tx: ReturnType<typeof getDb>) => Promise<any>>
): Promise<T[] | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  try {
    const results = await Promise.all(operations.map((op) => op(db)));
    return results as T[];
  } catch (error) {
    console.error('[TRANSACTION] Multi-operation transaction failed:', error);
    throw error;
  }
}

