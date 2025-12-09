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
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { SEO } from '@/components/seo/SEO';
import { Building2 } from 'lucide-react';

export default function HubOnboardingPage() {
  const { user, refreshUser, login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    shopName: '',
    location: '',
    description: '',
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
        role: 'hub',
        shopName: formData.shopName,
        location: formData.location,
        description: formData.description,
      });

      if (!response.ok) {
         // Try to parse error
         try {
             const error = await response.json();
             throw new Error(error.message || 'Failed to create shop profile');
         } catch (e) {
             if (e instanceof Error) {
               throw e;
             }
             throw new Error('Failed to create shop profile');
         }
      }

      toast({
        title: "Shop Profile Created",
        description: "Your shop has been successfully registered.",
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
      
      // Redirect to hub dashboard
      navigate('/hub-dashboard');

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
        title="Create Shop Profile"
        description="Register your shop on SnipShift."
        url="/onboarding/hub"
      />
      <div className="min-h-screen bg-gradient-to-br from-steel-50 to-steel-100 flex items-center justify-center p-4">
        <div className="w-full max-w-xl">
          <Card className="card-chrome">
            <CardHeader className="text-center">
               <div className="mx-auto w-12 h-12 bg-red-accent rounded-full flex items-center justify-center mb-4">
                  <Building2 className="h-6 w-6 text-white" />
               </div>
              <CardTitle className="text-2xl text-steel-900">Create Shop Profile</CardTitle>
              <CardDescription>
                Tell us about your business to start hiring professionals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="shopName" className="text-steel-700">Shop Name *</Label>
                  <Input
                    id="shopName"
                    name="shopName"
                    value={formData.shopName}
                    onChange={handleChange}
                    placeholder="e.g. Elite Cuts"
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
                    Use a generic location like "Downtown Metro" or full address.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-steel-700">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Briefly describe your shop..."
                    rows={4}
                    className="bg-card"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-red-accent hover:bg-red-accent-hover text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating Profile...' : 'Create Shop Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

