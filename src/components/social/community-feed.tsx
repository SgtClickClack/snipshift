import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Search, TrendingUp, Users, Sparkles, RefreshCw } from "lucide-react";
import PostCard from "./post-card";
import { Post } from "@/shared/types";
import PostCreationForm from "./post-creation-form";

interface CommunityFeedProps {
  showCreatePost?: boolean;
}

export default function CommunityFeed({ showCreatePost = true }: CommunityFeedProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "social" | "jobs">("all");

  // Fetch posts from API
  const { data: posts = [], isLoading, refetch } = useQuery<Post[]>({
    queryKey: ["/api/community/feed", filterType, searchQuery, user?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterType !== "all") {
        params.append("type", filterType === "jobs" ? "brand" : "community");
      }
      if (user?.id) {
        params.append("userId", user.id);
      }
      
      const response = await fetch(`/api/community/feed?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }
      
      const data = await response.json();
      
      // Filter locally for search if needed, or rely on API if implemented
      // Also map backend fields to frontend Post interface
      return data.map((item: any) => ({
        id: item.id,
        authorId: item.authorId,
        authorName: item.authorName,
        authorRole: item.authorRole,
        authorAvatar: item.authorAvatar,
        content: item.content,
        images: item.imageUrl ? [item.imageUrl] : [], // Map single imageUrl to array for frontend compatibility
        postType: item.type === 'brand' ? 'job' : 'social', // Map backend type to frontend type
        likes: item.likesCount,
        comments: [], // Comments not yet implemented in backend
        timestamp: item.createdAt,
        isLiked: item.isLiked || false,
      })).filter((post: Post) => {
        if (!searchQuery) return true;
        return post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
               (post.authorName && post.authorName.toLowerCase().includes(searchQuery.toLowerCase()));
      });
    }
  });

  const createPostMutation = useMutation({
    mutationFn: async (postData: { content: string; images: string[] }) => {
      const response = await apiRequest("POST", "/api/community", {
        content: postData.content,
        imageUrl: postData.images[0], // Take first image if multiple
        type: "community", // Default to community post
      });
      return response.json();
    },
    onSuccess: (newPost) => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/feed"] });
      toast({
        title: "Post created successfully!",
        description: "Your post is now live in the community feed",
      });
    },
    onError: () => {
      toast({
        title: "Failed to create post",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  });

  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      const response = await apiRequest("POST", `/api/community/${postId}/like`);
      return response.json();
    },
    onSuccess: (data, postId) => {
      // Optimistic update or refetch
      queryClient.setQueryData(["/api/community/feed", filterType, searchQuery, user?.id], (oldPosts: Post[] = []) =>
        oldPosts.map(post =>
          post.id === postId
            ? {
                ...post,
                likes: data.isLiked ? (post.likes || 0) + 1 : Math.max(0, (post.likes || 0) - 1),
                isLiked: data.isLiked
              }
            : post
        )
      );
    },
    onError: () => {
      toast({
        title: "Failed to like post",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  });

  const handleLike = (postId: string) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to like posts",
        variant: "destructive",
      });
      return;
    }
    likeMutation.mutate(postId);
  };

  const commentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const response = await apiRequest("POST", `/api/community/${postId}/comments`, { content });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Comment added",
        description: "Your comment has been posted.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to add comment",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  });

  const handleComment = async (postId: string, commentText: string) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to comment",
        variant: "destructive",
      });
      return;
    }
    await commentMutation.mutateAsync({ postId, content: commentText });
  };

  const handleCreatePost = (postData: { content: string; images: string[] }) => {
    createPostMutation.mutate(postData);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Feed Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Community Feed
            </h1>
            <p className="text-muted-foreground">
              Discover trends, connect with professionals, and stay updated with the latest in barbering
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="button-refresh-feed"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search posts, users, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-feed"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("all")}
              data-testid="filter-all"
            >
              All
            </Button>
            <Button
              variant={filterType === "social" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("social")}
              data-testid="filter-social"
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              Social
            </Button>
            <Button
              variant={filterType === "jobs" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("jobs")}
              data-testid="filter-jobs"
            >
              <Users className="w-4 h-4 mr-1" />
              Jobs
            </Button>
          </div>
        </div>

        {/* Feed Stats */}
        <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
          <span>{posts.length} posts</span>
          <span>{posts.filter(p => p.postType === "social").length} social posts</span>
          <span>{posts.filter(p => p.postType === "job").length} job posts</span>
        </div>
      </div>

      {/* Post Creation Form */}
      {showCreatePost && user && (
        <PostCreationForm
          userRole={user.currentRole as any}
          userName={user.displayName || user.email || "User"}
          userAvatar={user.profileImage}
          onSubmit={handleCreatePost}
          isSubmitting={createPostMutation.isPending}
        />
      )}

      {/* Posts Feed */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={`skeleton-post-${i}`} className="w-full">
                <CardContent className="pt-6">
                  <div className="animate-pulse space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-muted rounded-full"></div>
                      <div>
                        <div className="w-32 h-4 bg-muted rounded mb-1"></div>
                        <div className="w-24 h-3 bg-muted rounded"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="w-full h-4 bg-muted rounded"></div>
                      <div className="w-3/4 h-4 bg-muted rounded"></div>
                      <div className="w-1/2 h-4 bg-muted rounded"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={handleLike}
              onComment={handleComment} 
              currentUserId={user?.id}
            />
          ))
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchQuery ? "No posts found" : "No posts yet"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery 
                    ? `No posts match "${searchQuery}". Try adjusting your search.`
                    : "Be the first to share something with the community!"
                  }
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    onClick={() => setSearchQuery("")}
                  >
                    Clear search
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
