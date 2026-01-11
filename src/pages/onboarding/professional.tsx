import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LocationInput } from '@/components/ui/location-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';
import { apiRequest } from '@/lib/queryClient';
import { SEO } from '@/components/seo/SEO';
import { User } from 'lucide-react';

export default function ProfessionalOnboardingPage() {
  const { user, refreshUser, login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    location: user?.location || '',
    profession: 'Staff', // Default profession
    bio: user?.bio || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const response = await apiRequest('POST', '/api/users/role', {
        role: 'professional',
        shopName: formData.displayName, // Reusing shopName field to pass display name update
        location: formData.location,
        description: `${formData.profession}\n\n${formData.bio}`, // Combine profession and bio
      });

      if (!response.ok) {
         // Try to parse error
         try {
             const error = await response.json();
             throw new Error(error.message || 'Failed to create professional profile');
         } catch (e) {
             if (e instanceof Error) {
               throw e;
             }
             throw new Error('Failed to create professional profile');
         }
      }

      toast({
        title: "Pro Profile Created",
        description: "Your profile has been successfully updated.",
        variant: "default",
      });

      const updatedUser = await response.json();

      // Manually update user state with response to ensure immediate UI update
      if (login && updatedUser) {
        login({
          ...updatedUser,
          createdAt: updatedUser.createdAt ? new Date(updatedUser.createdAt) : new Date(),
          updatedAt: updatedUser.updatedAt ? new Date(updatedUser.updatedAt) : new Date(),
        });
      }

      // Force token refresh to get updated claims/roles
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }

      if (refreshUser) {
        await refreshUser();
      }
      
      // Redirect to professional dashboard
      navigate('/professional-dashboard');

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

  return (
    <>
      <SEO
        title="Create Pro Profile"
        description="Setup your pro profile on HospoGo."
        url="/onboarding/professional"
      />
      <div className="min-h-screen bg-gradient-to-br from-steel-50 to-steel-100 flex items-center justify-center p-4">
        <div className="w-full max-w-xl">
          <Card className="card-chrome">
            <CardHeader className="text-center">
               <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
                  <User className="h-6 w-6 text-white" />
               </div>
              <CardTitle className="text-2xl text-steel-900">Create Pro Profile</CardTitle>
              <CardDescription>
                Tell us about yourself to start finding work
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-steel-700">Display Name *</Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleChange}
                    placeholder="e.g. John Doe"
                    required
                    className="bg-card"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profession" className="text-steel-700">Profession *</Label>
                  <Input
                    id="profession"
                    name="profession"
                    value={formData.profession}
                    onChange={handleChange}
                    placeholder="e.g. Staff, Bartender, etc."
                    required
                    className="bg-card"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-steel-700">Location *</Label>
                  <LocationInput
                    value={formData.location}
                    onChange={(val) => setFormData(prev => ({ ...prev, location: val }))}
                    placeholder="City, State or Address"
                    className="bg-card"
                  />
                  <p className="text-xs text-steel-500">
                    This helps us show you relevant job opportunities.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-steel-700">Bio / Experience</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Tell us about your experience..."
                    rows={4}
                    className="bg-card"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating Profile...' : 'Create Pro Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

