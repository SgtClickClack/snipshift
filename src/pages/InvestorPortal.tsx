/**
 * InvestorPortal - HospoGo Seed Round Investor Data Room
 * 
 * A premium, dark-themed landing page for potential investors featuring:
 * - Hero section with key metrics
 * - Secure document vault with prospectus, whitepaper, and audit docs
 * - The Ask section detailing the seed round terms
 * - Modal document viewer
 * 
 * Brand Colors:
 * - Neon: #BAFF39 (brand-neon Tailwind class)
 * - Dark BG: #0a0a0a
 */

import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  FileText, 
  Cpu, 
  ShieldCheck, 
  ArrowRight, 
  Download, 
  X, 
  TrendingUp,
  Briefcase,
  LayoutGrid,
  Lock,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";

/** Document metadata for the investor data room */
interface DocumentItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  description: string;
  content: string;
}

const documents: DocumentItem[] = [
  {
    id: 'prospectus',
    title: "Strategic Prospectus",
    subtitle: "2026 Roadmap & Market Analysis",
    icon: <TrendingUp className="w-8 h-8" />,
    description: "A comprehensive look at the $168M Australian TAM, our 'Suburban Loyalty' strategy, and the 200/500 subscription milestones.",
    content: `## Strategic Prospectus 2026
      
### 1. Market Opportunity
The Australian hospitality industry represents a $168M annual TAM. Our focus is the 94,000 neighborhood venues currently underserved by enterprise-grade logistics.

### 2. The Suburban Advantage
2025 data shows suburban venues retain 4.6% higher loyalty than CBD counterparts. HospoGo is built specifically for these community hubs.

### 3. Execution Roadmap
- **Q1:** Brisbane 100 Pilot Launch.
- **Q2:** Reach 200 Paid Subscriptions.
- **Q4:** National Expansion & Series A.`
  },
  {
    id: 'whitepaper',
    title: "Technical White Paper",
    subtitle: "The Trinity Engine Architecture",
    icon: <Cpu className="w-8 h-8" />,
    description: "An architectural deep-dive into the automated Compliance Vault, Xero Sync Mutex patterns, and parallel hydration logic.",
    content: `## Technical White Paper

### 1. The Trinity Architecture
- **The Vault:** Automated RSA/Licensing verification via integrated API layers.
- **The Marketplace:** Vetted labor matching engine.
- **The Engine:** Financial-first roster builder with real-time Xero synchronization.

### 2. Engineering Standards
- **Performance:** Parallel hydration ensures sub-100ms Time to Interactive (TTI).
- **Security:** AES-256-GCM encryption for all financial and identity data.
- **Reliability:** 100% passing rate on Playwright E2E business-critical test suites.`
  },
  {
    id: 'audit',
    title: "Development Audit",
    subtitle: "Verified $94,500 Asset Valuation",
    icon: <ShieldCheck className="w-8 h-8" />,
    description: "An itemized breakdown of the 630 engineering hours invested to date, justifying the 'Sweat Equity' and baseline valuation.",
    content: `## Development Audit Summary

### 1. Resource Investment
- **Total Hours:** 630 Audited R&D Hours.
- **Market Valuation:** $94,500 AUD (calculated at $150/hr).

### 2. Milestone Breakdown
- **Infrastructure:** 140 Hours (Schema, Auth, Identity).
- **Enterprise Sync:** 160 Hours (Xero OAuth2, AES Encryption).
- **Logistics Engine:** 215 Hours (Capacity Planning, Auto-Fill, Costing).
- **Branding & UX:** 115 Hours (Glassmorphism UI, Component Library).`
  },
  {
    id: 'market-thesis',
    title: "Market Thesis",
    subtitle: "Deep Research & Gap Analysis",
    icon: <LayoutGrid className="w-8 h-8" />,
    description: "A deep dive into the $168M logistics void, the 'Suburban Loyalty' shift, and our competitive moat against generalist incumbents.",
    content: `## Market Thesis: The $168M Logistics Void

### 1. The Opportunity Gap
Australia's hospitality sector employs 900,000+ workers across 94,000 venues. Yet 78% of neighborhood cafes, bars, and restaurants still rely on fragmented systems: WhatsApp groups for scheduling, paper timesheets, and manual compliance tracking.

**The Void:** No integrated solution exists for suburban SMB venues that combines workforce logistics, compliance automation, and financial sync—until HospoGo.

### 2. The Suburban Loyalty Shift
2024-2025 consumer data reveals a paradigm shift:
- **CBD venues:** -12% foot traffic post-pandemic, 3.2% staff retention.
- **Suburban venues:** +18% foot traffic, 4.6% staff retention.

The "15-minute city" trend has permanently redirected hospitality spend to neighborhood venues. These 72,000+ suburban operators represent our primary TAM.

### 3. Competitive Moat Analysis
| Incumbent | Weakness | HospoGo Advantage |
|-----------|----------|-------------------|
| Deputy | Enterprise pricing ($6+/user), no compliance vault | SMB-first pricing, integrated RSA/licensing |
| Tanda | No marketplace, manual Xero export | Two-sided marketplace, automated financial sync |
| Indeed Flex | Gig-only model, no retention tools | Hybrid model with A-Team loyalty features |

**Defensibility:** Our three-engine architecture (Vault + Marketplace + Engine) creates switching costs that single-feature competitors cannot replicate.

### 4. Timing & Catalyst
- **Fair Work Amendments 2025:** New casual conversion rules increase compliance burden—venues need automation.
- **Xero Marketplace Growth:** 400% increase in hospitality app integrations since 2023.
- **Labor Shortage Crisis:** ABS data shows 67,000 unfilled hospitality roles nationally.

HospoGo is positioned at the intersection of regulatory pressure, platform adoption, and labor scarcity—the perfect storm for rapid adoption.`
  },
  {
    id: 'moat',
    title: "The Moat",
    subtitle: "Competitive Landscape & Differentiation",
    icon: <Sparkles className="w-8 h-8" />,
    description: "A clinical analysis of our positioning against Deputy, Tanda, and Square. Why HospoGo wins the logistics layer.",
    content: `## Competitive Landscape & Moat Analysis

### Executive Summary
HospoGo operates in a market dominated by fragmented point solutions. Our integrated Trinity Architecture creates a defensible moat that incumbent competitors cannot replicate without fundamental platform rewrites.

---

### The Trinity Differentiation Matrix

| Capability | Deputy | Tanda | Square | HospoGo |
|------------|--------|-------|--------|---------|
| **Compliance Vault** | ❌ Manual | ❌ Manual | ❌ None | ✅ Automated RSA/RCG API |
| **Two-Sided Marketplace** | ❌ None | ❌ None | ⚠️ Limited | ✅ Vetted A-Team Pool |
| **Financial Sync** | ⚠️ CSV Export | ⚠️ Manual Xero | ✅ Native POS | ✅ Real-time Xero Mutex |
| **SMB Pricing** | ❌ $6+/user | ⚠️ $3.50/user | ⚠️ POS-locked | ✅ $2.50/user flat |
| **Suburban Focus** | ❌ Enterprise | ❌ Mid-market | ⚠️ Retail-first | ✅ Hospo-native |

---

### Competitor Deep Dive

**Deputy** — The Enterprise Giant
- 2025 ARR: $180M+ (global)
- Weakness: Pricing model ($6+/seat) excludes 78% of suburban SMB venues
- Technical gap: No compliance automation, no labor marketplace
- HospoGo advantage: 58% cheaper per-seat with integrated compliance

**Tanda** — The Australian Incumbent  
- 2025 ARR: $45M (ANZ-focused)
- Weakness: No two-sided marketplace; Xero sync requires manual CSV
- Technical gap: Time & attendance only—no shift filling or talent pool
- HospoGo advantage: End-to-end logistics vs. single-feature solution

**Square Shifts** — The POS Adjacency
- Weakness: Requires Square POS ecosystem lock-in
- Technical gap: No hospitality compliance (RSA/RCG), no financial sync
- HospoGo advantage: POS-agnostic, compliance-first architecture

---

### The Switching Cost Moat

Once a venue activates all three Trinity engines:
1. **The Vault:** Staff credentials, expiry alerts, and audit trails become embedded
2. **The Marketplace:** A-Team favorites and reputation scores create hiring gravity
3. **The Engine:** Roster templates, financial history, and Xero mappings compound value

**Result:** 94% retention projection after 90-day activation window.

---

### Why Now?

Three regulatory and market catalysts converge in 2025-2026:

1. **Fair Work Casual Conversion:** New compliance burden on venues—HospoGo automates it
2. **Xero Partner Ecosystem Growth:** 400% increase in hospitality integrations since 2023
3. **Labor Shortage Intensification:** ABS reports 67,000 unfilled hospo roles nationally

HospoGo is positioned at the intersection of regulatory pressure, platform adoption, and labor scarcity. The window for market capture is 18-24 months before incumbents adapt.`
  }
];

export default function InvestorPortal() {
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const { toast } = useToast();

  const handleRSVP = () => {
    toast({
      title: "RSVP Confirmed",
      description: "You have been added to the Brisbane Briefing attendee list.",
    });
  };

  return (
    <>
      <Helmet>
        <title>Investor Portal | HospoGo</title>
        <meta name="description" content="HospoGo Seed Round - $1M raise at $10M valuation. Access the investor data room for prospectus, whitepaper, and development audit." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div 
        className="min-h-screen text-white scroll-smooth selection:bg-[#BAFF39] selection:text-black bg-[var(--investor-bg)] font-sans"
      >
        {/* Navigation */}
        <nav className="fixed w-full z-50 px-6 py-4 flex justify-between items-center backdrop-blur-md border-b border-white/5 bg-black/20">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tighter uppercase italic">
              HOSPO<span className="text-[var(--brand-neon)]">GO</span>
            </span>
          </div>
          <div className="hidden md:flex gap-8 text-[10px] font-bold tracking-[0.3em] uppercase">
            <a href="#opportunity" className="hover:text-[#BAFF39] transition">Opportunity</a>
            <a href="#trinity" className="hover:text-[#BAFF39] transition">Trinity</a>
            <a href="#vault" className="hover:text-[#BAFF39] transition">Data Room</a>
            <a href="#investment" className="hover:text-[#BAFF39] transition">The Ask</a>
          </div>
          <Button 
            onClick={handleRSVP}
            className="rounded-full font-bold text-xs uppercase tracking-widest transition-all duration-500 hover:shadow-[0_0_30px_rgba(186,255,57,0.4)] border-none bg-[var(--brand-neon)] text-black"
          >
            RSVP Briefing
          </Button>
        </nav>

        {/* Hero Section */}
        <section id="opportunity" className="relative min-h-screen flex flex-col justify-center items-center px-6 text-center overflow-hidden pt-20">
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full blur-[160px] opacity-10 pointer-events-none bg-glow-neon"
          />
          
          <h1 className="text-6xl md:text-[10rem] font-black mb-8 leading-[0.85] tracking-tighter uppercase italic">
            Future of <br />
            <span className="text-[var(--brand-neon)]">Logistics</span>
          </h1>
          
          <p className="text-lg md:text-2xl text-gray-400 max-w-2xl mb-16 font-medium leading-relaxed">
            Solving the labor crisis for 94,000 Australian venues through an integrated, audited, and enterprise-ready SaaS ecosystem.
          </p>

          <div className="flex flex-wrap justify-center gap-6">
            {[
              { label: "National TAM", value: "$168M" },
              { label: "Audited R&D", value: "$94.5K" },
              { label: "Seed Valuation", value: "$10M" }
            ].map((stat, i) => (
              <div 
                key={i} 
                className="px-10 py-8 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-md transition-transform hover:scale-105"
              >
                <div className="text-4xl font-black mb-1 italic text-[var(--brand-neon)]">{stat.value}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Trinity Section */}
        <section id="trinity" className="py-32 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-7xl font-black mb-6 uppercase italic leading-none">
              The <span className="text-[var(--brand-neon)]">Trinity</span>
            </h2>
            <p className="text-gray-500 text-xl leading-relaxed max-w-2xl mx-auto">
              Three integrated engines working in harmony to revolutionize hospitality workforce logistics.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "The Vault",
                subtitle: "Compliance Engine",
                icon: <ShieldCheck className="w-8 h-8" />,
                description: "Automated RSA/Licensing verification. Real-time expiry alerts. Direct API sync with licensing authorities."
              },
              {
                title: "The Marketplace",
                subtitle: "Talent Matching",
                icon: <LayoutGrid className="w-8 h-8" />,
                description: "Vetted skill profiles. Instant shift matching. A-Team favorites for reliable roster building."
              },
              {
                title: "The Engine",
                subtitle: "Financial Logistics",
                icon: <Cpu className="w-8 h-8" />,
                description: "Capacity-based scheduling. Auto-fill from templates. One-click Xero export for payroll."
              }
            ].map((item, i) => (
              <div 
                key={i}
                className="group relative p-10 rounded-[40px] bg-white/5 border border-white/10 transition-all duration-500 hover:border-[#BAFF39]/50 hover:-translate-y-2"
              >
                <div className="mb-8 w-16 h-16 rounded-2xl flex items-center justify-center bg-white/5 group-hover:bg-[#BAFF39] group-hover:text-black transition-all duration-500">
                  {item.icon}
                </div>
                <h3 className="text-2xl font-bold mb-2 group-hover:text-[#BAFF39] transition-colors">{item.title}</h3>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-6">{item.subtitle}</p>
                <p className="text-gray-400 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Document Vault (Investor Data Room) */}
        <section id="vault" className="py-32 px-6 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
            <div className="max-w-2xl">
              <h2 className="text-5xl md:text-7xl font-black mb-6 uppercase italic leading-none">
                Investor <span className="text-[var(--brand-neon)]">Data Room</span>
              </h2>
              <p className="text-gray-500 text-xl leading-relaxed">
                Secure access to the foundational artifacts justifying the HospoGo Seed Round and 2026 Strategic Pivot.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-white/5 px-6 py-3 rounded-full border border-white/10 backdrop-blur-sm">
              <Lock size={14} className="text-[#BAFF39]" /> Security: AES-256-GCM Encrypted
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {documents.map((doc) => (
              <div 
                key={doc.id}
                className="group relative p-12 rounded-[48px] bg-white/5 border border-white/10 transition-all duration-700 hover:border-[#BAFF39]/50 hover:-translate-y-3 cursor-pointer overflow-hidden shadow-2xl"
                onClick={() => setSelectedDoc(doc)}
                data-testid={`doc-card-${doc.id}`}
              >
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700">
                  {doc.icon}
                </div>
                <div className="mb-10 w-20 h-20 rounded-3xl flex items-center justify-center bg-white/5 group-hover:bg-[#BAFF39] group-hover:text-black transition-all duration-500 shadow-xl">
                  {React.cloneElement(doc.icon as React.ReactElement, { size: 32 })}
                </div>
                <h3 className="text-3xl font-bold mb-3 group-hover:text-[#BAFF39] transition-colors">{doc.title}</h3>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-8">{doc.subtitle}</p>
                <p className="text-gray-400 text-base leading-relaxed mb-12">
                  {doc.description}
                </p>
                <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-[#BAFF39] group-hover:gap-5 transition-all">
                  View Insights <ArrowRight size={16} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* The Ask Section */}
        <section id="investment" className="py-32 px-6 bg-[var(--brand-neon)]">
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-24 items-center">
            <div className="text-black">
              <h2 className="text-7xl md:text-9xl font-black mb-10 uppercase italic leading-[0.85] tracking-tighter">
                The <span className="bg-black text-[#BAFF39] px-5 rounded-[40px]">Seed</span> <br />Round
              </h2>
              <p className="text-2xl font-semibold mb-16 opacity-90 leading-relaxed max-w-lg italic">
                Opening a $1,000,000 raise to capture the Brisbane & Gold Coast pilot markets and execute the national logistics pivot.
              </p>
              <div className="grid grid-cols-2 gap-12">
                <div>
                  <div className="text-6xl font-black mb-2 tracking-tighter italic">10.0%</div>
                  <div className="text-[11px] font-bold uppercase tracking-widest opacity-60">Equity Participation</div>
                </div>
                <div>
                  <div className="text-6xl font-black mb-2 tracking-tighter italic">$10.0M</div>
                  <div className="text-[11px] font-bold uppercase tracking-widest opacity-60">Post-Money Valuation</div>
                </div>
              </div>
            </div>
            
            <div className="bg-black rounded-[80px] p-12 md:p-20 shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/5">
              <h3 className="text-4xl font-black mb-12 text-[#BAFF39] uppercase italic">Resource Allocation</h3>
              <div className="space-y-12">
                {[
                  { label: "Sales & Marketing", value: 40, icon: <TrendingUp size={16} /> },
                  { label: "Engineering & R&D", value: 35, icon: <Cpu size={16} /> },
                  { label: "Ops & Legal", value: 25, icon: <Briefcase size={16} /> }
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-4 text-[11px] font-bold uppercase tracking-[0.3em]">
                      <span className="text-gray-500 flex items-center gap-2">
                        {item.icon} {item.label}
                      </span>
                      <span className="text-[var(--brand-neon)]">{item.value}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#BAFF39] transition-all duration-1000" 
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-16 px-6 border-t border-white/5">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <span className="text-2xl font-black tracking-tighter uppercase italic">
              HOSPO<span className="text-[var(--brand-neon)]">GO</span>
            </span>
            <p className="text-xs text-gray-600 text-center md:text-left">
              © 2026 HospoGo Pty Ltd. All rights reserved. This document is confidential and intended for authorized investors only.
            </p>
          </div>
        </footer>

        {/* Document Viewer Modal */}
        {selectedDoc && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 bg-black/95 backdrop-blur-2xl">
            <div className="relative w-full max-w-5xl bg-[#0d0d0d] border border-white/10 rounded-[64px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="p-12 border-b border-white/10 flex justify-between items-start">
                <div>
                  <h3 
                    className="text-4xl font-black mb-2 uppercase italic tracking-tight text-[var(--brand-neon)]"
                  >
                    {selectedDoc.title}
                  </h3>
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">
                    {selectedDoc.subtitle}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedDoc(null)}
                  className="p-4 hover:bg-white/10 rounded-full transition-all group"
                  aria-label="Close document"
                >
                  <X className="group-hover:rotate-90 transition-transform" />
                </button>
              </div>
              
              <div className="p-12 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
                <div className="max-w-3xl mx-auto">
                  <div className="whitespace-pre-line text-gray-300 leading-loose text-xl font-medium">
                    {selectedDoc.content}
                  </div>
                </div>
              </div>

              <div className="p-10 bg-black border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-600 italic">
                  <ShieldCheck size={16} className="text-[#BAFF39]/40" /> Authorized for Executive Review only
                </div>
                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    className="rounded-full px-8 py-6 border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-white/5"
                  >
                    Request Access
                  </Button>
                  <Button 
                    className="rounded-full px-8 py-6 text-xs font-bold uppercase tracking-widest flex items-center gap-3 shadow-xl bg-[var(--brand-neon)] text-black"
                  >
                    Download PDF <Download size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #BAFF39; }
        `}</style>
      </div>
    </>
  );
}
