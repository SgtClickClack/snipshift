/**
 * CreditManagementDashboard Component Tests
 * 
 * TDD: Integration tests for the Credit Management Dashboard component
 * Tests credit balance display, plan selection, purchase initiation, and error handling
 */

import React from 'react';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/react-query';
import CreditManagementDashboard from '../CreditManagementDashboard';
import {
  getCredits,
  initiatePurchase,
  CreditsResponse,
  PurchaseResponse,
} from '../../services/api/creditService';
import { renderWithClient, createFreshQueryClient } from '../../test-utils/queryClientWrapper';

// Mock the credit service module
jest.mock('../../services/api/creditService');

// Mock window.location
const mockLocation = {
  href: '',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

const mockGetCredits = getCredits as jest.MockedFunction<typeof getCredits>;
const mockInitiatePurchase = initiatePurchase as jest.MockedFunction<typeof initiatePurchase>;

describe('CreditManagementDashboard', () => {
  let queryClient: QueryClient;

  const mockCreditsResponse: CreditsResponse = {
    credits: 10,
  };

  const mockPurchaseResponse: PurchaseResponse = {
    sessionId: 'cs_test_1234567890',
    checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_1234567890',
  };

  beforeEach(() => {
    // Create a fresh QueryClient instance before each test for complete isolation
    queryClient = createFreshQueryClient();
    jest.clearAllMocks();
    mockLocation.href = '';
  });

  afterEach(() => {
    // Clear the QueryClient cache to ensure no state leaks between tests
    queryClient.clear();
  });

  const renderDashboard = () => {
    return renderWithClient(<CreditManagementDashboard />, undefined, queryClient);
  };

  describe('Loading/Success Display', () => {
    it('should display loading state while fetching credits', async () => {
      let resolvePromise: (value: CreditsResponse) => void;
      const promise = new Promise<CreditsResponse>((resolve) => {
        resolvePromise = resolve;
      });

      mockGetCredits.mockReturnValueOnce(promise);

      renderDashboard();

      // Should show loading state
      expect(screen.getByTestId('credits-loading')).toBeInTheDocument();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Resolve the promise
      await act(async () => {
        resolvePromise(mockCreditsResponse);
      });
    });

    it('should render the current credit balance correctly', async () => {
      mockGetCredits.mockResolvedValueOnce(mockCreditsResponse);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('credits-balance')).toBeInTheDocument();
      });

      // Check that credit balance is rendered within the balance element
      const balanceElement = screen.getByTestId('credits-balance');
      expect(balanceElement).toHaveTextContent('10');
      expect(balanceElement).toHaveTextContent(/credit/i);
    });

    it('should display different credit balances correctly', async () => {
      const balances = [0, 5, 15, 100];

      for (const balance of balances) {
        const creditsResponse: CreditsResponse = { credits: balance };
        mockGetCredits.mockResolvedValueOnce(creditsResponse);

        const { unmount } = renderDashboard();

        await waitFor(() => {
          expect(screen.getByTestId('credits-balance')).toBeInTheDocument();
        });

        // Check balance within the balance element to avoid matching plan buttons
        const balanceElement = screen.getByTestId('credits-balance');
        expect(balanceElement).toHaveTextContent(String(balance));

        // Clean up before next iteration
        unmount();
        queryClient.clear();
        jest.clearAllMocks();
      }
    });
  });

  describe('Empty/Error State', () => {
    it('should display zero balance message when credits are zero', async () => {
      const zeroCreditsResponse: CreditsResponse = { credits: 0 };
      mockGetCredits.mockResolvedValueOnce(zeroCreditsResponse);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('credits-balance')).toBeInTheDocument();
      });

      // Check balance within the balance element to avoid matching plan buttons
      const balanceElement = screen.getByTestId('credits-balance');
      expect(balanceElement).toHaveTextContent('0');
    });

    it('should display a user-friendly error message on fetch failure', async () => {
      const error = new Error('Failed to fetch credits');
      mockGetCredits.mockRejectedValueOnce(error);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('credits-error')).toBeInTheDocument();
        expect(screen.getByText(/error loading credits/i)).toBeInTheDocument();
      });
    });

    it('should handle 401 Unauthorized error', async () => {
      const error = new Error('Unauthorized');
      mockGetCredits.mockRejectedValueOnce(error);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('credits-error')).toBeInTheDocument();
      });
    });

    it('should handle 500 Internal Server Error', async () => {
      const error = new Error('Internal server error');
      mockGetCredits.mockRejectedValueOnce(error);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('credits-error')).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      const error = new Error('Network request failed');
      mockGetCredits.mockRejectedValueOnce(error);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('credits-error')).toBeInTheDocument();
      });
    });
  });

  describe('Plan Selection', () => {
    it('should display available credit plans', async () => {
      mockGetCredits.mockResolvedValueOnce(mockCreditsResponse);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('credits-balance')).toBeInTheDocument();
      });

      // Check that plan options are displayed
      expect(screen.getByTestId('credit-plans')).toBeInTheDocument();
      expect(screen.getByText(/5 credits/i)).toBeInTheDocument();
      expect(screen.getByText(/10 credits/i)).toBeInTheDocument();
      expect(screen.getByText(/20 credits/i)).toBeInTheDocument();
    });

    it('should allow selecting a credit plan', async () => {
      const user = userEvent.setup();
      mockGetCredits.mockResolvedValueOnce(mockCreditsResponse);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('credits-balance')).toBeInTheDocument();
      });

      // Find and click a plan option
      const planButton = screen.getByTestId('plan-5');
      await user.click(planButton);

      // Plan should be selected
      expect(planButton).toHaveAttribute('data-selected', 'true');
    });
  });

  describe('Purchase Initiation', () => {
    it('should call initiatePurchase service when purchase button is clicked', async () => {
      const user = userEvent.setup();
      mockGetCredits.mockResolvedValueOnce(mockCreditsResponse);
      mockInitiatePurchase.mockResolvedValueOnce(mockPurchaseResponse);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('credits-balance')).toBeInTheDocument();
      });

      // Select a plan first
      const planButton = screen.getByTestId('plan-5');
      await user.click(planButton);

      // Click purchase button
      const purchaseButton = screen.getByTestId('purchase-button');
      await user.click(purchaseButton);

      await waitFor(() => {
        expect(mockInitiatePurchase).toHaveBeenCalledWith('plan_5');
      });
    });

    it('should call initiatePurchase with correct plan ID for different plans', async () => {
      const user = userEvent.setup();
      const plans = [
        { testId: 'plan-5', planId: 'plan_5' },
        { testId: 'plan-10', planId: 'plan_10' },
        { testId: 'plan-20', planId: 'plan_20' },
      ];

      for (const plan of plans) {
        mockGetCredits.mockResolvedValueOnce(mockCreditsResponse);
        mockInitiatePurchase.mockResolvedValueOnce(mockPurchaseResponse);

        const { unmount } = renderDashboard();

        await waitFor(() => {
          expect(screen.getByTestId('credits-balance')).toBeInTheDocument();
        });

        // Select plan
        const planButton = screen.getByTestId(plan.testId);
        await user.click(planButton);

        // Click purchase
        const purchaseButton = screen.getByTestId('purchase-button');
        await user.click(purchaseButton);

        await waitFor(() => {
          expect(mockInitiatePurchase).toHaveBeenCalledWith(plan.planId);
        });

        // Clean up
        unmount();
        queryClient.clear();
        jest.clearAllMocks();
        mockLocation.href = '';
      }
    });

    it('should disable purchase button when no plan is selected', async () => {
      mockGetCredits.mockResolvedValueOnce(mockCreditsResponse);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('credits-balance')).toBeInTheDocument();
      });

      const purchaseButton = screen.getByTestId('purchase-button');
      expect(purchaseButton).toBeDisabled();
    });

    it('should show loading state during purchase initiation', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: PurchaseResponse) => void;
      const promise = new Promise<PurchaseResponse>((resolve) => {
        resolvePromise = resolve;
      });

      mockGetCredits.mockResolvedValueOnce(mockCreditsResponse);
      mockInitiatePurchase.mockReturnValueOnce(promise);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('credits-balance')).toBeInTheDocument();
      });

      // Select a plan
      const planButton = screen.getByTestId('plan-5');
      await user.click(planButton);

      // Click purchase button
      const purchaseButton = screen.getByTestId('purchase-button');
      const clickPromise = user.click(purchaseButton);

      // Wait for loading state
      await waitFor(() => {
        expect(purchaseButton).toBeDisabled();
        expect(screen.getByText(/processing/i)).toBeInTheDocument();
      });

      // Resolve the promise
      await act(async () => {
        resolvePromise(mockPurchaseResponse);
      });

      await clickPromise;
    });
  });

  describe('Redirection Flow', () => {
    it('should redirect to checkoutUrl upon successful purchase initiation', async () => {
      const user = userEvent.setup();
      mockGetCredits.mockResolvedValueOnce(mockCreditsResponse);
      mockInitiatePurchase.mockResolvedValueOnce(mockPurchaseResponse);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('credits-balance')).toBeInTheDocument();
      });

      // Select a plan
      const planButton = screen.getByTestId('plan-5');
      await user.click(planButton);

      // Click purchase button
      const purchaseButton = screen.getByTestId('purchase-button');
      await user.click(purchaseButton);

      await waitFor(() => {
        expect(mockInitiatePurchase).toHaveBeenCalled();
        expect(mockLocation.href).toBe('https://checkout.stripe.com/pay/cs_test_1234567890');
      });
    });

    it('should redirect to different checkout URLs for different plans', async () => {
      const user = userEvent.setup();
      const checkoutUrls = [
        'https://checkout.stripe.com/pay/cs_test_111',
        'https://checkout.stripe.com/pay/cs_test_222',
        'https://checkout.stripe.com/pay/cs_test_333',
      ];

      for (let i = 0; i < checkoutUrls.length; i++) {
        const purchaseResponse: PurchaseResponse = {
          sessionId: `cs_test_${i}`,
          checkoutUrl: checkoutUrls[i],
        };

        mockGetCredits.mockResolvedValueOnce(mockCreditsResponse);
        mockInitiatePurchase.mockResolvedValueOnce(purchaseResponse);

        const { unmount } = renderDashboard();

        await waitFor(() => {
          expect(screen.getByTestId('credits-balance')).toBeInTheDocument();
        });

        // Select plan
        const planButton = screen.getByTestId('plan-5');
        await user.click(planButton);

        // Click purchase
        const purchaseButton = screen.getByTestId('purchase-button');
        await user.click(purchaseButton);

        await waitFor(() => {
          expect(mockLocation.href).toBe(checkoutUrls[i]);
        });

        // Clean up
        unmount();
        queryClient.clear();
        jest.clearAllMocks();
        mockLocation.href = '';
      }
    });
  });

  describe('Purchase Error', () => {
    it('should display an error message on purchase initiation failure', async () => {
      const user = userEvent.setup();
      const error = new Error('Failed to initiate purchase');

      mockGetCredits.mockResolvedValueOnce(mockCreditsResponse);
      mockInitiatePurchase.mockRejectedValueOnce(error);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('credits-balance')).toBeInTheDocument();
      });

      // Select a plan
      const planButton = screen.getByTestId('plan-5');
      await user.click(planButton);

      // Click purchase button
      const purchaseButton = screen.getByTestId('purchase-button');
      await user.click(purchaseButton);

      await waitFor(() => {
        expect(screen.getByTestId('purchase-error')).toBeInTheDocument();
        expect(screen.getByText(/failed to initiate purchase/i)).toBeInTheDocument();
      });
    });

    it('should handle 400 Validation error on purchase', async () => {
      const user = userEvent.setup();
      const error = new Error('Validation error: invalid plan ID');

      mockGetCredits.mockResolvedValueOnce(mockCreditsResponse);
      mockInitiatePurchase.mockRejectedValueOnce(error);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('credits-balance')).toBeInTheDocument();
      });

      const planButton = screen.getByTestId('plan-5');
      await user.click(planButton);

      const purchaseButton = screen.getByTestId('purchase-button');
      await user.click(purchaseButton);

      await waitFor(() => {
        expect(screen.getByTestId('purchase-error')).toBeInTheDocument();
      });
    });

    it('should handle 401 Unauthorized error on purchase', async () => {
      const user = userEvent.setup();
      const error = new Error('Unauthorized');

      mockGetCredits.mockResolvedValueOnce(mockCreditsResponse);
      mockInitiatePurchase.mockRejectedValueOnce(error);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('credits-balance')).toBeInTheDocument();
      });

      const planButton = screen.getByTestId('plan-5');
      await user.click(planButton);

      const purchaseButton = screen.getByTestId('purchase-button');
      await user.click(purchaseButton);

      await waitFor(() => {
        expect(screen.getByTestId('purchase-error')).toBeInTheDocument();
      });
    });

    it('should handle 500 Internal Server Error on purchase', async () => {
      const user = userEvent.setup();
      const error = new Error('Internal server error');

      mockGetCredits.mockResolvedValueOnce(mockCreditsResponse);
      mockInitiatePurchase.mockRejectedValueOnce(error);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('credits-balance')).toBeInTheDocument();
      });

      const planButton = screen.getByTestId('plan-5');
      await user.click(planButton);

      const purchaseButton = screen.getByTestId('purchase-button');
      await user.click(purchaseButton);

      await waitFor(() => {
        expect(screen.getByTestId('purchase-error')).toBeInTheDocument();
      });
    });

    it('should allow retrying purchase after an error', async () => {
      const user = userEvent.setup();
      const error = new Error('Failed to initiate purchase');

      mockGetCredits.mockResolvedValueOnce(mockCreditsResponse);
      mockInitiatePurchase.mockRejectedValueOnce(error);
      mockInitiatePurchase.mockResolvedValueOnce(mockPurchaseResponse);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('credits-balance')).toBeInTheDocument();
      });

      const planButton = screen.getByTestId('plan-5');
      await user.click(planButton);

      const purchaseButton = screen.getByTestId('purchase-button');

      // First attempt - fails
      await user.click(purchaseButton);

      await waitFor(() => {
        expect(screen.getByTestId('purchase-error')).toBeInTheDocument();
      });

      // Retry - should succeed
      await user.click(purchaseButton);

      await waitFor(() => {
        expect(mockInitiatePurchase).toHaveBeenCalledTimes(2);
        expect(mockLocation.href).toBe('https://checkout.stripe.com/pay/cs_test_1234567890');
      });
    });
  });
});

