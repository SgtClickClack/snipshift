import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <div 
      className="relative w-full min-h-[85vh] max-h-[90vh] text-foreground overflow-hidden bg-background dark:bg-steel-900 border-b border-border flex items-center"
      style={{
        backgroundImage: `url('/hero-background.png'), linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--background)) 100%)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundBlendMode: 'overlay'
      }}
    >
      {/* Dark Overlay to hide background and make logo pop - only in dark mode */}
      <div className="absolute inset-0 dark:bg-black/60 z-base" />

      {/* Bottom Gradient Overlay for text readability - only in dark mode */}
      <div className="absolute inset-0 dark:bg-gradient-to-t dark:from-black/80 dark:via-black/40 dark:to-transparent z-elevated" />

      {/* Content Wrapper */}
      <div className="relative z-elevated w-full py-12 md:py-16 flex flex-col items-center justify-center text-center px-4">
        {/* Text and buttons */}
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-6 md:gap-8">
          <p className="text-xl md:text-2xl text-foreground dark:text-steel-100 max-w-3xl mx-auto drop-shadow-md font-medium">
            Connect verified barbers with top shops for seamless workforce flexibility
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-2">
            <Link to="/signup">
              <Button size="lg" className="bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-light hover:to-red-accent text-white font-semibold text-lg px-12 py-4 shadow-xl" data-testid="button-get-started">
                Get Started
              </Button>
            </Link>
            
            <Link to="/login">
              <Button size="lg" variant="outline" className="bg-background/80 dark:bg-white/10 border-border dark:border-white/30 text-foreground dark:text-white hover:bg-muted dark:hover:bg-white/20 text-lg px-8 py-4" data-testid="button-login">
                Login
              </Button>
            </Link>
          </div>
          
          <p className="text-sm text-muted-foreground opacity-75">Join thousands of professionals already on Snipshift</p>
        </div>
      </div>
    </div>
  );
}
