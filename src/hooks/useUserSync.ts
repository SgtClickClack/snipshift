import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/firebase';

interface UseUserSyncOptions {
  /**
   * Maximum number of polling attempts before giving up
   * @default 10
   */
  maxAttempts?: number;
  /**
   * Delay between polling attempts in milliseconds
   * @default 500
   */
  pollInterval?: number;
  /**
   * Whether to start polling immediately
   * @default true
   */
  enabled?: boolean;
}

interface UseUserSyncResult {
  /**
   * Whether the user profile is synced and ready
   */
  isSynced: boolean;
  /**
   * Whether the user is new and needs onboarding
   */
  isNewUser: boolean;
  /**
   * Whether polling is currently in progress
   */
  isPolling: boolean;
  /**
   * Error message if sync failed
   */
  error: string | null;
  /**
   * Manually trigger a sync check
   */
  retry: () => void;
}

/**
 * Hook that polls /api/me endpoint until a valid user profile is returned.
 * This ensures the onboarding flow has a 'Single Source of Truth' for user state.
 * 
 * Use this hook when you need to ensure the user profile is fully hydrated
 * from the database before rendering components that depend on user data.
 * 
 * @example
 * ```tsx
 * const { isSynced, isPolling } = useUserSync();
 * 
 * if (!isSynced || isPolling) {
 *   return <LoadingScreen />;
 * }
 * 
 * return <RoleSelector />;
 * ```
 */
export function useUserSync(options: UseUserSyncOptions = {}): UseUserSyncResult {
  const {
    maxAttempts = 10,
    pollInterval = 500,
    enabled = true,
  } = options;

  const { user, token, isAuthReady, clearUserState, initializing, isInitialLoading } = useAuth();
  const [isSynced, setIsSynced] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  const attemptCountRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const syncingRef = useRef(false);
  const lastSyncAtRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const pollUserProfile = async (): Promise<boolean> => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    if (currentPath.startsWith('/onboarding')) {
      return false;
    }
    const firebaseUser = auth.currentUser;
    if (!isAuthReady || initializing || isInitialLoading) {
      return false;
    }

    if (syncingRef.current) {
      return false;
    }

    const now = Date.now();
    if (now - lastSyncAtRef.current < 5000) {
      return false;
    }

    try {
      syncingRef.current = true;
      const isLandingPage = currentPath === '/';
      if (!firebaseUser || !token || currentPath === '/login' || currentPath === '/signup' || currentPath.startsWith('/onboarding') || isLandingPage) {
        return false;
      }
      lastSyncAtRef.current = now;
      const res = await fetch('/api/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (res.ok) {
        const apiUser = await res.json();
        // Check if user has required fields (id is the minimum)
        if (apiUser?.id) {
          logger.debug('useUserSync', 'User profile synced successfully', { userId: apiUser.id });
          if (isMountedRef.current) {
            setIsSynced(true);
            setIsNewUser(false);
            setIsPolling(false);
            setError(null);
          }
          return true;
        }
      } else if (res.status === 401) {
        const isSignupOrOnboarding =
          location.pathname === '/signup' || location.pathname.startsWith('/onboarding');
        logger.warn('useUserSync', 'Received 401 while syncing user profile', {
          path: location.pathname,
          isSignupOrOnboarding,
        });
        if (isMountedRef.current) {
          setIsSynced(false);
          setIsNewUser(isSignupOrOnboarding);
          setIsPolling(false);
          setError("We're just setting up your profile. Won't be a moment.");
        }
        const isLandingOrSignupFlow =
          location.pathname === '/' ||
          location.pathname === '/signup' ||
          location.pathname.startsWith('/onboarding');
        if (!isSignupOrOnboarding && !isLandingOrSignupFlow) {
          clearUserState('useUserSync:401');
          const publicPaths = ['/', '/venue-guide'];
          if (!publicPaths.includes(location.pathname)) {
            navigate('/login', { replace: true });
          }
        }
        return true;
      } else if (res.status === 404) {
        // User doesn't exist yet - this is expected during onboarding
        logger.debug('useUserSync', 'User profile not found (404), will retry');
        return false;
      } else {
        logger.warn('useUserSync', 'Failed to fetch user profile', { status: res.status });
        return false;
      }
    } catch (err) {
      logger.error('useUserSync', 'Error polling user profile:', err);
      return false;
    } finally {
      syncingRef.current = false;
    }
  };

  const startPolling = () => {
    if (!enabled || !isAuthReady || initializing || isInitialLoading) {
      return;
    }

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    if (currentPath.startsWith('/onboarding')) {
      return;
    }
    if (currentPath === '/login' || currentPath === '/signup' || currentPath.startsWith('/onboarding')) {
      setIsPolling(false);
      return;
    }

    if (!token || !auth.currentUser) {
      setIsSynced(false);
      setIsPolling(false);
      return;
    }

    // If we already have a user with an ID, we're synced
    if (user?.id) {
      setIsSynced(true);
      setIsPolling(false);
      return;
    }

    // Check if there's a Firebase session (user might have signed in but profile not yet created)
    const hasFirebaseSession = !!auth.currentUser || !!token;
    
    // If no Firebase session, don't poll
    if (!hasFirebaseSession) {
      setIsSynced(false);
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    attemptCountRef.current = 0;
    setError(null);
    setIsNewUser(false);

    const poll = async () => {
      if (!isMountedRef.current) {
        return;
      }

      attemptCountRef.current += 1;
      const success = await pollUserProfile();

      if (success) {
        // Success - already handled in pollUserProfile
        return;
      }

      if (attemptCountRef.current >= maxAttempts) {
        // Max attempts reached
        logger.warn('useUserSync', 'Max polling attempts reached', { attempts: attemptCountRef.current });
        if (isMountedRef.current) {
          setIsPolling(false);
          setIsSynced(false);
          setError("We couldn't get you in right now. Please try a quick page refresh.");
        }
        return;
      }

      // Schedule next poll
      if (isMountedRef.current) {
        timeoutRef.current = window.setTimeout(poll, pollInterval);
      }
    };

    // Start polling immediately
    poll();
  };

  const retry = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    attemptCountRef.current = 0;
    setIsSynced(false);
    setIsNewUser(false);
    setError(null);
    startPolling();
  };

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    if (currentPath.startsWith('/onboarding')) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsPolling(false);
      return;
    }
    if (currentPath === '/login' || currentPath === '/signup' || currentPath.startsWith('/onboarding')) {
      setIsSynced(false);
      setIsNewUser(false);
      setIsPolling(false);
      return;
    }

    // Check if there's a Firebase session (user might have signed in but profile not yet created)
    const hasFirebaseSession = !!auth.currentUser || !!token;
    const hasActiveToken = !!token && !!auth.currentUser;

    // Reset state when auth state changes
    if (!isAuthReady || !hasFirebaseSession || !hasActiveToken || initializing || isInitialLoading) {
      setIsSynced(false);
      setIsNewUser(false);
      setIsPolling(false);
      return;
    }

    // If we have a user with ID, we're synced
    if (user?.id) {
      setIsSynced(true);
      setIsNewUser(false);
      setIsPolling(false);
      return;
    }

    // Start polling if we have a Firebase session but don't have user profile data yet
    startPolling();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthReady, token, user?.id, enabled, initializing]);

  return {
    isSynced,
    isNewUser,
    isPolling,
    error,
    retry,
  };
}
