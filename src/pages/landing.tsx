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
      <div className="py-20 overflow-visible bg-slate-950 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-visible">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How Snipshift Works</h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">Simple, efficient, and designed for the barbering and beauty industry</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6 mb-12 pt-6 overflow-visible">
            <Card className="text-center p-6 bg-slate-900 backdrop-blur-sm shadow-xl border-2 border-white/10 hover:shadow-2xl hover:border-white/20 transition-all duration-300 relative overflow-visible">
              <CardContent className="pt-6">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-red-accent text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg z-10">
                  1
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-red-accent to-red-accent-dark rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg mt-2">
                  <UserPlus className="text-white h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">Create Your Profile</h3>
                <p className="text-gray-300 text-sm">Sign up and build your professional profile. Choose your role: shop owner, professional, brand, or trainer.</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6 bg-slate-900 backdrop-blur-sm shadow-xl border-2 border-white/10 hover:shadow-2xl hover:border-white/20 transition-all duration-300 relative overflow-visible">
              <CardContent className="pt-6">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-red-accent text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg z-10">
                  2
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-steel-500 to-steel-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg mt-2">
                  <FileText className="text-white h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">Post or Browse Opportunities</h3>
                <p className="text-gray-300 text-sm">Shop owners create job posts with shift details, pay rates, and requirements. Brands share product launches and collaborations. Trainers list courses and workshops. Professionals browse the feed, filter by location and skills, and apply directly to opportunities that interest them.</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6 bg-slate-900 backdrop-blur-sm shadow-xl border-2 border-white/10 hover:shadow-2xl hover:border-white/20 transition-all duration-300 relative overflow-visible">
              <CardContent className="pt-6">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-red-accent text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg z-10">
                  3
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-steel-600 to-steel-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg mt-2">
                  <Handshake className="text-white h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">Connect & Apply</h3>
                <p className="text-gray-300 text-sm">Professionals apply to shifts or opportunities. Shop owners review applications and connect with the right talent.</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6 bg-slate-900 backdrop-blur-sm shadow-xl border-2 border-white/10 hover:shadow-2xl hover:border-white/20 transition-all duration-300 relative overflow-visible">
              <CardContent className="pt-6">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-red-accent text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg z-10">
                  4
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-steel-700 to-steel-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg mt-2">
                  <CheckCircle className="text-white h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">Work Together</h3>
                <p className="text-gray-300 text-sm">Complete the opportunity, build your network, and grow your reputation within the industry community.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Who It's For Section */}
      <div className="py-20 bg-slate-950 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Perfect For</h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">Whether you own a business, work as a professional, represent a brand, or teach others</p>
          </div>
          
          {/* Debug: Clear Storage Button (for testing) */}
          {import.meta.env.DEV && (
            <div className="text-center mb-8">
              <button 
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="text-xs opacity-50 hover:opacity-100 bg-slate-800 text-white px-3 py-1 rounded border border-white/10"
              >
                Clear Storage (Debug)
              </button>
            </div>
          )}
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center p-6 bg-slate-900 shadow-lg border border-white/10 hover:shadow-xl hover:border-white/20 transition-all duration-300">
              <CardContent className="pt-6">
                <Store className="h-12 w-12 text-white mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-white">Shop Owners</h3>
                <p className="text-gray-300 text-sm">Barbershops and salons looking for flexible staffing</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6 bg-slate-900 shadow-lg border border-white/10 hover:shadow-xl hover:border-white/20 transition-all duration-300">
              <CardContent className="pt-6">
                <UserCheck className="h-12 w-12 text-white mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-white">Professionals</h3>
                <p className="text-gray-300 text-sm">Barbers, stylists, and professionals seeking flexible work opportunities</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6 bg-slate-900 shadow-lg border border-white/10 hover:shadow-xl hover:border-white/20 transition-all duration-300">
              <CardContent className="pt-6">
                <Store className="h-12 w-12 text-white mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-white">Brands</h3>
                <p className="text-gray-300 text-sm">Product companies connecting with the professional community</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6 bg-slate-900 shadow-lg border border-white/10 hover:shadow-xl hover:border-white/20 transition-all duration-300">
              <CardContent className="pt-6">
                <UserCheck className="h-12 w-12 text-white mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-white">Trainers</h3>
                <p className="text-gray-300 text-sm">Educators offering courses, workshops, and skill development</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <Pricing />

      {/* CTA Section */}
      <div className="py-20 bg-slate-950 border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Career?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
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
