/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import { browserLocalPersistence, onAuthStateChanged, setPersistence, signOut, type User as FirebaseUser } from 'firebase/auth';
import { logger } from '@/lib/logger';

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
  hasUser: boolean; // Standardized: true when user object exists (DB profile loaded)
  hasFirebaseUser: boolean; // True when Firebase session exists
  login: (user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

async function fetchAppUser(
  idToken: string, 
  isOnboardingMode: boolean = false,
  firebaseUser?: FirebaseUser | null
): Promise<User | null> {
  // Skip fetch entirely if in onboarding mode
  if (isOnboardingMode) {
    console.log('[AuthContext] Skipping /api/me fetch - onboarding mode active');
    return null;
  }

  // Double-check pathname before making the request (defensive check)
  // Suppress on signup/onboarding routes since new users don't have DB profiles yet
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/onboarding') || currentPath === '/signup') {
      console.log('[AuthContext] Skipping /api/me fetch - on signup/onboarding route', {
        pathname: currentPath
      });
      return null;
    }
  }

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
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Keep the current Firebase user without ever touching auth.currentUser.
  const firebaseUserRef = useRef<FirebaseUser | null>(null);
  // Track if we're in onboarding mode to prevent profile fetches
  const isOnboardingModeRef = useRef<boolean>(false);

  const login = useCallback((newUser: User) => {
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    firebaseUserRef.current = null;
    setFirebaseUser(null);
    setUser(null);
    setToken(null);
  }, []);

  const hydrateFromFirebaseUser = useCallback(async (firebaseUser: FirebaseUser) => {
    console.log('[AuthContext] Hydrating user from Firebase', { 
      uid: firebaseUser.uid, 
      email: firebaseUser.email 
    });
    
    // CRITICAL: Check signup/onboarding mode BEFORE any async operations to prevent race conditions
    // Suppress profile fetch on signup/onboarding routes since new users don't have DB profiles yet
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isOnSignupOrOnboarding = currentPath.startsWith('/onboarding') || 
                                  currentPath === '/signup' || 
                                  isOnboardingModeRef.current;
    
    if (isOnSignupOrOnboarding) {
      isOnboardingModeRef.current = true;
      console.log('[AuthContext] On signup/onboarding route - suppressing profile fetch', {
        pathname: currentPath
      });
      // Still set token for use by onboarding form, but skip profile fetch
      // Force refresh to ensure we have a valid token after popup auth
      const idToken = await firebaseUser.getIdToken(/* forceRefresh */ true);
      setToken(idToken);
      setUser(null); // Keep user as null since profile doesn't exist yet
      return;
    }

    // Clear onboarding mode flag if we're not on signup/onboarding route
    isOnboardingModeRef.current = false;

    // Force refresh token after popup authentication to ensure we have a fresh, valid token
    // This is critical because tokens may not be immediately available after popup auth
    const idToken = await firebaseUser.getIdToken(/* forceRefresh */ true);
    setToken(idToken);

    const apiUser = await fetchAppUser(idToken, isOnboardingModeRef.current, firebaseUser);
    if (apiUser) {
      console.log('[AuthContext] User profile fetched successfully', { 
        id: apiUser.id, 
        isOnboarded: apiUser.isOnboarded,
        hasCompletedOnboarding: apiUser.hasCompletedOnboarding 
      });
      setUser({ ...apiUser, uid: firebaseUser.uid });
      
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
      // Firebase session exists, but no DB profile yet (new user / still registering).
      console.log('[AuthContext] No user profile in DB (404) - user may need to complete registration');
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const firebaseUser = firebaseUserRef.current;
    if (!firebaseUser) return;
    
    // CRITICAL: Skip refresh on signup/onboarding route to prevent 401/404 polling loop
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isOnSignupOrOnboarding = currentPath.startsWith('/onboarding') || 
                                  currentPath === '/signup' || 
                                  isOnboardingModeRef.current;
    
    if (isOnSignupOrOnboarding) {
      isOnboardingModeRef.current = true;
      console.log('[AuthContext] On signup/onboarding route - suppressing profile refresh', {
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
  // This ensures we suppress fetches even if onAuthStateChanged fires before navigation completes
  useEffect(() => {
    const isOnSignupOrOnboarding = location.pathname.startsWith('/onboarding') || 
                                   location.pathname === '/signup';
    isOnboardingModeRef.current = isOnSignupOrOnboarding;
    if (isOnSignupOrOnboarding) {
      console.log('[AuthContext] Pathname changed - onboarding mode active', {
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
                    console.log('[AuthContext] Popup auth successful, navigating to dashboard');
                    navigate('/dashboard', { replace: true });
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
    
    const searchParams = new URLSearchParams(window.location.search);
    const hasApiKey = searchParams.has('apiKey');
    const hasAuthMode = searchParams.get('mode') === 'signIn' || searchParams.get('mode') === 'signUp';
    
    if (hasApiKey || hasAuthMode) {
      console.log('[AuthContext] Detected Firebase auth params in URL', { 
        hasApiKey, 
        hasAuthMode,
        search: window.location.search,
        hasToken: !!token,
        hasFirebaseUser: !!firebaseUserRef.current
      });
      
      // Check if Firebase user exists for auth completion
      const currentFirebaseUser = firebaseUserRef.current || auth.currentUser;
      const hasFirebaseUser = !!currentFirebaseUser;
      
      if (hasFirebaseUser) {
        // User is authenticated - force navigation to dashboard
        const hasCompletedOnboarding = user?.hasCompletedOnboarding !== false && user?.isOnboarded !== false;
        const targetPath = hasCompletedOnboarding ? '/dashboard' : '/onboarding';
        
        console.log('[AuthContext] Auth params detected + user authenticated, forcing navigation to', targetPath);
        
        // Clean URL parameters before navigating
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
        
        // Navigate immediately
        navigate(targetPath, { replace: true });
      }
    }
  }, [isLoading, token, user, navigate]);

  // Additional useEffect to handle navigation after auth state changes
  // This provides a secondary navigation trigger when user state updates
  useEffect(() => {
    if (!isLoading && user) {
      const currentPath = window.location.pathname;
      
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
      
      // Redirect authenticated users away from public-only routes
      if (currentPath === '/login' || currentPath === '/signup') {
        // Check if user has completed onboarding before redirecting to dashboard
        const hasCompletedOnboarding = user.hasCompletedOnboarding !== false && user.isOnboarded !== false;
        if (hasCompletedOnboarding) {
          console.log('[Auth] User authenticated + onboarded, redirecting from', currentPath, 'to /dashboard');
          navigate('/dashboard', { replace: true });
        } else {
          console.log('[Auth] User authenticated but not onboarded, redirecting from', currentPath, 'to /onboarding');
          navigate('/onboarding', { replace: true });
        }
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
      isAuthReady: !isLoading, // Alias for !isLoading, used by some components
      // Standardized: true when user object exists (DB profile loaded)
      hasUser: !!user,
      hasFirebaseUser: !!firebaseUser,
      login,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, firebaseUser, login, logout, refreshUser]
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
