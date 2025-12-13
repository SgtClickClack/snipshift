import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/image-upload';
import { LocationInput } from '@/components/ui/location-input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ChevronLeft, ChevronRight, Scissors, Building2, GraduationCap, Briefcase } from 'lucide-react';
import { SEO } from '@/components/seo/SEO';
import { getDashboardRoute } from '@/lib/roles';

type OnboardingRole = 'professional' | 'business' | 'trainer' | 'brand';

interface OnboardingData {
  role: OnboardingRole | null;
  displayName: string;
  phone: string;
  bio: string;
  location: string;
  avatarUrl: string;
}

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const { user, getToken } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<OnboardingData>({
    role: null,
    displayName: user?.displayName || user?.name || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    location: user?.location || '',
    avatarUrl: user?.avatarUrl || user?.profileImage || '',
  });
  const rolePreferenceSet = useRef(false);

  // Redirect if user has already completed onboarding
  useEffect(() => {
    if (user?.isOnboarded === true) {
      const dashboardRoute = user.currentRole ? getDashboardRoute(user.currentRole) : '/dashboard';
      navigate(dashboardRoute, { replace: true });
    }
  }, [user, navigate]);

  // Check for role preference from query params or sessionStorage
  useEffect(() => {
    // Only set role preference once
    if (rolePreferenceSet.current || formData.role) {
      return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get('role');
    
    // Map 'hub' to 'business' for onboarding (backend uses 'business')
    let preferredRole: OnboardingRole | null = null;
    if (roleParam === 'hub' || roleParam === 'business') {
      preferredRole = 'business';
    } else if (roleParam === 'professional') {
      preferredRole = 'professional';
    } else if (roleParam === 'trainer') {
      preferredRole = 'trainer';
    } else if (roleParam === 'brand') {
      preferredRole = 'brand';
    }
    
    // Also check sessionStorage (set by signup page)
    if (!preferredRole) {
      const storedRole = sessionStorage.getItem('signupRolePreference');
      if (storedRole === 'hub' || storedRole === 'business') {
        preferredRole = 'business';
      } else if (storedRole === 'professional') {
        preferredRole = 'professional';
      }
      // Clear it after reading
      if (storedRole) {
        sessionStorage.removeItem('signupRolePreference');
      }
    }
    
    // Pre-select the role if available
    if (preferredRole) {
      setFormData(prev => ({ ...prev, role: preferredRole }));
      rolePreferenceSet.current = true;
    }
  }, [formData.role]);

  const updateFormData = (updates: Partial<OnboardingData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.role !== null;
      case 2:
        return formData.displayName.trim().length > 0 && formData.phone.trim().length > 0;
      case 3:
        return formData.bio.trim().length > 0;
      case 4:
        return formData.location.trim().length > 0;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceed() && currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!canProceed() || !user) return;

    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await apiRequest('POST', '/api/onboarding/complete', {
        role: formData.role,
        displayName: formData.displayName,
        phone: formData.phone,
        bio: formData.bio,
        location: formData.location,
        avatarUrl: formData.avatarUrl || undefined,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to complete onboarding');
      }

      // Refresh user data to get updated isOnboarded flag
      if (user) {
        // Removed test bypass - E2E tests need to use proper authentication
        // Onboarding completion is handled by normal auth flow

        // Force a page reload to ensure auth context updates
        window.location.href = '/dashboard';
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast({
        title: 'Setup Failed',
        description: error.message || 'Failed to complete setup. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Choose Your Role</h2>
              <p className="text-gray-300">Tell us who you are</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => updateFormData({ role: 'professional' })}
                data-testid="button-select-professional"
                className={`p-6 rounded-lg border-2 transition-all ${
                  formData.role === 'professional'
                    ? 'border-red-accent bg-red-accent/10 shadow-lg'
                    : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600 hover:shadow-md'
                }`}
              >
                <div className="flex flex-col items-center space-y-4">
                  <div className={`p-4 rounded-full ${
                    formData.role === 'professional' ? 'bg-red-accent' : 'bg-zinc-700'
                  }`}>
                    <Scissors className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">I am a Barber</h3>
                  <p className="text-sm text-gray-300 text-center">
                    Looking for work opportunities and gigs
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => updateFormData({ role: 'business' })}
                data-testid="button-select-business"
                className={`p-6 rounded-lg border-2 transition-all ${
                  formData.role === 'business'
                    ? 'border-red-accent bg-red-accent/10 shadow-lg'
                    : 'border-steel-300 bg-card hover:border-steel-400 hover:shadow-md'
                }`}
              >
                <div className="flex flex-col items-center space-y-4">
                  <div className={`p-4 rounded-full ${
                    formData.role === 'business' ? 'bg-red-accent' : 'bg-zinc-700'
                  }`}>
                    <Building2 className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">I am a Shop Owner</h3>
                  <p className="text-sm text-gray-300 text-center">
                    Looking to hire barbers for my shop
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => updateFormData({ role: 'trainer' })}
                data-testid="button-select-trainer"
                className={`p-6 rounded-lg border-2 transition-all ${
                  formData.role === 'trainer'
                    ? 'border-red-accent bg-red-accent/10 shadow-lg'
                    : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600 hover:shadow-md'
                }`}
              >
                <div className="flex flex-col items-center space-y-4">
                  <div className={`p-4 rounded-full ${
                    formData.role === 'trainer' ? 'bg-red-accent' : 'bg-zinc-700'
                  }`}>
                    <GraduationCap className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">I am an Educator</h3>
                  <p className="text-sm text-gray-300 text-center">
                    Sharing knowledge and training the next generation
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => updateFormData({ role: 'brand' })}
                data-testid="button-select-brand"
                className={`p-6 rounded-lg border-2 transition-all ${
                  formData.role === 'brand'
                    ? 'border-red-accent bg-red-accent/10 shadow-lg'
                    : 'border-steel-300 bg-card hover:border-steel-400 hover:shadow-md'
                }`}
              >
                <div className="flex flex-col items-center space-y-4">
                  <div className={`p-4 rounded-full ${
                    formData.role === 'brand' ? 'bg-red-accent' : 'bg-zinc-700'
                  }`}>
                    <Briefcase className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">I represent a Brand</h3>
                  <p className="text-sm text-gray-300 text-center">
                    Managing products and sponsorships
                  </p>
                </div>
              </button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">The Basics</h2>
              <p className="text-gray-300">Let's start with your contact information</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-gray-300">
                  Display Name *
                </Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => updateFormData({ displayName: e.target.value })}
                  placeholder="Enter your display name"
                  className="w-full"
                  data-testid="input-display-name"
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
                  className="w-full"
                  data-testid="input-phone"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">First Impression</h2>
              <p className="text-gray-300">Add a photo and tell us about yourself</p>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-gray-300">Profile Picture</Label>
                {user && (
                  <ImageUpload
                    currentImageUrl={formData.avatarUrl}
                    onUploadComplete={(url) => updateFormData({ avatarUrl: url })}
                    onUploadError={(error) => {
                      toast({
                        title: 'Upload failed',
                        description: error.message || 'Failed to upload image.',
                        variant: 'destructive',
                      });
                    }}
                    pathPrefix="users"
                    entityId={user.id}
                    fileName="avatar"
                    shape="circle"
                    maxSize={5 * 1024 * 1024}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-gray-300">
                  Short Bio *
                </Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => updateFormData({ bio: e.target.value })}
                  placeholder="Tell us a bit about yourself..."
                  rows={4}
                  className="w-full"
                  data-testid="input-bio"
                />
                <p className="text-xs text-gray-400">
                  {formData.bio.length}/1000 characters
                </p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 pb-20 md:pb-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Location</h2>
              <p className="text-gray-300">Where are you located?</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location" className="text-gray-300">
                  City/Suburb *
                </Label>
                <LocationInput
                  value={formData.location}
                  onChange={(val) => updateFormData({ location: val })}
                  placeholder="Enter your city or suburb"
                  className="w-full"
                  data-testid="input-location"
                />
                <p className="text-xs text-gray-400">
                  This helps us show you relevant opportunities nearby
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <SEO
        title="Complete Your Profile"
        description="Finish setting up your SnipShift profile to start finding work opportunities or hiring talent."
        url="/onboarding"
      />
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 pb-24 md:pb-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">
              Step {currentStep} of {TOTAL_STEPS}
            </span>
            <span className="text-sm text-gray-400">
              {Math.round((currentStep / TOTAL_STEPS) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div
              className="bg-red-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* Main card */}
        <Card className="card-chrome bg-zinc-900 border border-zinc-800">
          <CardHeader>
            <CardTitle className="text-center text-white">
              Welcome to SnipShift
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderStepContent()}

            {/* Navigation buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={(e) => handleBack(e)}
                disabled={currentStep === 1}
                className="steel"
                data-testid="button-back"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              {currentStep < TOTAL_STEPS ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceed()}
                  variant="accent"
                  data-testid="button-next"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canProceed() || isSubmitting}
                  variant="accent"
                  data-testid="button-complete-setup"
                >
                  {isSubmitting ? 'Completing Setup...' : 'Complete Setup'}
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

