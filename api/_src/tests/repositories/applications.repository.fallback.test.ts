import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/index.js', () => ({
  getDb: vi.fn(),
}));

describe('Applications Repository (Fallback)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('falls back to jobs-only when shifts/shift_id columns are missing (getApplicationsForUser)', async () => {
    const { getDb } = await import('../../db/index.js');

    const undefinedColumnError: any = Object.assign(
      new Error('column "shift_id" does not exist'),
      { code: '42703', column: 'shift_id' }
    );

    const db = {
      select: vi
        .fn()
        // First query (full join) fails immediately
        .mockImplementationOnce(() => {
          throw undefinedColumnError;
        })
        // Second query (jobs-only fallback) succeeds
        .mockImplementationOnce(() => ({
          from: () => ({
            leftJoin: () => ({
              where: () => ({
                orderBy: () =>
                  Promise.resolve([
                    {
                      application: {
                        id: 'app-1',
                        jobId: 'job-1',
                        shiftId: null,
                        userId: 'user-1',
                        name: 'Test User',
                        email: 'test@example.com',
                        coverLetter: 'Cover',
                        status: 'pending',
                        appliedAt: new Date('2025-01-01T00:00:00.000Z'),
                        respondedAt: null,
                      },
                      job: {
                        id: 'job-1',
                        businessId: 'biz-1',
                        title: 'Job 1',
                        payRate: '50',
                        date: '2025-01-02',
                        startTime: '09:00',
                        endTime: '17:00',
                        shopName: 'Shop',
                        address: '123 St',
                        city: 'City',
                        state: 'State',
                      },
                    },
                  ]),
              }),
            }),
          }),
        })),
    };

    vi.mocked(getDb as any).mockReturnValue(db);

    const repo = await import('../../repositories/applications.repository.js');
    const result = await repo.getApplicationsForUser('user-1');

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result![0].job?.id).toBe('job-1');
    expect(result![0].shift).toBeNull();
    expect((result![0] as any).shiftId).toBeNull();
  });

  it('falls back to jobs-only when shifts/shift_id columns are missing (getApplicationsForBusiness)', async () => {
    const { getDb } = await import('../../db/index.js');

    const undefinedColumnError: any = Object.assign(
      new Error('column "shift_id" does not exist'),
      { code: '42703', column: 'shift_id' }
    );

    const db = {
      select: vi
        .fn()
        // First query (full join) fails immediately
        .mockImplementationOnce(() => {
          throw undefinedColumnError;
        })
        // Second query (jobs-only fallback) succeeds
        .mockImplementationOnce(() => ({
          from: () => ({
            innerJoin: () => ({
              leftJoin: () => ({
                where: () => ({
                  orderBy: () =>
                    Promise.resolve([
                      {
                        application: {
                          id: 'app-2',
                          jobId: 'job-2',
                          shiftId: null,
                          userId: 'user-2',
                          name: 'Applicant',
                          email: 'applicant@example.com',
                          coverLetter: 'Cover',
                          status: 'pending',
                          appliedAt: new Date('2025-01-01T00:00:00.000Z'),
                          respondedAt: null,
                        },
                        job: {
                          id: 'job-2',
                          businessId: 'biz-1',
                          title: 'Job 2',
                          payRate: '60',
                          date: '2025-01-03',
                          startTime: '10:00',
                          endTime: '18:00',
                          shopName: 'Shop',
                          address: '123 St',
                          city: 'City',
                          state: 'State',
                        },
                        user: {
                          id: 'user-2',
                          name: 'Applicant',
                          email: 'applicant@example.com',
                          avatarUrl: null,
                        },
                      },
                    ]),
                }),
              }),
            }),
          }),
        })),
    };

    vi.mocked(getDb as any).mockReturnValue(db);

    const repo = await import('../../repositories/applications.repository.js');
    const result = await repo.getApplicationsForBusiness('biz-1');

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result![0].job?.id).toBe('job-2');
    expect(result![0].shift).toBeNull();
    expect(result![0].user?.id).toBe('user-2');
    expect((result![0] as any).shiftId).toBeNull();
  });
});



