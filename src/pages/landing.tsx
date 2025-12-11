import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Store, UserCheck, Shield, CheckCircle2, CreditCard, UserPlus, FileText, Handshake, CheckCircle } from "lucide-react";
import Pricing from "@/components/pricing";
import { SEO } from "@/components/seo/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardRoute } from "@/lib/roles";
import { useEffect } from "react";

export default function LandingPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // If authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated && user?.currentRole) {
      navigate(getDashboardRoute(user.currentRole), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);
  
  // Show loading or nothing while redirecting
  if (isAuthenticated && user?.currentRole) {
    return null;
  }

  return (
    <>
      <SEO
        title="Snipshift | On-Demand Barber Staffing Australia"
        description="Connect with top-rated barbers for temporary shifts. Reliable, vetted, and paid securely."
        url="/"
      />
      <div className="min-h-screen">
      {/* Hero Section */}
      <section 
        className="relative w-full min-h-[85vh] max-h-[90vh] text-foreground overflow-hidden bg-background dark:bg-steel-900 border-b border-border flex items-center"
        style={{
          backgroundImage: `url('/herobarber (2).png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Dark Overlay for text readability - reduced opacity to show image */}
        <div className="absolute inset-0 bg-black/30 dark:bg-black/40 z-base" />
        
        {/* Bottom Gradient Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent z-elevated" />
        
        <div className="relative z-elevated w-full py-12 md:py-20 flex flex-col items-center justify-center text-center px-4">
          <div className="max-w-5xl mx-auto flex flex-col items-center gap-8 md:gap-10">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground max-w-4xl mx-auto leading-tight drop-shadow-lg">
              The On-Demand Marketplace for Barbers & Shops.
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto drop-shadow-md font-medium">
              Fill empty chairs or find extra shifts instantly. No contracts, just coverage.
            </p>
            
            {!isAuthenticated && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mt-4">
                <Link to="/signup?role=hub">
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-light hover:to-red-accent text-white font-semibold text-lg px-8 py-6 shadow-xl h-auto" 
                    data-testid="button-find-barber"
                  >
                    Find a Barber
                  </Button>
                </Link>
                
                <Link to="/signup?role=professional">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="bg-background/80 dark:bg-white/10 border-2 border-border dark:border-white/30 text-foreground dark:text-white hover:bg-muted dark:hover:bg-white/20 text-lg px-8 py-6 h-auto font-semibold" 
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
                  size="lg" 
                  className="bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-light hover:to-red-accent text-white font-semibold text-lg px-12 py-6 shadow-xl h-auto" 
                  data-testid="button-go-to-dashboard"
                >
                  Go to Dashboard
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <div className="py-8 md:py-20 bg-background border-t border-border overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">How Snipshift Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Simple, efficient, and designed for the barbering and beauty industry</p>
          </div>
          
          {/* Add top padding to accommodate badges that extend above cards, especially on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-8 md:pt-6">
            {/* Keep overflow-visible to prevent badge clipping */}
            <Card className="text-center p-8 bg-card border border-border rounded-xl hover:shadow-xl hover:border-border/80 transition-all duration-300 relative overflow-visible hover:scale-105">
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-red-accent text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg z-badge" data-testid="step-badge-1">
                1
              </div>
              <CardContent className="pt-0">
                <div className="w-16 h-16 bg-gradient-to-br from-red-accent to-red-accent-dark rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <UserPlus className="text-white h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-card-foreground">Create Your Profile</h3>
                <p className="text-muted-foreground text-sm">Sign up and build your professional profile. Choose your role: shop owner, professional, brand, or trainer.</p>
              </CardContent>
            </Card>
            
            {/* Keep overflow-visible to prevent badge clipping */}
            <Card className="text-center p-8 bg-card border border-border rounded-xl hover:shadow-xl hover:border-border/80 transition-all duration-300 relative overflow-visible hover:scale-105">
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-red-accent text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg z-badge" data-testid="step-badge-2">
                2
              </div>
              <CardContent className="pt-0">
                <div className="w-16 h-16 bg-gradient-to-br from-red-accent to-red-accent-dark rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <FileText className="text-white h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-card-foreground">Post or Browse Opportunities</h3>
                <p className="text-muted-foreground text-sm">Shop owners post shifts with clear rates and requirements. Brands share launches. Professionals browse the feed to find work that fits their schedule.</p>
              </CardContent>
            </Card>
            
            {/* Keep overflow-visible to prevent badge clipping */}
            <Card className="text-center p-8 bg-card border border-border rounded-xl hover:shadow-xl hover:border-border/80 transition-all duration-300 relative overflow-visible hover:scale-105">
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-red-accent text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg z-badge" data-testid="step-badge-3">
                3
              </div>
              <CardContent className="pt-0">
                <div className="w-16 h-16 bg-gradient-to-br from-red-accent to-red-accent-dark rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Handshake className="text-white h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-card-foreground">Connect & Apply</h3>
                <p className="text-muted-foreground text-sm">Apply to shifts in one click. Shop owners review profiles and ratings, then book the best talent instantly.</p>
              </CardContent>
            </Card>
            
            {/* Keep overflow-visible to prevent badge clipping */}
            <Card className="text-center p-8 bg-card border border-border rounded-xl hover:shadow-xl hover:border-border/80 transition-all duration-300 relative overflow-visible hover:scale-105">
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-red-accent text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg z-badge" data-testid="step-badge-4">
                4
              </div>
              <CardContent className="pt-0">
                <div className="w-16 h-16 bg-gradient-to-br from-red-accent to-red-accent-dark rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <CheckCircle className="text-white h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-card-foreground">Work Together</h3>
                <p className="text-muted-foreground text-sm">Complete the opportunity, build your network, and grow your reputation within the industry community.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Value Proposition - Dual Track */}
      <section className="py-12 md:py-20 bg-background border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Built for Both Sides of the Market</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Whether you're filling shifts or finding them, we've got you covered</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 md:gap-12">
            {/* For Shops */}
            <Card className="p-8 bg-card shadow-lg border-2 border-border hover:shadow-xl hover:border-red-accent/50 transition-all duration-300">
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-accent to-red-accent-dark rounded-full flex items-center justify-center shadow-lg">
                    <Store className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-card-foreground">For Shops</h3>
                </div>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  Never lose revenue to a sick day again. Access vetted, rated professionals on demand.
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-red-accent mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Verified professionals with ratings</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-red-accent mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Instant booking for last-minute coverage</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-red-accent mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">No long-term contracts required</span>
                  </li>
                </ul>
                {!isAuthenticated && (
                  <Link to="/signup?role=hub">
                    <Button className="w-full bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-light hover:to-red-accent text-white">
                      Get Started as Shop Owner
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
            
            {/* For Barbers */}
            <Card className="p-8 bg-card shadow-lg border-2 border-border hover:shadow-xl hover:border-red-accent/50 transition-all duration-300">
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-accent to-red-accent-dark rounded-full flex items-center justify-center shadow-lg">
                    <UserCheck className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-card-foreground">For Barbers</h3>
                </div>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  Earn extra income on your schedule. Guaranteed payments via Stripe.
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-red-accent mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Flexible shifts that fit your schedule</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-red-accent mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Secure payments processed through Stripe</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-red-accent mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Build your reputation with ratings</span>
                  </li>
                </ul>
                {!isAuthenticated && (
                  <Link to="/signup?role=professional">
                    <Button className="w-full bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-light hover:to-red-accent text-white">
                      Get Started as Barber
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
              <Shield className="h-6 w-6 text-red-accent" />
              <span className="text-lg font-semibold text-foreground">Verified Professionals</span>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-red-accent" />
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
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join the marketplace that's reshaping how barbers and shops connect
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup?role=hub">
                <Button size="lg" className="bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-light hover:to-red-accent text-white font-semibold text-lg px-8 py-6 shadow-xl" data-testid="button-join-shop">
                  Shop Owner Sign Up
                </Button>
              </Link>
              <Link to="/signup?role=professional">
                <Button size="lg" variant="outline" className="bg-background/80 dark:bg-white/10 border-2 border-border dark:border-white/30 text-foreground dark:text-white hover:bg-muted dark:hover:bg-white/20 text-lg px-8 py-6 font-semibold" data-testid="button-join-barber">
                  Barber Sign Up
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
