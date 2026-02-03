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
import { PartnerTrustBar } from "@/components/landing/PartnerTrustBar";
import { SEO } from "@/components/seo/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardRoute } from "@/lib/roles";
import { useEffect, useRef } from "react";

export default function LandingPage() {
  const { user, isLoading, hasUser, isAuthReady } = useAuth();
  const hasCleanedUp = useRef(false);

  // DISABLED: Global Redirect Lockdown - AuthContext is the sole authority for redirects.
  // This useEffect conflicted with AuthContext rules and caused flashing. Routes don't mount until
  // isNavigationLocked is false, at which point AuthContext has already navigated to the correct path.
  // useEffect(() => {
  //   if (location.pathname !== '/') return;
  //   if (isLoading) return;
  //   if (!user) return;
  //   const isOnboarded = user.isOnboarded === true;
  //   if (isOnboarded) {
  //     navigate(isVenueMissing ? '/onboarding/hub' : '/dashboard', { replace: true });
  //   } else {
  //     navigate('/onboarding', { replace: true });
  //   }
  // }, [user, isLoading, isVenueMissing, navigate, location.pathname]);

  // Clear stale auth-related localStorage/sessionStorage data on landing page load
  // This prevents race conditions from old redirects or onboarding states
  useEffect(() => {
    // Only run once and only for unauthenticated users
    // Wait for auth state to settle (isLoading must be false)
    if (hasCleanedUp.current) return;
    if (isLoading) return; // Wait for auth handshake to complete
    if (!isAuthReady) return;

    if (!hasUser) {
      hasCleanedUp.current = true;
      // Clear stale redirect/onboarding data that could cause race conditions
      try {
        localStorage.removeItem("onboarding_step");
        localStorage.removeItem("redirect_url");
        localStorage.removeItem("pending_redirect");
        sessionStorage.removeItem("signupRolePreference");
        sessionStorage.removeItem("signupPlanPreference");
        sessionStorage.removeItem("signupTrialMode");
        sessionStorage.removeItem("oauth_state");
      } catch {
        // Ignore storage errors (e.g., private browsing mode)
      }
    }
  }, [hasUser, isAuthReady, isLoading]);

  // Show nothing or splash screen while auth state is loading
  // This ensures we wait for the auth handshake to complete before rendering
  if (isLoading) {
    return null; // Or return a splash screen component if preferred
  }

  // NOTE: Authenticated users are automatically redirected to dashboard via useEffect above.

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
        <section className="relative isolate w-full max-w-[100vw] min-h-[100vh] text-foreground overflow-hidden bg-[#0A0A0A]">
          {/* Hero image container - prevents horizontal overflow */}
          <div className="absolute inset-0 z-0 w-full max-w-[100vw] h-full overflow-hidden">
            <img
              src={encodeURI("/hospogonewhero.png")}
              alt=""
              className="w-full max-w-full h-[60vh] md:h-full object-cover object-[center_55%]"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              aria-hidden="true"
            />
          </div>

          {/* Enhanced gradient overlay - stronger on mobile for text readability */}
          <div
            className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-r from-black/70 via-black/40 md:from-black/50 md:via-black/25 to-transparent"
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
              {!hasUser && !isLoading && (
                <Link to="/signup">
                  <Button
                    variant="ghost"
                    className="border-2 border-white text-white px-8 py-3 rounded-full font-bold backdrop-blur-sm hover:bg-white/5 transition-all"
                  >
                    SIGN UP
                  </Button>
                </Link>
              )}

              {hasUser && user && (
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
                  className="text-lg md:text-xl text-white max-w-lg mb-6 leading-relaxed font-medium"
                  style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.8)' }}
                >
                  Instant coverage for venues. Instant work for staff. The marketplace that keeps your business moving.
                </p>
                <p 
                  className="text-sm md:text-base text-white/90 max-w-lg mb-10"
                  style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.8)' }}
                >
                  Seamlessly integrates with Xero and Stripe.
                </p>

                {/* Action Buttons */}
                {!hasUser && !isLoading && (
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-10 items-stretch sm:items-center">
                    <Link to="/signup?role=hub" className="w-full sm:w-auto">
                      <Button
                        className="w-full sm:w-auto bg-[#BFFF00] text-black font-black px-12 py-5 rounded-full hover:shadow-[0_0_20px_rgba(191,255,0,0.4)] transition-all duration-300 min-h-[44px]"
                        data-testid="button-find-staff"
                      >
                        FIND STAFF
                      </Button>
                    </Link>

                    <Link to="/signup?role=professional" className="w-full sm:w-auto">
                      <Button
                        variant="ghost"
                        className="w-full sm:w-auto border-2 border-white text-white font-bold px-12 py-5 rounded-full hover:bg-white/5 transition-all duration-300 min-h-[44px]"
                        data-testid="button-find-shifts"
                      >
                        Find Shifts
                      </Button>
                    </Link>
                  </div>
                )}

                {hasUser && user && (
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-10 items-stretch sm:items-center">
                    <Link to={getDashboardRoute(user.currentRole)} className="w-full sm:w-auto">
                      <Button
                        className="w-full sm:w-auto bg-[#BFFF00] text-black font-black px-12 py-5 rounded-full hover:shadow-[0_0_20px_rgba(191,255,0,0.4)] transition-all duration-300 min-h-[44px]"
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
              <Card className="bg-[#161616] border border-zinc-800 p-10 rounded-3xl hover:border-[#BFFF00]/50 hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 group overflow-visible">
                <CardContent className="pt-0">
                  <span className="relative z-badge text-zinc-600 font-mono text-xs sm:text-sm mb-2 block" data-testid="step-badge-1">Step 1</span>
                  <div className="w-14 h-14 rounded-xl bg-[#BFFF00]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <UserPlus className="h-7 w-7 text-[#BFFF00]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Create Your Profile</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Sign up and build your profile. Whether you're a venue looking for staff or a professional looking for shifts.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#161616] border border-zinc-800 p-10 rounded-3xl hover:border-[#BFFF00]/50 hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 group overflow-visible">
                <CardContent className="pt-0">
                  <span className="relative z-badge text-zinc-600 font-mono text-xs sm:text-sm mb-2 block" data-testid="step-badge-2">Step 2</span>
                  <div className="w-14 h-14 rounded-xl bg-[#BFFF00]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <FileText className="h-7 w-7 text-[#BFFF00]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">
                    Post or Browse Opportunities
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Venue owners post shifts with clear rates and requirements.
                    Pros browse the feed to find work that fits their schedule.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#161616] border border-zinc-800 p-10 rounded-3xl hover:border-[#BFFF00]/50 hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 group overflow-visible">
                <CardContent className="pt-0">
                  <span className="relative z-badge text-zinc-600 font-mono text-xs sm:text-sm mb-2 block" data-testid="step-badge-3">Step 3</span>
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

              <Card className="bg-[#161616] border border-zinc-800 p-10 rounded-3xl hover:border-[#BFFF00]/50 hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 group overflow-visible">
                <CardContent className="pt-0">
                  <span className="relative z-badge text-zinc-600 font-mono text-xs sm:text-sm mb-2 block" data-testid="step-badge-4">Step 4</span>
                  <div className="w-14 h-14 rounded-xl bg-[#BFFF00]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <CheckCircle className="h-7 w-7 text-[#BFFF00]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Work Together</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Complete the opportunity. Build your network. Grow your reputation in the industry.
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
                  {!hasUser && !isLoading && (
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
                  {!hasUser && !isLoading && (
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
            <div className="flex flex-col gap-10">
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-[#BFFF00]" />
                  <span className="text-lg font-semibold text-white">Verified Pros</span>
                </div>
                <div className="flex items-center gap-3">
                  <CreditCard className="h-6 w-6 text-[#BFFF00]" />
                  <span className="text-lg font-semibold text-white">Payments powered by Stripe</span>
                </div>
              </div>
              <PartnerTrustBar variant="footer" className="pt-4 border-t border-zinc-800" />
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <Pricing />

        {/* FAQ Section */}
        <FAQSection />

        {/* Final CTA Section */}
        {!hasUser && !isLoading && (
          <section className="py-16 md:py-24 bg-[#1f1f1f]">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">Ready to Get Started?</h2>
              <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
                Join the marketplace that's reshaping how venues and staff connect
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-4">
                <Link to="/signup?role=hub" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto h-auto bg-[#BFFF00] text-black px-10 py-4 rounded-full font-black text-lg hover:shadow-[0_0_20px_rgba(191,255,0,0.4)] transition-all duration-300 min-h-[44px]"
                    data-testid="button-join-venue"
                  >
                    Venue Sign Up
                  </Button>
                </Link>
                <Link to="/signup?role=professional" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto h-auto bg-transparent border-2 border-white text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-white/5 transition-all duration-300 min-h-[44px]"
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
