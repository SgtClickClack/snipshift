import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Store,
  UserCheck,
  Shield,
  CheckCircle2,
  CreditCard,
  UserPlus,
  FileText,
  Handshake,
  CheckCircle,
} from "lucide-react";
import Pricing from "@/components/landing/Pricing";
import FAQSection from "@/components/landing/FAQSection";
import { SEO } from "@/components/seo/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardRoute } from "@/lib/roles";
import { useEffect, useRef } from "react";

export default function LandingPage() {
  const { user, isAuthenticated, isAuthReady } = useAuth();
  const hasCleanedUp = useRef(false);

  // Clear stale auth-related localStorage/sessionStorage data on landing page load
  // This prevents race conditions from old redirects or onboarding states
  useEffect(() => {
    // Only run once and only for unauthenticated users
    if (hasCleanedUp.current) return;
    if (!isAuthReady) return;

    if (!isAuthenticated) {
      hasCleanedUp.current = true;
      // Clear stale redirect/onboarding data that could cause race conditions
      try {
        localStorage.removeItem("onboarding_step");
        localStorage.removeItem("redirect_url");
        localStorage.removeItem("pending_redirect");
        sessionStorage.removeItem("signupRolePreference");
        sessionStorage.removeItem("oauth_state");
      } catch {
        // Ignore storage errors (e.g., private browsing mode)
      }
    }
  }, [isAuthenticated, isAuthReady]);

  // NOTE: Removed auto-redirect for authenticated users.
  // The landing page should always be viewable - authenticated users see
  // "Go to Dashboard" button instead of being forcibly redirected.

  return (
    <>
      <SEO
        // Use the shared SEO defaults for title/description and only override social title.
        socialTitle="HospoGo | On-Demand Hospitality Staff"
        ogDescription="Brisbane's fastest way to find qualified hospitality professionals."
        url="/"
      />
      <h1 className="sr-only">HospoGo: Hospitality Shifts for Staff and Venues</h1>
      <div className="min-h-screen">
        {/* Hero Section - Grid Split Layout */}
        <section className="relative isolate w-full min-h-[100vh] text-foreground overflow-hidden bg-[#0A0A0A]">
          {/* Hero image - full bleed background */}
          <img
            src={encodeURI("/hospogonewhero.png")}
            alt=""
            className="absolute inset-0 z-0 h-full w-full object-cover object-[center_55%]"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            aria-hidden="true"
          />


          {/* Landing Header - Absolute positioned over hero */}
          <header className="absolute top-0 w-full z-50 py-8 px-6 md:px-12">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <Link to="/" className="flex items-center">
                <img
                  src="/hospogo-navbar-banner.png"
                  alt="HospoGo"
                  className="h-12 md:h-14 w-auto object-contain"
                  loading="eager"
                />
              </Link>

              {/* Sign Up CTA - Ghost button style */}
              {!isAuthenticated && (
                <Link to="/signup">
                  <Button
                    variant="ghost"
                    className="border-2 border-white text-white px-8 py-3 rounded-full font-bold backdrop-blur-sm hover:bg-white/5 transition-all"
                  >
                    SIGN UP
                  </Button>
                </Link>
              )}

              {isAuthenticated && user && (
                <Link to={getDashboardRoute(user.currentRole)}>
                  <Button
                    variant="ghost"
                    className="border-2 border-white text-white px-8 py-3 rounded-full font-bold backdrop-blur-sm hover:bg-white/5 transition-all"
                  >
                    Dashboard
                  </Button>
                </Link>
              )}
            </div>
          </header>

          {/* Content Grid - Left 50% */}
          <div className="relative z-10 w-full min-h-[100vh] grid grid-cols-1 lg:grid-cols-2">
            {/* Text Content - Left Side */}
            <div className="flex flex-col justify-center px-6 md:px-12 lg:px-20 py-32 md:py-40">
              <div className="max-w-2xl text-left">
                {/* Headline with emphasis on "Never Quits" */}
                <h2 
                  className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.1] mb-6 text-white"
                  style={{ textShadow: '2px 2px 10px rgba(0,0,0,0.8)' }}
                >
                  The Roster That{" "}
                  <span className="relative inline-block">
                    <span className="relative z-10 text-[#BFFF00]">Never Quits</span>
                    <span
                      className="absolute bottom-1 left-0 w-full h-[4px] bg-[#BFFF00]/60 rounded-full"
                      aria-hidden="true"
                    />
                  </span>
                  .
                </h2>

                {/* Subheadline */}
                <p 
                  className="text-lg md:text-xl text-gray-300 max-w-lg mb-10 leading-relaxed"
                  style={{ textShadow: '1px 1px 5px rgba(0,0,0,0.5)' }}
                >
                  Instant coverage for venues. Instant work for staff. The marketplace that keeps your business moving.
                </p>

                {/* Action Buttons */}
                {!isAuthenticated && (
                  <div className="flex gap-4 mt-10">
                    <Link to="/signup?role=hub">
                      <Button
                        className="bg-[#BFFF00] text-black font-black px-12 py-5 rounded-full hover:shadow-[0_0_20px_rgba(191,255,0,0.4)] transition-all duration-300"
                        data-testid="button-find-staff"
                      >
                        FIND STAFF
                      </Button>
                    </Link>

                    <Link to="/signup?role=professional">
                      <Button
                        variant="ghost"
                        className="border-2 border-white text-white font-bold px-12 py-5 rounded-full hover:bg-white/5 transition-all duration-300"
                        data-testid="button-find-shifts"
                      >
                        Find Shifts
                      </Button>
                    </Link>
                  </div>
                )}

                {isAuthenticated && user && (
                  <div className="flex gap-4 mt-10">
                    <Link to={getDashboardRoute(user.currentRole)}>
                      <Button
                        className="bg-[#BFFF00] text-black font-black px-12 py-5 rounded-full hover:shadow-[0_0_20px_rgba(191,255,0,0.4)] transition-all duration-300"
                        data-testid="button-go-to-dashboard"
                      >
                        Go to Dashboard
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Empty (shows hero image through gradient) */}
            <div className="hidden lg:block" aria-hidden="true" />
          </div>
        </section>

        {/* How It Works Section */}
        <div className="py-16 md:py-24 bg-[#0A0A0A] overflow-x-hidden">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">How HospoGo Works</h2>
              <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                Simple, fast, and built for hospitality
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-[#161616] border border-zinc-800 p-10 rounded-3xl hover:border-[#BFFF00]/50 hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 group">
                <CardContent className="pt-0">
                  <span className="text-zinc-600 font-mono text-sm mb-2 block" data-testid="step-badge-1">01</span>
                  <div className="w-14 h-14 rounded-xl bg-[#BFFF00]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <UserPlus className="h-7 w-7 text-[#BFFF00]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Create Your Profile</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Sign up and build your professional profile. Choose your role: shop owner, professional,
                    brand, or trainer.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#161616] border border-zinc-800 p-10 rounded-3xl hover:border-[#BFFF00]/50 hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 group">
                <CardContent className="pt-0">
                  <span className="text-zinc-600 font-mono text-sm mb-2 block" data-testid="step-badge-2">02</span>
                  <div className="w-14 h-14 rounded-xl bg-[#BFFF00]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <FileText className="h-7 w-7 text-[#BFFF00]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">
                    Post or Browse Opportunities
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Venue owners post shifts with clear rates and requirements. Brands share launches.
                    Pros browse the feed to find work that fits their schedule.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#161616] border border-zinc-800 p-10 rounded-3xl hover:border-[#BFFF00]/50 hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 group">
                <CardContent className="pt-0">
                  <span className="text-zinc-600 font-mono text-sm mb-2 block" data-testid="step-badge-3">03</span>
                  <div className="w-14 h-14 rounded-xl bg-[#BFFF00]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Handshake className="h-7 w-7 text-[#BFFF00]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Connect & Apply</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Apply to shifts in one click. Venue owners review profiles and ratings, then book the best
                    talent instantly.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#161616] border border-zinc-800 p-10 rounded-3xl hover:border-[#BFFF00]/50 hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 group">
                <CardContent className="pt-0">
                  <span className="text-zinc-600 font-mono text-sm mb-2 block" data-testid="step-badge-4">04</span>
                  <div className="w-14 h-14 rounded-xl bg-[#BFFF00]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <CheckCircle className="h-7 w-7 text-[#BFFF00]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Work Together</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Complete the opportunity, build your network, and grow your reputation within the
                    industry community.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Value Proposition - Dual Track */}
        <section className="py-16 md:py-24 bg-[#0A0A0A]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
                Built for Both Sides of the Market
              </h2>
              <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                Whether you're filling shifts or finding them, we've got you covered
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 md:gap-10">
              {/* For Shops */}
              <Card className="bg-[#161616] border border-zinc-800 p-10 rounded-3xl hover:border-[#BFFF00]/50 hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-[#BFFF00]/10 rounded-xl flex items-center justify-center">
                      <Store className="h-7 w-7 text-[#BFFF00]" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">For Venues</h3>
                  </div>
                  <p className="text-lg text-zinc-400 mb-6 leading-relaxed">
                    Never lose revenue to a sick day again. Access vetted, rated professionals on demand.
                  </p>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-[#BFFF00] mt-0.5 flex-shrink-0" />
                      <span className="text-zinc-300">Verified professionals with ratings</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-[#BFFF00] mt-0.5 flex-shrink-0" />
                      <span className="text-zinc-300">Instant booking for last-minute coverage</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-[#BFFF00] mt-0.5 flex-shrink-0" />
                      <span className="text-zinc-300">No long-term contracts required</span>
                    </li>
                  </ul>
                  {!isAuthenticated && (
                    <Link to="/signup?role=hub">
                      <Button className="w-full bg-[#BFFF00] text-black font-black py-4 rounded-full hover:shadow-[0_0_20px_rgba(191,255,0,0.4)] transition-all duration-300">
                        Get Started as Venue
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>

              {/* For Staff */}
              <Card className="bg-[#161616] border border-zinc-800 p-10 rounded-3xl hover:border-[#BFFF00]/50 hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-[#BFFF00]/10 rounded-xl flex items-center justify-center">
                      <UserCheck className="h-7 w-7 text-[#BFFF00]" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">For Staff</h3>
                  </div>
                  <p className="text-lg text-zinc-400 mb-6 leading-relaxed">
                    Earn extra income on your schedule. Guaranteed payments via Stripe.
                  </p>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-[#BFFF00] mt-0.5 flex-shrink-0" />
                      <span className="text-zinc-300">Flexible shifts that fit your schedule</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-[#BFFF00] mt-0.5 flex-shrink-0" />
                      <span className="text-zinc-300">Secure payments processed through Stripe</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-[#BFFF00] mt-0.5 flex-shrink-0" />
                      <span className="text-zinc-300">Build your reputation with ratings</span>
                    </li>
                  </ul>
                  {!isAuthenticated && (
                    <Link to="/signup?role=professional">
                      <Button className="w-full border-2 border-white text-white font-bold py-4 rounded-full hover:bg-white/5 transition-all duration-300" variant="ghost">
                        Get Started as Staff
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Trust Signals */}
        <section className="py-12 md:py-16 bg-[#161616]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-[#BFFF00]" />
                <span className="text-lg font-semibold text-white">Verified Pros</span>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="h-6 w-6 text-[#BFFF00]" />
                <span className="text-lg font-semibold text-white">Secure Payments by Stripe</span>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <Pricing />

        {/* FAQ Section */}
        <FAQSection />

        {/* Final CTA Section */}
        {!isAuthenticated && (
          <section className="py-16 md:py-24 bg-[#1f1f1f]">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">Ready to Get Started?</h2>
              <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
                Join the marketplace that's reshaping how venues and staff connect
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/signup?role=hub">
                  <Button
                    size="lg"
                    className="h-auto bg-[#BFFF00] text-black px-10 py-4 rounded-full font-black text-lg hover:shadow-[0_0_20px_rgba(191,255,0,0.4)] transition-all duration-300"
                    data-testid="button-join-venue"
                  >
                    Venue Sign Up
                  </Button>
                </Link>
                <Link to="/signup?role=professional">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-auto bg-transparent border-2 border-white text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-white/5 transition-all duration-300"
                    data-testid="button-join-staff"
                  >
                    Staff Sign Up
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
