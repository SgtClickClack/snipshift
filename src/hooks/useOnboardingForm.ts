import { useEffect, useMemo, useRef, useState, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { useUserSync } from '@/hooks/useUserSync';
import { apiRequest } from '@/lib/queryClient';
import { auth } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import { safeGetItem, safeSetItem, safeRemoveItem, getStorageBlockedWarning } from '@/lib/safe-storage';
import {
  clearOnboardingStorage,
  loadOnboardingStorage,
  saveOnboardingStorage,
} from '@/utils/onboardingStorage';
import { onboardingReducer, TOTAL_STEPS } from '@/hooks/onboarding/onboardingReducer';
import type {
  OnboardingState,
  StaffOnboardingData,
  VenueOnboardingData,
} from '@/types/onboarding';
import type { HospitalityRole } from '@/utils/hospitality';

const getUserString = (value: unknown): string => (typeof value === 'string' ? value : '');

function extractErrorDiagnostic(error: unknown): { errorMessage: string; diagnosticMessage: string } {
  let errorMessage = 'Please try again.';
  let diagnosticMessage = '';

  if (error instanceof Error) {
    errorMessage = error.message;
    const statusMatch = error.message.match(/^\d+:\s*(.+)$/);
    if (statusMatch) {
      try {
        const errorData = JSON.parse(statusMatch[1]);
        diagnosticMessage = errorData.diagnostic || errorData.message || errorMessage;
        errorMessage = errorData.message || errorMessage;
      } catch {
        diagnosticMessage = errorMessage;
      }
    } else {
      diagnosticMessage = errorMessage;
    }
  }
  return { errorMessage, diagnosticMessage };
}

export function useOnboardingForm() {
  const { user, refreshUser, hasFirebaseUser, isLoading, token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isPolling } = useUserSync({ enabled: false });
  const userId = user?.id ?? null;
  const userCurrentRole = user?.currentRole ?? null;
  const userRolesKey = Array.isArray(user?.roles) ? user.roles.join('|') : '';

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
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  const [formData, setFormData] = useState<StaffOnboardingData>(() => ({
    displayName: getUserString(user?.displayName ?? user?.name),
    phone: getUserString(user?.phone),
    location: getUserString(user?.location),
    avatarUrl: getUserString(user?.avatarUrl ?? user?.profileImage),
    hospitalityRole: (user?.hospitalityRole as HospitalityRole | '' | undefined) || '',
    hourlyRatePreference: user?.hourlyRatePreference != null ? String(user.hourlyRatePreference) : '',
    bio: getUserString(user?.bio),
  }));

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

  const hasInitializedFromStorage = useRef(false);
  const hasInitializedFromUser = useRef(false);

  const profile = (user?.profile ?? {}) as {
    rsa_cert_url?: string;
    rsa_expiry?: string;
    rsaExpiry?: string;
    id_document_url?: string;
  };
  const rsaUploaded = Boolean(profile.rsa_cert_url || profile.rsaExpiry || profile.rsa_expiry || user?.rsaCertificateUrl);
  const idUploaded = Boolean(profile.id_document_url);

  useEffect(() => {
    const warning = getStorageBlockedWarning();
    if (warning) {
      setStorageWarning(warning);
      logger.warn('Onboarding', '[Onboarding] Browser storage is blocked - using memory fallback');
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const isE2EMode =
      typeof window !== 'undefined' &&
      (localStorage.getItem('E2E_MODE') === 'true' || import.meta.env.VITE_E2E === '1');
    const testUser =
      isE2EMode && typeof window !== 'undefined' ? sessionStorage.getItem('hospogo_test_user') : null;

    if (hasFirebaseUser) {
      setIsVerifyingUser(false);
      return;
    }

    if (isE2EMode && testUser) {
      try {
        const userData = JSON.parse(testUser);
        if (userData.id && userData.isOnboarded === false) {
          setIsVerifyingUser(false);
          return;
        }
      } catch {
        // ignore parse errors
      }
    }

    if (!token && !isLoading && !machineContext.isWaitlistOnly) {
      const timeout = setTimeout(() => {
        if (!token) navigate('/login', { replace: true });
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isLoading, hasFirebaseUser, token, navigate, machineContext.isWaitlistOnly]);

  useEffect(() => {
    if (isVerifyingUser) return;

    if (user?.currentRole && user.currentRole !== 'professional' && machineContext.stepIndex === 0) {
      if (
        user.currentRole === 'business' ||
        user.roles?.includes('venue' as 'business') ||
        user.roles?.includes('business')
      ) {
        navigate('/onboarding/hub', { replace: true });
        return;
      }
      dispatch({ type: 'NEXT' });
      return;
    }

    const rolePreference = safeGetItem('signupRolePreference', true);
    if (rolePreference === 'hub') {
      safeRemoveItem('signupRolePreference', true);
      navigate('/onboarding/hub', { replace: true });
    } else if (rolePreference === 'professional') {
      safeRemoveItem('signupRolePreference', true);
      dispatch({ type: 'INITIALIZE_FROM_SESSION', role: 'professional' });
    }
  }, [navigate, isVerifyingUser, userCurrentRole, userRolesKey, machineContext.stepIndex]);

  useEffect(() => {
    if (isVerifyingUser || !user?.id) return;
    if (machineContext.selectedRole !== 'venue') return;

    const roleSaveKey = `role_saved_${user.id}_venue`;
    if (safeGetItem(roleSaveKey, true)) return;

    const saveVenueRole = async () => {
      try {
        const response = await apiRequest('POST', '/api/onboarding/complete', {
          role: 'venue',
          displayName: user?.name || user?.email || 'Venue',
          phone: (user as { phone?: string })?.phone ?? '',
          location: (user as { location?: string })?.location ?? '',
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

        safeSetItem(roleSaveKey, 'true', true);
        await refreshUser();
        navigate('/onboarding/hub', { replace: true });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Please try again.';
        toast({
          title: 'Could not save role',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    };

    saveVenueRole();
  }, [machineContext.selectedRole, user?.id, isVerifyingUser, navigate, refreshUser, toast]);

  useEffect(() => {
    if (isVerifyingUser) return;
    if (hasInitializedFromStorage.current) return;
    if (machineContext.state === 'COMPLETED') {
      clearOnboardingStorage();
      return;
    }

    if (machineContext.state === 'ROLE_SELECTION' && !machineContext.selectedRole) {
      const stored = loadOnboardingStorage();
      if (stored && stored.state !== 'ROLE_SELECTION') {
        hasInitializedFromStorage.current = true;
        dispatch({
          type: 'INITIALIZE_FROM_STORAGE',
          payload: {
            state: stored.state,
            selectedRole: stored.selectedRole,
            formData: stored.formData,
            venueFormData: stored.venueFormData,
          },
        });
        setFormData(stored.formData);
        setVenueFormData(stored.venueFormData);
        toast({
          title: 'Resuming your progress',
          description: "We've restored your onboarding progress.",
          variant: 'default',
        });
      }
    }
  }, [isVerifyingUser, machineContext.state, machineContext.selectedRole, toast]);

  useEffect(() => {
    if (machineContext.state === 'ROLE_SELECTION' && !machineContext.selectedRole) return;
    if (machineContext.state === 'COMPLETED') return;

    saveOnboardingStorage({
      state: machineContext.state,
      selectedRole: machineContext.selectedRole,
      formData,
      venueFormData,
    });
  }, [machineContext.state, machineContext.selectedRole, formData, venueFormData]);

  useEffect(() => {
    if (machineContext.state === 'COMPLETED') {
      clearOnboardingStorage();
    }
  }, [machineContext.state]);

  useEffect(() => {
    if (!user) return;
    if (hasInitializedFromUser.current) return;
    hasInitializedFromUser.current = true;
    setFormData((prev) => ({
      ...prev,
      displayName: getUserString(user.displayName ?? user.name) || prev.displayName,
      phone: getUserString(user.phone) || prev.phone,
      location: getUserString(user.location) || prev.location,
      avatarUrl: getUserString(user.avatarUrl ?? user.profileImage) || prev.avatarUrl,
      hospitalityRole: (user.hospitalityRole as HospitalityRole | '' | undefined) || prev.hospitalityRole,
      hourlyRatePreference:
        user.hourlyRatePreference != null ? String(user.hourlyRatePreference) : prev.hourlyRatePreference,
      bio: getUserString(user.bio) || prev.bio,
    }));
  }, [userId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as { user?: unknown; isPolling?: boolean }).user = user;
      (window as { user?: unknown; isPolling?: boolean }).isPolling = isPolling;
    }
  }, [userId, isPolling]);

  const progressPct = useMemo(() => {
    if (machineContext.stepIndex === 0) return 0;
    return Math.round((machineContext.stepIndex / (TOTAL_STEPS - 1)) * 100);
  }, [machineContext.stepIndex]);

  const canProceed = useMemo(() => {
    switch (machineContext.state) {
      case 'ROLE_SELECTION':
        return machineContext.selectedRole !== null;
      case 'PERSONAL_DETAILS':
        return (
          formData.displayName.trim().length > 0 &&
          formData.phone.trim().length > 0 &&
          formData.location.trim().length > 0
        );
      case 'VENUE_DETAILS':
        return (
          venueFormData.venueName.trim().length > 0 &&
          venueFormData.address.postcode.trim().length > 0 &&
          parseInt(venueFormData.address.postcode) >= 4000 &&
          parseInt(venueFormData.address.postcode) <= 4199
        );
      case 'DOCUMENT_VERIFICATION':
        return machineContext.documentsSkipped || (rsaUploaded && idUploaded);
      case 'ROLE_EXPERIENCE':
        if (machineContext.selectedRole === 'venue') {
          return formData.bio.trim().length > 0;
        }
        return formData.hospitalityRole !== '' && formData.bio.trim().length > 0;
      case 'PAYOUT_SETUP':
        return true;
      default:
        return false;
    }
  }, [
    machineContext.state,
    machineContext.selectedRole,
    machineContext.documentsSkipped,
    formData.bio,
    formData.displayName,
    formData.hospitalityRole,
    formData.location,
    formData.phone,
    idUploaded,
    rsaUploaded,
    venueFormData,
  ]);

  const updateFormData = (updates: Partial<StaffOnboardingData>) =>
    setFormData((prev) => ({ ...prev, ...updates }));
  const updateVenueFormData = (updates: Partial<VenueOnboardingData>) =>
    setVenueFormData((prev) => ({ ...prev, ...updates }));

  const saveStepData = async () => {
    if (!token && !auth.currentUser) {
      throw new Error('Authentication required. Please sign in again.');
    }

    let idToken = token;
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      idToken = await firebaseUser.getIdToken(true);
    }

    if (!idToken) {
      throw new Error('Authentication token not available. Please sign in again.');
    }

    const firebaseUid = firebaseUser?.uid;
    if (!firebaseUid) {
      throw new Error('Firebase UID not available. Please sign in again.');
    }

    try {
      if (machineContext.state === 'PERSONAL_DETAILS') {
        const response = await apiRequest('POST', '/api/users', {
          displayName: formData.displayName,
          phone: formData.phone,
          location: formData.location,
          avatarUrl: formData.avatarUrl || undefined,
          firebase_uid: firebaseUid,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to create profile' }));
          throw new Error(errorData.message || 'Failed to create profile');
        }

        if (response.status === 201) {
          await refreshUser();
          navigate('/dashboard', { replace: true });
          return;
        }
        await refreshUser();
      }

      if (machineContext.state === 'VENUE_DETAILS') {
        if (!venueFormData.venueName.trim()) throw new Error('Venue name is required');
        if (
          !venueFormData.address.street.trim() ||
          !venueFormData.address.suburb.trim() ||
          !venueFormData.address.postcode.trim()
        ) {
          throw new Error('Please complete all address fields');
        }
        const postcode = parseInt(venueFormData.address.postcode);
        if (isNaN(postcode) || postcode < 4000 || postcode > 4199) {
          throw new Error('Postcode must be between 4000-4199 (Brisbane Metro)');
        }
        const hasHours = Object.values(venueFormData.operatingHours).some(
          (day) => day && (day.open || day.close || day.closed)
        );
        if (!hasHours) throw new Error('Please set operating hours for at least one day');

        const response = await apiRequest('POST', '/api/onboarding/venue-profile', {
          venueName: venueFormData.venueName,
          liquorLicenseNumber: venueFormData.liquorLicenseNumber || undefined,
          address: venueFormData.address,
          operatingHours: venueFormData.operatingHours,
        });

        if (!response.ok || (response.status !== 201 && response.status !== 200)) {
          const error = await response.json().catch(() => ({ message: 'Failed to create venue profile' }));
          throw new Error(error.message || 'Failed to create venue profile');
        }

        await refreshUser();
        dispatch({ type: 'NEXT' });
      }

      if (machineContext.state === 'ROLE_EXPERIENCE') {
        await apiRequest('PUT', '/api/me', {
          hospitalityRole: formData.hospitalityRole || undefined,
          hourlyRatePreference: formData.hourlyRatePreference || undefined,
          bio: formData.bio || undefined,
        });
        await refreshUser();
      }
    } catch (error: unknown) {
      const { errorMessage, diagnosticMessage } = extractErrorDiagnostic(error);
      console.error('[Onboarding] Error saving step data:', {
        error: errorMessage,
        diagnostic: diagnosticMessage,
        currentStep: machineContext.stepIndex,
        userId: user?.id,
      });
      throw error;
    }
  };

  const handleNext = async () => {
    if (!canProceed) return;
    if (machineContext.stepIndex >= TOTAL_STEPS - 1) return;

    if (machineContext.state !== 'ROLE_SELECTION' && !token && !auth.currentUser) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in again to continue.',
        variant: 'destructive',
      });
      navigate('/login', { replace: true });
      return;
    }

    if (machineContext.state === 'ROLE_SELECTION') {
      if (machineContext.selectedRole === 'venue') {
        navigate('/onboarding/hub', { replace: true });
        return;
      }
      dispatch({ type: 'NEXT' });
      return;
    }

    setIsSavingStep(true);
    try {
      await saveStepData();
      if (machineContext.state !== 'VENUE_DETAILS') {
        dispatch({ type: 'NEXT' });
      }
    } catch (error: unknown) {
      const { diagnosticMessage, errorMessage } = extractErrorDiagnostic(error);
      toast({
        title: 'Could not save',
        description: diagnosticMessage || errorMessage,
        variant: 'destructive',
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
    if (!canProceed) return;
    if (!token && !auth.currentUser) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in again to complete onboarding.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await saveStepData();
      if (auth.currentUser) await auth.currentUser.getIdToken(true);

      const completionResponse = await apiRequest('PUT', '/api/me', {
        hasCompletedOnboarding: true,
      });

      if (!completionResponse.ok) {
        const errorData = await completionResponse.json().catch(() => ({
          message: 'Failed to complete onboarding',
        }));
        throw new Error(errorData.message || 'Failed to complete onboarding');
      }

      if (auth.currentUser) await auth.currentUser.getIdToken(true);
      await refreshUser();

      safeRemoveItem('signupRolePreference', true);
      safeRemoveItem('onboardingState', true);
      safeRemoveItem('onboardingStep', true);
      clearOnboardingStorage();

      if (completionResponse.status === 201 || completionResponse.status === 200) {
        const targetPath =
          machineContext.selectedRole === 'venue'
            ? '/venue/dashboard?setup=complete'
            : '/dashboard?setup=complete';
        navigate(targetPath, { replace: true });
      }
    } catch (error: unknown) {
      const { diagnosticMessage, errorMessage } = extractErrorDiagnostic(error);
      toast({
        title: 'Setup Failed',
        description: diagnosticMessage || errorMessage,
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  const handleGoToDashboard = () => {
    const targetPath =
      machineContext.selectedRole === 'venue'
        ? '/venue/dashboard?setup=complete'
        : '/dashboard?setup=complete';
    navigate(targetPath, { replace: true });
  };

  const isRoleSelectionEnabled = hasFirebaseUser || machineContext.isWaitlistOnly;

  const handleSelectProfessional = () => {
    if (!isRoleSelectionEnabled) {
      toast({
        title: 'Please wait',
        description: 'Your authentication is still loading. Please try again in a moment.',
        variant: 'destructive',
      });
      return;
    }
    dispatch({ type: 'SELECT_ROLE', role: 'professional' });
  };

  const handleSelectVenue = () => {
    if (!isRoleSelectionEnabled) {
      toast({
        title: 'Please wait',
        description: 'Your authentication is still loading. Please try again in a moment.',
        variant: 'destructive',
      });
      return;
    }
    dispatch({ type: 'SELECT_ROLE', role: 'venue' });
    navigate('/onboarding/hub', { replace: true });
  };

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

  const shouldShowLoader =
    (machineContext.state as OnboardingState) === 'COMPLETED'
      ? false
      : !hasFirebaseUser && (isLoading || machineContext.state !== 'ROLE_SELECTION');

  return {
    machineContext,
    formData,
    venueFormData,
    user,
    hasFirebaseUser,
    progressPct,
    canProceed,
    isSubmitting,
    isSavingStep,
    storageWarning,
    shouldShowLoader,
    updateFormData,
    updateVenueFormData,
    handleNext,
    handleBack,
    handleComplete,
    handleGoToDashboard,
    handleSelectProfessional,
    handleSelectVenue,
    dispatch,
    formatBrisbaneTime,
    isRoleSelectionEnabled,
  };
}
