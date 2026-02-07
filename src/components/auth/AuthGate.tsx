import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/** Hydration timeout: how long to wait before bypassing splash when no Firebase user (ms). */
const HYDRATION_TIMEOUT_MS = 10000;

/** Hard timeout: force bypass regardless of auth state to prevent infinite splash (ms). */
const HARD_TIMEOUT_MS = 20000;

/**
 * FINAL_HOSPOGO_STABILIZATION_PUSH: Electric Lime Hydration Splash
 *
 * Full-screen branded splash shown during the ~1148ms Firebase handshake window.
 * This prevents ALL nested components (Stripe, Xero, Analytics, Chat widgets) from
 * even attempting to render or fetch data, eliminating 401 console errors entirely.
 */
function HydrationSplash() {
  return (
    <div
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f1f0a 100%)',
      }}
      data-testid="hydration-splash"
      aria-hidden="true"
    >
      {/* HospoGo Logo with Electric Lime Glow */}
      <div className="flex flex-col items-center justify-center">
        <div
          className="text-5xl md:text-7xl font-black tracking-tight mb-4"
          style={{
            fontFamily: 'Urbanist, sans-serif',
            color: 'hsl(var(--primary))',
            textShadow: '0 0 40px hsl(var(--primary) / 0.3), 0 0 80px hsl(var(--primary) / 0.15)',
            letterSpacing: '-0.02em',
          }}
        >
          HospoGo
        </div>

        {/* Electric Lime Pulse Ring */}
        <div className="relative w-16 h-16 mt-6">
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              backgroundColor: 'hsl(var(--primary) / 0.15)',
              animationDuration: '1.5s',
            }}
          />
          <div
            className="absolute inset-2 rounded-full animate-pulse"
            style={{
              backgroundColor: 'hsl(var(--primary) / 0.25)',
              boxShadow: '0 0 20px hsl(var(--primary) / 0.25)',
            }}
          />
          <div
            className="absolute inset-4 rounded-full"
            style={{
              backgroundColor: 'hsl(var(--primary))',
              boxShadow: '0 0 30px hsl(var(--primary) / 0.4)',
            }}
          />
        </div>

        {/* Loading Text */}
        <div
          className="mt-8 text-sm tracking-widest uppercase"
          style={{
            color: 'hsl(var(--primary) / 0.5)',
            fontFamily: 'Urbanist, sans-serif',
            fontWeight: 500,
          }}
        >
          Initializing Engine...
        </div>
      </div>
    </div>
  );
}

/**
 * HOSPOGO_CORE_SYSTEM_RECOVERY: AuthGate (formerly HydrationGate)
 *
 * This component wraps ALL app content (including Analytics, Stripe, Xero integrations)
 * and blocks rendering until Firebase auth handshake is FULLY complete.
 *
 * The gate checks:
 * 1. isSystemReady - true when Firebase + user profile + venue check are complete
 * 2. user !== undefined - ensures the user object has been resolved (either to a user or null)
 *
 * CRITICAL: This prevents background "storms" because page components (Jobs, Calendar)
 * won't even exist in the DOM until the auth token is verified.
 *
 * Public routes (landing, status, waitlist, investor portal) bypass the gate.
 */
export function AuthGate({ children, splashHandled }: { children: React.ReactNode; splashHandled: boolean }) {
  const { isSystemReady, hasFirebaseUser } = useAuth();
  const location = useLocation();
  const [timedOut, setTimedOut] = useState(false);

  // FAIL-SAFE: Tiered timeout for Firebase handshake + backend cold starts.
  // Tier 1 (hydration timeout): Bypass splash ONLY if no Firebase user exists (guest/unauthenticated).
  //               If a Firebase user IS present, keep waiting — the profile is still hydrating.
  // Tier 2 (hard timeout): Force bypass regardless — prevents infinite splash on full API outage.
  useEffect(() => {
    if (isSystemReady) return; // Already ready, no timers needed

    const softTimer = setTimeout(() => {
      if (!isSystemReady && !hasFirebaseUser) {
        console.warn('[AuthGate] Firebase handshake timed out (no user); bypassing splash screen.');
        setTimedOut(true);
      } else if (!isSystemReady && hasFirebaseUser) {
        console.warn('[AuthGate] Soft timeout reached but Firebase user exists — waiting for hydration.');
      }
    }, HYDRATION_TIMEOUT_MS);

    const hardTimer = setTimeout(() => {
      if (!isSystemReady) {
        console.warn('[AuthGate] Hard timeout reached (20s); forcing splash bypass.');
        setTimedOut(true);
      }
    }, HARD_TIMEOUT_MS);

    return () => {
      clearTimeout(softTimer);
      clearTimeout(hardTimer);
    };
  }, [isSystemReady, hasFirebaseUser]);

  // POLISHED LANDING (v1.1.14): Landing (/) is NOT bypassed during auth init.
  // If we allowed / to bypass, logged-in users would see a flash of landing before redirect to /onboarding.
  // Only bypass splash for routes that truly never need auth (status, waitlist, investor portal, auth flows).
  const isPublicRoute =
    location.pathname === '/status' ||
    location.pathname === '/waitlist' ||
    location.pathname.startsWith('/investorportal') ||
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname === '/forgot-password' ||
    location.pathname.startsWith('/onboarding') ||
    location.pathname === '/oauth/callback' ||
    location.pathname === '/__/auth/handler';

  // Logic: Proceed if auth is ready, if we are on a public route (excluding /), OR if the tiered fail-safe triggered.
  // Note: user is User|null (never undefined) — the gate relies on isSystemReady for deterministic state.
  const shouldShowSplash = !isSystemReady && !isPublicRoute && !timedOut && splashHandled;

  if (shouldShowSplash) {
    return <HydrationSplash />;
  }

  return <>{children}</>;
}
