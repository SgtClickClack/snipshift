import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardRoute } from "@/lib/roles";

export default function Hero() {
  const { user, isAuthenticated } = useAuth();
  const heroImageUrl = encodeURI("/hospogonewhero.png");
  
  // Determine dashboard route based on user role
  const getDashboardLink = () => {
    if (!user?.currentRole) {
      return '/dashboard';
    }
    return getDashboardRoute(user.currentRole as any);
  };
  
  return (
    <section className="relative isolate w-full min-h-[100vh] text-foreground overflow-hidden bg-black">
      {/* Hero image - full bleed background */}
      <img
        src={heroImageUrl}
        alt=""
        className="absolute inset-0 z-0 h-full w-full object-cover object-[center_35%]"
        loading="eager"
        fetchPriority="high"
        decoding="async"
        aria-hidden="true"
      />

      {/* Subtle gradient overlay - left edge only for text readability */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-r from-black/50 via-black/25 to-transparent"
        aria-hidden="true"
      />

      {/* Landing Header - Absolute positioned over hero */}
      <header className="absolute top-0 w-full z-50 py-8 px-6 md:px-12">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src="/hospogo-navbar-banner.png"
              alt="HospoGo"
              className="h-12 md:h-14 w-auto object-contain"
              loading="eager"
            />
          </Link>

          {/* Sign Up CTA - Ghost button style */}
          {!isAuthenticated && (
            <Link to="/signup">
              <Button
                variant="ghost"
                className="border border-white/40 text-white px-6 py-2 rounded-full font-semibold backdrop-blur-sm hover:bg-white/10 hover:border-white/60 transition-all"
              >
                SIGN UP
              </Button>
            </Link>
          )}

          {isAuthenticated && user && (
            <Link to={getDashboardLink()}>
              <Button
                variant="ghost"
                className="border border-white/40 text-white px-6 py-2 rounded-full font-semibold backdrop-blur-sm hover:bg-white/10 hover:border-white/60 transition-all"
              >
                Dashboard
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Content Grid - Left 50% */}
      <div className="relative z-10 w-full min-h-[100vh] grid grid-cols-1 lg:grid-cols-2">
        {/* Text Content - Left Side */}
        <div className="flex flex-col justify-center px-6 md:px-12 lg:px-16 py-32 md:py-40">
          <div className="max-w-xl">
            {/* Headline with emphasis on "Never Quits" */}
            <h2 
              className="text-5xl sm:text-6xl font-black tracking-tighter leading-tight mb-6 text-white"
              style={{ textShadow: '2px 2px 10px rgba(0,0,0,0.8)' }}
            >
              The Roster That{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-[#BFFF00]">Never Quits</span>
                <span
                  className="absolute bottom-1 left-0 w-full h-[3px] bg-[#BFFF00]/60 rounded-full"
                  aria-hidden="true"
                />
              </span>
              .
            </h2>

            {/* Subheadline */}
            <p 
              className="text-lg md:text-xl text-gray-200 max-w-md mb-8 leading-relaxed"
              style={{ textShadow: '1px 1px 5px rgba(0,0,0,0.5)' }}
            >
              Instant coverage for venues. Instant work for staff. The marketplace that keeps your business moving.
            </p>

            {/* Action Buttons */}
            {!isAuthenticated ? (
              <div className="flex gap-4 items-center">
                <Link to="/signup?role=hub">
                  <Button
                    className="h-12 flex items-center justify-center px-8 rounded-full font-bold transition-all bg-[#BFFF00] text-black hover:brightness-110"
                    data-testid="button-find-staff"
                  >
                    FIND STAFF
                  </Button>
                </Link>

                <Link to="/signup?role=professional">
                  <Button
                    variant="ghost"
                    className="h-12 flex items-center justify-center px-8 rounded-full font-bold transition-all border-2 border-white text-white hover:bg-white/10"
                    data-testid="button-find-shifts"
                  >
                    Find Shifts
                  </Button>
                </Link>
              </div>
            ) : (
              <Link to={getDashboardLink()}>
                <Button
                  className="h-12 flex items-center justify-center px-8 rounded-full font-bold transition-all bg-[#BFFF00] text-black hover:brightness-110"
                  data-testid="button-go-to-dashboard"
                >
                  Go to Dashboard
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Right Side - Empty (shows hero image through gradient) */}
        <div className="hidden lg:block" aria-hidden="true" />
      </div>
    </section>
  );
}
