/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import {
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { logger } from '@/lib/logger';
import { isBusinessRole, normalizeVenueToBusiness } from '@/lib/roles';
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
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

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

  const fetchUserProfile = useCallback(async (currentFirebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      const idToken = await currentFirebaseUser.getIdToken(true);
      setToken(idToken);

      const res = await fetch('/api/me', {
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const apiUser = await res.json();
        return normalizeUserFromApi(apiUser, currentFirebaseUser.uid);
      }

      if (res.status === 404) {
        logger.debug('AuthContext', 'Firebase user has no database profile (404)');
        return null;
      }

      if (res.status === 401) {
        logger.warn('AuthContext', 'Got 401, attempting token refresh');
        const refreshedToken = await currentFirebaseUser.getIdToken(true);
        setToken(refreshedToken);

        const retryRes = await fetch('/api/me', {
          headers: {
            Authorization: `Bearer ${refreshedToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (retryRes.ok) {
          const apiUser = await retryRes.json();
          return normalizeUserFromApi(apiUser, currentFirebaseUser.uid);
        }
      }

      logger.error('AuthContext', 'Profile fetch failed', { status: res.status });
      return null;
    } catch (error) {
      logger.error('AuthContext', 'Error fetching user profile:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (error) {
        logger.error('AuthContext', 'Failed to set persistence', error);
      }

      try {
        await getRedirectResult(auth);
      } catch (error) {
        logger.error('AuthContext', 'Failed to read redirect result', error);
      }

      unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
        setFirebaseUser(nextUser);

        if (nextUser) {
          const appUser = await fetchUserProfile(nextUser);
          setUser(appUser);
        } else {
          setUser(null);
          setToken(null);
        }

        setIsLoading(false);
      });
    };

    initializeAuth();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [fetchUserProfile]);

  const login = useCallback((newUser: User) => {
    setUser(newUser);
    logger.debug('AuthContext', 'User logged in:', newUser.id);
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setUser(null);
      setToken(null);
      setFirebaseUser(null);
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
    setFirebaseUser(null);
  }, []);

  const setCurrentRole = useCallback((role: NonNullable<User['currentRole']>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updatedRoles = prev.roles.includes(role) ? prev.roles : [...prev.roles, role];
      return { ...prev, currentRole: role, roles: updatedRoles };
    });
  }, []);

  const hasRole = useCallback(
    (role: NonNullable<User['currentRole']>): boolean => {
      if (!user) return false;
      if (user.currentRole === role) return true;
      if (user.roles.includes(role)) return true;
      if (role === 'business' && isBusinessRole(user.currentRole || '')) return true;
      if ((role === 'hub' || role === 'venue') && isBusinessRole(user.currentRole || '')) return true;
      return false;
    },
    [user]
  );

  const updateRoles = useCallback((roles: User['roles']) => {
    setUser((prev) => {
      if (!prev) return prev;
      return { ...prev, roles };
    });
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!firebaseUser) return token;
    try {
      const newToken = await firebaseUser.getIdToken();
      setToken(newToken);
      return newToken;
    } catch (error) {
      logger.error('AuthContext', 'Error getting token:', error);
      return null;
    }
  }, [firebaseUser, token]);

  const refreshUser = useCallback(async () => {
    if (!firebaseUser) return;
    const refreshedUser = await fetchUserProfile(firebaseUser);
    if (refreshedUser) {
      setUser(refreshedUser);
    }
  }, [fetchUserProfile, firebaseUser]);

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
