import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@shared/firebase-schema';
import { Save, Plus, X, MapPin, Phone, Globe, Award, Star } from 'lucide-react';

interface ProfileFormProps {
  onSave?: (profileData: any) => void;
}

export default function ProfileForm({ onSave }: ProfileFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    phone: '',
    website: '',
    bio: '',
    // Hub-specific fields
    businessName: '',
    address: {
      street: '',
      city: '',
      state: '',
      postcode: '',
      country: 'United States'
    },
    businessType: 'barbershop' as 'barbershop' | 'salon' | 'spa' | 'other',
    operatingHours: {
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
      wednesday: { open: '09:00', close: '18:00' },
      thursday: { open: '09:00', close: '18:00' },
      friday: { open: '09:00', close: '18:00' },
      saturday: { open: '09:00', close: '17:00' },
      sunday: { open: '', close: '' }
    },
    // Professional-specific fields
    skills: [] as string[],
    newSkill: '',
    experience: '',
    isVerified: false,
    certifications: [] as Array<{ type: string; issuer: string; date: string }>,
    homeLocation: {
      city: '',
      state: '',
      country: 'United States'
    },
    isRoamingNomad: false,
    preferredRegions: [] as string[],
    // Brand-specific fields
    companyName: '',
    description: '',
    productCategories: [] as string[],
    // Trainer-specific fields
    qualifications: [] as string[],
    specializations: [] as string[],
    yearsExperience: 0,
    trainingLocation: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Here you would typically save to your backend
      // console.log('Saving profile data:', formData);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
      
      setIsEditing(false);
      onSave?.(formData);
    } catch (error) {
      toast({
        title: "Failed to update profile",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addSkill = () => {
    if (formData.newSkill && !formData.skills.includes(formData.newSkill)) {
      setFormData({
        ...formData,
        skills: [...formData.skills, formData.newSkill],
        newSkill: ''
      });
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(skill => skill !== skillToRemove)
    });
  };

  const renderBasicFields = () => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            disabled={!isEditing}
            data-testid="input-display-name"
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={true} // Email typically shouldn't be editable
            data-testid="input-email"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            disabled={!isEditing}
            placeholder="+1 (555) 123-4567"
            data-testid="input-phone"
          />
        </div>
        <div>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            disabled={!isEditing}
            placeholder="https://yourwebsite.com"
            data-testid="input-website"
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          disabled={!isEditing}
          placeholder="Tell us about yourself..."
          rows={3}
          data-testid="textarea-bio"
        />
      </div>
    </>
  );

  const renderHubFields = () => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="businessName">Business Name</Label>
          <Input
            id="businessName"
            value={formData.businessName}
            onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            disabled={!isEditing}
            placeholder="Your Business Name"
            data-testid="input-business-name"
          />
        </div>
        <div>
          <Label htmlFor="businessType">Business Type</Label>
          <Select
            value={formData.businessType}
            onValueChange={(value) => setFormData({ ...formData, businessType: value as any })}
            disabled={!isEditing}
          >
            <SelectTrigger id="businessType" className="w-full" data-testid="select-business-type">
              <SelectValue placeholder="Select business type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="barbershop">Barbershop</SelectItem>
              <SelectItem value="salon">Hair Salon</SelectItem>
              <SelectItem value="spa">Spa</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label>Business Address</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Input
            placeholder="Street Address"
            value={formData.address.street}
            onChange={(e) => setFormData({ 
              ...formData, 
              address: { ...formData.address, street: e.target.value }
            })}
            disabled={!isEditing}
            data-testid="input-street"
          />
          <Input
            placeholder="City"
            value={formData.address.city}
            onChange={(e) => setFormData({ 
              ...formData, 
              address: { ...formData.address, city: e.target.value }
            })}
            disabled={!isEditing}
            data-testid="input-city"
          />
          <Input
            placeholder="State"
            value={formData.address.state}
            onChange={(e) => setFormData({ 
              ...formData, 
              address: { ...formData.address, state: e.target.value }
            })}
            disabled={!isEditing}
            data-testid="input-state"
          />
          <Input
            placeholder="Postcode"
            value={formData.address.postcode}
            onChange={(e) => setFormData({ 
              ...formData, 
              address: { ...formData.address, postcode: e.target.value }
            })}
            disabled={!isEditing}
            data-testid="input-postcode"
          />
        </div>
      </div>
    </>
  );

  const renderProfessionalFields = () => (
    <>
      <div>
        <Label>Skills & Expertise</Label>
        <div className="flex flex-wrap gap-2 mt-2 mb-2">
          {formData.skills.map((skill, index) => (
            <Badge key={`${skill}-${index}`} variant="secondary" className="flex items-center gap-1" data-testid={`skill-${index}`}>
              {skill}
              {isEditing && (
                <button
                  onClick={() => removeSkill(skill)}
                  className="ml-1 text-xs hover:text-destructive"
                  data-testid={`remove-skill-${index}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
        {isEditing && (
          <div className="flex gap-2">
            <Input
              placeholder="Add a skill..."
              value={formData.newSkill}
              onChange={(e) => setFormData({ ...formData, newSkill: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              data-testid="input-new-skill"
            />
            <Button type="button" onClick={addSkill} size="sm" data-testid="button-add-skill">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      <div>
        <Label htmlFor="experience">Experience</Label>
        <Textarea
          id="experience"
          value={formData.experience}
          onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
          disabled={!isEditing}
          placeholder="Describe your professional experience..."
          rows={3}
          data-testid="textarea-experience"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="homeCity">Home Location</Label>
          <Input
            id="homeCity"
            value={formData.homeLocation.city}
            onChange={(e) => setFormData({ 
              ...formData, 
              homeLocation: { ...formData.homeLocation, city: e.target.value }
            })}
            disabled={!isEditing}
            placeholder="City, State"
            data-testid="input-home-location"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isRoamingNomad"
            checked={formData.isRoamingNomad}
            onCheckedChange={(checked) => setFormData({ ...formData, isRoamingNomad: checked as boolean })}
            disabled={!isEditing}
            data-testid="checkbox-roaming-nomad"
          />
          <Label htmlFor="isRoamingNomad">Available for travel work</Label>
        </div>
      </div>
    </>
  );

  const renderBrandFields = () => (
    <>
      <div>
        <Label htmlFor="companyName">Company Name</Label>
        <Input
          id="companyName"
          value={formData.companyName}
          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
          disabled={!isEditing}
          placeholder="Your Company Name"
          data-testid="input-company-name"
        />
      </div>
      
      <div>
        <Label htmlFor="description">Company Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          disabled={!isEditing}
          placeholder="Describe your company and products..."
          rows={3}
          data-testid="textarea-description"
        />
      </div>
    </>
  );

  const renderTrainerFields = () => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="yearsExperience">Years of Experience</Label>
          <Input
            id="yearsExperience"
            type="number"
            value={formData.yearsExperience}
            onChange={(e) => setFormData({ ...formData, yearsExperience: parseInt(e.target.value) || 0 })}
            disabled={!isEditing}
            min="0"
            data-testid="input-years-experience"
          />
        </div>
        <div>
          <Label htmlFor="trainingLocation">Training Location</Label>
          <Input
            id="trainingLocation"
            value={formData.trainingLocation}
            onChange={(e) => setFormData({ ...formData, trainingLocation: e.target.value })}
            disabled={!isEditing}
            placeholder="City, State or Online"
            data-testid="input-training-location"
          />
        </div>
      </div>
    </>
  );

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            My Profile
          </CardTitle>
          <div className="flex gap-2">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} variant="outline" data-testid="button-edit-profile">
                Edit Profile
              </Button>
            ) : (
              <>
                <Button onClick={() => setIsEditing(false)} variant="outline" data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isLoading} data-testid="button-save-profile">
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Save'}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {renderBasicFields()}
          
          {user.currentRole === 'hub' && renderHubFields()}
          {user.currentRole === 'professional' && renderProfessionalFields()}
          {user.currentRole === 'brand' && renderBrandFields()}
          {user.currentRole === 'trainer' && renderTrainerFields()}
        </form>
      </CardContent>
    </Card>
  );
}