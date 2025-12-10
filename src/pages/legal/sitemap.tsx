import { Link } from 'react-router-dom';
import { SEO } from '@/components/seo/SEO';
import { Card, CardContent } from '@/components/ui/card';

export default function SitemapPage() {
  return (
    <>
      <SEO
        title="Sitemap"
        description="SnipShift Sitemap - Find all pages and sections of our platform."
        url="/sitemap"
      />
      <div className="min-h-screen bg-gradient-to-br from-steel-50 to-steel-100 dark:from-steel-900 dark:to-steel-800 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="card-chrome">
            <CardContent className="p-8">
              <h1 className="text-3xl font-bold text-steel-900 dark:text-white mb-8">Sitemap</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Main Pages */}
                <div>
                  <h2 className="text-xl font-semibold text-steel-900 dark:text-white mb-4">Main Pages</h2>
                  <ul className="space-y-2">
                    <li>
                      <Link to="/" className="text-steel-600 dark:text-steel-300 hover:text-red-accent dark:hover:text-red-accent-light transition-colors">
                        Home
                      </Link>
                    </li>
                    <li>
                      <Link to="/login" className="text-steel-600 dark:text-steel-300 hover:text-red-accent dark:hover:text-red-accent-light transition-colors">
                        Login
                      </Link>
                    </li>
                    <li>
                      <Link to="/signup" className="text-steel-600 dark:text-steel-300 hover:text-red-accent dark:hover:text-red-accent-light transition-colors">
                        Sign Up
                      </Link>
                    </li>
                    <li>
                      <Link to="/jobs" className="text-steel-600 dark:text-steel-300 hover:text-red-accent dark:hover:text-red-accent-light transition-colors">
                        Find Shifts
                      </Link>
                    </li>
                    <li>
                      <Link to="/post-job" className="text-steel-600 dark:text-steel-300 hover:text-red-accent dark:hover:text-red-accent-light transition-colors">
                        Post a Job
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Company */}
                <div>
                  <h2 className="text-xl font-semibold text-steel-900 dark:text-white mb-4">Company</h2>
                  <ul className="space-y-2">
                    <li>
                      <Link to="/about" className="text-steel-600 dark:text-steel-300 hover:text-red-accent dark:hover:text-red-accent-light transition-colors">
                        About
                      </Link>
                    </li>
                    <li>
                      <a 
                        href="mailto:support@snipshift.com.au" 
                        className="text-steel-600 dark:text-steel-300 hover:text-red-accent dark:hover:text-red-accent-light transition-colors"
                      >
                        Contact
                      </a>
                    </li>
                  </ul>
                </div>

                {/* Legal */}
                <div>
                  <h2 className="text-xl font-semibold text-steel-900 dark:text-white mb-4">Legal</h2>
                  <ul className="space-y-2">
                    <li>
                      <Link to="/terms" className="text-steel-600 dark:text-steel-300 hover:text-red-accent dark:hover:text-red-accent-light transition-colors">
                        Terms of Service
                      </Link>
                    </li>
                    <li>
                      <Link to="/privacy" className="text-steel-600 dark:text-steel-300 hover:text-red-accent dark:hover:text-red-accent-light transition-colors">
                        Privacy Policy
                      </Link>
                    </li>
                    <li>
                      <Link to="/sitemap" className="text-steel-600 dark:text-steel-300 hover:text-red-accent dark:hover:text-red-accent-light transition-colors">
                        Sitemap
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Resources */}
                <div>
                  <h2 className="text-xl font-semibold text-steel-900 dark:text-white mb-4">Resources</h2>
                  <ul className="space-y-2">
                    <li>
                      <a 
                        href="/sitemap.xml" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-steel-600 dark:text-steel-300 hover:text-red-accent dark:hover:text-red-accent-light transition-colors"
                      >
                        XML Sitemap
                      </a>
                    </li>
                    <li>
                      <a 
                        href="https://twitter.com/snipshift" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-steel-600 dark:text-steel-300 hover:text-red-accent dark:hover:text-red-accent-light transition-colors"
                      >
                        Twitter
                      </a>
                    </li>
                    <li>
                      <a 
                        href="https://linkedin.com/company/snipshift" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-steel-600 dark:text-steel-300 hover:text-red-accent dark:hover:text-red-accent-light transition-colors"
                      >
                        LinkedIn
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

