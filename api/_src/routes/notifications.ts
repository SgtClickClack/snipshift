import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as notificationsRepo from '../repositories/notifications.repository.js';
import { notificationBus } from '../services/notification.service.js';
import { normalizeParam } from '../utils/request-params.js';

const router = Router();

// Apply authentication to all notification routes
router.use(authenticateUser);

/**
 * GET /api/notifications/stream
 * Server-Sent Events (SSE) endpoint for real-time notifications
 * 
 * VERCEL NOTE: Serverless functions have execution timeouts (10s-60s).
 * The client must implement auto-reconnect logic when the stream closes.
 */
router.get('/stream', (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Event listener for new notifications
  const onNotification = (data: { userId: string; notification: any }) => {
    if (data.userId === userId) {
      res.write(`data: ${JSON.stringify(data.notification)}\n\n`);
    }
  };

  // Subscribe to event bus
  notificationBus.on('new_notification', onNotification);

  // Clean up on connection close
  req.on('close', () => {
    notificationBus.off('new_notification', onNotification);
  });
});

/**
 * GET /api/notifications
 * Fetch notifications for the current user
 */
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const notifications = await notificationsRepo.findByUserId(userId, limit);

  // Transform to match frontend expectations
  const transformed = notifications.map((notif) => ({
    id: notif.id,
    type: notif.type,
    title: notif.title,
    message: notif.message,
    // Map data.link back to top-level link for frontend compatibility
    link: (notif.data as any)?.link || null,
    data: notif.data,
    isRead: !!notif.isRead,
    createdAt: notif.createdAt ? notif.createdAt.toISOString() : new Date().toISOString(),
  }));

  res.status(200).json(transformed);
}));

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const count = await notificationsRepo.getUnreadCount(userId);
  res.status(200).json({ count });
}));

/**
 * PATCH /api/notifications/:id/read
 * Mark a specific notification as read
 */
router.patch('/:id/read', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = normalizeParam(req.params.id);
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const updated = await notificationsRepo.markAsRead(id, userId);

  if (updated) {
    res.status(200).json({
      id: updated.id,
      isRead: true,
    });
    return;
  }

  res.status(404).json({ message: 'Notification not found' });
}));

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
router.patch('/read-all', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const count = await notificationsRepo.markAllAsRead(userId);
  res.status(200).json({ count });
}));

export default router;
