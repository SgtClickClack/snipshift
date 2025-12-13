import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChange, signOutUser, auth } from '../lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { useLocation } from 'react-router-dom';
import { logger } from '@/lib/logger';

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
  photoURL?: string;       // Firebase property
  bio?: string;
  phone?: string;
  location?: string;
  uid?: string;
  name?: string;
  isOnboarded?: boolean;
  averageRating?: number | null;
  reviewCount?: number;
  businessSettings?: {
    openingHours: Record<string, { open: string; close: string; enabled: boolean }>;
    shiftSplitType: 'halves' | 'thirds' | 'custom' | 'full-day';
    customShiftLength?: number;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  setCurrentRole: (role: NonNullable<User['currentRole']>) => void;
  hasRole: (role: NonNullable<User['currentRole']>) => boolean;
  updateRoles: (roles: User['roles']) => void;
  getToken: () => Promise<string | null>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // E2E mode: bypass Firebase dependency and hydrate user from sessionStorage.
    // Playwright sets VITE_E2E=1 and provides `snipshift_test_user` session storage.
    if (import.meta.env.VITE_E2E === '1' && typeof window !== 'undefined') {
      try {
        const raw = window.sessionStorage.getItem('snipshift_test_user');
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
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('[AuthContext] Failed to parse E2E session user:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
        setIsAuthReady(true);
      }
      return;
    }

    // Wrap listener setup in try-catch to ensure loading states are always set
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = onAuthStateChange(async (firebaseUser: FirebaseUser | null) => {
        try {
          if (firebaseUser) {
            try {
              const token = await firebaseUser.getIdToken();
              const res = await fetch('/api/me', {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (res.ok) {
                const profile = await res.json();
                setUser({ 
                  ...profile, 
                  uid: firebaseUser.uid,
                  // Ensure roles is array
                  roles: Array.isArray(profile.roles) ? profile.roles : [profile.role || 'professional'],
                  // Ensure date strings are Dates
                  createdAt: profile.createdAt ? new Date(profile.createdAt) : new Date(),
                  updatedAt: profile.updatedAt ? new Date(profile.updatedAt) : new Date(),
                  // Ensure isOnboarded is boolean
                  isOnboarded: profile.isOnboarded ?? false
                });
              } else if (res.status === 401) {
                // 401 means token is invalid or expired - try to refresh token once
                try {
                  const refreshedToken = await firebaseUser.getIdToken(true);
                  const retryRes = await fetch('/api/me', {
                    headers: {
                      'Authorization': `Bearer ${refreshedToken}`
                    }
                  });
                  
                  if (retryRes.ok) {
                    const profile = await retryRes.json();
                    setUser({ 
                      ...profile, 
                      uid: firebaseUser.uid,
                      roles: Array.isArray(profile.roles) ? profile.roles : [profile.role || 'professional'],
                      createdAt: profile.createdAt ? new Date(profile.createdAt) : new Date(),
                      updatedAt: profile.updatedAt ? new Date(profile.updatedAt) : new Date(),
                      isOnboarded: profile.isOnboarded ?? false
                    });
                  } else {
                    // Token refresh didn't help - user doesn't exist in DB or token is still invalid
                    // Silently set user to null - don't log warning as this is expected for logged-out users
                    setUser(null);
                  }
                } catch (refreshError) {
                  // Token refresh failed - user is logged out
                  setUser(null);
                }
              } else {
                logger.error('AuthContext', 'User authenticated in Firebase but profile fetch failed', res.status);
                // Optional: Set a minimal user or redirect to signup completion?
                // For now, we logout if we can't identify the user in our system
                setUser(null);
              }
            } catch (error) {
              console.error('Error fetching user profile:', error);
              setUser(null);
            }
          } else {
            setUser(null);
          }
        } catch (error) {
          // Catch any unexpected errors in the callback itself
          console.error('Unexpected error in auth state change callback:', error);
          setUser(null);
        } finally {
          // CRITICAL: Always set loading states, even if there's an error
          // This prevents the "Flash of Doom" where the app renders before auth check completes
          setIsLoading(false);
          setIsAuthReady(true);
        }
      });
    } catch (error) {
      // If listener setup fails, still set loading states to prevent infinite loading
      console.error('Error setting up auth state listener:', error);
      setIsLoading(false);
      setIsAuthReady(true);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [location.search]);

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
      }
      
      // Sign out from Firebase
      await signOutUser();
      
      // Clear user state immediately
      setUser(null);
      
      // Navigate to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } catch (e) {
      console.error('Logout error', e);
      // Even if there's an error, clear state and navigate
      setUser(null);
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
      return auth.currentUser.getIdToken();
    }

    // E2E mode: use API middleware bypass token.
    if (import.meta.env.VITE_E2E === '1') {
      return 'mock-test-token';
    }

    return null;
  };

  const refreshUser = async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      setUser(null);
      return;
    }

    try {
      // Force refresh token to ensure we have latest claims/session
      const token = await firebaseUser.getIdToken(true);
      const res = await fetch('/api/me', {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (res.ok) {
        const profile = await res.json();
        setUser({ 
          ...profile, 
          uid: firebaseUser.uid,
          roles: Array.isArray(profile.roles) ? profile.roles : [profile.role || 'professional'],
          createdAt: profile.createdAt ? new Date(profile.createdAt) : new Date(),
          updatedAt: profile.updatedAt ? new Date(profile.updatedAt) : new Date(),
          isOnboarded: profile.isOnboarded ?? false
        });
      } else if (res.status === 401) {
        // 401 means token is invalid or expired - try to refresh token once
        try {
          const refreshedToken = await firebaseUser.getIdToken(true);
          const retryRes = await fetch('/api/me', {
            cache: 'no-store',
            headers: {
              'Authorization': `Bearer ${refreshedToken}`,
              'Pragma': 'no-cache',
              'Cache-Control': 'no-cache'
            }
          });
          
          if (retryRes.ok) {
            const profile = await retryRes.json();
            setUser({ 
              ...profile, 
              uid: firebaseUser.uid,
              roles: Array.isArray(profile.roles) ? profile.roles : [profile.role || 'professional'],
              createdAt: profile.createdAt ? new Date(profile.createdAt) : new Date(),
              updatedAt: profile.updatedAt ? new Date(profile.updatedAt) : new Date(),
              isOnboarded: profile.isOnboarded ?? false
            });
          } else {
            // Token refresh didn't help - silently set user to null
            setUser(null);
          }
        } catch (refreshError) {
          // Token refresh failed - user is logged out
          setUser(null);
        }
      } else {
        logger.error('AuthContext', 'Failed to refresh user profile', res.status);
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAuthReady,
    login,
    logout,
    setCurrentRole,
    hasRole,
    updateRoles,
    getToken,
    refreshUser,
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
