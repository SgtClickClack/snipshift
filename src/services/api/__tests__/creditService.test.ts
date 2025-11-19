/**
 * Credit Service Unit Tests
 * 
 * TDD: Testing credit service functions for Credit/Subscription Management
 */

import { apiRequest } from '../../../lib/apiRequest';
import {
  getCredits,
  initiatePurchase,
  CreditsResponse,
  PurchaseResponse,
} from '../creditService';

// Mock the apiRequest module
jest.mock('../../../lib/apiRequest');

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe('creditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCredits', () => {
    const mockCreditsResponse: CreditsResponse = {
      credits: 10,
    };

    describe('Successful data retrieval', () => {
      it('should fetch current user available job posting credits', async () => {
        mockApiRequest.mockResolvedValueOnce(mockCreditsResponse);

        const result = await getCredits();

        expect(mockApiRequest).toHaveBeenCalledWith('/api/credits');
        expect(result).toEqual(mockCreditsResponse);
        expect(result.credits).toBe(10);
      });

      it('should return positive credit balance', async () => {
        const positiveCredits = { credits: 25 };
        mockApiRequest.mockResolvedValueOnce(positiveCredits);

        const result = await getCredits();

        expect(result.credits).toBeGreaterThan(0);
        expect(result.credits).toBe(25);
      });

      it('should handle zero credits', async () => {
        const zeroCredits = { credits: 0 };
        mockApiRequest.mockResolvedValueOnce(zeroCredits);

        const result = await getCredits();

        expect(result.credits).toBe(0);
      });

      it('should map credits data correctly', async () => {
        mockApiRequest.mockResolvedValueOnce(mockCreditsResponse);

        const result = await getCredits();

        expect(result).toMatchObject({
          credits: 10,
        });
      });
    });

    describe('Error handling', () => {
      it('should handle 401 Unauthorized error', async () => {
        const error = new Error('Unauthorized');
        mockApiRequest.mockRejectedValueOnce(error);

        await expect(getCredits()).rejects.toThrow('Unauthorized');
        expect(mockApiRequest).toHaveBeenCalledWith('/api/credits');
      });

      it('should handle 500 Internal Server Error', async () => {
        const error = new Error('Internal server error');
        mockApiRequest.mockRejectedValueOnce(error);

        await expect(getCredits()).rejects.toThrow('Internal server error');
      });

      it('should handle network errors', async () => {
        const error = new Error('Network request failed');
        mockApiRequest.mockRejectedValueOnce(error);

        await expect(getCredits()).rejects.toThrow('Network request failed');
      });

      it('should propagate API error messages', async () => {
        const error = new Error('API Error: 500');
        mockApiRequest.mockRejectedValueOnce(error);

        await expect(getCredits()).rejects.toThrow('API Error: 500');
      });
    });
  });

  describe('initiatePurchase', () => {
    const mockPurchaseResponse: PurchaseResponse = {
      sessionId: 'cs_test_1234567890',
      checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_1234567890',
    };

    describe('Successful purchase initiation', () => {
      it('should initiate checkout process and return session ID', async () => {
        mockApiRequest.mockResolvedValueOnce(mockPurchaseResponse);

        const planId = 'plan_basic_monthly';
        const result = await initiatePurchase(planId);

        expect(mockApiRequest).toHaveBeenCalledWith('/api/credits/purchase', {
          method: 'POST',
          body: { planId },
        });
        expect(result).toEqual(mockPurchaseResponse);
        expect(result.sessionId).toBe('cs_test_1234567890');
      });

      it('should return checkout URL for redirect', async () => {
        mockApiRequest.mockResolvedValueOnce(mockPurchaseResponse);

        const planId = 'plan_premium_monthly';
        const result = await initiatePurchase(planId);

        expect(result.checkoutUrl).toBeDefined();
        expect(result.checkoutUrl).toBe('https://checkout.stripe.com/pay/cs_test_1234567890');
      });

      it('should handle different plan IDs', async () => {
        const differentPlanResponse = {
          sessionId: 'cs_test_9876543210',
          checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_9876543210',
        };
        mockApiRequest.mockResolvedValueOnce(differentPlanResponse);

        const planId = 'plan_enterprise_yearly';
        const result = await initiatePurchase(planId);

        expect(mockApiRequest).toHaveBeenCalledWith('/api/credits/purchase', {
          method: 'POST',
          body: { planId: 'plan_enterprise_yearly' },
        });
        expect(result.sessionId).toBe('cs_test_9876543210');
      });

      it('should map purchase response data correctly', async () => {
        mockApiRequest.mockResolvedValueOnce(mockPurchaseResponse);

        const planId = 'plan_basic_monthly';
        const result = await initiatePurchase(planId);

        expect(result).toMatchObject({
          sessionId: expect.any(String),
          checkoutUrl: expect.any(String),
        });
        expect(result.sessionId).toContain('cs_test_');
        expect(result.checkoutUrl).toContain('checkout.stripe.com');
      });
    });

    describe('Error handling', () => {
      it('should handle 401 Unauthorized error', async () => {
        const error = new Error('Unauthorized');
        mockApiRequest.mockRejectedValueOnce(error);

        const planId = 'plan_basic_monthly';
        await expect(initiatePurchase(planId)).rejects.toThrow('Unauthorized');

        expect(mockApiRequest).toHaveBeenCalledWith('/api/credits/purchase', {
          method: 'POST',
          body: { planId },
        });
      });

      it('should handle 500 Internal Server Error', async () => {
        const error = new Error('Internal server error');
        mockApiRequest.mockRejectedValueOnce(error);

        const planId = 'plan_basic_monthly';
        await expect(initiatePurchase(planId)).rejects.toThrow(
          'Internal server error'
        );
      });

      it('should handle network errors', async () => {
        const error = new Error('Network request failed');
        mockApiRequest.mockRejectedValueOnce(error);

        const planId = 'plan_basic_monthly';
        await expect(initiatePurchase(planId)).rejects.toThrow(
          'Network request failed'
        );
      });

      it('should propagate API error messages', async () => {
        const error = new Error('API Error: 500');
        mockApiRequest.mockRejectedValueOnce(error);

        const planId = 'plan_basic_monthly';
        await expect(initiatePurchase(planId)).rejects.toThrow('API Error: 500');
      });
    });
  });
});

