/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import { browserLocalPersistence, onAuthStateChanged, setPersistence, signOut, type User as FirebaseUser } from 'firebase/auth';
import { logger } from '@/lib/logger';
import { cleanupPushNotifications } from '@/lib/push-notifications';
import { prefetchAuthData, queryClient } from '@/lib/queryClient';
import { QUERY_KEYS } from '@/lib/query-keys';

export interface User {
  id?: string;
  email: string;
  uid?: string;
  firebaseUid?: string;
  roles?: string[];
  currentRole?: string | null;
  isOnboarded?: boolean;
  hasCompletedOnboarding?: boolean;
  /** True when Firebase auth succeeded but user not yet in DB — needs to complete signup/onboarding */
  isUnregistered?: boolean;
  status?: string;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthReady: boolean; // Alias for !isLoading, used by some components
  isRedirecting: boolean; // True while a redirect is in progress (prevents route flash)
  /** True during the entire auth handshake (Firebase + API calls). Use for stable loading UI. */
  isTransitioning: boolean;
  /** True until hydrateFromFirebaseUser (including venue 200/404 check) has fully completed. Blocks router from mounting any route. */
  isNavigationLocked: boolean;
  isRegistered: boolean;
  hasUser: boolean; // Standardized: true when user object exists (DB profile loaded)
  hasFirebaseUser: boolean; // True when Firebase session exists
  /** True when user is onboarded but /api/venues/me returned 404 — stay on hub, do not redirect to dashboard */
  isVenueMissing: boolean;
  /** PERFORMANCE: True only when Firebase + user profile + venue check are ALL complete. Use for stable splash-to-app transition. */
  isSystemReady: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  /** Refreshes /api/me and /api/venues/me; keeps isRedirecting true during refresh. Returns venueReady (false if venue missing or 404/429 after retry). */
  refreshUser: () => Promise<{ venueReady: boolean }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** API base URL for fetch calls (e.g. '' for same-origin, or 'https://api.hospogo.com' if API is on another host). */
function getApiBase(): string {
  const base = import.meta.env.VITE_API_URL;
  if (typeof base === 'string' && base.trim()) {
    return base.trim().replace(/\/$/, '');
  }
  return '';
}

/** Paths where user is already in onboarding flow; do not redirect to /onboarding if already here */
function isOnboardingRoute(path: string): boolean {
  return path.startsWith('/onboarding') || path === '/role-selection';
}

/** Neutral routes: pages that should NOT trigger auth-based redirects (e.g. investor portal) */
function isNeutralRoute(path: string): boolean {
  return path.startsWith('/investorportal');
}

interface AuthProviderProps {
  children: ReactNode;
}

type AppUserResponse = {
  user: User | null;
  firebaseUser?: User | null;
  needsOnboarding?: boolean;
};

async function fetchAppUser(
  idToken: string, 
  isOnboardingMode: boolean = false,
  firebaseUser?: FirebaseUser | null
): Promise<AppUserResponse | null> {
  // Allow fetching user even in onboarding mode to resolve dependency deadlock
  // We need user.id for onboarding API calls (e.g. payout setup, venue profile creation)
  
  // Always attempt fetch so existing users (e.g. returning to /signup) get their profile and can be redirected to dashboard.
  const attemptFetch = async (token: string, isRetry: boolean = false): Promise<AppUserResponse | null> => {
    try {
      const res = await fetch(`${getApiBase()}/api/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (res.ok) {
        const data = (await res.json()) as
          | (User & { profile?: unknown; needsOnboarding?: boolean; isNewUser?: boolean })
          | { user: User | null; firebaseUser?: User | null; needsOnboarding?: boolean };
        if ('user' in data) {
          return {
            user: data.user,
            firebaseUser: data.firebaseUser ?? null,
            needsOnboarding: data.needsOnboarding,
          };
        }
        if (data.profile === null || data.isNewUser === true || data.needsOnboarding === true) {
          return {
            user: null,
            firebaseUser: {
              email: firebaseUser?.email ?? data.email ?? '',
              firebaseUid: firebaseUser?.uid,
              status: 'unregistered',
              isUnregistered: true,
              isOnboarded: false,
              hasCompletedOnboarding: false,
            },
            needsOnboarding: true,
          };
        }
        return { user: data as User };
      }

      // 404 is expected for brand new Firebase users that haven't been created in our DB yet.
      if (res.status === 404) {
        console.log('[AuthContext] /api/me returned 404 - user profile not found in DB (expected for new users)');
        return null;
      }

      // 401 during onboarding: suppress and skip token refresh (avoids retry loops)
      if (res.status === 401 && isOnboardingMode) {
        console.log('[AuthContext] /api/me returned 401 during onboarding - suppressing (suppress401)');
        return null;
      }

      // If we get a 401 and haven't retried yet, try refreshing the token and retrying (skip when suppress401)
      if (res.status === 401 && !isRetry && firebaseUser && !isOnboardingMode) {
        const errorText = await res.text().catch(() => 'Unable to read error response');
        console.log('[AuthContext] /api/me returned 401, refreshing token and retrying...', {
          error: errorText.substring(0, 200),
          hasToken: !!token,
          tokenLength: token?.length,
        });
        
        try {
          // Force refresh the token and retry
          const freshToken = await firebaseUser.getIdToken(/* forceRefresh */ true);
          console.log('[AuthContext] Token refreshed, retrying /api/me');
          return attemptFetch(freshToken, /* isRetry */ true);
        } catch (refreshError) {
          logger.error('AuthContext', 'Failed to refresh token for retry', refreshError);
          // Fall through to log the original 401 error
        }
      }

      // Log 401 errors with more context for debugging
      if (res.status === 401) {
        const errorText = await res.text().catch(() => 'Unable to read error response');
        logger.warn('AuthContext', 'Failed to fetch /api/me - 401 Unauthorized', { 
          status: res.status,
          error: errorText.substring(0, 200), // Limit error text length
          hasToken: !!token,
          tokenLength: token?.length,
          isRetry,
        });
        return null;
      }

      // Anything else: keep the app stable and treat as "no profile".
      logger.warn('AuthContext', 'Failed to fetch /api/me', { status: res.status });
      return null;
    } catch (error) {
      logger.error('AuthContext', 'Error fetching /api/me', error);
      return null;
    }
  };

  return attemptFetch(idToken);
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setRedirecting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(true); // True during entire auth handshake
  const [isNavigationLocked, setIsNavigationLocked] = useState(true);
  const [isRegistered, setIsRegistered] = useState(true);
  const [isVenueMissing, setIsVenueMissing] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  // PERFORMANCE: isSystemReady = Firebase ready + user profile resolved + venue check done
  // This provides a stable flag for splash-to-app transitions (no skeleton flicker)
  const [isSystemReady, setIsSystemReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Keep the current Firebase user without ever touching auth.currentUser.
  const firebaseUserRef = useRef<FirebaseUser | null>(null);
  // Track if we're in onboarding mode to prevent profile fetches
  const isOnboardingModeRef = useRef<boolean>(false);
  // Sync with isVenueMissing state so redirect logic can read it in the same tick
  const isVenueMissingRef = useRef<boolean>(false);
  /** 5-minute session cache for GET /api/venues/me: if we got 200 recently for this user, skip the blocking fetch so Dashboard mounts instantly. */
  const VENUE_CACHE_TTL_MS = 5 * 60 * 1000;
  const venueCacheRef = useRef<{ userId: string; cachedAt: number; hasVenue: boolean } | null>(null);

  // Clear redirecting flag after pathname has settled (prevents flash of wrong route).
  // Mobile gets extra 200ms so processors have time to render the redirect without flashing.
  useEffect(() => {
    if (!isRedirecting) return;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const settleMs = 50 + (isMobile ? 200 : 0);
    const t = setTimeout(() => setRedirecting(false), settleMs);
    return () => clearTimeout(t);
  }, [location.pathname, isRedirecting]);

  // Global body unlock: when auth handshake is done, re-enable scroll across all browsers
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isNavigationLocked) {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    }
  }, [isNavigationLocked]);

  // Safety timeout: force isNavigationLocked to false after 6s if API is hanging (prevents stuck skeleton)
  // Increased from 3s to 6s to accommodate slower networks while optimizing parallel fetches
  const NAVIGATION_LOCK_TIMEOUT_MS = 6000;
  useEffect(() => {
    if (!isNavigationLocked) return;
    const t = setTimeout(() => {
      setIsNavigationLocked(false);
      console.warn('[AuthContext] Navigation lock safety timeout (6s) — forcing unlock');
    }, NAVIGATION_LOCK_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [isNavigationLocked]);

  const login = useCallback((newUser: User) => {
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    // Cleanup push tokens in try/catch so a Firebase 400 never blocks or crashes logout
    try {
      await cleanupPushNotifications();
    } catch (err) {
      logger.warn('AuthContext', 'Push cleanup failed during logout (non-fatal)', err);
    }
    try {
      await signOut(auth);
    } catch (err) {
      logger.warn('AuthContext', 'Firebase signOut failed (clearing state anyway)', err);
    } finally {
      firebaseUserRef.current = null;
      setFirebaseUser(null);
      setUser(null);
      setToken(null);
      setIsRegistered(false);
      isVenueMissingRef.current = false;
      setIsVenueMissing(false);
      venueCacheRef.current = null;
      // Always redirect to landing so user never stays on a protected page after sign-out
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const hydrateFromFirebaseUser = useCallback(async (firebaseUser: FirebaseUser) => {
    console.log('[AuthContext] Hydrating user from Firebase', { 
      uid: firebaseUser.uid, 
      email: firebaseUser.email 
    });

    // Mark transition start - UI should show stable loading state
    setIsTransitioning(true);
    setIsSystemReady(false); // Reset until all checks complete

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    if (currentPath.startsWith('/signup') || currentPath.startsWith('/onboarding')) {
      setIsNavigationLocked(false);
    }

    // Get fresh token
    const idToken = await firebaseUser.getIdToken(/* forceRefresh */ true);
    setToken(idToken);

    const effectivelyOnboarding = currentPath.startsWith('/onboarding') || currentPath === '/signup' || currentPath === '/role-selection' || isOnboardingModeRef.current;

    // PERFORMANCE: Fetch user and venue data in PARALLEL instead of sequential waterfall
    // This reduces TTI by ~300-500ms for venue users
    console.log('[AuthContext] Starting parallel fetch for /api/me and /api/venues/me');
    const parallelStartTime = Date.now();
    
    const [userResult, venueResult] = await Promise.allSettled([
      fetchAppUser(idToken, effectivelyOnboarding, firebaseUser),
      // Fetch venue data in parallel (will be used if user is a venue role)
      fetch(`${getApiBase()}/api/venues/me`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }).then(res => {
        if (res.ok) return res.json();
        if (res.status === 404) return { __notFound: true };
        if (res.status === 429) return { __rateLimited: true };
        return null;
      }).catch(() => null),
    ]);

    const parallelDuration = Date.now() - parallelStartTime;
    console.log('[AuthContext] Parallel fetch completed', { durationMs: parallelDuration });

    // Extract results
    const apiResponse = userResult.status === 'fulfilled' ? userResult.value : null;
    const venueData = venueResult.status === 'fulfilled' ? venueResult.value : null;

    // Warm React Query cache with the fetched data
    if (apiResponse?.user) {
      queryClient.setQueryData([QUERY_KEYS.CURRENT_USER], apiResponse.user);
    }
    if (venueData && !venueData.__notFound && !venueData.__rateLimited) {
      queryClient.setQueryData([QUERY_KEYS.CURRENT_VENUE], venueData);
    }

    if (apiResponse) {
      if (apiResponse.user === null && firebaseUser.uid) {
        isOnboardingModeRef.current = true;
        setIsRegistered(false);
        setIsNavigationLocked(false);
        setIsTransitioning(false);
        setIsSystemReady(true); // Auth complete (needs onboarding)
        setUser(null);
        return;
      }

      // Valid profile: stop suppressing; set user and force redirect to dashboard.
      isOnboardingModeRef.current = false;
      setIsRegistered(true);
      const apiUser = apiResponse.user;
      if (!apiUser) {
        setUser(null);
        setIsTransitioning(false);
        setIsSystemReady(true); // Auth complete (no user profile)
        return;
      }
      // Verify the user record exists and matches Firebase UID
      const userFirebaseUid = apiUser.uid || (apiUser as any).firebase_uid;
      const tokenFirebaseUid = firebaseUser.uid;
      
      if (userFirebaseUid && tokenFirebaseUid && userFirebaseUid !== tokenFirebaseUid) {
        console.warn('[AuthContext] Firebase UID mismatch between token and user record', {
          tokenUid: tokenFirebaseUid,
          userUid: userFirebaseUid,
          userId: apiUser.id
        });
      }
      
      // Single source of truth: derive hasCompletedOnboarding from API isOnboarded
      const isOnboarded = apiUser.isOnboarded === true;
      const normalizedUser: User = {
        ...apiUser,
        uid: firebaseUser.uid,
        hasCompletedOnboarding: isOnboarded,
      };
      console.log('[AuthContext] User profile fetched successfully', {
        id: apiUser.id,
        isOnboarded: apiUser.isOnboarded,
        hasCompletedOnboarding: normalizedUser.hasCompletedOnboarding,
        firebaseUid: userFirebaseUid || tokenFirebaseUid,
        firebaseUidMatch: userFirebaseUid === tokenFirebaseUid,
      });
      setUser(normalizedUser);

      // PERFORMANCE OPTIMIZATION: Release navigation lock as soon as user profile is available
      // This allows the UI to start rendering while venue data streams in as non-blocking update
      // The redirect logic below will handle venue-missing cases after navigation is unlocked
      setIsNavigationLocked(false);

      // Determine role and venue requirements
      const role = (apiUser.currentRole || apiUser.role || '').toLowerCase();
      const isVenueRole = role === 'business' || role === 'venue' || role === 'hub' ||
        (apiUser.roles || []).some((r: string) => ['business', 'venue', 'hub'].includes((r || '').toLowerCase()));
      const shouldCheckVenue = isVenueRole && role !== 'pending_onboarding';

      if (isOnboarded) {
        // Data integrity: venue users must have a venue record
        if (shouldCheckVenue) {
          if (!apiUser.id) {
            setIsTransitioning(false);
            setIsSystemReady(true); // Auth complete (invalid user state)
            return;
          }
          
          // Check session cache first
          if (isVenueMissingRef.current) {
            setUser((prev) => prev ? { ...prev, isOnboarded: false, hasCompletedOnboarding: false } : null);
            setIsVenueMissing(true);
            setIsTransitioning(false);
            setIsSystemReady(true); // Auth complete (needs venue setup)
            if (typeof window !== 'undefined' && window.location.pathname !== '/onboarding/hub') {
              setRedirecting(true);
              navigate('/onboarding/hub', { replace: true });
            } else {
              setRedirecting(false);
            }
            return;
          }

          // Check 5-minute cache
          const cached = venueCacheRef.current;
          const now = Date.now();
          if (cached && cached.userId === firebaseUser.uid && (now - cached.cachedAt) < VENUE_CACHE_TTL_MS && cached.hasVenue) {
            isVenueMissingRef.current = false;
            setIsVenueMissing(false);
            setIsTransitioning(false);
            setIsSystemReady(true); // Auth complete (venue cached)
            const targetPath = '/venue/dashboard';
            if (location.pathname === targetPath) {
              setRedirecting(false);
            } else {
              setRedirecting(true);
              navigate(targetPath, { replace: true });
            }
            return;
          }

          // Use the parallel-fetched venue data instead of making another request
          if (venueData) {
            if (venueData.__notFound || venueData.__rateLimited) {
              console.log('[AuthContext] Venue check from parallel fetch:', venueData.__notFound ? '404' : '429');
              isVenueMissingRef.current = true;
              setIsVenueMissing(true);
              setUser((prev) => prev ? { ...prev, isOnboarded: false, hasCompletedOnboarding: false } : null);
              setIsTransitioning(false);
              setIsSystemReady(true); // Auth complete (needs venue setup)
              if (typeof window !== 'undefined' && window.location.pathname !== '/onboarding/hub') {
                setRedirecting(true);
                navigate('/onboarding/hub', { replace: true });
              } else {
                setRedirecting(false);
              }
              return;
            }
            // Venue exists
            isVenueMissingRef.current = false;
            setIsVenueMissing(false);
            venueCacheRef.current = { userId: firebaseUser.uid, cachedAt: Date.now(), hasVenue: true };
          } else {
            // Parallel fetch failed - fallback to treating as missing
            logger.warn('AuthContext', 'Parallel venue fetch returned null - treating as missing');
            isVenueMissingRef.current = true;
            setIsVenueMissing(true);
            setUser((prev) => prev ? { ...prev, isOnboarded: false, hasCompletedOnboarding: false } : null);
            setIsTransitioning(false);
            setIsSystemReady(true); // Auth complete (needs venue setup)
            if (typeof window !== 'undefined' && window.location.pathname !== '/onboarding/hub') {
              setRedirecting(true);
              navigate('/onboarding/hub', { replace: true });
            } else {
              setRedirecting(false);
            }
            return;
          }
        }

        // Final venue missing check
        if (isVenueMissingRef.current) {
          setIsTransitioning(false);
          setIsSystemReady(true); // Auth complete (needs venue setup)
          if (typeof window !== 'undefined' && window.location.pathname !== '/onboarding/hub') {
            setRedirecting(true);
            navigate('/onboarding/hub', { replace: true });
          } else {
            setRedirecting(false);
          }
          return;
        }

        const targetPath = isVenueRole ? '/venue/dashboard' : '/dashboard';
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        
        // Neutral route check: allow investor portal to remain visible even for logged-in users
        if (isNeutralRoute(currentPath)) {
          console.log('[AuthContext] User is onboarded but on neutral route — skipping redirect', { currentPath });
          setIsTransitioning(false);
          setIsSystemReady(true);
          setRedirecting(false);
        } else {
          console.log('[AuthContext] User is onboarded — redirecting to', targetPath);
          setIsTransitioning(false);
          setIsSystemReady(true); // Auth complete - system ready
          if (location.pathname === targetPath) {
            setRedirecting(false);
          } else {
            setRedirecting(true);
            navigate(targetPath, { replace: true });
          }
        }
      } else {
        // Not onboarded yet
        setIsTransitioning(false);
        setIsSystemReady(true); // Auth complete (user needs onboarding but system is ready)
      }
      
      // Clear auth-related URL parameters
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const hasApiKey = searchParams.has('apiKey');
        const hasAuthMode = searchParams.get('mode') === 'signIn' || searchParams.get('mode') === 'signUp';
        
        if (hasApiKey || hasAuthMode) {
          console.log('[AuthContext] Clearing auth-related URL parameters after user confirmation');
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        }
      }
    } else {
      // No profile: new user or still registering
      if (currentPath.startsWith('/onboarding') || currentPath === '/signup' || currentPath === '/role-selection') {
        isOnboardingModeRef.current = true;
        console.log('[AuthContext] No user profile in DB (404) - on signup/onboarding, keeping user null');
      }
      setIsRegistered(false);
      setUser(null);
      setIsTransitioning(false);
      setIsSystemReady(true); // Auth complete (no user, but system is ready)
    }
  }, [navigate, location.pathname]);

  const refreshUser = useCallback(async (): Promise<{ venueReady: boolean }> => {
    const firebaseUser = firebaseUserRef.current;
    if (!firebaseUser) return { venueReady: false };
    
    // CRITICAL: Skip refresh on signup route to prevent 401/404 polling loop
    // But allow on onboarding routes to support step progression
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isOnSignup = currentPath === '/signup';
    
    if (isOnSignup) {
      console.log('[AuthContext] On signup route - suppressing profile refresh', {
        pathname: currentPath
      });
      return { venueReady: false };
    }
    
    // Clear onboarding mode flag if we're not on signup/onboarding route
    isOnboardingModeRef.current = false;
    
    setRedirecting(true);
    setIsTransitioning(true);
    try {
      await hydrateFromFirebaseUser(firebaseUser);
      return { venueReady: !isVenueMissingRef.current };
    } catch (error) {
      logger.error('AuthContext', 'refreshUser failed', error);
      return { venueReady: false };
    } finally {
      setRedirecting(false);
      setIsTransitioning(false);
    }
  }, [hydrateFromFirebaseUser]);

  // Track pathname changes to keep onboarding mode flag in sync
  // This ensures we suppress fetches / treat 401 as expected when still in registration flow.
  // Include /role-selection so 401 from /api/me during role choice is not treated as "auth failed".
  useEffect(() => {
    const isOnSignupOrOnboarding = location.pathname.startsWith('/onboarding') || 
                                   location.pathname === '/signup' ||
                                   location.pathname === '/role-selection';
    if (isOnSignupOrOnboarding) {
      setIsNavigationLocked(false);
    }
    isOnboardingModeRef.current = isOnSignupOrOnboarding;
    if (location.pathname === '/signup') {
      setIsNavigationLocked(false);
    }
    if (isOnSignupOrOnboarding) {
      console.log('[AuthContext] Pathname changed - onboarding/registration mode active', {
        pathname: location.pathname
      });
    }
  }, [location.pathname]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let isInitialAuthCheck = true;

    // Minimalist: functional modular calls only.
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      logger.error('AuthContext', 'Failed to set Firebase persistence', error);
    });

    // Primary async function to handle the complete auth handshake
    const initializeAuth = async () => {
      // E2E Bypass: Check for test user in sessionStorage (or localStorage when restored from Playwright storageState)
      if (typeof window !== 'undefined') {
        const e2eUserStr = sessionStorage.getItem('hospogo_test_user') || localStorage.getItem('hospogo_test_user');
        if (e2eUserStr) {
          try {
            const e2eUser = JSON.parse(e2eUserStr);
            console.log('[AuthContext] E2E Test User detected:', e2eUser);
            
            // Apply Dashboard Phase override if needed
            if (sessionStorage.getItem('E2E_DASHBOARD_PHASE')) {
              console.log('[AuthContext] E2E Dashboard Phase detected - Forcing onboarding completion');
              e2eUser.hasCompletedOnboarding = true;
              e2eUser.isOnboarded = true;
            }
            
            setUser(e2eUser);
            setToken('mock-e2e-token'); // So pages that check token (e.g. role-selection) don't stay on loader
            setIsRegistered(true);
            setIsLoading(false);
            setIsNavigationLocked(false);
            return; // Skip Firebase listener in E2E mode if test user is forced
          } catch (e) {
            console.error('[AuthContext] Failed to parse E2E test user', e);
          }
        }
      }

      try {
        // POPUP-ONLY FLOW: Bypass redirect check entirely
        // onAuthStateChanged is now the ONLY authority for initial user hydration
        console.log('[AuthContext] Bypassing redirect check - relying on popup state.');

        // onAuthStateChanged is the sole listener for auth state
        // It fires immediately when signInWithPopup completes, providing a direct identity signal
        await new Promise<void>((resolve) => {
          unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            const path = typeof window !== 'undefined' ? window.location.pathname : '';
            if (path.startsWith('/signup') || path.startsWith('/onboarding')) {
              setIsNavigationLocked(false);
            }
            firebaseUserRef.current = firebaseUser;
            setFirebaseUser(firebaseUser);

            // Early unlock: on signup/onboarding, don't block UI on /api/me — show form immediately
            if (path === '/signup' || path.startsWith('/onboarding') || path === '/role-selection') {
              setIsNavigationLocked(false);
            }

            try {
              if (!firebaseUser) {
                setUser(null);
                setToken(null);
                setIsRegistered(false);
                setIsSystemReady(true); // No Firebase user - system ready for landing/login
              } else {
                await hydrateFromFirebaseUser(firebaseUser);
                
                // CRITICAL: Immediate navigation for popup flow results
                // This ensures navigation happens inside the popup promise resolution,
                // bypassing Chrome's bounce tracking mitigations
                // Only navigate if we're on auth pages and user is authenticated
                if (!isInitialAuthCheck) {
                  const currentPath = window.location.pathname;
                  if (currentPath === '/login') {
                    const target = isVenueMissingRef.current ? '/onboarding/hub' : '/dashboard';
                    console.log('[AuthContext] Popup auth successful, navigating to', target);
                    if (window.location.pathname === target) {
                      setRedirecting(false);
                    } else {
                      setRedirecting(true);
                      navigate(target, { replace: true });
                    }
                  }
                }
              }
            } catch (error) {
              logger.error('AuthContext', 'Auth hydration failed', error);
              setUser(null);
              setToken(null);
              setIsSystemReady(true); // Error state - system ready for error handling
            }

            // Resolve the Promise after the first callback (initial auth check)
            if (isInitialAuthCheck) {
              isInitialAuthCheck = false;
              resolve();
            }
          });
        });

        // onAuthStateChanged has completed - hydrateFromFirebaseUser (including venue 200/404) is done
        console.log('[AuthContext] Handshake is Complete (popup-only flow)');
        
        // DEBUG: Log current Firebase state
        console.log('[Auth] Current Firebase User:', auth.currentUser);
        
        setIsLoading(false);
        setIsNavigationLocked(false);
      } catch (error) {
        logger.error('AuthContext', 'Auth initialization failed', error);
        setUser(null);
        setToken(null);
        setIsLoading(false);
        setIsNavigationLocked(false);
        setIsSystemReady(true); // Error state - system ready for error handling
      }
    };

    // Execute the async initialization
    initializeAuth();

    return () => {
      if (unsub) unsub();
    };
  }, [hydrateFromFirebaseUser, navigate]);

  // Detect Firebase auth params in URL (apiKey, mode=signIn, etc.)
  // These indicate the user just completed popup auth and landed on home page
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isLoading) return; // Wait for auth to settle

    // Landing gate: if user is NOT logged in, never redirect away from '/' (allow landing to stay)
    // Also skip redirect logic for neutral routes (investor portal)
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/signup') || currentPath.startsWith('/onboarding') || isNeutralRoute(currentPath)) return;
    const hasFirebaseUserNow = !!firebaseUserRef.current || !!auth.currentUser;
    if (currentPath === '/' && !hasFirebaseUserNow) return;

    const searchParams = new URLSearchParams(window.location.search);
    const hasApiKey = searchParams.has('apiKey');
    const hasAuthMode = searchParams.get('mode') === 'signIn' || searchParams.get('mode') === 'signUp';

    if (hasApiKey || hasAuthMode) {
      const currentFirebaseUser = firebaseUserRef.current || auth.currentUser;
      const hasFirebaseUser = !!currentFirebaseUser;

      if (hasFirebaseUser) {
        const pathForNav = window.location.pathname;
        const explicitlyOnboarded = user && user.isOnboarded === true;
        const venueMissing = isVenueMissingRef.current;

        // Onboarding priority: only go to /onboarding if isOnboarded is not true; otherwise dashboard
        // Do NOT send to dashboard if venue check failed with 404 — keep on hub
        const targetPath = explicitlyOnboarded
          ? (venueMissing ? '/onboarding/hub' : '/dashboard')
          : isOnboardingRoute(pathForNav)
            ? pathForNav
            : '/onboarding';

        if (targetPath === pathForNav) return; // Already on correct route

        console.log('[AuthContext] Auth params detected + user authenticated, forcing navigation to', targetPath);

        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);

        setRedirecting(true);
        navigate(targetPath, { replace: true });
      }
    }
  }, [isLoading, token, user, navigate]);

  // useEffect that monitors user and loading: redirect authenticated users away from login/signup only.
  // Landing gate: if user is NOT logged in, do nothing — they are ALWAYS allowed to stay on '/' (landing).
  useEffect(() => {
    if (isLoading || !user) return;

    const currentPath = window.location.pathname;
    if (currentPath !== '/login' && currentPath !== '/signup') return;
    if (currentPath === '/signup') return;

      // Clear any remaining auth-related URL parameters (failsafe)
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const hasApiKey = searchParams.has('apiKey');
        const hasAuthMode = searchParams.get('mode') === 'signIn' || searchParams.get('mode') === 'signUp';

        if (hasApiKey || hasAuthMode) {
          console.log('[AuthContext] Clearing remaining auth URL parameters (failsafe)');
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        }
      }

      const isOnboarded = user.isOnboarded === true;
      const venueMissing = isVenueMissingRef.current;

      if (isOnboarded) {
        if (venueMissing) {
          if (currentPath !== '/onboarding/hub') {
            console.log('[Auth] User onboarded but venue missing, redirecting from', currentPath, 'to /onboarding/hub');
            setRedirecting(true);
            navigate('/onboarding/hub', { replace: true });
          } else {
            setRedirecting(false);
          }
        } else {
          console.log('[Auth] User is onboarded, redirecting from', currentPath, 'to /dashboard');
          if (currentPath === '/dashboard') {
            setRedirecting(false);
          } else {
            setRedirecting(true);
            navigate('/dashboard', { replace: true });
          }
        }
      } else {
        // Only send to onboarding when isOnboarded is explicitly false (or unset)
        if (!isOnboardingRoute(currentPath)) {
          console.log('[Auth] User not onboarded, redirecting from', currentPath, 'to /onboarding');
          setRedirecting(true);
          navigate('/onboarding', { replace: true });
        } else {
          setRedirecting(false);
        }
      }
  }, [user, isLoading, navigate]);

  // Failsafe: Clean URL parameters when user successfully lands on dashboard
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isLoading) return;
    if (!user) return;
    
    const currentPath = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const hasApiKey = searchParams.has('apiKey');
    const hasAuthMode = searchParams.get('mode') === 'signIn' || searchParams.get('mode') === 'signUp';
    
    // If user is on dashboard and URL has auth parameters, clean them
    if ((currentPath === '/dashboard' || currentPath.startsWith('/dashboard/')) && (hasApiKey || hasAuthMode)) {
      console.log('[AuthContext] Failsafe: Cleaning auth URL parameters on dashboard');
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, [user, isLoading]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isLoading,
      isAuthReady: !isLoading,
      isRedirecting,
      isTransitioning,
      isNavigationLocked,
      isRegistered,
      hasUser: !!user,
      hasFirebaseUser: !!firebaseUser,
      isVenueMissing,
      isSystemReady,
      login,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, isRedirecting, isTransitioning, isNavigationLocked, isRegistered, isVenueMissing, isSystemReady, firebaseUser, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
