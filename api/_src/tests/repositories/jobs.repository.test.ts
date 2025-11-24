import { describe, it, expect, beforeEach } from 'vitest';
import * as jobsRepo from '../../repositories/jobs.repository.js';
import { createTestUser, createTestJob } from '../helpers.js';
import { getDb } from '../../db/index.js';
import { jobs, users, applications } from '../../db/schema.js';

describe('Jobs Repository (Integration)', () => {
  const db = getDb();

  beforeEach(async () => {
    if (db) {
      await db.delete(applications); // Foreign key constraint
      await db.delete(jobs);
      await db.delete(users);
    }
  });

  it('should create a job', async () => {
    const user = await createTestUser('business');
    
    const jobData = {
      businessId: user!.id,
      title: 'Test Job',
      payRate: '50',
      description: 'Test description',
      date: new Date().toISOString(),
      startTime: '09:00',
      endTime: '17:00',
      shopName: 'Test Shop',
      city: 'New York',
    };

    const job = await jobsRepo.createJob(jobData);

    expect(job).toBeDefined();
    expect(job?.title).toBe('Test Job');
    expect(job?.businessId).toBe(user!.id);
    expect(job?.status).toBe('open');
  });

  it('should find jobs with filters', async () => {
    const { user, job: jobA } = await createTestJob(); // Creates business user and job A
    
    // Update Job A to match test criteria
    await jobsRepo.updateJob(jobA.id, { 
        title: 'Job A', 
        payRate: '40',
        city: 'NY' 
    });

    // Create Job B for same user
    await jobsRepo.createJob({
      businessId: user.id,
      title: 'Job B',
      payRate: '60',
      description: 'Desc B',
      date: new Date().toISOString(),
      startTime: '09:00',
      endTime: '17:00',
      city: 'LA',
    });

    const result = await jobsRepo.getJobs({ city: 'NY' });
    expect(result?.data).toHaveLength(1);
    expect(result?.data[0].title).toBe('Job A');

    const all = await jobsRepo.getJobs({ businessId: user.id });
    expect(all?.data).toHaveLength(2);
  });

  it('should update job status', async () => {
    const { job } = await createTestJob();

    const updated = await jobsRepo.updateJob(job.id, { status: 'filled' });
    expect(updated?.status).toBe('filled');

    const retrieved = await jobsRepo.getJobById(job.id);
    expect(retrieved?.status).toBe('filled');
  });
});
