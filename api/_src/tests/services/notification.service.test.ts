import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as notificationService from '../../services/notification.service.js';

// Mock DB
const mockDb = {
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

vi.mock('../../db/index.js', () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.mock('../../db/schema.js', () => ({
  notifications: 'notifications_table',
}));

describe('Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should insert notification into DB', async () => {
      const mockNotification = { id: 'notif_1', title: 'Test' };
      mockDb.returning.mockResolvedValue([mockNotification]);

      const result = await notificationService.createNotification({
        userId: 'user_1',
        type: 'job_posted',
        title: 'New Job',
        message: 'A new job is available',
      });

      expect(result).toEqual(mockNotification);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user_1',
        type: 'job_posted',
        title: 'New Job',
      }));
    });

    it('should handle DB errors gracefully', async () => {
      mockDb.returning.mockRejectedValue(new Error('DB Error'));

      const result = await notificationService.createNotification({
        userId: 'user_1',
        type: 'job_posted',
        title: 'New Job',
        message: 'A new job is available',
      });

      expect(result).toBeNull();
    });
  });

  describe('notifyApplicationReceived', () => {
    it('should create notification for job owner', async () => {
      // Mocking createNotification using vitest's mock of the module, since it's an exported function in the same module
      // NOTE: In ESM, spying on same-module exports often fails if they call each other directly.
      // A better approach is to mock the db call itself, which we already do, and verify that was called.
      // OR, we rely on the fact that `notifyApplicationReceived` CALLS `createNotification`.
      // Let's check if `mockDb.insert` is called with correct params.
      
      mockDb.returning.mockResolvedValue([{}]);

      await notificationService.notifyApplicationReceived('owner_1', 'Applicant', 'Job A', 'job_1');

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'owner_1',
        type: 'application_received',
        message: expect.stringContaining('Applicant'),
      }));
    });
  });

  describe('notifyJobCompleted', () => {
      it('should notify both parties', async () => {
        mockDb.returning.mockResolvedValue([{}]);

        await notificationService.notifyJobCompleted('job_1', 'emp_1', 'pro_1', 'Job A');

        expect(mockDb.insert).toHaveBeenCalledTimes(2);
        // First call for employer
        expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({ userId: 'emp_1' }));
        // Second call for professional
        expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({ userId: 'pro_1' }));
      });

      it('should skip professional notification if null', async () => {
        mockDb.returning.mockResolvedValue([{}]);
        mockDb.insert.mockClear();
        mockDb.values.mockClear();

        await notificationService.notifyJobCompleted('job_1', 'emp_1', null, 'Job A');

        expect(mockDb.insert).toHaveBeenCalledTimes(1);
        expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({ userId: 'emp_1' }));
      });
  });
});

