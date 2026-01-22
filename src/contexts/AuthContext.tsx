/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChange, signOutUser, auth, handleGoogleRedirectResult } from '../lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { setPersistence, browserLocalPersistence } from 'firebase/auth';
import { logger } from '@/lib/logger';
import { getDashboardRoute, normalizeVenueToBusiness, isBusinessRole } from '@/lib/roles';
import { LoadingScreen } from '@/components/ui/loading-screen';

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
  profileImageURL?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bannerImage?: string;
  photoURL?: string;
  bio?: string;
  phone?: string;
  location?: string;
  uid?: string;
  name?: string;
  isOnboarded?: boolean;
  hasCompletedOnboarding?: boolean;
  averageRating?: number | null;
  reviewCount?: number;
  companyName?: string;
  description?: string;
  website?: string;
  skills?: string[];
  experience?: string;
  isRoamingNomad?: boolean;
  rsaVerified?: boolean | null;
  rsaNotRequired?: boolean | null;
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
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  isRoleLoading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  clearUserState: (reason?: string) => void;
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
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Refs for preventing race conditions
  const hasInitialized = useRef(false);
  const currentAuthUid = useRef<string | null>(null);
  const navigateRef = useRef(navigate);
  const locationRef = useRef(location);
  
  // Keep refs updated
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);
  useEffect(() => { locationRef.current = location; }, [location]);

  /**
   * Normalize backend role values into the app's canonical roles.
   */
  const normalizeRoleValue = (raw: unknown): User['currentRole'] | null => {
    if (typeof raw !== 'string') return null;
    const r = raw.toLowerCase();

    const normalized = normalizeVenueToBusiness(r);
    if (normalized) return normalized;

    if (r === 'worker' || r === 'pro') return 'professional';
    if (r === 'shop' || r === 'employer') return 'business';

    if (['client', 'hub', 'business', 'professional', 'brand', 'trainer', 'admin'].includes(r)) {
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

    const currentRole: User['currentRole'] = currentRoleFromApi ?? (roles[0] ?? null);

    return {
      ...(apiUser as User),
      uid: firebaseUid,
      roles,
      currentRole,
      createdAt: apiUser?.createdAt ? new Date(apiUser.createdAt) : new Date(),
      updatedAt: apiUser?.updatedAt ? new Date(apiUser.updatedAt) : new Date(),
      isOnboarded: apiUser?.isOnboarded ?? false,
      hasCompletedOnboarding: apiUser?.hasCompletedOnboarding ?? false,
      notificationPreferences: apiUser?.notificationPreferences || undefined,
      favoriteProfessionals: apiUser?.favoriteProfessionals || [],
    };
  };

  const deriveRoleHome = (u: User | null): string => {
    if (!u) return '/login';
    if (u.hasCompletedOnboarding === false || !u.isOnboarded) return '/onboarding';
    if (!u.currentRole || u.currentRole === 'client') {
      const hasAnyRole = u.roles && u.roles.length > 0 && u.roles.some(r => r !== 'client');
      if (!hasAnyRole) return '/onboarding';
      return '/role-selection';
    }
    
    // Role-specific dashboards
    if (u.currentRole === 'professional') return '/worker/dashboard';
    if (isBusinessRole(u.currentRole)) return '/venue/dashboard';
    
    return getDashboardRoute(u.currentRole);
  };

  const fetchUserProfile = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      const idToken = await firebaseUser.getIdToken(true);
      setToken(idToken);
      
      setIsRoleLoading(true);
      const res = await fetch('/api/me', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        const apiUser = await res.json();
        return normalizeUserFromApi(apiUser, firebaseUser.uid);
      }
      
      if (res.status === 404) {
        // User exists in Firebase but not in database - needs to complete signup
        logger.debug('AuthContext', 'Firebase user has no database profile (404)');
        return null;
      }
      
      if (res.status === 401) {
        // Token invalid - try refresh
        logger.warn('AuthContext', 'Got 401, attempting token refresh');
        const refreshedToken = await firebaseUser.getIdToken(true);
        setToken(refreshedToken);
        
        const retryRes = await fetch('/api/me', {
          headers: {
            'Authorization': `Bearer ${refreshedToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (retryRes.ok) {
          const apiUser = await retryRes.json();
          return normalizeUserFromApi(apiUser, firebaseUser.uid);
        }
      }
      
      logger.error('AuthContext', 'Profile fetch failed', { status: res.status });
      return null;
    } catch (error) {
      logger.error('AuthContext', 'Error fetching user profile:', error);
      return null;
    } finally {
      setIsRoleLoading(false);
    }
  };

  // STANDARD FIREBASE PATTERN: Initialize auth
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initAuth = async () => {
      // E2E mode: hydrate from storage
      const isE2E = import.meta.env.VITE_E2E === '1' ||
        (typeof window !== 'undefined' && localStorage.getItem('E2E_MODE') === 'true');
      
      if (isE2E && typeof window !== 'undefined') {
        const raw = sessionStorage.getItem('hospogo_test_user') ?? localStorage.getItem('hospogo_test_user');
        if (raw) {
          try {
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
          } catch (e) {
            logger.error('AuthContext', 'Failed to parse E2E user:', e);
          }
        }
        setIsLoading(false);
        setIsAuthReady(true);
        return;
      }

      try {
        // Step 1: Set persistence to LOCAL (survives page refresh)
        await setPersistence(auth, browserLocalPersistence);
        logger.debug('AuthContext', 'Persistence set to browserLocalPersistence');
      } catch (error) {
        logger.error('AuthContext', 'Failed to set persistence:', error);
      }

      try {
        // Step 2: Check for redirect result (user returning from Google sign-in)
        const redirectUser = await handleGoogleRedirectResult();
        
        if (redirectUser) {
          logger.debug('AuthContext', 'Got user from redirect result:', redirectUser.uid);
          
          // Register/verify user in database
          try {
            const idToken = await redirectUser.getIdToken();
            await fetch('/api/register', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
              },
              body: JSON.stringify({
                email: redirectUser.email,
                name: redirectUser.displayName || redirectUser.email?.split('@')[0] || 'User',
                password: '',
              }),
            });
            // Small delay to allow database replication
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (regError) {
            logger.error('AuthContext', 'Error registering redirect user:', regError);
          }
        }
      } catch (error) {
        logger.error('AuthContext', 'Error processing redirect result:', error);
      }

      // Step 3: Listen for auth state changes
      const unsubscribe = onAuthStateChange(async (firebaseUser: FirebaseUser | null) => {
        const newUid = firebaseUser?.uid || null;
        
        // Skip if same user
        if (currentAuthUid.current === newUid && newUid !== null) {
          return;
        }
        currentAuthUid.current = newUid;

        if (firebaseUser) {
          logger.debug('AuthContext', 'Firebase user authenticated:', firebaseUser.uid);
          
          const appUser = await fetchUserProfile(firebaseUser);
          setUser(appUser);
          
          // Auto-redirect from login/signup pages
          const currentPath = locationRef.current.pathname;
          if (['/login', '/signup'].includes(currentPath) && appUser) {
            const target = deriveRoleHome(appUser);
            if (target !== currentPath) {
              navigateRef.current(target, { replace: true });
            }
          }
        } else {
          logger.debug('AuthContext', 'No Firebase user');
          setUser(null);
          setToken(null);
        }

        setIsLoading(false);
        setIsAuthReady(true);
      });

      return unsubscribe;
    };

    // Safety timeout - ensure loading clears after 8 seconds max
    const safetyTimeout = setTimeout(() => {
      if (!isAuthReady) {
        logger.warn('AuthContext', 'Safety timeout triggered - clearing loading state');
        setIsLoading(false);
        setIsAuthReady(true);
      }
    }, 8000);

    initAuth().then(unsubscribe => {
      return () => {
        clearTimeout(safetyTimeout);
        if (unsubscribe) unsubscribe();
      };
    });
  }, []);

  const login = useCallback((newUser: User) => {
    setUser(newUser);
    logger.debug('AuthContext', 'User logged in:', newUser.id);
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOutUser();
      setUser(null);
      setToken(null);
      navigateRef.current('/login', { replace: true });
      logger.debug('AuthContext', 'User logged out');
    } catch (error) {
      logger.error('AuthContext', 'Logout error:', error);
      throw error;
    }
  }, []);

  const clearUserState = useCallback((reason?: string) => {
    logger.debug('AuthContext', 'Clearing user state:', reason);
    setUser(null);
    setToken(null);
  }, []);

  const setCurrentRole = useCallback((role: NonNullable<User['currentRole']>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updatedRoles = prev.roles.includes(role) ? prev.roles : [...prev.roles, role];
      return { ...prev, currentRole: role, roles: updatedRoles };
    });
  }, []);

  const hasRole = useCallback((role: NonNullable<User['currentRole']>): boolean => {
    if (!user) return false;
    if (user.currentRole === role) return true;
    if (user.roles.includes(role)) return true;
    // Handle business role equivalence
    if (role === 'business' && (user.currentRole === 'hub' || user.currentRole === 'venue' as any)) return true;
    if ((role === 'hub' || role === 'venue' as any) && user.currentRole === 'business') return true;
    return false;
  }, [user]);

  const updateRoles = useCallback((roles: User['roles']) => {
    setUser(prev => {
      if (!prev) return prev;
      return { ...prev, roles };
    });
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (auth.currentUser) {
      try {
        const newToken = await auth.currentUser.getIdToken();
        setToken(newToken);
        return newToken;
      } catch (error) {
        logger.error('AuthContext', 'Error getting token:', error);
        return null;
      }
    }
    return token;
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!auth.currentUser) return;
    
    const refreshedUser = await fetchUserProfile(auth.currentUser);
    if (refreshedUser) {
      setUser(refreshedUser);
    }
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    isAuthReady,
    isRoleLoading,
    login,
    logout,
    clearUserState,
    setCurrentRole,
    hasRole,
    updateRoles,
    getToken,
    refreshUser,
  };

  // Show loading screen while initializing
  if (isLoading && !isAuthReady) {
    return <LoadingScreen />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
