import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <div 
      className="relative w-full h-screen text-white overflow-hidden bg-steel-900"
      style={{
        backgroundImage: `url('/hero-background.png'), linear-gradient(135deg, #1e293b 0%, #0f172a 100%)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundBlendMode: 'overlay'
      }}
    >
      {/* Background Logo Image */}
      <img 
        src="/og-image.png" 
        alt="Snipshift Logo Background" 
        className="absolute inset-0 w-full h-full object-cover z-0"
        loading="eager"
      />

      {/* Dark Overlay for contrast */}
      <div className="absolute inset-0 bg-black/60 z-[1]" />

      {/* Content Wrapper */}
      <div className="relative z-10 w-full h-full flex flex-col justify-end pb-32 md:pb-40 px-4 items-center text-center">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-8 mb-8">
          <p className="text-xl md:text-2xl text-steel-100 max-w-3xl mx-auto drop-shadow-md font-medium">
            Snipshift bridges barbershops and salons with verified professionals for seamless workforce flexibility
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
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
    </div>
  );
}
