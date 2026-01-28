/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import { browserLocalPersistence, onAuthStateChanged, setPersistence, signOut, type User as FirebaseUser } from 'firebase/auth';
import { logger } from '@/lib/logger';
import { cleanupPushNotifications } from '@/lib/push-notifications';

export interface User {
  id: string;
  email: string;
  uid?: string;
  roles?: string[];
  currentRole?: string | null;
  isOnboarded?: boolean;
  hasCompletedOnboarding?: boolean;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthReady: boolean; // Alias for !isLoading, used by some components
  isRedirecting: boolean; // True while a redirect is in progress (prevents route flash)
  hasUser: boolean; // Standardized: true when user object exists (DB profile loaded)
  hasFirebaseUser: boolean; // True when Firebase session exists
  /** True when user is onboarded but /api/venues/me returned 404 — stay on hub, do not redirect to dashboard */
  isVenueMissing: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Paths where user is already in onboarding flow; do not redirect to /onboarding if already here */
function isOnboardingRoute(path: string): boolean {
  return path.startsWith('/onboarding') || path === '/role-selection';
}

interface AuthProviderProps {
  children: ReactNode;
}

async function fetchAppUser(
  idToken: string, 
  isOnboardingMode: boolean = false,
  firebaseUser?: FirebaseUser | null
): Promise<User | null> {
  // Allow fetching user even in onboarding mode to resolve dependency deadlock
  // We need user.id for onboarding API calls (e.g. payout setup, venue profile creation)
  
  // Always attempt fetch so existing users (e.g. returning to /signup) get their profile and can be redirected to dashboard.
  const attemptFetch = async (token: string, isRetry: boolean = false): Promise<User | null> => {
    try {
      const res = await fetch('/api/me', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (res.ok) {
        const apiUser = (await res.json()) as User;
        return apiUser;
      }

      // 404 is expected for brand new Firebase users that haven't been created in our DB yet.
      if (res.status === 404) {
        console.log('[AuthContext] /api/me returned 404 - user profile not found in DB (expected for new users)');
        return null;
      }

      // 401 during onboarding is expected - suppress warning to reduce console noise
      if (res.status === 401 && isOnboardingMode) {
        console.log('[AuthContext] /api/me returned 401 during onboarding - suppressing (expected)');
        return null;
      }

      // If we get a 401 and haven't retried yet, try refreshing the token and retrying
      if (res.status === 401 && !isRetry && firebaseUser) {
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
  const [isVenueMissing, setIsVenueMissing] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Keep the current Firebase user without ever touching auth.currentUser.
  const firebaseUserRef = useRef<FirebaseUser | null>(null);
  // Track if we're in onboarding mode to prevent profile fetches
  const isOnboardingModeRef = useRef<boolean>(false);
  // Sync with isVenueMissing state so redirect logic can read it in the same tick
  const isVenueMissingRef = useRef<boolean>(false);

  // Clear redirecting flag after pathname has settled (prevents flash of wrong route)
  useEffect(() => {
    if (!isRedirecting) return;
    const t = setTimeout(() => setRedirecting(false), 150);
    return () => clearTimeout(t);
  }, [location.pathname, isRedirecting]);

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
      isVenueMissingRef.current = false;
      setIsVenueMissing(false);
      // Always redirect to landing so user never stays on a protected page after sign-out
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const hydrateFromFirebaseUser = useCallback(async (firebaseUser: FirebaseUser) => {
    console.log('[AuthContext] Hydrating user from Firebase', { 
      uid: firebaseUser.uid, 
      email: firebaseUser.email 
    });

    // Always fetch profile: if we get a valid profile, we stop suppressing and redirect to dashboard.
    // This fixes "Onboarding Hell" where existing users (e.g. julian.g.roberts@gmail.com) were stuck
    // because we suppressed the fetch on /role-selection or /onboarding.
    const idToken = await firebaseUser.getIdToken(/* forceRefresh */ true);
    setToken(idToken);

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const effectivelyOnboarding = currentPath.startsWith('/onboarding') || currentPath === '/signup' || currentPath === '/role-selection' || isOnboardingModeRef.current;
    const apiUser = await fetchAppUser(idToken, effectivelyOnboarding, firebaseUser);

    if (apiUser) {
      // Valid profile: stop suppressing; set user and force redirect to dashboard.
      isOnboardingModeRef.current = false;
      // Verify the user record exists and matches Firebase UID
      // After migration, the Postgres record should have firebase_uid column populated
      const userFirebaseUid = apiUser.uid || (apiUser as any).firebase_uid;
      const tokenFirebaseUid = firebaseUser.uid;
      
      if (userFirebaseUid && tokenFirebaseUid && userFirebaseUid !== tokenFirebaseUid) {
        console.warn('[AuthContext] Firebase UID mismatch between token and user record', {
          tokenUid: tokenFirebaseUid,
          userUid: userFirebaseUid,
          userId: apiUser.id
        });
      }
      
      // Single source of truth: derive hasCompletedOnboarding from API isOnboarded to avoid redirect loops
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

      // Harden redirect: if API says isOnboarded, send directly to dashboard (no onboarding routes)
      // Do NOT redirect to dashboard if venue check has failed with 404 (isVenueMissing).
      const isVenueRole = (apiUser.currentRole || apiUser.role || '').toLowerCase() === 'business' ||
        (apiUser.roles || []).some((r: string) => ['business', 'venue', 'hub'].includes((r || '').toLowerCase()));
      if (isOnboarded) {
        // Data integrity: venue users must have a venue record — prevent "ghost dashboards"
        if (isVenueRole) {
          isVenueMissingRef.current = false;
          setIsVenueMissing(false); // clear until we know otherwise
          try {
            const venueRes = await fetch('/api/venues/me', {
              headers: {
                Authorization: `Bearer ${idToken}`,
                'Content-Type': 'application/json',
              },
              cache: 'no-store',
            });
            if (venueRes.status === 404) {
              console.log('[AuthContext] User is onboarded but /api/venues/me returned 404 — staying on onboarding hub');
              isVenueMissingRef.current = true;
              setIsVenueMissing(true);
              setRedirecting(true);
              if (typeof window !== 'undefined' && window.location.pathname !== '/onboarding/hub') {
                navigate('/onboarding/hub', { replace: true });
              }
              return;
            }
            isVenueMissingRef.current = false;
          } catch (venueErr) {
            logger.warn('AuthContext', 'Failed to fetch /api/venues/me before redirect', venueErr);
            // On network error, still send to hub so user can complete setup
            isVenueMissingRef.current = true;
            setIsVenueMissing(true);
            setRedirecting(true);
            if (typeof window !== 'undefined' && window.location.pathname !== '/onboarding/hub') {
              navigate('/onboarding/hub', { replace: true });
            }
            return;
          }
        }
        // Do NOT redirect to dashboard if venue check has failed with 404 (same or previous run)
        if (isVenueMissingRef.current) {
          setRedirecting(true);
          if (typeof window !== 'undefined' && window.location.pathname !== '/onboarding/hub') {
            navigate('/onboarding/hub', { replace: true });
          }
          return;
        }
        const targetPath = isVenueRole ? '/venue/dashboard' : '/dashboard';
        console.log('[AuthContext] User is onboarded — redirecting to', targetPath);
        setRedirecting(true);
        navigate(targetPath, { replace: true });
      }
      
      // Clear any auth-related URL parameters once user is confirmed
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
      // No profile: new user or still registering. Only suppress UI on signup/onboarding routes.
      if (currentPath.startsWith('/onboarding') || currentPath === '/signup' || currentPath === '/role-selection') {
        isOnboardingModeRef.current = true;
        console.log('[AuthContext] No user profile in DB (404) - on signup/onboarding, keeping user null');
      }
      setUser(null);
    }
  }, [navigate]);

  const refreshUser = useCallback(async () => {
    const firebaseUser = firebaseUserRef.current;
    if (!firebaseUser) return;
    
    // CRITICAL: Skip refresh on signup route to prevent 401/404 polling loop
    // But allow on onboarding routes to support step progression
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isOnSignup = currentPath === '/signup';
    
    if (isOnSignup) {
      console.log('[AuthContext] On signup route - suppressing profile refresh', {
        pathname: currentPath
      });
      return;
    }
    
    // Clear onboarding mode flag if we're not on signup/onboarding route
    isOnboardingModeRef.current = false;
    
    try {
      await hydrateFromFirebaseUser(firebaseUser);
    } catch (error) {
      logger.error('AuthContext', 'refreshUser failed', error);
    }
  }, [hydrateFromFirebaseUser]);

  // Track pathname changes to keep onboarding mode flag in sync
  // This ensures we suppress fetches / treat 401 as expected when still in registration flow.
  // Include /role-selection so 401 from /api/me during role choice is not treated as "auth failed".
  useEffect(() => {
    const isOnSignupOrOnboarding = location.pathname.startsWith('/onboarding') || 
                                   location.pathname === '/signup' ||
                                   location.pathname === '/role-selection';
    isOnboardingModeRef.current = isOnSignupOrOnboarding;
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
      // E2E Bypass: Check for test user in sessionStorage
      if (typeof window !== 'undefined') {
        const e2eUserStr = sessionStorage.getItem('hospogo_test_user');
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
            setIsLoading(false);
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
            firebaseUserRef.current = firebaseUser;
            setFirebaseUser(firebaseUser);

            try {
              if (!firebaseUser) {
                setUser(null);
                setToken(null);
              } else {
                await hydrateFromFirebaseUser(firebaseUser);
                
                // CRITICAL: Immediate navigation for popup flow results
                // This ensures navigation happens inside the popup promise resolution,
                // bypassing Chrome's bounce tracking mitigations
                // Only navigate if we're on auth pages and user is authenticated
                if (!isInitialAuthCheck) {
                  const currentPath = window.location.pathname;
                  if (currentPath === '/login' || currentPath === '/signup') {
                    const target = isVenueMissingRef.current ? '/onboarding/hub' : '/dashboard';
                    console.log('[AuthContext] Popup auth successful, navigating to', target);
                    setRedirecting(true);
                    navigate(target, { replace: true });
                  }
                }
              }
            } catch (error) {
              logger.error('AuthContext', 'Auth hydration failed', error);
              setUser(null);
              setToken(null);
            }

            // Resolve the Promise after the first callback (initial auth check)
            if (isInitialAuthCheck) {
              isInitialAuthCheck = false;
              resolve();
            }
          });
        });

        // onAuthStateChanged has completed - safe to set isLoading to false
        console.log('[AuthContext] Handshake is Complete (popup-only flow)');
        
        // DEBUG: Log current Firebase state
        console.log('[Auth] Current Firebase User:', auth.currentUser);
        
        setIsLoading(false);
      } catch (error) {
        logger.error('AuthContext', 'Auth initialization failed', error);
        setUser(null);
        setToken(null);
        setIsLoading(false);
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
    const currentPath = window.location.pathname;
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
          }
        } else {
          console.log('[Auth] User is onboarded, redirecting from', currentPath, 'to /dashboard');
          setRedirecting(true);
          navigate('/dashboard', { replace: true });
        }
      } else {
        // Only send to onboarding when isOnboarded is explicitly false (or unset)
        if (!isOnboardingRoute(currentPath)) {
          console.log('[Auth] User not onboarded, redirecting from', currentPath, 'to /onboarding');
          setRedirecting(true);
          navigate('/onboarding', { replace: true });
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
      hasUser: !!user,
      hasFirebaseUser: !!firebaseUser,
      isVenueMissing,
      login,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, isRedirecting, isVenueMissing, firebaseUser, login, logout, refreshUser]
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
