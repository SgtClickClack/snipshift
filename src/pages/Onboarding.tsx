import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components/seo/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
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
import { ChevronLeft, ChevronRight, SkipForward, AlertCircle, Building2, User } from 'lucide-react';
import { RSALocker } from '@/components/profile/RSALocker';
import { GovernmentIDLocker } from '@/components/profile/GovernmentIDLocker';
import PayoutSettings from '@/components/payments/payout-settings';
import { HOSPITALITY_ROLES } from '@/utils/hospitality';
import { Alert, AlertDescription } from '@/components/ui/alert';

const TOTAL_STEPS = 5;

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
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [documentsSkipped, setDocumentsSkipped] = useState(false);
  const [payoutSkipped, setPayoutSkipped] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'professional' | 'venue' | null>(null);

  useEffect(() => {
    const rolePreference = sessionStorage.getItem('signupRolePreference');
    if (rolePreference === 'hub') {
      sessionStorage.removeItem('signupRolePreference');
      navigate('/onboarding/hub', { replace: true });
    } else if (rolePreference === 'professional') {
      sessionStorage.removeItem('signupRolePreference');
      setSelectedRole('professional');
      setCurrentStep(1);
    }
  }, [navigate]);

  const [formData, setFormData] = useState<StaffOnboardingData>(() => ({
    displayName: user?.displayName || user?.name || '',
    phone: user?.phone || '',
    location: user?.location || '',
    avatarUrl: user?.avatarUrl || user?.profileImage || '',
    hospitalityRole: (user?.hospitalityRole as any) || '',
    hourlyRatePreference: user?.hourlyRatePreference != null ? String(user.hourlyRatePreference) : '',
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
      hourlyRatePreference: user.hourlyRatePreference != null ? String(user.hourlyRatePreference) : prev.hourlyRatePreference,
      bio: user.bio || prev.bio,
    }));
  }, [user]);

  const rsaUploaded = Boolean(user?.profile?.rsa_cert_url || user?.rsaCertificateUrl);
  const idUploaded = Boolean(user?.profile?.id_document_url);

  const progressPct = useMemo(() => {
    if (currentStep === 0) return 0;
    return Math.round((currentStep / (TOTAL_STEPS - 1)) * 100);
  }, [currentStep]);

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0: return selectedRole !== null;
      case 1: return formData.displayName.trim().length > 0 && formData.phone.trim().length > 0 && formData.location.trim().length > 0;
      case 2: return documentsSkipped || (rsaUploaded && idUploaded);
      case 3: return formData.hospitalityRole !== '' && formData.bio.trim().length > 0;
      case 4: return true;
      default: return false;
    }
  }, [currentStep, selectedRole, formData.bio, formData.displayName, formData.hospitalityRole, formData.location, formData.phone, idUploaded, rsaUploaded, documentsSkipped]);

  const updateFormData = (updates: Partial<StaffOnboardingData>) => setFormData((prev) => ({ ...prev, ...updates }));

  const saveStepData = async () => {
    if (!user) return;
    if (currentStep === 1) {
      await apiRequest('PUT', '/api/me', { displayName: formData.displayName, phone: formData.phone, location: formData.location, avatarUrl: formData.avatarUrl || undefined });
      await refreshUser();
    }
    if (currentStep === 3) {
      await apiRequest('PUT', '/api/me', { hospitalityRole: formData.hospitalityRole || undefined, hourlyRatePreference: formData.hourlyRatePreference || undefined, bio: formData.bio || undefined });
      await refreshUser();
    }
  };

  const handleNext = async () => {
    if (!canProceed) return;
    if (currentStep >= TOTAL_STEPS - 1) return;
    if (currentStep === 0) {
      if (selectedRole === 'venue') { navigate('/onboarding/hub', { replace: true }); return; }
      setCurrentStep(1);
      return;
    }
    setIsSavingStep(true);
    try {
      await saveStepData();
      setCurrentStep((prev) => prev + 1);
    } catch (error: any) {
      toast({ title: 'Could not save', description: error?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setIsSavingStep(false);
    }
  };

  const handleBack = () => { if (currentStep <= 0) return; setCurrentStep((prev) => prev - 1); };

  const handleComplete = async () => {
    if (!user) return;
    if (!canProceed) return;
    setIsSubmitting(true);
    try {
      await saveStepData();
      if (auth.currentUser) await auth.currentUser.getIdToken(true);
      await apiRequest('POST', '/api/onboarding/complete', { role: 'professional', displayName: formData.displayName, phone: formData.phone, bio: formData.bio || undefined, location: formData.location, avatarUrl: formData.avatarUrl || undefined });
      // Force refresh token to get updated claims
      if (auth.currentUser) await auth.currentUser.getIdToken(true);
      await refreshUser();
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      toast({ title: 'Setup Failed', description: error?.message || 'Failed to complete onboarding. Please try again.', variant: 'destructive' });
    setIsSubmitting(false);
    }
  };
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">What brings you to HospoGo?</h2>
              <p className="text-gray-300">Select your role to get started</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button type="button" onClick={() => setSelectedRole('professional')} className={`flex flex-col items-center p-6 rounded-xl border-2 transition-all ${selectedRole === 'professional' ? 'border-brand-neon bg-brand-neon/10 shadow-neon-realistic' : 'border-zinc-700 bg-zinc-800/50 hover:border-brand-neon/50'}`}>
                <div className={`p-4 rounded-full mb-4 ${selectedRole === 'professional' ? 'bg-brand-neon text-black' : 'bg-zinc-700 text-white'}`}><User className="h-8 w-8" /></div>
                <h3 className={`text-lg font-semibold mb-2 ${selectedRole === 'professional' ? 'text-brand-neon' : 'text-white'}`}>I'm looking for shifts</h3>
                <p className="text-sm text-gray-400 text-center">Pick up hospitality shifts and get paid</p>
              </button>
              <button type="button" onClick={() => setSelectedRole('venue')} className={`flex flex-col items-center p-6 rounded-xl border-2 transition-all ${selectedRole === 'venue' ? 'border-brand-neon bg-brand-neon/10 shadow-neon-realistic' : 'border-zinc-700 bg-zinc-800/50 hover:border-brand-neon/50'}`}>
                <div className={`p-4 rounded-full mb-4 ${selectedRole === 'venue' ? 'bg-brand-neon text-black' : 'bg-zinc-700 text-white'}`}><Building2 className="h-8 w-8" /></div>
                <h3 className={`text-lg font-semibold mb-2 ${selectedRole === 'venue' ? 'text-brand-neon' : 'text-white'}`}>I need to fill shifts</h3>
                <p className="text-sm text-gray-400 text-center">Post shifts and find reliable staff</p>
              </button>
            </div>
          </div>
        );
      case 1:
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
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center"><h2 className="text-2xl font-bold text-white mb-2">Document Verification</h2><p className="text-gray-300">To accept shifts, you'll need to verify your identity and credentials.</p></div>
            {!documentsSkipped && (<div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4"><div className="flex items-start gap-3"><div className="rounded-full bg-brand-neon/20 p-2 mt-0.5"><SkipForward className="h-4 w-4 text-brand-neon" /></div><div className="flex-1"><h3 className="font-medium text-white mb-1">Want to explore first?</h3><p className="text-sm text-gray-400 mb-3">Skip this step and upload your documents later from your profile settings.</p><Button type="button" variant="outline" onClick={() => setDocumentsSkipped(true)} className="border-zinc-600 hover:bg-zinc-700"><SkipForward className="h-4 w-4 mr-2" />Skip for now</Button></div></div></div>)}
            {documentsSkipped ? (<div className="space-y-4"><Alert className="bg-green-900/30 border-green-500/50"><AlertCircle className="h-4 w-4 text-green-500" /><AlertDescription className="text-green-200">No problem! You can upload your documents anytime from <span className="font-semibold">Settings - Verification</span>.</AlertDescription></Alert><Button type="button" variant="ghost" onClick={() => setDocumentsSkipped(false)} className="w-full text-gray-400 hover:text-white">Changed your mind? Upload documents now</Button></div>) : (<div className="space-y-4"><div className="text-center py-2"><p className="text-sm text-gray-500">- or upload now -</p></div><RSALocker /><GovernmentIDLocker /></div>)}
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 pb-12 md:pb-0">
            <div className="text-center"><h2 className="text-2xl font-bold text-white mb-2">Role & Experience</h2><p className="text-gray-300">Tell venues what kind of shifts you're looking for.</p></div>
            <div className="space-y-4">
              <div className="space-y-2"><Label className="text-gray-300">Primary Role *</Label><Select value={formData.hospitalityRole} onValueChange={(value) => updateFormData({ hospitalityRole: value as any })}><SelectTrigger aria-label="Primary Role" data-testid="onboarding-role"><SelectValue placeholder="Select a role" /></SelectTrigger><SelectContent>{HOSPITALITY_ROLES.map((role) => (<SelectItem key={role} value={role}>{role}</SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="hourlyRatePreference" className="text-gray-300">Hourly Rate Preference (optional)</Label><Input id="hourlyRatePreference" inputMode="decimal" value={formData.hourlyRatePreference} onChange={(e) => updateFormData({ hourlyRatePreference: e.target.value })} placeholder="e.g. 38" data-testid="onboarding-rate" /></div>
              <div className="space-y-2"><Label htmlFor="bio" className="text-gray-300">Experience Summary *</Label><Textarea id="bio" value={formData.bio} onChange={(e) => updateFormData({ bio: e.target.value })} placeholder="Tell us about your hospitality experience (roles, venues, strengths)..." rows={5} data-testid="onboarding-bio" /></div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center"><h2 className="text-2xl font-bold text-white mb-2">Stripe Payout Setup</h2><p className="text-gray-300">Set up your payout account so you can get paid automatically.</p></div>
            {!payoutSkipped && (<div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4"><div className="flex items-start gap-3"><div className="rounded-full bg-brand-neon/20 p-2 mt-0.5"><SkipForward className="h-4 w-4 text-brand-neon" /></div><div className="flex-1"><h3 className="font-medium text-white mb-1">Set up payouts later?</h3><p className="text-sm text-gray-400 mb-3">Skip this step and set up your bank account later from your profile settings.</p><Button type="button" variant="outline" onClick={() => setPayoutSkipped(true)} className="border-zinc-600 hover:bg-zinc-700"><SkipForward className="h-4 w-4 mr-2" />Skip for now</Button></div></div></div>)}
            {payoutSkipped ? (<div className="space-y-4"><Alert className="bg-green-900/30 border-green-500/50"><AlertCircle className="h-4 w-4 text-green-500" /><AlertDescription className="text-green-200">No problem! You can set up your payout account anytime from <span className="font-semibold">Settings - Payments</span>.</AlertDescription></Alert><Button type="button" variant="ghost" onClick={() => setPayoutSkipped(false)} className="w-full text-gray-400 hover:text-white">Changed your mind? Set up payouts now</Button></div>) : (<div className="space-y-4"><div className="text-center py-2"><p className="text-sm text-gray-500">- or set up now -</p></div><div className="bg-white rounded-lg p-4"><PayoutSettings /></div></div>)}
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
              <span className="text-sm font-medium text-gray-300">{currentStep === 0 ? 'Getting Started' : `Step ${currentStep} of ${TOTAL_STEPS - 1}`}</span>
              <span className="text-sm text-gray-400">{progressPct}% Complete</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2"><div className="bg-brand-neon h-2 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} /></div>
          </div>
          <Card className="card-chrome bg-zinc-900 border border-zinc-800">
            <CardHeader><CardTitle className="text-center text-brand-neon animate-steady-hum">Welcome to HospoGo</CardTitle></CardHeader>
            <CardContent>
              {renderStep()}
              <div className="flex justify-between mt-8 pt-6 border-t border-zinc-800">
                <Button type="button" variant="outline" onClick={handleBack} disabled={currentStep === 0 || isSavingStep || isSubmitting} className="steel" data-testid="onboarding-back"><ChevronLeft className="h-4 w-4 mr-2" />Back</Button>
                {currentStep < TOTAL_STEPS - 1 ? (
                  <Button type="button" onClick={handleNext} disabled={!canProceed || isSavingStep} variant="accent" className="shadow-neon-realistic hover:shadow-[0_0_8px_rgba(186,255,57,1),0_0_20px_rgba(186,255,57,0.6),0_0_35px_rgba(186,255,57,0.3)] transition-shadow duration-300" data-testid="onboarding-next">{isSavingStep ? 'Saving...' : 'Next'}<ChevronRight className="h-4 w-4 ml-2" /></Button>
                ) : (
                  <Button type="button" onClick={handleComplete} disabled={!canProceed || isSubmitting} variant="accent" className="shadow-neon-realistic hover:shadow-[0_0_8px_rgba(186,255,57,1),0_0_20px_rgba(186,255,57,0.6),0_0_35px_rgba(186,255,57,0.3)] transition-shadow duration-300" data-testid="onboarding-complete">{isSubmitting ? 'Completing...' : 'Complete Onboarding'}</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
