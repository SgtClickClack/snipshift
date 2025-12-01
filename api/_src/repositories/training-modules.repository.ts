import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { trainingModules, trainingPurchases } from '../db/schema.js';
import { getDb } from '../db/index.js';

export interface TrainingModuleFilters {
  trainerId?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
  isPaid?: boolean; // If true, price > 0; if false, price = 0
  limit?: number;
  offset?: number;
}

export interface PaginatedTrainingModules {
  data: typeof trainingModules.$inferSelect[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Get paginated list of training modules with optional filters
 */
export async function getTrainingModules(filters: TrainingModuleFilters = {}): Promise<PaginatedTrainingModules | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const { 
    trainerId, 
    level, 
    category,
    isPaid,
    limit = 50, 
    offset = 0,
  } = filters;

  const conditions = [];
  
  if (trainerId) {
    conditions.push(eq(trainingModules.trainerId, trainerId));
  }
  if (level) {
    conditions.push(eq(trainingModules.level, level));
  }
  if (category) {
    conditions.push(eq(trainingModules.category, category));
  }
  if (isPaid !== undefined) {
    if (isPaid) {
      conditions.push(sql`${trainingModules.price} > 0`);
    } else {
      conditions.push(eq(trainingModules.price, '0'));
    }
  }

  // Build query
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(trainingModules)
    .where(whereClause);
  
  const total = Number(countResult[0]?.count || 0);

  // Get paginated data
  const query = db
    .select()
    .from(trainingModules)
    .where(whereClause)
    .orderBy(desc(trainingModules.createdAt))
    .limit(limit)
    .offset(offset);

  const data = await query;

  return {
    data,
    total,
    limit,
    offset,
  };
}

/**
 * Get a single training module by ID
 */
export async function getTrainingModuleById(id: string): Promise<typeof trainingModules.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [module] = await db
    .select()
    .from(trainingModules)
    .where(eq(trainingModules.id, id))
    .limit(1);

  return module || null;
}

/**
 * Create a new training module
 */
export async function createTrainingModule(moduleData: {
  trainerId: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  price?: string;
  duration?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
}): Promise<typeof trainingModules.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [newModule] = await db
    .insert(trainingModules)
    .values({
      trainerId: moduleData.trainerId,
      title: moduleData.title,
      description: moduleData.description,
      videoUrl: moduleData.videoUrl,
      thumbnailUrl: moduleData.thumbnailUrl || null,
      price: moduleData.price || '0',
      duration: moduleData.duration || null,
      level: moduleData.level,
      category: moduleData.category,
    })
    .returning();

  return newModule || null;
}

/**
 * Update a training module by ID
 */
export async function updateTrainingModule(
  id: string,
  updates: {
    title?: string;
    description?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    price?: string;
    duration?: string;
    level?: 'beginner' | 'intermediate' | 'advanced';
    category?: string;
  }
): Promise<typeof trainingModules.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const updateData: any = {
    ...updates,
    updatedAt: sql`NOW()`,
  };

  const [updatedModule] = await db
    .update(trainingModules)
    .set(updateData)
    .where(eq(trainingModules.id, id))
    .returning();

  return updatedModule || null;
}

/**
 * Delete a training module by ID
 */
export async function deleteTrainingModule(id: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  const result = await db
    .delete(trainingModules)
    .where(eq(trainingModules.id, id));

  return result.rowCount ? result.rowCount > 0 : false;
}

/**
 * Record a purchase of a training module
 */
export async function purchaseModule(userId: string, moduleId: string): Promise<typeof trainingPurchases.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  // Check if already purchased
  const [existingPurchase] = await db
    .select()
    .from(trainingPurchases)
    .where(and(
      eq(trainingPurchases.userId, userId),
      eq(trainingPurchases.moduleId, moduleId)
    ))
    .limit(1);

  if (existingPurchase) {
    return existingPurchase;
  }

  const [newPurchase] = await db
    .insert(trainingPurchases)
    .values({
      userId,
      moduleId,
    })
    .returning();

  return newPurchase || null;
}

/**
 * Get all modules purchased by a user (returns list of module IDs)
 */
export async function getPurchasedModules(userId: string): Promise<string[]> {
  const db = getDb();
  if (!db) {
    return [];
  }

  const purchases = await db
    .select({ moduleId: trainingPurchases.moduleId })
    .from(trainingPurchases)
    .where(eq(trainingPurchases.userId, userId));

  return purchases.map(p => p.moduleId);
}


