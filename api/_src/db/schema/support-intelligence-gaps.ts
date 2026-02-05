/**
 * Support Intelligence Gaps Schema
 * 
 * Tracks queries where the AI Support Bot couldn't provide a confident answer.
 * This enables the CTO to identify knowledge gaps in the user manual and
 * prioritize documentation improvements.
 */

import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * Support Intelligence Gaps table
 * 
 * Logs queries that triggered low-confidence responses or "Foundry R&D phase" fallbacks.
 * Used for continuous improvement of the Support Bot knowledge base.
 */
export const supportIntelligenceGaps = pgTable('support_intelligence_gaps', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // The exact query the user asked
  query: text('query').notNull(),
  
  // When this query was logged
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  
  // Whether the AI was able to provide a meaningful answer
  // false = triggered "Foundry R&D phase" fallback or low confidence
  // true = answered but with uncertainty (for confidence tracking)
  wasAnswered: timestamp('was_answered'), // NULL = not answered, timestamp = answered with low confidence
  
  // The question category detected (for trend analysis)
  questionType: text('question_type'),
  
  // Session ID for correlation (optional)
  sessionId: text('session_id'),
  
  // User role context (venue/professional/unknown)
  userRole: text('user_role'),
  
  // The page the user was on when they asked (for context)
  currentPage: text('current_page'),
  
  // The AI's response (for review)
  aiResponse: text('ai_response'),
  
  // Confidence indicator: 'low' | 'fallback' | 'unknown_feature'
  gapType: text('gap_type').notNull(),
  
  // Soft delete for reviewed/resolved gaps
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: uuid('reviewed_by'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  // Index for fetching unreviewed gaps
  unreviewedIdx: index('support_intelligence_gaps_unreviewed_idx').on(table.reviewedAt),
  // Index for time-based queries (CTO dashboard)
  timestampIdx: index('support_intelligence_gaps_timestamp_idx').on(table.timestamp),
  // Index for gap type analysis
  gapTypeIdx: index('support_intelligence_gaps_gap_type_idx').on(table.gapType),
  // Index for question type trends
  questionTypeIdx: index('support_intelligence_gaps_question_type_idx').on(table.questionType),
}));
