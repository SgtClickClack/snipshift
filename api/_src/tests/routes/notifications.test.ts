import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import supertest from 'supertest';
import express from 'express';
// We need to mock everything BEFORE importing the app or router

// 1. Mock Auth Middleware
const mockAuthUser = vi.fn((req, res, next) => {
  req.user = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'professional',
    uid: 'firebase-uid-123',
  };
  next();
});

const mockAuthMiddleware = {
  authenticateUser: mockAuthUser,
  AuthenticatedRequest: {},
};

vi.mock('../../middleware/auth.js', () => mockAuthMiddleware);

// 2. Mock Repo
const mockRepo = {
  findByUserId: vi.fn(),
  getUnreadCount: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
};

vi.mock('../../repositories/notifications.repository.js', () => mockRepo);

// 3. Mock Service (Event Bus)
const mockBus = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
};

vi.mock('../../services/notification.service.js', () => ({
  notificationBus: mockBus,
}));

// 4. Mock DB connection (used by index.ts if it imports it)
vi.mock('../../db/connection.js', () => ({
  getDatabase: vi.fn(() => ({})),
}));

describe('Notifications Routes', () => {
  let app: any;

  beforeAll(async () => {
    // Setup a simple express app with the router
    // We don't need the full app from index.ts which has complex setup
    const notificationsRouter = await import('../../routes/notifications.js');
    app = express();
    app.use(express.json());
    app.use('/api/notifications', notificationsRouter.default);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/notifications/stream', () => {
    it('should establish SSE connection', async () => {
      const response = await supertest(app)
        .get('/api/notifications/stream')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/event-stream/);
      expect(mockBus.on).toHaveBeenCalledWith('new_notification', expect.any(Function));
    });
  });

  describe('GET /api/notifications', () => {
    it('should list notifications', async () => {
      const mockNotifs = [
        {
          id: 'n1',
          type: 'job_alert',
          title: 'Test',
          message: 'Msg',
          data: { link: '/test' },
          isRead: false,
          createdAt: new Date(),
        }
      ];
      mockRepo.findByUserId.mockResolvedValue(mockNotifs);

      const response = await supertest(app)
        .get('/api/notifications')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe('n1');
      expect(mockRepo.findByUserId).toHaveBeenCalledWith('user-123', 50);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should return unread count', async () => {
      mockRepo.getUnreadCount.mockResolvedValue(5);

      const response = await supertest(app)
        .get('/api/notifications/unread-count')
        .expect(200);

      expect(response.body.count).toBe(5);
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      mockRepo.markAsRead.mockResolvedValue({ id: 'n1', isRead: true });

      const response = await supertest(app)
        .patch('/api/notifications/n1/read')
        .expect(200);

      expect(response.body.isRead).toBe(true);
      expect(mockRepo.markAsRead).toHaveBeenCalledWith('n1', 'user-123');
    });

    it('should return 404 if not found', async () => {
      mockRepo.markAsRead.mockResolvedValue(null);

      await supertest(app)
        .patch('/api/notifications/n1/read')
        .expect(404);
    });
  });

  describe('PATCH /api/notifications/read-all', () => {
    it('should mark all as read', async () => {
      mockRepo.markAllAsRead.mockResolvedValue(10);

      const response = await supertest(app)
        .patch('/api/notifications/read-all')
        .expect(200);

      expect(response.body.count).toBe(10);
      expect(mockRepo.markAllAsRead).toHaveBeenCalledWith('user-123');
    });
  });
});

