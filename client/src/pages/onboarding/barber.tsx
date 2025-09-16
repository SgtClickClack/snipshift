import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiStepForm, Step } from '@/components/onboarding/multi-step-form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { getDashboardRoute } from '@/lib/roles';
import { Upload, MapPin, Phone, Mail, User, Building, Shield, Award, Instagram, Clock, CreditCard } from 'lucide-react';

interface BarberOnboardingData {
  basicInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
  };
  businessInfo: {
    abn: string;
  };
  insurance: {
    insuranceFile: File | null;
  };
  qualifications: {
    qualificationFile: File | null;
  };
  skills: {
    skills: string[];
    instagramLink: string;
  };
  availability: {
    travelPreferences: string[];
    generalAvailability: string[];
  };
  payment: {
    stripeConnected: boolean;
  };
}

export default function BarberOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const skillOptions = [
    'Fades', 'Beard Trim', 'Hair Cutting', 'Hair Styling', 'Color', 'Perms',
    'Hair Extensions', 'Scalp Treatments', 'Hair Washing', 'Blow Drying',
    'Razor Work', 'Scissor Work', 'Clipper Work', 'Texturizing', 'Layering'
  ];

  const travelOptions = [
    'I prefer to work at the shop',
    'I can travel to client locations',
    'I offer mobile services',
    'I work at multiple locations'
  ];

  const availabilityOptions = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  const handleComplete = async (data: BarberOnboardingData) => {
    setIsLoading(true);
    try {
      // Create professional profile
      const profileData = {
        skills: data.skills.skills,
        experience: '0+ years', // Default, can be updated later
        homeLocation: {
          city: data.basicInfo.location.split(',')[0]?.trim() || '',
          state: data.basicInfo.location.split(',')[1]?.trim() || '',
          country: 'Australia'
        },
        isRoamingNomad: data.availability.travelPreferences.includes('I can travel to client locations'),
        preferredRegions: data.availability.travelPreferences.includes('I work at multiple locations') ? ['Multiple'] : [data.basicInfo.location],
        abn: data.businessInfo.abn,
        instagramLink: data.skills.instagramLink,
        insuranceDocument: data.insurance.insuranceFile ? 'uploaded' : null,
        qualificationDocument: data.qualifications.qualificationFile ? 'uploaded' : null,
        stripeConnected: data.payment.stripeConnected
      };

      // Update user profile
      await apiRequest('PATCH', `/api/users/${user?.id}/profile`, {
        profileType: 'professional',
        data: JSON.stringify(profileData)
      });

      toast({
        title: "Onboarding Complete!",
        description: "Your professional profile has been created successfully.",
      });

      navigate(getDashboardRoute('professional'));
    } catch (error) {
      console.error('Onboarding error:', error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const steps: Step[] = [
    {
      id: 'basicInfo',
      title: 'Basic Information',
      description: 'Tell us about yourself',
      component: (
        <BasicInfoStep />
      ),
      validation: () => {
        const data = (window as any).currentStepData || {};
        return !!(data.fullName && data.email && data.phone && data.location);
      }
    },
    {
      id: 'businessInfo',
      title: 'ABN & Business',
      description: 'Your business details',
      component: (
        <BusinessInfoStep />
      ),
      validation: () => {
        const data = (window as any).currentStepData || {};
        return !!(data.abn && data.abn.length >= 11);
      }
    },
    {
      id: 'insurance',
      title: 'Insurance',
      description: 'Upload your insurance certificate',
      component: (
        <InsuranceStep />
      ),
      validation: () => {
        const data = (window as any).currentStepData || {};
        return !!data.insuranceFile;
      }
    },
    {
      id: 'qualifications',
      title: 'Qualifications',
      description: 'Upload proof of qualification',
      component: (
        <QualificationsStep />
      ),
      validation: () => {
        const data = (window as any).currentStepData || {};
        return !!data.qualificationFile;
      }
    },
    {
      id: 'skills',
      title: 'Skills & Portfolio',
      description: 'Showcase your expertise',
      component: (
        <SkillsStep skillOptions={skillOptions} />
      ),
      validation: () => {
        const data = (window as any).currentStepData || {};
        return data.skills && data.skills.length > 0;
      }
    },
    {
      id: 'availability',
      title: 'Availability',
      description: 'When and where you work',
      component: (
        <AvailabilityStep travelOptions={travelOptions} availabilityOptions={availabilityOptions} />
      ),
      validation: () => {
        const data = (window as any).currentStepData || {};
        return data.travelPreferences && data.travelPreferences.length > 0;
      }
    },
    {
      id: 'payment',
      title: 'Payment Setup',
      description: 'Connect with Stripe for payments',
      component: (
        <PaymentStep />
      ),
      validation: () => {
        const data = (window as any).currentStepData || {};
        return data.stripeConnected === true;
      }
    }
  ];

  return (
    <MultiStepForm
      steps={steps}
      onComplete={handleComplete}
      onCancel={() => navigate('/role-selection')}
      title="Professional Barber Onboarding"
      subtitle="Complete your profile to start finding opportunities"
    />
  );
}

// Step Components
function BasicInfoStep({ data, updateData }: { data: any; updateData: (data: any) => void }) {
  const [formData, setFormData] = useState(data);

  const handleChange = (field: string, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    updateData(newData);
    (window as any).currentStepData = newData;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name *</Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-steel-400" />
            <Input
              id="fullName"
              placeholder="Enter your full name"
              value={formData.fullName || ''}
              onChange={(e) => handleChange('fullName', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-steel-400" />
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-steel-400" />
            <Input
              id="phone"
              type="tel"
              placeholder="Enter your phone number"
              value={formData.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location *</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-steel-400" />
            <Input
              id="location"
              placeholder="City, State"
              value={formData.location || ''}
              onChange={(e) => handleChange('location', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function BusinessInfoStep({ data, updateData }: { data: any; updateData: (data: any) => void }) {
  const [formData, setFormData] = useState(data);

  const handleChange = (field: string, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    updateData(newData);
    (window as any).currentStepData = newData;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="abn">ABN Number *</Label>
        <div className="relative">
          <Building className="absolute left-3 top-3 h-4 w-4 text-steel-400" />
          <Input
            id="abn"
            placeholder="Enter your 11-digit ABN"
            value={formData.abn || ''}
            onChange={(e) => handleChange('abn', e.target.value)}
            className="pl-10"
            maxLength={11}
          />
        </div>
        <p className="text-sm text-steel-500">
          Your ABN is required for tax purposes and business verification.
        </p>
      </div>
    </div>
  );
}

function InsuranceStep({ data, updateData }: { data: any; updateData: (data: any) => void }) {
  const [formData, setFormData] = useState(data);

  const handleFileChange = (file: File | null) => {
    const newData = { ...formData, insuranceFile: file };
    setFormData(newData);
    updateData(newData);
    (window as any).currentStepData = newData;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Shield className="mx-auto h-12 w-12 text-red-accent mb-4" />
        <h3 className="text-lg font-semibold mb-2">Insurance Certificate</h3>
        <p className="text-steel-600 mb-6">
          Upload your professional liability insurance certificate. This is required for all professionals.
        </p>
      </div>

      <div className="border-2 border-dashed border-steel-300 rounded-lg p-8 text-center">
        <Upload className="mx-auto h-8 w-8 text-steel-400 mb-4" />
        <div className="space-y-2">
          <Label htmlFor="insurance-file" className="cursor-pointer">
            <span className="text-red-accent font-medium">Click to upload</span> or drag and drop
          </Label>
          <Input
            id="insurance-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            className="hidden"
          />
          <p className="text-sm text-steel-500">PDF, JPG, PNG up to 10MB</p>
        </div>
      </div>

      {formData.insuranceFile && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">✓ {formData.insuranceFile.name} uploaded successfully</p>
        </div>
      )}
    </div>
  );
}

function QualificationsStep({ data, updateData }: { data: any; updateData: (data: any) => void }) {
  const [formData, setFormData] = useState(data);

  const handleFileChange = (file: File | null) => {
    const newData = { ...formData, qualificationFile: file };
    setFormData(newData);
    updateData(newData);
    (window as any).currentStepData = newData;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Award className="mx-auto h-12 w-12 text-red-accent mb-4" />
        <h3 className="text-lg font-semibold mb-2">Proof of Qualification</h3>
        <p className="text-steel-600 mb-6">
          Upload your barbering license, certificate, or qualification document.
        </p>
      </div>

      <div className="border-2 border-dashed border-steel-300 rounded-lg p-8 text-center">
        <Upload className="mx-auto h-8 w-8 text-steel-400 mb-4" />
        <div className="space-y-2">
          <Label htmlFor="qualification-file" className="cursor-pointer">
            <span className="text-red-accent font-medium">Click to upload</span> or drag and drop
          </Label>
          <Input
            id="qualification-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            className="hidden"
          />
          <p className="text-sm text-steel-500">PDF, JPG, PNG up to 10MB</p>
        </div>
      </div>

      {formData.qualificationFile && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">✓ {formData.qualificationFile.name} uploaded successfully</p>
        </div>
      )}
    </div>
  );
}

function SkillsStep({ data, updateData, skillOptions }: { data: any; updateData: (data: any) => void; skillOptions: string[] }) {
  const [formData, setFormData] = useState(data);

  const handleSkillToggle = (skill: string) => {
    const currentSkills = formData.skills || [];
    const newSkills = currentSkills.includes(skill)
      ? currentSkills.filter((s: string) => s !== skill)
      : [...currentSkills, skill];
    
    const newData = { ...formData, skills: newSkills };
    setFormData(newData);
    updateData(newData);
    (window as any).currentStepData = newData;
  };

  const handleInstagramChange = (value: string) => {
    const newData = { ...formData, instagramLink: value };
    setFormData(newData);
    updateData(newData);
    (window as any).currentStepData = newData;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Select Your Skills *</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {skillOptions.map((skill) => (
            <div key={skill} className="flex items-center space-x-2">
              <Checkbox
                id={skill}
                checked={formData.skills?.includes(skill) || false}
                onCheckedChange={() => handleSkillToggle(skill)}
              />
              <Label htmlFor={skill} className="text-sm font-normal">
                {skill}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instagram">Instagram Link (Optional)</Label>
        <div className="relative">
          <Instagram className="absolute left-3 top-3 h-4 w-4 text-steel-400" />
          <Input
            id="instagram"
            placeholder="https://instagram.com/yourusername"
            value={formData.instagramLink || ''}
            onChange={(e) => handleInstagramChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <p className="text-sm text-steel-500">
          Link your Instagram to showcase your work and attract more clients.
        </p>
      </div>
    </div>
  );
}

function AvailabilityStep({ data, updateData, travelOptions, availabilityOptions }: { 
  data: any; 
  updateData: (data: any) => void; 
  travelOptions: string[];
  availabilityOptions: string[];
}) {
  const [formData, setFormData] = useState(data);

  const handleTravelToggle = (option: string) => {
    const currentOptions = formData.travelPreferences || [];
    const newOptions = currentOptions.includes(option)
      ? currentOptions.filter((o: string) => o !== option)
      : [...currentOptions, option];
    
    const newData = { ...formData, travelPreferences: newOptions };
    setFormData(newData);
    updateData(newData);
    (window as any).currentStepData = newData;
  };

  const handleAvailabilityToggle = (day: string) => {
    const currentDays = formData.generalAvailability || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d: string) => d !== day)
      : [...currentDays, day];
    
    const newData = { ...formData, generalAvailability: newDays };
    setFormData(newData);
    updateData(newData);
    (window as any).currentStepData = newData;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Travel Preferences *</h3>
        <div className="space-y-3">
          {travelOptions.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox
                id={option}
                checked={formData.travelPreferences?.includes(option) || false}
                onCheckedChange={() => handleTravelToggle(option)}
              />
              <Label htmlFor={option} className="text-sm font-normal">
                {option}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">General Availability</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {availabilityOptions.map((day) => (
            <div key={day} className="flex items-center space-x-2">
              <Checkbox
                id={day}
                checked={formData.generalAvailability?.includes(day) || false}
                onCheckedChange={() => handleAvailabilityToggle(day)}
              />
              <Label htmlFor={day} className="text-sm font-normal">
                {day}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PaymentStep({ data, updateData }: { data: any; updateData: (data: any) => void }) {
  const [formData, setFormData] = useState(data);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleStripeConnect = async () => {
    setIsConnecting(true);
    try {
      // Simulate Stripe connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newData = { ...formData, stripeConnected: true };
      setFormData(newData);
      updateData(newData);
      (window as any).currentStepData = newData;
    } catch (error) {
      console.error('Stripe connection error:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <CreditCard className="mx-auto h-12 w-12 text-red-accent mb-4" />
        <h3 className="text-lg font-semibold mb-2">Connect with Stripe</h3>
        <p className="text-steel-600 mb-6">
          Connect your Stripe account to receive payments from clients and shops.
        </p>
      </div>

      {!formData.stripeConnected ? (
        <div className="text-center">
          <Button
            onClick={handleStripeConnect}
            disabled={isConnecting}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3"
          >
            {isConnecting ? 'Connecting...' : 'Connect with Stripe'}
          </Button>
          <p className="text-sm text-steel-500 mt-4">
            Secure connection powered by Stripe. Your financial information is protected.
          </p>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="text-green-600 mb-2">
            <CreditCard className="mx-auto h-8 w-8" />
          </div>
          <h4 className="font-semibold text-green-800 mb-2">Stripe Connected Successfully!</h4>
          <p className="text-green-700 text-sm">
            You're all set to receive payments. You can manage your Stripe account settings later.
          </p>
        </div>
      )}
    </div>
  );
}
