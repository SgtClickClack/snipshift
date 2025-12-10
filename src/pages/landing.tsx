import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Handshake, Store, UserCheck, UserPlus, FileText, CheckCircle } from "lucide-react";
import Hero from "@/components/hero";
import Pricing from "@/components/pricing";
import { SEO } from "@/components/seo/SEO";

export default function LandingPage() {
  return (
    <>
      <SEO
        title="SnipShift - Connect Barbers, Stylists & Industry Professionals"
        description="Connect barbers, stylists, and beauticians with flexible work opportunities. Find gigs, post jobs, and build your professional network in the barbering and beauty industry."
        url="/"
      />
      <div className="min-h-screen">
      {/* Hero Section */}
      <Hero />

      {/* How It Works Section */}
      <div className="py-20 bg-background border-t border-border overflow-x-hidden">
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

      {/* Who It's For Section */}
      <div className="py-20 bg-background border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Perfect For</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Whether you own a business, work as a professional, represent a brand, or teach others</p>
          </div>
          
          {/* Debug: Clear Storage Button (for testing) */}
          {import.meta.env.DEV && (
            <div className="text-center mb-8">
              <button 
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="text-xs opacity-50 hover:opacity-100 bg-muted text-foreground px-3 py-1 rounded border border-border"
              >
                Clear Storage (Debug)
              </button>
            </div>
          )}
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center p-6 bg-card shadow-lg border border-border hover:shadow-xl hover:border-border/80 transition-all duration-300">
              <CardContent className="pt-6">
                <Store className="h-12 w-12 text-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-card-foreground">Shop Owners</h3>
                <p className="text-muted-foreground text-sm">Barbershops and salons looking for flexible staffing</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6 bg-card shadow-lg border border-border hover:shadow-xl hover:border-border/80 transition-all duration-300">
              <CardContent className="pt-6">
                <UserCheck className="h-12 w-12 text-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-card-foreground">Professionals</h3>
                <p className="text-muted-foreground text-sm">Barbers, stylists, and professionals seeking flexible work opportunities</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6 bg-card shadow-lg border border-border hover:shadow-xl hover:border-border/80 transition-all duration-300">
              <CardContent className="pt-6">
                <Store className="h-12 w-12 text-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-card-foreground">Brands</h3>
                <p className="text-muted-foreground text-sm">Product companies connecting with the professional community</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6 bg-card shadow-lg border border-border hover:shadow-xl hover:border-border/80 transition-all duration-300">
              <CardContent className="pt-6">
                <UserCheck className="h-12 w-12 text-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-card-foreground">Trainers</h3>
                <p className="text-muted-foreground text-sm">Educators offering courses, workshops, and skill development</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <Pricing />

      {/* CTA Section */}
      <div className="py-20 bg-background border-t border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Ready to Transform Your Career?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join the community that's reshaping how the industry works together
          </p>
          
          <Link to="/signup">
            <Button size="lg" className="bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-light hover:to-red-accent text-white font-semibold text-lg px-12 py-4 shadow-xl" data-testid="button-join-now">
              Join Snipshift Today
            </Button>
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}
