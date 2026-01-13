/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChange, signOutUser, auth, handleGoogleRedirectResult } from '../lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { logger } from '@/lib/logger';
import { getDashboardRoute } from '@/lib/roles';

export interface User {
  id: string;
  email: string;
  password?: string;
  roles: Array<'client' | 'hub' | 'business' | 'professional' | 'brand' | 'trainer' | 'admin'>;
  currentRole: 'client' | 'hub' | 'business' | 'professional' | 'brand' | 'trainer' | 'admin' | null;
  provider?: 'google' | 'email';
  googleId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  displayName?: string;
  profileImage?: string;
  profileImageURL?: string; // Todo: standardize on profileImage
  avatarUrl?: string;      // Todo: standardize on profileImage
  bannerUrl?: string;      // Profile banner/cover photo URL
  bannerImage?: string;    // Alias for bannerUrl
  photoURL?: string;       // Firebase property
  bio?: string;
  phone?: string;
  location?: string;
  uid?: string;
  name?: string;
  isOnboarded?: boolean;
  averageRating?: number | null;
  reviewCount?: number;
  // Brand/Business profile fields
  companyName?: string;
  description?: string;
  website?: string;
  // Professional profile fields
  skills?: string[];
  experience?: string;
  isRoamingNomad?: boolean;
  // HospoGo compliance + preferences
  rsaVerified?: boolean | null;
  rsaNotRequired?: boolean | null; // User indicated they don't need RSA (e.g., kitchen staff, non-alcohol venues)
  rsaNumber?: string | null;
  rsaExpiry?: string | null;
  rsaStateOfIssue?: string | null;
  rsaCertificateUrl?: string | null;
  profile?: {
    rsa_verified?: boolean;
    rsa_expiry?: string | null;
    rsa_state_of_issue?: string | null;
    rsa_cert_url?: string | null;
    id_document_url?: string | null;
    id_verified_status?: string | null;
    reliability_strikes?: number;
  } | null;
  hospitalityRole?: 'Bartender' | 'Waitstaff' | 'Barista' | 'Kitchen Hand' | 'Manager' | null;
  hourlyRatePreference?: number | null;
  businessSettings?: {
    openingHours: Record<string, { open: string; close: string; enabled: boolean }>;
    shiftSplitType: 'halves' | 'thirds' | 'custom' | 'full-day';
    customShiftLength?: number;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  isRedirecting: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  setCurrentRole: (role: NonNullable<User['currentRole']>) => void;
  hasRole: (role: NonNullable<User['currentRole']>) => boolean;
  updateRoles: (roles: User['roles']) => void;
  getToken: () => Promise<string | null>;
  refreshUser: () => Promise<void>;
  triggerPostAuthRedirect: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Normalize backend role values (including older/alternate labels) into the app's canonical roles.
   *
   * Notes:
   * - "Clean break" dashboards are exposed at `/venue/*` and `/worker/*`,
   *   but the canonical roles used throughout the app remain:
   *   - venue-side: `business` | `hub`
   *   - worker-side: `professional`
   * - Some backend responses (or legacy docs) may refer to these as `venue` / `worker`.
   */
  const normalizeRoleValue = (raw: unknown): User['currentRole'] | null => {
    if (typeof raw !== 'string') return null;
    const r = raw.toLowerCase();

    // Clean-break aliases
    if (r === 'worker') return 'professional';
    if (r === 'venue') return 'business';

    // Legacy aliases / common variants
    if (r === 'pro') return 'professional';
    if (r === 'shop') return 'business';
    if (r === 'employer') return 'business';

    // Canonical roles
    if (
      r === 'client' ||
      r === 'hub' ||
      r === 'business' ||
      r === 'professional' ||
      r === 'brand' ||
      r === 'trainer' ||
      r === 'admin'
    ) {
      return r as User['currentRole'];
    }

    return null;
  };

  const normalizeRolesArray = (input: unknown): User['roles'] => {
    if (!Array.isArray(input)) return [];
    const out: Array<User['roles'][number]> = [];
    for (const v of input) {
      const role = normalizeRoleValue(v);
      if (role && role !== 'client' && role !== null) {
        out.push(role as User['roles'][number]);
      } else if (role === 'client') {
        out.push('client');
      }
    }
    return Array.from(new Set(out));
  };

  const normalizeUserFromApi = (apiUser: any, firebaseUid: string): User => {
    const rolesFromApi = normalizeRolesArray(apiUser?.roles);
    const roleFromApi = normalizeRoleValue(apiUser?.role);
    const currentRoleFromApi = normalizeRoleValue(apiUser?.currentRole);

    const roles: User['roles'] =
      rolesFromApi.length > 0
        ? rolesFromApi
        : roleFromApi
          ? [roleFromApi as User['roles'][number]]
          : currentRoleFromApi
            ? [currentRoleFromApi as User['roles'][number]]
            : ['professional'];

    const currentRole: User['currentRole'] =
      currentRoleFromApi ?? (roles[0] ?? null);

    return {
      ...(apiUser as User),
      uid: firebaseUid,
      roles,
      currentRole,
      // Ensure date strings are Dates
      createdAt: apiUser?.createdAt ? new Date(apiUser.createdAt) : new Date(),
      updatedAt: apiUser?.updatedAt ? new Date(apiUser.updatedAt) : new Date(),
      // Ensure isOnboarded is boolean (do NOT confuse this with compliance profile presence)
      isOnboarded: apiUser?.isOnboarded ?? false,
    };
  };

  // Keep the latest router helpers without re-subscribing auth listeners.
  const navigateRef = useRef(navigate);
  const locationRef = useRef(location);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);
  
  // Refs to prevent Strict Mode double-firing and race conditions
  const isProcessingAuth = useRef(false);
  const currentAuthUid = useRef<string | null>(null);
  const hasInitialized = useRef(false);
  const pendingRedirect = useRef(false);

  const deriveRoleHome = (u: User | null): string => {
    // No app user => send to login (onboarding is auth-protected, so redirecting there can cause
    // confusing bounces like "/" -> "/onboarding" -> "/login" on hard refresh when /api/me fails).
    if (!u) return '/login';
    if (u.isOnboarded === false) return '/onboarding';

    // If the backend ever sends clean-break role labels, honor them explicitly.
    const apiRole = normalizeRoleValue((u as any)?.role);
    if (apiRole === 'business' || apiRole === 'hub') return '/venue/dashboard';
    if (apiRole === 'professional') return '/worker/dashboard';

    // "Clean break" role homes
    if (u.currentRole === 'professional') return '/worker/dashboard';
    if (u.currentRole === 'business' || u.currentRole === 'hub') return '/venue/dashboard';

    // Fallback to existing dashboard routing for other roles / legacy surfaces.
    if (!u.currentRole || u.currentRole === 'client') return '/role-selection';
    return getDashboardRoute(u.currentRole);
  };

  const shouldAutoRedirectFromPath = (pathname: string): boolean => {
    // Only auto-redirect from auth/callback/redirect pages to avoid disrupting normal browsing.
    // NEVER redirect from the landing page (/) - users should see it regardless of auth state
    return (
      pathname === '/login' ||
      pathname === '/signup' ||
      pathname === '/dashboard' ||
      pathname === '/oauth/callback' ||
      pathname === '/__/auth/handler'
    );
  };

  // Paths that should NEVER be auto-redirected away from (even for auth failures)
  // These are public pages that users should always be able to view
  const isProtectedPublicPath = (pathname: string): boolean => {
    const publicPaths = [
      '/',           // Landing page
      '/login',      // Login page
      '/signup',     // Signup page  
      '/terms',      // Legal pages
      '/privacy',
      '/about',
      '/contact',
      '/refunds',
      '/forgot-password',
    ];
    return publicPaths.includes(pathname);
  };

  const handleRedirect = (u: User | null, opts?: { force?: boolean }) => {
    const pathname = locationRef.current.pathname;
    const force = opts?.force === true;

    // NEVER redirect away from protected public paths (landing, legal pages, etc.)
    // unless user explicitly triggered it (force=true from triggerPostAuthRedirect)
    if (!force && isProtectedPublicPath(pathname)) {
      return;
    }

    if (!force && !pendingRedirect.current && !shouldAutoRedirectFromPath(pathname)) {
      return;
    }

    const target = deriveRoleHome(u);

    // Avoid redirect loops / churn.
    if (pathname === target) {
      pendingRedirect.current = false;
      setIsRedirecting(false);
      return;
    }

    // If we're already on the onboarding flow, don't bounce repeatedly.
    if (target.startsWith('/onboarding') && pathname.startsWith('/onboarding')) {
      pendingRedirect.current = false;
      setIsRedirecting(false);
      return;
    }

    pendingRedirect.current = false;
    navigateRef.current(target, { replace: true });
    setIsRedirecting(false);
  };

  useEffect(() => {
    // Prevent double initialization in Strict Mode
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    // E2E mode: bypass Firebase dependency and hydrate user from storage.
    // Note: Playwright restores `localStorage` from `storageState`, but not `sessionStorage`.
    // We support both so tests can use either strategy.
    const isE2E =
      import.meta.env.VITE_E2E === '1' ||
      (typeof window !== 'undefined' &&
        window.location.hostname === 'localhost' &&
        window.localStorage.getItem('E2E_MODE') === 'true');

    if (isE2E && typeof window !== 'undefined') {
      try {
        const raw =
          window.sessionStorage.getItem('hospogo_test_user') ??
          window.localStorage.getItem('hospogo_test_user');
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<User>;
          const roles = Array.isArray(parsed.roles) ? parsed.roles : (parsed.currentRole ? [parsed.currentRole] : []);
          const currentRole = (parsed.currentRole || roles[0] || null) as User['currentRole'];

          setUser({
            ...(parsed as User),
            roles: roles as User['roles'],
            currentRole,
            isOnboarded: parsed.isOnboarded ?? true,
            createdAt: parsed.createdAt ? new Date(parsed.createdAt) : new Date(),
            updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : new Date(),
          });
          setToken('mock-test-token');
        } else {
          setUser(null);
          setToken(null);
        }
      } catch (error) {
        console.error('[AuthContext] Failed to parse E2E session user:', error);
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
        setIsAuthReady(true);
      }
      return;
    }

    // Handle Google OAuth redirect result at app level
    // This ensures redirect is processed regardless of which page user lands on
    const processRedirectResult = async () => {
      try {
        const redirectUser = await handleGoogleRedirectResult();
        if (redirectUser) {
          logger.debug('AuthContext', 'Processed Google redirect result for user:', redirectUser.uid);
          
          // IMPORTANT: Ensure user exists in database BEFORE onAuthStateChange tries to fetch profile
          // This prevents race conditions where /api/me fails because user doesn't exist yet
          try {
            const token = await redirectUser.getIdToken();
            const registerRes = await fetch("/api/register", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                email: redirectUser.email,
                name: redirectUser.displayName || redirectUser.email?.split("@")[0] || "Google User",
                password: "", // Passwordless/OAuth
              }),
            });
            
            // 201 = created, 409 = already exists - both are fine
            if (!registerRes.ok && registerRes.status !== 409) {
              logger.error('AuthContext', 'Failed to register redirect user in database');
            }
          } catch (registerError) {
            logger.error('AuthContext', 'Error registering redirect user:', registerError);
          }
          
          // The auth state listener will pick up this user and fetch their profile
        }
      } catch (error) {
        // Silently handle - redirect result errors are non-critical
        // User can retry sign-in manually
        logger.debug('AuthContext', 'No redirect result or error processing redirect:', error);
      }
    };
    
    // Process redirect result (non-blocking)
    processRedirectResult();

    // Wrap listener setup in try-catch to ensure loading states are always set
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = onAuthStateChange(async (firebaseUser: FirebaseUser | null) => {
        // GATEKEEPER: Prevent concurrent profile fetches for the same user
        const newUid = firebaseUser?.uid || null;
        const previousUid = currentAuthUid.current;
        
        // If we're already processing the same user, skip
        if (isProcessingAuth.current && previousUid === newUid) {
          logger.debug('AuthContext', 'Skipping duplicate auth state change for same user');
          return;
        }
        
        // If the user hasn't changed and we already have auth ready, skip redundant fetches
        if (isAuthReady && previousUid === newUid && newUid !== null) {
          logger.debug('AuthContext', 'Skipping redundant profile fetch - user unchanged');
          return;
        }
        
        // CRITICAL: If transitioning from no-user to user (sign-in happening),
        // set loading to true to show loading screen and prevent login page flash
        const isNewSignIn = previousUid === null && newUid !== null;
        if (isNewSignIn) {
          logger.debug('AuthContext', 'New sign-in detected, showing loading screen');
          setIsLoading(true);
        // Only auto-redirect from auth/callback pages (NOT from normal browsing pages like "/").
        // This prevents hard-refreshing public pages from being yanked to /login when the API/profile
        // handshake is temporarily unavailable.
        if (shouldAutoRedirectFromPath(locationRef.current.pathname)) {
          pendingRedirect.current = true;
          setIsRedirecting(true);
        }
        }
        
        // Mark as processing and track current user
        isProcessingAuth.current = true;
        currentAuthUid.current = newUid;
        
        try {
          if (firebaseUser) {
            try {
              // Always get a fresh token to ensure validity
              const token = await firebaseUser.getIdToken(/* forceRefresh */ false);
              setToken(token);
              logger.debug('AuthContext', 'Fetching user profile from /api/me');
              const res = await fetch('/api/me', {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (res.ok) {
                const apiUser = await res.json();
                const nextUser: User = normalizeUserFromApi(apiUser, firebaseUser.uid);
                setUser(nextUser);
                handleRedirect(nextUser);
              } else if (res.status === 401) {
                // 401 means token is invalid or expired - force refresh token and retry once
                logger.debug('AuthContext', 'Received 401 from /api/me, refreshing token...');
                try {
                  const refreshedToken = await firebaseUser.getIdToken(/* forceRefresh */ true);
                  setToken(refreshedToken);
                  logger.debug('AuthContext', 'Token refreshed, retrying /api/me...');
                  const retryRes = await fetch('/api/me', {
                    headers: {
                      'Authorization': `Bearer ${refreshedToken}`,
                      'Content-Type': 'application/json'
                    }
                  });
                  
                  if (retryRes.ok) {
                    const apiUser = await retryRes.json();
                    const nextUser: User = normalizeUserFromApi(apiUser, firebaseUser.uid);
                    setUser(nextUser);
                    handleRedirect(nextUser);
                  } else if (retryRes.status === 404 || retryRes.status === 401) {
                    // User exists in Firebase but not in our database
                    logger.debug('AuthContext', 'Firebase user has no profile after retry');
                    setUser(null);
                    setToken(refreshedToken);
                    // ONLY redirect to onboarding if NOT on a protected public path
                    // The landing page should always be viewable
                    if (!isProtectedPublicPath(locationRef.current.pathname)) {
                      navigateRef.current('/onboarding', { replace: true });
                    }
                    setIsRedirecting(false);
                    pendingRedirect.current = false;
                  } else {
                    // Other error - user is logged out
                    setUser(null);
                    handleRedirect(null);
                  }
                } catch {
                  // Token refresh failed - user is logged out
                  setUser(null);
                  setToken(null);
                  handleRedirect(null);
                }
              } else if (res.status === 404) {
                // User exists in Firebase but not in our database
                logger.debug('AuthContext', 'Firebase user has no profile (404)');
                setUser(null);
                // Keep the token so the user can complete onboarding
                // ONLY redirect to onboarding if NOT on a protected public path
                // The landing page should always be viewable
                if (!isProtectedPublicPath(locationRef.current.pathname)) {
                  navigateRef.current('/onboarding', { replace: true });
                }
                setIsRedirecting(false);
                pendingRedirect.current = false;
              } else {
                logger.error('AuthContext', 'User authenticated in Firebase but profile fetch failed', res.status);
                // For other errors, redirect to onboarding to allow user to complete profile
                setUser(null);
                setToken(null);
                handleRedirect(null);
              }
            } catch (error) {
              console.error('Error fetching user profile:', error);
              setUser(null);
              setToken(null);
              handleRedirect(null);
            }
          } else {
            setUser(null);
            setToken(null);
            // If we've explicitly triggered a redirect but auth resolves to null user, send to onboarding.
            handleRedirect(null);
          }
        } catch (error) {
          // Catch any unexpected errors in the callback itself
          console.error('Unexpected error in auth state change callback:', error);
          setUser(null);
          setToken(null);
          handleRedirect(null);
        } finally {
          // CRITICAL: Always set loading states, even if there's an error
          // This prevents the "Flash of Doom" where the app renders before auth check completes
          isProcessingAuth.current = false;
          setIsLoading(false);
          setIsAuthReady(true);
        }
      });
    } catch (error) {
      // If listener setup fails, still set loading states to prevent infinite loading
      console.error('Error setting up auth state listener:', error);
      isProcessingAuth.current = false;
      setIsLoading(false);
      setIsAuthReady(true);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      // Reset refs on cleanup (for HMR or unmount)
      hasInitialized.current = false;
      isProcessingAuth.current = false;
      currentAuthUid.current = null;
      pendingRedirect.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // No dependencies - listener should only be set up once

  const login = (userData: User) => {
    // With Firebase, login is handled by the auth state change listener.
    // This method might be used for optimistic updates or legacy calls.
    setUser(userData);
  };

  const logout = async () => {
    try {
      // Clear any user-related localStorage items
      // Note: We don't clear theme or PWA install status as those are user preferences
      // But we clear any potential auth-related data
      if (typeof window !== 'undefined') {
        // Clear any potential auth tokens or user data from localStorage
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        // Clear stale redirect/onboarding state that could cause race conditions
        localStorage.removeItem('onboarding_step');
        localStorage.removeItem('redirect_url');
        sessionStorage.removeItem('signupRolePreference');
        sessionStorage.removeItem('signupPlanPreference');
        sessionStorage.removeItem('signupTrialMode');
      }
      
      // Reset tracking refs before sign out
      currentAuthUid.current = null;
      
      // Sign out from Firebase
      await signOutUser();
      
      // Clear user state immediately
      setUser(null);
      setToken(null);
      
      // Navigate to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } catch (e) {
      console.error('Logout error', e);
      // Even if there's an error, clear state and navigate
      currentAuthUid.current = null;
      setUser(null);
      setToken(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    // State update also handled by onAuthStateChange as fallback
  };

  const setCurrentRole = (role: NonNullable<User['currentRole']>) => {
    if (user) {
      const roles = Array.isArray(user.roles) ? user.roles : [];
      const nextRoles = roles.includes(role) ? roles : [...roles, role];
      const updatedUser = { ...user, roles: nextRoles, currentRole: role, updatedAt: new Date() };
      setUser(updatedUser);
      // TODO: Sync with backend
    }
  };

  const updateRoles = (roles: User['roles']) => {
    if (user) {
      const uniqueRoles = Array.from(new Set(roles));
      const updatedUser = { ...user, roles: uniqueRoles, updatedAt: new Date() };
      setUser(updatedUser);
      // TODO: Sync with backend
    }
  };

  const hasRole = (role: NonNullable<User['currentRole']>) => {
    return !!user && Array.isArray(user.roles) && user.roles.includes(role);
  };

  const getToken = async () => {
    if (auth.currentUser) {
      const nextToken = await auth.currentUser.getIdToken();
      setToken(nextToken);
      return nextToken;
    }

    // E2E mode: use API middleware bypass token.
    if (
      import.meta.env.VITE_E2E === '1' ||
      (typeof window !== 'undefined' &&
        window.location.hostname === 'localhost' &&
        window.localStorage.getItem('E2E_MODE') === 'true')
    ) {
      setToken('mock-test-token');
      return 'mock-test-token';
    }

    setToken(null);
    return null;
  };

  const refreshUser = async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      setUser(null);
      setToken(null);
      return;
    }

    try {
      // Force refresh token to ensure we have latest claims/session
      const token = await firebaseUser.getIdToken(true);
      setToken(token);
      const res = await fetch('/api/me', {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (res.ok) {
        const apiUser = await res.json();
        const nextUser: User = normalizeUserFromApi(apiUser, firebaseUser.uid);
        setUser(nextUser);
        handleRedirect(nextUser, { force: true });
      } else if (res.status === 404) {
        // User exists in Firebase but not in our database - redirect to onboarding
        logger.debug('AuthContext', 'refreshUser: Firebase user has no profile (404), redirecting to onboarding');
        setUser(null);
        navigateRef.current('/onboarding', { replace: true });
        setIsRedirecting(false);
        pendingRedirect.current = false;
      } else if (res.status === 401) {
        // 401 means token is invalid or expired - try to refresh token once
        try {
          const refreshedToken = await firebaseUser.getIdToken(true);
          setToken(refreshedToken);
          const retryRes = await fetch('/api/me', {
            cache: 'no-store',
            headers: {
              'Authorization': `Bearer ${refreshedToken}`,
              'Pragma': 'no-cache',
              'Cache-Control': 'no-cache'
            }
          });
          
          if (retryRes.ok) {
            const apiUser = await retryRes.json();
            const nextUser: User = normalizeUserFromApi(apiUser, firebaseUser.uid);
            setUser(nextUser);
            handleRedirect(nextUser, { force: true });
          } else if (retryRes.status === 404 || retryRes.status === 401) {
            // User exists in Firebase but not in our database - redirect to onboarding
            // Also handle 401 as "no profile" since user just signed in with Firebase
            logger.debug('AuthContext', 'refreshUser: Firebase user has no profile, redirecting to onboarding');
            setUser(null);
            navigateRef.current('/onboarding', { replace: true });
            setIsRedirecting(false);
            pendingRedirect.current = false;
          } else {
            // Other error - still redirect to onboarding since user has valid Firebase session
            logger.debug('AuthContext', 'refreshUser: API error but Firebase user exists, redirecting to onboarding');
            setUser(null);
            navigateRef.current('/onboarding', { replace: true });
            setIsRedirecting(false);
            pendingRedirect.current = false;
          }
        } catch {
          // Token refresh failed but Firebase user exists - redirect to onboarding
          logger.debug('AuthContext', 'refreshUser: Token refresh failed, redirecting to onboarding');
          setUser(null);
          setToken(null);
          navigateRef.current('/onboarding', { replace: true });
          setIsRedirecting(false);
          pendingRedirect.current = false;
        }
      } else {
        logger.error('AuthContext', 'Failed to refresh user profile', res.status);
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  };

  const triggerPostAuthRedirect = () => {
    pendingRedirect.current = true;
    setIsRedirecting(true);

    // If we already have a user, execute immediately.
    if (user) {
      handleRedirect(user, { force: true });
    }
  };

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    isAuthReady,
    isRedirecting,
    login,
    logout,
    setCurrentRole,
    hasRole,
    updateRoles,
    getToken,
    refreshUser,
    triggerPostAuthRedirect,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
