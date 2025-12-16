import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import PublicProfile from "./public-profile";
import ProfileEditForm from "./profile-edit-form";

interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  role: "professional" | "hub" | "brand" | "trainer";
  bio?: string;
  profileImageURL?: string;
  bannerImageURL?: string;
  location?: {
    city: string;
    state: string;
  };
  portfolio?: Array<{
    id: string;
    imageURL: string;
    caption: string;
    category?: string;
  }>;
  skills?: string[];
  services?: string[];
  experience?: string;
  rating?: number;
  reviewCount?: number;
  joinedDate?: string;
  verified?: boolean;
  businessName?: string;
  businessDescription?: string;
  teamMembers?: Array<{
    name: string;
    role: string;
    imageURL?: string;
  }>;
  operatingHours?: {
    [key: string]: { open: string; close: string };
  };
}

interface IntegratedProfileSystemProps {
  userId?: string; // If provided, shows another user's profile (public view only)
}

export default function IntegratedProfileSystem({ userId }: IntegratedProfileSystemProps) {
  const { user: currentUser, refreshUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'view' | 'edit'>('view');
  
  const isOwnProfile = !userId || userId === currentUser?.id;
  const profileUserId = userId || currentUser?.id;

  // Mock profile data - in real app would come from API
  const mockProfile: UserProfile = {
    id: profileUserId!,
    displayName: currentUser?.displayName || "John Doe",
    email: currentUser?.email || "john@example.com",
    role: (currentUser?.currentRole as any) || "professional",
    bio: "Passionate barber with 8+ years of experience specializing in modern cuts and classic styles. Always learning new techniques and staying up-to-date with the latest trends.",
    profileImageURL: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    bannerImageURL: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&h=300&fit=crop",
    location: {
      city: "Sydney",
      state: "NSW"
    },
    portfolio: [
      {
        id: "1",
        imageURL: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=400&fit=crop",
        caption: "Modern fade with textured top",
        category: "Hair Cut"
      },
      {
        id: "2", 
        imageURL: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=400&fit=crop",
        caption: "Classic beard trim and style",
        category: "Beard"
      },
      {
        id: "3",
        imageURL: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=400&fit=crop",
        caption: "Wedding day special styling",
        category: "Special Event"
      }
    ],
    skills: ["Hair Cutting", "Beard Trimming", "Hair Styling", "Color", "Scissor Work", "Razor Work"],
    experience: "8+ years",
    rating: 4.8,
    reviewCount: 127,
    joinedDate: new Date(2020, 2, 15).toISOString(),
    verified: true
  };

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/users", profileUserId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/users/${profileUserId}`);
      const userData = await res.json();
      
      // Transform API user data to UserProfile format
      return {
        id: userData.id,
        displayName: userData.displayName || userData.name,
        email: userData.email,
        role: userData.role,
        bio: userData.bio || "",
        profileImageURL: userData.avatarUrl || "", // Check if API returns avatarUrl or profileImageURL
        bannerImageURL: userData.bannerUrl || "", // Include bannerUrl from API
        location: userData.location ? { 
          city: userData.location.split(',')[0]?.trim() || "", 
          state: userData.location.split(',')[1]?.trim() || "" 
        } : undefined,
        // Mock portfolio/skills for now as they aren't in the main user table yet
        portfolio: mockProfile.portfolio,
        skills: mockProfile.skills,
        rating: userData.averageRating || 0,
        reviewCount: userData.reviewCount || 0,
        joinedDate: userData.joinedDate || new Date().toISOString(),
        verified: userData.verified || false,
      };
    },
    enabled: !!profileUserId,
    initialData: isOwnProfile ? undefined : mockProfile, // Use mock data initially for public view if desired, or undefined
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: UserProfile) => {
      // Transform profile data to match backend /api/me endpoint expectations
      // IMPORTANT: Only send URL fields if they contain valid URLs
      // This prevents accidental overwrites when the form has stale/empty values
      const avatarUrl = profileData.profileImageURL && profileData.profileImageURL.startsWith('http') 
        ? profileData.profileImageURL 
        : undefined;
      const bannerUrl = profileData.bannerImageURL && profileData.bannerImageURL.startsWith('http') 
        ? profileData.bannerImageURL 
        : undefined;
      
      const payload = {
        displayName: profileData.displayName,
        bio: profileData.bio,
        location: profileData.location 
          ? `${profileData.location.city}, ${profileData.location.state}` 
          : undefined,
        avatarUrl,
        bannerUrl,
        // Note: phone is not in UserProfile interface, but backend accepts it
      };
      const response = await apiRequest("PUT", `/api/me`, payload);
      return response.json();
    },
    onSuccess: async () => {
      // Invalidate profile queries
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profileUserId] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", profileUserId] });
      // Refresh user in AuthContext to update navbar immediately
      if (isOwnProfile) {
        await refreshUser();
      }
      toast({
        title: "Profile updated successfully",
        description: "Your changes have been saved",
      });
      setViewMode('view');
    },
    onError: () => {
      toast({
        title: "Failed to update profile",
        description: "Please try again later",
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = (updatedProfile: UserProfile) => {
    updateProfileMutation.mutate(updatedProfile);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      {viewMode === 'view' ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-card rounded-lg border border-border shadow-sm">
            <CardContent className="p-0">
              <PublicProfile 
                profile={profile}
                isOwnProfile={isOwnProfile}
                onEditProfile={isOwnProfile ? () => setViewMode('edit') : undefined}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-card rounded-lg border border-border shadow-sm">
             <CardContent className="p-6">
               <ProfileEditForm
                 profile={profile}
                 onSave={handleSaveProfile}
                 onCancel={() => setViewMode('view')}
                 isSaving={updateProfileMutation.isPending}
               />
             </CardContent>
           </Card>
        </div>
      )}
    </div>
  );
}