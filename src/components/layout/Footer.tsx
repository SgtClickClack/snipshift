import { Link } from 'react-router-dom';
import { PartnerTrustBar } from '@/components/landing/PartnerTrustBar';

const logoUrl = '/hospogo-navbar-banner.png';

export function Footer() {
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
                className="h-12 w-auto object-contain block antialiased drop-shadow-[0_0_10px_rgba(50,205,50,0.35)]"
                loading="eager"
                width={180}
                height={48}
                style={{
                  imageRendering: 'auto',
                  WebkitFontSmoothing: 'antialiased',
                }}
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

          {/* Legal Links */}
          <div>
            <h3 className="text-foreground dark:text-white font-semibold mb-4 text-sm uppercase tracking-wider">Legal</h3>
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
            </ul>
          </div>
        </div>

        {/* Integrated With - Trust ribbon */}
        <div className="mt-8 pt-8 border-t border-border dark:border-steel-800">
          <PartnerTrustBar variant="footer" className="pb-6" />
        </div>

        {/* Bottom Bar */}
        <div className="mt-0 pt-8 border-t border-border dark:border-steel-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground dark:text-steel-400">
              © {new Date().getFullYear()} HospoGo. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              <Link
                to="/investorportal"
                className="text-steel-400 hover:text-[#BAFF39] transition-colors text-sm">
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
    </footer>
  );
}

