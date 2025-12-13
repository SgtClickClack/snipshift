import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import supertest from 'supertest';
import express from 'express';
import type { Express } from 'express';

// 1) Mock Auth Middleware (business/shop user)
const mockAuthUser = vi.fn((req, _res, next) => {
  req.user = {
    id: 'user-123',
    email: 'shop@example.com',
    name: 'Shop Owner',
    role: 'business',
    uid: 'firebase-uid-123',
  };
  next();
});

vi.mock('../../middleware/auth.js', () => ({
  authenticateUser: mockAuthUser,
  AuthenticatedRequest: {},
}));

// 2) Mock dependent repos/services used by the shifts router
const mockShiftsRepo = {
  getShifts: vi.fn(),
  getShiftById: vi.fn(),
  updateShift: vi.fn(),
  getShiftsByEmployer: vi.fn(),
  // Named import in router: getShiftsByEmployerInRange + createBatchShifts
  getShiftsByEmployerInRange: vi.fn(),
  createBatchShifts: vi.fn(),
};
vi.mock('../../repositories/shifts.repository.js', () => mockShiftsRepo);

vi.mock('../../repositories/users.repository.js', () => ({
  getUserById: vi.fn(),
  updateUser: vi.fn(),
}));
vi.mock('../../repositories/shift-offers.repository.js', () => ({
  createShiftOffer: vi.fn(),
  getShiftOfferById: vi.fn(),
  isOfferValid: vi.fn(),
  getOffersForProfessional: vi.fn(),
}));
vi.mock('../../repositories/jobs.repository.js', () => ({
  getJobs: vi.fn(async () => ({ data: [], total: 0, limit: 50, offset: 0 })),
}));
vi.mock('../../repositories/applications.repository.js', () => ({
  getApplications: vi.fn(async () => ({ data: [], total: 0, limit: 50, offset: 0 })),
  getApplicationsForShift: vi.fn(async () => []),
  hasUserApplied: vi.fn(async () => false),
  createApplication: vi.fn(async () => ({ id: 'app-1' })),
}));
vi.mock('../../repositories/shift-reviews.repository.js', () => ({
  hasUserReviewedShift: vi.fn(async () => false),
  createShiftReview: vi.fn(async () => ({ id: 'rev-1' })),
  updateUserRating: vi.fn(async () => undefined),
}));
vi.mock('../../services/stripe-connect.service.js', () => ({
  isAccountReady: vi.fn(async () => true),
  createStripeCustomer: vi.fn(async () => 'cus_test'),
  listPaymentMethods: vi.fn(async () => [{ id: 'pm_test' }]),
  createAndConfirmPaymentIntent: vi.fn(async () => 'pi_test'),
  capturePaymentIntentWithChargeId: vi.fn(async () => 'ch_test'),
}));

const mockNotificationsService = {
  notifyProfessionalOfInvite: vi.fn(async () => undefined),
  notifyBusinessOfAcceptance: vi.fn(async () => undefined),
  notifyBusinessOfApplication: vi.fn(async () => undefined),
  notifyProfessionalOfShiftChange: vi.fn(async () => undefined),
};
vi.mock('../../lib/notifications-service.js', () => mockNotificationsService);

describe('Shifts Routes - shop schedule tools', () => {
  let app: Express;

  beforeAll(async () => {
    const shiftsRouter = await import('../../routes/shifts.js');
    app = express();
    app.use(express.json());
    app.use('/api/shifts', shiftsRouter.default);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/shifts?employer_id=me&start&end uses employer range and returns array', async () => {
    mockShiftsRepo.getShiftsByEmployerInRange.mockResolvedValue([
      {
        id: 'shift-1',
        employerId: 'user-123',
        title: 'Open Shift',
        description: 'Desc',
        startTime: new Date('2025-12-01T09:00:00.000Z'),
        endTime: new Date('2025-12-01T17:00:00.000Z'),
        hourlyRate: '45',
        status: 'draft',
        location: 'Test',
        createdAt: new Date('2025-12-01T00:00:00.000Z'),
        updatedAt: new Date('2025-12-01T00:00:00.000Z'),
      },
    ]);

    const res = await supertest(app)
      .get('/api/shifts?employer_id=me&start=2025-12-01T00:00:00.000Z&end=2025-12-07T23:59:59.999Z')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(mockShiftsRepo.getShiftsByEmployerInRange).toHaveBeenCalledTimes(1);
    expect(res.body[0]).toMatchObject({
      id: 'shift-1',
      employerId: 'user-123',
      title: 'Open Shift',
      status: 'draft',
    });
    expect(typeof res.body[0].startTime).toBe('string');
  });

  it('POST /api/shifts/copy-previous-week copies last week shifts into this week as drafts', async () => {
    const baseStart = new Date('2025-12-08T00:00:00.000Z');
    const baseEnd = new Date('2025-12-14T23:59:59.999Z');
    const prevShiftStart = new Date('2025-12-02T09:00:00.000Z');
    const prevShiftEnd = new Date('2025-12-02T17:00:00.000Z');

    mockShiftsRepo.getShiftsByEmployerInRange.mockResolvedValue([
      {
        id: 'prev-1',
        employerId: 'user-123',
        title: 'Morning',
        description: 'Prev',
        startTime: prevShiftStart,
        endTime: prevShiftEnd,
        hourlyRate: '55',
        status: 'open',
        location: 'Test',
      },
    ]);

    mockShiftsRepo.createBatchShifts.mockResolvedValue([{ id: 'new-1' }]);

    const res = await supertest(app)
      .post('/api/shifts/copy-previous-week')
      .send({ start: baseStart.toISOString(), end: baseEnd.toISOString() })
      .expect(201);

    expect(res.body).toMatchObject({ success: true, count: 1 });
    expect(mockShiftsRepo.createBatchShifts).toHaveBeenCalledTimes(1);
    const [payload] = mockShiftsRepo.createBatchShifts.mock.calls[0];
    expect(payload[0]).toMatchObject({ employerId: 'user-123', title: 'Morning', status: 'draft' });
  });

  it('POST /api/shifts/publish-all publishes draft shifts in range', async () => {
    mockShiftsRepo.getShiftsByEmployerInRange.mockResolvedValue([
      { id: 'd1', status: 'draft' },
      { id: 'o1', status: 'open' },
      { id: 'd2', status: 'draft' },
    ]);
    mockShiftsRepo.updateShift.mockResolvedValue({ id: 'd1', status: 'open' });

    const res = await supertest(app)
      .post('/api/shifts/publish-all')
      .send({ start: '2025-12-01T00:00:00.000Z', end: '2025-12-07T23:59:59.999Z' })
      .expect(200);

    expect(res.body).toMatchObject({ success: true, count: 2 });
    expect(mockShiftsRepo.updateShift).toHaveBeenCalledTimes(2);
  });

  it('PUT /api/shifts/:id rejects confirmed shift time change without changeReason', async () => {
    const shiftId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    mockShiftsRepo.getShiftById.mockResolvedValue({
      id: shiftId,
      employerId: 'user-123',
      assigneeId: 'pro-1',
      status: 'confirmed',
      title: 'Confirmed',
      startTime: new Date('2025-12-10T09:00:00.000Z'),
      endTime: new Date('2025-12-10T17:00:00.000Z'),
    });

    const res = await supertest(app)
      .put(`/api/shifts/${shiftId}`)
      .send({ startTime: '2025-12-10T10:00:00.000Z', endTime: '2025-12-10T18:00:00.000Z' })
      .expect(400);

    expect(res.body?.message || '').toMatch(/changeReason/i);
    expect(mockNotificationsService.notifyProfessionalOfShiftChange).not.toHaveBeenCalled();
  });

  it('PUT /api/shifts/:id notifies professional when confirmed shift time changes with reason', async () => {
    const shiftId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    mockShiftsRepo.getShiftById.mockResolvedValue({
      id: shiftId,
      employerId: 'user-123',
      assigneeId: 'pro-1',
      status: 'confirmed',
      title: 'Confirmed',
      startTime: new Date('2025-12-10T09:00:00.000Z'),
      endTime: new Date('2025-12-10T17:00:00.000Z'),
    });
    mockShiftsRepo.updateShift.mockResolvedValue({
      id: shiftId,
      title: 'Confirmed',
      startTime: new Date('2025-12-10T10:00:00.000Z'),
      endTime: new Date('2025-12-10T18:00:00.000Z'),
    });

    await supertest(app)
      .put(`/api/shifts/${shiftId}`)
      .send({
        startTime: '2025-12-10T10:00:00.000Z',
        endTime: '2025-12-10T18:00:00.000Z',
        changeReason: 'Shop had an emergency closure.',
      })
      .expect(200);

    expect(mockNotificationsService.notifyProfessionalOfShiftChange).toHaveBeenCalledTimes(1);
  });
});

