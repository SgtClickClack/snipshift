import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Scissors } from "lucide-react";

export default function Hero() {
  return (
    <div 
      className="relative text-white py-20 overflow-hidden bg-steel-900"
      style={{
        backgroundImage: `linear-gradient(rgba(168, 85, 247, 0.05), rgba(30, 64, 175, 0.05)), url('/hero-background.png')`,
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
        
        <p className="text-sm opacity-75">Join thousands of professionals already on Snipshift</p>
      </div>
    </div>
  );
}
