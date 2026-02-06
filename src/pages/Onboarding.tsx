import { SEO } from '@/components/seo/SEO';
import { useToast } from '@/hooks/useToast';
import { useOnboardingForm } from '@/hooks/useOnboardingForm';
import { HOSPITALITY_ROLES } from '@/utils/hospitality';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VenueProfileForm } from '@/components/onboarding/VenueProfileForm';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { RoleSelectionStep } from '@/components/onboarding/steps/RoleSelectionStep';
import { PersonalDetailsStep } from '@/components/onboarding/steps/PersonalDetailsStep';
import { DocumentVerificationStep } from '@/components/onboarding/steps/DocumentVerificationStep';
import { RoleExperienceStep } from '@/components/onboarding/steps/RoleExperienceStep';
import { PayoutSetupStep } from '@/components/onboarding/steps/PayoutSetupStep';
import { OnboardingCompletionScreen } from '@/components/onboarding/OnboardingCompletionScreen';
import { OnboardingLoadingScreen } from '@/components/onboarding/OnboardingLoadingScreen';
import type { OnboardingState } from '@/types/onboarding';

export default function Onboarding() {
  const { toast } = useToast();
  const {
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
  } = useOnboardingForm();

  const renderStep = () => {
    switch (machineContext.state) {
      case 'ROLE_SELECTION':
        return (
          <RoleSelectionStep
            selectedRole={machineContext.selectedRole}
            isSelectionEnabled={isRoleSelectionEnabled}
            onSelectProfessional={handleSelectProfessional}
            onSelectVenue={handleSelectVenue}
          />
        );
      case 'PERSONAL_DETAILS':
        return (
          <PersonalDetailsStep
            formData={formData}
            userId={user?.id}
            onUpdate={updateFormData}
            onUploadError={(error) =>
              toast({
                title: 'Upload failed',
                description: error.message || 'Failed to upload image.',
                variant: 'destructive',
              })
            }
          />
        );
      case 'VENUE_DETAILS':
        return <VenueProfileForm formData={venueFormData} updateFormData={updateVenueFormData} />;
      case 'DOCUMENT_VERIFICATION':
        return (
          <DocumentVerificationStep
            documentsSkipped={machineContext.documentsSkipped}
            onSkip={() => dispatch({ type: 'SKIP_DOCUMENTS' })}
            onUnskip={() => dispatch({ type: 'UNSKIP_DOCUMENTS' })}
          />
        );
      case 'ROLE_EXPERIENCE':
        return (
          <RoleExperienceStep
            selectedRole={machineContext.selectedRole}
            formData={formData}
            roles={HOSPITALITY_ROLES}
            onUpdate={updateFormData}
          />
        );
      case 'PAYOUT_SETUP':
        return (
          <PayoutSetupStep
            payoutSkipped={machineContext.payoutSkipped}
            onSkip={() => dispatch({ type: 'SKIP_PAYOUT' })}
            onUnskip={() => dispatch({ type: 'UNSKIP_PAYOUT' })}
          />
        );
      case 'COMPLETED':
        return null;
      default:
        return null;
    }
  };

  if (machineContext.state === 'COMPLETED') {
    const displayName =
      machineContext.selectedRole === 'venue'
        ? venueFormData.venueName || formData.displayName || 'Venue'
        : formData.displayName || user?.displayName || 'User';

    return (
      <OnboardingCompletionScreen
        displayName={displayName}
        formattedTime={formatBrisbaneTime()}
        onGoToDashboard={handleGoToDashboard}
      />
    );
  }

  if (shouldShowLoader) {
    return <OnboardingLoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <SEO
        title="Staff Onboarding"
        description="Complete your staff profile to start browsing shifts."
        url="/onboarding"
      />
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 pb-24 md:pb-4">
        <div className="w-full max-w-2xl">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">
                {machineContext.stepIndex === 0 ? 'Getting Started' : `Step ${machineContext.stepIndex} of 4`}
              </span>
              <span className="text-sm text-gray-400">{progressPct}% Complete</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2">
              <div
                className="bg-brand-neon h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` } as React.CSSProperties}
              />
            </div>
          </div>
          {storageWarning && (
            <Alert className="mb-4 bg-yellow-500/10 border-yellow-500/20">
              <ShieldAlert className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-yellow-500 text-sm">
                <strong>Privacy Mode Active:</strong> Your browser is blocking storage. Your progress
                will be saved temporarily but may be lost if you close this tab.
              </AlertDescription>
            </Alert>
          )}
          <Card className="card-chrome bg-zinc-900 border border-zinc-800">
            <CardHeader>
              <CardTitle className="text-center text-brand-neon animate-steady-hum">
                Welcome to HospoGo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderStep()}
              <div className="flex justify-between mt-8 pt-6 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={machineContext.stepIndex === 0 || isSavingStep || isSubmitting}
                  className="steel"
                  data-testid="onboarding-back"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                {machineContext.state === 'PAYOUT_SETUP' ? (
                  <Button
                    type="button"
                    onClick={handleComplete}
                    disabled={
                      !canProceed ||
                      isSubmitting ||
                      isSavingStep ||
                      !hasFirebaseUser
                    }
                    variant="accent"
                    className="shadow-neon-realistic hover:shadow-[0_0_8px_rgba(186,255,57,1),0_0_20px_rgba(186,255,57,0.6),0_0_35px_rgba(186,255,57,0.3)] transition-shadow duration-300"
                    data-testid="onboarding-complete"
                  >
                    {isSubmitting || isSavingStep ? (
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
                ) : machineContext.stepIndex < 4 && (machineContext.state as OnboardingState) !== 'COMPLETED' ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={
                      !canProceed ||
                      isSavingStep ||
                      isSubmitting ||
                      (machineContext.state !== 'ROLE_SELECTION' && !hasFirebaseUser)
                    }
                    variant="accent"
                    className="shadow-neon-realistic hover:shadow-[0_0_8px_rgba(186,255,57,1),0_0_20px_rgba(186,255,57,0.6),0_0_35px_rgba(186,255,57,0.3)] transition-shadow duration-300"
                    data-testid="onboarding-next"
                  >
                    {isSavingStep || isSubmitting ? (
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
