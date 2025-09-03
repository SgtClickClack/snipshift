import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { authService } from "@/lib/auth";
import { Heart, MessageCircle, Share, Tag, ExternalLink, Calendar, MapPin, Filter } from "lucide-react";
import { format } from "date-fns";

interface SocialPost {
  id: string;
  authorId: string;
  authorRole: "brand" | "trainer";
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
  eventDate?: string;
  location?: string;
  createdAt: string;
  authorName?: string;
  authorCompany?: string;
}

export default function SocialFeed() {
  const user = authService.getCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "offers" | "events" | "products">("all");
  
  const { data: posts = [], isLoading } = useQuery<SocialPost[]>({
    queryKey: ["/api/social-feed"],
  });

  const likeMutation = useMutation({
    mutationFn: async ({ postId, action }: { postId: string; action: "like" | "unlike" }) => {
      const response = await apiRequest("POST", `/api/social-posts/${postId}/like`, { action });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-feed"] });
    },
  });

  const handleLike = (postId: string) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to like posts.",
        variant: "destructive",
      });
      return;
    }
    likeMutation.mutate({ postId, action: "like" });
  };

  const handleShare = (post: SocialPost) => {
    if (navigator.share) {
      navigator.share({
        title: `${post.authorCompany || post.authorName}: ${post.postType}`,
        text: post.content,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Post link copied to clipboard.",
      });
    }
  };

  const filteredPosts = posts.filter(post => {
    if (post.status !== "approved") return false;
    if (filter === "all") return true;
    if (filter === "offers") return post.postType === "offer" || post.postType === "discount";
    if (filter === "events") return post.postType === "event";
    if (filter === "products") return post.postType === "product";
    return true;
  });

  const getPostTypeIcon = (postType: string) => {
    switch (postType) {
      case "discount":
        return <Tag className="h-4 w-4" />;
      case "event":
        return <Calendar className="h-4 w-4" />;
      case "offer":
        return <Tag className="h-4 w-4" />;
      default:
        return <Share className="h-4 w-4" />;
    }
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Community Feed</h1>
          <p className="text-neutral-600">Discover offers, events, and products from brands and trainers</p>
        </div>
        
        {/* Filter Buttons */}
        <div className="flex gap-2">
          {[
            { key: "all", label: "All" },
            { key: "offers", label: "Offers" },
            { key: "events", label: "Events" },
            { key: "products", label: "Products" },
          ].map((filterOption) => (
            <Button
              key={filterOption.key}
              variant={filter === filterOption.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(filterOption.key as any)}
              data-testid={`filter-${filterOption.key}`}
            >
              {filterOption.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Feed Content */}
      {isLoading ? (
        <div className="text-center py-8" data-testid="text-loading">
          Loading community feed...
        </div>
      ) : filteredPosts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Share className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-600" data-testid="text-no-posts">
              No posts found. Check back later for updates from brands and trainers!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredPosts.map((post) => (
            <Card key={post.id} className="overflow-hidden" data-testid={`post-${post.id}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-bold text-sm">
                        {(post.authorCompany || post.authorName || "U").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900" data-testid={`author-${post.id}`}>
                        {post.authorCompany || post.authorName || "Unknown"}
                      </h3>
                      <p className="text-sm text-neutral-500">
                        {format(new Date(post.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      className={`${getPostTypeColor(post.postType)} flex items-center gap-1`}
                      data-testid={`post-type-${post.id}`}
                    >
                      {getPostTypeIcon(post.postType)}
                      {post.postType}
                    </Badge>
                    {post.authorRole === "brand" && (
                      <Badge variant="outline" data-testid={`author-role-${post.id}`}>
                        Brand
                      </Badge>
                    )}
                    {post.authorRole === "trainer" && (
                      <Badge variant="outline" data-testid={`author-role-${post.id}`}>
                        Trainer
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Post Content */}
                <p className="text-neutral-900 leading-relaxed" data-testid={`content-${post.id}`}>
                  {post.content}
                </p>

                {/* Post Image */}
                {post.imageUrl && (
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src={post.imageUrl} 
                      alt="Post content"
                      className="w-full h-64 object-cover"
                      data-testid={`image-${post.id}`}
                    />
                  </div>
                )}

                {/* Event Details */}
                {post.postType === "event" && post.eventDate && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-blue-800">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">
                        Event Date: {format(new Date(post.eventDate), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    {post.location && (
                      <div className="flex items-center gap-2 text-blue-700 mt-1">
                        <MapPin className="h-4 w-4" />
                        <span>{post.location}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Discount Details */}
                {post.postType === "discount" && post.discountCode && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="h-5 w-5 text-red-600" />
                        <div>
                          <span className="font-bold text-red-800 text-lg">
                            {post.discountCode}
                          </span>
                          <p className="text-red-700 text-sm">
                            {post.discountPercentage}% OFF
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(post.discountCode || "");
                          toast({
                            title: "Code copied!",
                            description: "Discount code copied to clipboard.",
                          });
                        }}
                        data-testid={`copy-code-${post.id}`}
                      >
                        Copy Code
                      </Button>
                    </div>
                    {post.validUntil && (
                      <p className="text-red-600 text-sm mt-2">
                        Valid until: {format(new Date(post.validUntil), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                )}

                {/* External Link */}
                {post.linkUrl && (
                  <div>
                    <Button
                      variant="outline"
                      asChild
                      className="w-full"
                      data-testid={`external-link-${post.id}`}
                    >
                      <a href={post.linkUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Learn More
                      </a>
                    </Button>
                  </div>
                )}

                {/* Post Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(post.id)}
                      className="flex items-center gap-2 text-neutral-600 hover:text-red-600"
                      data-testid={`like-button-${post.id}`}
                    >
                      <Heart className="h-4 w-4" />
                      {post.likes}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2 text-neutral-600"
                      data-testid={`comment-button-${post.id}`}
                    >
                      <MessageCircle className="h-4 w-4" />
                      {post.comments.length}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShare(post)}
                      className="flex items-center gap-2 text-neutral-600"
                      data-testid={`share-button-${post.id}`}
                    >
                      <Share className="h-4 w-4" />
                      Share
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}