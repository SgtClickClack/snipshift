import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { requireSelfParam } from '../middleware/authorization.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as conversationsRepo from '../repositories/conversations.repository.js';
import { normalizeParam } from '../utils/request-params.js';

const router = Router();

// Get chats for a specific user
router.get('/user/:userId', authenticateUser, requireSelfParam('userId'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = normalizeParam(req.params.userId);

  const currentUser = req.user;
  
  const conversations = await conversationsRepo.getConversationsForUser(userId);

  if (!conversations) {
    res.status(200).json([]);
    return;
  }

  // Transform to match frontend Chat interface
  const chats = conversations.map(conv => {
    const otherParticipant = conv.otherParticipant as any; // Cast to access role
    
    // Construct participant names and roles map
    const participantNames: Record<string, string> = {};
    const participantRoles: Record<string, string> = {};

    // Add current user
    if (currentUser) {
      participantNames[currentUser.id] = currentUser.name;
      participantRoles[currentUser.id] = currentUser.role;
    }

    // Add other participant
    if (otherParticipant) {
      participantNames[otherParticipant.id] = otherParticipant.name;
      participantRoles[otherParticipant.id] = otherParticipant.role || 'user'; 
    }

    const latestMsg = conv.latestMessage as any; // Cast to access isRead

    return {
      id: conv.id,
      participants: [conv.participant1Id, conv.participant2Id],
      participantNames,
      participantRoles,
      lastMessage: latestMsg ? {
        id: latestMsg.id,
        content: latestMsg.content,
        senderId: latestMsg.senderId,
        timestamp: latestMsg.createdAt.toISOString(),
        read: latestMsg.isRead !== null
      } : undefined,
      lastMessageAt: conv.lastMessageAt?.toISOString(),
      createdAt: conv.createdAt.toISOString()
    };
  });

  res.status(200).json(chats);
}));

export default router;
