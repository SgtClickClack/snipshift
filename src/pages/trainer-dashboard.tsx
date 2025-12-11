import { useState } from "react";
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
import { Plus, Play, DollarSign, Users, Clock, BookOpen, Video, Award, Upload, Edit, Eye } from "lucide-react";
import { TrainingModule } from "@/shared/types";
import DashboardHeader from "@/components/dashboard/dashboard-header";

interface ContentFormData {
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  price: number;
  duration: string;
  level: "beginner" | "intermediate" | "advanced";
  category: string;
  isPaid: boolean;
}

export default function TrainerDashboard() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<'overview' | 'content' | 'profile'>('overview');
  const [showContentModal, setShowContentModal] = useState(false);
  const [, setEditingContent] = useState<TrainingModule | null>(null);
  
  const [formData, setFormData] = useState<ContentFormData>({
    title: "",
    description: "",
    videoUrl: "",
    thumbnailUrl: "",
    price: 0,
    duration: "",
    level: "beginner",
    category: "Hair Cutting",
    isPaid: false
  });

  const { data: content = [], isLoading } = useQuery<TrainingModule[]>({
    queryKey: ["/api/training/content", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/training/content?trainerId=${user?.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch content");
      }
      return response.json();
    },
    enabled: !!user?.id,
  });

  const createContentMutation = useMutation({
    mutationFn: async (contentData: any) => {
      const response = await apiRequest("POST", "/api/training/content", contentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Content uploaded successfully!",
        description: "Your training content is now available.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/training/content"] });
      setShowContentModal(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Failed to upload content",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      videoUrl: "",
      thumbnailUrl: "",
      price: 0,
      duration: "",
      level: "beginner",
      category: "Hair Cutting",
      isPaid: false
    });
    setEditingContent(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.videoUrl) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const contentData = {
      ...formData,
      // trainerId is handled by backend from auth token
    };

    createContentMutation.mutate(contentData);
  };

  // Mock stats - in a real app, these would come from an analytics endpoint
  const stats = {
    totalContent: content.length,
    totalPurchases: content.reduce((sum, item) => sum + (item.purchaseCount || 0), 0),
    totalRevenue: content.reduce((sum, item) => sum + (item.price * (item.purchaseCount || 0)), 0),
    avgRating: 0 // TODO: Connect to rating system
  };

  if (!user || user.currentRole !== "trainer") {
    return <div>Access denied</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Banner/Profile Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardHeader
          bannerImage={user?.bannerUrl || user?.bannerImage}
          profileImage={user?.avatarUrl || user?.photoURL}
          title="Trainer Hub"
          subtitle="Manage your courses and content"
          editable={true}
          onBannerUpload={(url) => {
            // DashboardHeader already calls API and saves to DB
            // Just update local state for immediate UI update
            // Refresh user in background without blocking
            refreshUser?.().catch(err => console.error('Failed to refresh user:', err));
          }}
          onLogoUpload={(url) => {
            // DashboardHeader already calls API and saves to DB
            // Just update local state for immediate UI update
            // Refresh user in background without blocking
            refreshUser?.().catch(err => console.error('Failed to refresh user:', err));
          }}
        />
      </div>

      {/* Dashboard Header with Actions */}
      <div className="bg-card/95 backdrop-blur-sm shadow-lg border-b-2 border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Trainer Hub</h1>
              <p className="text-muted-foreground">{user.displayName || user.email}</p>
            </div>
            <Button 
              onClick={() => setShowContentModal(true)}
              className="bg-primary hover:bg-blue-700"
              data-testid="button-upload-content"
            >
              <Plus className="mr-2 h-4 w-4" />
              Upload Content
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="border-b border-neutral-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BookOpen },
              { id: 'content', label: 'Training Content', icon: Video },
              { id: 'profile', label: 'Profile', icon: Award },
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
                    <Video className="h-8 w-8 text-primary" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-neutral-600">Total Content</p>
                      <p className="text-2xl font-bold text-neutral-900" data-testid="stat-total-content">
                        {stats.totalContent}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-success" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-neutral-600">Total Purchases</p>
                      <p className="text-2xl font-bold text-neutral-900" data-testid="stat-total-purchases">
                        {stats.totalPurchases}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <DollarSign className="h-8 w-8 text-warning" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-neutral-600">Revenue</p>
                      <p className="text-2xl font-bold text-neutral-900" data-testid="stat-revenue">
                        ${stats.totalRevenue}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Award className="h-8 w-8 text-primary" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-neutral-600">Avg Rating</p>
                      <p className="text-2xl font-bold text-neutral-900" data-testid="stat-rating">
                        {stats.avgRating}★
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
                    onClick={() => setShowContentModal(true)}
                    variant="outline"
                    className="h-20 flex flex-col"
                    data-testid="quick-action-upload"
                  >
                    <Upload className="h-6 w-6 mb-2" />
                    Upload New Content
                  </Button>
                  <Button
                    onClick={() => setActiveView('content')}
                    variant="outline"
                    className="h-20 flex flex-col"
                    data-testid="quick-action-manage"
                  >
                    <Edit className="h-6 w-6 mb-2" />
                    Manage Content
                  </Button>
                  <Button
                    onClick={() => setActiveView('profile')}
                    variant="outline"
                    className="h-20 flex flex-col"
                    data-testid="quick-action-profile"
                  >
                    <Award className="h-6 w-6 mb-2" />
                    Update Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Content Tab */}
        {activeView === 'content' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Training Content</h2>
              <Button onClick={() => setShowContentModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Content
              </Button>
            </div>

            {isLoading ? (
              <div data-testid="text-loading">Loading content...</div>
            ) : content.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Video className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                  <p className="text-neutral-600 mb-4" data-testid="text-no-content">
                    No training content uploaded yet.
                  </p>
                  <Button onClick={() => setShowContentModal(true)}>
                    Upload Your First Video
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {content.map((item) => (
                  <Card key={item.id} className="overflow-hidden" data-testid={`content-card-${item.id}`}>
                    <div className="aspect-video bg-neutral-100 relative">
                      {item.thumbnailUrl ? (
                        <img 
                          src={item.thumbnailUrl} 
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="h-12 w-12 text-neutral-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                        <Play className="h-12 w-12 text-white" />
                      </div>
                      {item.isPaid && (
                        <Badge className="absolute top-2 right-2 bg-warning text-warning-foreground">
                          ${item.price}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-2" data-testid={`content-title-${item.id}`}>
                        {item.title}
                      </h3>
                      <p className="text-sm text-neutral-600 mb-3" data-testid={`content-description-${item.id}`}>
                        {item.description}
                      </p>
                      <div className="flex justify-between items-center text-sm text-neutral-500 mb-3">
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {item.duration}
                        </span>
                        <Badge variant="outline">{item.level}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600">
                          {item.purchaseCount || 0} purchases
                        </span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
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
          <div className="max-w-2xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trainer Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pb-20 md:pb-6">
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell people about your experience and expertise..."
                    className="min-h-[100px]"
                    data-testid="textarea-bio"
                  />
                </div>
                <div>
                  <Label htmlFor="credentials">Credentials</Label>
                  <Input
                    id="credentials"
                    placeholder="e.g., Master Barber License, 10+ years experience"
                    data-testid="input-credentials"
                  />
                </div>
                <div>
                  <Label htmlFor="specializations">Specializations</Label>
                  <Input
                    id="specializations"
                    placeholder="e.g., Fade Cuts, Beard Styling, Color Techniques"
                    data-testid="input-specializations"
                  />
                </div>
                <Button className="w-full" data-testid="button-save-profile">
                  Save Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Upload Content Modal */}
      <Dialog open={showContentModal} onOpenChange={setShowContentModal}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Training Content</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Advanced Fade Techniques"
                  required
                  data-testid="input-content-title"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, category: value }))
                }>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hair Cutting">Hair Cutting</SelectItem>
                    <SelectItem value="Hair Styling">Hair Styling</SelectItem>
                    <SelectItem value="Hair Coloring">Hair Coloring</SelectItem>
                    <SelectItem value="Beard Care">Beard Care</SelectItem>
                    <SelectItem value="Business Skills">Business Skills</SelectItem>
                    <SelectItem value="Tools & Equipment">Tools & Equipment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what students will learn..."
                className="min-h-[100px]"
                required
                data-testid="textarea-content-description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="videoUrl">Video URL *</Label>
                <Input
                  id="videoUrl"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=..."
                  required
                  data-testid="input-video-url"
                />
              </div>
              <div>
                <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
                <Input
                  id="thumbnailUrl"
                  value={formData.thumbnailUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, thumbnailUrl: e.target.value }))}
                  placeholder="https://example.com/thumbnail.jpg"
                  data-testid="input-thumbnail-url"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="duration">Duration</Label>
                <Input
                  id="duration"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="e.g., 45 min"
                  data-testid="input-duration"
                />
              </div>
              <div>
                <Label htmlFor="level">Level</Label>
                <Select value={formData.level} onValueChange={(value: "beginner" | "intermediate" | "advanced") => 
                  setFormData(prev => ({ ...prev, level: value }))
                }>
                  <SelectTrigger data-testid="select-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => {
                    const price = Number(e.target.value);
                    setFormData(prev => ({ 
                      ...prev, 
                      price, 
                      isPaid: price > 0 
                    }));
                  }}
                  min="0"
                  step="0.01"
                  data-testid="input-price"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowContentModal(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createContentMutation.isPending}
                data-testid="button-upload"
              >
                {createContentMutation.isPending ? "Uploading..." : "Upload Content"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
