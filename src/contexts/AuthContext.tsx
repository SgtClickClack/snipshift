import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChange, signOutUser, auth } from '../lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { useLocation } from 'react-router-dom';

export interface User {
  id: string;
  email: string;
  password?: string;
  roles: Array<'client' | 'hub' | 'professional' | 'brand' | 'trainer' | 'admin'>;
  currentRole: 'client' | 'hub' | 'professional' | 'brand' | 'trainer' | 'admin' | null;
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
                // 401 means token is invalid - just set user to null, don't reload
                // The UI will show "Logged Out" state gracefully
                console.warn('Profile fetch failed (401). User token is invalid.');
                setUser(null);
              } else {
                console.warn('User authenticated in Firebase but profile fetch failed', res.status);
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
    
    // Removed test bypass - E2E tests need to use proper authentication
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
        // 401 means token is invalid - just set user to null, don't reload
        console.warn('Failed to refresh user profile (401). User token is invalid.');
        setUser(null);
      } else {
        console.warn('Failed to refresh user profile', res.status);
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
