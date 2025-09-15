import { GraphQLContext } from '../context.js';
import { eq, and, or, desc, asc, sql } from 'drizzle-orm';
import { jobs, applications, users } from '../../database/schema.js';
import { logger } from '../../utils/logger.js';
import { getRedis } from '../../config/redis.js';

export const jobResolvers = {
  Query: {
    job: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const [job] = await context.db
        .select()
        .from(jobs)
        .where(eq(jobs.id, id))
        .limit(1);

      return job;
    },

    jobs: async (
      _: any,
      {
        filters,
        first = 20,
        after,
      }: {
        filters?: {
          status?: string;
          location?: string;
          skills?: string[];
          payMin?: number;
          payMax?: number;
          dateFrom?: Date;
          dateTo?: Date;
        };
        first?: number;
        after?: string;
      },
      context: GraphQLContext
    ) => {
      let conditions = [];
      let orderBy = [desc(jobs.createdAt)];

      // Apply filters
      if (filters?.status) {
        conditions.push(eq(jobs.status, filters.status as any));
      }

      if (filters?.location) {
        conditions.push(sql`${jobs.location}->>'city' ILIKE ${`%${filters.location}%`}`);
      }

      if (filters?.skills && filters.skills.length > 0) {
        // Check if job skills contain any of the requested skills
        const skillConditions = filters.skills.map(skill =>
          sql`${jobs.skillsRequired}::jsonb ? ${skill}`
        );
        conditions.push(or(...skillConditions));
      }

      if (filters?.payMin) {
        conditions.push(sql`${jobs.payRate} >= ${filters.payMin}`);
      }

      if (filters?.payMax) {
        conditions.push(sql`${jobs.payRate} <= ${filters.payMax}`);
      }

      if (filters?.dateFrom) {
        conditions.push(sql`${jobs.date} >= ${filters.dateFrom}`);
      }

      if (filters?.dateTo) {
        conditions.push(sql`${jobs.date} <= ${filters.dateTo}`);
      }

      // Pagination
      if (after) {
        conditions.push(sql`${jobs.createdAt} < ${after}`);
      }

      const jobList = await context.db
        .select()
        .from(jobs)
        .where(and(...conditions))
        .orderBy(...orderBy)
        .limit(first + 1); // +1 to check if there's a next page

      const hasNextPage = jobList.length > first;
      const jobs_result = hasNextPage ? jobList.slice(0, -1) : jobList;

      return {
        jobs: jobs_result,
        totalCount: jobs_result.length, // This should be a proper count query
        hasNextPage,
      };
    },

    jobsByHub: async (
      _: any,
      { hubId, first = 20, after }: { hubId: string; first?: number; after?: string },
      context: GraphQLContext
    ) => {
      let conditions = [eq(jobs.hubId, hubId)];

      if (after) {
        conditions.push(sql`${jobs.createdAt} < ${after}`);
      }

      const jobList = await context.db
        .select()
        .from(jobs)
        .where(and(...conditions))
        .orderBy(desc(jobs.createdAt))
        .limit(first + 1);

      const hasNextPage = jobList.length > first;
      const jobs_result = hasNextPage ? jobList.slice(0, -1) : jobList;

      return {
        jobs: jobs_result,
        totalCount: jobs_result.length,
        hasNextPage,
      };
    },

    jobsByProfessional: async (
      _: any,
      { professionalId, first = 20, after }: { professionalId: string; first?: number; after?: string },
      context: GraphQLContext
    ) => {
      // Get jobs where the professional has applied
      const appliedJobs = await context.db
        .select({
          job: jobs,
        })
        .from(applications)
        .innerJoin(jobs, eq(applications.jobId, jobs.id))
        .where(eq(applications.professionalId, professionalId))
        .orderBy(desc(jobs.createdAt))
        .limit(first + 1);

      const hasNextPage = appliedJobs.length > first;
      const jobs_result = hasNextPage ? appliedJobs.slice(0, -1) : appliedJobs;

      return {
        jobs: jobs_result.map(item => item.job),
        totalCount: jobs_result.length,
        hasNextPage,
      };
    },
  },

  Mutation: {
    createJob: async (
      _: any,
      { input }: { input: any },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      if (!context.user.roles.includes('hub')) {
        throw new Error('Only hubs can create jobs');
      }

      try {
        const [newJob] = await context.db
          .insert(jobs)
          .values({
            ...input,
            hubId: context.user.id,
          })
          .returning();

        // Publish job creation event for subscriptions
        try {
          const redis = getRedis();
          await redis.publish('jobCreated', JSON.stringify({
            jobCreated: newJob,
            hubId: context.user.id,
          }));
        } catch (error) {
          logger.warn('Failed to publish job creation event:', error);
        }

        logger.info(`Job created: ${newJob.title} by ${context.user.email}`);
        return newJob;
      } catch (error) {
        logger.error('Create job error:', error);
        throw new Error('Failed to create job');
      }
    },

    updateJob: async (
      _: any,
      { id, input }: { id: string; input: any },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const [job] = await context.db
        .select()
        .from(jobs)
        .where(eq(jobs.id, id))
        .limit(1);

      if (!job) {
        throw new Error('Job not found');
      }

      if (job.hubId !== context.user.id) {
        throw new Error('Only the job creator can update this job');
      }

      try {
        const [updatedJob] = await context.db
          .update(jobs)
          .set(input)
          .where(eq(jobs.id, id))
          .returning();

        logger.info(`Job updated: ${updatedJob.title}`);
        return updatedJob;
      } catch (error) {
        logger.error('Update job error:', error);
        throw new Error('Failed to update job');
      }
    },

    deleteJob: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const [job] = await context.db
        .select()
        .from(jobs)
        .where(eq(jobs.id, id))
        .limit(1);

      if (!job) {
        throw new Error('Job not found');
      }

      if (job.hubId !== context.user.id) {
        throw new Error('Only the job creator can delete this job');
      }

      try {
        await context.db
          .delete(jobs)
          .where(eq(jobs.id, id));

        logger.info(`Job deleted: ${job.title}`);
        return true;
      } catch (error) {
        logger.error('Delete job error:', error);
        throw new Error('Failed to delete job');
      }
    },

    applyToJob: async (
      _: any,
      { input }: { input: { jobId: string; professionalId: string; message?: string } },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      if (!context.user.roles.includes('professional')) {
        throw new Error('Only professionals can apply to jobs');
      }

      // Verify the job exists and is open
      const [job] = await context.db
        .select()
        .from(jobs)
        .where(and(eq(jobs.id, input.jobId), eq(jobs.status, 'open')))
        .limit(1);

      if (!job) {
        throw new Error('Job not found or not accepting applications');
      }

      // Check if already applied
      const [existingApplication] = await context.db
        .select()
        .from(applications)
        .where(and(
          eq(applications.jobId, input.jobId),
          eq(applications.professionalId, context.user.id)
        ))
        .limit(1);

      if (existingApplication) {
        throw new Error('You have already applied to this job');
      }

      try {
        const [newApplication] = await context.db
          .insert(applications)
          .values({
            jobId: input.jobId,
            professionalId: context.user.id,
            message: input.message,
          })
          .returning();

        // Publish application event
        try {
          const redis = getRedis();
          await redis.publish('applicationReceived', JSON.stringify({
            applicationReceived: newApplication,
            jobId: input.jobId,
          }));
        } catch (error) {
          logger.warn('Failed to publish application event:', error);
        }

        logger.info(`Application submitted for job: ${job.title}`);
        return newApplication;
      } catch (error) {
        logger.error('Apply to job error:', error);
        throw new Error('Failed to submit application');
      }
    },

    updateApplicationStatus: async (
      _: any,
      { applicationId, status }: { applicationId: string; status: string },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const [application] = await context.db
        .select({
          application: applications,
          job: jobs,
        })
        .from(applications)
        .innerJoin(jobs, eq(applications.jobId, jobs.id))
        .where(eq(applications.id, applicationId))
        .limit(1);

      if (!application) {
        throw new Error('Application not found');
      }

      // Only the job creator can update application status
      if (application.job.hubId !== context.user.id) {
        throw new Error('Only the job creator can update application status');
      }

      try {
        const [updatedApplication] = await context.db
          .update(applications)
          .set({
            status,
            respondedAt: new Date(),
          })
          .where(eq(applications.id, applicationId))
          .returning();

        // If application is accepted, update job status and selected professional
        if (status === 'accepted') {
          await context.db
            .update(jobs)
            .set({
              status: 'filled',
              selectedProfessionalId: application.application.professionalId,
            })
            .where(eq(jobs.id, application.job.id));

          // Reject all other applications for this job
          await context.db
            .update(applications)
            .set({
              status: 'rejected',
              respondedAt: new Date(),
            })
            .where(and(
              eq(applications.jobId, application.job.id),
              sql`${applications.id} != ${applicationId}`
            ));
        }

        logger.info(`Application status updated: ${status}`);
        return updatedApplication;
      } catch (error) {
        logger.error('Update application status error:', error);
        throw new Error('Failed to update application status');
      }
    },
  },

  Subscription: {
    jobCreated: {
      subscribe: (_: any, { hubId }: { hubId?: string }, context: GraphQLContext) => {
        // This would be implemented with a pub/sub system
        // For now, return a placeholder
        return {
          [Symbol.asyncIterator]() {
            return {
              next: () => Promise.resolve({ done: true, value: undefined }),
            };
          },
        };
      },
    },

    applicationReceived: {
      subscribe: (_: any, { jobId }: { jobId?: string }, context: GraphQLContext) => {
        // This would be implemented with a pub/sub system
        return {
          [Symbol.asyncIterator]() {
            return {
              next: () => Promise.resolve({ done: true, value: undefined }),
            };
          },
        };
      },
    },
  },
};
