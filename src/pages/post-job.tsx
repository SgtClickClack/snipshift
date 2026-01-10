import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createShift } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LocationInput } from '@/components/ui/location-input';
import { useToast } from '@/hooks/useToast';
import { ArrowLeft } from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';
import { useAuth } from '@/contexts/AuthContext';
import { geocodeAddress } from '@/lib/google-maps';
import { logger } from '@/lib/logger';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HOSPITALITY_ROLES } from '@/utils/hospitality';

export default function PostJobPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isGeocoding, setIsGeocoding] = useState(false);

  const [formData, setFormData] = useState({
    role: '',
    title: '',
    payRate: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    shopName: '',
    sitePhotoUrl: '',
    uniformRequirements: '',
    rsaRequired: false,
    expectedPax: '',
  });
  
  // Generate a temporary job ID for image uploads before job creation
  const tempJobId = user ? `temp-${user.id}-${Date.now()}` : 'temp';

  const [errors, setErrors] = useState<Record<string, string>>({});

  const durationHours = useMemo(() => {
    if (!formData.date || !formData.startTime || !formData.endTime) return null;
    const start = new Date(`${formData.date}T${formData.startTime}`);
    const end = new Date(`${formData.date}T${formData.endTime}`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return hours > 0 ? Math.round(hours * 100) / 100 : null;
  }, [formData.date, formData.startTime, formData.endTime]);

  const estimatedTotal = useMemo(() => {
    const hours = durationHours;
    if (!hours) return null;
    const rate = Number.parseFloat(String(formData.payRate ?? ''));
    if (!Number.isFinite(rate) || rate <= 0) return null;
    return Math.round(rate * hours * 100) / 100;
  }, [durationHours, formData.payRate]);

  const createJobMutation = useMutation({
    mutationFn: async (data: any) => {
      // Combine date and time into ISO timestamps
      const startDateTime = new Date(`${data.date}T${data.startTime}`);
      const endDateTime = new Date(`${data.date}T${data.endTime}`);
      
      return createShift({
        role: data.role,
        title: data.title,
        description: data.description,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        hourlyRate: data.payRate,
        uniformRequirements: data.uniformRequirements,
        rsaRequired: !!data.rsaRequired,
        expectedPax: data.expectedPax ? Number.parseInt(String(data.expectedPax), 10) : undefined,
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

    if (!formData.role) {
      newErrors.role = 'Shift role is required';
    }

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
      // Non-blocking: continue without coordinates if geocoding fails
      logger.debug('PostJob', 'Geocoding failed (continuing without coords):', error);
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
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24 md:pb-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/jobs')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Post a Shift</h1>
          <p className="text-muted-foreground mt-1">
            Create a new shift listing for hospitality staff to apply
          </p>
        </header>

        {/* Form */}
        <Card className="card-chrome">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Shift Role */}
              <div>
                <Label htmlFor="role" className="text-foreground">
                  Shift Role *
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select Shift Role (e.g. Bartender)" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOSPITALITY_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
              </div>

              {/* Shift Title */}
              <div>
                <Label htmlFor="title" className="text-foreground">
                  Shift Title *
                </Label>
                <Input
                  id="title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder={formData.role ? `e.g., ${formData.role} Needed` : 'e.g., Bartender Needed'}
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              {/* Shop Name */}
              <div>
                <Label htmlFor="shopName" className="text-foreground">
                  Venue Name
                </Label>
                <Input
                  id="shopName"
                  type="text"
                  value={formData.shopName}
                  onChange={(e) => handleChange('shopName', e.target.value)}
                  placeholder="e.g., HospoGo Hotel"
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
                    required
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
                    required
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
                    required
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
                <Label htmlFor="payRate" className="text-foreground">
                  Hourly Rate ($/hr) *
                </Label>
                <Input
                  id="payRate"
                  type="number"
                  required
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
                <div className="mt-2 text-xs text-muted-foreground">
                  <div>Duration (Hours): {durationHours != null ? durationHours : '—'}</div>
                  <div>
                    Estimated Total: {estimatedTotal != null ? `$${estimatedTotal.toFixed(2)}` : '—'}{' '}
                    <span className="opacity-80">(Hourly Rate × Duration)</span>
                  </div>
                </div>
              </div>

              {/* Uniform / Compliance / Pax */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="uniformRequirements" className="text-foreground">
                    Uniform Requirements
                  </Label>
                  <Input
                    id="uniformRequirements"
                    value={formData.uniformRequirements}
                    onChange={(e) => handleChange('uniformRequirements', e.target.value)}
                    placeholder="e.g., Black shirt, enclosed shoes"
                  />
                </div>

                <div>
                  <Label htmlFor="expectedPax" className="text-foreground">
                    Expected Pax (optional)
                  </Label>
                  <Input
                    id="expectedPax"
                    type="number"
                    min="0"
                    value={formData.expectedPax}
                    onChange={(e) => handleChange('expectedPax', e.target.value)}
                    placeholder="e.g., 120"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rsaRequired"
                  checked={!!formData.rsaRequired}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, rsaRequired: checked === true }))
                  }
                />
                <Label htmlFor="rsaRequired" className="text-foreground cursor-pointer">
                  RSA Required
                </Label>
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location" className="text-foreground">
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
                <p className="text-xs text-muted-foreground mt-1">
                  Enter full address or city, state format
                </p>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-foreground">
                  Description *
                </Label>
                <Textarea
                  id="description"
                  required
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe the shift requirements (e.g., busy service, venue type, duties)."
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

