import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

const mockGetShiftById = vi.fn();
const mockUpdateShift = vi.fn();
vi.mock('../../repositories/shifts.repository.js', () => ({
  getShiftById: mockGetShiftById,
  updateShift: mockUpdateShift,
}));

const mockIncrementReliabilityStrikes = vi.fn();
vi.mock('../../repositories/profiles.repository.js', () => ({
  incrementReliabilityStrikes: mockIncrementReliabilityStrikes,
}));

const mockBanUser = vi.fn();
vi.mock('../../repositories/users.repository.js', () => ({
  banUser: mockBanUser,
}));

const mockCreateInAppNotification = vi.fn();
vi.mock('../../lib/notifications-service.js', () => ({
  createInAppNotification: mockCreateInAppNotification,
}));

describe('cancellationService.handleStaffCancellation', () => {
  let service: typeof import('../../services/cancellationService.js');

  beforeAll(async () => {
    vi.resetModules();
    service = await import('../../services/cancellationService.js');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('late cancellation: triggers penalty + notifies venue + republishes as emergency fill', async () => {
    mockGetShiftById.mockResolvedValue({
      id: 'shift-1',
      employerId: 'venue-1',
      startTime: '2026-01-10T12:00:00.000Z',
      cancellationWindowHours: 24,
    });
    mockUpdateShift.mockResolvedValue({ id: 'shift-1' });
    mockIncrementReliabilityStrikes.mockResolvedValue(1);

    const result = await service.handleStaffCancellation(
      { shiftId: 'shift-1', staffId: 'staff-1', reason: 'Sick', now: new Date('2026-01-10T10:00:00.000Z') }
    );

    expect(result).toEqual({ ok: true, branch: 'late', updatedShiftId: 'shift-1' });
    expect(mockIncrementReliabilityStrikes).toHaveBeenCalledWith('staff-1');
    expect(mockBanUser).not.toHaveBeenCalled();
    expect(mockCreateInAppNotification).toHaveBeenCalledWith(
      'venue-1',
      'SYSTEM',
      'CRITICAL: Staff cancelled late.',
      expect.any(String),
      expect.objectContaining({ shiftId: 'shift-1', staffId: 'staff-1' })
    );
    expect(mockCreateInAppNotification).toHaveBeenCalledWith(
      'staff-1',
      'SYSTEM',
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ type: 'reliability_strike', strikes: 1 })
    );
    expect(mockUpdateShift).toHaveBeenCalledWith(
      'shift-1',
      expect.objectContaining({
        status: 'open',
        assigneeId: null,
        isEmergencyFill: true,
        staffCancellationReason: 'Sick',
      })
    );
  });

  it('early cancellation: republishes normally (not emergency fill)', async () => {
    mockGetShiftById.mockResolvedValue({
      id: 'shift-2',
      employerId: 'venue-2',
      startTime: '2026-01-12T12:00:00.000Z',
      cancellationWindowHours: 24,
    });
    mockUpdateShift.mockResolvedValue({ id: 'shift-2' });

    const result = await service.handleStaffCancellation({
      shiftId: 'shift-2',
      staffId: 'staff-2',
      reason: 'Schedule conflict',
      now: new Date('2026-01-10T10:00:00.000Z'),
    });

    expect(result).toEqual({ ok: true, branch: 'early', updatedShiftId: 'shift-2' });
    expect(mockCreateInAppNotification).not.toHaveBeenCalled();
    expect(mockUpdateShift).toHaveBeenCalledWith(
      'shift-2',
      expect.objectContaining({
        status: 'open',
        assigneeId: null,
        isEmergencyFill: false,
        staffCancellationReason: 'Schedule conflict',
      })
    );
  });

  it('triggerPenalty suspends staff when strikes reach 3', async () => {
    mockIncrementReliabilityStrikes.mockResolvedValue(3);

    const result = await service.triggerPenalty('staff-3', {
      shiftId: 'shift-3',
      timeUntilShiftHours: 1,
    });

    expect(result).toEqual({ strikes: 3, suspended: true });
    expect(mockBanUser).toHaveBeenCalledWith('staff-3');
    expect(mockCreateInAppNotification).toHaveBeenCalledWith(
      'staff-3',
      'SYSTEM',
      'Account Suspended',
      expect.any(String),
      expect.objectContaining({ suspended: true, strikes: 3 })
    );
  });
});

