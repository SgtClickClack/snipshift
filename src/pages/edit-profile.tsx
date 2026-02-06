import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LocationInput } from '@/components/ui/location-input';
import { useToast } from '@/hooks/useToast';
import { updateUserProfile } from '@/lib/api';
import { ImageUpload } from '@/components/ui/image-upload';
import { AlertTriangle } from 'lucide-react';

export default function EditProfilePage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const getUserString = (value: unknown) => (typeof value === 'string' ? value : '');
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    phone: '',
    location: '',
    avatarUrl: '',
  });

  // Pre-fill form with user data
  useEffect(() => {
    if (user) {
      const displayName = getUserString(user.displayName ?? user.name);
      const bio = getUserString(user.bio);
      const phone = getUserString(user.phone);
      const location = getUserString(user.location);
      const avatarUrl = getUserString(user.avatarUrl ?? user.photoURL);
      setFormData({
        displayName,
        bio,
        phone,
        location,
        avatarUrl,
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateUserProfile(formData);
      
      // Refresh user context to get updated data
      if (refreshUser) {
        await refreshUser();
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
        variant: "default", // Assuming default is green/success or use standard toast
      });

      // Redirect back to dashboard
      navigate('/user-dashboard');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-steel-900">Edit Profile</h1>
          <p className="text-steel-600 mt-2">Update your personal information</p>
        </header>

        <Card className="card-chrome">
          <CardHeader>
            <CardTitle className="text-xl text-steel-900">Profile Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar Upload */}
              <div className="space-y-2">
                <Label className="text-steel-700">Profile Picture</Label>
                {user?.id && (
                  <ImageUpload
                    currentImageUrl={formData.avatarUrl}
                    onUploadComplete={(url) => {
                      setFormData(prev => ({ ...prev, avatarUrl: url }));
                      toast({
                        title: "Image uploaded",
                        description: "Your profile picture has been updated.",
                      });
                    }}
                    onUploadError={(error) => {
                      toast({
                        title: "Upload failed",
                        description: error.message || "Failed to upload image.",
                        variant: "destructive",
                      });
                    }}
                    pathPrefix="users"
                    entityId={user.id}
                    fileName="avatar"
                    shape="circle"
                    maxSize={5 * 1024 * 1024} // 5MB
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-steel-700">Display Name</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  placeholder="Your Name"
                  className="bg-card border-border focus:border-primary focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-steel-700">Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell us about yourself..."
                  className="bg-card border-border focus:border-primary focus:ring-primary min-h-24"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-steel-700">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  className="bg-card border-border focus:border-primary focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-steel-700">Location</Label>
                <LocationInput
                  value={formData.location}
                  onChange={(val) => setFormData(prev => ({ ...prev, location: val }))}
                  placeholder="City, State"
                  className="bg-card border-border focus:border-primary focus:ring-primary"
                />
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/user-dashboard')}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-primary/90 text-white steel-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Danger Zone - Account Deletion */}
        <Card className="card-chrome border-red-200 dark:border-red-900 mt-8">
          <CardHeader className="border-b border-red-100 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <CardTitle className="text-xl text-red-700 dark:text-red-400">Danger Zone</CardTitle>
            </div>
            <CardDescription className="text-red-600/80 dark:text-red-400/80">
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-medium text-steel-900 dark:text-steel-100">Delete Account</h3>
                <p className="text-sm text-steel-600 dark:text-steel-400 mt-1">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white shrink-0"
                onClick={() => {
                  const confirmed = window.confirm(
                    'Are you sure you want to delete your account?\n\n' +
                    'To proceed with account deletion, please contact our support team at:\n\n' +
                    'support@hospogo.com\n\n' +
                    'Our team will verify your identity and process your request within 48 hours.'
                  );
                  if (confirmed) {
                    toast({
                      title: "Deletion Request",
                      description: "Please email support@hospogo.com to complete your account deletion request.",
                      variant: "default",
                    });
                  }
                }}
                data-testid="button-delete-account"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

