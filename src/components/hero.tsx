import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logoProcessed from "@/assets/logo-processed.png";

export default function Hero() {
  return (
    <div 
      className="relative text-white py-32 overflow-hidden bg-steel-900"
      style={{
        backgroundImage: `url('/hero-background.png'), linear-gradient(135deg, #1e293b 0%, #0f172a 100%)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundBlendMode: 'overlay'
      }}
    >
      {/* Dark Overlay for contrast */}
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
        <div className="flex justify-center mb-8">
          <img 
            src={logoProcessed} 
            alt="Snipshift Logo" 
            className="h-32 md:h-40 w-auto object-contain mx-auto mb-6 drop-shadow-2xl"
            style={{
              filter: 'brightness(2.5) contrast(1.8) drop-shadow(0 0 15px rgba(255,255,255,0.5))',
            }}
          />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold mb-6 drop-shadow-lg tracking-tight">
          Connect. Cover. Grow.
        </h1>
        <p className="text-xl md:text-2xl mb-10 text-steel-100 max-w-3xl mx-auto drop-shadow-md font-medium">
          Snipshift bridges barbershops and salons with verified professionals for seamless workforce flexibility
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
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
