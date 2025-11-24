import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Handshake, Store, UserCheck } from "lucide-react";
import Hero from "@/components/hero";
import Pricing from "@/components/pricing";
import { SEO } from "@/components/seo/SEO";

export default function LandingPage() {
  return (
    <>
      <SEO
        title="SnipShift - Connect Barbers, Stylists & Creative Professionals"
        description="Connect barbers, stylists, and beauticians with flexible work opportunities. Find gigs, post jobs, and build your professional network in the barbering and beauty industry."
        url="/"
      />
      <div className="min-h-screen">
      {/* Hero Section */}
      <Hero />

      {/* How It Works Section */}
      <div className="py-20" style={{backgroundColor: 'var(--bg-signup)'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-steel-900 mb-4">How Snipshift Works</h2>
            <p className="text-lg text-steel-600 max-w-2xl mx-auto">Simple, efficient, and designed for the barbering and beauty industry</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-6 bg-white/95 backdrop-blur-sm shadow-xl border-2 border-steel-300/50 hover:shadow-2xl transition-all duration-300">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-gradient-to-br from-red-accent to-red-accent-dark rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Plus className="text-white h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-steel-900">Post Opportunities</h3>
                <p className="text-steel-600">Shop owners post available shifts, brands share products, trainers offer courses</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6 bg-white/95 backdrop-blur-sm shadow-xl border-2 border-steel-300/50 hover:shadow-2xl transition-all duration-300">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Search className="text-white h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-steel-900">Discover & Connect</h3>
                <p className="text-steel-600">Professionals find work, discover products, and access training that matches their goals</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6 bg-white/95 backdrop-blur-sm shadow-xl border-2 border-steel-300/50 hover:shadow-2xl transition-all duration-300">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Handshake className="text-white h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-steel-900">Build Community</h3>
                <p className="text-steel-600">Create lasting professional relationships within the industry network</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Who It's For Section */}
      <div className="py-20 bg-gradient-to-b from-steel-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-steel-900 mb-4">Perfect For</h2>
            <p className="text-lg text-steel-600 max-w-2xl mx-auto">Whether you own a business, work as a professional, represent a brand, or teach others</p>
          </div>
          
          {/* Debug: Clear Storage Button (for testing) */}
          {import.meta.env.DEV && (
            <div className="text-center mb-8">
              <button 
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="text-xs opacity-50 hover:opacity-100 bg-gray-200 px-3 py-1 rounded"
              >
                Clear Storage (Debug)
              </button>
            </div>
          )}
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center p-6 bg-white shadow-lg border border-steel-200 hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-6">
                <Store className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-steel-900">Shop Owners</h3>
                <p className="text-steel-600 text-sm">Barbershops and salons looking for flexible staffing</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6 bg-white shadow-lg border border-steel-200 hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-6">
                <UserCheck className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-steel-900">Professionals</h3>
                <p className="text-steel-600 text-sm">Barbers, stylists, and creatives seeking flexible work opportunities</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6 bg-white shadow-lg border border-steel-200 hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-6">
                <Store className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-steel-900">Brands</h3>
                <p className="text-steel-600 text-sm">Product companies connecting with the creative professional community</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6 bg-white shadow-lg border border-steel-200 hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-6">
                <UserCheck className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-steel-900">Trainers</h3>
                <p className="text-steel-600 text-sm">Educators offering courses, workshops, and skill development</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <Pricing />

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-steel-900 via-steel-800 to-steel-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Creative Career?
          </h2>
          <p className="text-xl text-chrome-light mb-8 max-w-2xl mx-auto">
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
