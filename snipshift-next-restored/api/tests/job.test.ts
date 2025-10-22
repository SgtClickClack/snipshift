import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createTestContext, generateTestUser, generateTestJob } from './utils/testUtils.js';
import { jobResolvers } from '../src/graphql/resolvers/job.js';

describe('Job Resolvers', () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('job query', () => {
    it('should return job by id', async () => {
      const testJob = generateTestJob();

      mockDb.select.mockResolvedValue([testJob]);

      const context = createTestContext();
      context.db = mockDb;

      const result = await jobResolvers.Query.job(null, { id: testJob.id }, context);

      expect(result).toEqual(testJob);
    });
  });

  describe('jobs query', () => {
    it('should return paginated jobs', async () => {
      const testJobs = [
        generateTestJob(),
        generateTestJob(),
        generateTestJob(),
      ];

      mockDb.select.mockResolvedValue(testJobs);

      const context = createTestContext();
      context.db = mockDb;

      const result = await jobResolvers.Query.jobs(
        null,
        { first: 20 },
        context
      );

      expect(result.jobs).toEqual(testJobs);
      expect(result.totalCount).toBe(testJobs.length);
      expect(result.hasNextPage).toBe(false);
    });

    it('should filter jobs by skills', async () => {
      const testJobs = [generateTestJob({ skillsRequired: ['cutting', 'styling'] })];

      mockDb.select.mockResolvedValue(testJobs);

      const context = createTestContext();
      context.db = mockDb;

      const result = await jobResolvers.Query.jobs(
        null,
        {
          filters: { skills: ['cutting'] },
          first: 20,
        },
        context
      );

      expect(result.jobs).toEqual(testJobs);
    });

    it('should filter jobs by location', async () => {
      const testJobs = [generateTestJob({
        location: {
          city: 'New York',
          state: 'NY',
          country: 'USA',
        },
      })];

      mockDb.select.mockResolvedValue(testJobs);

      const context = createTestContext();
      context.db = mockDb;

      const result = await jobResolvers.Query.jobs(
        null,
        {
          filters: { location: 'New York' },
          first: 20,
        },
        context
      );

      expect(result.jobs).toEqual(testJobs);
    });

    it('should filter jobs by pay range', async () => {
      const testJobs = [generateTestJob({ payRate: 30.00 })];

      mockDb.select.mockResolvedValue(testJobs);

      const context = createTestContext();
      context.db = mockDb;

      const result = await jobResolvers.Query.jobs(
        null,
        {
          filters: { payMin: 25.00, payMax: 35.00 },
          first: 20,
        },
        context
      );

      expect(result.jobs).toEqual(testJobs);
    });
  });

  describe('createJob mutation', () => {
    it('should create job successfully for hub user', async () => {
      const hubUser = generateTestUser({ roles: ['hub'] });
      const jobInput = {
        title: 'Barber Needed',
        description: 'Looking for experienced barber',
        skillsRequired: ['cutting', 'styling'],
        payRate: 25.00,
        payType: 'hourly',
        location: {
          city: 'Test City',
          state: 'Test State',
          country: 'Test Country',
        },
        date: new Date().toISOString(),
        startTime: '09:00',
        endTime: '17:00',
      };

      const createdJob = generateTestJob(jobInput);

      mockDb.insert.mockResolvedValue([createdJob]);

      const context = createTestContext(hubUser);
      context.db = mockDb;

      const result = await jobResolvers.Mutation.createJob(
        null,
        { input: jobInput },
        context
      );

      expect(result).toEqual(createdJob);
      expect(result.hubId).toBe(hubUser.id);
    });

    it('should throw error for non-hub user', async () => {
      const clientUser = generateTestUser({ roles: ['client'] });
      const jobInput = {
        title: 'Test Job',
        description: 'Test description',
        skillsRequired: ['cutting'],
        payRate: 25.00,
        payType: 'hourly',
        location: {
          city: 'Test City',
          state: 'Test State',
          country: 'Test Country',
        },
        date: new Date().toISOString(),
        startTime: '09:00',
        endTime: '17:00',
      };

      const context = createTestContext(clientUser);
      context.db = mockDb;

      await expect(
        jobResolvers.Mutation.createJob(null, { input: jobInput }, context)
      ).rejects.toThrow('Only hubs can create jobs');
    });

    it('should throw error when not authenticated', async () => {
      const jobInput = {
        title: 'Test Job',
        description: 'Test description',
        skillsRequired: ['cutting'],
        payRate: 25.00,
        payType: 'hourly',
        location: {
          city: 'Test City',
          state: 'Test State',
          country: 'Test Country',
        },
        date: new Date().toISOString(),
        startTime: '09:00',
        endTime: '17:00',
      };

      const context = createTestContext(); // No user

      await expect(
        jobResolvers.Mutation.createJob(null, { input: jobInput }, context)
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('applyToJob mutation', () => {
    it('should apply to job successfully for professional', async () => {
      const professionalUser = generateTestUser({ roles: ['professional'] });
      const testJob = generateTestJob({ status: 'open' });
      const applicationInput = {
        jobId: testJob.id,
        professionalId: professionalUser.id,
        message: 'I am interested in this position',
      };

      const createdApplication = {
        id: 'application-id',
        ...applicationInput,
        status: 'pending',
        appliedAt: new Date(),
      };

      // Mock job exists and is open
      mockDb.select
        .mockResolvedValueOnce([testJob]) // Job check
        .mockResolvedValueOnce([]); // No existing application

      mockDb.insert.mockResolvedValue([createdApplication]);

      const context = createTestContext(professionalUser);
      context.db = mockDb;

      const result = await jobResolvers.Mutation.applyToJob(
        null,
        { input: applicationInput },
        context
      );

      expect(result).toEqual(createdApplication);
    });

    it('should throw error when job not found', async () => {
      const professionalUser = generateTestUser({ roles: ['professional'] });
      const applicationInput = {
        jobId: 'non-existent-job',
        professionalId: professionalUser.id,
        message: 'Interested',
      };

      // Mock job not found
      mockDb.select.mockResolvedValue([]);

      const context = createTestContext(professionalUser);
      context.db = mockDb;

      await expect(
        jobResolvers.Mutation.applyToJob(null, { input: applicationInput }, context)
      ).rejects.toThrow('Job not found or not accepting applications');
    });

    it('should throw error when job is not open', async () => {
      const professionalUser = generateTestUser({ roles: ['professional'] });
      const testJob = generateTestJob({ status: 'filled' });
      const applicationInput = {
        jobId: testJob.id,
        professionalId: professionalUser.id,
        message: 'Interested',
      };

      // Mock job exists but is filled
      mockDb.select.mockResolvedValue([testJob]);

      const context = createTestContext(professionalUser);
      context.db = mockDb;

      await expect(
        jobResolvers.Mutation.applyToJob(null, { input: applicationInput }, context)
      ).rejects.toThrow('Job not found or not accepting applications');
    });

    it('should throw error for duplicate application', async () => {
      const professionalUser = generateTestUser({ roles: ['professional'] });
      const testJob = generateTestJob({ status: 'open' });
      const applicationInput = {
        jobId: testJob.id,
        professionalId: professionalUser.id,
        message: 'Interested',
      };

      const existingApplication = {
        id: 'existing-app',
        jobId: testJob.id,
        professionalId: professionalUser.id,
        status: 'pending',
      };

      // Mock job exists and is open, but user already applied
      mockDb.select
        .mockResolvedValueOnce([testJob]) // Job check
        .mockResolvedValueOnce([existingApplication]); // Existing application

      const context = createTestContext(professionalUser);
      context.db = mockDb;

      await expect(
        jobResolvers.Mutation.applyToJob(null, { input: applicationInput }, context)
      ).rejects.toThrow('You have already applied to this job');
    });
  });

  describe('updateApplicationStatus mutation', () => {
    it('should accept application and update job status', async () => {
      const hubUser = generateTestUser({ roles: ['hub'] });
      const testJob = generateTestJob({ status: 'open' });
      const application = {
        id: 'application-id',
        jobId: testJob.id,
        professionalId: 'professional-id',
        status: 'pending',
      };

      const updatedApplication = { ...application, status: 'accepted' };
      const updatedJob = { ...testJob, status: 'filled', selectedProfessionalId: application.professionalId };

      // Mock application and job lookup
      mockDb.select.mockResolvedValue([{ application, job: testJob }]);
      mockDb.update
        .mockResolvedValueOnce([updatedApplication]) // Update application
        .mockResolvedValueOnce([updatedJob]); // Update job

      const context = createTestContext(hubUser);
      context.db = mockDb;

      const result = await jobResolvers.Mutation.updateApplicationStatus(
        null,
        { applicationId: application.id, status: 'accepted' },
        context
      );

      expect(result.status).toBe('accepted');
    });

    it('should reject application', async () => {
      const hubUser = generateTestUser({ roles: ['hub'] });
      const testJob = generateTestJob({ status: 'open' });
      const application = {
        id: 'application-id',
        jobId: testJob.id,
        professionalId: 'professional-id',
        status: 'pending',
      };

      const updatedApplication = { ...application, status: 'rejected' };

      // Mock application and job lookup
      mockDb.select.mockResolvedValue([{ application, job: testJob }]);
      mockDb.update.mockResolvedValue([updatedApplication]);

      const context = createTestContext(hubUser);
      context.db = mockDb;

      const result = await jobResolvers.Mutation.updateApplicationStatus(
        null,
        { applicationId: application.id, status: 'rejected' },
        context
      );

      expect(result.status).toBe('rejected');
    });

    it('should throw error for non-hub user', async () => {
      const clientUser = generateTestUser({ roles: ['client'] });
      const application = {
        id: 'application-id',
        jobId: 'job-id',
        professionalId: 'professional-id',
        status: 'pending',
      };

      // Mock application and job lookup
      mockDb.select.mockResolvedValue([{ application, job: generateTestJob() }]);

      const context = createTestContext(clientUser);
      context.db = mockDb;

      await expect(
        jobResolvers.Mutation.updateApplicationStatus(
          null,
          { applicationId: application.id, status: 'accepted' },
          context
        )
      ).rejects.toThrow('Only the job creator can update application status');
    });
  });
});
