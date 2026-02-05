/**
 * AI Support Service - HospoGo Support Specialist
 * 
 * Provides AI-powered support assistance using Gemini 2.5 Flash
 * Grounded in the user manual for accurate, contextual responses.
 * 
 * Features Knowledge Telemetry to track intelligence gaps:
 * - Logs queries triggering "Foundry R&D phase" fallback
 * - Tracks low-confidence responses for CTO review
 * - Enables continuous improvement of the knowledge base
 */

import { GoogleGenerativeAI, GenerativeModel, ChatSession, Content } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '../db/index.js';
import { supportIntelligenceGaps } from '../db/schema.js';

// Session storage for conversation continuity
const sessions: Map<string, ChatSession> = new Map();

// Load user manual as knowledge base
let userManualContent: string | null = null;

function loadUserManual(): string {
  if (userManualContent) return userManualContent;
  
  try {
    // Try multiple paths for the user manual
    const possiblePaths = [
      path.join(process.cwd(), 'docs', 'user-manual.md'),
      path.join(process.cwd(), '..', 'docs', 'user-manual.md'),
      path.join(__dirname, '..', '..', '..', 'docs', 'user-manual.md'),
    ];
    
    for (const manualPath of possiblePaths) {
      if (fs.existsSync(manualPath)) {
        userManualContent = fs.readFileSync(manualPath, 'utf-8');
        console.log('[AI Support] User manual loaded from:', manualPath);
        return userManualContent;
      }
    }
    
    console.warn('[AI Support] User manual not found, using fallback knowledge');
    return getFallbackKnowledge();
  } catch (error) {
    console.error('[AI Support] Error loading user manual:', error);
    return getFallbackKnowledge();
  }
}

function getFallbackKnowledge(): string {
  return `
# HospoGo Quick Reference

HospoGo is a hospitality logistics platform connecting venues with professionals.

## Pricing (The Logistics Platform Fee)
HospoGo operates on a simple $149/month **Logistics Platform Fee** model:
- One flat fee for venues - no success taxes, no per-shift charges
- Includes: Roster automation, Xero integration, compliance management, A-Team invitations
- The term "Logistics Platform Fee" should ALWAYS be used (never "subscription" or "monthly fee")

## Key Features:
- **Capacity Templates**: Pre-defined staffing patterns for automated rostering
- **Invite A-Team**: Bulk invite favorite staff to fill shifts
- **Xero Integration**: Sync timesheets to Xero Payroll
- **The Vault**: Compliance document management
- **Accept All**: Auto-accept shifts from trusted venues (for professionals)

## Common Tasks:
- Create shifts from the calendar view
- Manage staff from Venue > Staff
- Configure Xero in Settings > Integrations
- View earnings from the dashboard

For detailed help, please contact support@hospogo.com
  `;
}

// Support specialist persona and system instructions
function getSystemInstructions(): string {
  const userManual = loadUserManual();
  
  return `You are the HospoGo Support Concierge, an AI assistant with comprehensive knowledge of the HospoGo hospitality logistics platform. You have full access to the User Manual and should use it as your authoritative source.

## Your Personality & Approach
- Friendly, professional, and patient
- Speak in a conversational tone, not robotic
- Use "you" and "your" to address the user directly
- Provide step-by-step instructions when explaining processes
- Acknowledge the user's frustration if they seem stuck
- Celebrate small wins ("Great! You've completed the first step")

## Your Knowledge Base
You have access to the complete HospoGo User Manual. Use this as your primary source of truth:

${userManual}

## CRITICAL Response Protocol
When answering questions:
1. **ALWAYS cite the manual**: Provide the specific Section name from the manual (e.g., "See Section: The Financial Engine (Xero Sync) - Partial Success Reports")
2. **Quote relevant details**: Pull specific information from the manual to support your answer
3. **If a feature is NOT in the manual**: You MUST state: "That feature is currently in the Foundry R&D phase; please contact the CTO for a technical brief."
4. **Never invent features**: Only describe functionality documented in the manual

## ⭐ PRIORITY: STEP-BY-STEP UI GUIDANCE ⭐
**This is your PRIMARY response pattern.** Every answer MUST include precise navigation instructions:

### Always Tell Users EXACTLY Where to Click
❌ WRONG: "You can find this in settings"
✅ RIGHT: "Go to **Sidebar** → **Settings** → **Business** → **Operating Hours**"

❌ WRONG: "Check your Xero integration"  
✅ RIGHT: "Navigate to **Settings** → **Integrations** → **Xero** → look for the green 'Connected' indicator"

❌ WRONG: "Use the A-Team feature"
✅ RIGHT: "Click the **Roster Tools** button (top-right of calendar) → Select **Invite A-Team**"

### UI Navigation Format Standard
Always use this exact format for navigation paths:
- **Sidebar** → **Settings** → **Business** → **[Tab Name]**
- **Calendar View** → **Roster Tools** (button) → **[Action]**
- **Venue** → **Staff** → Click staff name → **[Section]**

### Visual Cue Descriptions
Include visual elements to help users identify UI components:
- Button colors: "the green **Save** button", "the Electric Lime **Sync Now** button"
- Icons: "the ⭐ Star icon next to their name"
- Status indicators: "look for the 🟢 green checkmark"
- Locations: "in the top-right corner", "in the sidebar", "in the modal popup"

### Numbered Step Format (Required for Multi-Step Tasks)
For any task requiring 2+ steps, use numbered lists:
1. Navigate to **Settings** → **Integrations**
2. Click the **Connect to Xero** button (blue, top-right)
3. Sign in to your Xero account when prompted
4. Select your Xero Organisation from the dropdown
5. Look for the **Connected** status indicator (green checkmark)

## Response Guidelines
1. **Be Specific**: Reference exact menu paths (e.g., "Navigate to Settings → Integrations → Xero")
2. **Cite Your Source**: Always mention the manual section (e.g., "As detailed in 'The A-Team & Smart Fill' section...")
3. **Use Visual Cues**: Mention icons, button colors, or UI elements when helpful
4. **Anticipate Follow-ups**: If explaining a process, mention related features they might need
5. **Offer Alternatives**: If one approach doesn't work, suggest another
6. **Know Your Limits**: If asked about something outside HospoGo (e.g., general Xero help), acknowledge and redirect

## Key Manual Sections to Reference
- **The Golden Paths (Outcomes)**: Scenario-based step-by-step guidance for common tasks
- **The Logic Behind the Engine**: Plain-English explanations of Mutex Locking and Suburban Loyalty
- **Troubleshooting FAQ**: Common questions with exact navigation steps
- **The Financial Engine (Xero Sync)**: Mutex-locking, Partial Success Reports, troubleshooting
- **The A-Team & Smart Fill**: Availability logic (14-day window), Status Legend (Red/Amber/Green)
- **The Vault (Compliance)**: DVS Handshake for RSA verification, 30-day expiry alerts
- **Lead Tracker (Executive CRM)**: Brisbane 100 campaign management, Projected ARR calculation
- **Capacity Templates**: Automated rostering patterns
- **Accept All**: Auto-accept for professionals

## User Types
- **Venue Owners/Managers (Hub)**: Focus on rostering, staff management, Xero integration, compliance
- **Professionals (Workers)**: Focus on finding shifts, applications, earnings, Accept All feature
- **Executives**: Focus on Lead Tracker, ARR projections, campaign management

## Important Notes
- Never share sensitive information or credentials
- Don't make promises about features that don't exist
- If you're unsure, say so and suggest contacting human support
- Always encourage users to keep their browser updated
- For R&D/unreleased features, direct to CTO for technical brief

## Response Format
- Keep responses concise but complete
- **Always include precise UI navigation paths**
- **Always include the manual section reference**
- Use numbered lists for multi-step tasks
- Bold important actions, menu items, and buttons
- End with a helpful follow-up question or offer when appropriate`;
}

// Initialize Gemini client
function getGeminiModel(): GenerativeModel | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey) {
    console.error('[AI Support] Missing Gemini API key');
    return null;
  }
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-2.5-flash for real-time speed as specified
    return genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      systemInstruction: getSystemInstructions(),
    });
  } catch (error) {
    console.error('[AI Support] Error initializing Gemini:', error);
    return null;
  }
}

// Get or create a chat session for conversation continuity
function getOrCreateSession(sessionId: string, model: GenerativeModel): ChatSession {
  let session = sessions.get(sessionId);
  
  if (!session) {
    session = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
        topP: 0.9,
      },
    });
    sessions.set(sessionId, session);
    
    // Clean up old sessions after 30 minutes
    setTimeout(() => {
      sessions.delete(sessionId);
    }, 30 * 60 * 1000);
  }
  
  return session;
}

// Classify the question type for analytics
function classifyQuestion(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  // Xero / Financial Engine
  if (lowerQuery.includes('xero') || lowerQuery.includes('sync') || lowerQuery.includes('payroll') || 
      lowerQuery.includes('mutex') || lowerQuery.includes('partial success') || lowerQuery.includes('timesheet')) {
    return 'xero_integration';
  }
  // Lead Tracker / CRM
  if (lowerQuery.includes('lead') || lowerQuery.includes('crm') || lowerQuery.includes('arr') || 
      lowerQuery.includes('pipeline') || lowerQuery.includes('brisbane 100') || lowerQuery.includes('campaign')) {
    return 'lead_tracker';
  }
  // Capacity Templates
  if (lowerQuery.includes('template') || lowerQuery.includes('capacity') || lowerQuery.includes('auto-fill')) {
    return 'capacity_templates';
  }
  // A-Team / Smart Fill
  if (lowerQuery.includes('a-team') || lowerQuery.includes('smart fill') || lowerQuery.includes('invite') ||
      lowerQuery.includes('availability') || lowerQuery.includes('14-day') || lowerQuery.includes('status legend')) {
    return 'smart_fill';
  }
  // The Vault / Compliance
  if (lowerQuery.includes('vault') || lowerQuery.includes('compliance') || lowerQuery.includes('rsa') || 
      lowerQuery.includes('certificate') || lowerQuery.includes('dvs') || lowerQuery.includes('verification') ||
      lowerQuery.includes('expir')) {
    return 'compliance';
  }
  // Accept All
  if (lowerQuery.includes('accept all') || lowerQuery.includes('auto-accept')) {
    return 'accept_all';
  }
  // Reputation Engine
  if (lowerQuery.includes('demerit') || lowerQuery.includes('strike') || lowerQuery.includes('clean streak') ||
      lowerQuery.includes('shadow-ban') || lowerQuery.includes('shadow ban') || lowerQuery.includes('reputation') ||
      lowerQuery.includes('rating') || lowerQuery.includes('review') || lowerQuery.includes('star')) {
    return 'reputation';
  }
  // High-Velocity Logistics (Standby & Running Late)
  if (lowerQuery.includes('standby') || lowerQuery.includes('stand by') || lowerQuery.includes('running late') ||
      lowerQuery.includes('late button') || lowerQuery.includes('gap shift') || lowerQuery.includes('emergency shift') ||
      lowerQuery.includes('premium rate') || lowerQuery.includes('eta')) {
    return 'high_velocity';
  }
  // Scheduling
  if (lowerQuery.includes('calendar') || lowerQuery.includes('schedule') || lowerQuery.includes('shift') || lowerQuery.includes('roster')) {
    return 'scheduling';
  }
  // Payments
  if (lowerQuery.includes('payment') || lowerQuery.includes('earning') || lowerQuery.includes('money') || lowerQuery.includes('pay')) {
    return 'payments';
  }
  // Account
  if (lowerQuery.includes('profile') || lowerQuery.includes('account') || lowerQuery.includes('setting')) {
    return 'account';
  }
  // Communication
  if (lowerQuery.includes('message') || lowerQuery.includes('notification') || lowerQuery.includes('chat')) {
    return 'communication';
  }
  
  return 'general';
}

export interface SupportQueryResponse {
  answer: string;
  questionType: string;
  sessionId: string;
  success: boolean;
  /** Indicates if this response triggered an intelligence gap log */
  intelligenceGapLogged?: boolean;
}

export interface SupportQueryRequest {
  query: string;
  sessionId?: string;
  userRole?: 'venue' | 'professional' | 'unknown';
  context?: {
    currentPage?: string;
    recentActions?: string[];
  };
}

/**
 * Intelligence Gap Detection Patterns
 * 
 * These patterns identify responses where the AI couldn't provide a confident answer.
 * Used to trigger logging for CTO review and knowledge base improvement.
 */
const INTELLIGENCE_GAP_PATTERNS = {
  // Direct fallback triggers
  foundryFallback: [
    'Foundry R&D phase',
    'currently in the Foundry',
    'contact the CTO for a technical brief',
    'in development phase',
    'feature is not yet available',
    'not currently documented',
  ],
  // Low confidence indicators
  lowConfidence: [
    "I'm not entirely sure",
    "I don't have specific information",
    "This isn't covered in the manual",
    "I couldn't find details about",
    "outside the scope of the documentation",
    "please contact support",
    "I apologize, but I'm unable",
    "I don't have access to information about",
  ],
  // Unknown feature requests
  unknownFeature: [
    "doesn't exist in HospoGo",
    "not a feature of HospoGo",
    "HospoGo doesn't currently support",
    "not available in the platform",
  ],
};

type GapType = 'foundry_fallback' | 'low_confidence' | 'unknown_feature' | 'api_failure';

/**
 * Detect if a response indicates an intelligence gap
 */
function detectIntelligenceGap(response: string): { isGap: boolean; gapType: GapType | null } {
  const responseLower = response.toLowerCase();
  
  // Check for Foundry R&D fallback
  for (const pattern of INTELLIGENCE_GAP_PATTERNS.foundryFallback) {
    if (responseLower.includes(pattern.toLowerCase())) {
      return { isGap: true, gapType: 'foundry_fallback' };
    }
  }
  
  // Check for low confidence indicators
  for (const pattern of INTELLIGENCE_GAP_PATTERNS.lowConfidence) {
    if (responseLower.includes(pattern.toLowerCase())) {
      return { isGap: true, gapType: 'low_confidence' };
    }
  }
  
  // Check for unknown feature responses
  for (const pattern of INTELLIGENCE_GAP_PATTERNS.unknownFeature) {
    if (responseLower.includes(pattern.toLowerCase())) {
      return { isGap: true, gapType: 'unknown_feature' };
    }
  }
  
  return { isGap: false, gapType: null };
}

/**
 * Log an intelligence gap to the database for CTO review
 * 
 * This function runs asynchronously and doesn't block the response.
 * Failures are logged but don't affect the user experience.
 */
async function logIntelligenceGap(params: {
  query: string;
  questionType: string;
  sessionId: string;
  userRole?: string;
  currentPage?: string;
  aiResponse: string;
  gapType: GapType;
  wasAnswered: boolean;
}): Promise<void> {
  try {
    if (!db) {
      console.warn('[AI Support] Database not available, skipping intelligence gap logging');
      return;
    }
    await db.insert(supportIntelligenceGaps).values({
      query: params.query,
      questionType: params.questionType,
      sessionId: params.sessionId,
      userRole: params.userRole || 'unknown',
      currentPage: params.currentPage,
      aiResponse: params.aiResponse,
      gapType: params.gapType,
      wasAnswered: params.wasAnswered ? new Date() : null,
    });
    
    console.log('[AI Support] Intelligence gap logged:', {
      gapType: params.gapType,
      questionType: params.questionType,
      queryPreview: params.query.substring(0, 50) + '...',
    });
  } catch (error) {
    // Don't throw - logging failures shouldn't break the user experience
    console.error('[AI Support] Failed to log intelligence gap:', error);
  }
}

/**
 * Process a support query and return an AI-generated response
 * 
 * Features Knowledge Telemetry:
 * - Detects low-confidence responses and "Foundry R&D" fallbacks
 * - Logs intelligence gaps for CTO review
 * - Enables continuous knowledge base improvement
 */
export async function processQuery(request: SupportQueryRequest): Promise<SupportQueryResponse> {
  const { query, sessionId: providedSessionId, userRole = 'unknown', context } = request;
  const sessionId = providedSessionId || crypto.randomUUID();
  
  // Classify the question
  const questionType = classifyQuestion(query);
  
  // Get Gemini model
  const model = getGeminiModel();
  
  if (!model) {
    // Log API failure as intelligence gap (we couldn't help the user)
    logIntelligenceGap({
      query,
      questionType,
      sessionId,
      userRole,
      currentPage: context?.currentPage,
      aiResponse: 'API unavailable - fallback response provided',
      gapType: 'api_failure',
      wasAnswered: false,
    }).catch(() => {}); // Fire and forget
    
    return {
      answer: "I apologize, but I'm currently unable to process your request. Please try again in a moment, or contact our support team at support@hospogo.com for immediate assistance.",
      questionType,
      sessionId,
      success: false,
      intelligenceGapLogged: true,
    };
  }
  
  try {
    // Build contextual prompt
    let contextualQuery = query;
    
    if (userRole && userRole !== 'unknown') {
      contextualQuery = `[User is a ${userRole === 'venue' ? 'Venue Owner/Manager' : 'Professional'}]\n\n${query}`;
    }
    
    if (context?.currentPage) {
      contextualQuery = `[User is on page: ${context.currentPage}]\n\n${contextualQuery}`;
    }
    
    // Get or create chat session
    const session = getOrCreateSession(sessionId, model);
    
    // Send message and get response
    const result = await session.sendMessage(contextualQuery);
    const response = result.response;
    const answer = response.text();
    
    // === KNOWLEDGE TELEMETRY ===
    // Detect if this response indicates an intelligence gap
    const { isGap, gapType } = detectIntelligenceGap(answer);
    let intelligenceGapLogged = false;
    
    if (isGap && gapType) {
      // Log the gap asynchronously (don't block response)
      logIntelligenceGap({
        query,
        questionType,
        sessionId,
        userRole,
        currentPage: context?.currentPage,
        aiResponse: answer,
        gapType,
        wasAnswered: gapType === 'low_confidence', // Low confidence still provided an answer
      }).catch(() => {}); // Fire and forget
      
      intelligenceGapLogged = true;
    }
    
    console.log('[AI Support] Query processed:', {
      questionType,
      queryLength: query.length,
      responseLength: answer.length,
      intelligenceGapDetected: isGap,
      gapType: gapType || 'none',
    });
    
    return {
      answer,
      questionType,
      sessionId,
      success: true,
      intelligenceGapLogged,
    };
  } catch (error: any) {
    console.error('[AI Support] Error processing query:', error);
    
    // Provide a helpful fallback response
    const fallbackAnswer = getFallbackResponse(query, questionType);
    
    // Log API/processing failure
    logIntelligenceGap({
      query,
      questionType,
      sessionId,
      userRole,
      currentPage: context?.currentPage,
      aiResponse: `Error: ${error.message || 'Unknown error'} - Fallback provided`,
      gapType: 'api_failure',
      wasAnswered: false,
    }).catch(() => {}); // Fire and forget
    
    return {
      answer: fallbackAnswer,
      questionType,
      sessionId,
      success: false,
      intelligenceGapLogged: true,
    };
  }
}

/**
 * Generate a fallback response when AI is unavailable
 */
function getFallbackResponse(query: string, questionType: string): string {
  const responses: Record<string, string> = {
    xero_integration: `**Section: The Financial Engine (Xero Sync)**

For Xero integration help:
1. Navigate to **Settings → Integrations**
2. Click **Connect to Xero** if not connected
3. For sync issues, check if the pay period is locked in Xero
4. Ensure all employees are mapped in **Team → Xero Employee Mapper**

**About Partial Success:** If your sync fails for some staff but not others, the system provides a Partial Success Report. Successfully synced staff are committed to Xero; only failed records need attention. See the "Partial Success Reports" section in the manual.

**About Mutex Locking:** The system prevents double-syncing automatically. If you accidentally click sync twice, only one sync executes.

Need more help? Contact support@hospogo.com`,
    
    lead_tracker: `**Section: Lead Tracker (Executive CRM)**

The Lead Tracker is used for sales pipeline management:
1. Navigate to **Lead Tracker → Campaigns**
2. Create campaigns (e.g., "Brisbane 100")
3. Track leads through pipeline stages
4. View Projected ARR based on pipeline probability

**ARR Calculation:** Projected ARR = Sum of (Lead License Value × Stage Probability). See the manual for detailed examples.

Need more help? Contact support@hospogo.com`,
    
    capacity_templates: `**Section: Capacity Templates**

For Capacity Templates:
1. Go to **Settings → Business Settings → Capacity Planner**
2. Create templates with your standard staffing patterns
3. Use **Roster Tools → Auto-Fill from Templates** to apply them

Need more help? Contact support@hospogo.com`,
    
    smart_fill: `**Section: The A-Team & Smart Fill**

For Invite A-Team / Smart Fill:
1. First, mark staff as favorites in **Venue → Staff**
2. Click the star icon on their profile
3. Then use **Roster Tools → Invite A-Team** from the calendar

**Availability Logic:** Smart Fill only invites staff who are available in the 14-day rolling window. Staff who have marked themselves unavailable are automatically excluded.

**Status Legend:**
- 🔴 Red = Vacant (unfilled)
- 🟡 Amber = Invited (awaiting response)
- 🟢 Green = Confirmed (filled)

Need more help? Contact support@hospogo.com`,
    
    compliance: `**Section: The Vault (Compliance)**

For Compliance (The Vault):
1. Go to **Venue → Staff** and select a team member
2. View their compliance status
3. Upload documents using **Add Document**

**DVS Handshake:** RSA certificates are automatically verified against government databases within seconds.

**Expiry Alerts:** You'll receive proactive notifications at 30, 14, and 7 days before document expiry.

Need more help? Contact support@hospogo.com`,
    
    accept_all: `**Section: Accept All Feature**

For Accept All feature (Professionals):
1. Go to **Settings → Professional Settings**
2. Enable **Auto-Accept Invitations**
3. Configure your preferences (trusted venues, minimum rate)
4. Mark venues as trusted from your shift history

Need more help? Contact support@hospogo.com`,
    
    reputation: `**Section: The Reputation Engine (Professionals) - User Manual v3.1**

**Demerit Strikes:**
- 1 strike is automatically issued for cancellations within 4 hours of shift start
- 3 strikes result in a **7-day Marketplace Shadow-Ban** (you won't appear in Smart Fill)
- Check your strikes at **Profile** → **Reputation**

**How to Remove a Demerit Strike (Clean Streak):**
The **Clean Streak** policy allows you to redeem strikes through consistent reliability:
1. Complete **5 consecutive "Confirmed & On-Time" shifts**
2. Each shift must be: Accepted, worked, and clocked in within 10 minutes
3. After 5 qualifying shifts, **1 active demerit strike is automatically removed**
4. Track your progress at **Profile** → **Reputation** → **Clean Streak Progress**

**Rating System:**
- 5-star peer-review loop between Venue Owners and Professionals
- Rate each other after completed shifts
- Ratings visible after 48-hour anonymous cool-down period

**The Reliability Crown 👑:**
- Awarded to professionals who maintain **0 strikes** AND complete **10+ shifts**
- Displayed with a glowing Electric Lime crown icon on the Pro Dashboard
- Signals "Elite Professional" status to venue owners
- Unlocks priority visibility in Smart Fill/A-Team invitations

See Section: "The Reputation Engine (Professionals)" in User Manual v3.1 for full details.

Need more help? Contact support@hospogo.com`,
    
    high_velocity: `**Section: High-Velocity Logistics - User Manual v3.1**

**Standby Mode:**
Toggle Standby to become top-of-list for emergency "Gap Shifts" with premium rates.
1. Go to **Profile** → **Availability**
2. Toggle **Standby Mode** ON (⚡ icon)
3. Set your Standby window duration
4. Receive priority notifications for urgent fills (10-25% premium rates)

**Running Late Button:**
If you're delayed, use this to notify the Venue Manager with your live ETA:
1. Navigate to **Profile** → **Active Shift**
2. Click **"I'm Running Late"** button
3. Select reason and confirm your Updated ETA
4. System sends automated SMS/Push to Venue Manager with your ETA

**Grace Period:** Delays ≤10 minutes with notice = No penalty

See Section: "High-Velocity Logistics" in User Manual v3.1 for full details.

Need more help? Contact support@hospogo.com`,
    
    scheduling: `**Section: Rostering & Calendar**

For Calendar & Scheduling:
1. Switch views using Month/Week/Day buttons
2. Click empty slots to create shifts
3. Click shifts to assign staff
4. Watch the traffic light colors for status (Red=Vacant, Amber=Invited, Green=Confirmed)

Need more help? Contact support@hospogo.com`,
    
    payments: `**Section: Earnings & Payments**

For Payments & Earnings:
1. View earnings from your **Dashboard** or **Earnings** page
2. Set up bank details in **Settings → Payment Details**
3. Payments follow venue payment schedules

Need more help? Contact support@hospogo.com`,
    
    account: `**Section: Settings & Account**

For Account & Settings:
1. Access settings from the profile menu
2. Update profile info, password, and preferences
3. Configure notifications in **Settings → Notifications**

Need more help? Contact support@hospogo.com`,
    
    general: `I'm having trouble connecting right now. Here are some quick tips:

- **For venues**: Check **Roster Tools** for automation features
- **For professionals**: Browse shifts in **Find Shifts**
- **For Xero**: Go to **Settings → Integrations** (see "The Financial Engine" section)
- **For Compliance**: Go to **Venue → Staff** (see "The Vault" section)

Need more help? Contact support@hospogo.com`,
  };
  
  return responses[questionType] || responses.general;
}

/**
 * Clear a session (useful for "start over" functionality)
 */
export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * Get session count for monitoring
 */
export function getActiveSessionCount(): number {
  return sessions.size;
}

/**
 * Get intelligence gaps for CTO dashboard
 * 
 * Fetches unreviewed intelligence gaps for analysis and knowledge base improvement.
 */
export async function getIntelligenceGaps(options?: {
  limit?: number;
  gapType?: GapType;
  includeReviewed?: boolean;
}): Promise<{
  gaps: Array<{
    id: string;
    query: string;
    timestamp: Date;
    wasAnswered: boolean;
    questionType: string | null;
    gapType: string;
    aiResponse: string | null;
  }>;
  totalCount: number;
}> {
  const { limit = 50, gapType, includeReviewed = false } = options || {};
  
  try {
    if (!db) {
      throw new Error('Database not available');
    }
    const { eq, isNull, desc, count } = await import('drizzle-orm');
    
    // Build query conditions
    let query = db.select().from(supportIntelligenceGaps);
    
    // Add filters
    const conditions: any[] = [];
    if (!includeReviewed) {
      conditions.push(isNull(supportIntelligenceGaps.reviewedAt));
    }
    if (gapType) {
      conditions.push(eq(supportIntelligenceGaps.gapType, gapType));
    }
    
    // Execute query with filters
    const gaps = await db
      .select()
      .from(supportIntelligenceGaps)
      .where(conditions.length > 0 ? conditions[0] : undefined)
      .orderBy(desc(supportIntelligenceGaps.timestamp))
      .limit(limit);
    
    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(supportIntelligenceGaps)
      .where(conditions.length > 0 ? conditions[0] : undefined);
    
    return {
      gaps: gaps.map(g => ({
        id: g.id,
        query: g.query,
        timestamp: g.timestamp,
        wasAnswered: g.wasAnswered !== null,
        questionType: g.questionType,
        gapType: g.gapType,
        aiResponse: g.aiResponse,
      })),
      totalCount: countResult?.count || 0,
    };
  } catch (error) {
    console.error('[AI Support] Error fetching intelligence gaps:', error);
    throw error;
  }
}

/**
 * Mark an intelligence gap as reviewed
 */
export async function markGapReviewed(gapId: string, reviewerId: string): Promise<void> {
  try {
    if (!db) {
      throw new Error('Database not available');
    }
    const { eq } = await import('drizzle-orm');
    
    await db
      .update(supportIntelligenceGaps)
      .set({
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
      })
      .where(eq(supportIntelligenceGaps.id, gapId));
    
    console.log('[AI Support] Intelligence gap marked as reviewed:', gapId);
  } catch (error) {
    console.error('[AI Support] Error marking gap as reviewed:', error);
    throw error;
  }
}
