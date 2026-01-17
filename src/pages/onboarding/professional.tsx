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
    city: '',
    state: '',
  });

  // Set onboarding state lock when entering professional onboarding flow
  React.useEffect(() => {
    // Set currentRole and onboarding_in_progress flag in localStorage
    localStorage.setItem('currentRole', 'professional');
    localStorage.setItem('onboarding_in_progress', 'true');
    
    // Cleanup: remove flag when component unmounts (onboarding completed or cancelled)
    return () => {
      // Only clear if we're navigating away (not during submission)
      if (!isSubmitting) {
        localStorage.removeItem('onboarding_in_progress');
      }
    };
  }, [isSubmitting]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBlur = () => {
    // No-op handler for bio textarea
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Force refresh the Firebase ID token BEFORE the API call to avoid 401 errors.
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }

      const response = await apiRequest('POST', '/api/users/role', {
        role: 'professional',
        shopName: formData.displayName, // API expects shopName for backward compatibility (used for display name)
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

      // CRITICAL: Ensure the API response has the correct structure
      // The API should return currentRole, but we'll set it explicitly to be safe
      const userWithRole = {
        ...updatedUser,
        currentRole: (updatedUser.currentRole || updatedUser.role || 'professional') as const,
        isOnboarded: updatedUser.isOnboarded ?? true, // Ensure isOnboarded is set to true
        roles: updatedUser.roles || ['professional'], // Ensure roles array is set
        createdAt: updatedUser.createdAt ? new Date(updatedUser.createdAt) : new Date(),
        updatedAt: updatedUser.updatedAt ? new Date(updatedUser.updatedAt) : new Date(),
      };

      // Validate that we have the required fields
      if (!userWithRole.currentRole || userWithRole.currentRole === 'client') {
        console.error('Professional onboarding: API did not return valid currentRole', updatedUser);
        throw new Error('Failed to set professional role. Please try again.');
      }

      // Manually update user state with response to ensure immediate UI update
      // This must happen BEFORE any redirects to prevent guard interference
      if (login && userWithRole) {
        login(userWithRole);
      }

      // Force token refresh to get updated claims/roles
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }

      // CRITICAL: Wait for state to propagate and verify it's set correctly
      // We need to ensure React has processed the state update before navigation
      await new Promise(resolve => setTimeout(resolve, 300));

      // Clear onboarding_in_progress flag now that onboarding is complete
      localStorage.removeItem('onboarding_in_progress');
      // Keep currentRole in localStorage for AuthGuard reference
      localStorage.setItem('currentRole', 'professional');

      // DO NOT call refreshUser() here - it triggers handleRedirect with force:true
      // which bypasses onboarding protection and causes redirect loops
      // We already have the updated user state from the API response via login()
      
      // Redirect to professional dashboard - state is now fully updated
      navigate('/professional-dashboard', { replace: true });

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
               <div className="mx-auto w-12 h-12 bg-brand-neon rounded-full flex items-center justify-center mb-4 shadow-neon-realistic">
                  <User className="h-6 w-6 text-brand-dark" />
               </div>
              <CardTitle className="text-2xl text-white font-semibold">Create Pro Profile</CardTitle>
              <CardDescription className="text-steel-200">
                Tell us about yourself to start finding work
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-steel-200 font-medium">Display Name *</Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleChange}
                    placeholder="e.g. John Doe"
                    required
                    className="bg-card text-foreground placeholder:text-steel-400 focus-visible:ring-brand-neon focus-visible:border-brand-neon"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profession" className="text-steel-200 font-medium">Profession *</Label>
                  <Input
                    id="profession"
                    name="profession"
                    value={formData.profession}
                    onChange={handleChange}
                    placeholder="e.g. Staff, Bartender, etc."
                    required
                    className="bg-card text-foreground placeholder:text-steel-400 focus-visible:ring-brand-neon focus-visible:border-brand-neon"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-steel-200 font-medium">Location *</Label>
                  <LocationInput
                    value={formData.location}
                    onChange={(val) => setFormData(prev => ({ ...prev, location: val }))}
                    onSelect={(location) => {
                      setFormData(prev => ({
                        ...prev,
                        location: location.address,
                        city: location.city || '',
                        state: location.state || '',
                      }));
                    }}
                    placeholder="Start typing a city or address..."
                    className="bg-card text-foreground placeholder:text-steel-400"
                  />
                  <p className="text-xs text-steel-400">
                    Select a location from the suggestions as you type.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-steel-200 font-medium">Bio / Experience</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Tell us about your experience..."
                    rows={4}
                    className="bg-card text-foreground placeholder:text-steel-500/80"
                  />
                </div>

                <Button 
                  type="submit" 
                  variant="accent"
                  className="w-full shadow-neon-realistic hover:shadow-[0_0_8px_rgba(186,255,57,1),0_0_20px_rgba(186,255,57,0.6),0_0_35px_rgba(186,255,57,0.3)] transition-shadow duration-300"
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

