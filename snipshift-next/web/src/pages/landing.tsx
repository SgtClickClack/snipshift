import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Handshake, Store, UserCheck, Scissors } from "lucide-react";
import heroBackgroundImg from "@/assets/hero-background.jpg";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div 
        className="relative text-white py-20 overflow-hidden"
        style={{
          backgroundImage: `url(${heroBackgroundImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-8">
            <div className="p-4 bg-gradient-to-br from-red-accent to-red-accent-dark rounded-full shadow-xl">
              <Scissors className="h-12 w-12 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Connect. Cover. Grow.
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-3xl mx-auto">
            Snipshift bridges barbershops, salons and creative hubs with verified professionals for seamless workforce flexibility
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
            <Link to="/signup">
              <Button size="lg" className="bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-light hover:to-red-accent text-white font-semibold text-lg px-12 py-4 shadow-xl" data-testid="button-get-started">
                Get Started Today
              </Button>
            </Link>
            
            <Link to="/login">
              <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-lg px-8 py-4" data-testid="button-login">
                Already have an account? Login
              </Button>
            </Link>
          </div>
          <div className="mt-4 text-sm">
            <Link to="/signup" className="underline" data-testid="link-signup">Sign up</Link>
            <span className="mx-2">•</span>
            <Link to="/login" className="underline" data-testid="link-login">Log in</Link>
            <span className="mx-2">•</span>
            <Link to="/demo" className="underline" data-testid="link-demo">View Demo</Link>
          </div>
          
          <p className="text-sm opacity-75">Join thousands of professionals already on Snipshift</p>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-20" style={{backgroundColor: 'var(--bg-signup)'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-steel-900 mb-4">How Snipshift Works</h2>
            <p className="text-lg text-steel-600 max-w-2xl mx-auto">Simple, efficient, and designed for the barbering and creative industry</p>
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
                <p className="text-steel-600">Create lasting professional relationships within the creative industry network</p>
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
                <h3 className="text-lg font-semibold mb-2 text-steel-900">Hub Owners</h3>
                <p className="text-steel-600 text-sm">Barbershops, salons, and creative spaces looking for flexible staffing</p>
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

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-steel-900 via-steel-800 to-steel-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Creative Career?
          </h2>
          <p className="text-xl text-chrome-light mb-8 max-w-2xl mx-auto">
            Join the community that's reshaping how the creative industry works together
          </p>
          
          <Link to="/signup">
            <Button size="lg" className="bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-light hover:to-red-accent text-white font-semibold text-lg px-12 py-4 shadow-xl" data-testid="button-join-now">
              Join Snipshift Today
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}