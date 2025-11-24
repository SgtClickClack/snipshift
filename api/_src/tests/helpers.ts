import * as usersRepo from '../repositories/users.repository.js';
import * as jobsRepo from '../repositories/jobs.repository.js';
import crypto from 'crypto';

/**
 * Create a test user for integration tests
 */
export async function createTestUser(role: 'business' | 'professional' = 'professional') {
  const uniqueId = crypto.randomUUID();
  return await usersRepo.createUser({
    email: `test-${role}-${uniqueId}@example.com`,
    name: `Test ${role}`,
    role,
  });
}

/**
 * Create a test job for integration tests
 */
export async function createTestJob(userId: string) {
  return await jobsRepo.createJob({
    businessId: userId,
    title: 'Test Job',
    description: 'A test job description',
    payRate: '50',
    location: 'New York',
    date: new Date().toISOString(),
    startTime: '09:00',
    endTime: '17:00',
  });
}
