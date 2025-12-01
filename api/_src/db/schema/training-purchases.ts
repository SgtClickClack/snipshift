import { pgTable, uuid, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { trainingModules } from './training-modules.js';

/**
 * Training Purchases table
 * Stores records of users purchasing training content
 */
export const trainingPurchases = pgTable('training_purchases', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  moduleId: uuid('module_id').notNull().references(() => trainingModules.id, { onDelete: 'cascade' }),
  purchasedAt: timestamp('purchased_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('training_purchases_user_id_idx').on(table.userId),
  moduleIdIdx: index('training_purchases_module_id_idx').on(table.moduleId),
  userModuleUnique: unique('training_purchases_user_module_unique').on(table.userId, table.moduleId),
}));


