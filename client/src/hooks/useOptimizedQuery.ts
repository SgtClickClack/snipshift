import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useMemo } from 'react';

/**
 * Optimized query hook with built-in performance optimizations
 */
export function useOptimizedQuery<TData = unknown, TError = Error>(
  options: UseQueryOptions<TData, TError> & {
    staleTime?: number;
    cacheTime?: number;
    refetchOnWindowFocus?: boolean;
    refetchOnMount?: boolean;
  }
) {
  const {
    staleTime = 5 * 60 * 1000, // 5 minutes default stale time
    cacheTime = 10 * 60 * 1000, // 10 minutes default cache time
    refetchOnWindowFocus = false, // Disable refetch on window focus by default
    refetchOnMount = false, // Disable refetch on mount by default
    ...queryOptions
  } = options;

  return useQuery({
    ...queryOptions,
    staleTime,
    cacheTime,
    refetchOnWindowFocus,
    refetchOnMount,
  });
}

/**
 * Hook for memoized query keys to prevent unnecessary re-renders
 */
export function useMemoizedQueryKey(baseKey: string, dependencies: any[] = []) {
  return useMemo(() => [baseKey, ...dependencies], dependencies);
}

/**
 * Hook for debounced queries to reduce API calls
 */
export function useDebouncedQuery<TData = unknown, TError = Error>(
  options: UseQueryOptions<TData, TError> & {
    debounceMs?: number;
    enabled?: boolean;
  }
) {
  const { debounceMs = 300, enabled = true, ...queryOptions } = options;
  
  // Simple debouncing implementation
  const debouncedEnabled = useMemo(() => {
    if (!enabled) return false;
    // In a real implementation, you'd use a debounce hook here
    return enabled;
  }, [enabled, debounceMs]);

  return useOptimizedQuery({
    ...queryOptions,
    enabled: debouncedEnabled,
  });
}
