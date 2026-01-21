/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChange, signOutUser, auth, handleGoogleRedirectResult, googleProvider } from '../lib/firebase';
import { User as FirebaseUser, onIdTokenChanged } from 'firebase/auth';
import { logger } from '@/lib/logger';
import { getDashboardRoute, normalizeVenueToBusiness, isBusinessRole } from '@/lib/roles';
import { useToast } from '@/hooks/useToast';

const AUTH_BRIDGE_COOKIE_NAME = 'hospogo_auth_bridge';

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
  hasCompletedOnboarding?: boolean;
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
  notificationPreferences?: {
    newJobAlertsEmail?: boolean;
    newJobAlertsSMS?: boolean;
    shiftRemindersEmail?: boolean;
    shiftRemindersSMS?: boolean;
    marketingUpdatesEmail?: boolean;
  };
  favoriteProfessionals?: string[];
}

interface AuthContextType {
  isRoleLoading: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  isRedirecting: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  clearUserState: (reason?: string) => void;
  setCurrentRole: (role: NonNullable<User['currentRole']>) => void;
  hasRole: (role: NonNullable<User['currentRole']>) => boolean;
  updateRoles: (roles: User['roles']) => void;
  getToken: () => Promise<string | null>;
  refreshUser: () => Promise<void>;
  triggerPostAuthRedirect: () => void;
  startManualAuthPolling: () => void;
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
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const { toast } = useToast();
  const hasResolvedAuthState = useRef(false);
  const redirectFallbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hardSyncInProgress = useRef(false);
  const hardSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMessageHardSynced = useRef(false);
  const networkFallbackAttempted = useRef(false);
  const isLoadingRef = useRef(isLoading);
  const userRef = useRef<User | null>(null);
  const toastRef = useRef(toast);
  const refreshUserRef = useRef<() => Promise<void>>(async () => {});
  const manualPollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasReloadedRef = useRef(false);

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
   * - Uses centralized venue->business mapping from @/lib/roles for consistency.
   */
  const normalizeRoleValue = (raw: unknown): User['currentRole'] | null => {
    if (typeof raw !== 'string') return null;
    const r = raw.toLowerCase();

    // Use centralized venue->business mapping (imported at top of file)
    const normalized = normalizeVenueToBusiness(r);
    if (normalized) return normalized;

    // Legacy aliases / common variants
    if (r === 'worker') return 'professional';
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
      // Ensure hasCompletedOnboarding is boolean
      hasCompletedOnboarding: apiUser?.hasCompletedOnboarding ?? false,
      // User preferences
      notificationPreferences: apiUser?.notificationPreferences || undefined,
      favoriteProfessionals: apiUser?.favoriteProfessionals || [],
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
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);
  
  // Refs to prevent Strict Mode double-firing and race conditions
  const isProcessingAuth = useRef(false);
  const currentAuthUid = useRef<string | null>(null);
  const hasInitialized = useRef(false);
  const last401RetryTime = useRef<number>(0);
  const consecutive401Count = useRef<number>(0);
  // CIRCUIT BREAKER: Maximum number of consecutive 401s before giving up
  const MAX_CONSECUTIVE_401S = 5;
  const pendingRedirect = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const deriveRoleHome = (u: User | null, currentPath?: string): string => {
    // No app user => send to login (onboarding is auth-protected, so redirecting there can cause
    // confusing bounces like "/" -> "/onboarding" -> "/login" on hard refresh when /api/me fails).
    if (!u) return '/login';
    if (u.hasCompletedOnboarding === false) return '/onboarding';

    // CRITICAL: If user is authenticated but has NO role assigned yet, redirect to onboarding
    // This ensures new signups complete onboarding before accessing dashboards
    if (!u.currentRole || u.currentRole === 'client') {
      // Check if user has any roles in the roles array
      const hasAnyRole = u.roles && u.roles.length > 0 && u.roles.some(r => r !== 'client');
      if (!hasAnyRole) {
        return '/onboarding';
      }
      return '/role-selection';
    }

    // CRITICAL: If user is already on a valid business dashboard, stay there
    const validBusinessDashboards = ['/venue/dashboard', '/shop-dashboard'];
    if (currentPath && validBusinessDashboards.includes(currentPath)) {
      const isBusinessUser = isBusinessRole(u.currentRole) || 
        (u.roles && u.roles.some(r => isBusinessRole(r)));
      if (isBusinessUser) {
        return currentPath; // Stay on current valid dashboard
      }
    }

    // If the backend ever sends clean-break role labels, honor them explicitly.
    const apiRole = normalizeRoleValue((u as any)?.role);
    // CRITICAL: Allow 'venue', 'hub', or 'business' to access '/venue/dashboard'
    if (apiRole === 'business' || apiRole === 'hub' || apiRole === 'venue') return '/venue/dashboard';
    if (apiRole === 'professional') return '/worker/dashboard';

    // "Clean break" role homes
    // CRITICAL: Allow 'venue', 'hub', or 'business' to access '/venue/dashboard'
    if (u.currentRole === 'professional') return '/worker/dashboard';
    if (u.currentRole === 'business' || u.currentRole === 'hub' || u.currentRole === 'venue') return '/venue/dashboard';

    // Fallback to existing dashboard routing for other roles / legacy surfaces.
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

  const forceAuthNavigation = (firebaseUser: FirebaseUser | null, nextUser?: User | null) => {
    if (!firebaseUser) return;
    const pathname = locationRef.current.pathname;
    if (pathname !== '/login' && pathname !== '/signup') return;

    const target =
      nextUser?.hasCompletedOnboarding === false
        ? '/onboarding'
        : '/dashboard';

    if (pathname !== target) {
      navigateRef.current(target);
    }
  };

  const startManualAuthPolling = () => {
    if (manualPollingIntervalRef.current) {
      clearInterval(manualPollingIntervalRef.current);
    }

    manualPollingIntervalRef.current = setInterval(() => {
      if (!auth.currentUser) return;

      if (manualPollingIntervalRef.current) {
        clearInterval(manualPollingIntervalRef.current);
        manualPollingIntervalRef.current = null;
      }

      setIsLoading(false);
      setIsAuthReady(true);
      setIsRedirecting(false);
      pendingRedirect.current = false;
      navigateRef.current('/onboarding');
    }, 500);
  };

  // Paths that should NEVER be auto-redirected away from (even for auth failures)
  // These are public pages that users should always be able to view
  const publicPaths = [
    '/',           // Landing page
    '/venue-guide',
    '/login',      // Login page
    '/signup',     // Signup page  
    '/terms',      // Legal pages
    '/privacy',
    '/about',
    '/contact',
    '/refunds',
    '/forgot-password',
    '/status',     // Status page
  ];

  const isProtectedPublicPath = (pathname: string): boolean => {
    return publicPaths.includes(pathname);
  };

  // Paths that should NEVER be auto-redirected away from during auth state changes
  // These are authenticated pages that users should be able to access without being kicked out
  const isProtectedAuthPath = (pathname: string): boolean => {
    const protectedAuthPaths = [
      '/messages',      // Messages page - role-agnostic, should not redirect
      '/profile',       // Profile page
      '/settings',      // Settings page
      '/notifications', // Notifications page
      '/wallet',        // Wallet page
      '/earnings',      // Earnings page
    ];
    return protectedAuthPaths.includes(pathname);
  };

  const handleRedirect = (u: User | null, opts?: { force?: boolean }) => {
    const pathname = locationRef.current.pathname;
    const force = opts?.force === true;

    // NEVER redirect away from protected public paths (landing, legal pages, etc.)
    // unless user explicitly triggered it (force=true from triggerPostAuthRedirect)
    if (!force && isProtectedPublicPath(pathname)) {
      return;
    }

    // CRITICAL: Never redirect away from protected authenticated paths (messages, profile, etc.)
    // These are role-agnostic pages that should remain accessible during auth state changes
    // This check must happen even when force=true to prevent redirects during user state updates
    if (isProtectedAuthPath(pathname)) {
      logger.debug('AuthContext', 'handleRedirect: User on protected auth path, skipping redirect', {
        pathname,
        currentRole: u?.currentRole,
        isOnboarded: u?.isOnboarded,
        force
      });
      pendingRedirect.current = false;
      setIsRedirecting(false);
      return;
    }

    // CRITICAL: Never redirect away from onboarding pages during active onboarding
    // This prevents redirect loops when user state updates during onboarding submission
    // This check must happen even when force=true to prevent loops during refreshUser()
    if (pathname.startsWith('/onboarding')) {
      logger.debug('AuthContext', 'handleRedirect: User on onboarding page, skipping redirect to prevent loops', {
        pathname,
        currentRole: u?.currentRole,
        isOnboarded: u?.isOnboarded,
        force
      });
      pendingRedirect.current = false;
      setIsRedirecting(false);
      return;
    }

    if (!force && !pendingRedirect.current && !shouldAutoRedirectFromPath(pathname)) {
      return;
    }

    // CRITICAL: If user is already on a valid business dashboard, DO NOT redirect
    const validBusinessDashboards = ['/venue/dashboard', '/shop-dashboard'];
    if (validBusinessDashboards.includes(pathname) && u) {
      const isBusinessUser = isBusinessRole(u.currentRole || '') || 
        (u.roles && u.roles.some(r => isBusinessRole(r)));
      if (isBusinessUser) {
        pendingRedirect.current = false;
        setIsRedirecting(false);
        return; // Stay on current valid dashboard
      }
    }

    const target = deriveRoleHome(u, pathname);

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

          const e2eUser = {
            ...(parsed as User),
            roles: roles as User['roles'],
            currentRole,
            isOnboarded: parsed.isOnboarded ?? true,
            createdAt: parsed.createdAt ? new Date(parsed.createdAt) : new Date(),
            updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : new Date(),
          };
          setUser(e2eUser);
          setToken('mock-test-token');
          
          // CRITICAL: In E2E mode, trigger /api/me to sync profile and wake up the UI
          // This ensures the app doesn't wait indefinitely for a Firebase token refresh that won't happen
          if (auth.currentUser && (e2eUser.uid || e2eUser.id)) {
            logger.debug('AuthContext', 'E2E mode: Triggering /api/me to sync profile', { uid: e2eUser.uid || e2eUser.id });
            fetch('/api/me', {
              headers: {
                'Authorization': 'Bearer mock-test-token',
                'Content-Type': 'application/json'
              }
            })
              .then(res => {
                if (res.ok) {
                  return res.json().then(apiUser => {
                    logger.debug('AuthContext', 'E2E mode: /api/me sync successful', { userId: apiUser.id });
                    const syncedUser = normalizeUserFromApi(apiUser, e2eUser.uid || e2eUser.id || '');
                    setUser(syncedUser);
                    handleRedirect(syncedUser);
                  });
                } else {
                  logger.debug('AuthContext', 'E2E mode: /api/me returned non-OK status', { status: res.status });
                }
              })
              .catch(error => {
                logger.debug('AuthContext', 'E2E mode: /api/me fetch error (non-critical)', error);
              });
          } else {
            logger.debug('AuthContext', 'E2E mode: Skipping /api/me sync (no Firebase user)');
          }
        } else {
          setUser(null);
          setToken(null);
        }
      } catch (error) {
        console.error('[AuthContext] Failed to parse E2E session user:', error);
        setUser(null);
        setToken(null);
      } finally {
        hasResolvedAuthState.current = true;
        setIsLoading(false);
        setIsAuthReady(true);
        // Clear safety timeout since E2E mode resolved auth state
        if (safetyTimeoutRef.current) {
          clearTimeout(safetyTimeoutRef.current);
          safetyTimeoutRef.current = null;
        }
      }
      return;
    }

    // CRITICAL: Initialize auth by processing redirect result FIRST, then setting up listener
    // This ensures getRedirectResult() completes before onAuthStateChange fires, preventing
    // the infinite loading loop where the listener sees null user before redirect is processed
    const attemptPopupFallback = async (error: unknown) => {
      const code = (error as { code?: string })?.code;
      if (code !== 'auth/network-request-failed') return;
      if (networkFallbackAttempted.current) return;

      networkFallbackAttempted.current = true;
      logger.debug('AuthContext', 'auth/network-request-failed detected, attempting popup fallback');

      try {
        const { signInWithPopup, signInWithRedirect, setPersistence, browserLocalPersistence } = await import('firebase/auth');
        await setPersistence(auth, browserLocalPersistence);
        try {
          await signInWithPopup(auth, googleProvider);
        } catch (popupError: any) {
          // If popup fails due to COOP or blocking, fallback to redirect
          if (popupError?.code === 'auth/popup-blocked' || popupError?.code?.includes('popup')) {
            logger.debug('AuthContext', 'Popup blocked, falling back to redirect');
            await signInWithRedirect(auth, googleProvider);
          } else {
            throw popupError;
          }
        }
      } catch (fallbackError) {
        logger.debug('AuthContext', 'Popup/redirect fallback failed or was blocked', fallbackError);
      }
    };

    const initAuth = async () => {
      // SAFETY TIMEOUT: Ensure loading is cleared after 5 seconds if getRedirectResult hasn't finished
      // This prevents infinite loading when COOP/handshake blocks the redirect
      const getRedirectResultTimeout = setTimeout(() => {
        if (!hasResolvedAuthState.current) {
          logger.debug('AuthContext', 'getRedirectResult safety timeout: Clearing loading state after 5 seconds');
          setIsLoading(false);
          setIsAuthReady(true);
          setIsRedirecting(false);
          pendingRedirect.current = false;
        }
      }, 5000);

      // CRITICAL: Set persistence BEFORE checking redirect result to help browser remember session
      try {
        const { setPersistence, browserLocalPersistence } = await import('firebase/auth');
        await setPersistence(auth, browserLocalPersistence);
        logger.debug('AuthContext', 'Session persistence set to browserLocalPersistence');
      } catch (persistenceError) {
        logger.error('AuthContext', 'Failed to set persistence:', persistenceError);
        // Continue anyway - persistence failure shouldn't block auth
      }

      // Check if URL contains auth/handler parameters (indicates we're returning from redirect)
      const urlHasAuthHandler = typeof window !== 'undefined' && (
        window.location.pathname.includes('/__/auth/handler') ||
        window.location.search.includes('auth/handler') ||
        window.location.hash.includes('auth/handler')
      );

      let redirectUser: FirebaseUser | null = null;

      try {
        // Step 1: MUST call getRedirectResult FIRST to 'claim' the result from the URL
        // If this isn't called, Firebase often fails to persist the session after redirect
        redirectUser = await handleGoogleRedirectResult();
        
        // Clear the safety timeout if we got a redirect result
        clearTimeout(getRedirectResultTimeout);
        
        if (!redirectUser) {
          // If we have auth/handler in URL but no redirect result, trigger popup fallback immediately
          if (urlHasAuthHandler) {
            logger.debug('AuthContext', 'URL contains auth/handler but getRedirectResult returned null - triggering popup fallback');
            try {
              const { signInWithPopup, signInWithRedirect } = await import('firebase/auth');
              logger.debug('AuthContext', 'Attempting popup fallback after redirect failure');
              try {
                await signInWithPopup(auth, googleProvider);
                // Popup will trigger onAuthStateChange - the listener below will handle it
                // Don't return early - let the normal flow continue
              } catch (popupError: any) {
                // If popup fails due to COOP or blocking, fallback to redirect
                if (popupError?.code === 'auth/popup-blocked' || popupError?.code?.includes('popup')) {
                  logger.debug('AuthContext', 'Popup blocked, falling back to redirect');
                  await signInWithRedirect(auth, googleProvider);
                } else {
                  throw popupError;
                }
              }
            } catch (fallbackError) {
              logger.error('AuthContext', 'Popup/redirect fallback failed:', fallbackError);
              console.dir(fallbackError, { depth: null });
            }
          }

          if (redirectFallbackTimeout.current) {
            clearTimeout(redirectFallbackTimeout.current);
          }
          redirectFallbackTimeout.current = setTimeout(() => {
            if (!hasResolvedAuthState.current) {
              logger.debug('AuthContext', 'No auth state change after redirect result; clearing loading state');
              setIsLoading(false);
              setIsAuthReady(true);
              setIsRedirecting(false);
              pendingRedirect.current = false;
            }
          }, 3000);
        }
        if (redirectUser) {
          logger.debug('AuthContext', 'Processed Google redirect result for user:', redirectUser.uid);
          
          // IMPORTANT: Ensure user exists in database BEFORE onAuthStateChange tries to fetch profile
          // This prevents race conditions where /api/me fails because user doesn't exist yet
          try {
            // CRITICAL: Force token refresh to ensure it's persisted and ready for backend
            // Even though handleGoogleRedirectResult already refreshes, we do it again here
            // to ensure we have the absolute latest token with all claims
            const token = await redirectUser.getIdToken(true);
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
            
            // 201 = created, 200 = already exists (from register endpoint), 409 = conflict - all are fine
            if (!registerRes.ok && registerRes.status !== 200 && registerRes.status !== 409) {
              const errorText = await registerRes.text().catch(() => 'Unknown error');
              logger.error('AuthContext', 'Failed to register redirect user in database', {
                status: registerRes.status,
                error: errorText
              });
            } else {
              logger.debug('AuthContext', 'User registered/verified in database, status:', registerRes.status);
              
              // Add 500ms cooldown to allow DB replication if using a distributed database
              // This ensures the user record is available when /api/me is called
              await new Promise(resolve => setTimeout(resolve, 500));
              
              logger.debug('AuthContext', 'Cooldown complete, user should be available in database');
            }
          } catch (registerError) {
            logger.error('AuthContext', 'Error registering redirect user:', registerError);
          }
        } else {
          logger.debug('AuthContext', 'No redirect result - user did not return from Google sign-in');
        }
      } catch (error) {
        // CATCH-ALL: Log FULL error object with console.dir to catch cross-origin blocks
        logger.error('AuthContext', 'Error processing redirect result:', error);
        console.error('[AuthContext] getRedirectResult() failed with error:');
        console.dir(error, { depth: null });
        
        // Check for cross-origin related errors
        const errorCode = (error as { code?: string })?.code;
        const errorMessage = (error as { message?: string })?.message;
        const errorString = String(error);
        
        if (
          errorCode?.includes('cross-origin') ||
          errorMessage?.includes('cross-origin') ||
          errorString.includes('cross-origin') ||
          errorCode === 'auth/network-request-failed'
        ) {
          logger.debug('AuthContext', 'Cross-origin or network error detected in redirect result');
        }

        // If URL has auth/handler parameters, trigger popup fallback immediately
        if (urlHasAuthHandler) {
          logger.debug('AuthContext', 'URL contains auth/handler and redirect failed - triggering popup fallback');
          try {
            const { signInWithPopup, signInWithRedirect } = await import('firebase/auth');
            logger.debug('AuthContext', 'Attempting popup fallback after redirect error');
            try {
              await signInWithPopup(auth, googleProvider);
              // Popup will trigger onAuthStateChange - the listener below will handle it
              // Don't return early - let the normal flow continue
            } catch (popupError: any) {
              // If popup fails due to COOP or blocking, fallback to redirect
              if (popupError?.code === 'auth/popup-blocked' || popupError?.code?.includes('popup')) {
                logger.debug('AuthContext', 'Popup blocked, falling back to redirect');
                await signInWithRedirect(auth, googleProvider);
              } else {
                throw popupError;
              }
            }
            clearTimeout(getRedirectResultTimeout);
          } catch (popupError) {
            logger.error('AuthContext', 'Popup fallback failed:', popupError);
            console.dir(popupError, { depth: null });
            // Only attempt network fallback if popup also failed
            await attemptPopupFallback(error);
          }
        } else {
          // Only attempt network fallback if it's a network error (not cross-origin)
          await attemptPopupFallback(error);
        }
        
        clearTimeout(getRedirectResultTimeout);
        // Don't clear loading here - let the fallback timeout handle it
        // This ensures we always clear after 3 seconds even if there's an error
      }

      // Step 2: ONLY AFTER getRedirectResult completes, start listening for state changes
      // This prevents the race condition where onAuthStateChange sees null user before redirect is processed
      return onAuthStateChange(async (firebaseUser: FirebaseUser | null) => {
        hasResolvedAuthState.current = true;
        if (redirectFallbackTimeout.current) {
          clearTimeout(redirectFallbackTimeout.current);
          redirectFallbackTimeout.current = null;
        }
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
        // clear loading immediately to avoid a stuck spinner during popup handshakes
        const isNewSignIn = previousUid === null && newUid !== null;
        if (isNewSignIn) {
          logger.debug('AuthContext', 'New sign-in detected, forcing immediate UI response');
          setIsLoading(false);
          setIsAuthReady(true);
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
          const currentPath =
            typeof window !== 'undefined'
              ? window.location.pathname
              : locationRef.current.pathname;
          const shouldRedirectOnNullUser = !publicPaths.includes(currentPath);

          if (firebaseUser) {
            // Forced cleanup + push: kill spinner and move immediately on login/signup.
            setIsLoading(false);
            setIsAuthReady(true);
            forceAuthNavigation(firebaseUser, userRef.current);

            try {
              // GATEKEEPER: Ensure we have a valid uid before making /api/me call
              // This prevents calls when Firebase token refresh is pending or mocked
              if (!firebaseUser.uid) {
                logger.debug('AuthContext', 'Skipping /api/me - no Firebase user uid available');
                setUser(null);
                setToken(null);
                setIsLoading(false);
                setIsAuthReady(true);
                return;
              }
              
              // CRITICAL: Force refresh token to get latest custom claims after Google signup
              // This ensures onboardingStatus and role are available before we set loading=false
              // Use getIdTokenResult(true) to force refresh and get claims
              let token: string;
              try {
                const tokenResult = await firebaseUser.getIdTokenResult(true);
                token = tokenResult.token;
                if (!token || token.length === 0) {
                  logger.debug('AuthContext', 'Skipping /api/me - no valid token available');
                  setUser(null);
                  setToken(null);
                  setIsLoading(false);
                  setIsAuthReady(true);
                  return;
                }
              } catch (tokenError) {
                logger.debug('AuthContext', 'Skipping /api/me - token fetch failed', tokenError);
                setUser(null);
                setToken(null);
                setIsLoading(false);
                setIsAuthReady(true);
                return;
              }
              
              setToken(token);
              logger.debug('AuthContext', 'Token refreshed with latest claims, fetching user profile from /api/me', {
                isNewSignIn,
                uid: firebaseUser.uid,
              });
              setIsRoleLoading(true);
              const res = await fetch('/api/me', {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (res.ok) {
                // Success - reset 401 counter
                consecutive401Count.current = 0;
                const apiUser = await res.json();
                const nextUser: User = normalizeUserFromApi(apiUser, firebaseUser.uid);
                setUser(nextUser);
                setIsRoleLoading(false);
                handleRedirect(nextUser);
                
                // CRITICAL: Only set loading false AFTER user is set and normalized
                setIsLoading(false);
                setIsAuthReady(true);
                // Clear safety timeout since auth succeeded
                if (safetyTimeoutRef.current) {
                  clearTimeout(safetyTimeoutRef.current);
                  safetyTimeoutRef.current = null;
                }
              } else if (res.status === 401) {
                // 401 means token is invalid or expired - force refresh token and retry once
                const now = Date.now();
                const timeSinceLastRetry = now - last401RetryTime.current;
                consecutive401Count.current += 1;
                
                // CIRCUIT BREAKER: Stop retrying after maximum consecutive 401s
                if (consecutive401Count.current >= MAX_CONSECUTIVE_401S) {
                  logger.error('AuthContext', `Circuit breaker triggered: ${MAX_CONSECUTIVE_401S} consecutive 401s. Stopping retries and logging out user.`, {
                    uid: firebaseUser.uid,
                    projectId: firebaseUser.auth.app.options.projectId,
                    lastRetryTime: last401RetryTime.current,
                  });
                  
                  // Log detailed error info for production debugging
                  try {
                    const errorText = await res.text();
                    logger.error('AuthContext', '401 error response:', {
                      status: res.status,
                      statusText: res.statusText,
                      body: errorText,
                      headers: Object.fromEntries(res.headers.entries()),
                    });
                  } catch (e) {
                    logger.error('AuthContext', 'Failed to read 401 error response', e);
                  }
                  
                  // Stop retrying and log out user
                  consecutive401Count.current = 0;
                  last401RetryTime.current = 0;
                  setUser(null);
                  setToken(null);
                  setIsRoleLoading(false);
                  setIsRedirecting(false);
                  pendingRedirect.current = false;
                  setIsLoading(false);
                  setIsAuthReady(true);
                  
                  // Clear safety timeout
                  if (safetyTimeoutRef.current) {
                    clearTimeout(safetyTimeoutRef.current);
                    safetyTimeoutRef.current = null;
                  }
                  
                  // Redirect to login with error message
                  handleRedirect(null);
                  return;
                }
                
                // Detect E2E mode for faster cooldown during tests
                const isE2E = 
                  import.meta.env.VITE_E2E === '1' ||
                  import.meta.env.MODE === 'test' ||
                  (typeof window !== 'undefined' && (
                    new URLSearchParams(window.location.search).get('e2e') === 'true' ||
                    localStorage.getItem('E2E_MODE') === 'true'
                  ));
                
                // Prevent rapid-fire retries: wait at least 2 seconds between retries (500ms in E2E mode)
                // If we've had 3+ consecutive 401s, wait 10 seconds before retrying (2 seconds in E2E mode)
                const cooldownMs = isE2E 
                  ? (consecutive401Count.current >= 3 ? 2000 : 500)
                  : (consecutive401Count.current >= 3 ? 10000 : 2000);
                
                if (timeSinceLastRetry < cooldownMs) {
                  logger.debug('AuthContext', `Skipping 401 retry - cooldown active (${cooldownMs - timeSinceLastRetry}ms remaining)`);
                  // User exists in Firebase but token is persistently invalid
                  // This might indicate the user needs to re-authenticate
                  setUser(null);
                  setToken(null);
                  setIsRedirecting(false);
                  pendingRedirect.current = false;
                  return;
                }
                
                last401RetryTime.current = now;
                logger.warn('AuthContext', `Received 401 from /api/me (attempt ${consecutive401Count.current}/${MAX_CONSECUTIVE_401S}), refreshing token...`, {
                  uid: firebaseUser.uid,
                  projectId: firebaseUser.auth.app.options.projectId,
                });
                
                try {
                  const refreshedToken = await firebaseUser.getIdToken(/* forceRefresh */ true);
                  if (!refreshedToken || refreshedToken.length === 0) {
                    logger.error('AuthContext', 'Token refresh returned empty token');
                    consecutive401Count.current = MAX_CONSECUTIVE_401S; // Trigger circuit breaker
                    return;
                  }
                  
                  setToken(refreshedToken);
                  logger.debug('AuthContext', 'Token refreshed, retrying /api/me...');
                  const retryRes = await fetch('/api/me', {
                    headers: {
                      'Authorization': `Bearer ${refreshedToken}`,
                      'Content-Type': 'application/json'
                    }
                  });
                  
                  if (retryRes.ok) {
                    // Success - reset 401 counter
                    consecutive401Count.current = 0;
                    last401RetryTime.current = 0;
                    const apiUser = await retryRes.json();
                    const nextUser: User = normalizeUserFromApi(apiUser, firebaseUser.uid);
                    setUser(nextUser);
                    setIsRoleLoading(false);
                    handleRedirect(nextUser);
                    
                    // CRITICAL: Only set loading false AFTER user is set and normalized
                    setIsLoading(false);
                    setIsAuthReady(true);
                    // Clear safety timeout since auth succeeded
                    if (safetyTimeoutRef.current) {
                      clearTimeout(safetyTimeoutRef.current);
                      safetyTimeoutRef.current = null;
                    }
                  } else if (retryRes.status === 404 || retryRes.status === 401) {
                    // User exists in Firebase but not in our database, or token still invalid
                    logger.warn('AuthContext', `Firebase user has no profile after retry (${retryRes.status}), or token still invalid`, {
                      attempt: consecutive401Count.current,
                      uid: firebaseUser.uid,
                    });
                    
                    // If we get another 401, increment the counter
                    if (retryRes.status === 401) {
                      consecutive401Count.current += 1;
                    }
                    
                    setUser(null);
                    setToken(refreshedToken);
                    setIsRoleLoading(false);
                    // ONLY redirect to onboarding if NOT on a protected public path
                    // The landing page should always be viewable
                    if (!isProtectedPublicPath(locationRef.current.pathname)) {
                      navigateRef.current('/onboarding', { replace: true });
                    }
                    setIsRedirecting(false);
                    pendingRedirect.current = false;
                    
                    // Set loading false after handling the error
                    setIsLoading(false);
                    setIsAuthReady(true);
                    // Clear safety timeout since we've resolved auth state
                    if (safetyTimeoutRef.current) {
                      clearTimeout(safetyTimeoutRef.current);
                      safetyTimeoutRef.current = null;
                    }
                  } else {
                    // Other error - user is logged out
                    consecutive401Count.current = 0;
                    last401RetryTime.current = 0;
                    setUser(null);
                    setIsRoleLoading(false);
                    handleRedirect(null);
                    
                    // Set loading false after handling the error
                    setIsLoading(false);
                    setIsAuthReady(true);
                    // Clear safety timeout since we've resolved auth state
                    if (safetyTimeoutRef.current) {
                      clearTimeout(safetyTimeoutRef.current);
                      safetyTimeoutRef.current = null;
                    }
                  }
                } catch (error) {
                  // Token refresh failed - user is logged out
                  logger.error('AuthContext', 'Token refresh failed:', error);
                  consecutive401Count.current += 1; // Increment counter on token refresh failure
                  
                  // If we've hit the limit, stop retrying
                  if (consecutive401Count.current >= MAX_CONSECUTIVE_401S) {
                    consecutive401Count.current = 0;
                    last401RetryTime.current = 0;
                    setUser(null);
                    setToken(null);
                    setIsRoleLoading(false);
                    handleRedirect(null);
                    
                    setIsLoading(false);
                    setIsAuthReady(true);
                    if (safetyTimeoutRef.current) {
                      clearTimeout(safetyTimeoutRef.current);
                      safetyTimeoutRef.current = null;
                    }
                  }
                }
              } else if (res.status === 404) {
                // User exists in Firebase but not in our database
                logger.debug('AuthContext', 'Firebase user has no profile (404)');
                
                // CRITICAL: If we're on the signup page, don't redirect to signup
                // This prevents redirect loops during signup flow where user is being created
                // The signup page will handle navigation to onboarding after user creation
                const isOnSignupPage = locationRef.current.pathname === '/signup';
                if (isOnSignupPage) {
                  logger.debug('AuthContext', 'On signup page, skipping redirect to prevent loop');
                  setUser(null);
                  setIsRoleLoading(false);
                  setIsRedirecting(false);
                  pendingRedirect.current = false;
                  setIsLoading(false);
                  setIsAuthReady(true);
                  // Clear safety timeout since we've resolved auth state
                  if (safetyTimeoutRef.current) {
                    clearTimeout(safetyTimeoutRef.current);
                    safetyTimeoutRef.current = null;
                  }
                  return; // Don't redirect, let signup page handle it
                }
                
                setUser(null);
                setIsRoleLoading(false);
                
                // Clear any local onboarding flags and state
                try {
                  localStorage.removeItem('onboarding_step');
                  localStorage.removeItem('redirect_url');
                  localStorage.removeItem('pending_redirect');
                  localStorage.removeItem('hospogo_auth_bridge');
                  sessionStorage.removeItem('signupRolePreference');
                  sessionStorage.removeItem('signupPlanPreference');
                  sessionStorage.removeItem('signupTrialMode');
                  sessionStorage.removeItem('oauth_state');
                } catch (storageError) {
                  // Ignore storage errors (e.g., private browsing mode)
                  logger.debug('AuthContext', 'Failed to clear storage flags', storageError);
                }
                
                // Redirect to /signup for fresh start (user will choose role there)
                // ONLY redirect if NOT on a protected public path
                // The landing page should always be viewable
                if (!isProtectedPublicPath(locationRef.current.pathname)) {
                  navigateRef.current('/signup', { replace: true });
                }
                setIsRedirecting(false);
                pendingRedirect.current = false;
                
                // Set loading false after handling the error
                setIsLoading(false);
                setIsAuthReady(true);
                // Clear safety timeout since we've resolved auth state
                if (safetyTimeoutRef.current) {
                  clearTimeout(safetyTimeoutRef.current);
                  safetyTimeoutRef.current = null;
                }
              } else {
                logger.error('AuthContext', 'User authenticated in Firebase but profile fetch failed', res.status);
                // For other errors, redirect to onboarding to allow user to complete profile
                setUser(null);
                setToken(null);
                handleRedirect(null);
                
                // Set loading false after handling the error
                setIsLoading(false);
                setIsAuthReady(true);
                // Clear safety timeout since we've resolved auth state
                if (safetyTimeoutRef.current) {
                  clearTimeout(safetyTimeoutRef.current);
                  safetyTimeoutRef.current = null;
                }
              }
            } catch (error) {
              console.error('Error fetching user profile:', error);
              setUser(null);
              setToken(null);
              handleRedirect(null);
              
              // Set loading false after handling the error
              setIsLoading(false);
              setIsAuthReady(true);
              // Clear safety timeout since we've resolved auth state
              if (safetyTimeoutRef.current) {
                clearTimeout(safetyTimeoutRef.current);
                safetyTimeoutRef.current = null;
              }
            }
          } else {
            setUser(null);
            setToken(null);
            // If we've explicitly triggered a redirect but auth resolves to null user, send to onboarding.
            if (!firebaseUser && shouldRedirectOnNullUser) {
              handleRedirect(null);
            }
            
            // Set loading false after state is cleared
            setIsLoading(false);
            setIsAuthReady(true);
            // Clear safety timeout since we've resolved auth state
            if (safetyTimeoutRef.current) {
              clearTimeout(safetyTimeoutRef.current);
              safetyTimeoutRef.current = null;
            }
          }
        } catch (error) {
          // Catch any unexpected errors in the callback itself
          console.error('Unexpected error in auth state change callback:', error);
          setUser(null);
          setToken(null);
          setIsRoleLoading(false);
          handleRedirect(null);
          
          // Set loading false after handling the error
          setIsLoading(false);
          setIsAuthReady(true);
          // Clear safety timeout since we've resolved auth state
          if (safetyTimeoutRef.current) {
            clearTimeout(safetyTimeoutRef.current);
            safetyTimeoutRef.current = null;
          }
        } finally {
          // Only cleanup refs here, don't set loading states
          isProcessingAuth.current = false;
        }
      });
    };

    // Wrap listener setup in try-catch to ensure loading states are always set
    (async () => {
      try {
        // CRITICAL: Await initAuth to ensure getRedirectResult completes before listener starts
        unsubscribeRef.current = await initAuth();
      } catch (error) {
        // If listener setup fails, still set loading states to prevent infinite loading
        console.error('Error setting up auth state listener:', error);
        isProcessingAuth.current = false;
        setIsLoading(false);
        setIsAuthReady(true);
      }
    })();

    // SAFETY TIMEOUT: Force loading to false after 6 seconds if no Firebase user is detected
    // This prevents users from being stuck behind a spinner when the auth handshake is blocked
    // by browser security headers (COOP/CORS) or other issues
    safetyTimeoutRef.current = setTimeout(() => {
      if (isLoading && !user && !auth.currentUser) {
        logger.debug('AuthContext', 'Safety timeout: Forcing loading state to false after 6 seconds without Firebase user');
        setIsLoading(false);
        setIsAuthReady(true);
        setIsRedirecting(false);
        pendingRedirect.current = false;
        // Clear loading state so user can at least see the landing page to try again
      }
    }, 6000);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (redirectFallbackTimeout.current) {
        clearTimeout(redirectFallbackTimeout.current);
        redirectFallbackTimeout.current = null;
      }
      if (manualPollingIntervalRef.current) {
        clearInterval(manualPollingIntervalRef.current);
        manualPollingIntervalRef.current = null;
      }
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
        reloadTimeoutRef.current = null;
      }
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      // Reset refs on cleanup (for HMR or unmount)
      hasInitialized.current = false;
      isProcessingAuth.current = false;
      currentAuthUid.current = null;
      pendingRedirect.current = false;
      last401RetryTime.current = 0;
      consecutive401Count.current = 0;
      hasResolvedAuthState.current = false;
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
      // RELIABILITY: Broadcast logout event to other tabs before clearing state
      if (typeof window !== 'undefined') {
        // Use BroadcastChannel for cross-tab communication (modern browsers)
        try {
          const logoutChannel = new BroadcastChannel('hospogo_auth_logout');
          logoutChannel.postMessage({ type: 'LOGOUT', timestamp: Date.now() });
          logoutChannel.close();
        } catch (bcError) {
          logger.debug('AuthContext', 'BroadcastChannel not available, using localStorage fallback', bcError);
        }

        // Fallback: Use localStorage event for cross-tab sync (works in all browsers)
        localStorage.setItem('hospogo_logout_event', JSON.stringify({ 
          type: 'LOGOUT', 
          timestamp: Date.now() 
        }));
        // Remove immediately to trigger storage event
        localStorage.removeItem('hospogo_logout_event');
      }

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
      last401RetryTime.current = 0;
      consecutive401Count.current = 0;
      
      // Sign out from Firebase
      await signOutUser();
      
      // Clear user state immediately
      setUser(null);
      setToken(null);
      setIsRoleLoading(false);
      
      // Navigate to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } catch (e) {
      console.error('Logout error', e);
      // Even if there's an error, clear state and navigate
      currentAuthUid.current = null;
      last401RetryTime.current = 0;
      consecutive401Count.current = 0;
      setUser(null);
      setToken(null);
      setIsRoleLoading(false);
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

  const refreshUser = async (retryCount = 0) => {
    logger.debug('AuthContext', 'refreshUser called', { retryCount });
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      logger.debug('AuthContext', 'refreshUser: No Firebase user, clearing state');
      setUser(null);
      setToken(null);
      setIsRoleLoading(false);
      return;
    }

    // Set role loading state when profile fetch starts
    setIsRoleLoading(true);

    try {
      logger.debug('AuthContext', 'refreshUser: Force refreshing token for user', { uid: firebaseUser.uid });
      // Force refresh token to ensure we have latest claims/session
      const token = await firebaseUser.getIdToken(true);
      setToken(token);
      
      // Small delay to ensure token is fully persisted and backend can verify it
      // This helps prevent race conditions where backend hasn't processed the new token yet
      await new Promise(resolve => setTimeout(resolve, 100));
      
      logger.debug('AuthContext', 'refreshUser: Token refreshed, fetching user profile');
      const res = await fetch('/api/me', {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (res.ok) {
        logger.debug('AuthContext', 'refreshUser: Successfully fetched user profile');
        const apiUser = await res.json();
        const nextUser: User = normalizeUserFromApi(apiUser, firebaseUser.uid);
        setUser(nextUser);
        // Role is successfully mapped - set isRoleLoading to false
        setIsRoleLoading(false);
        handleRedirect(nextUser, { force: true });
      } else if (res.status === 404) {
        // User exists in Firebase but not in our database
        // If user is authenticated via Firebase, retry once after 500ms before giving up
        if (firebaseUser && retryCount === 0) {
          logger.debug('AuthContext', 'refreshUser: 404 received, retrying after 500ms', { retryCount });
          await new Promise(resolve => setTimeout(resolve, 500));
          return refreshUser(1); // Retry once
        }
        
        logger.debug('AuthContext', 'refreshUser: Firebase user has no profile (404)');
        
        // CRITICAL: If we're on the signup page, don't redirect to signup
        // This prevents redirect loops during signup flow where user is being created
        const isOnSignupPage = locationRef.current.pathname === '/signup';
        if (isOnSignupPage) {
          logger.debug('AuthContext', 'refreshUser: On signup page, skipping redirect to prevent loop');
          setUser(null);
          setIsRoleLoading(false);
          setIsRedirecting(false);
          pendingRedirect.current = false;
          return; // Don't redirect, let signup page handle it
        }
        
        logger.debug('AuthContext', 'refreshUser: Redirecting to signup');
        setUser(null);
        setIsRoleLoading(false);
        
        // Clear any local onboarding flags and state
        try {
          localStorage.removeItem('onboarding_step');
          localStorage.removeItem('redirect_url');
          localStorage.removeItem('pending_redirect');
          localStorage.removeItem('hospogo_auth_bridge');
          sessionStorage.removeItem('signupRolePreference');
          sessionStorage.removeItem('signupPlanPreference');
          sessionStorage.removeItem('signupTrialMode');
          sessionStorage.removeItem('oauth_state');
        } catch (storageError) {
          // Ignore storage errors (e.g., private browsing mode)
          logger.debug('AuthContext', 'Failed to clear storage flags', storageError);
        }
        
        navigateRef.current('/signup', { replace: true });
        setIsRedirecting(false);
        pendingRedirect.current = false;
      } else if (res.status === 401) {
        // 401 means token is invalid or expired - try to refresh token once
        logger.debug('AuthContext', 'refreshUser: Received 401, retrying with fresh token');
        try {
          const refreshedToken = await firebaseUser.getIdToken(true);
          setToken(refreshedToken);
          
          // Small delay to ensure token is fully persisted
          await new Promise(resolve => setTimeout(resolve, 100));
          
          logger.debug('AuthContext', 'refreshUser: Retrying /api/me with refreshed token');
          const retryRes = await fetch('/api/me', {
            cache: 'no-store',
            headers: {
              'Authorization': `Bearer ${refreshedToken}`,
              'Pragma': 'no-cache',
              'Cache-Control': 'no-cache'
            }
          });
          
          if (retryRes.ok) {
            logger.debug('AuthContext', 'refreshUser: Retry successful, user profile fetched');
            const apiUser = await retryRes.json();
            const nextUser: User = normalizeUserFromApi(apiUser, firebaseUser.uid);
            setUser(nextUser);
            setIsRoleLoading(false);
            handleRedirect(nextUser, { force: true });
          } else if (retryRes.status === 404 || retryRes.status === 401) {
            // User exists in Firebase but not in our database - redirect to signup for fresh start
            // Also handle 401 as "no profile" since user just signed in with Firebase
            logger.debug('AuthContext', 'refreshUser: Firebase user has no profile');
            
            // CRITICAL: If we're on the signup page, don't redirect to signup
            const isOnSignupPage = locationRef.current.pathname === '/signup';
            if (isOnSignupPage) {
              logger.debug('AuthContext', 'refreshUser: On signup page, skipping redirect to prevent loop');
              setUser(null);
              setIsRoleLoading(false);
              setIsRedirecting(false);
              pendingRedirect.current = false;
              return; // Don't redirect, let signup page handle it
            }
            
            logger.debug('AuthContext', 'refreshUser: Redirecting to signup');
            setUser(null);
            setIsRoleLoading(false);
            
            // Clear any local onboarding flags and state
            try {
              localStorage.removeItem('onboarding_step');
              localStorage.removeItem('redirect_url');
              localStorage.removeItem('pending_redirect');
              localStorage.removeItem('hospogo_auth_bridge');
              sessionStorage.removeItem('signupRolePreference');
              sessionStorage.removeItem('signupPlanPreference');
              sessionStorage.removeItem('signupTrialMode');
              sessionStorage.removeItem('oauth_state');
            } catch (storageError) {
              // Ignore storage errors (e.g., private browsing mode)
              logger.debug('AuthContext', 'Failed to clear storage flags', storageError);
            }
            
            navigateRef.current('/signup', { replace: true });
            setIsRedirecting(false);
            pendingRedirect.current = false;
          } else {
            // Other error - still redirect to signup since user has valid Firebase session but no profile
            logger.debug('AuthContext', 'refreshUser: API error but Firebase user exists');
            
            // CRITICAL: If we're on the signup page, don't redirect to signup
            const isOnSignupPage = locationRef.current.pathname === '/signup';
            if (isOnSignupPage) {
              logger.debug('AuthContext', 'refreshUser: On signup page, skipping redirect to prevent loop');
              setUser(null);
              setIsRoleLoading(false);
              setIsRedirecting(false);
              pendingRedirect.current = false;
              return; // Don't redirect, let signup page handle it
            }
            
            logger.debug('AuthContext', 'refreshUser: Redirecting to signup');
            setUser(null);
            setIsRoleLoading(false);
            
            // Clear any local onboarding flags and state
            try {
              localStorage.removeItem('onboarding_step');
              localStorage.removeItem('redirect_url');
              localStorage.removeItem('pending_redirect');
              localStorage.removeItem('hospogo_auth_bridge');
              sessionStorage.removeItem('signupRolePreference');
              sessionStorage.removeItem('signupPlanPreference');
              sessionStorage.removeItem('signupTrialMode');
              sessionStorage.removeItem('oauth_state');
            } catch (storageError) {
              // Ignore storage errors (e.g., private browsing mode)
              logger.debug('AuthContext', 'Failed to clear storage flags', storageError);
            }
            
            navigateRef.current('/signup', { replace: true });
            setIsRedirecting(false);
            pendingRedirect.current = false;
          }
        } catch {
          // Token refresh failed but Firebase user exists - redirect to signup for fresh start
          logger.debug('AuthContext', 'refreshUser: Token refresh failed');
          
          // CRITICAL: If we're on the signup page, don't redirect to signup
          const isOnSignupPage = locationRef.current.pathname === '/signup';
          if (isOnSignupPage) {
            logger.debug('AuthContext', 'refreshUser: On signup page, skipping redirect to prevent loop');
            setUser(null);
            setToken(null);
            setIsRoleLoading(false);
            setIsRedirecting(false);
            pendingRedirect.current = false;
            return; // Don't redirect, let signup page handle it
          }
          
          logger.debug('AuthContext', 'refreshUser: Redirecting to signup');
          setUser(null);
          setToken(null);
          setIsRoleLoading(false);
          
          // Clear any local onboarding flags and state
          try {
            localStorage.removeItem('onboarding_step');
            localStorage.removeItem('redirect_url');
            localStorage.removeItem('pending_redirect');
            localStorage.removeItem('hospogo_auth_bridge');
            sessionStorage.removeItem('signupRolePreference');
            sessionStorage.removeItem('signupPlanPreference');
            sessionStorage.removeItem('signupTrialMode');
            sessionStorage.removeItem('oauth_state');
          } catch (storageError) {
            // Ignore storage errors (e.g., private browsing mode)
            logger.debug('AuthContext', 'Failed to clear storage flags', storageError);
          }
          
          navigateRef.current('/signup', { replace: true });
          setIsRedirecting(false);
          pendingRedirect.current = false;
        }
      } else {
        logger.error('AuthContext', 'Failed to refresh user profile', res.status);
        setIsRoleLoading(false);
      }
    } catch (error) {
      logger.error('AuthContext', 'Error refreshing user profile:', error);
      console.error('Error refreshing user profile:', error);
      setIsRoleLoading(false);
    }
  };

  useEffect(() => {
    refreshUserRef.current = refreshUser;
  }, [refreshUser]);

  const extractAuthTokenFromMessage = (data: unknown): string | null => {
    if (!data) return null;

    if (typeof data === 'string') {
      const tokenLike = data.trim();
      if (tokenLike.split('.').length === 3) {
        return tokenLike;
      }
      return null;
    }

    if (typeof data === 'object') {
      const payload = data as Record<string, unknown>;
      const tokenCandidate =
        (payload.token as string | undefined) ??
        (payload.idToken as string | undefined) ??
        (payload.accessToken as string | undefined) ??
        ((payload.stsTokenManager as { accessToken?: string; idToken?: string } | undefined)?.accessToken) ??
        ((payload.stsTokenManager as { accessToken?: string; idToken?: string } | undefined)?.idToken) ??
        ((payload.detail as { token?: string } | undefined)?.token) ??
        ((payload.data as { token?: string } | undefined)?.token);

      if (typeof tokenCandidate === 'string' && tokenCandidate.split('.').length === 3) {
        return tokenCandidate;
      }
    }

    return null;
  };

  const hardSyncWithToken = async (tokenValue: string, source: string) => {
    if (!auth.currentUser) {
      logger.debug('AuthContext', 'Hard sync skipped - no Firebase user', { source });
      return;
    }
    logger.debug('AuthContext', 'Hard sync token received, fetching profile', { source });
    const res = await fetch('/api/me', {
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${tokenValue}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache',
      },
    });

    if (!res.ok) {
      logger.debug('AuthContext', 'Hard sync token fetch failed', { source, status: res.status });
      return;
    }

    const apiUser = await res.json();
    const firebaseUid =
      (apiUser?.uid as string | undefined) ||
      (apiUser?.id as string | undefined) ||
      auth.currentUser?.uid ||
      '';
    const nextUser = normalizeUserFromApi(apiUser, firebaseUid);
    setToken(tokenValue);
    setUser(nextUser);
    setIsLoading(false);
    setIsAuthReady(true);
    setIsRedirecting(false);
    pendingRedirect.current = false;
    hasResolvedAuthState.current = true;
    handleRedirect(nextUser);
  };

  const clearUserState = (reason?: string) => {
    logger.debug('AuthContext', 'Clearing local user state', { reason });
    setUser(null);
    setToken(null);
    setIsRoleLoading(false);
    setIsRedirecting(false);
    pendingRedirect.current = false;
    currentAuthUid.current = null;
    last401RetryTime.current = 0;
    consecutive401Count.current = 0;
    setIsLoading(false);
    setIsAuthReady(true);
    hasResolvedAuthState.current = true;
  };

  const attemptHardSync = async (source: string, tokenValue?: string) => {
    if (hardSyncInProgress.current) return;

    hardSyncInProgress.current = true;
    try {
      if (tokenValue) {
        await hardSyncWithToken(tokenValue, source);
        return;
      }

      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        logger.debug('AuthContext', 'Hard sync skipped - no Firebase user', { source });
        return;
      }

      await firebaseUser.getIdToken(true);
      await refreshUserRef.current();
    } catch (error) {
      logger.debug('AuthContext', 'Hard sync failed', { source, error });
    } finally {
      hardSyncInProgress.current = false;
    }
  };

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        // Token was revoked or user signed out - force state refresh
        logger.debug('AuthContext', 'onIdTokenChanged: Token revoked, forcing state refresh');
        setUser(null);
        setToken(null);
        setIsLoading(false);
        setIsAuthReady(true);
        return;
      }
      
      hasResolvedAuthState.current = true;

      // CRITICAL: kill loading spinner the moment a token-backed user appears.
      setIsLoading(false);
      setIsAuthReady(true);
      forceAuthNavigation(firebaseUser, userRef.current);

      // RELIABILITY: Always force a global state refresh on token change
      // This ensures all tabs stay in sync when tokens refresh
      logger.debug('AuthContext', 'onIdTokenChanged: Token changed, forcing global state refresh');
      await refreshUserRef.current();
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname === '/auth/bridge') return;

    const allowedOrigins = new Set<string>([
      window.location.origin,
      'https://hospogo.com',
      'https://www.hospogo.com',
      // Legacy Firebase domain for auth handler compatibility
      'https://snipshift-75b04.firebaseapp.com',
    ]);

    const handleMessage = (event: MessageEvent) => {
      const isObjectPayload = typeof event.data === 'object' && event.data !== null;
      const payload = isObjectPayload ? (event.data as Record<string, unknown>) : null;
      const hasUid = !!payload && 'uid' in payload;
      const hasStsTokenManager = !!payload && 'stsTokenManager' in payload;
      const isBruteForceAuthPayload = hasUid || hasStsTokenManager;

      if (!allowedOrigins.has(event.origin) && !isBruteForceAuthPayload) return;
      if (hasMessageHardSynced.current && userRef.current) return;

      const tokenValue = extractAuthTokenFromMessage(event.data);
      const messageType =
        typeof event.data === 'object' && event.data
          ? String((event.data as { type?: string }).type || '')
          : '';
      const looksLikeAuthEvent = messageType.toLowerCase().includes('auth');

      if (!tokenValue && !looksLikeAuthEvent && !isBruteForceAuthPayload) return;
      if (!isLoadingRef.current && userRef.current) return;

      hasMessageHardSynced.current = true;
      attemptHardSync('postMessage', tokenValue || undefined);
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const AUTH_BRIDGE_TOKEN_KEY = 'hospogo_bridge_token';

    const clearBridgeCookie = () => {
      document.cookie = `${AUTH_BRIDGE_COOKIE_NAME}=; Path=/; Max-Age=0`;
    };

    const clearBridgeToken = () => {
      localStorage.removeItem(AUTH_BRIDGE_TOKEN_KEY);
    };

    const readBridgeCookie = (): { uid?: string; ts?: number } | null => {
      const cookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${AUTH_BRIDGE_COOKIE_NAME}=`));
      if (!cookie) return null;

      try {
        const rawValue = decodeURIComponent(cookie.split('=')[1] || '');
        return JSON.parse(rawValue) as { uid?: string; ts?: number };
      } catch (error) {
        logger.debug('AuthContext', 'Failed to parse bridge cookie', error);
        return null;
      }
    };

    const readBridgeToken = (): { token?: string; uid?: string; ts?: number } | null => {
      try {
        const tokenData = localStorage.getItem(AUTH_BRIDGE_TOKEN_KEY);
        if (!tokenData) return null;
        return JSON.parse(tokenData) as { token?: string; uid?: string; ts?: number };
      } catch (error) {
        logger.debug('AuthContext', 'Failed to parse bridge token', error);
        return null;
      }
    };

    const checkBridge = async () => {
      // Check cookie first
      const cookiePayload = readBridgeCookie();
      if (cookiePayload?.uid) {
        const ageMs = cookiePayload.ts ? Date.now() - cookiePayload.ts : 0;
        if (cookiePayload.ts && ageMs > 120000) {
          clearBridgeCookie();
        } else {
          clearBridgeCookie();
          logger.debug('AuthContext', 'Bridge cookie detected, triggering refreshUser and redirect', {
            uid: cookiePayload.uid
          });
          await refreshUserRef.current();
          window.location.assign('/onboarding');
          return;
        }
      }

      // Check localStorage token as fallback
      const tokenPayload = readBridgeToken();
      if (tokenPayload && (tokenPayload.uid || tokenPayload.token)) {
        const ageMs = tokenPayload.ts ? Date.now() - tokenPayload.ts : 0;
        if (tokenPayload.ts && ageMs > 120000) {
          clearBridgeToken();
        } else {
          clearBridgeToken();
          logger.debug('AuthContext', 'Bridge token detected, triggering refreshUser and redirect', {
            uid: tokenPayload.uid,
            hasToken: !!tokenPayload.token
          });
          // If we have a token, set it before refreshing
          if (tokenPayload.token) {
            setToken(tokenPayload.token);
          }
          await refreshUserRef.current();
          window.location.assign('/onboarding');
          return;
        }
      }
    };

    checkBridge();
    const interval = setInterval(checkBridge, 500);

    return () => clearInterval(interval);
  }, []);

  // MANUAL LOCALSTORAGE BRIDGE: Listen for popup auth completion via storage events
  // This bypasses COOP/CORS/Partitioning by using localStorage cross-window communication
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = async (event: StorageEvent) => {
      // Only react to our bridge key
      if (event.key !== 'hospogo_auth_bridge') return;
      if (!event.newValue) return;

      try {
        const bridgeData = JSON.parse(event.newValue) as { uid?: string; ts?: number };
        if (!bridgeData.uid || !bridgeData.ts) return;

        // Only process if bridge is recent (less than 30 seconds old)
        const age = Date.now() - bridgeData.ts;
        if (age > 30000) {
          logger.debug('AuthContext', 'localStorage bridge too old, ignoring', { age });
          return;
        }

        logger.debug('AuthContext', 'localStorage bridge detected, forcing auth reload and redirect', {
          uid: bridgeData.uid,
          age
        });

        // Force Firebase auth reload to sync state
        try {
          await auth.currentUser?.reload();
        } catch (reloadError) {
          logger.debug('AuthContext', 'Auth reload failed (non-critical)', reloadError);
        }

        // Force user refresh and redirect
        await refreshUserRef.current();
        
        // Force immediate redirect to onboarding
        navigateRef.current('/onboarding', { replace: true });
        setIsLoading(false);
        setIsAuthReady(true);
        setIsRedirecting(false);
        pendingRedirect.current = false;
      } catch (error) {
        logger.debug('AuthContext', 'Failed to process localStorage bridge', error);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // RELIABILITY: Multi-tab logout sync - Listen for logout events from other tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // BroadcastChannel listener (modern browsers)
    let logoutChannel: BroadcastChannel | null = null;
    try {
      logoutChannel = new BroadcastChannel('hospogo_auth_logout');
      logoutChannel.onmessage = (event) => {
        if (event.data?.type === 'LOGOUT') {
          logger.debug('AuthContext', 'Logout event received via BroadcastChannel from another tab');
          // Clear state and redirect to login
          setUser(null);
          setToken(null);
          setIsRoleLoading(false);
          setIsLoading(false);
          setIsAuthReady(true);
          currentAuthUid.current = null;
          last401RetryTime.current = 0;
          consecutive401Count.current = 0;
          navigateRef.current('/login', { replace: true });
        }
      };
    } catch (error) {
      logger.debug('AuthContext', 'BroadcastChannel not available for logout sync', error);
    }

    // localStorage fallback listener (all browsers)
    const handleLogoutStorage = (event: StorageEvent) => {
      // Only process events from other tabs (not the current tab)
      if (event.key === 'hospogo_logout_event' && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          if (data.type === 'LOGOUT') {
            logger.debug('AuthContext', 'Logout event received via localStorage from another tab');
            // Clear state and redirect to login
            setUser(null);
            setToken(null);
            setIsRoleLoading(false);
            setIsLoading(false);
            setIsAuthReady(true);
            currentAuthUid.current = null;
            last401RetryTime.current = 0;
            consecutive401Count.current = 0;
            navigateRef.current('/login', { replace: true });
          }
        } catch (parseError) {
          logger.debug('AuthContext', 'Failed to parse logout event from storage', parseError);
        }
      }
    };

    window.addEventListener('storage', handleLogoutStorage);

    return () => {
      if (logoutChannel) {
        logoutChannel.close();
      }
      window.removeEventListener('storage', handleLogoutStorage);
    };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (hardSyncTimeoutRef.current) {
        clearTimeout(hardSyncTimeoutRef.current);
        hardSyncTimeoutRef.current = null;
      }
      return;
    }

    if (hardSyncTimeoutRef.current) {
      clearTimeout(hardSyncTimeoutRef.current);
    }

    hardSyncTimeoutRef.current = setTimeout(async () => {
      if (!isLoadingRef.current) return;
      if (userRef.current || auth.currentUser) return;

      logger.debug('AuthContext', 'Circuit breaker triggered after 4s without auth state');
      setIsLoading(false);
      setIsAuthReady(true);
      setIsRedirecting(false);
      pendingRedirect.current = false;
      toastRef.current({
        title: 'Connection delayed - Refreshing session...',
        variant: 'destructive',
      });

      try {
        await auth.currentUser?.reload();
        if (auth.currentUser) {
          await refreshUserRef.current();
        }
      } catch (error) {
        logger.debug('AuthContext', 'Silent auth reload failed', error);
      }
    }, 4000);

    return () => {
      if (hardSyncTimeoutRef.current) {
        clearTimeout(hardSyncTimeoutRef.current);
        hardSyncTimeoutRef.current = null;
      }
    };
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading) {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
        reloadTimeoutRef.current = null;
      }
      return;
    }

    if (reloadTimeoutRef.current) {
      clearTimeout(reloadTimeoutRef.current);
    }

    reloadTimeoutRef.current = setTimeout(() => {
      if (!isLoadingRef.current || hasReloadedRef.current) return;
      hasReloadedRef.current = true;
      window.location.reload();
    }, 10000);

    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
        reloadTimeoutRef.current = null;
      }
    };
  }, [isLoading]);

  // EMERGENCY EXIT: Aggressive State Break Watchdog
  // Check auth.currentUser every 1 second. If user exists but isLoading is still true,
  // force break the loading state and redirect to onboarding
  useEffect(() => {
    const watchdogInterval = setInterval(() => {
      const currentUser = auth.currentUser;
      if (currentUser && isLoadingRef.current) {
        logger.debug('AuthContext', 'WATCHDOG: currentUser exists but isLoading is true - forcing break', {
          uid: currentUser.uid,
          isLoading: isLoadingRef.current
        });
        setIsLoading(false);
        setIsAuthReady(true);
        setIsRedirecting(false);
        pendingRedirect.current = false;
        window.location.assign('/onboarding');
      }
    }, 1000);

    return () => {
      clearInterval(watchdogInterval);
    };
  }, []);

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
    isRoleLoading,
    login,
    logout,
    clearUserState,
    setCurrentRole,
    hasRole,
    updateRoles,
    getToken,
    refreshUser,
    triggerPostAuthRedirect,
    startManualAuthPolling,
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
