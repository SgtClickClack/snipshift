import { GraphQLContext } from '../context.js';
import { eq, desc, sql, and } from 'drizzle-orm';
import { socialPosts, comments } from '../../database/schema.js';
import { logger } from '../../utils/logger.js';

export const socialResolvers = {
  Query: {
    socialFeed: async (
      _: any,
      { first = 20, after }: { first?: number; after?: string },
      context: GraphQLContext
    ) => {
      let conditions = [];

      if (after) {
        conditions.push(sql`${socialPosts.createdAt} < ${after}`);
      }

      const posts = await context.db
        .select()
        .from(socialPosts)
        .where(and(...conditions))
        .orderBy(desc(socialPosts.createdAt))
        .limit(first + 1);

      const hasNextPage = posts.length > first;
      const posts_result = hasNextPage ? posts.slice(0, -1) : posts;

      return {
        posts: posts_result,
        totalCount: posts_result.length,
        hasNextPage,
      };
    },

    socialPost: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const [post] = await context.db
        .select()
        .from(socialPosts)
        .where(eq(socialPosts.id, id))
        .limit(1);

      return post;
    },
  },

  Mutation: {
    createSocialPost: async (
      _: any,
      { input }: { input: any },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      try {
        const [newPost] = await context.db
          .insert(socialPosts)
          .values({
            ...input,
            authorId: context.user.id,
          })
          .returning();

        logger.info(`Social post created by ${context.user.email}`);
        return newPost;
      } catch (error) {
        logger.error('Create social post error:', error);
        throw new Error('Failed to create post');
      }
    },

    likePost: async (_: any, { postId }: { postId: string }, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      // For now, just increment the likes count
      // In a real implementation, you'd have a likes table
      const [post] = await context.db
        .select()
        .from(socialPosts)
        .where(eq(socialPosts.id, postId))
        .limit(1);

      if (!post) {
        throw new Error('Post not found');
      }

      const [updatedPost] = await context.db
        .update(socialPosts)
        .set({ likes: post.likes + 1 })
        .where(eq(socialPosts.id, postId))
        .returning();

      return updatedPost;
    },

    unlikePost: async (_: any, { postId }: { postId: string }, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const [post] = await context.db
        .select()
        .from(socialPosts)
        .where(eq(socialPosts.id, postId))
        .limit(1);

      if (!post) {
        throw new Error('Post not found');
      }

      const [updatedPost] = await context.db
        .update(socialPosts)
        .set({ likes: Math.max(0, post.likes - 1) })
        .where(eq(socialPosts.id, postId))
        .returning();

      return updatedPost;
    },

    addComment: async (
      _: any,
      { postId, content }: { postId: string; content: string },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      try {
        const [newComment] = await context.db
          .insert(comments)
          .values({
            postId,
            authorId: context.user.id,
            content,
          })
          .returning();

        logger.info(`Comment added to post ${postId}`);
        return newComment;
      } catch (error) {
        logger.error('Add comment error:', error);
        throw new Error('Failed to add comment');
      }
    },
  },

  Subscription: {
    socialPostCreated: {
      subscribe: () => ({
        [Symbol.asyncIterator]() {
          return {
            next: () => Promise.resolve({ done: true, value: undefined }),
          };
        },
      }),
    },
  },
};
