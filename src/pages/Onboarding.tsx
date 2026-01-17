import { useEffect, useMemo, useRef, useState, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components/seo/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { useUserSync } from '@/hooks/useUserSync';
import { apiRequest } from '@/lib/queryClient';
import { auth } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LocationInput } from '@/components/ui/location-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/image-upload';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, SkipForward, AlertCircle, Building2, User, Loader2, Sparkles } from 'lucide-react';
import { RSALocker } from '@/components/profile/RSALocker';
import { GovernmentIDLocker } from '@/components/profile/GovernmentIDLocker';
import PayoutSettings from '@/components/payments/payout-settings';
import { HOSPITALITY_ROLES, type HospitalityRole } from '@/utils/hospitality';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VenueProfileForm } from '@/components/onboarding/VenueProfileForm';
import { ConfettiAnimation } from '@/components/onboarding/ConfettiAnimation';
import { ErrorBoundary } from '@/components/ui/error-boundary';

const TOTAL_STEPS = 5;

// Storage constants for persistence layer
const STORAGE_KEY = 'HOSPOGO_ONBOARDING_CACHE';
const STORAGE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Storage payload interface
interface OnboardingStoragePayload {
  state: OnboardingState;
  selectedRole: 'professional' | 'venue' | null;
  formData: StaffOnboardingData;
  venueFormData: VenueOnboardingData;
  timestamp: number;
}

type StaffOnboardingData = {
  displayName: string;
  phone: string;
  location: string;
  avatarUrl: string;
  hospitalityRole: '' | (typeof HOSPITALITY_ROLES)[number];
  hourlyRatePreference: string;
  bio: string;
};

// Venue types - exported for use in VenueProfileForm
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

export type OperatingHours = {
  [day: string]: {
    open?: string;
    close?: string;
    closed?: boolean;
  };
};

export type VenueOnboardingData = {
  venueName: string;
  liquorLicenseNumber: string;
  address: VenueAddress;
  operatingHours: OperatingHours;
};

/**
 * Onboarding State Machine States
 */
type OnboardingState = 
  | 'ROLE_SELECTION'
  | 'PERSONAL_DETAILS'
  | 'VENUE_DETAILS' // Step 2 for venues (after Personal Details)
  | 'DOCUMENT_VERIFICATION'
  | 'ROLE_EXPERIENCE'
  | 'PAYOUT_SETUP'
  | 'COMPLETED';

/**
 * Onboarding State Machine Actions
 */
type OnboardingAction =
  | { type: 'SELECT_ROLE'; role: 'professional' | 'venue' }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'COMPLETE' }
  | { type: 'SKIP_DOCUMENTS' }
  | { type: 'UNSKIP_DOCUMENTS' }
  | { type: 'SKIP_PAYOUT' }
  | { type: 'UNSKIP_PAYOUT' }
  | { type: 'INITIALIZE_FROM_SESSION'; role?: 'professional' | 'venue' | 'hub' }
  | { type: 'INITIALIZE_FROM_STORAGE'; payload: { state: OnboardingState; selectedRole: 'professional' | 'venue' | null; formData: StaffOnboardingData; venueFormData: VenueOnboardingData } };

/**
 * Onboarding State Machine Context
 */
interface OnboardingContext {
  state: OnboardingState;
  selectedRole: 'professional' | 'venue' | null;
  stepIndex: number; // Maps state to step number for UI
  documentsSkipped: boolean;
  payoutSkipped: boolean;
  isWaitlistOnly: boolean; // True if in waitlist-only flow (bypasses user.id checks for step 0->1)
}

/**
 * State Machine: Maps state to step index
 */
const stateToStepIndex: Record<OnboardingState, number> = {
  'ROLE_SELECTION': 0,
  'PERSONAL_DETAILS': 1,
  'VENUE_DETAILS': 2, // Step 2 for venues
  'DOCUMENT_VERIFICATION': 2, // Step 2 for professionals (same index, different state)
  'ROLE_EXPERIENCE': 3,
  'PAYOUT_SETUP': 4,
  'COMPLETED': 5,
};

/**
 * State Machine: Maps step index to state
 */
// Note: Step 2 can be either VENUE_DETAILS (for venues) or DOCUMENT_VERIFICATION (for professionals)
// This is determined by selectedRole in the reducer
const stepIndexToState: Record<number, OnboardingState> = {
  0: 'ROLE_SELECTION',
  1: 'PERSONAL_DETAILS',
  2: 'DOCUMENT_VERIFICATION', // Default, but can be VENUE_DETAILS for venues
  3: 'ROLE_EXPERIENCE',
  4: 'PAYOUT_SETUP',
  5: 'COMPLETED',
};

/**
 * Onboarding State Machine Reducer
 */
function onboardingReducer(
  context: OnboardingContext,
  action: OnboardingAction
): OnboardingContext {
  switch (action.type) {
    case 'SELECT_ROLE':
      return {
        ...context,
        selectedRole: action.role,
      };

    case 'NEXT':
      // Transition from ROLE_SELECTION to PERSONAL_DETAILS requires role to be set
      if (context.state === 'ROLE_SELECTION') {
        if (!context.selectedRole) {
          // Invalid transition - role must be selected first
          return context;
        }
        if (context.selectedRole === 'venue') {
          // Venue onboarding redirects to hub - handled by component
          return context;
        }
        // Valid transition: professional role selected -> move to PERSONAL_DETAILS
        console.log('[Onboarding FSM] Transitioning ROLE_SELECTION -> PERSONAL_DETAILS', {
          selectedRole: context.selectedRole,
          newStepIndex: 1
        });
        return {
          ...context,
          state: 'PERSONAL_DETAILS',
          stepIndex: 1,
        };
      }

      // Transition from PERSONAL_DETAILS: venues go to VENUE_DETAILS, professionals go to DOCUMENT_VERIFICATION
      if (context.state === 'PERSONAL_DETAILS') {
        if (context.selectedRole === 'venue') {
          console.log('[Onboarding FSM] Transitioning PERSONAL_DETAILS -> VENUE_DETAILS', {
            selectedRole: context.selectedRole,
            newStepIndex: 2
          });
          return {
            ...context,
            state: 'VENUE_DETAILS',
            stepIndex: 2,
          };
        } else {
          // Professional flow: PERSONAL_DETAILS -> DOCUMENT_VERIFICATION
          return {
            ...context,
            state: 'DOCUMENT_VERIFICATION',
            stepIndex: 2,
          };
        }
      }

      // Transition from VENUE_DETAILS: venues go to ROLE_EXPERIENCE (venue-specific questions)
      if (context.state === 'VENUE_DETAILS') {
        return {
          ...context,
          state: 'ROLE_EXPERIENCE',
          stepIndex: 3,
        };
      }

      // Transition from ROLE_EXPERIENCE: venues go to PAYOUT_SETUP, professionals go to PAYOUT_SETUP
      if (context.state === 'ROLE_EXPERIENCE') {
        return {
          ...context,
          state: 'PAYOUT_SETUP',
          stepIndex: 4,
        };
      }

      // Transition from PAYOUT_SETUP: go to COMPLETED
      if (context.state === 'PAYOUT_SETUP') {
        return {
          ...context,
          state: 'COMPLETED',
          stepIndex: 5,
        };
      }

      // Other state transitions
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
        {
          const prevStep = context.stepIndex - 1;
          // Handle venue flow: VENUE_DETAILS -> PERSONAL_DETAILS
          if (context.state === 'VENUE_DETAILS') {
            return {
              ...context,
              state: 'PERSONAL_DETAILS',
              stepIndex: 1,
            };
          }
          // Handle professional flow: DOCUMENT_VERIFICATION -> PERSONAL_DETAILS
          if (context.state === 'DOCUMENT_VERIFICATION' && context.selectedRole === 'professional') {
            return {
              ...context,
              state: 'PERSONAL_DETAILS',
              stepIndex: 1,
            };
          }
          return {
            ...context,
            state: stepIndexToState[prevStep],
            stepIndex: prevStep,
          };
        }
      }
      return context;

    case 'COMPLETE':
      return {
        ...context,
        state: 'COMPLETED',
        stepIndex: TOTAL_STEPS,
      };

    case 'SKIP_DOCUMENTS':
      return {
        ...context,
        documentsSkipped: true,
      };

    case 'UNSKIP_DOCUMENTS':
      return {
        ...context,
        documentsSkipped: false,
      };

    case 'SKIP_PAYOUT':
      return {
        ...context,
        payoutSkipped: true,
      };

    case 'UNSKIP_PAYOUT':
      return {
        ...context,
        payoutSkipped: false,
      };

    case 'INITIALIZE_FROM_SESSION':
      if (action.role === 'hub') {
        // Redirect handled by component
        return context;
      }
      if (action.role === 'professional') {
        return {
          ...context,
          selectedRole: 'professional',
          state: 'PERSONAL_DETAILS',
          stepIndex: 1,
          isWaitlistOnly: true, // Waitlist flow bypasses user.id checks
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

// Storage utility functions
const saveToStorage = (payload: Omit<OnboardingStoragePayload, 'timestamp'>) => {
  if (typeof window === 'undefined') return;
  try {
    const storagePayload: OnboardingStoragePayload = {
      ...payload,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storagePayload));
  } catch (error) {
    console.error('[Onboarding] Failed to save to storage:', error);
  }
};

const loadFromStorage = (): OnboardingStoragePayload | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const payload: OnboardingStoragePayload = JSON.parse(stored);
    
    // Validate timestamp (must be less than 24 hours old)
    const now = Date.now();
    const age = now - payload.timestamp;
    if (age > STORAGE_TTL_MS) {
      console.log('[Onboarding] Storage data expired, clearing...');
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    return payload;
  } catch (error) {
    console.error('[Onboarding] Failed to load from storage:', error);
    // Clear corrupted data
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore cleanup errors
    }
    return null;
  }
};

const clearStorage = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[Onboarding] Failed to clear storage:', error);
  }
};

export default function Onboarding() {
  const { user, refreshUser, isAuthenticated, isAuthReady, isLoading, token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isSynced, isPolling } = useUserSync({ enabled: true });

  // Initialize state machine
  const [machineContext, dispatch] = useReducer(onboardingReducer, {
    state: 'ROLE_SELECTION',
    selectedRole: null,
    stepIndex: 0,
    documentsSkipped: false,
    payoutSkipped: false,
    isWaitlistOnly: false,
  });


  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [isVerifyingUser, setIsVerifyingUser] = useState(true);

  const [formData, setFormData] = useState<StaffOnboardingData>(() => ({
    displayName: user?.displayName || user?.name || '',
    phone: user?.phone || '',
    location: user?.location || '',
    avatarUrl: user?.avatarUrl || user?.profileImage || '',
    hospitalityRole: (user?.hospitalityRole as HospitalityRole | '' | undefined) || '',
    hourlyRatePreference: user?.hourlyRatePreference != null ? String(user.hourlyRatePreference) : '',
    bio: user?.bio || '',
  }));

  // Venue onboarding data (for venue flow)
  const [venueFormData, setVenueFormData] = useState<VenueOnboardingData>(() => ({
    venueName: '',
    liquorLicenseNumber: '',
    address: {
      street: '',
      suburb: '',
      postcode: '',
      city: 'Brisbane',
      state: 'QLD',
      country: 'AU',
    },
    operatingHours: {},
  }));

  // Track if we've initialized from storage to prevent duplicate hydration
  const hasInitializedFromStorage = useRef(false);

  // Expose user state and isPolling on window for E2E testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.user = user;
      window.isPolling = isPolling;
    }
  }, [user, isPolling]);

  // Wait for auth to be ready and verify user exists in database before showing onboarding
  useEffect(() => {
    if (!isAuthReady) return;
    
    // Force session refresh if user is stale or missing
    const refreshSessionIfNeeded = async () => {
      if (!user && !isLoading && isAuthenticated) {
        console.log('[Onboarding] User object is null but authenticated, refreshing session...');
        try {
          await refreshUser();
        } catch (error) {
          console.error('[Onboarding] Failed to refresh session:', error);
        }
      }
    };
    
    refreshSessionIfNeeded();
    
    // If auth is ready but no user, redirect to login (unless in waitlist-only flow)
    if (!user && !isLoading && !machineContext.isWaitlistOnly) {
      // Give a small grace period for the user profile to load
      const timeout = setTimeout(() => {
        if (!user) {
          navigate('/login', { replace: true });
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }
    
    // User is verified, allow onboarding to proceed
    if (user && user.id) {
      setIsVerifyingUser(false);
    } else if (machineContext.isWaitlistOnly) {
      // In waitlist-only flow, allow proceeding without user.id
      setIsVerifyingUser(false);
    }
  }, [isAuthReady, isLoading, isAuthenticated, user, navigate, refreshUser, machineContext.isWaitlistOnly]);

  // Initialize from sessionStorage (waitlist flow)
  useEffect(() => {
    if (isVerifyingUser) return; // Don't process role preferences until user is verified
    
    // If user already has a role assigned, skip step 0 (role selection)
    if (user?.currentRole && user.currentRole !== 'professional' && machineContext.stepIndex === 0) {
      // User has a role (venue/business), skip to step 1 or navigate to hub
      if (user.currentRole === 'business' || user.roles?.includes('venue' as 'business') || user.roles?.includes('business')) {
        navigate('/onboarding/hub', { replace: true });
        return;
      }
      // For other roles, advance to step 1
      dispatch({ type: 'NEXT' });
      return;
    }
    
    const rolePreference = sessionStorage.getItem('signupRolePreference');
    if (rolePreference === 'hub') {
      sessionStorage.removeItem('signupRolePreference');
      navigate('/onboarding/hub', { replace: true });
    } else if (rolePreference === 'professional') {
      sessionStorage.removeItem('signupRolePreference');
      dispatch({ type: 'INITIALIZE_FROM_SESSION', role: 'professional' });
    }
  }, [navigate, isVerifyingUser, user, machineContext.stepIndex, dispatch]);

  // Save role to database when venue is selected
  useEffect(() => {
    if (isVerifyingUser || !user?.id) return;
    if (machineContext.selectedRole !== 'venue') return;
    
    // Check if role was already saved (prevent duplicate API calls)
    const roleSaveKey = `role_saved_${user.id}_venue`;
    if (sessionStorage.getItem(roleSaveKey)) return;
    
    const saveVenueRole = async () => {
      try {
        console.log('[Onboarding] Saving venue role to database...');
        const response = await apiRequest('POST', '/api/users/role', {
          role: 'venue' as 'business',
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText || `HTTP ${response.status}` };
          }
          throw new Error(errorData.message || 'Failed to save role');
        }
        
        // Mark as saved to prevent duplicate calls
        sessionStorage.setItem(roleSaveKey, 'true');
        
        // Refresh user state to get updated role
        await refreshUser();
        
        // Navigate to hub onboarding
        navigate('/onboarding/hub', { replace: true });
      } catch (error: unknown) {
        console.error('[Onboarding] Error saving venue role:', error);
        const errorMessage = error instanceof Error ? error.message : 'Please try again.';
        toast({
          title: 'Could not save role',
          description: errorMessage,
          variant: 'destructive'
        });
      }
    };
    
    saveVenueRole();
  }, [machineContext.selectedRole, user?.id, isVerifyingUser, navigate, refreshUser, toast]);

  // Initialize from localStorage (persistence layer)
  useEffect(() => {
    if (isVerifyingUser) return; // Don't hydrate until user is verified
    if (hasInitializedFromStorage.current) return; // Only hydrate once
    
    // Don't hydrate if we're already in COMPLETED state
    if (machineContext.state === 'COMPLETED') {
      clearStorage();
      return;
    }
    
    // Only hydrate if we're in ROLE_SELECTION with no selected role (fresh start)
    // This ensures we don't override any existing progress
    if (machineContext.state === 'ROLE_SELECTION' && !machineContext.selectedRole) {
      const stored = loadFromStorage();
      if (stored && stored.state !== 'ROLE_SELECTION') {
        // Only hydrate if we have meaningful progress (not just role selection)
        hasInitializedFromStorage.current = true;
        
        // Restore state machine context
        dispatch({ 
          type: 'INITIALIZE_FROM_STORAGE', 
          payload: {
            state: stored.state,
            selectedRole: stored.selectedRole,
            formData: stored.formData,
            venueFormData: stored.venueFormData,
          }
        });
        
        // Restore form data
        setFormData(stored.formData);
        setVenueFormData(stored.venueFormData);
        
        // Show toast notification
        toast({
          title: 'Resuming your progress',
          description: 'We\'ve restored your onboarding progress.',
          variant: 'default',
        });
        
        console.log('[Onboarding] Hydrated from storage:', {
          state: stored.state,
          selectedRole: stored.selectedRole,
        });
      }
    }
  }, [isVerifyingUser, machineContext.state, machineContext.selectedRole, toast]);

  // Save to storage whenever machineContext or form data changes
  useEffect(() => {
    // Don't save if we're in ROLE_SELECTION with no role selected (fresh start)
    if (machineContext.state === 'ROLE_SELECTION' && !machineContext.selectedRole) {
      return;
    }
    
    // Don't save if we're in COMPLETED state (will be cleared separately)
    if (machineContext.state === 'COMPLETED') {
      return;
    }
    
    // Save current state to storage
    saveToStorage({
      state: machineContext.state,
      selectedRole: machineContext.selectedRole,
      formData,
      venueFormData,
    });
  }, [machineContext.state, machineContext.selectedRole, formData, venueFormData]);

  // Clear storage when reaching COMPLETED state
  useEffect(() => {
    if (machineContext.state === 'COMPLETED') {
      clearStorage();
      console.log('[Onboarding] Cleared storage on completion');
    }
  }, [machineContext.state]);

  const hasInitializedFromUser = useRef(false);
  useEffect(() => {
    if (!user) return;
    if (hasInitializedFromUser.current) return;
    hasInitializedFromUser.current = true;
    setFormData((prev) => ({
      ...prev,
      displayName: user.displayName || user.name || prev.displayName,
      phone: user.phone || prev.phone,
      location: user.location || prev.location,
      avatarUrl: user.avatarUrl || user.profileImage || prev.avatarUrl,
      hospitalityRole: (user.hospitalityRole as HospitalityRole | '' | undefined) || prev.hospitalityRole,
      hourlyRatePreference: user.hourlyRatePreference != null ? String(user.hourlyRatePreference) : prev.hourlyRatePreference,
      bio: user.bio || prev.bio,
    }));
  }, [user]);

  // Expose user state and isPolling on window for E2E testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.user = user;
      window.isPolling = isPolling;
    }
  }, [user, isPolling]);

  const rsaUploaded = Boolean(user?.profile?.rsa_cert_url || user?.rsaCertificateUrl);
  const idUploaded = Boolean(user?.profile?.id_document_url);

  const progressPct = useMemo(() => {
    if (machineContext.stepIndex === 0) return 0;
    return Math.round((machineContext.stepIndex / (TOTAL_STEPS - 1)) * 100);
  }, [machineContext.stepIndex]);

  const canProceed = useMemo(() => {
    switch (machineContext.state) {
      case 'ROLE_SELECTION':
        return machineContext.selectedRole !== null;
      case 'PERSONAL_DETAILS':
        return formData.displayName.trim().length > 0 && formData.phone.trim().length > 0 && formData.location.trim().length > 0;
      case 'VENUE_DETAILS':
        // Validation handled in VenueProfileForm component
        return venueFormData.venueName.trim().length > 0 && 
               venueFormData.address.postcode.trim().length > 0 &&
               parseInt(venueFormData.address.postcode) >= 4000 &&
               parseInt(venueFormData.address.postcode) <= 4199;
      case 'DOCUMENT_VERIFICATION':
        return machineContext.documentsSkipped || (rsaUploaded && idUploaded);
      case 'ROLE_EXPERIENCE':
        // For venues, only require bio (venue description)
        if (machineContext.selectedRole === 'venue') {
          return formData.bio.trim().length > 0;
        }
        // For professionals, require role and bio
        return formData.hospitalityRole !== '' && formData.bio.trim().length > 0;
      case 'PAYOUT_SETUP':
        return true;
      default:
        return false;
    }
  }, [machineContext.state, machineContext.selectedRole, machineContext.documentsSkipped, formData.bio, formData.displayName, formData.hospitalityRole, formData.location, formData.phone, idUploaded, rsaUploaded, venueFormData]);

  const updateFormData = (updates: Partial<StaffOnboardingData>) => setFormData((prev) => ({ ...prev, ...updates }));
  const updateVenueFormData = (updates: Partial<VenueOnboardingData>) => setVenueFormData((prev) => ({ ...prev, ...updates }));

  const saveStepData = async () => {
    // In waitlist-only flow, allow saving without user.id for step 1
    if (!machineContext.isWaitlistOnly && !user?.id) {
      console.error('[Onboarding] saveStepData: User ID not found', { 
        hasUser: !!user, 
        userId: user?.id,
        currentStep: machineContext.stepIndex,
        isWaitlistOnly: machineContext.isWaitlistOnly,
      });
      throw new Error('User session not available. Please refresh the page.');
    }
    
    try {
      if (machineContext.state === 'PERSONAL_DETAILS') {
        // Only save if user.id exists (waitlist flow may not have user yet)
        if (user?.id) {
          await apiRequest('PUT', '/api/me', { 
            displayName: formData.displayName, 
            phone: formData.phone, 
            location: formData.location, 
            avatarUrl: formData.avatarUrl || undefined 
          });
          await refreshUser();
        }
      }
      if (machineContext.state === 'VENUE_DETAILS') {
        if (!user?.id) {
          throw new Error('User session required for venue profile');
        }
        // Validate venue form data
        if (!venueFormData.venueName.trim()) {
          throw new Error('Venue name is required');
        }
        if (!venueFormData.address.street.trim() || !venueFormData.address.suburb.trim() || !venueFormData.address.postcode.trim()) {
          throw new Error('Please complete all address fields');
        }
        const postcode = parseInt(venueFormData.address.postcode);
        if (isNaN(postcode) || postcode < 4000 || postcode > 4199) {
          throw new Error('Postcode must be between 4000-4199 (Brisbane Metro)');
        }
        const hasHours = Object.values(venueFormData.operatingHours).some(
          (day) => day && (day.open || day.close || day.closed)
        );
        if (!hasHours) {
          throw new Error('Please set operating hours for at least one day');
        }
        // Save venue profile data - ONLY transition to COMPLETED after successful 201/200 response
        const response = await apiRequest('POST', '/api/onboarding/venue-profile', {
          venueName: venueFormData.venueName,
          liquorLicenseNumber: venueFormData.liquorLicenseNumber || undefined,
          address: venueFormData.address,
          operatingHours: venueFormData.operatingHours,
        });
        
        // Check response status - only proceed if 201 (created) or 200 (updated)
        if (!response.ok || (response.status !== 201 && response.status !== 200)) {
          const error = await response.json().catch(() => ({ message: 'Failed to create venue profile' }));
          throw new Error(error.message || 'Failed to create venue profile');
        }
        
        // Success: Refresh user data to pick up any updates
        await refreshUser();
        
        // Transition to ROLE_EXPERIENCE (next step) after successful venue profile save
        dispatch({ type: 'NEXT' });
      }
      if (machineContext.state === 'ROLE_EXPERIENCE') {
        if (!user?.id) {
          throw new Error('User session required for this step');
        }
        await apiRequest('PUT', '/api/me', { 
          hospitalityRole: formData.hospitalityRole || undefined, 
          hourlyRatePreference: formData.hourlyRatePreference || undefined, 
          bio: formData.bio || undefined 
        });
        await refreshUser();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStatus = (error as { status?: number })?.status;
      const errorResponse = (error as { response?: unknown })?.response;
      console.error('[Onboarding] Error saving step data:', {
        error: errorMessage,
        currentStep: machineContext.stepIndex,
        userId: user?.id,
        status: errorStatus,
        response: errorResponse
      });
      throw error; // Re-throw so handleNext can catch it
    }
  };

  const handleNext = async () => {
    if (!canProceed) return;
    if (machineContext.stepIndex >= TOTAL_STEPS - 1) return;
    
    // Check user.id for non-waitlist flows and non-role-selection steps
    if (!machineContext.isWaitlistOnly && machineContext.state !== 'ROLE_SELECTION' && !user?.id) {
      console.error('[Onboarding] User ID not found, attempting to refresh session...');
      toast({ 
        title: 'Session expired', 
        description: 'Please wait while we refresh your session...', 
        variant: 'destructive' 
      });
      try {
        await refreshUser();
        // If still no user after refresh, show error
        if (!user?.id) {
          toast({ 
            title: 'Authentication required', 
            description: 'Please sign in again to continue.', 
            variant: 'destructive' 
          });
          navigate('/login', { replace: true });
        }
      } catch (refreshError) {
        console.error('[Onboarding] Failed to refresh user:', refreshError);
        toast({ 
          title: 'Session error', 
          description: 'Please sign in again to continue.', 
          variant: 'destructive' 
        });
        navigate('/login', { replace: true });
      }
      return;
    }
    
    // Handle role selection transition
    if (machineContext.state === 'ROLE_SELECTION') {
      console.log('[Onboarding] Transitioning to Step 1', { 
        selectedRole: machineContext.selectedRole,
        canProceed,
        stepIndex: machineContext.stepIndex,
        state: machineContext.state
      });
      
      if (machineContext.selectedRole === 'venue') {
        navigate('/onboarding/hub', { replace: true });
        return;
      }
      
      // Dispatch NEXT action - FSM will transition to PERSONAL_DETAILS if role is set
      // This transition ONLY checks for selectedRole, not user.id or isVerifyingUser
      dispatch({ type: 'NEXT' });
      
      console.log('[Onboarding] Step 1 transition dispatched', {
        newState: 'PERSONAL_DETAILS',
        newStepIndex: 1
      });
      
      return;
    }
    
    // Steps 1+: Save data before proceeding
    setIsSavingStep(true);
    try {
      await saveStepData();
      // For VENUE_DETAILS, saveStepData already transitions to COMPLETED on success
      // For other states, transition to next step
      if (machineContext.state !== 'VENUE_DETAILS') {
        dispatch({ type: 'NEXT' });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      console.error('[Onboarding] Error saving step data:', error);
      toast({ 
        title: 'Could not save', 
        description: errorMessage, 
        variant: 'destructive' 
      });
    } finally {
      setIsSavingStep(false);
    }
  };

  const handleBack = () => {
    if (machineContext.stepIndex <= 0) return;
    dispatch({ type: 'BACK' });
  };

  const handleComplete = async () => {
    if (!machineContext.isWaitlistOnly && !user?.id) return;
    if (!canProceed) return;
    setIsSubmitting(true);
    try {
      await saveStepData();
      if (auth.currentUser) await auth.currentUser.getIdToken(true);
      
      // Handle venue vs professional completion
      if (machineContext.selectedRole === 'venue') {
        // Venue onboarding completion - venue profile already saved in VENUE_DETAILS step
        // Just mark as onboarded
        await apiRequest('POST', '/api/onboarding/complete', { 
          role: 'venue',
          displayName: formData.displayName, 
          phone: formData.phone, 
          bio: formData.bio || undefined, 
          location: formData.location, 
          avatarUrl: formData.avatarUrl || undefined 
        });
      } else {
        // Professional onboarding completion
        await apiRequest('POST', '/api/onboarding/complete', { 
          role: 'professional', 
          displayName: formData.displayName, 
          phone: formData.phone, 
          bio: formData.bio || undefined, 
          location: formData.location, 
          avatarUrl: formData.avatarUrl || undefined 
        });
      }
      
      // Force refresh token to get updated claims
      if (auth.currentUser) await auth.currentUser.getIdToken(true);
      // Refresh user data to get updated isOnboarded status
      await refreshUser();
      
      // Clear onboarding-related sessionStorage keys
      sessionStorage.removeItem('signupRolePreference');
      sessionStorage.removeItem('onboardingState');
      sessionStorage.removeItem('onboardingStep');
      
      // Clear persistence storage
      clearStorage();
      
      // Transition to COMPLETED state (shows success screen)
      dispatch({ type: 'COMPLETE' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete onboarding. Please try again.';
      console.error('Onboarding completion error:', error);
      toast({ title: 'Setup Failed', description: errorMessage, variant: 'destructive' });
      setIsSubmitting(false);
    }
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard', { replace: true });
  };

  const renderStep = () => {
    switch (machineContext.state) {
      case 'ROLE_SELECTION':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2" data-testid="onboarding-hub-heading">What brings you to HospoGo?</h2>
              <p className="text-gray-300">Select your role to get started</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                type="button" 
                onClick={() => {
                  // In waitlist-only flow, allow role selection without user.id
                  if (!machineContext.isWaitlistOnly && (!user || !user.id)) {
                    toast({ 
                      title: 'Please wait', 
                      description: 'Your profile is still loading. Please try again in a moment.', 
                      variant: 'destructive' 
                    });
                    return;
                  }
                  console.log('[Onboarding] Role selected: professional', {
                    currentState: machineContext.state,
                    currentStepIndex: machineContext.stepIndex,
                    selectedRole: machineContext.selectedRole
                  });
                  dispatch({ type: 'SELECT_ROLE', role: 'professional' });
                  console.log('[Onboarding] Role selection dispatched');
                }}
                disabled={!machineContext.isWaitlistOnly && (!user || !user.id || isPolling)}
                className={`flex flex-col items-center p-6 rounded-xl border-2 transition-all ${machineContext.selectedRole === 'professional' ? 'border-brand-neon bg-brand-neon/10 shadow-neon-realistic' : 'border-zinc-700 bg-zinc-800/50 hover:border-brand-neon/50'} ${(!machineContext.isWaitlistOnly && (!user || !user.id || isPolling)) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`p-4 rounded-full mb-4 ${machineContext.selectedRole === 'professional' ? 'bg-brand-neon text-black' : 'bg-zinc-700 text-white'}`}><User className="h-8 w-8" /></div>
                <h3 className={`text-lg font-semibold mb-2 ${machineContext.selectedRole === 'professional' ? 'text-brand-neon' : 'text-white'}`}>I'm looking for shifts</h3>
                <p className="text-sm text-gray-400 text-center">Pick up hospitality shifts and get paid</p>
              </button>
              <button 
                type="button" 
                onClick={() => {
                  if (!machineContext.isWaitlistOnly && (!user || !user.id)) {
                    toast({ 
                      title: 'Please wait', 
                      description: 'Your profile is still loading. Please try again in a moment.', 
                      variant: 'destructive' 
                    });
                    return;
                  }
                  // Set the role first
                  dispatch({ type: 'SELECT_ROLE', role: 'venue' });
                  // Automatically navigate to venue onboarding hub
                  navigate('/onboarding/hub', { replace: true });
                }}
                disabled={!machineContext.isWaitlistOnly && (!user || !user.id || isPolling)}
                className={`flex flex-col items-center p-6 rounded-xl border-2 transition-all ${machineContext.selectedRole === 'venue' ? 'border-brand-neon bg-brand-neon/10 shadow-neon-realistic' : 'border-zinc-700 bg-zinc-800/50 hover:border-brand-neon/50'} ${(!machineContext.isWaitlistOnly && (!user || !user.id || isPolling)) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`p-4 rounded-full mb-4 ${machineContext.selectedRole === 'venue' ? 'bg-brand-neon text-black' : 'bg-zinc-700 text-white'}`}><Building2 className="h-8 w-8" /></div>
                <h3 className={`text-lg font-semibold mb-2 ${machineContext.selectedRole === 'venue' ? 'text-brand-neon' : 'text-white'}`}>I need to fill shifts</h3>
                <p className="text-sm text-gray-400 text-center">Post shifts and find reliable staff</p>
              </button>
            </div>
          </div>
        );
      case 'PERSONAL_DETAILS':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Personal Details</h2>
              <p className="text-gray-300">Add your details and a professional profile photo.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2"><Label htmlFor="displayName" className="text-gray-300">Full Name *</Label><Input id="displayName" value={formData.displayName} onChange={(e) => updateFormData({ displayName: e.target.value })} placeholder="Enter your full name" data-testid="onboarding-display-name" /></div>
              <div className="space-y-2"><Label htmlFor="phone" className="text-gray-300">Phone Number *</Label><Input id="phone" type="tel" value={formData.phone} onChange={(e) => updateFormData({ phone: e.target.value })} placeholder="Enter your phone number" data-testid="onboarding-phone" /></div>
              <div className="space-y-2"><Label htmlFor="location" className="text-gray-300">Location *</Label><LocationInput value={formData.location} onChange={(val) => updateFormData({ location: val })} placeholder="City/Suburb" data-testid="onboarding-location" /></div>
              {user && (<div className="space-y-2"><Label className="text-gray-300">Profile Photo</Label><ImageUpload currentImageUrl={formData.avatarUrl} onUploadComplete={(url) => updateFormData({ avatarUrl: url })} onUploadError={(error) => toast({ title: 'Upload failed', description: error.message || 'Failed to upload image.', variant: 'destructive' })} pathPrefix="users" entityId={user.id} fileName="avatar" shape="circle" maxSize={5 * 1024 * 1024} /></div>)}
            </div>
          </div>
        );
      case 'VENUE_DETAILS':
        return (
          <VenueProfileForm
            formData={venueFormData}
            updateFormData={updateVenueFormData}
          />
        );
      case 'DOCUMENT_VERIFICATION':
        return (
          <div className="space-y-6">
            <div className="text-center"><h2 className="text-2xl font-bold text-white mb-2">Document Verification</h2><p className="text-gray-300">To accept shifts, you'll need to verify your identity and credentials.</p></div>
            {!machineContext.documentsSkipped && (<div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4"><div className="flex items-start gap-3"><div className="rounded-full bg-brand-neon/20 p-2 mt-0.5"><SkipForward className="h-4 w-4 text-brand-neon" /></div><div className="flex-1"><h3 className="font-medium text-white mb-1">Want to explore first?</h3><p className="text-sm text-gray-400 mb-3">Skip this step and upload your documents later from your profile settings.</p><Button type="button" variant="outline" onClick={() => dispatch({ type: 'SKIP_DOCUMENTS' })} className="border-zinc-600 hover:bg-zinc-700"><SkipForward className="h-4 w-4 mr-2" />Skip for now</Button></div></div></div>)}
            {machineContext.documentsSkipped ? (<div className="space-y-4"><Alert className="bg-green-900/30 border-green-500/50"><AlertCircle className="h-4 w-4 text-green-500" /><AlertDescription className="text-green-200">No problem! You can upload your documents anytime from <span className="font-semibold">Settings → Verification</span>.</AlertDescription></Alert><Button type="button" variant="ghost" onClick={() => dispatch({ type: 'UNSKIP_DOCUMENTS' })} className="w-full text-gray-400 hover:text-white">Changed your mind? Upload documents now</Button></div>) : (<div className="space-y-4"><div className="text-center py-2"><p className="text-sm text-gray-500">— or upload now —</p></div><RSALocker /><GovernmentIDLocker /></div>)}
          </div>
        );
      case 'ROLE_EXPERIENCE':
        // Venue-specific content for venues, professional content for professionals
        if (machineContext.selectedRole === 'venue') {
          return (
            <div className="space-y-6 pb-12 md:pb-0">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Venue Information</h2>
                <p className="text-gray-300">Tell us about your venue's operations in Brisbane</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="venueBio" className="text-gray-300">Venue Description *</Label>
                  <Textarea 
                    id="venueBio" 
                    value={formData.bio} 
                    onChange={(e) => updateFormData({ bio: e.target.value })} 
                    placeholder="Describe your venue, atmosphere, and what makes it special in Brisbane..." 
                    rows={5} 
                    data-testid="venue-bio"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venueCapacity" className="text-gray-300">Venue Capacity (optional)</Label>
                  <Input 
                    id="venueCapacity" 
                    type="number"
                    value={formData.hourlyRatePreference} 
                    onChange={(e) => updateFormData({ hourlyRatePreference: e.target.value })} 
                    placeholder="e.g. 150" 
                    data-testid="venue-capacity"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                  <p className="text-xs text-gray-400">Approximate capacity for staffing planning</p>
                </div>
              </div>
            </div>
          );
        }
        // Professional content
        return (
          <div className="space-y-6 pb-12 md:pb-0">
            <div className="text-center"><h2 className="text-2xl font-bold text-white mb-2">Role & Experience</h2><p className="text-gray-300">Tell venues what kind of shifts you're looking for.</p></div>
            <div className="space-y-4">
              <div className="space-y-2"><Label className="text-gray-300">Primary Role *</Label><Select value={formData.hospitalityRole} onValueChange={(value) => updateFormData({ hospitalityRole: value as HospitalityRole | '' })}><SelectTrigger aria-label="Primary Role" data-testid="onboarding-role"><SelectValue placeholder="Select a role" /></SelectTrigger><SelectContent>{HOSPITALITY_ROLES.map((role) => (<SelectItem key={role} value={role}>{role}</SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="hourlyRatePreference" className="text-gray-300">Hourly Rate Preference (optional)</Label><Input id="hourlyRatePreference" inputMode="decimal" value={formData.hourlyRatePreference} onChange={(e) => updateFormData({ hourlyRatePreference: e.target.value })} placeholder="e.g. 38" data-testid="onboarding-rate" /></div>
              <div className="space-y-2"><Label htmlFor="bio" className="text-gray-300">Experience Summary *</Label><Textarea id="bio" value={formData.bio} onChange={(e) => updateFormData({ bio: e.target.value })} placeholder="Tell us about your hospitality experience (roles, venues, strengths)..." rows={5} data-testid="onboarding-bio" /></div>
            </div>
          </div>
        );
      case 'PAYOUT_SETUP':
        return (
          <div className="space-y-6">
            <div className="text-center"><h2 className="text-2xl font-bold text-white mb-2">Stripe Payout Setup</h2><p className="text-gray-300">Set up your payout account so you can get paid automatically.</p></div>
            {!machineContext.payoutSkipped && (<div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4"><div className="flex items-start gap-3"><div className="rounded-full bg-brand-neon/20 p-2 mt-0.5"><SkipForward className="h-4 w-4 text-brand-neon" /></div><div className="flex-1"><h3 className="font-medium text-white mb-1">Set up payouts later?</h3><p className="text-sm text-gray-400 mb-3">Skip this step and set up your bank account later from your profile settings.</p><Button type="button" variant="outline" onClick={() => dispatch({ type: 'SKIP_PAYOUT' })} className="border-zinc-600 hover:bg-zinc-700"><SkipForward className="h-4 w-4 mr-2" />Skip for now</Button></div></div></div>)}
            {machineContext.payoutSkipped ? (<div className="space-y-4"><Alert className="bg-green-900/30 border-green-500/50"><AlertCircle className="h-4 w-4 text-green-500" /><AlertDescription className="text-green-200">No problem! You can set up your payout account anytime from <span className="font-semibold">Settings → Payments</span>.</AlertDescription></Alert><Button type="button" variant="ghost" onClick={() => dispatch({ type: 'UNSKIP_PAYOUT' })} className="w-full text-gray-400 hover:text-white">Changed your mind? Set up payouts now</Button></div>) : (<div className="space-y-4"><div className="text-center py-2"><p className="text-sm text-gray-500">— or set up now —</p></div><div className="bg-white rounded-lg p-4"><PayoutSettings /></div></div>)}
          </div>
        );
      case 'COMPLETED':
        // This case is handled by the early return below
        return null;
      default:
        return null;
    }
  };

  // Format Brisbane time for success screen
  const formatBrisbaneTime = (): string => {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-AU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Australia/Brisbane',
      });
      return `${formatter.format(now)} AEST`;
    } catch {
      return new Date().toLocaleString();
    }
  };

  // Render completed state - show success screen with confetti
  if (machineContext.state === 'COMPLETED') {
    // Get venue name for venues, display name for professionals
    const displayName = machineContext.selectedRole === 'venue' 
      ? (venueFormData.venueName || formData.displayName || 'Venue')
      : (formData.displayName || user?.displayName || 'User');
    
    return (
      <>
        <SEO title="Onboarding Complete" description="Welcome to HospoGo!" url="/onboarding" />
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
          <ConfettiAnimation />
          <div className="w-full max-w-2xl relative z-10">
            <Card className="card-chrome bg-zinc-900 border border-zinc-800">
              <CardContent className="pt-12 pb-12">
                <div className="text-center space-y-6">
                  {/* Success Animation */}
                  <div className="relative mx-auto w-24 h-24">
                    <div className="absolute inset-0 bg-brand-neon/20 rounded-full animate-ping" />
                    <div className="absolute inset-2 bg-brand-neon/40 rounded-full animate-pulse" />
                    <div className="relative flex items-center justify-center w-full h-full bg-brand-neon rounded-full">
                      <Building2 className="h-12 w-12 text-black" />
                    </div>
                  </div>

                  {/* Sparkles decoration */}
                  <div className="flex justify-center gap-2">
                    <Sparkles className="h-6 w-6 text-brand-neon animate-pulse" style={{ animationDelay: '0s' }} />
                    <Sparkles className="h-6 w-6 text-brand-neon animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <Sparkles className="h-6 w-6 text-brand-neon animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>

                  <div className="space-y-4">
                    <h1 className="text-4xl font-black text-brand-neon animate-steady-hum">
                      Welcome to the Valley
                    </h1>
                    <p className="text-2xl font-bold text-white">
                      {displayName}
                    </p>
                    <p className="text-lg text-gray-300">
                      Your profile is active and ready for Brisbane.
                    </p>
                    <p className="text-sm text-gray-400">
                      Activated on {formatBrisbaneTime()}
                    </p>
                  </div>

                  <div className="pt-6 space-y-4">
                    <Button
                      onClick={handleGoToDashboard}
                      variant="accent"
                      size="lg"
                      className="shadow-neon-realistic hover:shadow-[0_0_20px_rgba(186,255,57,1),0_0_40px_rgba(186,255,57,0.8),0_0_60px_rgba(186,255,57,0.6)] transition-all duration-300 text-lg px-8 py-6"
                      data-testid="onboarding-go-to-dashboard"
                    >
                      Enter Dashboard
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </Button>
                    <p className="text-sm text-gray-400">
                      Start posting shifts and connecting with Brisbane's hospitality community
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  // Check if there's a Firebase session (user might have signed in but profile not yet created)
  const hasFirebaseSession = !!auth.currentUser || !!token;
  
  // Show loader until:
  // 1. Auth is ready
  // 2. We have either a Firebase session OR user is authenticated
  // 3. For step 0, we need user to be fully synced with an ID before showing role selector (unless waitlist-only)
  // 4. For other steps, we can show content but guard against undefined user in handlers
  // Decouple isVerifyingUser from step transitions
  // For ROLE_SELECTION (step 0), allow UI to show even if user verification is pending
  // This enables waitlist flow and prevents UI lock during auth handshake
  // Only show loader if:
  // 1. Auth is not ready (required for all steps)
  // 2. No Firebase session AND not in ROLE_SELECTION (other steps need session)
  // 3. Not in ROLE_SELECTION AND (not synced OR no user.id OR polling) - other steps need full user sync
  // Don't show loader for COMPLETED state - show success screen instead
  const shouldShowLoader = (machineContext.state as OnboardingState) === 'COMPLETED' ? false : (
    !isAuthReady || 
    (!hasFirebaseSession && machineContext.state !== 'ROLE_SELECTION') ||
    (machineContext.state !== 'ROLE_SELECTION' && (!isSynced || !user?.id || isPolling))
  );

  if (shouldShowLoader) {
    return (
      <>
        <SEO title="Staff Onboarding" description="Complete your staff profile to start browsing shifts." url="/onboarding" />
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-brand-neon mx-auto" />
            <h2 className="text-xl font-semibold text-white">Preparing your HospoGo Workspace...</h2>
            <p className="text-gray-400">Setting up your account, just a moment</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <ErrorBoundary>
      <SEO title="Staff Onboarding" description="Complete your staff profile to start browsing shifts." url="/onboarding" />
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 pb-24 md:pb-4">
        <div className="w-full max-w-2xl">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">{machineContext.stepIndex === 0 ? 'Getting Started' : `Step ${machineContext.stepIndex} of ${TOTAL_STEPS - 1}`}</span>
              <span className="text-sm text-gray-400">{progressPct}% Complete</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2"><div className="bg-brand-neon h-2 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` } as React.CSSProperties} /></div>
          </div>
          <Card className="card-chrome bg-zinc-900 border border-zinc-800">
            <CardHeader><CardTitle className="text-center text-brand-neon animate-steady-hum">Welcome to HospoGo</CardTitle></CardHeader>
            <CardContent>
              {renderStep()}
              <div className="flex justify-between mt-8 pt-6 border-t border-zinc-800">
                <Button type="button" variant="outline" onClick={handleBack} disabled={machineContext.stepIndex === 0 || isSavingStep || isSubmitting} className="steel" data-testid="onboarding-back"><ChevronLeft className="h-4 w-4 mr-2" />Back</Button>
                {machineContext.state === 'PAYOUT_SETUP' ? (
                  <Button 
                    type="button" 
                    onClick={handleComplete} 
                    disabled={!canProceed || isSubmitting || (!machineContext.isWaitlistOnly && !user?.id)} 
                    variant="accent" 
                    className="shadow-neon-realistic hover:shadow-[0_0_8px_rgba(186,255,57,1),0_0_20px_rgba(186,255,57,0.6),0_0_35px_rgba(186,255,57,0.3)] transition-shadow duration-300" 
                    data-testid="onboarding-complete"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Completing...
                      </>
                    ) : (
                      <>
                        Complete Onboarding
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                ) : machineContext.stepIndex < TOTAL_STEPS - 1 && (machineContext.state as OnboardingState) !== 'COMPLETED' ? (
                  <Button 
                    type="button" 
                    onClick={handleNext} 
                    disabled={!canProceed || isSavingStep || (!machineContext.isWaitlistOnly && !user?.id)} 
                    variant="accent" 
                    className="shadow-neon-realistic hover:shadow-[0_0_8px_rgba(186,255,57,1),0_0_20px_rgba(186,255,57,0.6),0_0_35px_rgba(186,255,57,0.3)] transition-shadow duration-300" 
                    data-testid="onboarding-next"
                  >
                    {isSavingStep ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {machineContext.state === 'VENUE_DETAILS' ? 'Creating Profile...' : 'Saving...'}
                      </>
                    ) : (
                      <>
                        {machineContext.state === 'VENUE_DETAILS' ? 'Create Venue Profile' : 'Next'}
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
}
