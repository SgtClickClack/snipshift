import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createShift } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LocationInput } from '@/components/ui/location-input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';
import { useAuth } from '@/contexts/AuthContext';
import { geocodeAddress } from '@/lib/google-maps';

export default function PostJobPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isGeocoding, setIsGeocoding] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    payRate: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    shopName: '',
    sitePhotoUrl: '',
  });
  
  // Generate a temporary job ID for image uploads before job creation
  const tempJobId = user ? `temp-${user.id}-${Date.now()}` : 'temp';

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createJobMutation = useMutation({
    mutationFn: async (data: any) => {
      // Combine date and time into ISO timestamps
      const startDateTime = new Date(`${data.date}T${data.startTime}`);
      const endDateTime = new Date(`${data.date}T${data.endTime}`);
      
      return createShift({
        title: data.title,
        description: data.description,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        hourlyRate: data.payRate,
        location: data.location,
        lat: data.lat,
        lng: data.lng,
        status: 'open',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Shift posted successfully!',
        description: 'Your job listing is now live.',
      });
      // Invalidate jobs query to refresh the feed
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
      // Redirect to manage jobs page (better UX for employers)
      navigate('/manage-jobs');
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to post shift',
        description: error.message || 'Please check all fields and try again.',
        variant: 'destructive',
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Job title is required';
    }

    if (!formData.payRate || parseFloat(String(formData.payRate)) <= 0) {
      newErrors.payRate = 'Pay rate must be a positive number';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }

    // Validate time logic
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      newErrors.endTime = 'End time must be after start time';
    }

    if (!formData.location?.trim()) {
      newErrors.location = 'Location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsGeocoding(true);
    let lat: number | undefined;
    let lng: number | undefined;

    try {
      if (formData.location) {
        const coords = await geocodeAddress(formData.location);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }
      }
    } catch (error) {
      console.error('Geocoding failed:', error);
      // Continue without coordinates
    } finally {
      setIsGeocoding(false);
    }

    // Format pay rate
    const payRateValue = typeof formData.payRate === 'string' 
      ? parseFloat(formData.payRate) 
      : formData.payRate;

    createJobMutation.mutate({
      ...formData,
      payRate: payRateValue,
      lat,
      lng,
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24 md:pb-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/jobs')}
          className="mb-4 text-steel-600 hover:text-steel-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-steel-900">Post a Shift</h1>
          <p className="text-steel-600 mt-1">Create a new job listing for professionals to apply</p>
        </header>

        {/* Form */}
        <Card className="card-chrome">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Job Title */}
              <div>
                <Label htmlFor="title" className="text-steel-900">
                  Job Title *
                </Label>
                <Input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g., Hair Stylist Needed"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              {/* Shop Name */}
              <div>
                <Label htmlFor="shopName" className="text-steel-900">
                  Shop Name
                </Label>
                <Input
                  id="shopName"
                  type="text"
                  value={formData.shopName}
                  onChange={(e) => handleChange('shopName', e.target.value)}
                  placeholder="e.g., Downtown Salon"
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="date" className="text-steel-900">
                    Date *
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleChange('date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={errors.date ? 'border-red-500' : ''}
                  />
                  {errors.date && (
                    <p className="text-red-500 text-sm mt-1">{errors.date}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="startTime" className="text-steel-900">
                    Start Time *
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleChange('startTime', e.target.value)}
                    className={errors.startTime ? 'border-red-500' : ''}
                  />
                  {errors.startTime && (
                    <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="endTime" className="text-steel-900">
                    End Time *
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleChange('endTime', e.target.value)}
                    className={errors.endTime ? 'border-red-500' : ''}
                  />
                  {errors.endTime && (
                    <p className="text-red-500 text-sm mt-1">{errors.endTime}</p>
                  )}
                </div>
              </div>

              {/* Pay Rate */}
              <div>
                <Label htmlFor="payRate" className="text-steel-900">
                  Pay Rate ($/hr) *
                </Label>
                <Input
                  id="payRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.payRate}
                  onChange={(e) => handleChange('payRate', e.target.value)}
                  placeholder="e.g., 25"
                  className={errors.payRate ? 'border-red-500' : ''}
                />
                {errors.payRate && (
                  <p className="text-red-500 text-sm mt-1">{errors.payRate}</p>
                )}
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location" className="text-steel-900">
                  Location/Address *
                </Label>
                <LocationInput
                  value={formData.location}
                  onChange={(val) => handleChange('location', val)}
                  placeholder="e.g., 123 Main St, New York, NY 10001"
                  className={errors.location ? 'border-red-500' : ''}
                />
                {errors.location && (
                  <p className="text-red-500 text-sm mt-1">{errors.location}</p>
                )}
                <p className="text-xs text-steel-500 mt-1">
                  Enter full address or city, state format
                </p>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-steel-900">
                  Description *
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe the role, responsibilities, and what you're looking for..."
                  rows={6}
                  className={`border-2 border-steel-400 focus-visible:border-red-accent ${errors.description ? 'border-red-500' : ''}`}
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                )}
              </div>

              {/* Site Photo Upload */}
              {user && (
                <div>
                  <Label className="text-steel-900">
                    Site Photo (Optional)
                  </Label>
                  <p className="text-xs text-steel-500 mb-2">
                    Upload a photo of your salon, barbershop, or workspace
                  </p>
                  <ImageUpload
                    currentImageUrl={formData.sitePhotoUrl}
                    onUploadComplete={(url) => {
                      setFormData(prev => ({ ...prev, sitePhotoUrl: url }));
                      toast({
                        title: "Image uploaded",
                        description: "Site photo has been added.",
                      });
                    }}
                    onUploadError={(error) => {
                      toast({
                        title: "Upload failed",
                        description: error.message || "Failed to upload image.",
                        variant: "destructive",
                      });
                    }}
                    pathPrefix="jobs"
                    entityId={tempJobId}
                    fileName="site-photo"
                    shape="rect"
                    maxSize={10 * 1024 * 1024} // 10MB
                  />
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/jobs')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createJobMutation.isPending || isGeocoding}
                  className="flex-1 steel-button"
                >
                  {createJobMutation.isPending || isGeocoding ? 'Publishing...' : 'Publish Shift'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

