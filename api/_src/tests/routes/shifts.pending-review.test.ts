import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import supertest from 'supertest';
import express from 'express';

// 1) Mock Auth Middleware
const mockAuthUser = vi.fn((req, _res, next) => {
  req.user = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'professional',
    uid: 'firebase-uid-123',
  };
  next();
});

vi.mock('../../middleware/auth.js', () => ({
  authenticateUser: mockAuthUser,
  AuthenticatedRequest: {},
}));

// 2) Mock dependent repos/services used by the shifts router
const mockUsersRepo = {
  getUserById: vi.fn(),
  updateUser: vi.fn(),
};
vi.mock('../../repositories/users.repository.js', () => mockUsersRepo);

const mockShiftsRepo = {
  getShifts: vi.fn(),
  getShiftById: vi.fn(),
  updateShift: vi.fn(),
  getShiftsByAssignee: vi.fn(),
};
vi.mock('../../repositories/shifts.repository.js', () => mockShiftsRepo);

const mockShiftReviewsRepo = {
  hasUserReviewedShift: vi.fn(),
};
vi.mock('../../repositories/shift-reviews.repository.js', () => mockShiftReviewsRepo);

// Not used in these tests, but imported by the router module; mock to avoid side effects.
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
}));
vi.mock('../../repositories/shift-offers.repository.js', () => ({
  createShiftOffer: vi.fn(),
  getShiftOfferById: vi.fn(),
  isOfferValid: vi.fn(),
}));

describe('Shifts Routes - pending review', () => {
  let app: any;

  beforeAll(async () => {
    const shiftsRouter = await import('../../routes/shifts.js');
    app = express();
    app.use(express.json());
    app.use('/api/shifts', shiftsRouter.default);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/shifts/pending-review (professional) only queries assignee shifts', async () => {
    mockUsersRepo.getUserById.mockResolvedValue({
      id: 'user-123',
      role: 'professional',
      roles: ['professional'],
      name: 'Test User',
    });
    mockShiftsRepo.getShifts.mockResolvedValue({ data: [], total: 0, limit: 100, offset: 0 });
    mockShiftReviewsRepo.hasUserReviewedShift.mockResolvedValue(true);

    const res = await supertest(app)
      .get('/api/shifts/pending-review')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);

    expect(mockShiftsRepo.getShifts).toHaveBeenCalledTimes(1);
    expect(mockShiftsRepo.getShifts).toHaveBeenCalledWith({
      assigneeId: 'user-123',
      status: 'pending_completion',
      limit: 100,
    });
  });

  it('GET /api/shifts/pending-review (business) only queries employer shifts', async () => {
    mockUsersRepo.getUserById.mockResolvedValue({
      id: 'user-123',
      role: 'business',
      roles: ['business'],
      name: 'Test User',
    });
    mockShiftsRepo.getShifts.mockResolvedValue({ data: [], total: 0, limit: 100, offset: 0 });
    mockShiftReviewsRepo.hasUserReviewedShift.mockResolvedValue(true);

    const res = await supertest(app)
      .get('/api/shifts/pending-review')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);

    expect(mockShiftsRepo.getShifts).toHaveBeenCalledTimes(1);
    expect(mockShiftsRepo.getShifts).toHaveBeenCalledWith({
      employerId: 'user-123',
      status: 'pending_completion',
      limit: 100,
    });
  });
});


