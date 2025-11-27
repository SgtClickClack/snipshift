import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import path from 'path';

// Define mocks outside
const mockCreate = vi.fn();
const mockRepo = {
  create: mockCreate,
};

// Mock the absolute path to ensure it hits
const repoPath = path.resolve(__dirname, '../../repositories/notifications.repository.js');
vi.mock(repoPath, () => mockRepo);

// Also mock the relative path as seen from the service file if possible, 
// but vitest mocks by module ID.
// We will also mock the likely relative paths just in case.
vi.mock('../../repositories/notifications.repository.js', () => mockRepo);

describe('Notification Service', () => {
  let notificationService: any;

  beforeAll(async () => {
    vi.resetModules();
    // Import service AFTER mocks
    notificationService = await import('../../services/notification.service.js');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });
// ... (rest is same)


  describe('createNotification', () => {
    it('should insert notification into DB via repo', async () => {
      const mockNotification = { id: '00000000-0000-0000-0000-000000000001', title: 'Test', data: {} };
      mockCreate.mockResolvedValue(mockNotification as any);

      const result = await notificationService.createNotification({
        userId: '00000000-0000-0000-0000-000000000002',
        type: 'job_posted',
        title: 'New Job',
        message: 'A new job is available',
      });

      expect(result).toEqual(mockNotification);
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        userId: '00000000-0000-0000-0000-000000000002',
        type: 'job_alert',
        title: 'New Job',
      }));
    });

    it('should handle DB errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('DB Error'));
      
      // Since the service doesn't catch errors, we expect it to reject
      await expect(notificationService.createNotification({
         userId: 'u1', type: 'job_posted', title: 'T', message: 'm' 
      })).rejects.toThrow('DB Error');
    });
  });

  describe('notifyApplicationReceived', () => {
    it('should create notification for job owner', async () => {
      mockCreate.mockResolvedValue({} as any);

      await notificationService.notifyApplicationReceived('00000000-0000-0000-0000-000000000003', 'Applicant', 'Job A', '00000000-0000-0000-0000-000000000004');

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        userId: '00000000-0000-0000-0000-000000000003',
        type: 'application_update', // Mapped from 'application_received'
        message: expect.stringContaining('Applicant'),
      }));
    });
  });

  describe('notifyJobCompleted', () => {
      it('should notify both parties', async () => {
        mockCreate.mockResolvedValue({} as any);

        await notificationService.notifyJobCompleted('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000006', 'Job A');

        expect(mockCreate).toHaveBeenCalledTimes(2);
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ userId: '00000000-0000-0000-0000-000000000005' }));
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ userId: '00000000-0000-0000-0000-000000000006' }));
      });

      it('should skip professional notification if null', async () => {
        mockCreate.mockResolvedValue({} as any);
        mockCreate.mockClear();

        await notificationService.notifyJobCompleted('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', null, 'Job A');

        expect(mockCreate).toHaveBeenCalledTimes(1);
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ userId: '00000000-0000-0000-0000-000000000005' }));
      });
  });
});

