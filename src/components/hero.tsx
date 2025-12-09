import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <div 
      className="relative w-full h-screen text-white overflow-hidden bg-steel-900 border-b border-white/10"
      style={{
        backgroundImage: `url('/hero-background.png'), linear-gradient(135deg, #1e293b 0%, #0f172a 100%)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundBlendMode: 'overlay'
      }}
    >
      {/* Dark Overlay to hide background and make logo pop */}
      <div className="absolute inset-0 bg-black/60 z-[1]" />

      {/* Bottom Gradient Overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-[2]" />

      {/* Content Wrapper - flex column with logo first, then content */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center px-4">
        {/* Large Bright Logo - dominant visual element */}
        <div 
          className="w-[70%] max-w-[800px] mb-8"
          style={{
            mixBlendMode: 'screen',
            isolation: 'isolate'
          }}
        >
          <img 
            src="/logo-no-background.png" 
            alt="Snipshift Logo" 
            className="w-full h-auto object-contain"
            style={{
              filter: 'brightness(1.3) contrast(1.1) drop-shadow(0 0 15px rgba(255, 255, 255, 0.6))',
              opacity: 1
            }}
            loading="eager"
          />
        </div>
        
        {/* Text and buttons below logo */}
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-8">
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
