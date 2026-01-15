/**
 * Pusher Authentication Route
 * 
 * Handles authentication for Pusher private channels
 */

import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getPusher } from '../services/pusher.service.js';

const router = Router();

/**
 * Authenticate Pusher private channel subscription
 * POST /api/pusher/auth
 */
router.post('/auth', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const socketId = req.body.socket_id;
  const channelName = req.body.channel_name;

  if (!socketId || !channelName) {
    res.status(400).json({ message: 'socket_id and channel_name are required' });
    return;
  }

  // Validate channel name format
  // Allow: private-user-{userId} or private-conversation-{conversationId}
  const userChannelPattern = /^private-user-([a-f0-9-]+)$/;
  const conversationChannelPattern = /^private-conversation-([a-f0-9-]+)$/;

  let authorized = false;

  if (userChannelPattern.test(channelName)) {
    // User channel: verify the userId matches
    const match = channelName.match(userChannelPattern);
    if (match && match[1] === userId) {
      authorized = true;
    }
  } else if (conversationChannelPattern.test(channelName)) {
    // Conversation channel: verify user has access to this conversation
    const match = channelName.match(conversationChannelPattern);
    if (match) {
      const conversationId = match[1];
      // Import here to avoid circular dependency
      const conversationsRepo = await import('../repositories/conversations.repository.js');
      const conversation = await conversationsRepo.getConversationById(conversationId, userId);
      if (conversation) {
        authorized = true;
      }
    }
  }

  if (!authorized) {
    res.status(403).json({ message: 'Forbidden: Invalid channel access' });
    return;
  }

  const pusher = getPusher();
  if (!pusher) {
    res.status(500).json({ message: 'Pusher service not initialized' });
    return;
  }

  try {
    const auth = pusher.authorizeChannel(socketId, channelName);
    res.status(200).json(auth);
  } catch (error: any) {
    console.error('[PUSHER AUTH] Error:', error);
    res.status(500).json({ message: 'Failed to authenticate channel' });
  }
}));

export default router;
