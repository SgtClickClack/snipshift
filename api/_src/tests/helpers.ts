import * as usersRepo from '../repositories/users.repository.js';
import * as jobsRepo from '../repositories/jobs.repository.js';
import * as applicationsRepo from '../repositories/applications.repository.js';
import crypto from 'crypto';

/**
 * Create a test user for integration tests
 */
export async function createTestUser(role: 'business' | 'professional' = 'professional') {
  const uniqueId = crypto.randomUUID();
  const user = await usersRepo.createUser({
    email: `test-${role}-${uniqueId}@example.com`,
    name: `Test ${role}`,
    role,
  });
  
  if (!user) {
    throw new Error('Failed to create test user');
  }
  
  return user;
}

/**
 * Create a test job for integration tests.
 * Ensures a business user exists if not provided.
 */
export async function createTestJob(userId?: string) {
  let user;
  
  if (!userId) {
    user = await createTestUser('business');
    if (!user || !user.id) {
        console.error('[ERROR] createTestUser failed to return valid user with ID', user);
        throw new Error('Failed to create valid business user for job');
    }
    userId = user.id;
  } else {
    // If userId is provided, we assume the user exists or we fetch it if we need to return it
    // For now, we just need the ID for the job creation
    // But to return { job, user }, we might need to fetch it if we didn't create it.
    // However, for simplicity and performance, if the caller provides ID, they likely have the user.
    // Let's try to fetch it to be safe if we want to return it, or just return null for user if not created here.
    // Better: if userId is passed, the caller is responsible for the user.
    // But the goal is to prevent FK errors.
    
    // If userId is passed, we trust it exists.
    user = await usersRepo.getUserById(userId);
    if (!user) {
      // If it doesn't exist (e.g. random ID passed), we should create one? 
      // Or throw error? Throwing error is better to catch bad tests.
       throw new Error(`User with ID ${userId} not found when creating job`);
    }
  }

  const job = await jobsRepo.createJob({
    businessId: userId,
    title: 'Test Job',
    description: 'A test job description',
    payRate: '50',
    city: 'New York',
    date: new Date().toISOString(),
    startTime: '09:00',
    endTime: '17:00',
  });

  if (!job) {
    throw new Error('Failed to create test job');
  }

  return { job, user };
}

/**
 * Create a test application for integration tests.
 * Ensures a job and applicant exist.
 */
export async function createTestApplication(jobId?: string, userId?: string) {
  let job;
  let applicant;
  let businessUser;

  // Ensure Job
  if (!jobId) {
    const result = await createTestJob();
    job = result.job;
    businessUser = result.user;
    jobId = job.id;
  } else {
    job = await jobsRepo.getJobById(jobId);
    if (!job) throw new Error(`Job with ID ${jobId} not found`);
  }

  // Ensure Applicant
  if (!userId) {
    applicant = await createTestUser('professional');
    userId = applicant.id;
  } else {
    applicant = await usersRepo.getUserById(userId);
    if (!applicant) throw new Error(`User with ID ${userId} not found`);
  }

  const application = await applicationsRepo.createApplication({
    jobId: jobId!,
    userId: userId!,
    name: applicant!.name,
    email: applicant!.email,
    coverLetter: 'Test Cover Letter',
  });

  if (!application) {
    throw new Error('Failed to create test application');
  }

  return { application, job, applicant, businessUser };
}
