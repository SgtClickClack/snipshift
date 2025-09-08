import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Flag, 
  Eye, 
  Clock, 
  Users,
  MessageSquare,
  Image as ImageIcon,
  ExternalLink
} from "lucide-react";

interface PendingPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole: "hub" | "professional" | "brand" | "trainer";
  content: string;
  images?: string[];
  postType: "promotion" | "training" | "general" | "job_posting";
  submittedAt: Date;
  flagReason?: string;
  riskScore: number;
  automaticFlags: string[];
}

export default function ContentModerationQueue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<PendingPost | null>(null);

  const { data: pendingPosts = [], isLoading } = useQuery<PendingPost[]>({
    queryKey: ["/api/moderation/pending-posts"],
  });

  const { data: moderationStats } = useQuery({
    queryKey: ["/api/moderation/stats"],
  });

  const approveMutation = useMutation({
    mutationFn: async (postId: string) => {
      const response = await apiRequest("POST", `/api/moderation/approve/${postId}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Post Approved",
        description: "The post has been approved and is now visible to users.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/moderation/pending-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/moderation/stats"] });
      setSelectedPost(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ postId, reason }: { postId: string; reason: string }) => {
      const response = await apiRequest("POST", `/api/moderation/reject/${postId}`, { reason });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Post Rejected",
        description: "The post has been rejected and the user has been notified.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/moderation/pending-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/moderation/stats"] });
      setSelectedPost(null);
    },
  });

  const getRiskBadgeColor = (score: number) => {
    if (score >= 0.7) return "bg-red-600";
    if (score >= 0.4) return "bg-yellow-600";
    return "bg-green-600";
  };

  const getRiskLabel = (score: number) => {
    if (score >= 0.7) return "High Risk";
    if (score >= 0.4) return "Medium Risk";
    return "Low Risk";
  };

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case "promotion": return "bg-purple-600";
      case "training": return "bg-blue-600";
      case "job_posting": return "bg-green-600";
      default: return "bg-neutral-600";
    }
  };

  const filteredPosts = {
    all: pendingPosts,
    high_risk: pendingPosts.filter(p => p.riskScore >= 0.7),
    medium_risk: pendingPosts.filter(p => p.riskScore >= 0.4 && p.riskScore < 0.7),
    promotions: pendingPosts.filter(p => p.postType === "promotion"),
    training: pendingPosts.filter(p => p.postType === "training"),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        <span className="ml-3 text-muted-foreground">Loading moderation queue...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="content-moderation-queue">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Content Moderation</h2>
          <p className="text-muted-foreground">
            Review and moderate community posts before they go live
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {pendingPosts.length} pending
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      {moderationStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Eye className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{moderationStats.pending}</div>
              <div className="text-sm text-muted-foreground">Pending Review</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{moderationStats.approved}</div>
              <div className="text-sm text-muted-foreground">Approved Today</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{moderationStats.rejected}</div>
              <div className="text-sm text-muted-foreground">Rejected Today</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{moderationStats.highRisk}</div>
              <div className="text-sm text-muted-foreground">High Risk</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All ({filteredPosts.all.length})</TabsTrigger>
          <TabsTrigger value="high_risk">High Risk ({filteredPosts.high_risk.length})</TabsTrigger>
          <TabsTrigger value="medium_risk">Medium Risk ({filteredPosts.medium_risk.length})</TabsTrigger>
          <TabsTrigger value="promotions">Promotions ({filteredPosts.promotions.length})</TabsTrigger>
          <TabsTrigger value="training">Training ({filteredPosts.training.length})</TabsTrigger>
        </TabsList>

        {Object.entries(filteredPosts).map(([key, posts]) => (
          <TabsContent key={key} value={key} className="space-y-4">
            {posts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">All Clear!</h3>
                  <p className="text-muted-foreground">
                    No posts pending moderation in this category.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {posts.map((post) => (
                  <Card 
                    key={post.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedPost?.id === post.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedPost(post)}
                    data-testid={`post-card-${post.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={post.userAvatar} />
                            <AvatarFallback>
                              {post.userName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{post.userName}</div>
                            <div className="text-sm text-muted-foreground capitalize">
                              {post.userRole}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={getRiskBadgeColor(post.riskScore)}>
                            {getRiskLabel(post.riskScore)}
                          </Badge>
                          <Badge className={getPostTypeColor(post.postType)} variant="outline">
                            {post.postType.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <p className="text-sm line-clamp-3">{post.content}</p>
                      
                      {post.images && post.images.length > 0 && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <ImageIcon className="h-4 w-4 mr-1" />
                          {post.images.length} image{post.images.length > 1 ? 's' : ''}
                        </div>
                      )}

                      {post.automaticFlags.length > 0 && (
                        <Alert className="border-yellow-200 bg-yellow-50">
                          <Flag className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-yellow-800">
                            <strong>Auto-flagged:</strong> {post.automaticFlags.join(', ')}
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Submitted {new Date(post.submittedAt).toLocaleString()}</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Risk: {Math.round(post.riskScore * 100)}%
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-green-700 border-green-200 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            approveMutation.mutate(post.id);
                          }}
                          disabled={approveMutation.isPending}
                          data-testid={`button-approve-${post.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-red-700 border-red-200 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            rejectMutation.mutate({ 
                              postId: post.id, 
                              reason: "Content does not meet community guidelines" 
                            });
                          }}
                          disabled={rejectMutation.isPending}
                          data-testid={`button-reject-${post.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Detailed Post View Modal */}
      {selectedPost && (
        <Card className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Post Details</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPost(null)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* User Info */}
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedPost.userAvatar} />
                    <AvatarFallback>
                      {selectedPost.userName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{selectedPost.userName}</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {selectedPost.userRole} • Submitted {new Date(selectedPost.submittedAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <h4 className="font-medium">Post Content:</h4>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="whitespace-pre-wrap">{selectedPost.content}</p>
                  </div>
                </div>

                {/* Images */}
                {selectedPost.images && selectedPost.images.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Attached Images:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedPost.images.map((image, index) => (
                        <div key={index} className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk Analysis */}
                <div className="space-y-2">
                  <h4 className="font-medium">Risk Analysis:</h4>
                  <div className="flex items-center gap-2">
                    <Badge className={getRiskBadgeColor(selectedPost.riskScore)}>
                      {getRiskLabel(selectedPost.riskScore)} ({Math.round(selectedPost.riskScore * 100)}%)
                    </Badge>
                    <Badge className={getPostTypeColor(selectedPost.postType)} variant="outline">
                      {selectedPost.postType.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  {selectedPost.automaticFlags.length > 0 && (
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <Flag className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        <strong>Automatic Flags:</strong>
                        <ul className="list-disc list-inside mt-1">
                          {selectedPost.automaticFlags.map((flag, index) => (
                            <li key={index}>{flag}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => approveMutation.mutate(selectedPost.id)}
                    disabled={approveMutation.isPending}
                    data-testid="button-approve-detailed"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Post
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-red-700 border-red-200 hover:bg-red-50"
                    onClick={() => rejectMutation.mutate({ 
                      postId: selectedPost.id, 
                      reason: "Content does not meet community guidelines" 
                    })}
                    disabled={rejectMutation.isPending}
                    data-testid="button-reject-detailed"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Post
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </Card>
      )}
    </div>
  );
}