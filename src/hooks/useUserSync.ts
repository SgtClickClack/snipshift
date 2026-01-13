import { useEffect, useState, useRef } from 'react';
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

  const { user, token, isAuthenticated, isAuthReady } = useAuth();
  const [isSynced, setIsSynced] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const attemptCountRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

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
    if (!token || !isAuthReady) {
      return false;
    }

    try {
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
            setIsPolling(false);
            setError(null);
          }
          return true;
        }
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
    }
  };

  const startPolling = () => {
    if (!enabled || !isAuthReady) {
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
          setError('User profile sync timeout. Please refresh the page.');
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
    setError(null);
    startPolling();
  };

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Check if there's a Firebase session (user might have signed in but profile not yet created)
    const hasFirebaseSession = !!auth.currentUser || !!token;

    // Reset state when auth state changes
    if (!isAuthReady || !hasFirebaseSession) {
      setIsSynced(false);
      setIsPolling(false);
      return;
    }

    // If we have a user with ID, we're synced
    if (user?.id) {
      setIsSynced(true);
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
  }, [isAuthReady, token, user?.id, enabled]);

  return {
    isSynced,
    isPolling,
    error,
    retry,
  };
}
