import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "./firebase";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const isSafe = method.toUpperCase() === 'GET' || method.toUpperCase() === 'HEAD' || method.toUpperCase() === 'OPTIONS';
  
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...(isSafe ? {} : { 'X-Snipshift-CSRF': '1' }),
  };

  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      console.error("Error getting auth token for request:", error);
    }
    } else if (typeof window !== 'undefined' && sessionStorage.getItem('snipshift_test_user')) {
      // Inject mock token for E2E tests
      const stored = sessionStorage.getItem('snipshift_test_user');
      let token = 'mock-test-token';
      try {
          if (stored) {
            const data = JSON.parse(stored);
            if (data.email && data.email.startsWith('e2e_test_')) {
                token = `mock-token-${data.email}`;
            }
          }
      } catch (e) {
          // ignore parse error
      }
      headers['Authorization'] = `Bearer ${token}`;
    }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
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
        console.error("Error getting auth token for query:", error);
      }
    } else if (typeof window !== 'undefined' && sessionStorage.getItem('snipshift_test_user')) {
      // Inject mock token for E2E tests
      const stored = sessionStorage.getItem('snipshift_test_user');
      let token = 'mock-test-token';
      try {
          if (stored) {
            const data = JSON.parse(stored);
            if (data.email && data.email.startsWith('e2e_test_')) {
                token = `mock-token-${data.email}`;
            }
          }
      } catch (e) {
          // ignore parse error
      }
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
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
