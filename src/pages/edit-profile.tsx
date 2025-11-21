import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from '@/lib/api';
import { ImageUpload } from '@/components/ui/image-upload';

export default function EditProfilePage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
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
      setFormData({
        displayName: user.displayName || user.name || '',
        bio: user.bio || '',
        phone: user.phone || '',
        location: user.location || '',
        avatarUrl: user.avatarUrl || user.photoURL || '',
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
                {user && (
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
                  className="bg-white border-steel-200 focus:border-primary focus:ring-primary"
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
                  className="bg-white border-steel-200 focus:border-primary focus:ring-primary min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-steel-700">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  className="bg-white border-steel-200 focus:border-primary focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-steel-700">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="City, State"
                  className="bg-white border-steel-200 focus:border-primary focus:ring-primary"
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
      </div>
    </div>
  );
}

