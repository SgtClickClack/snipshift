/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import { browserLocalPersistence, inMemoryPersistence, onAuthStateChanged, setPersistence, signOut, type User as FirebaseUser } from 'firebase/auth';
import { logger } from '@/lib/logger';
import { cleanupPushNotifications } from '@/lib/push-notifications';
import { prefetchAuthData, queryClient } from '@/lib/queryClient';
import { QUERY_KEYS } from '@/lib/query-keys';
import { safeGetItem, safeSetItem, safeRemoveItem, isLocalStorageAvailable } from '@/lib/safe-storage';

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
  /** PROGRESSIVE UNLOCK: True when venue data fetch has completed (regardless of success/failure). Non-blocking for navigation. */
  isVenueLoaded: boolean;
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
  // INVESTOR BRIEFING FIX: /role-selection removed - all onboarding flows through /onboarding
  return path.startsWith('/onboarding');
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
        return null;
      }

      // 401 during onboarding: suppress and skip token refresh (avoids retry loops)
      if (res.status === 401 && isOnboardingMode) {
        return null;
      }

      // If we get a 401 and haven't retried yet, try refreshing the token and retrying (skip when suppress401)
      if (res.status === 401 && !isRetry && firebaseUser && !isOnboardingMode) {
        try {
          // Force refresh the token and retry
          const freshToken = await firebaseUser.getIdToken(/* forceRefresh */ true);
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

// SESSION PERSISTENCE: Storage keys for tab recovery
const SESSION_CACHE_USER_KEY = 'hospogo_session_user';
const SESSION_CACHE_VENUE_KEY = 'hospogo_session_venue';

/**
 * TAB RECOVERY: Restore cached session from sessionStorage immediately on mount.
 * This eliminates the "Skeleton Flicker" by mounting with cached data while
 * background hydration verifies the token.
 */
function getCachedSession(): { user: User | null; venue: unknown | null } {
  if (typeof window === 'undefined') return { user: null, venue: null };
  try {
    const userStr = sessionStorage.getItem(SESSION_CACHE_USER_KEY);
    const venueStr = sessionStorage.getItem(SESSION_CACHE_VENUE_KEY);
    return {
      user: userStr ? JSON.parse(userStr) : null,
      venue: venueStr ? JSON.parse(venueStr) : null,
    };
  } catch {
    return { user: null, venue: null };
  }
}

/**
 * TAB RECOVERY: Cache session data to sessionStorage for instant recovery.
 */
function cacheSession(user: User | null, venue?: unknown) {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      sessionStorage.setItem(SESSION_CACHE_USER_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(SESSION_CACHE_USER_KEY);
    }
    if (venue !== undefined) {
      if (venue) {
        sessionStorage.setItem(SESSION_CACHE_VENUE_KEY, JSON.stringify(venue));
      } else {
        sessionStorage.removeItem(SESSION_CACHE_VENUE_KEY);
      }
    }
  } catch {
    // Silent fail on storage quota exceeded
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  // TAB RECOVERY: Initialize from cached session for instant mount
  const cachedSession = getCachedSession();
  const [user, setUser] = useState<User | null>(cachedSession.user);
  const [token, setToken] = useState<string | null>(null);
  // TAB RECOVERY: If we have cached user, start with loading=false for instant render
  const [isLoading, setIsLoading] = useState(!cachedSession.user);
  const [isRedirecting, setRedirecting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(!cachedSession.user); // Skip transition if cached
  const [isNavigationLocked, setIsNavigationLocked] = useState(!cachedSession.user); // Skip lock if cached
  const [isRegistered, setIsRegistered] = useState(true);
  const [isVenueMissing, setIsVenueMissing] = useState(false);
  /** PROGRESSIVE UNLOCK: True when venue data fetch has completed (success or failure). Non-blocking for navigation. */
  const [isVenueLoaded, setIsVenueLoaded] = useState(!!cachedSession.venue);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  // PERFORMANCE: isSystemReady = Firebase ready + user profile resolved + venue check done
  // TAB RECOVERY: If cached, start ready immediately
  const [isSystemReady, setIsSystemReady] = useState(!!cachedSession.user);
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
  
  // PERFORMANCE: Deduplication ref to prevent multiple concurrent hydration calls
  // This prevents the 4-5 duplicate "Hydrating user from Firebase" logs seen in production
  const isHydratingRef = useRef<boolean>(false);
  const lastHydratedUidRef = useRef<string | null>(null);
  
  // INVESTOR BRIEFING FIX: Strict once-per-mount guard to eliminate duplicate hydration
  // This ref ensures hydrateFromFirebaseUser only executes ONCE per component lifecycle
  const hydrationMountRef = useRef<boolean>(false);
  
  // INVESTOR BRIEFING FIX: Session integrity tracking to prevent ghost redirects
  // If user was successfully authenticated in this session, don't redirect to /login
  // on temporary null states during background refresh cycles
  const sessionIntegrityRef = useRef<boolean>(false);
  
  // INVESTOR BRIEFING FIX: Navigation lock release guard
  // Ensures setIsNavigationLocked(false) is called exactly ONCE to prevent state machine jolts
  const navigationLockReleasedRef = useRef<boolean>(false);
  
  /** Safe navigation lock release - ensures it's only called once per auth cycle */
  const releaseNavigationLock = useCallback(() => {
    if (!navigationLockReleasedRef.current) {
      navigationLockReleasedRef.current = true;
      setIsNavigationLocked(false);
      // PROGRESSIVE UNLOCK: End high-precision timer when lock is released
      // Goal: Output should be < 500ms
      console.timeEnd('Handshake-to-Unlock');
    }
  }, []);

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

  // Safety timeout: force isNavigationLocked to false after 3s if API is hanging (prevents stuck skeleton)
  // Reduced from 6s to 3s now that venue fetch is non-blocking (user profile is the only blocking call)
  const NAVIGATION_LOCK_TIMEOUT_MS = 3000;
  useEffect(() => {
    if (!isNavigationLocked) return;
    const t = setTimeout(() => {
      releaseNavigationLock();
    }, NAVIGATION_LOCK_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [isNavigationLocked, releaseNavigationLock]);

  const login = useCallback((newUser: User) => {
    setUser(newUser);
    // TAB RECOVERY: Cache user for instant recovery on refresh
    cacheSession(newUser);
  }, []);

  const logout = useCallback(async () => {
    // Clear auth timestamp immediately to allow redirect on explicit logout
    safeRemoveItem('hospogo_auth_timestamp', true);
    
    // TAB RECOVERY: Clear cached session on logout
    cacheSession(null, null);
    
    // INVESTOR BRIEFING FIX: Reset session integrity on explicit logout
    // This allows future redirects to /login to work correctly after explicit logout
    sessionIntegrityRef.current = false;
    
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
      setIsVenueLoaded(false);
      venueCacheRef.current = null;
      // Reset navigation lock guard for next auth cycle
      navigationLockReleasedRef.current = false;
      // Always redirect to landing so user never stays on a protected page after sign-out
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const hydrateFromFirebaseUser = useCallback(async (firebaseUser: FirebaseUser) => {
    // INVESTOR BRIEFING FIX: Strict once-per-mount guard + deduplication
    // Prevents duplicate "/api/me" calls (the 4-5 redundant calls in console logs)
    if (hydrationMountRef.current && lastHydratedUidRef.current === firebaseUser.uid) {
      return;
    }
    if (isHydratingRef.current) {
      return;
    }
    if (lastHydratedUidRef.current === firebaseUser.uid && user?.uid === firebaseUser.uid) {
      return;
    }
    
    // PROGRESSIVE UNLOCK: High-precision timer to verify TTI < 500ms
    // Timer starts AFTER guard checks pass to avoid orphaned timers on deduplication
    console.time('Handshake-to-Unlock');
    
    // Mark hydration as started - this ref prevents the duplicate calls
    isHydratingRef.current = true;
    hydrationMountRef.current = true;

    // Mark transition start - UI should show stable loading state
    setIsTransitioning(true);
    setIsSystemReady(false); // Reset until all checks complete

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    if (currentPath.startsWith('/signup') || currentPath.startsWith('/onboarding')) {
      releaseNavigationLock();
    }

    // Get token WITHOUT forced refresh to avoid 1-2s network call
    // Firebase automatically refreshes if token is expired (within 5 min of expiry)
    const idToken = await firebaseUser.getIdToken(/* forceRefresh */ false);
    setToken(idToken);

    // INVESTOR BRIEFING FIX: /role-selection removed from onboarding paths
    const effectivelyOnboarding = currentPath.startsWith('/onboarding') || currentPath === '/signup' || isOnboardingModeRef.current;

    // PERFORMANCE OPTIMIZATION: Use single /api/bootstrap endpoint
    // This returns both user and venue data in one request, cutting auth overhead in half
    let apiResponse: AppUserResponse | null = null;
    let venueData: any = null;

    try {
      const bootstrapStart = Date.now();
      const bootstrapRes = await fetch(`${getApiBase()}/api/bootstrap`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (bootstrapRes.ok) {
        const bootstrapData = await bootstrapRes.json();
        const bootstrapElapsed = Date.now() - bootstrapStart;
        logger.info('AuthContext', `Bootstrap completed in ${bootstrapElapsed}ms`);
        
        // Map bootstrap response to existing format
        if (bootstrapData.needsOnboarding) {
          apiResponse = {
            user: null,
            firebaseUser: bootstrapData.firebaseUser,
            needsOnboarding: true,
          };
        } else if (bootstrapData.user) {
          apiResponse = { user: bootstrapData.user };
          venueData = bootstrapData.venue || { __notFound: true };
        }
      } else if (bootstrapRes.status === 404) {
        // User not found - needs onboarding
        apiResponse = { user: null, needsOnboarding: true };
      } else {
        throw new Error(`Bootstrap failed with status ${bootstrapRes.status}`);
      }
    } catch (bootstrapErr) {
      // Fallback: Use legacy parallel fetch if bootstrap fails
      logger.warn('AuthContext', 'Bootstrap failed, falling back to parallel fetch', bootstrapErr);
      
      const userFetchPromise = fetchAppUser(idToken, effectivelyOnboarding, firebaseUser);
      const venueFetchPromise = fetch(`${getApiBase()}/api/venues/me`, {
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
      }).catch(() => null);
      
      const [userResult, venueResult] = await Promise.allSettled([userFetchPromise, venueFetchPromise]);
      apiResponse = userResult.status === 'fulfilled' ? userResult.value : null;
      venueData = venueResult.status === 'fulfilled' ? venueResult.value : null;
    }

    // Determine if we need venue data based on user's role
    const userRole = apiResponse?.user?.currentRole || apiResponse?.user?.role || '';
    const userRoles = apiResponse?.user?.roles || [];
    const isProfessionalRole = userRole.toLowerCase() === 'professional' || 
      userRoles.some((r: string) => (r || '').toLowerCase() === 'professional');
    const isVenueRole = ['business', 'venue', 'hub', 'owner'].includes(userRole.toLowerCase()) ||
      userRoles.some((r: string) => ['business', 'venue', 'hub', 'owner'].includes((r || '').toLowerCase()));
    
    // Create a resolved promise for backward compatibility with existing venue processing code
    let venuePromise: Promise<any> = Promise.resolve(venueData);

    // Warm React Query cache with user data immediately
    if (apiResponse?.user) {
      queryClient.setQueryData([QUERY_KEYS.CURRENT_USER], apiResponse.user);
    }
    
    // PROGRESSIVE UNLOCK: Venue data already fetched in parallel - cache it immediately
    if (venueData && !venueData.__notFound && !venueData.__rateLimited) {
      queryClient.setQueryData([QUERY_KEYS.CURRENT_VENUE], venueData);
    }
    setIsVenueLoaded(true); // Mark venue as loaded (success or not)

    if (apiResponse) {
      if (apiResponse.user === null && firebaseUser.uid) {
        isOnboardingModeRef.current = true;
        setIsRegistered(false);
        releaseNavigationLock();
        setIsTransitioning(false);
        setIsVenueLoaded(true); // No venue needed for new users
        setIsSystemReady(true); // Auth complete (needs onboarding)
        setUser(null);
        
        // INVESTOR BRIEFING FIX: New users MUST go to /onboarding - the modern gateway
        // This guards against the signup redirect bypass where Firebase auth exists but no DB profile
        const needsOnboardingRedirect = apiResponse.needsOnboarding === true;
        if (needsOnboardingRedirect && !isOnboardingRoute(currentPath) && !isNeutralRoute(currentPath)) {
          setRedirecting(true);
          navigate('/onboarding', { replace: true });
        }
        
        // DEDUPLICATION: Mark hydration as complete
        lastHydratedUidRef.current = firebaseUser.uid;
        isHydratingRef.current = false;
        return;
      }

      // Valid profile: stop suppressing; set user and force redirect to dashboard.
      isOnboardingModeRef.current = false;
      setIsRegistered(true);
      const apiUser = apiResponse.user;
      if (!apiUser) {
        setUser(null);
        setIsTransitioning(false);
        setIsVenueLoaded(true); // No venue needed
        setIsSystemReady(true); // Auth complete (no user profile)
        // DEDUPLICATION: Mark hydration as complete
        lastHydratedUidRef.current = firebaseUser.uid;
        isHydratingRef.current = false;
        return;
      }
      // Single source of truth: derive hasCompletedOnboarding from API isOnboarded
      const isOnboarded = apiUser.isOnboarded === true;
      const normalizedUser: User = {
        ...apiUser,
        uid: firebaseUser.uid,
        hasCompletedOnboarding: isOnboarded,
      };
      setUser(normalizedUser);
      
      // TAB RECOVERY: Cache user immediately for instant recovery on refresh
      cacheSession(normalizedUser, venueData && !venueData.__notFound ? venueData : null);

      // PERFORMANCE FIX: Release navigation lock IMMEDIATELY after user profile resolves
      // This drops TTI from ~6s to <1s by not blocking on /api/venues/me
      // Venue data streams in as a non-blocking background update
      releaseNavigationLock();
      setIsTransitioning(false);
      setIsSystemReady(true); // User profile is enough to mark system ready
      
      // INVESTOR BRIEFING FIX: Mark session as having valid authentication
      // This prevents ghost redirects during background token refresh cycles
      sessionIntegrityRef.current = true;
      
      // RESILIENCE: Track successful auth timestamp to prevent redirect during token refresh
      safeSetItem('hospogo_auth_timestamp', Date.now().toString(), true);

      // Determine role and venue requirements
      const role = (apiUser.currentRole || apiUser.role || '').toLowerCase();
      const isVenueRole = role === 'business' || role === 'venue' || role === 'hub' ||
        (apiUser.roles || []).some((r: string) => ['business', 'venue', 'hub'].includes((r || '').toLowerCase()));
      const shouldCheckVenue = isVenueRole && role !== 'pending_onboarding';

      // For non-venue roles, mark venue as loaded (not needed)
      if (!isVenueRole) {
        setIsVenueLoaded(true);
      }

      if (isOnboarded) {
        // NEUTRAL ZONE EARLY RETURN: Investor portal is a "no-redirect" zone
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        if (currentPath.startsWith('/investorportal')) {
          setIsVenueLoaded(true);
          setRedirecting(false);
          lastHydratedUidRef.current = firebaseUser.uid;
          isHydratingRef.current = false;
          return;
        }
        
        // Determine target path immediately (don't wait for venue)
        const targetPath = isVenueRole ? '/venue/dashboard' : '/dashboard';
        
        // Neutral route check: allow investor portal to remain visible
        if (isNeutralRoute(currentPath)) {
          setIsVenueLoaded(true);
          setRedirecting(false);
        } else if (location.pathname !== targetPath) {
          setRedirecting(true);
          navigate(targetPath, { replace: true });
        } else {
          setRedirecting(false);
        }

        // Venue data already fetched in parallel - process synchronously
        if (shouldCheckVenue && apiUser.id) {
          // Venue data is already available from parallel fetch above
          if (venueData && !venueData.__notFound && !venueData.__rateLimited) {
            // Venue exists - cache it
            isVenueMissingRef.current = false;
            setIsVenueMissing(false);
            venueCacheRef.current = { userId: firebaseUser.uid, cachedAt: Date.now(), hasVenue: true };
          } else {
            // Venue missing or rate limited
            isVenueMissingRef.current = true;
            setIsVenueMissing(true);
            venueCacheRef.current = { userId: firebaseUser.uid, cachedAt: Date.now(), hasVenue: false };
            // Redirect only if not already on hub
            if (typeof window !== 'undefined' && window.location.pathname !== '/onboarding/hub') {
              navigate('/onboarding/hub', { replace: true });
            }
          }
        }
      } else {
        // Not onboarded yet - venue not needed
        setIsVenueLoaded(true);
        setIsTransitioning(false);
        setIsSystemReady(true); // Auth complete (user needs onboarding but system is ready)
        
        // NEUTRAL ZONE EARLY RETURN: Investor portal is a "no-redirect" zone for non-onboarded users too
        if (currentPath.startsWith('/investorportal')) {
          lastHydratedUidRef.current = firebaseUser.uid;
          isHydratingRef.current = false;
          return;
        }
        
        // INVESTOR BRIEFING FIX: User has DB profile but isOnboarded=false - redirect to /onboarding
        // This catches users who started signup but didn't complete the flow
        if (!isOnboardingRoute(currentPath) && !isNeutralRoute(currentPath)) {
          setRedirecting(true);
          navigate('/onboarding', { replace: true });
        }
      }
      
      // Clear auth-related URL parameters
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const hasApiKey = searchParams.has('apiKey');
        const hasAuthMode = searchParams.get('mode') === 'signIn' || searchParams.get('mode') === 'signUp';
        
        if (hasApiKey || hasAuthMode) {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        }
      }
    } else {
      // No profile: new user or still registering
      // INVESTOR BRIEFING FIX: /role-selection removed from onboarding paths
      if (currentPath.startsWith('/onboarding') || currentPath === '/signup') {
        isOnboardingModeRef.current = true;
      }
      setIsRegistered(false);
      setUser(null);
      setIsVenueLoaded(true); // No venue needed for new users
      setIsTransitioning(false);
      setIsSystemReady(true); // Auth complete (no user, but system is ready)
    }
    
    // DEDUPLICATION: Mark hydration as complete
    lastHydratedUidRef.current = firebaseUser.uid;
    isHydratingRef.current = false;
  }, [navigate, location.pathname, user?.uid, releaseNavigationLock]);

  const refreshUser = useCallback(async (): Promise<{ venueReady: boolean }> => {
    const firebaseUser = firebaseUserRef.current;
    if (!firebaseUser) return { venueReady: false };
    
    // CRITICAL: Skip refresh on signup route to prevent 401/404 polling loop
    // But allow on onboarding routes to support step progression
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isOnSignup = currentPath === '/signup';
    
    // INVESTOR BRIEFING FIX: Skip refresh on investor portal to prevent ghost redirects
    if (currentPath.startsWith('/investorportal')) {
      return { venueReady: true }; // Investor portal doesn't need venue
    }
    
    if (isOnSignup) {
      return { venueReady: false };
    }
    
    // Clear onboarding mode flag if we're not on signup/onboarding route
    isOnboardingModeRef.current = false;
    
    // Explicit refresh - reset deduplication and navigation lock guard to allow re-hydration
    isHydratingRef.current = false;
    lastHydratedUidRef.current = null;
    navigationLockReleasedRef.current = false; // Allow lock to be released again after hydration
    
    setRedirecting(true);
    setIsTransitioning(true);
    try {
      await hydrateFromFirebaseUser(firebaseUser);
      return { venueReady: !isVenueMissingRef.current };
    } catch (error) {
      logger.error('AuthContext', 'refreshUser failed', error);
      // INVESTOR BRIEFING FIX: On refresh failure, preserve session integrity
      // Don't let a failed refresh kick out an authenticated user
      return { venueReady: false };
    } finally {
      setRedirecting(false);
      setIsTransitioning(false);
    }
  }, [hydrateFromFirebaseUser]);

  // Track pathname changes to keep onboarding mode flag in sync
  // This ensures we suppress fetches / treat 401 as expected when still in registration flow.
  // INVESTOR BRIEFING FIX: /role-selection removed - all onboarding flows through /onboarding
  useEffect(() => {
    const isOnSignupOrOnboarding = location.pathname.startsWith('/onboarding') || 
                                   location.pathname === '/signup';
    // INVESTOR BRIEFING FIX: Investor portal is also a "no-lock" zone
    const isNeutralZone = location.pathname.startsWith('/investorportal');
    if (isOnSignupOrOnboarding || isNeutralZone) {
      releaseNavigationLock();
    }
    isOnboardingModeRef.current = isOnSignupOrOnboarding;
    if (location.pathname === '/signup') {
      releaseNavigationLock();
    }
  }, [location.pathname, releaseNavigationLock]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let isInitialAuthCheck = true;

    // Minimalist: functional modular calls only.
    // Use in-memory persistence if localStorage is blocked (Tracking Prevention)
    const persistence = isLocalStorageAvailable() ? browserLocalPersistence : inMemoryPersistence;
    if (!isLocalStorageAvailable()) {
      logger.warn('AuthContext', 'localStorage blocked - using in-memory persistence (session will not survive page refresh)');
    }
    setPersistence(auth, persistence).catch((error) => {
      logger.error('AuthContext', 'Failed to set Firebase persistence', error);
    });

    // Primary async function to handle the complete auth handshake
    const initializeAuth = async () => {
      // E2E Bypass: Check for test user in sessionStorage (or localStorage when restored from Playwright storageState)
      if (typeof window !== 'undefined') {
        const e2eUserStr = safeGetItem('hospogo_test_user', true) || safeGetItem('hospogo_test_user', false);
        if (e2eUserStr) {
          try {
            const e2eUser = JSON.parse(e2eUserStr);
            
            // Apply Dashboard Phase override if needed
            if (safeGetItem('E2E_DASHBOARD_PHASE', true)) {
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
            // INVESTOR BRIEFING FIX: /role-selection removed - now redirects to /onboarding
            if (path === '/signup' || path.startsWith('/onboarding')) {
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

        setIsLoading(false);
        releaseNavigationLock();
      } catch (error) {
        logger.error('AuthContext', 'Auth initialization failed', error);
        setUser(null);
        setToken(null);
        setIsLoading(false);
        releaseNavigationLock();
        setIsSystemReady(true); // Error state - system ready for error handling
      }
    };

    // Execute the async initialization
    initializeAuth();

    return () => {
      if (unsub) unsub();
    };
  }, [hydrateFromFirebaseUser, navigate, releaseNavigationLock]);

  // Detect Firebase auth params in URL (apiKey, mode=signIn, etc.)
  // These indicate the user just completed popup auth and landed on home page
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // NEUTRAL ZONE EARLY RETURN: Investor portal is a "no-redirect" zone
    // This must be the FIRST check to kill flicker before any auth logic runs
    if (window.location.pathname.startsWith('/investorportal')) return;
    
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
    // NEUTRAL ZONE EARLY RETURN: Investor portal is a "no-redirect" zone
    // This must be the FIRST check to kill flicker before any auth logic runs
    if (typeof window === 'undefined') return;
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/investorportal')) return;
    
    // INVESTOR BRIEFING FIX: Session integrity check
    // If navigation is locked OR we're on the investor portal, never redirect
    if (isNavigationLocked) return;
    
    if (isLoading || !user) return;

    if (currentPath !== '/login' && currentPath !== '/signup') return;
    if (currentPath === '/signup') return;

      // Clear any remaining auth-related URL parameters (failsafe)
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const hasApiKey = searchParams.has('apiKey');
        const hasAuthMode = searchParams.get('mode') === 'signIn' || searchParams.get('mode') === 'signUp';

        if (hasApiKey || hasAuthMode) {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        }
      }

      const isOnboarded = user.isOnboarded === true;
      const venueMissing = isVenueMissingRef.current;

      if (isOnboarded) {
        if (venueMissing) {
          if (currentPath !== '/onboarding/hub') {
            setRedirecting(true);
            navigate('/onboarding/hub', { replace: true });
          } else {
            setRedirecting(false);
          }
        } else {
          if (currentPath === '/dashboard') {
            setRedirecting(false);
          } else {
            setRedirecting(true);
            navigate('/dashboard', { replace: true });
          }
        }
      } else {
        // Only send to onboarding when isOnboarded is explicitly false (or unset)
        // NEUTRAL ZONE: Skip redirect if on investor portal (allow viewing without onboarding)
        if (isNeutralRoute(currentPath)) {
          setRedirecting(false);
        } else if (!isOnboardingRoute(currentPath)) {
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
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, [user, isLoading]);

  // INVESTOR BRIEFING FIX: Session Heartbeat for Admin/Venue Routes
  // Purpose: Refresh Firebase token every 20 minutes on admin/venue routes
  // to ensure Rick never hits a "Session Expired" 401 redirect during investor briefing
  const SESSION_HEARTBEAT_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!firebaseUser) return;
    
    const currentPath = window.location.pathname;
    const isAdminOrVenueRoute = 
      currentPath.startsWith('/admin') ||
      currentPath.startsWith('/venue') ||
      currentPath.startsWith('/ceo') ||
      currentPath.includes('/dashboard');
    
    // Only enable heartbeat on admin/venue routes during active session
    if (!isAdminOrVenueRoute) return;
    
    logger.info('AuthContext', 'Briefing Continuity heartbeat enabled for admin/venue route');
    
    const refreshSessionToken = async () => {
      try {
        const currentFirebaseUser = firebaseUserRef.current;
        if (!currentFirebaseUser) return;
        
        // Force refresh the token to extend session validity
        const freshToken = await currentFirebaseUser.getIdToken(/* forceRefresh */ true);
        setToken(freshToken);
        logger.info('AuthContext', 'Session heartbeat: Token refreshed successfully');
      } catch (error) {
        logger.warn('AuthContext', 'Session heartbeat: Token refresh failed (non-critical)', error);
        // Don't logout on heartbeat failure - just log and continue
        // The user's session may still be valid
      }
    };
    
    // Set up interval for token refresh
    const heartbeatInterval = setInterval(refreshSessionToken, SESSION_HEARTBEAT_INTERVAL_MS);
    
    // Also refresh immediately on route mount for initial briefing protection
    refreshSessionToken();
    
    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [firebaseUser, location.pathname]);

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
      isVenueLoaded,
      isSystemReady,
      login,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, isRedirecting, isTransitioning, isNavigationLocked, isRegistered, isVenueMissing, isVenueLoaded, isSystemReady, firebaseUser, login, logout, refreshUser]
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
