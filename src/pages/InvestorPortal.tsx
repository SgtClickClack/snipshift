import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  CheckCircle,
  Shield,
  Users,
  Cog,
  Plus,
  FlaskConical,
  Lock,
  Zap,
  Layers,
  Code,
  PieChart,
  Linkedin,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';

const logoUrl = '/hospogo-navbar-banner.png';

/** Glass card with HospoGo branding - matches investor_portal.html glassmorphism */
const glassCard =
  'bg-[rgba(26,26,26,0.6)] backdrop-blur-[12px] border border-[rgba(222,255,154,0.1)] transition-all duration-300 ease-out hover:border-[rgba(222,255,154,0.4)] hover:-translate-y-1';

export default function InvestorPortal() {
  const { toast } = useToast();
  const [rsvpConfirmed, setRsvpConfirmed] = useState(false);

  const handleConfirmAttendance = () => {
    setRsvpConfirmed(true);
    toast({
      title: 'Request Sent',
      description: 'Our team will finalize your access shortly.',
      variant: 'success',
    });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0a0a] text-[#f5f5f5] font-['Urbanist',sans-serif]">
      <Helmet>
        <title>HospoGo | Private Investor Briefing</title>
        <meta name="description" content="Private investor briefing for HospoGo - The Future of Hospitality Logistics" />
      </Helmet>

      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center ${glassCard} border-t-0 border-x-0 rounded-b-2xl`}
      >
        <Link to="/" className="flex items-center gap-2">
          <img
            src={logoUrl}
            alt="HospoGo"
            className="h-10 md:h-12 w-auto object-contain"
            width={180}
            height={48}
          />
        </Link>
        <div className="hidden md:flex gap-8 text-sm font-semibold tracking-wider uppercase">
          <a href="#opportunity" className="hover:text-[#deff9a] transition-colors">
            Opportunity
          </a>
          <a href="#trinity" className="hover:text-[#deff9a] transition-colors">
            The Trinity
          </a>
          <a href="#technical" className="hover:text-[#deff9a] transition-colors">
            Technical Audit
          </a>
          <a href="#investment" className="hover:text-[#deff9a] transition-colors">
            The Ask
          </a>
        </div>
        <a
          href="#event"
          className="bg-[#deff9a] text-black px-6 py-2 rounded-full font-bold text-sm hover:opacity-90 transition-opacity"
        >
          RSVP BRIEFING
        </a>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col justify-center items-center px-6 relative pt-20 bg-[radial-gradient(circle_at_center,rgba(222,255,154,0.08)_0%,transparent_70%)]">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#deff9a] opacity-5 rounded-full blur-[120px]" />
        <div className="text-center max-w-4xl">
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-bold mb-6 tracking-tight leading-tight">
            The Future of <br />
            <span className="text-[#deff9a] [text-shadow:0_0_20px_rgba(222,255,154,0.4)]">
              Hospitality Logistics
            </span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Solving the labor crisis for 94,000 Australian venues through an integrated, audited, and
            enterprise-ready SaaS ecosystem.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div className={`${glassCard} px-6 sm:px-8 py-4 rounded-2xl flex items-center gap-3`}>
              <span className="text-2xl sm:text-3xl font-bold text-[#deff9a]">$168M</span>
              <span className="text-xs text-gray-400 text-left uppercase font-bold tracking-widest leading-tight">
                Australian
                <br />
                TAM
              </span>
            </div>
            <div className={`${glassCard} px-6 sm:px-8 py-4 rounded-2xl flex items-center gap-3`}>
              <span className="text-2xl sm:text-3xl font-bold text-[#deff9a]">630+</span>
              <span className="text-xs text-gray-400 text-left uppercase font-bold tracking-widest leading-tight">
                Audited R&D
                <br />
                Hours
              </span>
            </div>
            <div className={`${glassCard} px-6 sm:px-8 py-4 rounded-2xl flex items-center gap-3`}>
              <span className="text-2xl sm:text-3xl font-bold text-[#deff9a]">100%</span>
              <span className="text-xs text-gray-400 text-left uppercase font-bold tracking-widest leading-tight">
                E2E Test
                <br />
                Stability
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Opportunity Section */}
      <section id="opportunity" className="py-16 md:py-24 px-6 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 md:mb-8">
              The <span className="text-[#deff9a]">Suburban</span> Shift
            </h2>
            <p className="text-base md:text-lg text-gray-400 mb-4 md:mb-6 leading-relaxed">
              Data from 2024-2025 shows a profound structural evolution. Suburban venues currently
              exhibit <strong className="text-gray-300">4.6% higher loyalty rates</strong> than CBD
              counterparts.
            </p>
            <p className="text-base md:text-lg text-gray-400 mb-6 md:mb-8 leading-relaxed">
              As neighborhood venues become daily community hubs, they require professional-grade
              tools to manage rising labor costs (up for 88% of operators) and complex compliance
              mandates.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <CheckCircle className="text-[#deff9a] mt-1 h-5 w-5 flex-shrink-0" />
                <div className="text-gray-300">
                  <span className="font-bold text-white">Market Mandate:</span> 80% of venues plan a
                  tech upgrade in 2025/26.
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="text-[#deff9a] mt-1 h-5 w-5 flex-shrink-0" />
                <div className="text-gray-300">
                  <span className="font-bold text-white">Efficiency Dividend:</span> 85% reduction in
                  roster-to-payroll admin time.
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className={`${glassCard} p-4 sm:p-6 rounded-3xl text-center`}>
              <h4 className="text-[#deff9a] text-2xl sm:text-3xl font-bold mb-2">6,141</h4>
              <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">
                Brisbane LGA Venues
              </p>
            </div>
            <div className={`${glassCard} p-4 sm:p-6 rounded-3xl text-center`}>
              <h4 className="text-[#deff9a] text-2xl sm:text-3xl font-bold mb-2">3,231</h4>
              <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">
                Gold Coast Venues
              </p>
            </div>
            <div className={`${glassCard} p-4 sm:p-6 rounded-3xl text-center`}>
              <h4 className="text-[#deff9a] text-2xl sm:text-3xl font-bold mb-2">$10M</h4>
              <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">
                Post-Money Val.
              </p>
            </div>
            <div className={`${glassCard} p-4 sm:p-6 rounded-3xl text-center`}>
              <h4 className="text-[#deff9a] text-2xl sm:text-3xl font-bold mb-2">10%</h4>
              <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">
                Equity Offered
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Trinity Section */}
      <section id="trinity" className="py-16 md:py-24 px-6 bg-[#111111]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              The HospoGo <span className="text-[#deff9a]">Trinity</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              One integrated ecosystem to eliminate administrative paralysis.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            <div
              className={`${glassCard} p-8 md:p-10 rounded-[40px] relative overflow-hidden group`}
            >
              <div className="mb-6 md:mb-8 w-14 h-14 md:w-16 md:h-16 bg-[#deff9a]/10 rounded-2xl flex items-center justify-center text-[#deff9a] text-2xl md:text-3xl group-hover:bg-[#deff9a] group-hover:text-black transition duration-500">
                <Shield className="h-8 w-8" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">The Vault</h3>
              <p className="text-gray-400 leading-relaxed mb-4 md:mb-6 text-sm md:text-base">
                Digital, auto-verifying identity layer for RSA, licensing, and certifications.
                API-driven verification ensures 100% compliance.
              </p>
              <ul className="text-sm text-gray-500 space-y-2">
                <li className="flex items-center gap-2">
                  <Plus className="text-[#deff9a] h-4 w-4 flex-shrink-0" /> Auto-expiry alerts
                </li>
                <li className="flex items-center gap-2">
                  <Plus className="text-[#deff9a] h-4 w-4 flex-shrink-0" /> RSA/Licensing API Sync
                </li>
              </ul>
            </div>
            <div
              className={`${glassCard} p-8 md:p-10 rounded-[40px] relative overflow-hidden group`}
            >
              <div className="mb-6 md:mb-8 w-14 h-14 md:w-16 md:h-16 bg-[#deff9a]/10 rounded-2xl flex items-center justify-center text-[#deff9a] text-2xl md:text-3xl group-hover:bg-[#deff9a] group-hover:text-black transition duration-500">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">The Marketplace</h3>
              <p className="text-gray-400 leading-relaxed mb-4 md:mb-6 text-sm md:text-base">
                Hyper-local network of vetted, compliant staff. Fill gap shifts in under 60 seconds
                with pre-verified talent.
              </p>
              <ul className="text-sm text-gray-500 space-y-2">
                <li className="flex items-center gap-2">
                  <Plus className="text-[#deff9a] h-4 w-4 flex-shrink-0" /> Vetted Skill Profiles
                </li>
                <li className="flex items-center gap-2">
                  <Plus className="text-[#deff9a] h-4 w-4 flex-shrink-0" /> Instant Shift Matching
                </li>
              </ul>
            </div>
            <div
              className={`${glassCard} p-8 md:p-10 rounded-[40px] relative overflow-hidden group`}
            >
              <div className="mb-6 md:mb-8 w-14 h-14 md:w-16 md:h-16 bg-[#deff9a]/10 rounded-2xl flex items-center justify-center text-[#deff9a] text-2xl md:text-3xl group-hover:bg-[#deff9a] group-hover:text-black transition duration-500">
                <Cog className="h-8 w-8" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">The Engine</h3>
              <p className="text-gray-400 leading-relaxed mb-4 md:mb-6 text-sm md:text-base">
                Financial-first roster builder with Live Costing and one-click Xero Sync. Plan for
                profit, not just attendance.
              </p>
              <ul className="text-sm text-gray-500 space-y-2">
                <li className="flex items-center gap-2">
                  <Plus className="text-[#deff9a] h-4 w-4 flex-shrink-0" /> Auto-Fill Logic
                </li>
                <li className="flex items-center gap-2">
                  <Plus className="text-[#deff9a] h-4 w-4 flex-shrink-0" /> One-Click Xero Export
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Audit Section */}
      <section id="technical" className="py-16 md:py-24 px-6 max-w-7xl mx-auto">
        <div className={`${glassCard} rounded-[50px] p-8 sm:p-12 md:p-20 relative overflow-hidden`}>
          <div className="absolute top-0 right-0 p-6 md:p-8 opacity-10 text-7xl md:text-9xl">
            <Code className="h-24 w-24 md:h-36 md:w-36" />
          </div>
          <div className="max-w-3xl relative">
            <span className="bg-[#deff9a] text-black px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 inline-block">
              Technical Audit
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 md:mb-8">
              Audited <span className="text-[#deff9a]">Integrity</span>
            </h2>
            <p className="text-lg md:text-xl text-gray-400 mb-8 md:mb-10 leading-relaxed">
              Unlike &quot;conceptual&quot; startups, HospoGo is a verified technical asset. Our
              engineering stack is built for stability and national scaling.
            </p>
            <div className="grid sm:grid-cols-2 gap-6 md:gap-8">
              <div className="flex gap-4">
                <div className="text-[#deff9a] text-2xl mt-1">
                  <FlaskConical className="h-6 w-6" />
                </div>
                <div>
                  <h5 className="font-bold mb-1">Pass Rate: 100%</h5>
                  <p className="text-sm text-gray-500">
                    Playwright E2E suite audits every financial pipeline daily.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-[#deff9a] text-2xl mt-1">
                  <Lock className="h-6 w-6" />
                </div>
                <div>
                  <h5 className="font-bold mb-1">AES-256 Security</h5>
                  <p className="text-sm text-gray-500">
                    Enterprise-grade encryption for Xero OAuth tokens and PII.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-[#deff9a] text-2xl mt-1">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <h5 className="font-bold mb-1">Phase 4 R&D Complete</h5>
                  <p className="text-sm text-gray-500">
                    The Live Financial Engine is built, tested, and ready for deployment.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-[#deff9a] text-2xl mt-1">
                  <Layers className="h-6 w-6" />
                </div>
                <div>
                  <h5 className="font-bold mb-1">Stateless Architecture</h5>
                  <p className="text-sm text-gray-500">
                    Designed for rapid horizontal scaling across interstate markets.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Investment Section */}
      <section id="investment" className="py-16 md:py-24 px-6 bg-[#deff9a] text-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 md:mb-8 tracking-tighter">
                The <span className="text-black underline decoration-black/20">Seed</span> Round
              </h2>
              <p className="text-lg md:text-xl font-medium mb-8 md:mb-10 leading-relaxed text-black/80">
                We are opening a $1,000,000 raise to capture the Brisbane and Gold Coast pilot markets
                and finalize national expansion.
              </p>
              <div className="space-y-6">
                <div className="border-b border-black/20 pb-4 flex justify-between items-end">
                  <span className="font-bold text-[10px] uppercase tracking-widest text-black/60">
                    Equity Offered
                  </span>
                  <span className="text-3xl md:text-4xl font-black">10%</span>
                </div>
                <div className="border-b border-black/20 pb-4 flex justify-between items-end">
                  <span className="font-bold text-[10px] uppercase tracking-widest text-black/60">
                    Post-Money Valuation
                  </span>
                  <span className="text-3xl md:text-4xl font-black">$10.0M</span>
                </div>
                <div className="border-b border-black/20 pb-4 flex justify-between items-end">
                  <span className="font-bold text-[10px] uppercase tracking-widest text-black/60">
                    Runway
                  </span>
                  <span className="text-3xl md:text-4xl font-black">18 MO.</span>
                </div>
              </div>
            </div>
            <div className="bg-black text-white p-8 md:p-12 rounded-[50px] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 text-6xl md:text-8xl">
                <PieChart className="h-20 w-20 md:h-32 md:w-32" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-[#deff9a]">
                Use of Funds
              </h3>
              <div className="space-y-6 md:space-y-8">
                <div>
                  <div className="flex justify-between mb-2 font-bold uppercase tracking-widest text-[10px]">
                    <span>Sales & Marketing</span>
                    <span>40%</span>
                  </div>
                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#deff9a] h-full w-[40%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2 font-bold uppercase tracking-widest text-[10px]">
                    <span>Engineering & R&D</span>
                    <span>35%</span>
                  </div>
                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#deff9a] h-full w-[35%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2 font-bold uppercase tracking-widest text-[10px]">
                    <span>Operations & Legal</span>
                    <span>25%</span>
                  </div>
                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#deff9a] h-full w-[25%]" />
                  </div>
                </div>
              </div>
              <p className="mt-8 md:mt-12 text-gray-500 text-xs leading-relaxed">
                Our 60/30/10 structure ensures founder-led technical integrity while empowering a
                performance-vested executive team.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Event/RSVP Section */}
      <section id="event" className="py-16 md:py-24 px-6 text-center max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 md:mb-6 italic">
          Secure Your Briefing
        </h2>
        <p className="text-lg md:text-xl text-gray-400 mb-8 md:mb-12">
          Join Julian (CTO), Rick (CEO), and the HospoGo team for a technical deep-dive and
          operational scaling presentation in Brisbane City.
        </p>
        <div className={`${glassCard} p-8 md:p-10 rounded-[40px] mb-8 md:mb-12 text-left`}>
          <div className="grid md:grid-cols-2 gap-8 md:gap-10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#deff9a] mb-2">
                Location
              </p>
              <p className="text-base md:text-lg font-bold">The Conference Room</p>
              <p className="text-gray-500">Brisbane City, QLD</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#deff9a] mb-2">
                Live Demo
              </p>
              <p className="text-base md:text-lg font-bold">Trinity Engine & Xero Sync</p>
              <p className="text-gray-500">Corporate Technical Briefing</p>
            </div>
          </div>
        </div>
        <Button
          onClick={handleConfirmAttendance}
          disabled={rsvpConfirmed}
          className="bg-white text-black px-10 md:px-12 py-4 md:py-5 rounded-full font-black text-base md:text-lg hover:bg-[#deff9a] transition duration-500 shadow-xl disabled:opacity-80"
        >
          CONFIRM ATTENDANCE
        </Button>
        {rsvpConfirmed && (
          <p className="mt-6 text-[#deff9a] font-bold animate-pulse">
            Request Sent. Our team will finalize your access shortly.
          </p>
        )}
      </section>

      {/* Footer */}
      <footer className="py-8 md:py-12 px-6 border-t border-white/5 text-center text-gray-600">
        <p className="text-[10px] font-bold tracking-[0.3em] uppercase mb-4">
          &copy; 2026 HospoGo Pty Ltd | Private & Confidential
        </p>
        <div className="flex justify-center gap-6">
          <a
            href="https://www.linkedin.com/company/hospogo"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#deff9a] transition-colors"
            aria-label="LinkedIn"
          >
            <Linkedin className="h-5 w-5" />
          </a>
          <a
            href="https://x.com/hospogo"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#deff9a] transition-colors"
            aria-label="X (Twitter)"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a
            href="mailto:info@hospogo.com"
            className="hover:text-[#deff9a] transition-colors"
            aria-label="Email"
          >
            <Mail className="h-5 w-5" />
          </a>
        </div>
      </footer>
    </div>
  );
}
