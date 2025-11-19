/**
 * Credit Service
 * 
 * Service functions for managing user job posting credits and subscriptions.
 * Provides functions for fetching available credits and initiating purchase checkout.
 */

import { apiRequest } from '../../lib/apiRequest';

/**
 * Credits response interface matching the API response
 */
export interface CreditsResponse {
  credits: number;
}

/**
 * Purchase initiation response interface
 * Contains the checkout session ID and URL for redirecting to payment
 */
export interface PurchaseResponse {
  sessionId: string;
  checkoutUrl: string;
}

/**
 * Fetches the current user's available job posting credits.
 * 
 * @returns Promise resolving to the user's credit balance
 * @throws Error if the API request fails (401 Unauthorized, 500 Server Error, etc.)
 */
export async function getCredits(): Promise<CreditsResponse> {
  return apiRequest<CreditsResponse>('/api/credits');
}

/**
 * Initiates the checkout process for purchasing additional job posting credits.
 * Calls an API route that generates a Stripe Checkout Session ID and URL.
 * 
 * @param planId - The ID of the subscription plan to purchase
 * @returns Promise resolving to the checkout session details (sessionId and checkoutUrl)
 * @throws Error if the API request fails (401 Unauthorized, 500 Server Error, etc.)
 */
export async function initiatePurchase(planId: string): Promise<PurchaseResponse> {
  return apiRequest<PurchaseResponse>('/api/credits/purchase', {
    method: 'POST',
    body: { planId },
  });
}

