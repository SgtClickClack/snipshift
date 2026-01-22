/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import { browserLocalPersistence, getRedirectResult, onAuthStateChanged, setPersistence, signOut, type User as FirebaseUser } from 'firebase/auth';
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
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

async function fetchAppUser(idToken: string): Promise<User | null> {
  const res = await fetch('/api/me', {
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (res.ok) {
    const apiUser = (await res.json()) as User;
    return apiUser;
  }

  // 404 is expected for brand new Firebase users that haven't been created in our DB yet.
  if (res.status === 404) return null;

  // Anything else: keep the app stable and treat as "no profile".
  logger.warn('AuthContext', 'Failed to fetch /api/me', { status: res.status });
  return null;
}

/**
 * Create a new user in our database for OAuth providers (Google).
 * This is called when we detect a Firebase user from redirect result that doesn't exist in our DB.
 * Returns the created user or null if creation failed.
 */
async function createOAuthUserInDatabase(firebaseUser: FirebaseUser, idToken: string): Promise<User | null> {
  console.log('[AuthContext] Creating OAuth user in database', { 
    uid: firebaseUser.uid, 
    email: firebaseUser.email 
  });
  
  try {
    const registerRes = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        password: '', // Passwordless/OAuth
        provider: 'google',
      }),
    });

    // 201 = created, 409 = already exists - both are acceptable
    if (registerRes.ok || registerRes.status === 409) {
      console.log('[AuthContext] OAuth user created/exists in database', { 
        status: registerRes.status,
        email: firebaseUser.email 
      });
      
      // Now fetch the user profile
      const userProfile = await fetchAppUser(idToken);
      return userProfile;
    }

    // Log error but don't throw - let the app continue
    const errorData = await registerRes.json().catch(() => ({}));
    console.error('[AuthContext] Failed to create OAuth user in database', {
      status: registerRes.status,
      error: errorData,
    });
    return null;
  } catch (error) {
    console.error('[AuthContext] Error creating OAuth user in database', error);
    return null;
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Keep the current Firebase user without ever touching auth.currentUser.
  const firebaseUserRef = useRef<FirebaseUser | null>(null);

  const login = useCallback((newUser: User) => {
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    firebaseUserRef.current = null;
    setUser(null);
    setToken(null);
  }, []);

  const hydrateFromFirebaseUser = useCallback(async (firebaseUser: FirebaseUser) => {
    console.log('[AuthContext] Hydrating user from Firebase', { 
      uid: firebaseUser.uid, 
      email: firebaseUser.email 
    });
    
    const idToken = await firebaseUser.getIdToken();
    setToken(idToken);

    const apiUser = await fetchAppUser(idToken);
    if (apiUser) {
      console.log('[AuthContext] User profile fetched successfully', { 
        id: apiUser.id, 
        isOnboarded: apiUser.isOnboarded,
        hasCompletedOnboarding: apiUser.hasCompletedOnboarding 
      });
      setUser({ ...apiUser, uid: firebaseUser.uid });
    } else {
      // Firebase session exists, but no DB profile yet (new user / still registering).
      console.log('[AuthContext] No user profile in DB (404) - user may need to complete registration');
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const firebaseUser = firebaseUserRef.current;
    if (!firebaseUser) return;
    try {
      await hydrateFromFirebaseUser(firebaseUser);
    } catch (error) {
      logger.error('AuthContext', 'refreshUser failed', error);
    }
  }, [hydrateFromFirebaseUser]);

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
        // STEP 1: Await getRedirectResult as the VERY FIRST action
        // This processes any Google OAuth redirect tokens before anything else
        console.log('[AuthContext] Processing redirect result...');
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user) {
          // Redirect result found - this is from Google OAuth redirect
          console.log('[AuthContext] Redirect result found', { 
            uid: redirectResult.user.uid,
            email: redirectResult.user.email,
            provider: redirectResult.providerId 
          });
          firebaseUserRef.current = redirectResult.user;
          
          // Get ID token for API calls
          const idToken = await redirectResult.user.getIdToken();
          setToken(idToken);
          
          // Try to fetch existing user profile
          let apiUser = await fetchAppUser(idToken);
          
          // CRITICAL FIX: If user doesn't exist in our DB (404), create them
          // This handles the case where Google redirect completed but user wasn't created
          if (!apiUser) {
            console.log('[AuthContext] New Google user detected (redirect flow) - creating in database');
            apiUser = await createOAuthUserInDatabase(redirectResult.user, idToken);
          }
          
          if (apiUser) {
            console.log('[AuthContext] User profile loaded', { 
              id: apiUser.id, 
              email: apiUser.email,
              isOnboarded: apiUser.isOnboarded 
            });
            setUser({ ...apiUser, uid: redirectResult.user.uid });
          } else {
            // Even if we couldn't create/fetch the user, set user to null
            // The signup page will handle redirecting to onboarding
            console.log('[AuthContext] Could not load/create user profile, proceeding with null user');
            setUser(null);
          }
        } else {
          console.log('[AuthContext] No redirect result found');
          
          // FALLBACK: Check window.location.search manually if getRedirectResult returns null
          // Chrome's bounce tracking may strip apiKey params during redirect from firebaseapp.com
          // to hospogo.com, causing getRedirectResult to return null even when auth succeeded
          const urlParams = new URLSearchParams(window.location.search);
          const apiKey = urlParams.get('apiKey');
          
          if (apiKey) {
            console.log('[AuthContext] apiKey found in URL params - Chrome bounce tracking may have interfered');
            console.log('[AuthContext] Forcing re-initialization of Firebase Auth state...');
            
            // Force a re-initialization by checking auth.currentUser
            // If the user is authenticated but getRedirectResult failed, we need to hydrate manually
            const currentUser = auth.currentUser;
            if (currentUser) {
              console.log('[AuthContext] Found authenticated user via auth.currentUser fallback', {
                uid: currentUser.uid,
                email: currentUser.email
              });
              firebaseUserRef.current = currentUser;
              await hydrateFromFirebaseUser(currentUser);
            } else {
              console.log('[AuthContext] No authenticated user found despite apiKey in URL - may need to retry auth flow');
            }
            
            // Clean up the URL params to prevent re-processing
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, '', cleanUrl);
          }
        }

        // STEP 2: Wrap onAuthStateChanged in a Promise that resolves after the first callback
        // This ensures we wait for the initial auth state before proceeding
        await new Promise<void>((resolve) => {
          unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            firebaseUserRef.current = firebaseUser;

            try {
              if (!firebaseUser) {
                setUser(null);
                setToken(null);
              } else {
                await hydrateFromFirebaseUser(firebaseUser);
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

        // STEP 3: Both getRedirectResult and initial onAuthStateChanged have completed
        // Now we can safely set isLoading to false
        console.log('[AuthContext] Handshake is Complete');
        setIsLoading(false);
        
        // NOTE: Auto-navigation removed to prevent race conditions.
        // Each page (signup, login, etc.) handles its own redirect logic based on:
        // - Whether user has a database profile
        // - Whether user has completed onboarding
        // - The current route
        // This prevents the "stuck on splash screen" issue for new Google signups.
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

  // Additional useEffect to handle navigation after auth state changes
  // This provides a secondary navigation trigger when user state updates
  useEffect(() => {
    if (!isLoading && user) {
      const currentPath = window.location.pathname;
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

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isLoading,
      isAuthReady: !isLoading, // Alias for !isLoading, used by some components
      // Consider the user authenticated if Firebase session exists (token set), even if /api/me is still 404.
      isAuthenticated: !!token,
      login,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, login, logout, refreshUser]
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
