import { GraphQLContext } from './context.js';
import { userResolvers } from './resolvers/user.js';
import { authResolvers } from './resolvers/auth.js';
import { jobResolvers } from './resolvers/job.js';
import { socialResolvers } from './resolvers/social.js';
import { trainingResolvers } from './resolvers/training.js';
import { chatResolvers } from './resolvers/chat.js';
import { fileResolvers } from './resolvers/file.js';
import { eq } from 'drizzle-orm';
import { 
  users, 
  hubProfiles, 
  professionalProfiles, 
  brandProfiles, 
  trainerProfiles,
  jobs,
  applications,
  socialPosts,
  comments,
  trainingContent,
  purchases,
  chats,
  messages
} from '../database/schema.js';

export const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...jobResolvers.Query,
    ...socialResolvers.Query,
    ...trainingResolvers.Query,
    ...chatResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...userResolvers.Mutation,
    ...jobResolvers.Mutation,
    ...socialResolvers.Mutation,
    ...trainingResolvers.Mutation,
    ...chatResolvers.Mutation,
    ...fileResolvers.Mutation,
  },
  Subscription: {
    ...jobResolvers.Subscription,
    ...socialResolvers.Subscription,
    ...chatResolvers.Subscription,
  },
  // Type resolvers for relationships
  User: {
    hubProfile: async (parent: any, _: any, context: GraphQLContext) => {
      if (!parent.roles?.includes('hub')) return null;
      const [profile] = await context.db.select().from(hubProfiles).where(eq(hubProfiles.userId, parent.id));
      return profile;
    },
    professionalProfile: async (parent: any, _: any, context: GraphQLContext) => {
      if (!parent.roles?.includes('professional')) return null;
      const [profile] = await context.db.select().from(professionalProfiles).where(eq(professionalProfiles.userId, parent.id));
      return profile;
    },
    brandProfile: async (parent: any, _: any, context: GraphQLContext) => {
      if (!parent.roles?.includes('brand')) return null;
      const [profile] = await context.db.select().from(brandProfiles).where(eq(brandProfiles.userId, parent.id));
      return profile;
    },
    trainerProfile: async (parent: any, _: any, context: GraphQLContext) => {
      if (!parent.roles?.includes('trainer')) return null;
      const [profile] = await context.db.select().from(trainerProfiles).where(eq(trainerProfiles.userId, parent.id));
      return profile;
    },
  },
  Job: {
    hub: async (parent: any, _: any, context: GraphQLContext) => {
      const [hub] = await context.db.select().from(users).where(eq(users.id, parent.hubId));
      return hub;
    },
    applicants: async (parent: any, _: any, context: GraphQLContext) => {
      return await context.db.select().from(applications).where(eq(applications.jobId, parent.id));
    },
    selectedProfessional: async (parent: any, _: any, context: GraphQLContext) => {
      if (!parent.selectedProfessionalId) return null;
      const [professional] = await context.db.select().from(users).where(eq(users.id, parent.selectedProfessionalId));
      return professional;
    },
  },
  Application: {
    job: async (parent: any, _: any, context: GraphQLContext) => {
      const [job] = await context.db.select().from(jobs).where(eq(jobs.id, parent.jobId));
      return job;
    },
    professional: async (parent: any, _: any, context: GraphQLContext) => {
      const [professional] = await context.db.select().from(users).where(eq(users.id, parent.professionalId));
      return professional;
    },
  },
  SocialPost: {
    author: async (parent: any, _: any, context: GraphQLContext) => {
      const [author] = await context.db.select().from(users).where(eq(users.id, parent.authorId));
      return author;
    },
    comments: async (parent: any, _: any, context: GraphQLContext) => {
      return await context.db.select().from(comments).where(eq(comments.postId, parent.id));
    },
    isLikedByUser: async (parent: any, { userId }: { userId: string }, context: GraphQLContext) => {
      // This would need a likes table - for now return false
      return false;
    },
  },
  Comment: {
    author: async (parent: any, _: any, context: GraphQLContext) => {
      const [author] = await context.db.select().from(users).where(eq(users.id, parent.authorId));
      return author;
    },
  },
  TrainingContent: {
    trainer: async (parent: any, _: any, context: GraphQLContext) => {
      const [trainer] = await context.db.select().from(users).where(eq(users.id, parent.trainerId));
      return trainer;
    },
  },
  Purchase: {
    user: async (parent: any, _: any, context: GraphQLContext) => {
      const [user] = await context.db.select().from(users).where(eq(users.id, parent.userId));
      return user;
    },
    content: async (parent: any, _: any, context: GraphQLContext) => {
      const [content] = await context.db.select().from(trainingContent).where(eq(trainingContent.id, parent.contentId));
      return content;
    },
  },
  Message: {
    sender: async (parent: any, _: any, context: GraphQLContext) => {
      const [sender] = await context.db.select().from(users).where(eq(users.id, parent.senderId));
      return sender;
    },
    receiver: async (parent: any, _: any, context: GraphQLContext) => {
      const [receiver] = await context.db.select().from(users).where(eq(users.id, parent.receiverId));
      return receiver;
    },
  },
};
