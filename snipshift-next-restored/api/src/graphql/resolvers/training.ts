import { GraphQLContext } from '../context.js';
import { eq, desc, sql, and, or } from 'drizzle-orm';
import { trainingContent, purchases } from '../../database/schema.js';
import { logger } from '../../utils/logger.js';

export const trainingResolvers = {
  Query: {
    trainingContent: async (
      _: any,
      {
        category,
        level,
        trainerId,
        first = 20,
        after,
      }: {
        category?: string;
        level?: string;
        trainerId?: string;
        first?: number;
        after?: string;
      },
      context: GraphQLContext
    ) => {
      let conditions = [];

      if (category) {
        conditions.push(eq(trainingContent.category, category));
      }

      if (level) {
        conditions.push(eq(trainingContent.level, level));
      }

      if (trainerId) {
        conditions.push(eq(trainingContent.trainerId, trainerId));
      }

      if (after) {
        conditions.push(sql`${trainingContent.createdAt} < ${after}`);
      }

      const content = await context.db
        .select()
        .from(trainingContent)
        .where(and(...conditions))
        .orderBy(desc(trainingContent.createdAt))
        .limit(first + 1);

      const hasNextPage = content.length > first;
      const content_result = hasNextPage ? content.slice(0, -1) : content;

      return {
        content: content_result,
        totalCount: content_result.length,
        hasNextPage,
      };
    },

    trainingContentById: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const [content] = await context.db
        .select()
        .from(trainingContent)
        .where(eq(trainingContent.id, id))
        .limit(1);

      return content;
    },

    purchasedContent: async (_: any, { userId }: { userId: string }, context: GraphQLContext) => {
      if (!context.user || context.user.id !== userId) {
        throw new Error('Unauthorized');
      }

      const purchased = await context.db
        .select({
          content: trainingContent,
        })
        .from(purchases)
        .innerJoin(trainingContent, eq(purchases.contentId, trainingContent.id))
        .where(and(
          eq(purchases.userId, userId),
          eq(purchases.accessGranted, true)
        ));

      return purchased.map(item => item.content);
    },
  },

  Mutation: {
    createTrainingContent: async (
      _: any,
      { input }: { input: any },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      if (!context.user.roles.includes('trainer')) {
        throw new Error('Only trainers can create training content');
      }

      try {
        const [newContent] = await context.db
          .insert(trainingContent)
          .values({
            ...input,
            trainerId: context.user.id,
          })
          .returning();

        logger.info(`Training content created: ${newContent.title}`);
        return newContent;
      } catch (error) {
        logger.error('Create training content error:', error);
        throw new Error('Failed to create training content');
      }
    },

    updateTrainingContent: async (
      _: any,
      { id, input }: { id: string; input: any },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const [content] = await context.db
        .select()
        .from(trainingContent)
        .where(eq(trainingContent.id, id))
        .limit(1);

      if (!content) {
        throw new Error('Training content not found');
      }

      if (content.trainerId !== context.user.id) {
        throw new Error('Only the content creator can update this content');
      }

      try {
        const [updatedContent] = await context.db
          .update(trainingContent)
          .set(input)
          .where(eq(trainingContent.id, id))
          .returning();

        logger.info(`Training content updated: ${updatedContent.title}`);
        return updatedContent;
      } catch (error) {
        logger.error('Update training content error:', error);
        throw new Error('Failed to update training content');
      }
    },

    deleteTrainingContent: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const [content] = await context.db
        .select()
        .from(trainingContent)
        .where(eq(trainingContent.id, id))
        .limit(1);

      if (!content) {
        throw new Error('Training content not found');
      }

      if (content.trainerId !== context.user.id) {
        throw new Error('Only the content creator can delete this content');
      }

      try {
        await context.db
          .delete(trainingContent)
          .where(eq(trainingContent.id, id));

        logger.info(`Training content deleted: ${content.title}`);
        return true;
      } catch (error) {
        logger.error('Delete training content error:', error);
        throw new Error('Failed to delete training content');
      }
    },

    purchaseContent: async (_: any, { contentId }: { contentId: string }, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const [content] = await context.db
        .select()
        .from(trainingContent)
        .where(eq(trainingContent.id, contentId))
        .limit(1);

      if (!content) {
        throw new Error('Training content not found');
      }

      if (!content.isPaid || !content.price) {
        throw new Error('This content is not available for purchase');
      }

      // Check if already purchased
      const [existingPurchase] = await context.db
        .select()
        .from(purchases)
        .where(and(
          eq(purchases.userId, context.user.id),
          eq(purchases.contentId, contentId)
        ))
        .limit(1);

      if (existingPurchase) {
        throw new Error('You have already purchased this content');
      }

      try {
        const [newPurchase] = await context.db
          .insert(purchases)
          .values({
            userId: context.user.id,
            contentId,
            amount: content.price,
            paymentStatus: 'pending', // In a real app, this would be handled by Stripe
            accessGranted: false,
          })
          .returning();

        // In a real implementation, you'd integrate with Stripe here
        // For now, we'll auto-grant access
        const [updatedPurchase] = await context.db
          .update(purchases)
          .set({
            paymentStatus: 'completed',
            accessGranted: true,
          })
          .where(eq(purchases.id, newPurchase.id))
          .returning();

        // Increment purchase count
        await context.db
          .update(trainingContent)
          .set({ purchaseCount: content.purchaseCount + 1 })
          .where(eq(trainingContent.id, contentId));

        logger.info(`Content purchased: ${content.title} by ${context.user.email}`);
        return updatedPurchase;
      } catch (error) {
        logger.error('Purchase content error:', error);
        throw new Error('Failed to purchase content');
      }
    },
  },
};
