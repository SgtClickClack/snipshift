/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOutUser, auth } from '../lib/firebase';
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
  
  const navigate = useNavigate();

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

  const fetchUserProfile = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      const idToken = await firebaseUser.getIdToken(true);
      setToken(idToken);
      
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
    }
  };

  // STANDARD FIREBASE PATTERN: Single useEffect on mount
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    // Step 1: Set persistence to LOCAL (survives page refresh)
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        logger.debug('AuthContext', 'Persistence set to browserLocalPersistence');
      })
      .catch((error) => {
        logger.error('AuthContext', 'Failed to set persistence:', error);
      });

    // Step 2: Listen for auth state changes (synchronous - returns unsubscribe immediately)
    unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        logger.debug('AuthContext', 'Firebase user authenticated:', firebaseUser.uid);
        
        // Fetch profile from /api/me
        const appUser = await fetchUserProfile(firebaseUser);
        setUser(appUser);
        
        // Auto-redirect from login/signup pages
        const currentPath = window.location.pathname;
        if (['/login', '/signup'].includes(currentPath) && appUser) {
          const target = appUser.hasCompletedOnboarding === false || !appUser.isOnboarded
            ? '/onboarding'
            : appUser.currentRole && appUser.currentRole !== 'client'
              ? getDashboardRoute(appUser.currentRole)
              : '/role-selection';
          if (target !== currentPath) {
            navigate(target, { replace: true });
          }
        }
      } else {
        logger.debug('AuthContext', 'No Firebase user');
        setUser(null);
        setToken(null);
      }

      // CRITICAL: Only set isLoading(false) AFTER profile fetch completes or firebaseUser is confirmed null
      setIsLoading(false);
    });
    
    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [navigate]);

  const login = useCallback((newUser: User) => {
    setUser(newUser);
    logger.debug('AuthContext', 'User logged in:', newUser.id);
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOutUser();
      setUser(null);
      setToken(null);
      navigate('/login', { replace: true });
      logger.debug('AuthContext', 'User logged out');
    } catch (error) {
      logger.error('AuthContext', 'Logout error:', error);
      throw error;
    }
  }, [navigate]);

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
  if (isLoading) {
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
