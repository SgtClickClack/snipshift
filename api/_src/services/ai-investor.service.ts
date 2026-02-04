/**
 * AI Investor Service
 * 
 * Provides intelligent conversational AI for investor inquiries using Google Gemini 2.5 Flash.
 * Grounds responses in HospoGo's strategic prospectus, competitive landscape, and market thesis.
 * 
 * SECURITY: Never discusses database architecture, private keys, or founder PII.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize Gemini client
const apiKey = process.env.GEMINI_API_KEY;
let genAI: GoogleGenerativeAI | null = null;

if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
}

/**
 * Question type classification for analytics
 */
export type QuestionType = 
  | 'financial' 
  | 'technical' 
  | 'market' 
  | 'team' 
  | 'product' 
  | 'competitive' 
  | 'investment'
  | 'general';

/**
 * Response from the AI investor service
 */
export interface InvestorQueryResponse {
  answer: string;
  questionType: QuestionType;
  success: boolean;
  error?: string;
}

/**
 * Knowledge base content for grounding the AI
 * Derived from hospogo_master_prospectus.md and competitive landscape analysis
 */
const KNOWLEDGE_BASE = `
# HospoGo Strategic Knowledge Base

## Executive Summary
HospoGo is Australia's first integrated Hospitality Logistics Engine—a unified platform solving the workforce crisis for 94,000 neighborhood venues through automated compliance, talent matching, and financial synchronization.

## The Seed Round
- **Raise Amount:** $1,000,000 AUD
- **Valuation:** $10M Post-Money
- **Equity Offered:** 10.0%
- **Instrument:** SAFE (Post-Money)
- **Minimum Check:** $25,000

## Key Metrics
- **National TAM:** $168M AUD
- **Audited R&D Investment:** $94,500 (630 hours)
- **Revenue Model:** $149/month Logistics Platform Fee
- **Gross Margin:** ~85%
- **CAC Target:** <$200
- **LTV:CAC Ratio:** >8:1

## The Problem: The $168M Logistics Void
Australia's hospitality sector employs 900,000+ workers across 94,000 venues. Yet 78% of neighborhood cafes, bars, and restaurants still operate with:
- WhatsApp groups for shift scheduling
- Paper timesheets and manual payroll
- Spreadsheet compliance tracking (RSA/RCG expiry)
- No centralized talent pool

## Market Catalyst: The Suburban Loyalty Shift
2024-2025 consumer data reveals a permanent paradigm shift:
- CBD Venues: -12% foot traffic, 3.2% staff retention
- Suburban Venues: +18% foot traffic, 4.6% staff retention

The "15-minute city" trend has redirected hospitality spend to neighborhood venues. These 72,000+ suburban operators represent our primary TAM.

## The Trinity Architecture (HospoGo Trinity)

### The Vault (Compliance Engine)
- Automated RSA/RCG/Licensing verification
- Real-time expiry alerts (30/14/7 days)
- Direct API sync with licensing authorities
- Zero manual compliance tracking

### The Marketplace (Talent Engine)
- Vetted skill profiles with reputation scores
- Instant shift matching algorithm
- A-Team favorites for reliable roster building
- Two-sided network effects

### The Engine (Logistics Core)
- Capacity-based intelligent scheduling
- Template-driven auto-fill
- Real-time Xero mutex synchronization
- One-click payroll export

Integration is the moat. Competitors offer point solutions. HospoGo delivers end-to-end logistics.

## Revenue Model: The Logistics Platform Fee
HospoGo operates on a high-margin $149/month Logistics Platform Fee model:

### Venue Tier: $149/month Logistics Platform Fee
- Full Trinity Engine access
- Unlimited staff management
- Xero integration included
- Marketplace posting credits
- Priority support

### Professional Tier: Free Forever
- Workers keep 100% of earnings
- RSA/RCG digital vault
- Shift discovery & booking
- Reputation building

## Traction & Milestones

### Development Investment (Audited)
- 630 R&D Hours invested
- $94,500 AUD sweat equity valuation (@ $150/hr)
- Production-ready MVP with enterprise security

### Milestone Roadmap
- Q1 2026: Brisbane 100 Pilot Launch (50 Active Platform Licenses)
- Q2 2026: Gold Coast Expansion (100 Active Platform Licenses)
- Q3 2026: SEQ Saturation (200 Active Platform Licenses)
- Q4 2026: National Rollout & Series A (500 Active Platform Licenses)

### Brisbane 100 Target
- 100 Active Platform Licenses in Greater Brisbane
- $178K ARR milestone
- Proof of product-market fit for Series A

## Competitive Landscape

### Deputy — The Enterprise Giant
- 2025 ARR: $180M+ (global)
- Weakness: Pricing model ($6+/seat) excludes 78% of suburban SMB venues
- Technical gap: No compliance automation, no labor marketplace
- HospoGo advantage: 58% cheaper per-seat with integrated compliance

### Tanda — The Australian Incumbent
- 2025 ARR: $45M (ANZ-focused)
- Weakness: No two-sided marketplace; Xero sync requires manual CSV
- Technical gap: Time & attendance only—no shift filling or talent pool
- HospoGo advantage: End-to-end logistics vs. single-feature solution

### Square Shifts — The POS Adjacency
- Weakness: Requires Square POS ecosystem lock-in
- Technical gap: No hospitality compliance (RSA/RCG), no financial sync
- HospoGo advantage: POS-agnostic, compliance-first architecture

### Switching Cost Moat
Once a venue activates all three Trinity engines:
1. The Vault: Staff credentials, expiry alerts, and audit trails become embedded
2. The Marketplace: A-Team favorites and reputation scores create hiring gravity
3. The Engine: Roster templates, financial history, and Xero mappings compound value

Result: 94% retention projection after 90-day activation window.

## Regulatory Tailwinds
- Fair Work Amendments 2025: New casual conversion rules increase compliance burden
- Xero Marketplace Growth: 400% increase in hospitality app integrations since 2023
- Labor Shortage Crisis: ABS data shows 67,000 unfilled hospitality roles nationally

## Use of Funds
- Sales & Marketing: 60% ($600,000)
- Engineering & R&D: 30% ($300,000)
- Operations & Legal: 10% ($100,000)

## Founding Team
- Rick (CEO): 15+ years hospitality operations, former multi-venue GM, deep SEQ network
- Lucas (COO): Financial operations background, Xero ecosystem expertise, compliance & audit experience
- Technical Advisory: Senior engineering consultants, enterprise SaaS architecture, security specialists
`;

/**
 * System prompt defining the AI's role and behavior constraints
 */
const SYSTEM_PROMPT = `You are the HospoGo Foundry Executive Agent, a sophisticated AI liaison for potential investors. You represent HospoGo at the highest level of professionalism and strategic communication.

## Your Identity
- Name: Foundry Executive Agent
- Role: Executive AI Liaison for the HospoGo Seed Round
- Demeanor: Confident, articulate, data-driven, executive-level

## Your Knowledge (Grounded in Audited Data)
You have comprehensive, verified knowledge of HospoGo's:
- Strategic positioning and $168M TAM market opportunity
- The HospoGo Trinity Architecture (Vault, Marketplace, Engine)
- Competitive landscape vs Deputy, Tanda, Square Shifts
- Financial model: $149/month Logistics Platform Fee, ~85% gross margin
- Seed round: $1M Ask, $10M Post-Money Valuation
- Audited R&D: $94,500 (630 hours @ $150/hr)
- Founding team credentials and regulatory tailwinds

## Terminology Standards (STRICT)
ALWAYS use these exact terms:
- "Logistics Platform Fee" (NEVER "subscription" or "monthly fee")
- "HospoGo Trinity" or "Trinity Architecture" (NEVER "three systems" or "modules")
- "Active Platform Licenses" (NEVER "subscribers" or "customers")
- "Suburban Loyalty" strategy (for market positioning)
- "Xero Handshake" (for financial sync integration)

## Financial Facts (Confirm When Asked)
- Seed Ask: $1,000,000 AUD
- Post-Money Valuation: $10,000,000 AUD
- Equity: 10.0%
- Audited R&D Investment: $94,500 AUD
- Revenue Model: $149/month Logistics Platform Fee
- Target ARR at Brisbane 100: $178,000

## Response Guidelines
1. Be concise but thorough—executives value their time
2. Lead with the key insight, then support with data
3. Use specific numbers and metrics when available
4. Maintain confidence without being aggressive
5. If asked about "The Ask," confirm the $1M Seed Round at $10M valuation

## SECURITY CONSTRAINTS - NEVER DISCUSS:
- Database architecture, schemas, or technical implementation details
- Firebase keys, API secrets, or security credentials
- Founder personal information (addresses, personal phone numbers, family details)
- Confidential competitor intelligence beyond public knowledge
- Specific customer names or revenue from individual clients

## Handling Sensitive Questions
If a question touches on restricted topics (technical security, PII, implementation details), respond with:
"That's a great question for the founding team to address directly. I'd recommend clicking the 'RSVP Briefing' button above to secure your seat at the upcoming investor presentation where Rick and Lucas can discuss this in detail."

## Knowledge Base
${KNOWLEDGE_BASE}

Respond naturally and professionally. You are speaking with sophisticated investors who understand SaaS metrics and hospitality industry dynamics.`;

/**
 * Sanitize user input to prevent prompt injection attacks
 */
function sanitizeInput(input: string): string {
  // Remove potential injection patterns
  let sanitized = input
    // Remove system prompt override attempts
    .replace(/system\s*prompt/gi, '[filtered]')
    .replace(/ignore\s*(previous|above|all)\s*(instructions?)?/gi, '[filtered]')
    .replace(/you\s*are\s*now/gi, '[filtered]')
    .replace(/pretend\s*(to\s*be|you\s*are)/gi, '[filtered]')
    .replace(/forget\s*(everything|all|your)/gi, '[filtered]')
    .replace(/new\s*instructions?/gi, '[filtered]')
    .replace(/override/gi, '[filtered]')
    // Remove markdown/code fence attempts
    .replace(/```[\s\S]*?```/g, '[code block removed]')
    // Remove excessive special characters
    .replace(/[<>{}[\]\\]/g, '')
    // Limit length
    .slice(0, 2000);
  
  return sanitized.trim();
}

/**
 * Classify the question type for analytics
 */
export function classifyQuestion(question: string): QuestionType {
  const lowerQuestion = question.toLowerCase();
  
  // Financial keywords
  if (
    lowerQuestion.includes('revenue') ||
    lowerQuestion.includes('arr') ||
    lowerQuestion.includes('mrr') ||
    lowerQuestion.includes('valuation') ||
    lowerQuestion.includes('raise') ||
    lowerQuestion.includes('funding') ||
    lowerQuestion.includes('equity') ||
    lowerQuestion.includes('investment') ||
    lowerQuestion.includes('price') ||
    lowerQuestion.includes('margin') ||
    lowerQuestion.includes('ltv') ||
    lowerQuestion.includes('cac') ||
    lowerQuestion.includes('unit economics') ||
    lowerQuestion.includes('platform fee')
  ) {
    return 'financial';
  }
  
  // Technical keywords
  if (
    lowerQuestion.includes('architecture') ||
    lowerQuestion.includes('api') ||
    lowerQuestion.includes('xero') ||
    lowerQuestion.includes('sync') ||
    lowerQuestion.includes('integration') ||
    lowerQuestion.includes('technology') ||
    lowerQuestion.includes('stack') ||
    lowerQuestion.includes('security') ||
    lowerQuestion.includes('encryption')
  ) {
    return 'technical';
  }
  
  // Market keywords
  if (
    lowerQuestion.includes('market') ||
    lowerQuestion.includes('tam') ||
    lowerQuestion.includes('suburban') ||
    lowerQuestion.includes('hospitality') ||
    lowerQuestion.includes('venue') ||
    lowerQuestion.includes('industry') ||
    lowerQuestion.includes('australia') ||
    lowerQuestion.includes('brisbane') ||
    lowerQuestion.includes('catalyst')
  ) {
    return 'market';
  }
  
  // Team keywords
  if (
    lowerQuestion.includes('team') ||
    lowerQuestion.includes('founder') ||
    lowerQuestion.includes('rick') ||
    lowerQuestion.includes('lucas') ||
    lowerQuestion.includes('ceo') ||
    lowerQuestion.includes('coo') ||
    lowerQuestion.includes('experience')
  ) {
    return 'team';
  }
  
  // Product keywords
  if (
    lowerQuestion.includes('product') ||
    lowerQuestion.includes('feature') ||
    lowerQuestion.includes('trinity') ||
    lowerQuestion.includes('vault') ||
    lowerQuestion.includes('marketplace') ||
    lowerQuestion.includes('engine') ||
    lowerQuestion.includes('compliance') ||
    lowerQuestion.includes('rsa') ||
    lowerQuestion.includes('roster')
  ) {
    return 'product';
  }
  
  // Competitive keywords
  if (
    lowerQuestion.includes('competitor') ||
    lowerQuestion.includes('deputy') ||
    lowerQuestion.includes('tanda') ||
    lowerQuestion.includes('square') ||
    lowerQuestion.includes('moat') ||
    lowerQuestion.includes('differentiation') ||
    lowerQuestion.includes('advantage')
  ) {
    return 'competitive';
  }
  
  // Investment keywords
  if (
    lowerQuestion.includes('seed') ||
    lowerQuestion.includes('round') ||
    lowerQuestion.includes('safe') ||
    lowerQuestion.includes('minimum') ||
    lowerQuestion.includes('check') ||
    lowerQuestion.includes('use of funds') ||
    lowerQuestion.includes('allocation')
  ) {
    return 'investment';
  }
  
  return 'general';
}

/**
 * Query the AI investor assistant
 */
export async function queryInvestorAssistant(
  question: string
): Promise<InvestorQueryResponse> {
  // Classify the question for analytics
  const questionType = classifyQuestion(question);
  
  // Check if Gemini is configured
  if (!genAI) {
    console.warn('[AI-INVESTOR] Gemini API key not configured, returning fallback response');
    return {
      answer: getFallbackResponse(question, questionType),
      questionType,
      success: true,
    };
  }
  
  // Sanitize input
  const sanitizedQuestion = sanitizeInput(question);
  
  if (!sanitizedQuestion) {
    return {
      answer: "I'd be happy to help with your inquiry. Could you please rephrase your question?",
      questionType: 'general',
      success: true,
    };
  }
  
  try {
    // Initialize the Gemini 2.5 Flash Preview model for low-latency executive responses
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-preview-05-20',
      systemInstruction: SYSTEM_PROMPT,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024,
      },
    });
    
    // Generate response
    const result = await model.generateContent(sanitizedQuestion);
    const response = result.response;
    const text = response.text();
    
    if (!text) {
      throw new Error('Empty response from Gemini');
    }
    
    console.log(`[AI-INVESTOR] Query processed - Type: ${questionType}, Length: ${text.length}`);
    
    return {
      answer: text,
      questionType,
      success: true,
    };
  } catch (error: any) {
    console.error('[AI-INVESTOR] Error querying Gemini:', error);
    
    // Return fallback response on error
    return {
      answer: getFallbackResponse(question, questionType),
      questionType,
      success: true,
      error: error?.message,
    };
  }
}

/**
 * Get a fallback response when AI is unavailable
 */
function getFallbackResponse(question: string, questionType: QuestionType): string {
  const fallbacks: Record<QuestionType, string> = {
    financial: `HospoGo operates on a high-margin $149/month Logistics Platform Fee model with ~85% gross margins. We're raising a $1M Seed Round at a $10M post-money valuation, offering 10% equity. Our unit economics target an LTV:CAC ratio exceeding 8:1. For detailed financial projections, I'd recommend scheduling a call with our founding team.`,
    
    technical: `The HospoGo Trinity Architecture consists of three integrated engines: The Vault (automated compliance), The Marketplace (talent matching), and The Engine (financial logistics with real-time Xero synchronization). Our platform features enterprise-grade security with AES-256-GCM encryption. For deeper technical discussions, our CTO would be happy to walk you through the architecture.`,
    
    market: `HospoGo targets a $168M TAM in Australian hospitality logistics. The "Suburban Loyalty" shift—with suburban venues seeing +18% foot traffic vs -12% for CBD—positions us perfectly to serve 72,000+ neighborhood operators currently underserved by enterprise-focused incumbents. Our Brisbane 100 pilot will prove product-market fit for national expansion.`,
    
    team: `HospoGo is led by Rick (CEO) with 15+ years of hospitality operations experience as a former multi-venue GM, and Lucas (COO) who brings financial operations expertise and deep Xero ecosystem knowledge. Our technical advisory includes senior enterprise SaaS architects and security specialists.`,
    
    product: `The HospoGo Trinity delivers end-to-end hospitality logistics: The Vault automates RSA/RCG compliance verification, The Marketplace provides instant shift matching with vetted professionals, and The Engine powers capacity-based scheduling with one-click Xero payroll export. Integration is our moat—competitors offer point solutions, we deliver complete logistics.`,
    
    competitive: `HospoGo differentiates from Deputy ($6+/seat, no compliance vault), Tanda (no marketplace, manual Xero CSV), and Square Shifts (POS lock-in, no hospitality compliance). Our Trinity Architecture creates switching costs that single-feature competitors cannot replicate, projecting 94% retention after 90-day activation.`,
    
    investment: `We're opening a $1M Seed Round at $10M post-money valuation, offering 10% equity via SAFE. Minimum check is $25,000. Use of funds: 60% Sales & Marketing ($600K), 30% Engineering ($300K), 10% Operations ($100K). The raise funds our Brisbane 100 pilot and positions us for Series A in Q4 2026.`,
    
    general: `HospoGo is Australia's first integrated Hospitality Logistics Engine, solving the workforce crisis for 94,000 neighborhood venues. We're raising $1M at $10M valuation to capture the Brisbane market and execute national expansion. What specific aspect would you like to explore—our market opportunity, technology, or investment terms?`,
  };
  
  return fallbacks[questionType];
}

/**
 * Check if the AI investor service is available
 */
export function isAIInvestorServiceAvailable(): boolean {
  return !!genAI;
}
