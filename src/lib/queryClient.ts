import { QueryClient, QueryFunction, QueryCache, MutationCache } from "@tanstack/react-query";
import { auth } from "./firebase";
import { toast } from "@/hooks/useToast";
import { logger } from "@/lib/logger";

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

  if (auth.currentUser) {
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
  } else if (import.meta.env.VITE_E2E === '1') {
    // E2E mode: API auth middleware supports this fixed bypass token.
    headers['Authorization'] = 'Bearer mock-test-token';
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
    
    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        logger.error("getQueryFn", "Error getting auth token for query:", error);
      }
    } else if (import.meta.env.VITE_E2E === '1') {
      headers['Authorization'] = 'Bearer mock-test-token';
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
