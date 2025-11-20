import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, Edit } from "lucide-react";
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
  const { user: currentUser } = useAuth();
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

  const { data: profile = mockProfile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profiles", profileUserId],
    enabled: !!profileUserId,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: UserProfile) => {
      const response = await apiRequest("PUT", `/api/profiles/${profileUserId}`, profileData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profileUserId] });
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
    <div>
      {viewMode === 'view' ? (
        <div>
          <PublicProfile 
            profile={profile}
            isOwnProfile={isOwnProfile}
            onEditProfile={isOwnProfile ? () => setViewMode('edit') : undefined}
          />
        </div>
      ) : (
        <ProfileEditForm
          profile={profile}
          onSave={handleSaveProfile}
          onCancel={() => setViewMode('view')}
          isSaving={updateProfileMutation.isPending}
        />
      )}
    </div>
  );
}