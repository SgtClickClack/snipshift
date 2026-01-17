import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';
import type { Express } from 'express';

// Auth: venue/business owner
vi.mock('../../middleware/auth.js', () => ({
  authenticateUser: vi.fn((req, _res, next) => {
    req.user = {
      id: 'venue-1',
      email: 'venue@example.com',
      name: 'Venue Owner',
      role: 'business',
      uid: 'firebase-uid-venue-1',
    };
    next();
  }),
  AuthenticatedRequest: {},
}));

// Minimal shift repo mocks
const mockShiftsRepo = {
  getShiftById: vi.fn(),
};
vi.mock('../../repositories/shifts.repository.js', () => mockShiftsRepo);

// Stripe capture mock
vi.mock('../../services/stripe-connect.service.js', () => ({
  capturePaymentIntentWithChargeId: vi.fn(async () => 'ch_test'),
}));

// Notifications mock (non-blocking)
vi.mock('../../lib/notifications-service.js', () => ({
  notifyShiftCompleted: vi.fn(async () => undefined),
}));

// Payouts repo mocks (dynamic import in route)
const mockPayoutsRepo = {
  getPayoutByShiftId: vi.fn(),
  createPayout: vi.fn(),
  updatePayoutStatus: vi.fn(),
};
vi.mock('../../repositories/payouts.repository.js', () => mockPayoutsRepo);

const mockLedgerRepo = {
  createLedgerEntry: vi.fn(async () => ({ id: 'ledger-1' })),
};
vi.mock('../../repositories/financial-ledger.repository.js', () => mockLedgerRepo);

// DB transaction mock (drizzle-like chaining)
const { mockDb } = vi.hoisted(() => {
  const tx = {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => [{ id: 'shift-1' }]),
        })),
      })),
    })),
  };

  const mockDb = {
    transaction: vi.fn(async (fn: (txArg: any) => Promise<void>) => {
      await fn(tx);
    }),
  };

  return { mockDb };
});

vi.mock('../../db/index.js', () => ({
  getDb: () => mockDb,
}));

describe('Shifts complete -> payout flow (idempotent + status reconciliation)', () => {
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

  it('creates payout as processing then marks completed after capture', async () => {
    const now = Date.now();
    const shiftPending = {
      id: 'shift-1',
      employerId: 'venue-1',
      assigneeId: 'worker-1',
      status: 'pending_completion',
      proofImageUrl: 'https://example.com/proof.jpg',
      startTime: new Date(now - 3 * 60 * 60 * 1000),
      endTime: new Date(now - 60 * 60 * 1000),
      hourlyRate: '50.00',
      paymentIntentId: 'pi_test',
      paymentStatus: 'AUTHORIZED',
      stripeChargeId: null,
      title: 'Test Shift',
    } as any;

    const shiftCompleted = {
      id: 'shift-1',
      status: 'completed',
      paymentStatus: 'PAID',
      stripeChargeId: 'ch_test',
      startTime: new Date(now - 3 * 60 * 60 * 1000),
      endTime: new Date(now - 60 * 60 * 1000),
      hourlyRate: '50.00',
      title: 'Test Shift',
    } as any;

    vi.mocked(mockShiftsRepo.getShiftById)
      .mockResolvedValueOnce(shiftPending)
      .mockResolvedValueOnce(shiftCompleted);

    vi.mocked(mockPayoutsRepo.getPayoutByShiftId)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'payout-1',
        amountCents: 100,
        hourlyRate: '50.00',
        hoursWorked: '2.00',
        status: 'completed',
        stripeChargeId: 'ch_test',
      } as any);

    vi.mocked(mockPayoutsRepo.createPayout).mockResolvedValueOnce({
      id: 'payout-1',
      shiftId: 'shift-1',
      workerId: 'worker-1',
      venueId: 'venue-1',
      amountCents: 100,
      hourlyRate: '50.00',
      hoursWorked: '2.00',
      status: 'processing',
      stripeChargeId: null,
      stripeTransferId: null,
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await supertest(app).patch('/api/shifts/shift-1/complete').expect(200);

    expect(vi.mocked(mockPayoutsRepo.createPayout)).toHaveBeenCalled();
    expect(vi.mocked(mockPayoutsRepo.updatePayoutStatus)).toHaveBeenCalledWith(
      'payout-1',
      'completed',
      { stripeChargeId: 'ch_test' },
      expect.anything()
    );
    expect(vi.mocked(mockLedgerRepo.createLedgerEntry)).toHaveBeenCalled();
    expect(res.body.payout.status).toBe('completed');
  });
});

