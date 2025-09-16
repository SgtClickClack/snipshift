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
import { Upload, MapPin, Phone, Mail, Building, Shield, Camera, Users } from 'lucide-react';

interface ShopOnboardingData {
  shopDetails: {
    shopName: string;
    address: string;
    phone: string;
    website: string;
  };
  shopVibe: {
    vibeTags: string[];
    chairCapacity: string;
  };
  verification: {
    abn: string;
    businessInsurance: File | null;
    shopPhotos: File[];
  };
}

export default function ShopOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const vibeOptions = [
    'Modern', 'High-end', 'Busy', 'Relaxed', 'Trendy', 'Classic', 'Luxury',
    'Casual', 'Professional', 'Artistic', 'Traditional', 'Contemporary'
  ];

  const chairCapacityOptions = [
    '1-2 chairs', '3-4 chairs', '5-6 chairs', '7-8 chairs', '9+ chairs'
  ];

  const handleComplete = async (data: ShopOnboardingData) => {
    setIsLoading(true);
    try {
      // Create hub profile
      const profileData = {
        businessName: data.shopDetails.shopName,
        address: {
          street: data.shopDetails.address.split(',')[0]?.trim() || '',
          city: data.shopDetails.address.split(',')[1]?.trim() || '',
          state: data.shopDetails.address.split(',')[2]?.trim() || '',
          postcode: '',
          country: 'Australia'
        },
        businessType: 'Barbershop',
        description: `A ${data.shopVibe.vibeTags.join(', ').toLowerCase()} barbershop with ${data.shopVibe.chairCapacity}`,
        website: data.shopDetails.website,
        phone: data.shopDetails.phone,
        abn: data.verification.abn,
        chairCapacity: data.shopVibe.chairCapacity,
        vibeTags: data.shopVibe.vibeTags,
        businessInsurance: data.verification.businessInsurance ? 'uploaded' : null,
        shopPhotos: data.verification.shopPhotos.length > 0 ? 'uploaded' : null
      };

      // Update user profile
      await apiRequest('PATCH', `/api/users/${user?.id}/profile`, {
        profileType: 'hub',
        data: JSON.stringify(profileData)
      });

      toast({
        title: "Onboarding Complete!",
        description: "Your shop profile has been created successfully.",
      });

      navigate(getDashboardRoute('hub'));
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
      id: 'shopDetails',
      title: 'Shop Details',
      description: 'Tell us about your barbershop',
      component: (
        <ShopDetailsStep />
      ),
      validation: () => {
        const data = (window as any).currentStepData || {};
        return !!(data.shopName && data.address && data.phone);
      }
    },
    {
      id: 'shopVibe',
      title: 'Shop Vibe & Details',
      description: 'Describe your shop atmosphere',
      component: (
        <ShopVibeStep vibeOptions={vibeOptions} chairCapacityOptions={chairCapacityOptions} />
      ),
      validation: () => {
        const data = (window as any).currentStepData || {};
        return !!(data.vibeTags && data.vibeTags.length > 0 && data.chairCapacity);
      }
    },
    {
      id: 'verification',
      title: 'Verification',
      description: 'Verify your business',
      component: (
        <VerificationStep />
      ),
      validation: () => {
        const data = (window as any).currentStepData || {};
        return !!(data.abn && data.abn.length >= 11 && data.businessInsurance);
      }
    }
  ];

  return (
    <MultiStepForm
      steps={steps}
      onComplete={handleComplete}
      onCancel={() => navigate('/role-selection')}
      title="Shop Owner Onboarding"
      subtitle="Set up your barbershop profile to start hiring professionals"
    />
  );
}

// Step Components
function ShopDetailsStep({ data, updateData }: { data: any; updateData: (data: any) => void }) {
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
        <Label htmlFor="shopName">Shop Name *</Label>
        <div className="relative">
          <Building className="absolute left-3 top-3 h-4 w-4 text-steel-400" />
          <Input
            id="shopName"
            placeholder="Enter your shop name"
            value={formData.shopName || ''}
            onChange={(e) => handleChange('shopName', e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address *</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-steel-400" />
          <Textarea
            id="address"
            placeholder="Enter your shop address (Street, City, State)"
            value={formData.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
            className="pl-10 min-h-[80px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-steel-400" />
            <Input
              id="phone"
              type="tel"
              placeholder="Enter shop phone number"
              value={formData.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website (Optional)</Label>
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

function ShopVibeStep({ data, updateData, vibeOptions, chairCapacityOptions }: { 
  data: any; 
  updateData: (data: any) => void; 
  vibeOptions: string[];
  chairCapacityOptions: string[];
}) {
  const [formData, setFormData] = useState(data);

  const handleVibeToggle = (vibe: string) => {
    const currentVibes = formData.vibeTags || [];
    const newVibes = currentVibes.includes(vibe)
      ? currentVibes.filter((v: string) => v !== vibe)
      : [...currentVibes, vibe];
    
    const newData = { ...formData, vibeTags: newVibes };
    setFormData(newData);
    updateData(newData);
    (window as any).currentStepData = newData;
  };

  const handleCapacityChange = (capacity: string) => {
    const newData = { ...formData, chairCapacity: capacity };
    setFormData(newData);
    updateData(newData);
    (window as any).currentStepData = newData;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Shop Vibe & Atmosphere *</h3>
        <p className="text-steel-600">Select the words that best describe your shop:</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {vibeOptions.map((vibe) => (
            <div key={vibe} className="flex items-center space-x-2">
              <Checkbox
                id={vibe}
                checked={formData.vibeTags?.includes(vibe) || false}
                onCheckedChange={() => handleVibeToggle(vibe)}
              />
              <Label htmlFor={vibe} className="text-sm font-normal">
                {vibe}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="chairCapacity">Chair Capacity *</Label>
        <Select value={formData.chairCapacity || ''} onValueChange={handleCapacityChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select number of chairs" />
          </SelectTrigger>
          <SelectContent>
            {chairCapacityOptions.map((capacity) => (
              <SelectItem key={capacity} value={capacity}>
                {capacity}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-steel-500">
          This helps professionals understand your shop size and capacity.
        </p>
      </div>
    </div>
  );
}

function VerificationStep({ data, updateData }: { data: any; updateData: (data: any) => void }) {
  const [formData, setFormData] = useState(data);

  const handleABNChange = (abn: string) => {
    const newData = { ...formData, abn };
    setFormData(newData);
    updateData(newData);
    (window as any).currentStepData = newData;
  };

  const handleInsuranceFileChange = (file: File | null) => {
    const newData = { ...formData, businessInsurance: file };
    setFormData(newData);
    updateData(newData);
    (window as any).currentStepData = newData;
  };

  const handlePhotoChange = (files: FileList | null) => {
    const photoFiles = files ? Array.from(files) : [];
    const newData = { ...formData, shopPhotos: photoFiles };
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
            onChange={(e) => handleABNChange(e.target.value)}
            className="pl-10"
            maxLength={11}
          />
        </div>
        <p className="text-sm text-steel-500">
          Your ABN is required for business verification and tax purposes.
        </p>
      </div>

      <div className="space-y-4">
        <div className="text-center">
          <Shield className="mx-auto h-8 w-8 text-red-accent mb-2" />
          <h3 className="text-lg font-semibold">Business Insurance</h3>
          <p className="text-steel-600 mb-4">
            Upload your business insurance certificate. This is required for all shops.
          </p>
        </div>

        <div className="border-2 border-dashed border-steel-300 rounded-lg p-6 text-center">
          <Upload className="mx-auto h-6 w-6 text-steel-400 mb-2" />
          <div className="space-y-2">
            <Label htmlFor="insurance-file" className="cursor-pointer">
              <span className="text-red-accent font-medium">Click to upload</span> or drag and drop
            </Label>
            <Input
              id="insurance-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleInsuranceFileChange(e.target.files?.[0] || null)}
              className="hidden"
            />
            <p className="text-sm text-steel-500">PDF, JPG, PNG up to 10MB</p>
          </div>
        </div>

        {formData.businessInsurance && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">✓ {formData.businessInsurance.name} uploaded successfully</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="text-center">
          <Camera className="mx-auto h-8 w-8 text-red-accent mb-2" />
          <h3 className="text-lg font-semibold">Shop Photos (Optional)</h3>
          <p className="text-steel-600 mb-4">
            Upload photos of your shop to attract professionals and showcase your space.
          </p>
        </div>

        <div className="border-2 border-dashed border-steel-300 rounded-lg p-6 text-center">
          <Upload className="mx-auto h-6 w-6 text-steel-400 mb-2" />
          <div className="space-y-2">
            <Label htmlFor="shop-photos" className="cursor-pointer">
              <span className="text-red-accent font-medium">Click to upload</span> or drag and drop
            </Label>
            <Input
              id="shop-photos"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handlePhotoChange(e.target.files)}
              className="hidden"
            />
            <p className="text-sm text-steel-500">JPG, PNG up to 5MB each (max 5 photos)</p>
          </div>
        </div>

        {formData.shopPhotos && formData.shopPhotos.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">
              ✓ {formData.shopPhotos.length} photo(s) uploaded successfully
            </p>
            <div className="mt-2 space-y-1">
              {formData.shopPhotos.map((photo: File, index: number) => (
                <p key={index} className="text-green-700 text-sm">• {photo.name}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
