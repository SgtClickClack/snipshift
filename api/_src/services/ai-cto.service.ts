/**
 * AI CTO Service - HospoGo Architect (God-Mode)
 * 
 * Provides AI-powered CTO assistance using Gemini 2.5 Flash
 * with full access to HospoGo's technical and business DNA.
 * 
 * Features:
 * - Full codebase knowledge via CTO Knowledge Bridge
 * - Introspective Analysis capability (explains unfamiliar code)
 * - Business logic documentation (A-Team, Reliability Crown, Suburban Loyalty)
 * - Data schema relationships
 * - System metrics explanation
 */

import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';
import { getCTOContext, getCTOContextSummary } from '../utils/getContext.js';

// Session storage for conversation continuity
const sessions: Map<string, ChatSession> = new Map();

// Cache the full context (expensive to generate)
let cachedContext: string | null = null;
let contextCacheTimestamp: number = 0;
const CONTEXT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the full CTO context with caching
 */
function getContext(): string {
  const now = Date.now();
  if (!cachedContext || (now - contextCacheTimestamp) > CONTEXT_CACHE_TTL) {
    cachedContext = getCTOContext();
    contextCacheTimestamp = now;
    console.log('[AI-CTO] Context refreshed, length:', cachedContext.length);
  }
  return cachedContext;
}

/**
 * System instructions for the HospoGo Architect persona
 */
function getSystemInstructions(): string {
  const context = getContext();
  
  return `You are the **HospoGo Architect**, the omniscient AI assistant for the CTO Dashboard.
You have God-Mode access to HospoGo's complete technical and business DNA.

## Your Personality
- Speak with confidence and technical authority
- Use precise, engineering-focused language
- Reference specific files, functions, and database tables
- Explain complex systems in clear terms
- Be direct - CTO Rick values efficiency

## Your Knowledge Base
You have access to the complete HospoGo codebase knowledge:

${context}

## Response Capabilities

### 1. Technical Deep Dives
When asked about any feature, explain:
- Which files implement it (exact paths)
- The database tables involved
- The algorithm or business logic
- Any edge cases or known limitations

### 2. Introspective Analysis
When Rick asks about code he didn't write:
- Identify the design pattern used
- Explain the logic in plain English
- Provide a technical deep-dive when requested
- Reference the relevant manual section if applicable

### 3. Business Intelligence
When asked about business logic:
- Explain the "why" behind technical decisions
- Reference ARR calculations, conversion weights
- Discuss investor narrative implications

### 4. System Health
When asked about metrics or health:
- Reference the 46/46 audit count origin
- Explain Xero Mutex states
- Discuss session persistence patterns

## Response Format

### For Code Questions
\`\`\`
📁 File: [exact path]
🔧 Pattern: [Repository/Service/Context/etc.]
📊 Tables: [comma-separated table names]

**Plain English:**
[2-3 sentence explanation]

**Technical Deep-Dive:**
[detailed explanation with code snippets if helpful]
\`\`\`

### For Business Questions
\`\`\`
💡 Strategy: [name of strategy/algorithm]
💰 ARR Impact: [if applicable]
📈 Investor Narrative: [relevant talking point]

**The Logic:**
[explanation]
\`\`\`

### For Quick Lookups
Provide concise, accurate answers referencing specific locations.

## Important Guidelines
- Always cite specific files and line numbers when possible
- If something is a mock/demo value, say so clearly
- If a feature is in R&D, say "This is in the Foundry R&D phase"
- Reference the User Manual sections when relevant
- Be prepared to explain code that was AI-generated in prior sessions

## Context Awareness
You're running in the CTO Dashboard. Rick may be preparing for investor demos.
Prioritize accuracy and confidence - this is the "source of truth" for the platform.`;
}

/**
 * Initialize Gemini model with CTO persona
 */
function getGeminiModel(): GenerativeModel | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey) {
    console.error('[AI-CTO] Missing Gemini API key');
    return null;
  }
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      systemInstruction: getSystemInstructions(),
    });
  } catch (error) {
    console.error('[AI-CTO] Error initializing Gemini:', error);
    return null;
  }
}

/**
 * Get or create a chat session for conversation continuity
 */
function getOrCreateSession(sessionId: string, model: GenerativeModel): ChatSession {
  let session = sessions.get(sessionId);
  
  if (!session) {
    session = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 2048, // Higher limit for detailed explanations
        temperature: 0.4, // Lower temp for more precise/factual responses
        topP: 0.9,
      },
    });
    sessions.set(sessionId, session);
    
    // Clean up old sessions after 60 minutes (longer for CTO sessions)
    setTimeout(() => {
      sessions.delete(sessionId);
      console.log('[AI-CTO] Session expired:', sessionId);
    }, 60 * 60 * 1000);
  }
  
  return session;
}

/**
 * Query type classification for logging
 */
function classifyQuery(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('xero') || lowerQuery.includes('mutex') || lowerQuery.includes('sync')) {
    return 'xero_integration';
  }
  if (lowerQuery.includes('smart fill') || lowerQuery.includes('a-team') || lowerQuery.includes('invitation')) {
    return 'smart_fill';
  }
  if (lowerQuery.includes('reliability') || lowerQuery.includes('crown') || lowerQuery.includes('demerit')) {
    return 'reputation';
  }
  if (lowerQuery.includes('suburban') || lowerQuery.includes('loyalty') || lowerQuery.includes('lga')) {
    return 'market_intelligence';
  }
  if (lowerQuery.includes('lead') || lowerQuery.includes('arr') || lowerQuery.includes('revenue')) {
    return 'revenue_engine';
  }
  if (lowerQuery.includes('schema') || lowerQuery.includes('table') || lowerQuery.includes('database')) {
    return 'data_schema';
  }
  if (lowerQuery.includes('file') || lowerQuery.includes('component') || lowerQuery.includes('where')) {
    return 'codebase_lookup';
  }
  if (lowerQuery.includes('explain') || lowerQuery.includes('how does') || lowerQuery.includes('what is')) {
    return 'introspective_analysis';
  }
  if (lowerQuery.includes('audit') || lowerQuery.includes('health') || lowerQuery.includes('metric')) {
    return 'system_health';
  }
  
  return 'general';
}

export interface CTOQueryResponse {
  answer: string;
  queryType: string;
  sessionId: string;
  success: boolean;
  responseTimeMs: number;
}

export interface CTOQueryRequest {
  query: string;
  sessionId?: string;
  mode?: 'concise' | 'detailed' | 'introspective';
}

/**
 * Process a CTO query and return an AI-generated response
 */
export async function processCTOQuery(request: CTOQueryRequest): Promise<CTOQueryResponse> {
  const startTime = Date.now();
  const { query, sessionId: providedSessionId, mode = 'detailed' } = request;
  const sessionId = providedSessionId || `cto-${crypto.randomUUID()}`;
  
  // Classify the query
  const queryType = classifyQuery(query);
  
  // Get Gemini model
  const model = getGeminiModel();
  
  if (!model) {
    return {
      answer: "⚠️ **Gemini API Unavailable**\n\nThe AI service is not configured. Please ensure `GEMINI_API_KEY` is set in environment variables.\n\nFor now, you can reference the knowledge base directly in:\n- `api/_src/utils/getContext.ts` (full context)\n- `docs/user-manual.md` (user documentation)",
      queryType,
      sessionId,
      success: false,
      responseTimeMs: Date.now() - startTime,
    };
  }
  
  try {
    // Build contextual prompt based on mode
    let contextualQuery = query;
    
    if (mode === 'introspective') {
      contextualQuery = `[INTROSPECTIVE ANALYSIS MODE]
The user wants to understand code they didn't write themselves.
Identify design patterns, explain the logic, and provide both plain English and technical explanations.

Query: ${query}`;
    } else if (mode === 'concise') {
      contextualQuery = `[CONCISE MODE]
Provide a brief, direct answer. Skip lengthy explanations unless specifically asked.

Query: ${query}`;
    }
    
    // Get or create chat session
    const session = getOrCreateSession(sessionId, model);
    
    // Send message and get response
    const result = await session.sendMessage(contextualQuery);
    const response = result.response;
    const answer = response.text();
    
    const responseTimeMs = Date.now() - startTime;
    
    console.log('[AI-CTO] Query processed:', {
      queryType,
      queryLength: query.length,
      responseLength: answer.length,
      responseTimeMs,
      mode,
    });
    
    return {
      answer,
      queryType,
      sessionId,
      success: true,
      responseTimeMs,
    };
  } catch (error: any) {
    console.error('[AI-CTO] Error processing query:', error);
    
    return {
      answer: `⚠️ **Error Processing Query**\n\nSomething went wrong: ${error.message || 'Unknown error'}\n\nTry rephrasing your question, or check the console for details.`,
      queryType,
      sessionId,
      success: false,
      responseTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Clear a session (for "start fresh" functionality)
 */
export function clearCTOSession(sessionId: string): void {
  sessions.delete(sessionId);
  console.log('[AI-CTO] Session cleared:', sessionId);
}

/**
 * Get active session count for monitoring
 */
export function getActiveCTOSessionCount(): number {
  return sessions.size;
}

/**
 * Force refresh the context cache
 */
export function refreshContextCache(): void {
  cachedContext = null;
  contextCacheTimestamp = 0;
  console.log('[AI-CTO] Context cache cleared');
}
