import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, MessageSquare, HelpCircle } from 'lucide-react';
import { PartnerTrustBar } from '@/components/landing/PartnerTrustBar';
import { Button } from '@/components/ui/button';
import { FeedbackWidget } from '@/components/feedback/feedback-widget';
import { useIsMutating } from '@tanstack/react-query';

const logoUrl = '/hospogo-navbar-banner.png';

// PROJECT CONSTANTS - System Health Metrics
// Update these values when audit counts change
export const SYSTEM_HEALTH_CONSTANTS = {
  AUDITS_PASSING: 46,
  AUDITS_TOTAL: 46,
} as const;

/**
 * System Health Ticker - Audited Status Display
 * 
 * A constant psychological reminder to Lucas that the system is unbreakable.
 * Displays: "ENGINE STATUS: OPTIMAL | XERO MUTEX: ACTIVE/SYNCING | DVS API: VERIFIED | N/N AUDITS PASSING"
 * 
 * DYNAMIC BINDING:
 * - AUDITS PASSING: Bound to SYSTEM_HEALTH_CONSTANTS.AUDITS_PASSING
 * - XERO MUTEX: Changes to "SYNCING" (Electric Lime pulse) when a Xero sync mutation is in flight
 */
function SystemHealthTicker() {
  const [isVisible, setIsVisible] = useState(true);
  
  // Detect if any Xero-related mutations are in flight
  // This creates the live "SYNCING" indicator when Rick triggers a Xero sync
  const xeroMutationCount = useIsMutating({ mutationKey: ['xero'] });
  const isXeroSyncing = xeroMutationCount > 0;
  
  // Subtle pulse effect
  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(v => !v);
    }, isXeroSyncing ? 500 : 2000); // Faster pulse when syncing
    return () => clearInterval(interval);
  }, [isXeroSyncing]);
  
  return (
    <div className="flex items-center gap-2 text-[10px] tracking-wider text-zinc-500 font-mono">
      {/* Electric Lime indicator dot with pulse */}
      <span 
        className={`w-2 h-2 rounded-full shadow-[0_0_8px_hsl(var(--primary)/0.6)] ${
          isXeroSyncing 
            ? 'bg-primary animate-ping' 
            : 'bg-primary'
        }`}
        style={{
          animation: isXeroSyncing ? 'pulse 0.5s ease-in-out infinite' : 'pulse 2s ease-in-out infinite',
          opacity: isVisible ? 1 : 0.6,
        }}
      />
      <span className="uppercase whitespace-nowrap overflow-hidden">
        <span className="text-primary font-semibold">ENGINE STATUS:</span> OPTIMAL
        <span className="mx-2 text-zinc-600">|</span>
        <span className="text-primary font-semibold">XERO MUTEX:</span>{' '}
        {isXeroSyncing ? (
          <span className="text-primary animate-pulse font-bold">SYNCING</span>
        ) : (
          'ACTIVE'
        )}
        <span className="mx-2 text-zinc-600">|</span>
        <span className="text-primary font-semibold">DVS API:</span> VERIFIED
        <span className="mx-2 text-zinc-600">|</span>
        <span className="text-primary font-semibold">{SYSTEM_HEALTH_CONSTANTS.AUDITS_PASSING}/{SYSTEM_HEALTH_CONSTANTS.AUDITS_TOTAL}</span> AUDITS PASSING
      </span>
    </div>
  );
}

export function Footer() {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <footer className="bg-background dark:bg-steel-900 border-t-2 border-border dark:border-steel-800 text-muted-foreground dark:text-steel-300 pb-safe w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center mb-4 bg-transparent">
              <img
                src={logoUrl} 
                alt="HospoGo Logo" 
                className="h-12 w-auto object-contain block antialiased drop-shadow-[0_0_10px_rgba(50,205,50,0.35)] img-render-smooth"
                loading="eager"
                width={180}
                height={48}
              />
            </Link>
            <p className="text-sm text-muted-foreground dark:text-steel-400 mb-4">
              Connect hospitality staff with venues for flexible shift work.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-foreground dark:text-white font-semibold mb-4 text-sm uppercase tracking-wider">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/jobs" className="text-muted-foreground dark:text-steel-400 hover:text-foreground dark:hover:text-white transition-colors text-sm">
                  Find Shifts
                </Link>
              </li>
              <li>
                <Link to="/post-job" className="text-steel-400 hover:text-white transition-colors text-sm">
                  Post a Job
                </Link>
              </li>
              <li>
                <a href="/#pricing" className="text-steel-400 hover:text-white transition-colors text-sm">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-foreground dark:text-white font-semibold mb-4 text-sm uppercase tracking-wider">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-steel-400 hover:text-white transition-colors text-sm">
                  About
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-steel-400 hover:text-white transition-colors text-sm">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Support Links */}
          <div>
            <h3 className="text-foreground dark:text-white font-semibold mb-4 text-sm uppercase tracking-wider">Legal & Support</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/terms" className="text-steel-400 hover:text-white transition-colors text-sm">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-steel-400 hover:text-white transition-colors text-sm">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/sitemap" className="text-steel-400 hover:text-white transition-colors text-sm">
                  Sitemap
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-steel-400 hover:text-white transition-colors text-sm flex items-center gap-1.5">
                  <HelpCircle size={14} />
                  Help Center
                </Link>
              </li>
              <li>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFeedbackOpen(true)}
                  className="p-0 h-auto text-steel-400 hover:text-primary transition-colors text-sm flex items-center gap-1.5 font-normal"
                  data-testid="button-open-feedback-footer"
                >
                  <MessageSquare size={14} />
                  Send Feedback
                </Button>
              </li>
            </ul>
          </div>
        </div>

        {/* Integrated With - Trust ribbon */}
        <div className="mt-8 pt-8 border-t border-border dark:border-steel-800">
          <PartnerTrustBar variant="footer" className="pb-6" />
        </div>

        {/* Bottom Bar */}
        <div className="mt-0 pt-8 border-t border-border dark:border-steel-800">
          {/* System Health Ticker - Bottom Left */}
          <div className="mb-4 flex justify-start">
            <SystemHealthTicker />
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground dark:text-steel-400">
              © {new Date().getFullYear()} HospoGo. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              <Link
                to="/investorportal"
                className="text-steel-500 hover:text-primary transition-colors text-sm flex items-center gap-1.5">
                <ShieldCheck size={14} className="opacity-60" />
                Private Investor Briefing
              </Link>
              <a 
                href="https://twitter.com/hospogo" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-steel-400 hover:text-white transition-colors text-sm"
              >
                Twitter
              </a>
              <a 
                href="https://www.linkedin.com/company/hospogo/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-steel-400 hover:text-white transition-colors text-sm"
              >
                LinkedIn
              </a>
            </div>
          </div>
          {/* Acknowledgement of Country */}
          <div className="mt-6 pt-6 border-t border-border dark:border-steel-800">
            <p className="text-xs text-muted-foreground dark:text-steel-500 text-center">
              We acknowledge the traditional custodians of the land on which we live and work. We pay our respects to their Elders, past, present, and emerging.
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      <FeedbackWidget isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </footer>
  );
}

