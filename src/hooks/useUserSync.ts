import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

interface UseUserSyncOptions {
  maxAttempts?: number;
  pollInterval?: number;
  enabled?: boolean;
}

interface UseUserSyncResult {
  isSynced: boolean;
  isNewUser: boolean;
  isPolling: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Minimal polling helper: if we have a Firebase session (token) but the app user
 * isn't available yet (e.g. DB user creation propagation), poll `/api/me` until
 * it returns a user record or we give up.
 */
export function useUserSync(options: UseUserSyncOptions = {}): UseUserSyncResult {
  const { maxAttempts = 10, pollInterval = 500, enabled = true } = options;
  const { user, token, isLoading, refreshUser } = useAuth();

  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  const attemptRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);

  const isSynced = !!user?.id;

  const stop = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPolling(false);
  };

  const retry = () => {
    stop();
    attemptRef.current = 0;
    setError(null);
    // Next effect tick will restart polling if needed.
  };

  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!enabled) {
      stop();
      setError(null);
      setIsNewUser(false);
      return;
    }

    // Wait until AuthContext has processed the first auth state.
    if (isLoading) {
      stop();
      return;
    }

    // No Firebase session: nothing to sync.
    if (!token) {
      stop();
      setError(null);
      setIsNewUser(false);
      return;
    }

    // We have a user record: synced.
    if (user?.id) {
      stop();
      setError(null);
      setIsNewUser(false);
      return;
    }

    // Token exists but no DB user yet: treat as "new user" (onboarding can proceed),
    // and optionally poll a few times to see if the DB record appears.
    setIsNewUser(true);

    setIsPolling(true);
    setError(null);

    const pollOnce = async () => {
      attemptRef.current += 1;

      try {
        await refreshUser();
        // If refreshUser succeeded and user appears, the `user?.id` branch above will stop polling.
      } catch (e) {
        logger.debug('useUserSync', 'refreshUser failed (non-fatal)', e);
      }

      if (attemptRef.current >= maxAttempts) {
        stop();
        setError("We couldn't verify your profile yet. Please try a quick refresh.");
        return;
      }

      timeoutRef.current = window.setTimeout(pollOnce, pollInterval);
    };

    pollOnce();

    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isLoading, token, user?.id, refreshUser, maxAttempts, pollInterval]);

  return {
    isSynced,
    isNewUser,
    isPolling,
    error,
    retry,
  };
}
