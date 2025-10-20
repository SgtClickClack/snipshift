import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Handshake, Store, UserCheck, Scissors } from "lucide-react";
import heroBackgroundImg from "@/assets/hero-background.jpg";

export default function LandingPage() {
  return (
    <div className="min-h-screen" data-testid="landing-page">
      {/* Hero Section */}
      <div 
        className="relative py-24 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url(${heroBackgroundImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Dark overlay for better text contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/60"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <div className="flex justify-center mb-8">
            <div className="p-4 bg-gradient-to-br from-red-500 to-red-600 rounded-full shadow-2xl">
              <Scissors className="h-12 w-12 text-white" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Connect. Cover. Grow.
          </h1>
          <p className="text-xl md:text-2xl mb-10 opacity-95 max-w-4xl mx-auto leading-relaxed">
            Snipshift bridges barbershops, salons and creative hubs with verified professionals for seamless workforce flexibility
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
            <Link to="/signup" data-testid="link-signup">
              <Button size="lg" className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold text-lg px-12 py-4 shadow-2xl hover:shadow-red-500/25 transition-all duration-300" data-testid="button-get-started">
                Get Started Today
              </Button>
            </Link>
            
            <Link to="/login">
              <Button size="lg" variant="outline" className="bg-white/10 border-white/40 text-white hover:bg-white/20 hover:border-white/60 text-lg px-8 py-4 backdrop-blur-sm transition-all duration-300" data-testid="button-login">
                Already have an account? Login
              </Button>
            </Link>
          </div>
          
          <p className="text-lg opacity-90 font-medium">Join thousands of professionals already on Snipshift</p>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">How Snipshift Works</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">Simple, efficient, and designed for the barbering and creative industry</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300">
                <Plus className="text-white h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Post Opportunities</h3>
              <p className="text-gray-600 text-lg leading-relaxed">Shop owners post available shifts, brands share products, trainers offer courses</p>
            </div>
            
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300">
                <Search className="text-white h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Discover & Connect</h3>
              <p className="text-gray-600 text-lg leading-relaxed">Professionals find work, discover products, and access training that matches their goals</p>
            </div>
            
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300">
                <Handshake className="text-white h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Build Community</h3>
              <p className="text-gray-600 text-lg leading-relaxed">Create lasting professional relationships within the creative industry network</p>
            </div>
          </div>
        </div>
      </div>

      {/* Who It's For Section */}
      <div className="py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Perfect For</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">Whether you own a business, work as a professional, represent a brand, or teach others</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300">
                <Store className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Hub Owners</h3>
              <p className="text-gray-600 leading-relaxed">Barbershops, salons, and creative spaces looking for flexible staffing</p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300">
                <UserCheck className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Professionals</h3>
              <p className="text-gray-600 leading-relaxed">Barbers, stylists, and creatives seeking flexible work opportunities</p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300">
                <Store className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Brands</h3>
              <p className="text-gray-600 leading-relaxed">Product companies connecting with the creative professional community</p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300">
                <UserCheck className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Trainers</h3>
              <p className="text-gray-600 leading-relaxed">Educators offering courses, workshops, and skill development</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 leading-tight">
            Ready to Transform Your Creative Career?
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
            Join the community that's reshaping how the creative industry works together
          </p>
          
          <Link to="/signup">
            <Button size="lg" className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold text-lg px-16 py-5 shadow-2xl hover:shadow-red-500/25 transition-all duration-300" data-testid="button-join-now">
              Join Snipshift Today
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}