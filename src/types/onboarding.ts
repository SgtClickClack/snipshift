import type { HospitalityRole } from '@/utils/hospitality';

/**
 * Staff-facing onboarding form data for the professional flow.
 */
export type StaffOnboardingData = {
  displayName: string;
  phone: string;
  location: string;
  avatarUrl: string;
  hospitalityRole: '' | HospitalityRole;
  hourlyRatePreference: string;
  bio: string;
};

/**
 * Venue address fields captured during venue onboarding.
 */
export type VenueAddress = {
  street: string;
  suburb: string;
  postcode: string;
  city: string;
  state: string;
  country: string;
  lat?: number;
  lng?: number;
};

/**
 * Operating hours keyed by day for venue onboarding.
 */
export type OperatingHours = {
  [day: string]: {
    open?: string;
    close?: string;
    closed?: boolean;
  };
};

/**
 * Venue onboarding form data used for the hub flow.
 */
export type VenueOnboardingData = {
  venueName: string;
  liquorLicenseNumber: string;
  address: VenueAddress;
  operatingHours: OperatingHours;
};

/**
 * Onboarding finite state machine states.
 */
export type OnboardingState =
  | 'ROLE_SELECTION'
  | 'PERSONAL_DETAILS'
  | 'VENUE_DETAILS'
  | 'DOCUMENT_VERIFICATION'
  | 'ROLE_EXPERIENCE'
  | 'PAYOUT_SETUP'
  | 'COMPLETED';

/**
 * Onboarding finite state machine actions.
 */
export type OnboardingAction =
  | { type: 'SELECT_ROLE'; role: 'professional' | 'venue' }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'COMPLETE' }
  | { type: 'SKIP_DOCUMENTS' }
  | { type: 'UNSKIP_DOCUMENTS' }
  | { type: 'SKIP_PAYOUT' }
  | { type: 'UNSKIP_PAYOUT' }
  | { type: 'INITIALIZE_FROM_SESSION'; role?: 'professional' | 'venue' | 'hub' }
  | {
      type: 'INITIALIZE_FROM_STORAGE';
      payload: {
        state: OnboardingState;
        selectedRole: 'professional' | 'venue' | null;
        formData: StaffOnboardingData;
        venueFormData: VenueOnboardingData;
      };
    };

/**
 * FSM context that tracks onboarding progress.
 */
export interface OnboardingContext {
  state: OnboardingState;
  selectedRole: 'professional' | 'venue' | null;
  stepIndex: number;
  documentsSkipped: boolean;
  payoutSkipped: boolean;
  isWaitlistOnly: boolean;
}

/**
 * Payload persisted to storage for onboarding resume.
 */
export interface OnboardingStoragePayload {
  state: OnboardingState;
  selectedRole: 'professional' | 'venue' | null;
  formData: StaffOnboardingData;
  venueFormData: VenueOnboardingData;
  timestamp: number;
}
