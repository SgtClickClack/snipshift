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
  photoURL?: string;       // Firebase property
  bio?: string;
  phone?: string;
  location?: string;
  uid?: string;
  name?: string;
  isOnboarded?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
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
  const location = useLocation();

    // Test Environment Auth Bypass
    useEffect(() => {
        // Check URL for test_user bypass
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(location.search);
            let shouldBypass = false;
            let rolesList: Array<'client' | 'hub' | 'professional' | 'brand' | 'trainer' | 'admin'> = ['professional'];

            if (params.get('test_user') === 'true') {
                shouldBypass = true;
                // console.log('⚠️ Auth Bypass Active: Logging in as Test User (from URL)');
                
                const rolesParam = params.get('roles');
                if (rolesParam) {
                    rolesList = rolesParam.split(',') as any;
                }
                
                const onboardedParam = params.get('onboarded');
                const isOnboarded = onboardedParam === 'false' ? false : true;

                // Persist to session storage to survive redirects/reloads
                sessionStorage.setItem('snipshift_test_user', JSON.stringify({ roles: rolesList, isOnboarded }));
            } else {
                const stored = sessionStorage.getItem('snipshift_test_user');
                if (stored) {
                    shouldBypass = true;
                    // console.log('⚠️ Auth Bypass Active: Logging in as Test User (from Session)');
                    try {
                        const data = JSON.parse(stored);
                        if (data.roles) {
                            rolesList = data.roles;
                        }
                    } catch (e) {
                        console.error('Failed to parse test user session', e);
                    }
                }
            }

            if (shouldBypass) {
                const primaryRole = rolesList[0] || 'professional';
                // console.log('Setting test user with roles:', rolesList, 'currentRole:', primaryRole);
                
                // Get isOnboarded and ID from session if available
                let isOnboarded = true;
                let userId = 'test-user-id';
                
                const stored = sessionStorage.getItem('snipshift_test_user');
                if (stored) {
                    try {
                        const data = JSON.parse(stored);
                        if (data.isOnboarded !== undefined) {
                            isOnboarded = data.isOnboarded;
                        }
                        if (data.id) {
                            userId = data.id;
                        }
                    } catch (e) {
                        console.warn('Failed to parse test user session', e);
                    }
                }

                setUser({
                    id: userId,
                    email: 'test@snipshift.com',
                    name: 'Test User',
                    roles: rolesList as any,
                    currentRole: primaryRole as any,
                    isOnboarded: isOnboarded,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    uid: 'test-firebase-uid'
                });
                setIsLoading(false);
                return; // Skip Firebase listener
            }
        }
    
    // console.log('Initializing Firebase listener');
    const unsubscribe = onAuthStateChange(async (firebaseUser: FirebaseUser | null) => {
      // console.log('Firebase Auth State Change:', firebaseUser?.uid);
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
            console.warn('Profile fetch failed (401). Attempting to sync user via /api/login...');
            try {
              const loginRes = await fetch('/api/login', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
              });

              if (loginRes.ok) {
                const profile = await loginRes.json();
                console.log('User synced successfully via /api/login');
                setUser({ 
                  ...profile, 
                  uid: firebaseUser.uid,
                  roles: Array.isArray(profile.roles) ? profile.roles : [profile.role || 'professional'],
                  createdAt: profile.createdAt ? new Date(profile.createdAt) : new Date(),
                  updatedAt: profile.updatedAt ? new Date(profile.updatedAt) : new Date(),
                  isOnboarded: profile.isOnboarded ?? false
                });
              } else {
                console.error('Sync failed via /api/login', loginRes.status);
                setUser(null);
              }
            } catch (loginErr) {
              console.error('Error calling /api/login', loginErr);
              setUser(null);
            }
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
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [location.search]);

  const login = (userData: User) => {
    // With Firebase, login is handled by the auth state change listener.
    // This method might be used for optimistic updates or legacy calls.
    setUser(userData);
  };

  const logout = async () => {
    try {
      sessionStorage.removeItem('snipshift_test_user');
      await signOutUser();
    } catch (e) {
      console.error('Logout error', e);
    }
    // State update handled by onAuthStateChange
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
    
    // Return mock token for E2E tests
    if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('snipshift_test_user');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                if (data.email && data.email.startsWith('e2e_test_')) {
                    return `mock-token-${data.email}`;
                }
            } catch (e) {
                console.warn('Failed to parse test user for token', e);
            }
        }
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
