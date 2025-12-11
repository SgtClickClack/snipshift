import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Share2, TrendingUp, Users, Eye, MessageCircle, Heart, Edit, Trash, Tag, Calendar, Globe, Loader2, User } from "lucide-react";
import { format } from "date-fns";
import { OptimizedImage } from "@/components/ui/optimized-image";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import ProfileHeader from "@/components/profile/profile-header";
import { SEO } from "@/components/seo/SEO";

interface SocialPost {
  id: string;
  authorId: string;
  postType: "offer" | "event" | "announcement" | "product" | "discount";
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  status: "pending" | "approved" | "rejected";
  likes: number;
  comments: any[];
  discountCode?: string;
  discountPercentage?: number;
  validUntil?: string;
  createdAt: string;
}

interface PostFormData {
  postType: "offer" | "event" | "announcement" | "product" | "discount";
  content: string;
  imageUrl: string;
  linkUrl: string;
  discountCode: string;
  discountPercentage: number;
  validUntil: string;
}

export default function BrandDashboard() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<'overview' | 'posts' | 'profile'>('overview');
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  
  const [formData, setFormData] = useState<PostFormData>({
    postType: "product",
    content: "",
    imageUrl: "",
    linkUrl: "",
    discountCode: "",
    discountPercentage: 0,
    validUntil: ""
  });

  const [profileData, setProfileData] = useState({
    displayName: "",
    bio: "",
    website: "",
    avatarUrl: "",
    bannerUrl: ""
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    if (user && !isEditingProfile) {
      // Only sync from user when not editing to avoid overwriting local changes
      setProfileData({
        displayName: user.displayName || user.companyName || "",
        bio: user.bio || user.description || "",
        website: user.website || "",
        avatarUrl: user.avatarUrl || user.photoURL || user.profileImageURL || user.profileImage || "",
        bannerUrl: user.bannerUrl || user.bannerImage || ""
      });
    }
  }, [user, isEditingProfile]);

  // Sync bannerUrl when user.bannerUrl changes (e.g., after a refetch or upload)
  // This runs even when editing to ensure the preview updates
  useEffect(() => {
    if (user?.bannerUrl) {
      const extractedBannerUrl = typeof user.bannerUrl === 'string' 
        ? user.bannerUrl 
        : (user.bannerUrl as any)?.bannerUrl || (user.bannerUrl as any)?.url || null;
      
      if (extractedBannerUrl && extractedBannerUrl !== profileData.bannerUrl) {
        console.log('BrandDashboard - Syncing bannerUrl from user prop:', extractedBannerUrl);
        setProfileData(prev => ({ ...prev, bannerUrl: extractedBannerUrl }));
      }
    }
  }, [user?.bannerUrl]);

  // Sync avatarUrl when user.avatarUrl changes (e.g., after a refetch or upload)
  // This runs even when editing to ensure the preview updates
  useEffect(() => {
    if (user) {
      const avatarUrl = user.avatarUrl || user.photoURL || user.profileImageURL || user.profileImage || '';
      if (avatarUrl && avatarUrl !== profileData.avatarUrl) {
        console.log('BrandDashboard - Syncing avatarUrl from user prop:', avatarUrl);
        setProfileData(prev => ({ ...prev, avatarUrl }));
      }
    }
  }, [user?.avatarUrl, user?.profileImageURL, user?.profileImage]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      const res = await apiRequest("PUT", "/api/me", data);
      return res.json();
    },
    onSuccess: async () => {
      toast({
        title: "Profile updated successfully",
        description: "Your brand profile information has been updated."
      });
      await refreshUser();
      setIsEditingProfile(false);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Could not update profile information",
        variant: "destructive"
      });
    }
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const { data: posts = [], isLoading } = useQuery<SocialPost[]>({
    queryKey: ["/api/social-posts", user?.id],
    enabled: !!user?.id,
  });

  const createPostMutation = useMutation({
    mutationFn: async (postData: any) => {
      const response = await apiRequest("POST", "/api/social-posts", postData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Post submitted successfully!",
        description: "Your post is pending approval and will be visible once approved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/social-posts"] });
      setShowPostModal(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Failed to create post",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      postType: "product",
      content: "",
      imageUrl: "",
      linkUrl: "",
      discountCode: "",
      discountPercentage: 0,
      validUntil: ""
    });
    setEditingPost(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.content) {
      toast({
        title: "Missing required fields",
        description: "Please add content for your post.",
        variant: "destructive",
      });
      return;
    }

    const postData = {
      ...formData,
      authorId: user?.id,
      authorRole: "brand",
      status: "pending",
      likes: 0,
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    createPostMutation.mutate(postData);
  };

  // Mock stats
  const stats = {
    totalPosts: posts.length,
    approvedPosts: posts.filter(p => p.status === "approved").length,
    totalLikes: posts.reduce((sum, post) => sum + post.likes, 0),
    totalEngagement: posts.reduce((sum, post) => sum + post.likes + post.comments.length, 0)
  };

  if (!user || user.currentRole !== "brand") {
    return <div>Access denied</div>;
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO title="Brand Dashboard" />
      
      {/* Banner/Profile Header with editable banner and avatar upload */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardHeader
          user={user}
          business={null}
          title={user?.name || user?.displayName || "Brand Dashboard"}
          subtitle="Manage your brand presence"
          isBrand={true}
        />
      </div>

      {/* Dashboard Header with Actions */}
      <div className="bg-card/95 backdrop-blur-sm shadow-lg border-b-2 border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Brand Dashboard</h1>
              <p className="text-muted-foreground">{user.displayName || user.email}</p>
            </div>
            <Button 
              onClick={() => setShowPostModal(true)}
              className="bg-primary hover:bg-blue-700"
              data-testid="button-create-post"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Post
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="border-b border-neutral-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'posts', label: 'Social Posts', icon: Share2 },
              { id: 'profile', label: 'Profile', icon: Globe },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeView === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="mr-2 h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Overview Tab */}
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Share2 className="h-8 w-8 text-primary" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-neutral-600">Total Posts</p>
                      <p className="text-2xl font-bold text-neutral-900" data-testid="stat-total-posts">
                        {stats.totalPosts}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Eye className="h-8 w-8 text-success" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-neutral-600">Approved Posts</p>
                      <p className="text-2xl font-bold text-neutral-900" data-testid="stat-approved-posts">
                        {stats.approvedPosts}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Heart className="h-8 w-8 text-red-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-neutral-600">Total Likes</p>
                      <p className="text-2xl font-bold text-neutral-900" data-testid="stat-total-likes">
                        {stats.totalLikes}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-warning" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-neutral-600">Engagement</p>
                      <p className="text-2xl font-bold text-neutral-900" data-testid="stat-engagement">
                        {stats.totalEngagement}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button
                    onClick={() => setShowPostModal(true)}
                    variant="outline"
                    className="h-20 flex flex-col"
                    data-testid="quick-action-create-post"
                  >
                    <Plus className="h-6 w-6 mb-2" />
                    Create New Post
                  </Button>
                  <Button
                    onClick={() => setActiveView('posts')}
                    variant="outline"
                    className="h-20 flex flex-col"
                    data-testid="quick-action-manage-posts"
                  >
                    <Edit className="h-6 w-6 mb-2" />
                    Manage Posts
                  </Button>
                  <Button
                    onClick={() => setActiveView('profile')}
                    variant="outline"
                    className="h-20 flex flex-col"
                    data-testid="quick-action-update-profile"
                  >
                    <Globe className="h-6 w-6 mb-2" />
                    Update Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Posts Tab */}
        {activeView === 'posts' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Social Posts</h2>
              <Button onClick={() => setShowPostModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Post
              </Button>
            </div>

            {isLoading ? (
              <div data-testid="text-loading">Loading posts...</div>
            ) : posts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Share2 className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                  <p className="text-neutral-600 mb-4" data-testid="text-no-posts">
                    No posts created yet.
                  </p>
                  <Button onClick={() => setShowPostModal(true)}>
                    Create Your First Post
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <Card key={post.id} className="overflow-hidden" data-testid={`post-card-${post.id}`}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant={post.postType === 'discount' ? 'default' : 'outline'}
                            data-testid={`post-type-${post.id}`}
                          >
                            {post.postType}
                          </Badge>
                          <Badge 
                            variant={
                              post.status === 'approved' ? 'default' : 
                              post.status === 'rejected' ? 'destructive' : 'secondary'
                            }
                            data-testid={`post-status-${post.id}`}
                          >
                            {post.status}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-neutral-900 mb-4" data-testid={`post-content-${post.id}`}>
                        {post.content}
                      </p>

                      {post.imageUrl && (
                        <div className="mb-4">
                          <OptimizedImage 
                            src={post.imageUrl} 
                            alt="Post image"
                            fallbackType="image"
                            className="rounded-lg max-w-full h-48 object-cover"
                            containerClassName="w-full"
                          />
                        </div>
                      )}

                      {post.discountCode && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-red-600" />
                            <span className="font-medium text-red-800">
                              Discount: {post.discountCode} ({post.discountPercentage}% off)
                            </span>
                          </div>
                          {post.validUntil && (
                            <p className="text-sm text-red-600 mt-1">
                              Valid until: {format(new Date(post.validUntil), "MMM d, yyyy")}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex justify-between items-center text-sm text-neutral-500">
                        <span data-testid={`post-date-${post.id}`}>
                          {format(new Date(post.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Heart className="h-4 w-4" />
                            {post.likes}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-4 w-4" />
                            {post.comments.length}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeView === 'profile' && (
          <div className="w-full max-w-4xl">
            <Card className="bg-card rounded-lg border border-border shadow-sm">
              <CardContent className="p-0">
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  {/* Profile Header with Banner and Avatar */}
                  <div className="relative w-full max-w-full overflow-hidden z-0">
                    <ProfileHeader
                      key={`profile-header-${profileData.bannerUrl || 'no-banner'}-${profileData.avatarUrl || 'no-avatar'}`}
                      bannerUrl={profileData.bannerUrl}
                      avatarUrl={profileData.avatarUrl}
                      displayName={profileData.displayName || user?.displayName || user?.companyName || 'Brand'}
                      editable={isEditingProfile}
                      onBannerUpload={isEditingProfile ? (url) => {
                        // ProfileHeader already calls API and saves to DB
                        // Just update local state for immediate UI update
                        setProfileData(prev => ({ ...prev, bannerUrl: url }));
                        // Refresh user in background without blocking
                        refreshUser().catch(err => console.error('Failed to refresh user:', err));
                      } : undefined}
                      onAvatarUpload={isEditingProfile ? (url) => {
                        // ProfileHeader already calls API and saves to DB
                        // Just update local state for immediate UI update
                        setProfileData(prev => ({ ...prev, avatarUrl: url }));
                        // Refresh user in background without blocking
                        refreshUser().catch(err => console.error('Failed to refresh user:', err));
                      } : undefined}
                    />
                  </div>
                  
                  {/* Title and Edit Button - positioned below banner with padding for avatar */}
                  <div className="px-4 md:px-6 pt-12 md:pt-20 lg:pt-24 pb-4">
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Profile Settings
                      </CardTitle>
                      <div className="flex gap-2">
                        {!isEditingProfile ? (
                          <Button type="button" onClick={() => setIsEditingProfile(true)} variant="outline" data-testid="button-edit-profile">
                            Edit Profile
                          </Button>
                        ) : (
                          <>
                            <Button type="button" onClick={() => setIsEditingProfile(false)} variant="outline" data-testid="button-cancel-edit">
                              Cancel
                            </Button>
                            <Button type="submit" disabled={updateProfileMutation.isPending} data-testid="button-save-profile">
                              {updateProfileMutation.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                'Save'
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Form fields */}
                  <div className="px-6 pb-6 mb-20 md:mb-6">
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="companyName">Company Name</Label>
                        <Input
                          id="companyName"
                          value={profileData.displayName}
                          onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                          placeholder="Enter your company name"
                          disabled={!isEditingProfile}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio / Description</Label>
                        <Textarea
                          id="bio"
                          value={profileData.bio}
                          onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                          placeholder="Tell us about your brand and products..."
                          rows={4}
                          disabled={!isEditingProfile}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          value={profileData.website}
                          onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                          placeholder="https://your-website.com"
                          disabled={!isEditingProfile}
                        />
                      </div>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      <Dialog open={showPostModal} onOpenChange={setShowPostModal}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Social Post</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="postType">Post Type</Label>
              <Select value={formData.postType} onValueChange={(value: any) => 
                setFormData(prev => ({ ...prev, postType: value }))
              }>
                <SelectTrigger data-testid="select-post-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Product Showcase</SelectItem>
                  <SelectItem value="discount">Special Discount</SelectItem>
                  <SelectItem value="offer">Limited Offer</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your post content..."
                className="min-h-[120px]"
                required
                data-testid="textarea-content"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                  data-testid="input-image-url"
                />
              </div>
              <div>
                <Label htmlFor="linkUrl">Link URL</Label>
                <Input
                  id="linkUrl"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, linkUrl: e.target.value }))}
                  placeholder="https://your-product-page.com"
                  data-testid="input-link-url"
                />
              </div>
            </div>

            {formData.postType === 'discount' && (
              <div className="space-y-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800">Discount Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="discountCode">Discount Code</Label>
                    <Input
                      id="discountCode"
                      value={formData.discountCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, discountCode: e.target.value }))}
                      placeholder="e.g., BARBER20"
                      data-testid="input-discount-code"
                    />
                  </div>
                  <div>
                    <Label htmlFor="discountPercentage">Percentage Off</Label>
                    <Input
                      id="discountPercentage"
                      type="number"
                      value={formData.discountPercentage}
                      onChange={(e) => setFormData(prev => ({ ...prev, discountPercentage: Number(e.target.value) }))}
                      min="1"
                      max="100"
                      data-testid="input-discount-percentage"
                    />
                  </div>
                  <div>
                    <Label htmlFor="validUntil">Valid Until</Label>
                    <Input
                      id="validUntil"
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      data-testid="input-valid-until"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> All posts require approval before being visible to users. 
                You'll be notified once your post is reviewed.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowPostModal(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createPostMutation.isPending}
                data-testid="button-submit-post"
              >
                {createPostMutation.isPending ? "Submitting..." : "Submit for Review"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}