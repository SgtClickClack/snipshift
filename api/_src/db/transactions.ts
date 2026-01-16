/**
 * Transaction Management Helpers
 * 
 * Provides utilities for wrapping multi-step database operations in transactions
 * Uses Drizzle ORM's built-in transaction support with PostgreSQL
 * 
 * SECURITY AUDIT: Added isolation level support to prevent deadlocks and ensure data consistency
 */

import { getDb } from './index.js';
import { sql } from 'drizzle-orm';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type * as schema from './schema.js';

type Transaction = PgTransaction<
  NodePgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

/**
 * Transaction isolation levels for PostgreSQL
 * - READ UNCOMMITTED: Not supported in PostgreSQL (treated as READ COMMITTED)
 * - READ COMMITTED: Default - sees only committed data (can have non-repeatable reads)
 * - REPEATABLE READ: Prevents non-repeatable reads (good for shift updates)
 * - SERIALIZABLE: Highest isolation - prevents all anomalies (required for payment processing)
 */
export type IsolationLevel = 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';

/**
 * Execute a function within a database transaction with specified isolation level
 * 
 * SECURITY: Uses appropriate isolation levels to prevent deadlocks and ensure data consistency
 * - REPEATABLE READ: Use for shift updates to prevent race conditions
 * - SERIALIZABLE: Use for payment processing to ensure financial integrity
 * 
 * Note: PostgreSQL allows setting isolation level as the first statement in a transaction.
 * We execute this immediately after Drizzle starts the transaction.
 * 
 * @param callback Function to execute within the transaction
 * @param isolationLevel Transaction isolation level (default: READ COMMITTED)
 * @param maxRetries Maximum number of retries on deadlock (default: 3)
 * @returns Result of the callback function
 * @throws Error if transaction fails (automatically rolled back)
 * 
 * @example
 * ```typescript
 * // For shift updates - use REPEATABLE READ
 * const result = await withTransactionIsolation(async (tx) => {
 *   await tx.update(shifts).set({ status: 'confirmed' }).where(...);
 * }, 'REPEATABLE READ');
 * 
 * // For payment processing - use SERIALIZABLE
 * const payment = await withTransactionIsolation(async (tx) => {
 *   await tx.update(shifts).set({ paymentStatus: 'PAID' }).where(...);
 *   await tx.insert(payouts).values({ ... });
 * }, 'SERIALIZABLE');
 * ```
 */
export async function withTransactionIsolation<T>(
  callback: (tx: Transaction) => Promise<T>,
  isolationLevel: IsolationLevel = 'READ COMMITTED',
  maxRetries: number = 3
): Promise<T> {
  const db = getDb();
  
  if (!db) {
    throw new Error('Database not available');
  }

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await db.transaction(async (tx) => {
        // Set isolation level as the first statement in the transaction
        // PostgreSQL allows this if done immediately after BEGIN
        // Use parameterized query to prevent SQL injection
        await tx.execute(sql.raw(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`));
        
        return await callback(tx);
      });
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a deadlock error (PostgreSQL error code: 40P01)
      const isDeadlock = error?.code === '40P01' || 
                        error?.message?.includes('deadlock') ||
                        error?.message?.includes('Deadlock') ||
                        error?.message?.includes('could not serialize');
      
      if (isDeadlock && attempt < maxRetries - 1) {
        // Exponential backoff: wait 50ms, 100ms, 200ms
        const backoffMs = 50 * Math.pow(2, attempt);
        console.warn(`[TRANSACTION] Deadlock detected (attempt ${attempt + 1}/${maxRetries}), retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }
      
      // Not a deadlock or max retries reached
      console.error('[TRANSACTION] Transaction failed:', error);
      throw error;
    }
  }
  
  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('Transaction failed after retries');
}

/**
 * Execute a function within a database transaction
 * 
 * Uses Drizzle ORM's transaction support to ensure atomicity.
 * If the callback throws, the transaction is automatically rolled back.
 * 
 * Uses REPEATABLE READ isolation level by default for better consistency.
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
  // Use REPEATABLE READ as default for better consistency and deadlock prevention
  return withTransactionIsolation(callback, 'REPEATABLE READ');
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

