/**
 * Investor API Routes
 * 
 * Handles investor portal interactions including:
 * - AI-powered query assistant (Foundry Agent)
 * - RSVP submissions
 * - Query analytics logging
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { rateLimitPublic } from '../middleware/auth.js';
import { InvestorQuerySchema } from '../validation/schemas.js';
import { 
  queryInvestorAssistant, 
  classifyQuestion,
  isAIInvestorServiceAvailable,
  type QuestionType 
} from '../services/ai-investor.service.js';

const router = Router();

/**
 * Log investor query for analytics (non-blocking)
 * Captures question type for Rick's lead analytics dashboard
 */
async function logInvestorQuery(
  questionType: QuestionType,
  queryLength: number,
  responseTime: number,
  success: boolean,
  sessionId?: string
): Promise<void> {
  try {
    // Log to console for now - can be extended to database storage
    console.log('[INVESTOR-ANALYTICS]', {
      type: 'query',
      questionType,
      queryLength,
      responseTime,
      success,
      sessionId: sessionId || 'anonymous',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[INVESTOR-ANALYTICS] Failed to log query:', error);
    // Non-blocking - don't throw
  }
}

/**
 * POST /api/investors/query
 * 
 * Query the AI investor assistant (Foundry Agent)
 * Public endpoint - no authentication required
 */
router.post('/query', rateLimitPublic, asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  // Validate request body
  const validationResult = InvestorQuerySchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({
      error: 'Validation error',
      details: validationResult.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }
  
  const { query, sessionId } = validationResult.data;
  
  // Log incoming request
  console.log('[INVESTOR-QUERY] Incoming query:', {
    length: query.length,
    sessionId: sessionId || 'anonymous',
    ip: req.ip,
    userAgent: req.get('user-agent')?.substring(0, 50),
  });
  
  try {
    // Query the AI assistant
    const result = await queryInvestorAssistant(query);
    const responseTime = Date.now() - startTime;
    
    // Log analytics (non-blocking)
    logInvestorQuery(
      result.questionType,
      query.length,
      responseTime,
      result.success,
      sessionId
    );
    
    // Return successful response
    res.status(200).json({
      success: true,
      answer: result.answer,
      questionType: result.questionType,
      responseTime,
      aiAvailable: isAIInvestorServiceAvailable(),
    });
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    console.error('[INVESTOR-QUERY] Error processing query:', error);
    
    // Log failed query
    logInvestorQuery(
      classifyQuestion(query),
      query.length,
      responseTime,
      false,
      sessionId
    );
    
    res.status(500).json({
      success: false,
      error: 'Failed to process your inquiry. Please try again.',
      questionType: classifyQuestion(query),
    });
  }
}));

/**
 * GET /api/investors/status
 * 
 * Check AI service availability
 * Useful for frontend to show appropriate UI state
 */
router.get('/status', asyncHandler(async (req, res) => {
  res.status(200).json({
    aiAvailable: isAIInvestorServiceAvailable(),
    service: 'Foundry Executive Agent',
    model: 'gemini-2.5-flash-preview-05-20',
    grounded: true,
  });
}));

/**
 * POST /api/investors/rsvp
 * 
 * Submit an RSVP for the investor briefing
 * Public endpoint - no authentication required
 */
router.post('/rsvp', rateLimitPublic, asyncHandler(async (req, res) => {
  const { email, name, timestamp } = req.body;
  
  // Log the RSVP
  console.log('[INVESTOR RSVP]', {
    email: email || 'anonymous',
    name: name || 'Anonymous Investor',
    timestamp: timestamp || new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  // Return success response
  res.status(200).json({
    success: true,
    message: 'RSVP confirmed',
    eventDetails: {
      date: 'February 28, 2026',
      time: '6:00 PM AEST',
      location: 'Brisbane CBD',
    },
  });
}));

export default router;
