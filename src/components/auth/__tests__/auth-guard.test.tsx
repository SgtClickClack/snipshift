/**
 * Regression tests for AuthGuard redirection logic.
 * Verifies onboarding vs dashboard redirect based on isOnboarded (single source of truth).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthGuard } from '../auth-guard';

// Hoisted mocks so they are defined before vi.mock factories run
const mockUseAuth = vi.hoisted(() => vi.fn());
const mockUseNavigate = vi.hoisted(() => vi.fn());
const mockUseLocation = vi.hoisted(() => vi.fn());

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...mod,
    useNavigate: () => mockUseNavigate,
    useLocation: () => mockUseLocation(),
  };
});

vi.mock('@/components/loading/loading-spinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner" />,
}));

const onboardingLocation = {
  pathname: '/onboarding',
  search: '',
  hash: '',
  state: null,
  key: 'default',
};

function renderAuthGuardOnOnboarding(isOnboarded: boolean) {
  mockUseLocation.mockReturnValue(onboardingLocation);
  mockUseNavigate.mockClear();
  mockUseAuth.mockReturnValue({
    user: {
      id: 'u1',
      email: 'user@example.com',
      isOnboarded,
    },
    isLoading: false,
    hasFirebaseUser: true,
  });

  return render(
    <MemoryRouter initialEntries={['/onboarding']}>
      <AuthGuard>
        <span data-testid="child">Onboarding content</span>
      </AuthGuard>
    </MemoryRouter>
  );
}

describe('AuthGuard redirection logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Test Case A: User isOnboarded = false. Expect: No redirect from /onboarding', async () => {
    renderAuthGuardOnOnboarding(false);

    await waitFor(() => {
      expect(mockUseNavigate).not.toHaveBeenCalledWith('/dashboard', expect.any(Object));
    });

    // Assert navigate was never called with /dashboard (strict: no redirect away from onboarding)
    const calls = mockUseNavigate.mock.calls;
    const dashboardCalls = calls.filter((c) => c[0] === '/dashboard');
    expect(dashboardCalls).toHaveLength(0);
  });

  it('Test Case B: User isOnboarded = true. Expect: Immediate redirect to /dashboard', async () => {
    renderAuthGuardOnOnboarding(true);

    await waitFor(() => {
      expect(mockUseNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });
});
