import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Filter, TrendingUp, Users, Sparkles, RefreshCw } from "lucide-react";
import PostCard, { Post } from "./post-card";
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
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  // Mock data for community feed
  const mockPosts: Post[] = [
    {
      id: "post-1",
      authorId: "brand-1",
      authorName: "StyleCraft Studios",
      authorRole: "brand",
      authorAvatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face",
      content: "🚀 Excited to announce our new Premium Styling Tools collection! These ergonomic clippers and trimmers are designed specifically for professional barbers who demand precision and comfort. \n\nWhat makes them special:\n✨ Titanium-coated blades for longer life\n🔋 8-hour battery life\n⚡ Fast charging technology\n🎯 Precision cutting guides\n\nWho's ready to elevate their craft? #BarberTools #StyleCraft #ProfessionalBarber",
      images: [
        "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=400&fit=crop"
      ],
      postType: "social",
      likes: 47,
      comments: [
        {
          id: "comment-1",
          author: "Mike Johnson",
          authorId: "prof-1",
          text: "These look amazing! How's the weight balance on the clippers?",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "comment-2",
          author: "Sarah's Salon",
          authorId: "hub-1",
          text: "We've been using StyleCraft tools for 3 years - they're incredibly reliable!",
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
        }
      ],
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "job-post-1",
      authorId: "hub-2",
      authorName: "Elite Barbershop Sydney",
      authorRole: "hub",
      authorAvatar: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=150&h=150&fit=crop&crop=face",
      content: "We're looking for an experienced barber to join our team in Sydney CBD! Perfect opportunity for someone passionate about classic cuts and modern styles.\n\nWe offer:\n• Competitive hourly rate + tips\n• Flexible schedule options\n• Professional development opportunities\n• Prime location with high foot traffic",
      postType: "job",
      location: {
        city: "Sydney",
        state: "NSW"
      },
      payRate: 35,
      payType: "hourly",
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      skillsRequired: ["Hair Cutting", "Beard Trimming", "Customer Service", "Modern Styles"],
      likes: 23,
      comments: [
        {
          id: "comment-3",
          author: "Alex Chen",
          authorId: "prof-2",
          text: "Is this position still available? I have 5 years experience in CBD locations.",
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        }
      ],
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "post-2",
      authorId: "trainer-1",
      authorName: "Marco Rodriguez",
      authorRole: "trainer",
      authorAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      content: "Just wrapped up an incredible 2-day masterclass on advanced fade techniques! 🎓\n\nSeeing 25 talented barbers push their boundaries and perfect their craft never gets old. Today we covered:\n\n🔥 Zero-gap clipper techniques\n✂️ Seamless blend transitions  \n🎨 Creative design integration\n💡 Client consultation best practices\n\nThe passion and dedication in the room was absolutely electric! These professionals are going to take their skills to the next level.\n\nNext masterclass is in Melbourne - March 15th. Who's ready to level up? 💪\n\n#BarberEducation #MasterClass #FadeTechniques #BarberTraining",
      images: [
        "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=400&fit=crop"
      ],
      postType: "social",
      likes: 89,
      comments: [
        {
          id: "comment-4",
          author: "David Kim",
          authorId: "prof-3",
          text: "Marco, your techniques revolutionized my fade game! Can't wait for the Melbourne session 🙌",
          timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString()
        },
        {
          id: "comment-5",
          author: "The Cutting Room",
          authorId: "hub-3",
          text: "We sent two of our junior barbers to your last class. The improvement has been incredible!",
          timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString()
        }
      ],
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
    }
  ];

  const { data: posts = mockPosts, isLoading, refetch } = useQuery<Post[]>({
    queryKey: ["/api/community/feed", filterType, searchQuery],
    initialData: mockPosts
  });

  const createPostMutation = useMutation({
    mutationFn: async (postData: { content: string; images: string[] }) => {
      const newPost: Post = {
        id: `post-${Date.now()}`,
        authorId: user?.id || "",
        authorName: user?.displayName || "Anonymous",
        authorRole: (user?.currentRole as any) || "professional",
        authorAvatar: user?.profileImageURL,
        content: postData.content,
        images: postData.images,
        postType: "social",
        likes: 0,
        comments: [],
        timestamp: new Date().toISOString(),
        isLiked: false
      };
      
      // In real app, would make API call
      return newPost;
    },
    onSuccess: (newPost) => {
      queryClient.setQueryData(["/api/community/feed", filterType, searchQuery], (oldPosts: Post[] = []) => [
        newPost,
        ...oldPosts
      ]);
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

  const handleLike = (postId: string) => {
    const newLikedPosts = new Set(likedPosts);
    const isCurrentlyLiked = likedPosts.has(postId);
    
    if (isCurrentlyLiked) {
      newLikedPosts.delete(postId);
    } else {
      newLikedPosts.add(postId);
    }
    
    setLikedPosts(newLikedPosts);

    // Update post data
    queryClient.setQueryData(["/api/community/feed", filterType, searchQuery], (oldPosts: Post[] = []) =>
      oldPosts.map(post =>
        post.id === postId
          ? {
              ...post,
              likes: isCurrentlyLiked ? post.likes - 1 : post.likes + 1,
              isLiked: !isCurrentlyLiked
            }
          : post
      )
    );
  };

  const handleComment = async (postId: string, commentText: string) => {
    const newComment = {
      id: `comment-${Date.now()}`,
      author: user?.displayName || "Anonymous",
      authorId: user?.id || "",
      text: commentText,
      timestamp: new Date().toISOString()
    };

    // Update post data
    queryClient.setQueryData(["/api/community/feed", filterType, searchQuery], (oldPosts: Post[] = []) =>
      oldPosts.map(post =>
        post.id === postId
          ? {
              ...post,
              comments: [...post.comments, newComment]
            }
          : post
      )
    );
  };

  const handleCreatePost = (postData: { content: string; images: string[] }) => {
    createPostMutation.mutate(postData);
  };

  const filteredPosts = posts.filter(post => {
    const matchesType = filterType === "all" || 
                       (filterType === "social" && post.postType === "social") ||
                       (filterType === "jobs" && post.postType === "job");
    
    const matchesSearch = !searchQuery || 
                         post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.authorName.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesType && matchesSearch;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Feed Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Community Feed
            </h1>
            <p className="text-gray-600">
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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
        <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
          <span>{filteredPosts.length} posts</span>
          <span>{filteredPosts.filter(p => p.postType === "social").length} social posts</span>
          <span>{filteredPosts.filter(p => p.postType === "job").length} job posts</span>
        </div>
      </div>

      {/* Post Creation Form */}
      {showCreatePost && user && (
        <PostCreationForm
          userRole={user.currentRole as any}
          userName={user.displayName || user.email}
          userAvatar={user.profileImageURL}
          onSubmit={handleCreatePost}
          isSubmitting={createPostMutation.isPending}
        />
      )}

      {/* Posts Feed */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="w-full">
                <CardContent className="pt-6">
                  <div className="animate-pulse space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div>
                        <div className="w-32 h-4 bg-gray-200 rounded mb-1"></div>
                        <div className="w-24 h-3 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="w-full h-4 bg-gray-200 rounded"></div>
                      <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
                      <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={{
                ...post,
                isLiked: likedPosts.has(post.id)
              }}
              onLike={handleLike}
              onComment={handleComment}
              currentUserId={user?.id}
            />
          ))
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? "No posts found" : "No posts yet"}
                </h3>
                <p className="text-gray-500 mb-4">
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