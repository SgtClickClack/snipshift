/**
 * Support Routes - AI Support Concierge API
 * 
 * Provides endpoints for the AI-powered support chat widget
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { processQuery, clearSession, getActiveSessionCount, SupportQueryRequest } from '../services/ai-support.service.js';

const router = Router();

/**
 * POST /api/support/query
 * Process a support query and return AI-generated response
 * 
 * Body:
 * - query: string (required) - The user's question
 * - sessionId: string (optional) - Session ID for conversation continuity
 * - context: object (optional) - Additional context about user's current state
 */
router.post('/query', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { query, sessionId, context } = req.body;
  
  // Validate query
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    res.status(400).json({ 
      error: 'Query is required and must be a non-empty string',
      success: false,
    });
    return;
  }
  
  // Rate limit check (basic - could be enhanced with Redis)
  const queryLength = query.trim().length;
  if (queryLength > 2000) {
    res.status(400).json({ 
      error: 'Query is too long. Please keep it under 2000 characters.',
      success: false,
    });
    return;
  }
  
  // Determine user role from auth context
  const userRole = req.user?.roles?.includes('business') || req.user?.roles?.includes('hub') || req.user?.roles?.includes('venue')
    ? 'venue' as const
    : req.user?.roles?.includes('professional')
    ? 'professional' as const
    : 'unknown' as const;
  
  const requestPayload: SupportQueryRequest = {
    query: query.trim(),
    sessionId,
    userRole,
    context: context || undefined,
  };
  
  try {
    const result = await processQuery(requestPayload);
    
    res.status(200).json({
      answer: result.answer,
      questionType: result.questionType,
      sessionId: result.sessionId,
      success: result.success,
    });
  } catch (error: any) {
    console.error('[Support API] Error processing query:', error);
    
    res.status(500).json({
      error: 'Failed to process your question. Please try again.',
      success: false,
    });
  }
}));

/**
 * POST /api/support/clear-session
 * Clear a chat session (start over)
 */
router.post('/clear-session', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { sessionId } = req.body;
  
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }
  
  clearSession(sessionId);
  
  res.status(200).json({ 
    success: true,
    message: 'Session cleared. Start a new conversation!',
  });
}));

/**
 * GET /api/support/health
 * Health check for the support service
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const activeSessions = getActiveSessionCount();
  const hasApiKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);
  
  res.status(200).json({
    status: hasApiKey ? 'healthy' : 'degraded',
    activeSessions,
    aiConfigured: hasApiKey,
    message: hasApiKey 
      ? 'Support service is operational' 
      : 'AI support degraded - API key not configured',
  });
}));

/**
 * GET /api/support/quick-answers
 * Get pre-defined quick answers for common questions (no AI needed)
 */
router.get('/quick-answers', asyncHandler(async (req: Request, res: Response) => {
  const quickAnswers = [
    {
      id: 'xero-connect',
      question: 'How do I connect Xero?',
      answer: 'Navigate to Settings → Integrations, then click "Connect to Xero" and follow the authorization flow.',
      category: 'xero_integration',
    },
    {
      id: 'create-template',
      question: 'How do I create a Capacity Template?',
      answer: 'Go to Settings → Business Settings → Capacity Planner, then click "Create New Template".',
      category: 'capacity_templates',
    },
    {
      id: 'invite-ateam',
      question: 'How do I use Invite A-Team?',
      answer: 'First mark staff as favorites in Venue → Staff (click the star icon), then use Roster Tools → Invite A-Team.',
      category: 'smart_fill',
    },
    {
      id: 'accept-all',
      question: 'How does Accept All work?',
      answer: 'Enable it in Settings → Professional Settings → Auto-Accept Invitations. Configure trusted venues and minimum rates.',
      category: 'accept_all',
    },
    {
      id: 'vault-docs',
      question: 'Where do I upload compliance documents?',
      answer: 'Go to your Profile → Certifications, or venue managers can view staff docs in Venue → Staff → [Staff Name].',
      category: 'compliance',
    },
    {
      id: 'sync-issue',
      question: 'Why is my Xero sync failing?',
      answer: 'Common causes: 1) Pay period is locked in Xero, 2) Missing employee mappings, 3) Expired Xero connection. Check Settings → Integrations.',
      category: 'xero_integration',
    },
  ];
  
  res.status(200).json({ quickAnswers });
}));

export default router;
