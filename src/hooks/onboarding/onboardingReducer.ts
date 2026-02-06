import { logger } from '@/lib/logger';
import type {
  OnboardingAction,
  OnboardingContext,
  OnboardingState,
} from '@/types/onboarding';

export const TOTAL_STEPS = 5;

/**
 * State Machine: Maps state to step index
 */
export const stateToStepIndex: Record<OnboardingState, number> = {
  'ROLE_SELECTION': 0,
  'PERSONAL_DETAILS': 1,
  'VENUE_DETAILS': 2,
  'DOCUMENT_VERIFICATION': 2,
  'ROLE_EXPERIENCE': 3,
  'PAYOUT_SETUP': 4,
  'COMPLETED': 5,
};

/**
 * State Machine: Maps step index to state
 */
export const stepIndexToState: Record<number, OnboardingState> = {
  0: 'ROLE_SELECTION',
  1: 'PERSONAL_DETAILS',
  2: 'DOCUMENT_VERIFICATION',
  3: 'ROLE_EXPERIENCE',
  4: 'PAYOUT_SETUP',
  5: 'COMPLETED',
};

/**
 * Onboarding State Machine Reducer
 */
export function onboardingReducer(
  context: OnboardingContext,
  action: OnboardingAction
): OnboardingContext {
  switch (action.type) {
    case 'SELECT_ROLE':
      return { ...context, selectedRole: action.role };

    case 'NEXT':
      if (context.state === 'ROLE_SELECTION') {
        if (!context.selectedRole) return context;
        if (context.selectedRole === 'venue') return context;
        logger.debug('Onboarding', '[Onboarding FSM] Transitioning ROLE_SELECTION -> PERSONAL_DETAILS', {
          selectedRole: context.selectedRole,
          newStepIndex: 1,
        });
        return { ...context, state: 'PERSONAL_DETAILS', stepIndex: 1 };
      }

      if (context.state === 'PERSONAL_DETAILS') {
        if (context.selectedRole === 'venue') {
          logger.debug('Onboarding', '[Onboarding FSM] Transitioning PERSONAL_DETAILS -> VENUE_DETAILS', {
            selectedRole: context.selectedRole,
            newStepIndex: 2,
          });
          return { ...context, state: 'VENUE_DETAILS', stepIndex: 2 };
        }
        return { ...context, state: 'DOCUMENT_VERIFICATION', stepIndex: 2 };
      }

      if (context.state === 'VENUE_DETAILS') {
        return { ...context, state: 'ROLE_EXPERIENCE', stepIndex: 3 };
      }

      if (context.state === 'ROLE_EXPERIENCE') {
        return { ...context, state: 'PAYOUT_SETUP', stepIndex: 4 };
      }

      if (context.state === 'PAYOUT_SETUP') {
        return { ...context, state: 'COMPLETED', stepIndex: 5 };
      }

      {
        const currentStep = context.stepIndex;
        if (currentStep < TOTAL_STEPS - 1) {
          const nextStep = currentStep + 1;
          return {
            ...context,
            state: stepIndexToState[nextStep],
            stepIndex: nextStep,
          };
        }
      }
      return context;

    case 'BACK':
      if (context.stepIndex > 0) {
        const prevStep = context.stepIndex - 1;
        if (context.state === 'VENUE_DETAILS') {
          return { ...context, state: 'PERSONAL_DETAILS', stepIndex: 1 };
        }
        if (context.state === 'DOCUMENT_VERIFICATION' && context.selectedRole === 'professional') {
          return { ...context, state: 'PERSONAL_DETAILS', stepIndex: 1 };
        }
        return {
          ...context,
          state: stepIndexToState[prevStep],
          stepIndex: prevStep,
        };
      }
      return context;

    case 'COMPLETE':
      return { ...context, state: 'COMPLETED', stepIndex: TOTAL_STEPS };

    case 'SKIP_DOCUMENTS':
      return { ...context, documentsSkipped: true };

    case 'UNSKIP_DOCUMENTS':
      return { ...context, documentsSkipped: false };

    case 'SKIP_PAYOUT':
      return { ...context, payoutSkipped: true };

    case 'UNSKIP_PAYOUT':
      return { ...context, payoutSkipped: false };

    case 'INITIALIZE_FROM_SESSION':
      if (action.role === 'hub') return context;
      if (action.role === 'professional') {
        return {
          ...context,
          selectedRole: 'professional',
          state: 'PERSONAL_DETAILS',
          stepIndex: 1,
          isWaitlistOnly: true,
        };
      }
      return context;

    case 'INITIALIZE_FROM_STORAGE':
      return {
        ...context,
        state: action.payload.state,
        selectedRole: action.payload.selectedRole,
        stepIndex: stateToStepIndex[action.payload.state] || 0,
      };

    default:
      return context;
  }
}
