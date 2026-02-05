/**
 * CTO Knowledge Bridge - Context Injection Layer
 * 
 * Gathers the latest READMEs, schema definitions, strategy docs, and system metrics
 * to feed the System Prompt of the Omniscient CTO Bot (Gemini API).
 * 
 * This utility enables the AI to have full access to HospoGo's technical and business DNA.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Project Structure Context
 * Maps the layout of /api/_src and /src directories
 */
function getProjectStructure(): string {
  return `
## PROJECT STRUCTURE

### Backend Architecture (/api/_src)
\`\`\`
api/_src/
├── config/           # Firebase, Pusher, Stripe configuration
├── db/               # Drizzle ORM schema definitions
│   ├── schema.ts     # Main schema exports
│   └── migrations/   # SQL migration files (0001-0046+)
├── middleware/       # Auth, error handling, rate limiting
├── repositories/     # Data access layer (users, venues, shifts, etc.)
├── routes/           # Express API routes
│   ├── admin.ts      # Admin-only endpoints
│   ├── shifts.ts     # Shift CRUD + Smart Fill
│   ├── venues.ts     # Venue management
│   └── integrations/ # Xero OAuth + sync routes
├── services/         # Business logic layer
│   ├── smart-fill.service.ts    # A-Team invitation algorithm
│   ├── xero-oauth.service.ts    # Xero integration
│   └── ai-support.service.ts    # Support chatbot
└── utils/            # Helpers (date formatting, market intelligence)
\`\`\`

### Frontend Architecture (/src)
\`\`\`
src/
├── components/       # React components
│   ├── admin/        # CTO Dashboard, Lead Tracker
│   ├── calendar/     # Roster calendar, shift management
│   ├── dashboard/    # Venue + Professional dashboards
│   ├── professional/ # ProVault, Reliability Tracker
│   └── settings/     # Xero Sync Manager, integrations
├── contexts/         # React contexts (Auth, Notification)
├── hooks/            # Custom hooks (useAuth, useToast)
├── pages/            # Page components
│   ├── admin/        # CTODashboard.tsx, LeadTracker.tsx
│   └── venue-dashboard.tsx
└── utils/            # Frontend utilities
\`\`\`
`;
}

/**
 * Business Logic Context
 * Documents the A-Team recruitment strategy, Reliability Crown rules, and Suburban Loyalty algorithms
 */
function getBusinessLogic(): string {
  return `
## BUSINESS LOGIC - HospoGo's "Secret Sauce"

### 1. A-Team Recruitment Strategy (Smart Fill)
The A-Team system prioritizes venue favorites when filling shifts:

**Algorithm Flow:**
1. Venue owner clicks "Invite A-Team" on vacant shift(s)
2. System queries \`venue_favorites\` table for starred professionals
3. Filters by:
   - 14-day availability window (from \`worker_availability\` table)
   - No scheduling conflicts with existing shifts
   - Professional is not shadow-banned (0 active demerits)
4. Sends bulk invitations via Push + SMS
5. First professional to accept "wins" the shift

**Database Tables:**
- \`venue_favorites\`: venueId, professionalId, createdAt
- \`shift_invitations\`: shiftId, professionalId, status, invitedAt, respondedAt
- \`worker_availability\`: userId, date, morning, lunch, dinner (boolean slots)

### 2. Reliability Crown Rules
The Electric Lime crown (👑) signals elite professional status:

**Eligibility Criteria:**
- 0 active demerit strikes
- 10+ completed shifts (lifetime)
- Clean record for last 30 days

**Implementation:**
- \`profiles.completed_shifts >= 10\`
- \`profiles.no_show_count === 0\`
- \`profiles.cancellation_count === 0\`
- Crown displayed in ProReliabilityTracker.tsx with CSS drop-shadow glow

**Benefits:**
- Priority visibility in Smart Fill results
- Displayed to venue owners during staff selection
- Psychological status symbol for professionals

### 3. Suburban Loyalty Algorithm (Market Intelligence)
The "Neighborhood Stability Index" scores venues by labor demand predictability.

**File:** \`api/_src/utils/market-intelligence.ts\`

**MATHEMATICAL WEIGHTS (Critical):**
\`\`\`typescript
// === SCORING FORMULA ===
// Suburban LGAs: BASE 92 + (deterministicHash * 6) = Range 92-98
// CBD LGAs:      BASE 45 + (deterministicHash * 20) = Range 45-65  
// Unknown LGAs:  BASE 70 + (deterministicHash * 10) = Range 70-80

export function calculateLoyaltyScore(lgaName: string): number {
  const normalizedLga = lgaName.toLowerCase().trim();
  const hash = deterministicHash(normalizedLga); // Returns 0-1 range
  
  if (SUBURBAN_LGAS.has(normalizedLga)) {
    const modifier = Math.floor(hash * 6);  // 0-5 modifier
    return 92 + modifier;  // 92-97 actual range
  }
  
  if (CBD_LGAS.has(normalizedLga)) {
    const modifier = Math.floor(hash * 20);  // 0-19 modifier
    return 45 + modifier;  // 45-64 actual range
  }
  
  // Unknown - neutral assumption
  const modifier = Math.floor(hash * 10);  // 0-9 modifier
  return 70 + modifier;  // 70-79 actual range
}

// djb2 hash algorithm for deterministic scoring
function deterministicHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash % 1000) / 1000;  // 0-0.999 range
}
\`\`\`

**Business Impact:**
- Suburban +4.6% staff retention vs CBD venues
- Used in Lead Tracker for pipeline prioritization
- Growth Report CSV uses this algorithm for scoring

**seed-demo-data.ts Integration:**
The BRISBANE_100_DEMO_LEADS array uses \`[LGA: suburb_name]\` pattern in notes field.
Example: \`"[LGA: West End] Owner interested in Xero Mutex sync..."\`
The \`extractLgaFromNotes()\` function parses this for score calculation.
`;
}

/**
 * Data Schema Context
 * Documents relationships between Leads, Shifts, Workers, and Xero Mutex states
 */
function getDataSchema(): string {
  return `
## DATA SCHEMA RELATIONSHIPS

### Core Entity Relationships

\`\`\`
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   venues    │──────▶│   shifts    │◀──────│    users    │
│  (Employer) │       │  (The Work) │       │ (Assignee)  │
└─────────────┘       └─────────────┘       └─────────────┘
       │                     │                     │
       │                     │                     │
       ▼                     ▼                     ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│venue_favs   │       │ invitations │       │  profiles   │
│ (A-Team)    │       │  (Pending)  │       │(Reputation) │
└─────────────┘       └─────────────┘       └─────────────┘
\`\`\`

### Key Tables

**users** - All platform users
- id, email, firebaseUid, role, name, isOnboarded, stripeAccountId

**venues** - Business entities
- id, userId, name, address, xeroTenantId, xeroTenantName, isConnectedToXero

**shifts** - Individual work slots
- id, venueId, employerId, assigneeId, startTime, endTime, status, baseHourlyRate

**shift_invitations** - A-Team invitation tracking
- id, shiftId, professionalId, status (pending/accepted/declined), invitedAt

**worker_availability** - 14-day availability window
- userId, date, morning, lunch, dinner (boolean flags per slot)

**xero_audit_log** - Financial sync audit trail
- id, userId, operation, xeroTenantId, payload, result, createdAt
- Mutex states: SYNC_TIMESHEET, LOCK_ACQUIRED, LOCK_RELEASED

### Xero Mutex States

The Xero sync uses PostgreSQL advisory locks for exactly-once delivery:

\`\`\`
MUTEX LIFECYCLE:
1. LOCK_ACQUIRED - Advisory lock obtained (lockId, TTL: 30s)
2. SYNC_TIMESHEET - Timesheet data pushed to Xero
3. LOCK_RELEASED - Lock released on success/timeout

STATES:
- PENDING: Sync queued
- IN_PROGRESS: Lock held, pushing to Xero
- SUCCESS: All timesheets synced, lock released
- PARTIAL_SUCCESS: Some failed (employee mapping issues)
- FAILED: Complete failure, lock released
\`\`\`

### Lead Tracker (Brisbane 100 CRM)

**leads** (client-side mock, API-ready schema):
- id, venueName, contactPerson, email, phone, status, notes, createdAt
- status: 'lead' | 'onboarding' | 'active'

**ARR Calculation:**
- Committed ARR = (Active + Onboarding) × $149/mo × 12
- Pipeline ARR = Leads × $149/mo × 12 × 0.2 (20% conversion weight)
- Projected ARR = Committed + Pipeline
`;
}

/**
 * System Health Metrics Context
 * Documents the logic behind System Health footer and audit counts
 */
function getMetricsLogic(): string {
  return `
## SYSTEM HEALTH & METRICS

### Footer Ticker Logic (src/components/layout/Footer.tsx)
The System Health ticker displays real-time platform status:

\`\`\`
ENGINE STATUS: OPTIMAL | XERO MUTEX: ACTIVE | DVS API: VERIFIED | 46/46 AUDITS PASSING
\`\`\`

**Components:**
1. **ENGINE STATUS**: Static "OPTIMAL" (hardcoded for investor demo)
2. **XERO MUTEX**: Dynamic - changes to "SYNCING" when \`useIsMutating(['xero'])\` > 0
3. **DVS API**: Static "VERIFIED" (Australian Document Verification Service mock)
4. **AUDITS**: From \`SYSTEM_HEALTH_CONSTANTS.AUDITS_PASSING\` (46/46)

### 46/46 Audits Breakdown

The "46 Audits" represents total E2E test coverage:
- **Smart Fill Loop Tests**: 5 tests
- **Financial RBAC Tests**: 5 tests  
- **Xero Resilience Tests**: 11 tests
- **Investor Portal Tests**: 8 tests
- **Core Business Flow Tests**: 17 tests

### CTO Dashboard Metrics (src/pages/admin/CTODashboard.tsx)

**Quick Stats Footer:**
- AI Sessions: 247 (mock - future: real Gemini session count)
- Success Rate: 94.2% (mock - future: (1 - gapCount/totalQueries) * 100)
- Avg Response: 1.2s (mock - future: average Gemini latency)
- Manual Coverage: 89% (mock - represents documented feature coverage)

**Revenue Engine Metrics:**
- MONTHLY_PLATFORM_FEE = $149
- LEAD_CONVERSION_WEIGHT = 0.2 (20% conservative)
- ARR_MILESTONE_TARGET = $1,500,000

**Intelligence Gap Types:**
- foundry_fallback: Feature in R&D phase
- low_confidence: AI wasn't sure
- unknown_feature: User asked for non-existent feature
- api_failure: Gemini API error
`;
}

/**
 * Technical Deep Dives
 * In-depth explanations of complex features
 */
function getTechnicalDeepDives(): string {
  return `
## TECHNICAL DEEP DIVES

### 1. Xero Mutex Synchronization (api/_src/services/xero-oauth.service.ts)

**Purpose:** Prevent double-syncing timesheets to Xero Payroll

**Mechanism:**
\`\`\`typescript
// PostgreSQL advisory lock pattern
const lockId = hashString(\`xero-sync-\${venueId}-\${payPeriod}\`);
await db.execute(sql\`SELECT pg_advisory_lock(\${lockId})\`);

try {
  // Push timesheets to Xero API
  await xeroClient.payrollUK.createTimesheet(...);
  
  // Log success with SHA-256 checksum
  await logAudit({
    operation: 'SYNC_TIMESHEET',
    result: { status: 'SUCCESS', checksum: sha256(payload) }
  });
} finally {
  // Always release lock
  await db.execute(sql\`SELECT pg_advisory_unlock(\${lockId})\`);
}
\`\`\`

**TTL:** 30 seconds (auto-release on timeout)
**Retention:** 7 years per ATO compliance

### 2. Session Persistence (src/contexts/AuthContext.tsx)

**Tab Recovery Pattern:**
\`\`\`typescript
const SESSION_CACHE_USER_KEY = 'hospogo_cached_user';
const SESSION_CACHE_VENUE_KEY = 'hospogo_cached_venue';

// On mount: Restore from sessionStorage for instant render
const cachedUser = sessionStorage.getItem(SESSION_CACHE_USER_KEY);
if (cachedUser) {
  setUser(JSON.parse(cachedUser));
  setIsLoading(false); // Immediate render, no skeleton
}

// On auth success: Cache for future tab restores
sessionStorage.setItem(SESSION_CACHE_USER_KEY, JSON.stringify(user));
\`\`\`

**Benefit:** Eliminates "skeleton flicker" on page refresh

### 2.5. CTO AI Context Caching (api/_src/services/ai-cto.service.ts)

**Context Cache Layer:**
\`\`\`typescript
// Cache the full CTO context (expensive to generate)
let cachedContext: string | null = null;
let contextCacheTimestamp: number = 0;
const CONTEXT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getContext(): string {
  const now = Date.now();
  // Only regenerate if cache is null OR older than 5 minutes
  if (!cachedContext || (now - contextCacheTimestamp) > CONTEXT_CACHE_TTL) {
    cachedContext = getCTOContext();
    contextCacheTimestamp = now;
    console.log('[AI-CTO] Context refreshed, length:', cachedContext.length);
  }
  return cachedContext;
}
\`\`\`

**Session Management:**
- Sessions stored in Map: \`sessions: Map<string, ChatSession>\`
- Session TTL: 60 minutes (auto-cleanup via setTimeout)
- Session ID prefix: \`cto-{uuid}\`
- Context cache: 5 minutes (separate from session)

**Behavior During Handoff:**
1. Within 5 minutes: Same context, same session → instant response
2. After 5 minutes: Context regenerated, session preserved → response continues thread
3. After 60 minutes: Session cleared, new session starts → fresh conversation

### 3. Smart Fill Availability Check (api/_src/services/smart-fill.service.ts)

**Algorithm:**
\`\`\`typescript
async function isWorkerAvailable(userId: string, shiftDate: Date, slot: 'morning' | 'lunch' | 'dinner'): Promise<boolean> {
  const availability = await db.select()
    .from(workerAvailability)
    .where(and(
      eq(workerAvailability.userId, userId),
      eq(workerAvailability.date, shiftDate)
    ))
    .limit(1);
  
  if (!availability.length) return true; // No entry = available
  return availability[0][slot] === true;
}
\`\`\`

### 4. DVS Handshake (Mock Implementation)

**Pattern:**
\`\`\`typescript
// ProVaultManager.tsx - DVS Certificate Modal
const generateDvsHandshakeId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return \`DVS-RSA-\${timestamp}-\${random}\`;
};

// Display: DVS-RSA-K8H9J2-ABC123
// Shows: JetBrains Mono font, SHA-256 badge, ATO compliance note
\`\`\`
`;
}

/**
 * Design Patterns Used
 * For "Introspective Analysis" capability
 */
function getDesignPatterns(): string {
  return `
## DESIGN PATTERNS USED

### 1. Repository Pattern (api/_src/repositories/)
All database access goes through repository files, not direct db calls in routes.
\`users.repository.ts\`, \`venues.repository.ts\`, \`shifts.repository.ts\`

### 2. Service Layer Pattern (api/_src/services/)
Business logic separated from routes. Routes handle HTTP, services handle logic.

### 3. Context Provider Pattern (src/contexts/)
React contexts for cross-cutting concerns:
- AuthContext: User auth state, Firebase integration
- NotificationContext: Push notifications, sound alerts

### 4. Optimistic UI Updates
IntelligenceGaps table uses \`optimisticallyPatchedIds\` Set for instant feedback
before server confirms.

### 5. Query Key Conventions (React Query)
\`['lead-tracker']\` - Shared between LeadTracker and CTODashboard
\`['intelligence-gaps', gapFilter]\` - Filter-dependent cache
\`['xero-sync-history']\` - Xero audit trail

### 6. Glassmorphism Design System
CTO Dashboard uses \`bg-black/40 backdrop-blur-xl\` for depth layering.
Electric Lime (#BAFF39) for all accent colors.
Urbanist 900 for hero metrics.

### 7. Feature Flags via Environment
\`GEMINI_API_KEY\` - Enables AI support
\`ADMIN_EMAILS\` - Comma-separated admin email list
\`XERO_CLIENT_ID\` - Enables Xero integration
`;
}

/**
 * Load user manual if available
 */
function loadUserManual(): string {
  try {
    const possiblePaths = [
      path.join(process.cwd(), 'docs', 'user-manual.md'),
      path.join(process.cwd(), '..', 'docs', 'user-manual.md'),
    ];
    
    for (const manualPath of possiblePaths) {
      if (fs.existsSync(manualPath)) {
        return fs.readFileSync(manualPath, 'utf-8');
      }
    }
    return '(User manual not found in filesystem)';
  } catch {
    return '(Error loading user manual)';
  }
}

/**
 * Main export: Get full context for CTO AI
 */
export function getCTOContext(): string {
  const userManual = loadUserManual();
  
  return `
# HOSPOGO ARCHITECT KNOWLEDGE BASE
# Full Technical & Business DNA

${getProjectStructure()}

${getBusinessLogic()}

${getDataSchema()}

${getMetricsLogic()}

${getTechnicalDeepDives()}

${getDesignPatterns()}

## USER MANUAL REFERENCE
${userManual.substring(0, 15000)}${userManual.length > 15000 ? '\n\n(truncated - manual continues...)' : ''}
`;
}

/**
 * Get a summary context for faster responses
 */
export function getCTOContextSummary(): string {
  return `
# HOSPOGO QUICK REFERENCE

## Key Numbers
- Platform Fee: $149/month
- Audit Count: 46/46 passing
- ARR Milestone: $1.5M
- Conversion Weight: 20%
- Mutex TTL: 30 seconds
- Session Cache: sessionStorage

## Key Tables
- users, venues, shifts, shift_invitations
- worker_availability, venue_favorites
- xero_audit_log, support_intelligence_gaps

## Key Files
- api/_src/services/smart-fill.service.ts (A-Team algorithm)
- api/_src/services/xero-oauth.service.ts (Mutex sync)
- src/pages/admin/CTODashboard.tsx (Revenue Engine)
- src/contexts/AuthContext.tsx (Session Persistence)

## Brand
- Primary: Electric Lime #BAFF39
- Font: Urbanist 900 (metrics), Inter (body)
- Pattern: Glassmorphism (bg-black/40 backdrop-blur-xl)
`;
}

export default { getCTOContext, getCTOContextSummary };
