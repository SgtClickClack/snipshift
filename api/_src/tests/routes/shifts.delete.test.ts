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

// 2) Mock dependent repos/services used by the shifts router (minimal but safe)
const mockShiftsRepo = {
  getShifts: vi.fn(),
  getShiftById: vi.fn(),
  updateShift: vi.fn(),
  getShiftsByEmployer: vi.fn(),
  getShiftsByEmployerInRange: vi.fn(),
  createBatchShifts: vi.fn(),
  createShift: vi.fn(),
  createRecurringShifts: vi.fn(),
  getShiftsByAssignee: vi.fn(),
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
  declineAllPendingOffersForShift: vi.fn(),
}));
vi.mock('../../repositories/shift-invitations.repository.js', () => ({
  createBulkInvitations: vi.fn(async () => []),
  getPendingInvitationsWithShiftDetails: vi.fn(async () => []),
  hasPendingInvitation: vi.fn(async () => true),
  expireAllPendingInvitationsForShift: vi.fn(async () => 0),
  declineInvitation: vi.fn(async () => undefined),
  getPendingInvitationsForShift: vi.fn(async () => []),
}));
vi.mock('../../repositories/jobs.repository.js', () => ({
  getJobs: vi.fn(async () => ({ data: [], total: 0, limit: 50, offset: 0 })),
  deleteAllJobsForBusiness: vi.fn(async () => 0),
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
vi.mock('../../lib/notifications-service.js', () => ({
  notifyProfessionalOfInvite: vi.fn(async () => undefined),
  notifyBusinessOfAcceptance: vi.fn(async () => undefined),
  notifyBusinessOfApplication: vi.fn(async () => undefined),
  notifyProfessionalOfShiftChange: vi.fn(async () => undefined),
}));

// 3) Mock DB (getDb) with controllable tx.execute behavior
type Tx = {
  execute: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const { mockTx, mockDb } = vi.hoisted(() => {
  const mockTx: Tx = {
    execute: vi.fn(),
    delete: vi.fn(() => ({
      where: vi.fn(async () => undefined),
    })),
  };

  const mockDb = {
    transaction: vi.fn(async (fn: (tx: Tx) => Promise<void>) => {
      await fn(mockTx);
    }),
  };

  return { mockTx, mockDb };
});

vi.mock('../../db/index.js', () => ({
  getDb: () => mockDb,
}));

describe('Shifts Routes - delete cascade', () => {
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

  it('DELETE /api/shifts/:id deletes dependencies then shift (when legacy columns exist)', async () => {
    const shiftId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    mockShiftsRepo.getShiftById.mockResolvedValue({
      id: shiftId,
      employerId: 'user-123',
      title: 'Test Shift',
    });

    // Call order inside transaction:
    // - to_regclass shift_invitations (exists)
    // - to_regclass shift_offers (exists)
    // - to_regclass applications (exists)
    // - information_schema applications.shift_id (exists)
    // - deletes...
    let call = 0;
    mockTx.execute.mockImplementation(async () => {
      call += 1;
      if (call === 1) return { rows: [{ exists: true }] };
      if (call === 2) return { rows: [{ exists: true }] };
      if (call === 3) return { rows: [{ exists: true }] };
      if (call === 4) return { rows: [{ exists: 1 }] };
      return { rows: [] };
    });

    const res = await supertest(app).delete(`/api/shifts/${shiftId}`);
    expect(res.status).toBe(200);
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.delete).toHaveBeenCalledTimes(1);
    expect(mockTx.execute).toHaveBeenCalled(); // existence checks + optional deletes
  });

  it('DELETE /api/shifts/:id does not fail if applications.shift_id column is missing', async () => {
    const shiftId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    mockShiftsRepo.getShiftById.mockResolvedValue({
      id: shiftId,
      employerId: 'user-123',
      title: 'Test Shift',
    });

    let call = 0;
    mockTx.execute.mockImplementation(async () => {
      call += 1;
      if (call === 1) return { rows: [{ exists: true }] }; // shift_invitations exists
      if (call === 2) return { rows: [{ exists: true }] }; // shift_offers exists
      if (call === 3) return { rows: [{ exists: true }] }; // applications exists
      if (call === 4) return { rows: [] }; // applications.shift_id missing => skip delete
      return { rows: [] };
    });

    const res = await supertest(app).delete(`/api/shifts/${shiftId}`);
    expect(res.status).toBe(200);
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.delete).toHaveBeenCalledTimes(1);
    expect(mockTx.execute).toHaveBeenCalled(); // existence checks + optional deletes
  });
});

