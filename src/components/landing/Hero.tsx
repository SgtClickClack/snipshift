import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardRoute } from "@/lib/roles";

export default function Hero() {
  const { user, isAuthenticated } = useAuth();
  const heroJpgUrl = encodeURI("/hospogohero.jpg");
  const heroWebpUrl = encodeURI("/hospogohero.webp");
  
  // Determine dashboard route based on user role
  const getDashboardLink = () => {
    if (!user?.currentRole) {
      return '/dashboard';
    }
    return getDashboardRoute(user.currentRole as any);
  };
  
  return (
    <div 
      className="relative w-full min-h-[85vh] max-h-[90vh] text-foreground overflow-hidden bg-background dark:bg-steel-900 border-b border-border flex items-center"
    >
      {/* Hero image (replaces CSS background for better loading priority) */}
      <picture className="absolute inset-0 z-base" aria-hidden="true">
        <source type="image/webp" srcSet={heroWebpUrl} />
        <img
          src={heroJpgUrl}
          alt=""
          className="h-full w-full object-cover object-[center_35%]"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </picture>

      {/* Dark Overlay for text readability - reduced opacity to show image */}
      <div className="absolute inset-0 bg-black/20 dark:bg-black/30 z-base" />

      {/* Bottom Gradient Overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent z-elevated" />

      {/* Content Wrapper */}
      <div className="relative z-elevated w-full pt-40 md:pt-52 pb-12 md:pb-16 flex items-end justify-center text-center px-4">
        {/* Text and buttons */}
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-6 md:gap-7">
          <p className="text-lg md:text-2xl text-white/85 drop-shadow-[0_6px_18px_rgba(0,0,0,0.85)] font-medium max-w-3xl">
            Connect verified hospitality staff with venues for fast, flexible shift work
          </p>
          
          {isAuthenticated && user ? (
            // Scenario B: User is Logged IN - Single "Go to Dashboard" button
            <div className="flex items-center justify-center mt-2">
              <Link to={getDashboardLink()}>
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-light hover:to-red-accent text-white font-semibold text-lg px-12 py-5 shadow-xl h-auto" 
                  data-testid="button-go-to-dashboard"
                >
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          ) : (
            // Scenario A: User is Logged OUT - "Get Started" and "Login" buttons
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mt-2">
              <Link to="/signup">
                <Button size="lg" className="bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-light hover:to-red-accent text-white font-semibold text-lg px-12 py-5 shadow-xl h-auto" data-testid="button-get-started">
                  Get Started
                </Button>
              </Link>
              
              <Link to="/login">
                <Button size="lg" variant="outline" className="bg-white/10 border-2 border-white/25 text-white hover:bg-white/20 text-lg px-12 py-5 h-auto font-semibold" data-testid="button-login">
                  Login
                </Button>
              </Link>
            </div>
          )}
          
          <p className="text-sm text-white/70 drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)]">
            Join thousands of professionals already on HospoGo
          </p>
        </div>
      </div>
    </div>
  );
}
