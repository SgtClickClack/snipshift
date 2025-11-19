/**
 * CreditManagementDashboard Component
 * 
 * Displays the user's current job posting credit balance and allows purchasing additional credits.
 * Uses React Query for data fetching and mutations.
 */

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  getCredits,
  initiatePurchase,
  CreditsResponse,
  PurchaseResponse,
} from '../services/api/creditService';

/**
 * Credit plan interface
 */
interface CreditPlan {
  id: string;
  credits: number;
  planId: string;
}

/**
 * Available credit plans
 */
const CREDIT_PLANS: CreditPlan[] = [
  { id: 'plan-5', credits: 5, planId: 'plan_5' },
  { id: 'plan-10', credits: 10, planId: 'plan_10' },
  { id: 'plan-20', credits: 20, planId: 'plan_20' },
];

export default function CreditManagementDashboard() {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string>('');

  // Fetch user credits
  const {
    data: creditsData,
    isLoading,
    error,
  } = useQuery<CreditsResponse>({
    queryKey: ['credits'],
    queryFn: getCredits,
  });

  // Mutation for initiating purchase
  const purchaseMutation = useMutation({
    mutationFn: (planId: string) => initiatePurchase(planId),
    onSuccess: (data: PurchaseResponse) => {
      // Clear errors
      setPurchaseError('');
      
      // Redirect to checkout URL
      window.location.href = data.checkoutUrl;
    },
    onError: (err: Error) => {
      setPurchaseError(err.message || 'Failed to initiate purchase. Please try again.');
    },
  });

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    setPurchaseError('');
  };

  const handlePurchase = () => {
    if (!selectedPlanId) {
      return;
    }

    setPurchaseError('');
    const selectedPlan = CREDIT_PLANS.find((plan) => plan.id === selectedPlanId);
    if (selectedPlan) {
      purchaseMutation.mutate(selectedPlan.planId);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div data-testid="credits-loading">
        <p>Loading credits...</p>
      </div>
    );
  }

  // Error state (fetch error)
  if (error) {
    return (
      <div data-testid="credits-error">
        <p>Error loading credits. Please try again later.</p>
      </div>
    );
  }

  const credits = creditsData?.credits ?? 0;

  return (
    <div>
      {/* Credit Balance Display */}
      <div data-testid="credits-balance">
        <h2>Your Credit Balance</h2>
        <p>
          <strong>{credits}</strong> {credits === 1 ? 'credit' : 'credits'} available
        </p>
      </div>

      {/* Credit Plans */}
      <div data-testid="credit-plans">
        <h3>Purchase Additional Credits</h3>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          {CREDIT_PLANS.map((plan) => (
            <button
              key={plan.id}
              data-testid={plan.id}
              data-selected={selectedPlanId === plan.id}
              onClick={() => handlePlanSelect(plan.id)}
              style={{
                padding: '1rem',
                border: selectedPlanId === plan.id ? '2px solid blue' : '1px solid gray',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: selectedPlanId === plan.id ? '#e3f2fd' : 'white',
              }}
            >
              {plan.credits} credits
            </button>
          ))}
        </div>
      </div>

      {/* Purchase Button */}
      <button
        data-testid="purchase-button"
        onClick={handlePurchase}
        disabled={!selectedPlanId || purchaseMutation.isPending}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: selectedPlanId && !purchaseMutation.isPending ? '#007bff' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: selectedPlanId && !purchaseMutation.isPending ? 'pointer' : 'not-allowed',
          fontSize: '1rem',
        }}
      >
        {purchaseMutation.isPending ? 'Processing...' : 'Purchase Credits'}
      </button>

      {/* Purchase Error */}
      {purchaseError && (
        <div data-testid="purchase-error" style={{ marginTop: '1rem', color: 'red' }}>
          <p>{purchaseError}</p>
        </div>
      )}
    </div>
  );
}

