import { describe, it, expect, beforeEach } from 'vitest';
import * as applicationsRepo from '../../repositories/applications.repository.js';
import { createTestUser, createTestJob } from '../helpers.js';
import { getDb } from '../../db/index.js';
import { applications, jobs, users } from '../../db/schema.js';

describe('Applications Repository (Integration)', () => {
  const db = getDb();

  beforeEach(async () => {
    if (db) {
      await db.delete(applications);
      await db.delete(jobs);
      await db.delete(users);
    }
  });

  it('should create an application', async () => {
    const employer = await createTestUser('business');
    const { job } = await createTestJob(employer!.id);
    const applicant = await createTestUser('professional');

    const appData = {
      jobId: job!.id,
      userId: applicant!.id,
      name: applicant!.name,
      email: applicant!.email,
      coverLetter: 'Hire me',
    };

    const application = await applicationsRepo.createApplication(appData);

    expect(application).toBeDefined();
    expect(application?.jobId).toBe(job!.id);
    expect(application?.status).toBe('pending');
  });

  it('should retrieve applications for a user', async () => {
    const employer = await createTestUser('business');
    const { job } = await createTestJob(employer!.id);
    const applicant = await createTestUser('professional');

    await applicationsRepo.createApplication({
      jobId: job!.id,
      userId: applicant!.id,
      name: applicant!.name,
      email: applicant!.email,
      coverLetter: 'Cover Letter',
    });

    const userApps = await applicationsRepo.getApplicationsForUser(applicant!.id);
    expect(userApps).toHaveLength(1);
    expect(userApps![0].job.title).toBe('Test Job');
  });

  it('should check if user has applied', async () => {
    const employer = await createTestUser('business');
    const { job } = await createTestJob(employer!.id);
    const applicant = await createTestUser('professional');

    await applicationsRepo.createApplication({
      jobId: job!.id,
      userId: applicant!.id,
      name: applicant!.name,
      email: applicant!.email,
      coverLetter: 'Cover Letter',
    });

    const hasApplied = await applicationsRepo.hasUserAppliedToJob(job!.id, applicant!.id);
    expect(hasApplied).toBe(true);

    const notApplied = await applicationsRepo.hasUserAppliedToJob(job!.id, undefined, 'other-email@test.com');
    expect(notApplied).toBe(false);
  });

  it('should update application status', async () => {
      const employer = await createTestUser('business');
      const { job } = await createTestJob(employer!.id);
      const applicant = await createTestUser('professional');

      const app = await applicationsRepo.createApplication({
        jobId: job!.id,
        userId: applicant!.id,
        name: applicant!.name,
        email: applicant!.email,
        coverLetter: 'Cover Letter',
      });

      const updated = await applicationsRepo.updateApplicationStatus(app!.id, 'accepted');
      expect(updated?.status).toBe('accepted');
      expect(updated?.respondedAt).toBeDefined();
  });
});
