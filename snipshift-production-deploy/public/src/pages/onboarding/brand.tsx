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
import { Upload, MapPin, Phone, Mail, Building, Award, Instagram, Target, Users, GraduationCap } from 'lucide-react';

interface BrandOnboardingData {
  brandInfo: {
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    location: string;
    website: string;
  };
  businessType: {
    businessType: string;
    description: string;
  };
  contentProducts: {
    productCategories: string[];
    socialMediaLinks: {
      instagram: string;
      facebook: string;
      youtube: string;
    };
  };
  partnershipGoals: {
    goals: string[];
    targetAudience: string[];
  };
}

export default function BrandOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const businessTypeOptions = [
    'Product Brand',
    'Education/Training',
    'Both Product Brand and Education/Training'
  ];

  const productCategoryOptions = [
    'Hair Care Products', 'Styling Tools', 'Barber Tools', 'Beard Care', 'Hair Color',
    'Professional Equipment', 'Accessories', 'Training Materials', 'Educational Content',
    'Software/Tech', 'Apparel', 'Other'
  ];

  const partnershipGoalOptions = [
    'Product Trials', 'Brand Ambassadors', 'Event Sponsorship', 'Content Collaboration',
    'Educational Partnerships', 'Influencer Marketing', 'Product Reviews', 'Workshop Sponsorship',
    'Social Media Campaigns', 'Community Building', 'Market Research', 'Direct Sales'
  ];

  const targetAudienceOptions = [
    'Professional Barbers', 'Barbershop Owners', 'Hair Stylists', 'Beauty Professionals',
    'Students/Trainees', 'Industry Influencers', 'General Consumers', 'Salon Owners',
    'Mobile Professionals', 'Freelance Stylists'
  ];

  const handleComplete = async (data: BrandOnboardingData) => {
    setIsLoading(true);
    try {
      // Determine if this is a brand or trainer based on business type
      const isTrainer = data.businessType.businessType.includes('Education') || 
                       data.businessType.businessType.includes('Training');
      const role = isTrainer ? 'trainer' : 'brand';

      // Create profile data
      const profileData = {
        companyName: data.brandInfo.companyName,
        contactName: data.brandInfo.contactName,
        email: data.brandInfo.email,
        phone: data.brandInfo.phone,
        website: data.brandInfo.website,
        location: {
          city: data.brandInfo.location.split(',')[0]?.trim() || '',
          state: data.brandInfo.location.split(',')[1]?.trim() || '',
          country: 'Australia'
        },
        businessType: data.businessType.businessType,
        description: data.businessType.description,
        productCategories: data.contentProducts.productCategories,
        socialMediaLinks: data.contentProducts.socialMediaLinks,
        partnershipGoals: data.partnershipGoals.goals,
        targetAudience: data.partnershipGoals.targetAudience
      };

      // Update user profile
      await apiRequest('PATCH', `/api/users/${user?.id}/profile`, {
        profileType: role,
        data: JSON.stringify(profileData)
      });

      toast({
        title: "Onboarding Complete!",
        description: `Your ${role} profile has been created successfully.`,
      });

      navigate(getDashboardRoute(role));
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
      id: 'brandInfo',
      title: 'Brand Information',
      description: 'Tell us about your company',
      component: (
        <BrandInfoStep />
      ),
      validation: () => {
        const data = (window as any).currentStepData || {};
        return !!(data.companyName && data.contactName && data.email && data.location);
      }
    },
    {
      id: 'businessType',
      title: 'Business Type',
      description: 'What type of business are you?',
      component: (
        <BusinessTypeStep businessTypeOptions={businessTypeOptions} />
      ),
      validation: () => {
        const data = (window as any).currentStepData || {};
        return !!(data.businessType && data.description);
      }
    },
    {
      id: 'contentProducts',
      title: 'Content & Products',
      description: 'What do you offer?',
      component: (
        <ContentProductsStep productCategoryOptions={productCategoryOptions} />
      ),
      validation: () => {
        const data = (window as any).currentStepData || {};
        return !!(data.productCategories && data.productCategories.length > 0);
      }
    },
    {
      id: 'partnershipGoals',
      title: 'Partnership Goals',
      description: 'What are your goals?',
      component: (
        <PartnershipGoalsStep 
          partnershipGoalOptions={partnershipGoalOptions} 
          targetAudienceOptions={targetAudienceOptions} 
        />
      ),
      validation: () => {
        const data = (window as any).currentStepData || {};
        return !!(data.goals && data.goals.length > 0 && data.targetAudience && data.targetAudience.length > 0);
      }
    }
  ];

  return (
    <MultiStepForm
      steps={steps}
      onComplete={handleComplete}
      onCancel={() => navigate('/role-selection')}
      title="Brand & Trainer Onboarding"
      subtitle="Set up your profile to connect with the barbering community"
    />
  );
}

// Step Components
function BrandInfoStep({ data, updateData }: { data: any; updateData: (data: any) => void }) {
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
          <Label htmlFor="companyName">Company Name *</Label>
          <div className="relative">
            <Building className="absolute left-3 top-3 h-4 w-4 text-steel-400" />
            <Input
              id="companyName"
              placeholder="Enter your company name"
              value={formData.companyName || ''}
              onChange={(e) => handleChange('companyName', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactName">Contact Name *</Label>
          <div className="relative">
            <Users className="absolute left-3 top-3 h-4 w-4 text-steel-400" />
            <Input
              id="contactName"
              placeholder="Your full name"
              value={formData.contactName || ''}
              onChange={(e) => handleChange('contactName', e.target.value)}
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
          <Label htmlFor="phone">Phone Number</Label>
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

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-steel-400" />
            <Input
              id="website"
              type="url"
              placeholder="https://yourwebsite.com"
              value={formData.website || ''}
              onChange={(e) => handleChange('website', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function BusinessTypeStep({ data, updateData, businessTypeOptions }: { 
  data: any; 
  updateData: (data: any) => void; 
  businessTypeOptions: string[];
}) {
  const [formData, setFormData] = useState(data);

  const handleBusinessTypeChange = (businessType: string) => {
    const newData = { ...formData, businessType };
    setFormData(newData);
    updateData(newData);
    (window as any).currentStepData = newData;
  };

  const handleDescriptionChange = (description: string) => {
    const newData = { ...formData, description };
    setFormData(newData);
    updateData(newData);
    (window as any).currentStepData = newData;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">What type of business are you? *</h3>
        <div className="space-y-3">
          {businessTypeOptions.map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={type}
                checked={formData.businessType === type}
                onCheckedChange={() => handleBusinessTypeChange(type)}
              />
              <Label htmlFor={type} className="text-sm font-normal">
                {type}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Business Description *</Label>
        <Textarea
          id="description"
          placeholder="Tell us about your business, what you do, and what makes you unique..."
          value={formData.description || ''}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          className="min-h-[120px]"
        />
        <p className="text-sm text-steel-500">
          This description will be visible to professionals and help them understand your business.
        </p>
      </div>
    </div>
  );
}

function ContentProductsStep({ data, updateData, productCategoryOptions }: { 
  data: any; 
  updateData: (data: any) => void; 
  productCategoryOptions: string[];
}) {
  const [formData, setFormData] = useState(data);

  const handleCategoryToggle = (category: string) => {
    const currentCategories = formData.productCategories || [];
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter((c: string) => c !== category)
      : [...currentCategories, category];
    
    const newData = { ...formData, productCategories: newCategories };
    setFormData(newData);
    updateData(newData);
    (window as any).currentStepData = newData;
  };

  const handleSocialMediaChange = (platform: string, value: string) => {
    const newSocialLinks = { ...formData.socialMediaLinks, [platform]: value };
    const newData = { ...formData, socialMediaLinks: newSocialLinks };
    setFormData(newData);
    updateData(newData);
    (window as any).currentStepData = newData;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Product Categories *</h3>
        <p className="text-steel-600">Select the categories that best describe what you offer:</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {productCategoryOptions.map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={category}
                checked={formData.productCategories?.includes(category) || false}
                onCheckedChange={() => handleCategoryToggle(category)}
              />
              <Label htmlFor={category} className="text-sm font-normal">
                {category}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Social Media Links</h3>
        <p className="text-steel-600">Connect your social media accounts to showcase your content:</p>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <div className="relative">
              <Instagram className="absolute left-3 top-3 h-4 w-4 text-steel-400" />
              <Input
                id="instagram"
                placeholder="https://instagram.com/yourusername"
                value={formData.socialMediaLinks?.instagram || ''}
                onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="facebook">Facebook</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-steel-400" />
              <Input
                id="facebook"
                placeholder="https://facebook.com/yourpage"
                value={formData.socialMediaLinks?.facebook || ''}
                onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="youtube">YouTube</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-steel-400" />
              <Input
                id="youtube"
                placeholder="https://youtube.com/c/yourchannel"
                value={formData.socialMediaLinks?.youtube || ''}
                onChange={(e) => handleSocialMediaChange('youtube', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PartnershipGoalsStep({ data, updateData, partnershipGoalOptions, targetAudienceOptions }: { 
  data: any; 
  updateData: (data: any) => void; 
  partnershipGoalOptions: string[];
  targetAudienceOptions: string[];
}) {
  const [formData, setFormData] = useState(data);

  const handleGoalToggle = (goal: string) => {
    const currentGoals = formData.goals || [];
    const newGoals = currentGoals.includes(goal)
      ? currentGoals.filter((g: string) => g !== goal)
      : [...currentGoals, goal];
    
    const newData = { ...formData, goals: newGoals };
    setFormData(newData);
    updateData(newData);
    (window as any).currentStepData = newData;
  };

  const handleAudienceToggle = (audience: string) => {
    const currentAudience = formData.targetAudience || [];
    const newAudience = currentAudience.includes(audience)
      ? currentAudience.filter((a: string) => a !== audience)
      : [...currentAudience, audience];
    
    const newData = { ...formData, targetAudience: newAudience };
    setFormData(newData);
    updateData(newData);
    (window as any).currentStepData = newData;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Partnership Goals *</h3>
        <p className="text-steel-600">What are you looking to achieve with SnipShift partnerships?</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {partnershipGoalOptions.map((goal) => (
            <div key={goal} className="flex items-center space-x-2">
              <Checkbox
                id={goal}
                checked={formData.goals?.includes(goal) || false}
                onCheckedChange={() => handleGoalToggle(goal)}
              />
              <Label htmlFor={goal} className="text-sm font-normal">
                {goal}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Target Audience *</h3>
        <p className="text-steel-600">Who do you want to reach and collaborate with?</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {targetAudienceOptions.map((audience) => (
            <div key={audience} className="flex items-center space-x-2">
              <Checkbox
                id={audience}
                checked={formData.targetAudience?.includes(audience) || false}
                onCheckedChange={() => handleAudienceToggle(audience)}
              />
              <Label htmlFor={audience} className="text-sm font-normal">
                {audience}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
