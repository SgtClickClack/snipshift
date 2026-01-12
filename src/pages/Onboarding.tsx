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
      const res = await apiRequest('POST', '/api/onboarding/complete', { role: 'professional', displayName: formData.displayName, phone: formData.phone, bio: formData.bio || undefined, location: formData.location, avatarUrl: formData.avatarUrl || undefined });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.message || 'Failed to complete onboarding'); }
      if (auth.currentUser) await auth.currentUser.getIdToken(true);
      window.location.href = '/dashboard';
    } catch (error: any) {
      toast({ title: 'Setup Failed', description: error?.message || 'Failed to complete onboarding. Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };