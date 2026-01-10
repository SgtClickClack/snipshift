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
    <div className="relative isolate w-full min-h-[85vh] max-h-[90vh] text-foreground overflow-hidden bg-background dark:bg-steel-900 border-b border-border flex items-end">
      {/* Hero image (replaces CSS background for better loading priority) */}
      <picture className="absolute inset-0 z-base" aria-hidden="true">
        <source type="image/webp" srcSet={heroWebpUrl} />
        <img
          src={heroJpgUrl}
          alt=""
          className="h-full w-full object-cover object-[center_35%] -translate-y-[3px] scale-[1.01]"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </picture>

      {/* Professional readability: subtle scrim + content panel */}
      <div className="absolute inset-0 z-base pointer-events-none bg-gradient-to-t from-black/70 via-black/15 to-black/45" aria-hidden="true" />

      <div className="relative z-elevated w-full pb-10 md:pb-16 pt-24 md:pt-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl text-left">
            <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md p-6 md:p-8 shadow-2xl">
              <p className="text-base md:text-xl text-white/85 leading-relaxed font-medium">
                Connect verified hospitality staff with venues for fast, flexible shift work
              </p>
          
              {isAuthenticated && user ? (
                <div className="mt-6">
                  <Link to={getDashboardLink()}>
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-light hover:to-red-accent text-white font-semibold text-base md:text-lg px-10 py-4 shadow-xl h-auto"
                      data-testid="button-go-to-dashboard"
                    >
                      Go to Dashboard
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="mt-6 flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                  <Link to="/signup">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-light hover:to-red-accent text-white font-semibold text-base md:text-lg px-10 py-4 shadow-xl h-auto"
                      data-testid="button-get-started"
                    >
                      Get Started
                    </Button>
                  </Link>
                  
                  <Link to="/login">
                    <Button
                      size="lg"
                      variant="outline"
                      className="bg-white/10 border-2 border-white/25 text-white hover:bg-white/20 text-base md:text-lg px-10 py-4 h-auto font-semibold"
                      data-testid="button-login"
                    >
                      Login
                    </Button>
                  </Link>
                </div>
              )}
          
              <p className="mt-4 text-sm text-white/70">
                Join thousands of professionals already on HospoGo
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
