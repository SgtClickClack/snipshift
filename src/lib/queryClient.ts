import { QueryClient, QueryFunction, QueryCache, MutationCache } from "@tanstack/react-query";
import { auth } from "./firebase";
import { toast } from "@/hooks/useToast";
import { logger } from "@/lib/logger";
import { QUERY_KEYS } from "@/lib/query-keys";

async function throwIfResNotOk(res: Response, url?: string) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Handle 401 errors gracefully for specific endpoints
    if (res.status === 401 && url && typeof window !== 'undefined') {
      // Extract pathname from URL (handles both relative and absolute URLs)
      let urlPath: string;
      try {
        // Try to parse as absolute URL first
        urlPath = new URL(url, window.location.origin).pathname;
      } catch {
        // If that fails, assume it's already a pathname
        urlPath = url.startsWith('/') ? url : `/${url}`;
      }
      
      // For /api/auth/me and /api/notifications, don't throw - just clear token and let UI handle it
      if (urlPath === '/api/auth/me' || urlPath === '/api/me' || urlPath === '/api/notifications' || urlPath.startsWith('/api/notifications')) {
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
        throw error;
      }
      
      // For other 401s, clear token but still throw (components can handle redirect if needed)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
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

    const url = queryKey.join("/") as string;
    const fullUrl = url.startsWith('http') ? url : `${getApiBase()}${url.startsWith('/') ? '' : '/'}${url}`;
    const res = await fetch(fullUrl, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
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
