import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Eye, Shield, AlertTriangle, Clock, Filter } from "lucide-react";
import { format } from "date-fns";

interface PendingPost {
  id: string;
  authorId: string;
  authorRole: "brand" | "trainer";
  authorName?: string;
  authorCompany?: string;
  postType: "offer" | "event" | "announcement" | "product" | "discount";
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  discountCode?: string;
  discountPercentage?: number;
  validUntil?: string;
}

interface PendingContent {
  id: string;
  trainerId: string;
  trainerName?: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  price: number;
  duration: string;
  level: "beginner" | "intermediate" | "advanced";
  category: string;
  isPaid: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export default function ContentModeration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "posts" | "training">("all");

  const { data: pendingPosts = [], isLoading: loadingPosts } = useQuery<PendingPost[]>({
    queryKey: ["/api/admin/pending-posts"],
  });

  const { data: pendingTraining = [], isLoading: loadingTraining } = useQuery<PendingContent[]>({
    queryKey: ["/api/admin/pending-training"],
  });

  const moderatePostMutation = useMutation({
    mutationFn: async ({ postId, action, reason }: { postId: string; action: "approve" | "reject"; reason?: string }) => {
      const response = await apiRequest("POST", `/api/admin/moderate-post/${postId}`, { action, reason });
      return response.json();
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-posts"] });
      toast({
        title: action === "approve" ? "Post approved" : "Post rejected",
        description: `The post has been ${action}d successfully.`,
      });
    },
  });

  const moderateTrainingMutation = useMutation({
    mutationFn: async ({ contentId, action, reason }: { contentId: string; action: "approve" | "reject"; reason?: string }) => {
      const response = await apiRequest("POST", `/api/admin/moderate-training/${contentId}`, { action, reason });
      return response.json();
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-training"] });
      toast({
        title: action === "approve" ? "Content approved" : "Content rejected",
        description: `The training content has been ${action}d successfully.`,
      });
    },
  });

  const handlePostModeration = (postId: string, action: "approve" | "reject", reason?: string) => {
    moderatePostMutation.mutate({ postId, action, reason });
  };

  const handleTrainingModeration = (contentId: string, action: "approve" | "reject", reason?: string) => {
    moderateTrainingMutation.mutate({ contentId, action, reason });
  };

  const getPostTypeColor = (postType: string) => {
    switch (postType) {
      case "discount":
        return "bg-red-100 text-red-800";
      case "event":
        return "bg-blue-100 text-blue-800";
      case "offer":
        return "bg-green-100 text-green-800";
      case "product":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "beginner":
        return "bg-green-100 text-green-800";
      case "intermediate":
        return "bg-red-100 text-red-800";
      case "advanced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Content Moderation
          </h1>
          <p className="text-neutral-600">Review and approve content from brands and trainers</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {pendingPosts.length + pendingTraining.length} pending
          </Badge>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="posts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="posts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Social Posts ({pendingPosts.length})
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Training Content ({pendingTraining.length})
          </TabsTrigger>
        </TabsList>

        {/* Social Posts Tab */}
        <TabsContent value="posts" className="space-y-4">
          {loadingPosts ? (
            <div className="text-center py-8" data-testid="loading-posts">
              Loading pending posts...
            </div>
          ) : pendingPosts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-neutral-600" data-testid="no-pending-posts">
                  No pending posts to review. Great job!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingPosts.map((post) => (
                <Card key={post.id} className="overflow-hidden" data-testid={`pending-post-${post.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-primary font-bold text-sm">
                            {(post.authorCompany || post.authorName || "U").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-neutral-900" data-testid={`post-author-${post.id}`}>
                            {post.authorCompany || post.authorName || "Unknown"}
                          </h3>
                          <p className="text-sm text-neutral-500">
                            {format(new Date(post.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={getPostTypeColor(post.postType)} data-testid={`post-type-${post.id}`}>
                          {post.postType}
                        </Badge>
                        <Badge variant="outline" data-testid={`author-role-${post.id}`}>
                          {post.authorRole}
                        </Badge>
                        <Badge variant="secondary" data-testid={`post-status-${post.id}`}>
                          {post.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-neutral-900 leading-relaxed" data-testid={`post-content-${post.id}`}>
                      {post.content}
                    </p>

                    {post.imageUrl && (
                      <div className="rounded-lg overflow-hidden max-w-md">
                        <img 
                          src={post.imageUrl} 
                          alt="Post content"
                          className="w-full h-48 object-cover"
                        />
                      </div>
                    )}

                    {post.discountCode && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-yellow-800">
                          <span className="font-medium">
                            Discount: {post.discountCode} ({post.discountPercentage}% off)
                          </span>
                        </div>
                        {post.validUntil && (
                          <p className="text-sm text-yellow-600 mt-1">
                            Valid until: {format(new Date(post.validUntil), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                    )}

                    {post.linkUrl && (
                      <div className="text-sm text-neutral-600">
                        <strong>Link:</strong> <a href={post.linkUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{post.linkUrl}</a>
                      </div>
                    )}

                    {/* Moderation Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                      <Button
                        variant="outline"
                        onClick={() => handlePostModeration(post.id, "reject", "Content does not meet guidelines")}
                        disabled={moderatePostMutation.isPending}
                        data-testid={`reject-post-${post.id}`}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => handlePostModeration(post.id, "approve")}
                        disabled={moderatePostMutation.isPending}
                        data-testid={`approve-post-${post.id}`}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Training Content Tab */}
        <TabsContent value="training" className="space-y-4">
          {loadingTraining ? (
            <div className="text-center py-8" data-testid="loading-training">
              Loading pending training content...
            </div>
          ) : pendingTraining.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-neutral-600" data-testid="no-pending-training">
                  No pending training content to review. Great job!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pendingTraining.map((content) => (
                <Card key={content.id} className="overflow-hidden" data-testid={`pending-training-${content.id}`}>
                  <div className="aspect-video bg-neutral-100 relative">
                    {content.thumbnailUrl ? (
                      <img 
                        src={content.thumbnailUrl} 
                        alt={content.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Eye className="h-12 w-12 text-neutral-400" />
                      </div>
                    )}
                    {content.isPaid && (
                      <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
                        ${content.price}
                      </Badge>
                    )}
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-lg text-neutral-900" data-testid={`training-title-${content.id}`}>
                          {content.title}
                        </h3>
                        <p className="text-sm text-neutral-600" data-testid={`training-author-${content.id}`}>
                          by {content.trainerName || "Unknown Trainer"}
                        </p>
                      </div>

                      <p className="text-sm text-neutral-700 line-clamp-3" data-testid={`training-description-${content.id}`}>
                        {content.description}
                      </p>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-600">{content.duration}</span>
                        <Badge variant="outline" className={getLevelColor(content.level)}>
                          {content.level}
                        </Badge>
                      </div>

                      <div className="text-sm text-neutral-600">
                        <strong>Category:</strong> {content.category}
                      </div>

                      <div className="text-sm text-neutral-600">
                        <strong>Video URL:</strong> 
                        <a href={content.videoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                          {content.videoUrl}
                        </a>
                      </div>

                      <div className="text-sm text-neutral-500">
                        Submitted: {format(new Date(content.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </div>

                      {/* Moderation Actions */}
                      <div className="flex gap-2 pt-3 border-t border-neutral-100">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTrainingModeration(content.id, "reject", "Content does not meet quality standards")}
                          disabled={moderateTrainingMutation.isPending}
                          className="flex-1"
                          data-testid={`reject-training-${content.id}`}
                        >
                          <X className="mr-1 h-3 w-3" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleTrainingModeration(content.id, "approve")}
                          disabled={moderateTrainingMutation.isPending}
                          className="flex-1"
                          data-testid={`approve-training-${content.id}`}
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}