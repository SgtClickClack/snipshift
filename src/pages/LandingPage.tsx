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
        <section className="relative isolate w-full min-h-[100vh] text-foreground overflow-hidden bg-black">
          {/* Hero image - full bleed background */}
          <img
            src={encodeURI("/hospogonewhero.png")}
            alt=""
            className="absolute inset-0 z-0 h-full w-full object-cover object-[center_35%]"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            aria-hidden="true"
          />

          {/* Subtle gradient overlay - left edge only for text readability */}
          <div
            className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-r from-black/50 via-black/25 to-transparent"
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
                    className="border border-white/40 text-white px-6 py-2 rounded-full font-semibold backdrop-blur-sm hover:bg-white/10 hover:border-white/60 transition-all"
                  >
                    SIGN UP
                  </Button>
                </Link>
              )}

              {isAuthenticated && user && (
                <Link to={getDashboardRoute(user.currentRole)}>
                  <Button
                    variant="ghost"
                    className="border border-white/40 text-white px-6 py-2 rounded-full font-semibold backdrop-blur-sm hover:bg-white/10 hover:border-white/60 transition-all"
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
            <div className="flex flex-col justify-center px-6 md:px-12 lg:px-16 py-32 md:py-40">
              <div className="max-w-xl">
                {/* Headline with emphasis on "Never Quits" */}
                <h2 
                  className="text-5xl sm:text-6xl font-black tracking-tighter leading-tight mb-6 text-white"
                  style={{ textShadow: '2px 2px 10px rgba(0,0,0,0.8)' }}
                >
                  The Roster That{" "}
                  <span className="relative inline-block">
                    <span className="relative z-10 text-[#BFFF00]">Never Quits</span>
                    <span
                      className="absolute bottom-1 left-0 w-full h-[3px] bg-[#BFFF00]/60 rounded-full"
                      aria-hidden="true"
                    />
                  </span>
                  .
                </h2>

                {/* Subheadline */}
                <p 
                  className="text-lg md:text-xl text-gray-200 max-w-md mb-8 leading-relaxed"
                  style={{ textShadow: '1px 1px 5px rgba(0,0,0,0.5)' }}
                >
                  Instant coverage for venues. Instant work for staff. The marketplace that keeps your business moving.
                </p>

                {/* Action Buttons */}
                {!isAuthenticated && (
                  <div className="flex gap-4 items-center">
                    <Link to="/signup?role=hub">
                      <Button
                        className="h-12 flex items-center justify-center px-8 rounded-full font-bold transition-all bg-[#BFFF00] text-black hover:brightness-110"
                        data-testid="button-find-staff"
                      >
                        FIND STAFF
                      </Button>
                    </Link>

                    <Link to="/signup?role=professional">
                      <Button
                        variant="ghost"
                        className="h-12 flex items-center justify-center px-8 rounded-full font-bold transition-all border-2 border-white text-white hover:bg-white/10"
                        data-testid="button-find-shifts"
                      >
                        Find Shifts
                      </Button>
                    </Link>
                  </div>
                )}

                {isAuthenticated && user && (
                  <Link to={getDashboardRoute(user.currentRole)}>
                    <Button
                      className="h-12 flex items-center justify-center px-8 rounded-full font-bold transition-all bg-[#BFFF00] text-black hover:brightness-110"
                      data-testid="button-go-to-dashboard"
                    >
                      Go to Dashboard
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Right Side - Empty (shows hero image through gradient) */}
            <div className="hidden lg:block" aria-hidden="true" />
          </div>
        </section>

        {/* How It Works Section */}
        <div className="py-8 md:py-20 bg-background border-t border-border overflow-x-hidden">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">How HospoGo Works</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Simple, fast, and built for hospitality
              </p>
            </div>

            {/* Add top padding to accommodate badges that extend above cards, especially on mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-8 md:pt-6">
              {/* Keep overflow-visible to prevent badge clipping */}
              <Card className="text-center p-8 bg-card border border-border rounded-xl hover:shadow-xl hover:border-border/80 transition-all duration-300 relative overflow-visible hover:scale-105">
                <div
                  className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-brand-neon text-brand-dark rounded-full flex items-center justify-center font-bold text-sm shadow-neon-realistic z-badge"
                  data-testid="step-badge-1"
                >
                  1
                </div>
                <CardContent className="pt-0">
                  <div className="w-16 h-16 bg-brand-neon rounded-full flex items-center justify-center mx-auto mb-4 shadow-neon-realistic">
                    <UserPlus className="text-brand-dark h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-card-foreground">Create Your Profile</h3>
                  <p className="text-muted-foreground text-sm">
                    Sign up and build your professional profile. Choose your role: shop owner, professional,
                    brand, or trainer.
                  </p>
                </CardContent>
              </Card>

              {/* Keep overflow-visible to prevent badge clipping */}
              <Card className="text-center p-8 bg-card border border-border rounded-xl hover:shadow-xl hover:border-border/80 transition-all duration-300 relative overflow-visible hover:scale-105">
                <div
                  className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-brand-neon text-brand-dark rounded-full flex items-center justify-center font-bold text-sm shadow-neon-realistic z-badge"
                  data-testid="step-badge-2"
                >
                  2
                </div>
                <CardContent className="pt-0">
                  <div className="w-16 h-16 bg-brand-neon rounded-full flex items-center justify-center mx-auto mb-4 shadow-neon-realistic">
                    <FileText className="text-brand-dark h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-card-foreground">
                    Post or Browse Opportunities
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Venue owners post shifts with clear rates and requirements. Brands share launches.
                    Pros browse the feed to find work that fits their schedule.
                  </p>
                </CardContent>
              </Card>

              {/* Keep overflow-visible to prevent badge clipping */}
              <Card className="text-center p-8 bg-card border border-border rounded-xl hover:shadow-xl hover:border-border/80 transition-all duration-300 relative overflow-visible hover:scale-105">
                <div
                  className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-brand-neon text-brand-dark rounded-full flex items-center justify-center font-bold text-sm shadow-neon-realistic z-badge"
                  data-testid="step-badge-3"
                >
                  3
                </div>
                <CardContent className="pt-0">
                  <div className="w-16 h-16 bg-brand-neon rounded-full flex items-center justify-center mx-auto mb-4 shadow-neon-realistic">
                    <Handshake className="text-brand-dark h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-card-foreground">Connect & Apply</h3>
                  <p className="text-muted-foreground text-sm">
                    Apply to shifts in one click. Venue owners review profiles and ratings, then book the best
                    talent instantly.
                  </p>
                </CardContent>
              </Card>

              {/* Keep overflow-visible to prevent badge clipping */}
              <Card className="text-center p-8 bg-card border border-border rounded-xl hover:shadow-xl hover:border-border/80 transition-all duration-300 relative overflow-visible hover:scale-105">
                <div
                  className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-brand-neon text-brand-dark rounded-full flex items-center justify-center font-bold text-sm shadow-neon-realistic z-badge"
                  data-testid="step-badge-4"
                >
                  4
                </div>
                <CardContent className="pt-0">
                  <div className="w-16 h-16 bg-brand-neon rounded-full flex items-center justify-center mx-auto mb-4 shadow-neon-realistic">
                    <CheckCircle className="text-brand-dark h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-card-foreground">Work Together</h3>
                  <p className="text-muted-foreground text-sm">
                    Complete the opportunity, build your network, and grow your reputation within the
                    industry community.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Value Proposition - Dual Track */}
        <section className="py-12 md:py-20 bg-background border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Built for Both Sides of the Market
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Whether you're filling shifts or finding them, we've got you covered
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 md:gap-12">
              {/* For Shops */}
              <Card className="p-8 bg-card shadow-lg border-2 border-border hover:shadow-xl hover:border-brand-neon/50 transition-all duration-300">
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-brand-neon rounded-full flex items-center justify-center shadow-neon-realistic">
                      <Store className="h-8 w-8 text-brand-dark" />
                    </div>
                    <h3 className="text-2xl font-bold text-card-foreground">For Shops</h3>
                  </div>
                  <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                    Never lose revenue to a sick day again. Access vetted, rated professionals on demand.
                  </p>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-brand-neon mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">Verified professionals with ratings</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-brand-neon mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">Instant booking for last-minute coverage</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-brand-neon mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">No long-term contracts required</span>
                    </li>
                  </ul>
                  {!isAuthenticated && (
                    <Link to="/signup?role=hub">
                      <Button variant="accent" className="w-full">
                        Get Started as Venue
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>

              {/* For Staff */}
              <Card className="p-8 bg-card shadow-lg border-2 border-border hover:shadow-xl hover:border-brand-neon/50 transition-all duration-300">
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-brand-neon rounded-full flex items-center justify-center shadow-neon-realistic">
                      <UserCheck className="h-8 w-8 text-brand-dark" />
                    </div>
                    <h3 className="text-2xl font-bold text-card-foreground">For Staff</h3>
                  </div>
                  <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                    Earn extra income on your schedule. Guaranteed payments via Stripe.
                  </p>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-brand-neon mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">Flexible shifts that fit your schedule</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-brand-neon mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">Secure payments processed through Stripe</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-brand-neon mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">Build your reputation with ratings</span>
                    </li>
                  </ul>
                  {!isAuthenticated && (
                    <Link to="/signup?role=professional">
                      <Button variant="accent" className="w-full">
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
        <section className="py-12 md:py-16 bg-muted/30 border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-brand-neon" />
                <span className="text-lg font-semibold text-foreground">Verified Pros</span>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="h-6 w-6 text-brand-neon" />
                <span className="text-lg font-semibold text-foreground">Secure Payments by Stripe</span>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <Pricing />

        {/* Final CTA Section */}
        {!isAuthenticated && (
          <section className="py-12 md:py-20 bg-gradient-to-br from-steel-900 via-steel-800 to-steel-950 border-t border-border">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">Ready to Get Started?</h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join the marketplace that's reshaping how venues and staff connect
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/signup?role=hub">
                  <Button
                    size="lg"
                    className="h-auto px-8 py-6 text-lg shadow-[0_0_12px_rgba(186,255,57,0.35)] hover:shadow-[0_0_18px_rgba(186,255,57,0.45)]"
                    data-testid="button-join-venue"
                  >
                    Venue Sign Up
                  </Button>
                </Link>
                <Link to="/signup?role=professional">
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-background/80 dark:bg-white/10 border-2 border-border dark:border-white/30 text-foreground dark:text-white hover:bg-muted dark:hover:bg-white/20 text-lg px-8 py-6 font-semibold"
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
