/**
 * Regression tests for LandingPage redirect logic.
 * Aligns with AuthGuard: redirect by user existence and isOnboarded (single source of truth).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '../LandingPage';

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

vi.mock('@/components/landing/Pricing', () => ({ default: () => <div data-testid="pricing" /> }));
vi.mock('@/components/landing/FAQSection', () => ({ default: () => <div data-testid="faq" /> }));
vi.mock('@/components/seo/SEO', () => ({ SEO: () => null }));
vi.mock('@/lib/roles', () => ({ getDashboardRoute: () => '/dashboard' }));

const landingLocation = { pathname: '/', search: '', hash: '', state: null, key: 'default' };

function renderLanding(overrides: { user?: { id: string; isOnboarded?: boolean } | null; isLoading?: boolean } = {}) {
  const { user = null, isLoading = false } = overrides;
  mockUseLocation.mockReturnValue(landingLocation);
  mockUseNavigate.mockClear();
  mockUseAuth.mockReturnValue({
    user,
    isLoading,
    hasUser: !!user,
    isAuthReady: !isLoading,
  });
  return render(
    <MemoryRouter initialEntries={['/']}>
      <LandingPage />
    </MemoryRouter>
  );
}

describe('LandingPage redirect logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('User exists AND isOnboarded is true -> navigate("/dashboard")', async () => {
    renderLanding({
      user: { id: 'u1', isOnboarded: true },
      isLoading: false,
    });

    await waitFor(() => {
      expect(mockUseNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('User exists AND isOnboarded is false -> navigate("/onboarding")', async () => {
    renderLanding({
      user: { id: 'u1', isOnboarded: false },
      isLoading: false,
    });

    await waitFor(() => {
      expect(mockUseNavigate).toHaveBeenCalledWith('/onboarding', { replace: true });
    });
  });

  it('No user -> stay on landing (no redirect to dashboard or onboarding)', async () => {
    renderLanding({ user: null, isLoading: false });

    await waitFor(() => {
      const calls = mockUseNavigate.mock.calls;
      const toDashboard = calls.some((c) => c[0] === '/dashboard');
      const toOnboarding = calls.some((c) => c[0] === '/onboarding');
      expect(toDashboard).toBe(false);
      expect(toOnboarding).toBe(false);
    });
  });

  it('User exists, isOnboarded undefined -> treat as not completed, navigate("/onboarding")', async () => {
    renderLanding({
      user: { id: 'u1' },
      isLoading: false,
    });

    await waitFor(() => {
      expect(mockUseNavigate).toHaveBeenCalledWith('/onboarding', { replace: true });
    });
  });
});
