import { QueryClient, QueryFunction, QueryCache, MutationCache } from "@tanstack/react-query";
import { auth } from "./firebase";
import { toast } from "@/hooks/useToast";
import { logger } from "@/lib/logger";
import { QUERY_KEYS } from "@/lib/query-keys";

/**
 * ============================================================================
 * AUTH HANDSHAKE STALL - Request Interception Layer
 * ============================================================================
 * 
 * Purpose: STALL requests (return a pending promise) instead of returning 401
 * if the Auth Handshake is currently in progress.
 * 
 * This prevents components from receiving 401 errors during the brief window
 * when Firebase is establishing the session but hasn't yet provided a valid token.
 */

interface HandshakeState {
  /** True when auth handshake is in progress */
  isInProgress: boolean;
  /** Promise that resolves when handshake completes */
  completionPromise: Promise<void> | null;
  /** Function to resolve the completion promise */
  resolveCompletion: (() => void) | null;
  /** Timeout for maximum stall duration (prevent infinite waits) */
  stallTimeout: NodeJS.Timeout | null;
}

const AUTH_HANDSHAKE_STATE: HandshakeState = {
  isInProgress: true, // Start as true - assume handshake in progress on load
  completionPromise: null,
  resolveCompletion: null,
  stallTimeout: null,
};

/** Maximum time to stall a request waiting for auth handshake (ms) */
const MAX_HANDSHAKE_STALL_MS = 5000;

/**
 * Signal that auth handshake has started.
 * Subsequent API requests will be stalled until completeAuthHandshake is called.
 */
export function startAuthHandshake(): void {
  if (AUTH_HANDSHAKE_STATE.isInProgress) return; // Already in progress
  
  AUTH_HANDSHAKE_STATE.isInProgress = true;
  AUTH_HANDSHAKE_STATE.completionPromise = new Promise((resolve) => {
    AUTH_HANDSHAKE_STATE.resolveCompletion = resolve;
  });
  
  logger.info('queryClient', 'Auth handshake started - API requests will be stalled');
  
  // Safety timeout to prevent infinite stalls
  AUTH_HANDSHAKE_STATE.stallTimeout = setTimeout(() => {
    logger.warn('queryClient', `Auth handshake stall timeout (${MAX_HANDSHAKE_STALL_MS}ms) - releasing requests`);
    completeAuthHandshake();
  }, MAX_HANDSHAKE_STALL_MS);
}

/**
 * Signal that auth handshake has completed.
 * Any stalled requests will now proceed.
 */
export function completeAuthHandshake(): void {
  if (!AUTH_HANDSHAKE_STATE.isInProgress) return; // Already completed
  
  AUTH_HANDSHAKE_STATE.isInProgress = false;
  
  // Clear safety timeout
  if (AUTH_HANDSHAKE_STATE.stallTimeout) {
    clearTimeout(AUTH_HANDSHAKE_STATE.stallTimeout);
    AUTH_HANDSHAKE_STATE.stallTimeout = null;
  }
  
  // Resolve any waiting requests
  if (AUTH_HANDSHAKE_STATE.resolveCompletion) {
    AUTH_HANDSHAKE_STATE.resolveCompletion();
    AUTH_HANDSHAKE_STATE.resolveCompletion = null;
  }
  AUTH_HANDSHAKE_STATE.completionPromise = null;
  
  logger.info('queryClient', 'Auth handshake completed - API requests released');
}

/**
 * Check if auth handshake is in progress
 */
export function isAuthHandshakeInProgress(): boolean {
  return AUTH_HANDSHAKE_STATE.isInProgress;
}

/**
 * Wait for auth handshake to complete (if in progress).
 * Returns immediately if handshake is already complete.
 */
async function waitForAuthHandshake(): Promise<void> {
  if (!AUTH_HANDSHAKE_STATE.isInProgress) return;
  if (AUTH_HANDSHAKE_STATE.completionPromise) {
    logger.debug('queryClient', 'Request stalled - waiting for auth handshake');
    await AUTH_HANDSHAKE_STATE.completionPromise;
    logger.debug('queryClient', 'Request released - auth handshake complete');
  }
}

/**
 * AUTH REHYDRATION FIX: 401 Backoff Circuit Breaker
 * 
 * Prevents recursive "nuts" behavior when 401s are received during the initial
 * Firebase/Handshake phase. If multiple 401s occur within a short window,
 * subsequent requests are delayed to allow auth to stabilize.
 */
const AUTH_BACKOFF_STATE = {
  consecutive401Count: 0,
  lastErrorTime: 0,
  isInBackoff: false,
  backoffUntil: 0,
};

const AUTH_BACKOFF_CONFIG = {
  /** Time window to track consecutive 401s (ms) */
  WINDOW_MS: 5000,
  /** Max 401s before triggering backoff */
  MAX_CONSECUTIVE_401S: 3,
  /** Initial backoff duration (ms) */
  INITIAL_BACKOFF_MS: 1000,
  /** Max backoff duration (ms) */
  MAX_BACKOFF_MS: 5000,
};

/**
 * Track a 401 error and determine if we should back off
 * @returns true if request should be retried, false if in backoff mode
 */
function track401AndShouldRetry(): boolean {
  const now = Date.now();
  
  // Reset counter if window has expired
  if (now - AUTH_BACKOFF_STATE.lastErrorTime > AUTH_BACKOFF_CONFIG.WINDOW_MS) {
    AUTH_BACKOFF_STATE.consecutive401Count = 0;
    AUTH_BACKOFF_STATE.isInBackoff = false;
  }
  
  // Check if we're currently in backoff
  if (AUTH_BACKOFF_STATE.isInBackoff && now < AUTH_BACKOFF_STATE.backoffUntil) {
    logger.warn('queryClient', `401 Backoff: Suppressing request (${AUTH_BACKOFF_STATE.backoffUntil - now}ms remaining)`);
    return false;
  }
  
  // Track this 401
  AUTH_BACKOFF_STATE.consecutive401Count++;
  AUTH_BACKOFF_STATE.lastErrorTime = now;
  
  // Trigger backoff if threshold exceeded
  if (AUTH_BACKOFF_STATE.consecutive401Count >= AUTH_BACKOFF_CONFIG.MAX_CONSECUTIVE_401S) {
    const backoffMs = Math.min(
      AUTH_BACKOFF_CONFIG.INITIAL_BACKOFF_MS * Math.pow(2, AUTH_BACKOFF_STATE.consecutive401Count - AUTH_BACKOFF_CONFIG.MAX_CONSECUTIVE_401S),
      AUTH_BACKOFF_CONFIG.MAX_BACKOFF_MS
    );
    AUTH_BACKOFF_STATE.isInBackoff = true;
    AUTH_BACKOFF_STATE.backoffUntil = now + backoffMs;
    logger.warn('queryClient', `401 Backoff: Circuit breaker triggered, backing off for ${backoffMs}ms`);
    return false;
  }
  
  return true;
}

/**
 * Reset the 401 backoff state (call after successful auth)
 */
export function reset401Backoff(): void {
  AUTH_BACKOFF_STATE.consecutive401Count = 0;
  AUTH_BACKOFF_STATE.lastErrorTime = 0;
  AUTH_BACKOFF_STATE.isInBackoff = false;
  AUTH_BACKOFF_STATE.backoffUntil = 0;
}

/**
 * Check if we're currently in 401 backoff mode
 */
export function isIn401Backoff(): boolean {
  if (!AUTH_BACKOFF_STATE.isInBackoff) return false;
  return Date.now() < AUTH_BACKOFF_STATE.backoffUntil;
}

async function throwIfResNotOk(res: Response, url?: string) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Handle 401 errors gracefully for specific endpoints
    if (res.status === 401 && url && typeof window !== 'undefined') {
      // AUTH REHYDRATION FIX: Track 401s and trigger backoff if too many occur
      const shouldRetry = track401AndShouldRetry();
      
      // Extract pathname from URL (handles both relative and absolute URLs)
      let urlPath: string;
      try {
        // Try to parse as absolute URL first
        urlPath = new URL(url, window.location.origin).pathname;
      } catch {
        // If that fails, assume it's already a pathname
        urlPath = url.startsWith('/') ? url : `/${url}`;
      }
      
      // Mark this as a handshake 401 if it's during the initial auth phase
      const isHandshake401 = urlPath === '/api/auth/me' || 
                             urlPath === '/api/me' || 
                             urlPath === '/api/bootstrap' ||
                             urlPath === '/api/notifications' || 
                             urlPath.startsWith('/api/notifications') ||
                             urlPath === '/api/conversations/unread-count';
      
      // For handshake endpoints, don't throw - just clear token and let UI handle it
      if (isHandshake401) {
        // Clear any stored tokens
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
        }
        // Return a special error that won't trigger reloads
        const error = new Error(`${res.status}: ${text}`);
        (error as any).isAuthError = true;
        (error as any).shouldNotReload = true;
        (error as any).isHandshake401 = true; // Mark for Sentry filtering
        throw error;
      }
      
      // For other 401s, clear token but still throw (components can handle redirect if needed)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
      
      // If we're in backoff mode, throw a special suppressed error
      if (!shouldRetry) {
        const error = new Error(`401: Auth backoff in progress - request suppressed`);
        (error as any).isAuthError = true;
        (error as any).shouldNotReload = true;
        (error as any).isSuppressed = true;
        throw error;
      }
    }
    
    throw new Error(`${res.status}: ${text}`);
  }
}

/** API base URL when API is on a different host (e.g. VITE_API_URL=https://api.hospogo.com). */
function getApiBase(): string {
  const base = import.meta.env.VITE_API_URL;
  if (typeof base === 'string' && base.trim()) {
    return base.trim().replace(/\/$/, '');
  }
  return '';
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // ============================================================================
  // AXIOS INTERCEPTOR STALL: Wait for auth handshake before making request
  // This prevents 401 errors during the brief Firebase session establishment window
  // ============================================================================
  
  // Skip stall for auth-related endpoints that are PART of the handshake
  const isAuthEndpoint = url.includes('/api/me') || 
                         url.includes('/api/bootstrap') || 
                         url.includes('/api/auth/');
  
  if (!isAuthEndpoint && isAuthHandshakeInProgress()) {
    logger.debug('apiRequest', `Stalling request to ${url} - auth handshake in progress`);
    await waitForAuthHandshake();
  }
  
  const isSafe = method.toUpperCase() === 'GET' || method.toUpperCase() === 'HEAD' || method.toUpperCase() === 'OPTIONS';
  const fullUrl = url.startsWith('http') ? url : `${getApiBase()}${url.startsWith('/') ? '' : '/'}${url}`;

  // Check if data is FormData
  const isFormData = data instanceof FormData;
  
  const headers: Record<string, string> = {
    // Only set Content-Type for non-FormData. FormData sets its own boundary.
    ...(data && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(isSafe ? {} : { 'X-HospoGo-CSRF': '1' }),
  };

  // E2E mode: always use mock-test-token (overrides cached Firebase session)
  // Prevents 404 on /api/venues/me when Firebase has a stale user from manual testing
  const isE2E = import.meta.env.VITE_E2E === '1' || (typeof window !== 'undefined' && localStorage.getItem('E2E_MODE') === 'true');
  if (isE2E) {
    headers['Authorization'] = 'Bearer mock-test-token';
  } else if (auth.currentUser) {
    try {
      // Force refresh token if this is a retry after a 401
      // This ensures we have a fresh token for the retry
      const token = await auth.currentUser.getIdToken(/* forceRefresh */ false);
      if (token && token.length > 0) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        logger.warn("apiRequest", "Got empty token from getIdToken");
      }
    } catch (error) {
      logger.error("apiRequest", "Error getting auth token for request:", error);
      // Don't add Authorization header if token fetch fails
      // This will cause a 401, which is better than sending an invalid token
    }
  }

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res, fullUrl);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // ============================================================================
    // AXIOS INTERCEPTOR STALL: Wait for auth handshake before making request
    // This prevents 401 errors during the brief Firebase session establishment window
    // ============================================================================
    const url = queryKey.join("/") as string;
    const isAuthEndpoint = url.includes('/api/me') || 
                           url.includes('/api/bootstrap') || 
                           url.includes('/api/auth/');
    
    if (!isAuthEndpoint && isAuthHandshakeInProgress()) {
      logger.debug('getQueryFn', `Stalling query to ${url} - auth handshake in progress`);
      await waitForAuthHandshake();
    }
    
    // AUTH REHYDRATION FIX: Skip request if in 401 backoff mode
    if (isIn401Backoff()) {
      logger.warn("getQueryFn", "Request suppressed due to 401 backoff");
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      const error = new Error("401: Auth backoff in progress - request suppressed");
      (error as any).isAuthError = true;
      (error as any).shouldNotReload = true;
      (error as any).isSuppressed = true;
      throw error;
    }
    
    const headers: Record<string, string> = {};
    
    // E2E mode: always use mock-test-token (overrides cached Firebase session)
    const isE2E = import.meta.env.VITE_E2E === '1' || (typeof window !== 'undefined' && localStorage.getItem('E2E_MODE') === 'true');
    if (isE2E) {
      headers['Authorization'] = 'Bearer mock-test-token';
    } else if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        logger.error("getQueryFn", "Error getting auth token for query:", error);
      }
    }

    const fullUrl = url.startsWith('http') ? url : `${getApiBase()}${url.startsWith('/') ? '' : '/'}${url}`;
    const res = await fetch(fullUrl, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      // AUTH REHYDRATION FIX: Track 401 for backoff
      track401AndShouldRetry();
      
      // Clear tokens for 401s
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
      return null;
    }

    await throwIfResNotOk(res, fullUrl);
    return await res.json();
  };

// Global error handlers for queries and mutations
const queryCache = new QueryCache({
  onError: (error, query) => {
    // Don't show toast for auth errors that shouldn't reload - let UI handle gracefully
    if (error instanceof Error && (error as any).shouldNotReload) {
      // Silently handle - AuthContext will update state
      return;
    }
    
    // AUTH REHYDRATION FIX: Silently ignore suppressed backoff errors
    if (error instanceof Error && (error as any).isSuppressed) {
      return;
    }
    
    // AUTH REHYDRATION FIX: Silently ignore handshake 401s (initial auth phase)
    if (error instanceof Error && (error as any).isHandshake401) {
      return;
    }
    
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    // Don't show toast for 401 errors - they're handled by auth state
    if (errorMessage.includes('401:')) {
      return;
    }
    
    // Don't show toast for 404 errors on /api/venues/me - it's expected when user doesn't have a venue
    if (errorMessage.includes('404:') && query.queryKey.includes('venue-status')) {
      return;
    }
    
    toast({ 
      variant: "destructive", 
      title: "Error", 
      description: errorMessage 
    });
  },
});

const mutationCache = new MutationCache({
  onError: (error) => {
    // Don't show toast for auth errors that shouldn't reload
    if (error instanceof Error && (error as any).shouldNotReload) {
      return;
    }
    
    // AUTH REHYDRATION FIX: Silently ignore suppressed backoff errors
    if (error instanceof Error && (error as any).isSuppressed) {
      return;
    }
    
    // AUTH REHYDRATION FIX: Silently ignore handshake 401s (initial auth phase)
    if (error instanceof Error && (error as any).isHandshake401) {
      return;
    }
    
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    // Don't show toast for 401 errors - they're handled by auth state
    if (errorMessage.includes('401:')) {
      return;
    }
    
    toast({ 
      variant: "destructive", 
      title: "Action Failed", 
      description: errorMessage 
    });
  },
});

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Prefetch current user profile during auth handshake.
 * This warms the cache so Dashboard can render instantly.
 */
export async function prefetchCurrentUser(idToken: string): Promise<void> {
  const fullUrl = `${getApiBase()}/api/me`;
  
  await queryClient.prefetchQuery({
    queryKey: [QUERY_KEYS.CURRENT_USER],
    queryFn: async () => {
      const res = await fetch(fullUrl, {
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 1000 * 60 * 2, // 2 minutes for auth data
  });
}

/**
 * Prefetch current venue during auth handshake.
 * This warms the cache so VenueDashboard can render instantly.
 */
export async function prefetchCurrentVenue(idToken: string): Promise<void> {
  const fullUrl = `${getApiBase()}/api/venues/me`;
  
  await queryClient.prefetchQuery({
    queryKey: [QUERY_KEYS.CURRENT_VENUE],
    queryFn: async () => {
      const res = await fetch(fullUrl, {
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes for venue data
  });
}

/**
 * Prefetch both user and venue data in parallel.
 * Call this as soon as Firebase user is detected.
 */
export async function prefetchAuthData(idToken: string): Promise<{
  user: unknown;
  venue: unknown;
}> {
  const userUrl = `${getApiBase()}/api/me`;
  const venueUrl = `${getApiBase()}/api/venues/me`;
  
  const [userResult, venueResult] = await Promise.allSettled([
    fetch(userUrl, {
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    }).then(res => res.ok ? res.json() : null),
    fetch(venueUrl, {
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    }).then(res => res.ok ? res.json() : null),
  ]);
  
  const user = userResult.status === 'fulfilled' ? userResult.value : null;
  const venue = venueResult.status === 'fulfilled' ? venueResult.value : null;
  
  // Warm the cache with the results
  if (user) {
    queryClient.setQueryData([QUERY_KEYS.CURRENT_USER], user);
  }
  if (venue) {
    queryClient.setQueryData([QUERY_KEYS.CURRENT_VENUE], venue);
  }
  
  return { user, venue };
}
