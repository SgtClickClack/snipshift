/**
 * QueryClient Wrapper Utility for Tests
 * 
 * Provides a reusable wrapper for React Query components in tests,
 * ensuring proper isolation with a fresh QueryClient instance.
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Creates a QueryClient with test-friendly defaults
 * Configured for complete test isolation with no caching between tests
 */
export const createTestQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // Ensure queries don't persist between tests
        gcTime: 0,
      },
      mutations: {
        retry: false,
        // Ensure mutations don't persist between tests
        gcTime: 0,
      },
    },
  });
};

/**
 * Creates a fresh QueryClient instance for a test
 * This ensures complete isolation between tests
 */
export const createFreshQueryClient = (): QueryClient => {
  return createTestQueryClient();
};

/**
 * Custom render function that wraps components with QueryClientProvider
 * 
 * @param ui - The component to render
 * @param options - Additional render options
 * @param client - QueryClient instance (required for proper isolation)
 * @returns Render result with QueryClientProvider wrapper
 */
export const renderWithClient = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
  client?: QueryClient
) => {
  // Always create a fresh client if not provided to ensure isolation
  const queryClient = client || createFreshQueryClient();
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

