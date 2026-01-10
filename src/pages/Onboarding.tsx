import { useEffect, useMemo, useRef, useState } from 'react';
import { SEO } from '@/components/seo/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/image-upload';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { RSALocker } from '@/components/profile/RSALocker';
import { GovernmentIDLocker } from '@/components/profile/GovernmentIDLocker';
import PayoutSettings from '@/components/payments/payout-settings';
import { HOSPITALITY_ROLES } from '@/utils/hospitality';

const TOTAL_STEPS = 4;

type StaffOnboardingData = {
  displayName: string;
  phone: string;
  location: string;
  avatarUrl: string;
  hospitalityRole: '' | (typeof HOSPITALITY_ROLES)[number];
  hourlyRatePreference: string;
  bio: string;
};

export default function Onboarding() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingStep, setIsSavingStep] = useState(false);

  const [formData, setFormData] = useState<StaffOnboardingData>(() => ({
    displayName: user?.displayName || user?.name || '',
    phone: user?.phone || '',
    location: user?.location || '',
    avatarUrl: user?.avatarUrl || user?.profileImage || '',
    hospitalityRole: (user?.hospitalityRole as any) || '',
    hourlyRatePreference:
      user?.hourlyRatePreference != null ? String(user.hourlyRatePreference) : '',
    bio: user?.bio || '',
  }));

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
      hospitalityRole: (user.hospitalityRole as any) || prev.hospitalityRole,
      hourlyRatePreference:
        user.hourlyRatePreference != null ? String(user.hourlyRatePreference) : prev.hourlyRatePreference,
      bio: user.bio || prev.bio,
    }));
  }, [user]);

  const rsaUploaded = Boolean(user?.profile?.rsa_cert_url || user?.rsaCertificateUrl);
  const idUploaded = Boolean(user?.profile?.id_document_url);

  const progressPct = useMemo(() => {
    return Math.round((currentStep / TOTAL_STEPS) * 100);
  }, [currentStep]);

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1:
        return (
          formData.displayName.trim().length > 0 &&
          formData.phone.trim().length > 0 &&
          formData.location.trim().length > 0
        );
      case 2:
        return rsaUploaded && idUploaded;
      case 3:
        return formData.hospitalityRole !== '' && formData.bio.trim().length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  }, [currentStep, formData.bio, formData.displayName, formData.hospitalityRole, formData.location, formData.phone, idUploaded, rsaUploaded]);

  const updateFormData = (updates: Partial<StaffOnboardingData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const saveStepData = async () => {
    if (!user) return;

    // Step-specific persistence: use /api/me for incremental saves.
    if (currentStep === 1) {
      await apiRequest('PUT', '/api/me', {
        displayName: formData.displayName,
        phone: formData.phone,
        location: formData.location,
        avatarUrl: formData.avatarUrl || undefined,
      });
      await refreshUser();
    }

    if (currentStep === 3) {
      await apiRequest('PUT', '/api/me', {
        hospitalityRole: formData.hospitalityRole || undefined,
        hourlyRatePreference: formData.hourlyRatePreference || undefined,
        bio: formData.bio || undefined,
      });
      await refreshUser();
    }
  };

  const handleNext = async () => {
    if (!canProceed) return;
    if (currentStep >= TOTAL_STEPS) return;

    setIsSavingStep(true);
    try {
      await saveStepData();
      setCurrentStep((prev) => prev + 1);
    } catch (error: any) {
      toast({
        title: 'Could not save',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingStep(false);
    }
  };

  const handleBack = () => {
    if (currentStep <= 1) return;
    setCurrentStep((prev) => prev - 1);
  };

  const handleComplete = async () => {
    if (!user) return;
    if (!canProceed) return;

    setIsSubmitting(true);
    try {
      // Ensure latest step data is saved before completion.
      await saveStepData();

      const res = await apiRequest('POST', '/api/onboarding/complete', {
        role: 'professional',
        displayName: formData.displayName,
        phone: formData.phone,
        bio: formData.bio || undefined,
        location: formData.location,
        avatarUrl: formData.avatarUrl || undefined,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Failed to complete onboarding');
      }

      // Reload ensures AuthGuard + role routing pick up the updated flags.
      window.location.href = '/dashboard';
    } catch (error: any) {
      toast({
        title: 'Setup Failed',
        description: error?.message || 'Failed to complete onboarding. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Personal Details</h2>
              <p className="text-gray-300">Add your details and a professional profile photo.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-gray-300">
                  Full Name *
                </Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => updateFormData({ displayName: e.target.value })}
                  placeholder="Enter your full name"
                  data-testid="onboarding-display-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-300">
                  Phone Number *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateFormData({ phone: e.target.value })}
                  placeholder="Enter your phone number"
                  data-testid="onboarding-phone"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-gray-300">
                  Location *
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => updateFormData({ location: e.target.value })}
                  placeholder="City/Suburb"
                  data-testid="onboarding-location"
                />
              </div>

              {user ? (
                <div className="space-y-2">
                  <Label className="text-gray-300">Profile Photo</Label>
                  <ImageUpload
                    currentImageUrl={formData.avatarUrl}
                    onUploadComplete={(url) => updateFormData({ avatarUrl: url })}
                    onUploadError={(error) =>
                      toast({
                        title: 'Upload failed',
                        description: error.message || 'Failed to upload image.',
                        variant: 'destructive',
                      })
                    }
                    pathPrefix="users"
                    entityId={user.id}
                    fileName="avatar"
                    shape="circle"
                    maxSize={5 * 1024 * 1024}
                  />
                </div>
              ) : null}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Upload Documents</h2>
              <p className="text-gray-300">Upload your RSA certificate and government ID for verification.</p>
            </div>

            <div className="space-y-6">
              <RSALocker />
              <GovernmentIDLocker />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 pb-12 md:pb-0">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Role & Experience</h2>
              <p className="text-gray-300">Tell venues what kind of shifts you’re looking for.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Primary Role *</Label>
                <Select
                  value={formData.hospitalityRole}
                  onValueChange={(value) => updateFormData({ hospitalityRole: value as any })}
                >
                  <SelectTrigger aria-label="Primary Role" data-testid="onboarding-role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOSPITALITY_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hourlyRatePreference" className="text-gray-300">
                  Hourly Rate Preference (optional)
                </Label>
                <Input
                  id="hourlyRatePreference"
                  inputMode="decimal"
                  value={formData.hourlyRatePreference}
                  onChange={(e) => updateFormData({ hourlyRatePreference: e.target.value })}
                  placeholder="e.g. 38"
                  data-testid="onboarding-rate"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-gray-300">
                  Experience Summary *
                </Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => updateFormData({ bio: e.target.value })}
                  placeholder="Tell us about your hospitality experience (roles, venues, strengths)..."
                  rows={5}
                  data-testid="onboarding-bio"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Stripe Payout Setup</h2>
              <p className="text-gray-300">Set up your payout account so you can get paid automatically.</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <PayoutSettings />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <SEO title="Staff Onboarding" description="Complete your staff profile to start browsing shifts." url="/onboarding" />
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 pb-24 md:pb-4">
        <div className="w-full max-w-2xl">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">
                Step {currentStep} of {TOTAL_STEPS}
              </span>
              <span className="text-sm text-gray-400">{progressPct}% Complete</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2">
              <div
                className="bg-red-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <Card className="card-chrome bg-zinc-900 border border-zinc-800">
            <CardHeader>
              <CardTitle className="text-center text-white">Welcome to HospoGo</CardTitle>
            </CardHeader>
            <CardContent>
              {renderStep()}

              <div className="flex justify-between mt-8 pt-6 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1 || isSavingStep || isSubmitting}
                  className="steel"
                  data-testid="onboarding-back"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>

                {currentStep < TOTAL_STEPS ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceed || isSavingStep}
                    variant="accent"
                    data-testid="onboarding-next"
                  >
                    {isSavingStep ? 'Saving...' : 'Next'}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleComplete}
                    disabled={!canProceed || isSubmitting}
                    variant="accent"
                    data-testid="onboarding-complete"
                  >
                    {isSubmitting ? 'Completing...' : 'Complete Onboarding'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

