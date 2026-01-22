/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    const idToken = await firebaseUser.getIdToken();
    setToken(idToken);

    const apiUser = await fetchAppUser(idToken);
    if (apiUser) {
      setUser({ ...apiUser, uid: firebaseUser.uid });
    } else {
      // Firebase session exists, but no DB profile yet (new user / still registering).
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

    // Process redirect result BEFORE setting up onAuthStateChanged
    // This ensures that if the app loads with auth params in the URL (e.g., after Google redirect),
    // they are processed before the Guard decides to redirect to the landing page.
    // isLoading stays TRUE until both getRedirectResult and the initial onAuthStateChanged complete.
    const processRedirectResult = async () => {
      try {
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user) {
          // Redirect result found - hydrate the user
          firebaseUserRef.current = redirectResult.user;
          await hydrateFromFirebaseUser(redirectResult.user);
        }
      } catch (error) {
        logger.error('AuthContext', 'Failed to process redirect result', error);
      }
    };

    // Process redirect result first, then set up auth state listener
    processRedirectResult().finally(() => {
      // Set up auth state listener after redirect result is processed
      unsub = onAuthStateChanged(auth, async (firebaseUser) => {
        firebaseUserRef.current = firebaseUser;

        try {
          if (!firebaseUser) {
            setUser(null);
            setToken(null);
            // Only set loading to false on the initial auth check
            if (isInitialAuthCheck) {
              setIsLoading(false);
              isInitialAuthCheck = false;
            }
            return;
          }

          await hydrateFromFirebaseUser(firebaseUser);
        } catch (error) {
          logger.error('AuthContext', 'Auth hydration failed', error);
          setUser(null);
          setToken(null);
        } finally {
          // Only set loading to false on the initial auth check
          if (isInitialAuthCheck) {
            setIsLoading(false);
            isInitialAuthCheck = false;
          }
        }
      });
    });

    return () => {
      if (unsub) unsub();
    };
  }, [hydrateFromFirebaseUser]);

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
