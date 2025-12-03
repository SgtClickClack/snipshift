import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { X, Image, Link as LinkIcon } from "lucide-react";

interface SocialPostingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SocialPostingModal({ isOpen, onClose }: SocialPostingModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    content: "",
    postType: "offer" as "offer" | "event" | "announcement",
    imageUrl: "",
    linkUrl: "",
    eventDate: "",
    eventTime: "",
    location: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createPostMutation = useMutation({
    mutationFn: async (postData: any) => {
      const response = await apiRequest("POST", "/api/social-posts", postData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Post created successfully!",
        description: "Your post is now live in the social feed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/social-posts"] });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create post",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      content: "",
      postType: "offer",
      imageUrl: "",
      linkUrl: "",
      eventDate: "",
      eventTime: "",
      location: ""
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.content.trim()) {
      newErrors.content = "Post content is required";
    }

    if (formData.postType === "event") {
      if (!formData.eventDate) newErrors.eventDate = "Event date is required";
      if (!formData.eventTime) newErrors.eventTime = "Event time is required";
      if (!formData.location.trim()) newErrors.location = "Event location is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const postData = {
      content: formData.content,
      postType: formData.postType,
      authorId: user?.id,
      authorRole: user?.currentRole,
      imageUrl: formData.imageUrl || undefined,
      linkUrl: formData.linkUrl || undefined,
      eventDate: formData.eventDate && formData.eventTime 
        ? new Date(`${formData.eventDate}T${formData.eventTime}`).toISOString()
        : undefined,
      location: formData.location || undefined,
      likes: 0,
      comments: []
    };

    createPostMutation.mutate(postData);
  };

  const getPostTypeDescription = () => {
    switch (formData.postType) {
      case "offer":
        return "Share a special offer, promotion, or product announcement";
      case "event":
        return "Announce a training event, workshop, or educational session";
      case "announcement":
        return "Share general updates, news, or company announcements";
      default:
        return "";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto !bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-bold">Create a New Post</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            data-testid="button-close-modal"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Post Type Selection */}
            <div>
              <Label htmlFor="postType">Post Type *</Label>
              <Select
                value={formData.postType}
                onValueChange={(value: "offer" | "event" | "announcement") => 
                  setFormData({ ...formData, postType: value })
                }
              >
                <SelectTrigger data-testid="select-post-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="offer">Special Offer / Product</SelectItem>
                  <SelectItem value="event">Training Event / Workshop</SelectItem>
                  <SelectItem value="announcement">General Announcement</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                {getPostTypeDescription()}
              </p>
            </div>

            {/* Post Content */}
            <div>
              <Label htmlFor="content">Post Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder={
                  formData.postType === "offer" 
                    ? "Share details about your special offer, new product, or promotion..."
                    : formData.postType === "event"
                    ? "Describe your training event, workshop details, and what participants will learn..."
                    : "Share your announcement, company news, or general updates..."
                }
                rows={6}
                data-testid="textarea-post-content"
                className={errors.content ? "border-red-500" : ""}
              />
              {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content}</p>}
            </div>

            {/* Event-specific fields */}
            {formData.postType === "event" && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium text-sm text-muted-foreground">Event Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="eventDate">Event Date *</Label>
                    <Input
                      id="eventDate"
                      type="date"
                      value={formData.eventDate}
                      onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                      data-testid="input-event-date"
                      className={errors.eventDate ? "border-red-500" : ""}
                    />
                    {errors.eventDate && <p className="text-red-500 text-sm mt-1">{errors.eventDate}</p>}
                  </div>
                  <div>
                    <Label htmlFor="eventTime">Event Time *</Label>
                    <Input
                      id="eventTime"
                      type="time"
                      value={formData.eventTime}
                      onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })}
                      data-testid="input-event-time"
                      className={errors.eventTime ? "border-red-500" : ""}
                    />
                    {errors.eventTime && <p className="text-red-500 text-sm mt-1">{errors.eventTime}</p>}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="location">Event Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Event venue or address"
                    data-testid="input-event-location"
                    className={errors.location ? "border-red-500" : ""}
                  />
                  {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
                </div>
              </div>
            )}

            {/* Optional Media */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium text-sm text-muted-foreground">Optional Media & Links</h3>
              
              <div>
                <Label htmlFor="imageUrl" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Image URL
                </Label>
                <Input
                  id="imageUrl"
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  data-testid="input-image-url"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Add a link to an image to make your post more engaging
                </p>
              </div>

              <div>
                <Label htmlFor="linkUrl" className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Link URL
                </Label>
                <Input
                  id="linkUrl"
                  type="url"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  placeholder="https://your-website.com/product"
                  data-testid="input-link-url"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Link to your product page, registration, or more information
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel-post"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPostMutation.isPending}
                data-testid="button-create-post"
                className="bg-primary hover:bg-primary/90"
              >
                {createPostMutation.isPending ? "Posting..." : "Create Post"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}