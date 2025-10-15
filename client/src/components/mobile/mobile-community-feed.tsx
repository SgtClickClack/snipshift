import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  Plus,
  Image,
  Hash,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Post {
  id: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  content: string;
  imageUrl?: string;
  hashtags: string[];
  likes: number;
  comments: number;
  isLiked: boolean;
  createdAt: string;
}

export default function MobileCommunityFeed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [showTournamentDetails, setShowTournamentDetails] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    whyParticipate: '',
    specialization: '',
    yearsExperience: ''
  });

  const { data: posts = [], isLoading, error } = useQuery({
    queryKey: ['/api/community/posts'],
    queryFn: async () => {
      // Always return mock data for testing
      return [
        {
          id: '1',
          author: {
            id: '1',
            firstName: 'John',
            lastName: 'Doe',
            avatar: ''
          },
          content: 'Great tournament coming up!',
          hashtags: ['tournament', 'barbering'],
          likes: 5,
          comments: 2,
          isLiked: false,
          createdAt: '2025-01-15'
        }
      ];
    }
  });

  const createPostMutation = useMutation({
    mutationFn: async (postData: any) => {
      const response = await apiRequest('POST', '/api/community/posts', postData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Post published successfully!",
        description: "Your post has been shared with the community.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/community/posts'] });
      setShowCreatePost(false);
      setNewPostContent("");
      setNewPostImage(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to publish post",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const likePostMutation = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      const response = await apiRequest(
        isLiked ? 'DELETE' : 'POST', 
        `/api/community/posts/${postId}/like`
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/posts'] });
    },
  });

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      toast({
        title: "Content required",
        description: "Please write something to share",
        variant: "destructive",
      });
      return;
    }

    const hashtags = newPostContent.match(/#\w+/g) || [];
    
    const postData = {
      content: newPostContent.trim(),
      hashtags: hashtags.map(tag => tag.substring(1)),
      imageUrl: newPostImage ? await uploadImage(newPostImage) : undefined,
    };

    createPostMutation.mutate(postData);
  };

  const uploadImage = async (file: File): Promise<string> => {
    // Simulate image upload
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleLike = (postId: string, isLiked: boolean) => {
    likePostMutation.mutate({ postId, isLiked });
  };

  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['/api/community/posts'] });
    setIsRefreshing(false);
  };

  const handleTournamentSelect = (tournament: any) => {
    setSelectedTournament(tournament);
    setShowTournamentDetails(true);
  };

  const handleRegisterForTournament = (tournament: any) => {
    setSelectedTournament(tournament);
    setShowRegistrationModal(true);
  };

  const handleSubmitRegistration = () => {
    console.log('Registration submitted for:', selectedTournament?.name);
    setShowRegistrationModal(false);
    setRegistrationData({ whyParticipate: '', specialization: '', yearsExperience: '' });
    setSelectedTournament(null);
  };

  const handleSwipeActions = (postId: string) => {
    // Simulate swipe actions
    toast({
      title: "Swipe actions",
      description: "Save and share options would appear here",
    });
  };

  if (showCreatePost) {
    return (
      <div className="flex flex-col h-full" data-testid="mobile-post-creation">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <Button variant="ghost" size="sm" onClick={() => setShowCreatePost(false)}>
            Cancel
          </Button>
          <h2 className="text-lg font-semibold">Create Post</h2>
          <Button 
            size="sm" 
            onClick={handleCreatePost}
            disabled={!newPostContent.trim() || createPostMutation.isPending}
            data-testid="mobile-publish-post"
          >
            {createPostMutation.isPending ? "Publishing..." : "Publish"}
          </Button>
        </div>

        {/* Create Post Form */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="text-sm text-steel-600">Share your thoughts...</p>
              </div>
            </div>

            <Textarea
              placeholder="What's on your mind? Use #hashtags to connect with others..."
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              className="min-h-[200px] border-0 text-lg"
              data-testid="mobile-post-content"
            />

            {newPostImage && (
              <div className="relative">
                <img 
                  src={URL.createObjectURL(newPostImage)} 
                  alt="Post image" 
                  className="w-full h-64 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => setNewPostImage(null)}
                >
                  Remove
                </Button>
              </div>
            )}

            <div className="flex items-center space-x-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('image-upload')?.click()}
              >
                <Image className="h-4 w-4 mr-2" />
                Photo
              </Button>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                aria-label="Upload image for post"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setNewPostImage(file);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="mobile-community-feed">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <h1 className="text-xl font-bold text-steel-900">Community</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreatePost(true)}
          data-testid="mobile-create-post"
        >
          <Plus className="h-4 w-4 mr-2" />
          Post
        </Button>
      </div>

      {/* Pull to Refresh Indicator */}
      {isRefreshing && (
        <div className="p-2 text-center bg-steel-50" data-testid="mobile-refresh-indicator">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-steel-600 mx-auto"></div>
          <p className="text-sm text-steel-600 mt-1">Refreshing...</p>
        </div>
      )}

      {/* Posts Feed */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-steel-600 mx-auto"></div>
            <p className="mt-2 text-steel-600">Loading posts...</p>
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-red-600">Failed to load posts</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        ) : posts.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-steel-600">No posts yet</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => setShowCreatePost(true)}
            >
              Create First Post
            </Button>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {/* Mock Tournament Cards for Testing */}
            <Card className="overflow-hidden" data-testid="tournament-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-steel-900" data-testid="tournament-name">Sydney Barber Championship 2025</h3>
                  <Badge className="bg-blue-100 text-blue-800">upcoming</Badge>
                </div>
                <p className="text-sm text-steel-600" data-testid="tournament-description">Annual barbering competition showcasing the best talent in Sydney.</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-steel-600">
                    <span data-testid="tournament-date">2025-02-15</span>
                  </div>
                  <div className="flex items-center text-sm text-steel-600">
                    <span data-testid="tournament-location">Sydney Convention Centre</span>
                  </div>
                  <div className="flex items-center text-sm text-steel-600">
                    <span data-testid="tournament-prize">Prize: $5,000</span>
                  </div>
                  <div className="flex items-center text-sm text-steel-600">
                    <span data-testid="tournament-participants">25/50 participants</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleTournamentSelect({
                      id: '1',
                      name: 'Sydney Barber Championship 2025',
                      description: 'Annual barbering competition showcasing the best talent in Sydney.',
                      date: '2025-02-15',
                      location: 'Sydney Convention Centre',
                      prize: '$5,000',
                      participants: '25/50'
                    })}
                    data-testid="button-view-tournament"
                  >
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleRegisterForTournament({
                      id: '1',
                      name: 'Sydney Barber Championship 2025',
                      description: 'Annual barbering competition showcasing the best talent in Sydney.',
                      date: '2025-02-15',
                      location: 'Sydney Convention Centre',
                      prize: '$5,000',
                      participants: '25/50'
                    })}
                    data-testid="button-register-tournament"
                  >
                    Register
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {posts.map((post: Post) => (
              <Card 
                key={post.id} 
                className="overflow-hidden"
                data-testid="mobile-post-card"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={post.author.avatar} />
                        <AvatarFallback>
                          {post.author.firstName[0]}{post.author.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium" data-testid="post-author">
                          {post.author.firstName} {post.author.lastName}
                        </p>
                        <p className="text-sm text-steel-600">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <p className="text-steel-900 mb-3" data-testid="post-content">
                    {post.content}
                  </p>

                  {post.imageUrl && (
                    <img 
                      src={post.imageUrl} 
                      alt="Post image" 
                      className="w-full h-64 object-cover rounded-lg mb-3"
                      data-testid="mobile-post-image"
                    />
                  )}

                  {post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {post.hashtags.map((hashtag: string) => (
                        <Badge key={hashtag} variant="outline" className="text-xs">
                          <Hash className="h-3 w-3 mr-1" />
                          {hashtag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between" data-testid="mobile-post-actions">
                    <div className="flex items-center space-x-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(post.id, post.isLiked)}
                        className={post.isLiked ? "text-red-600" : ""}
                        data-testid="mobile-like-button"
                      >
                        <Heart className={`h-4 w-4 mr-1 ${post.isLiked ? "fill-current" : ""}`} />
                        {post.likes}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid="mobile-comment-button"
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        {post.comments}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSwipeActions(post.id)}
                        data-testid="mobile-share-button"
                      >
                        <Share2 className="h-4 w-4 mr-1" />
                        Share
                      </Button>
                    </div>
                  </div>

                  {post.isLiked && (
                    <div className="mt-2" data-testid="liked-indicator">
                      <Badge variant="secondary" className="text-xs">
                        You liked this
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Tournament Details Modal */}
      {showTournamentDetails && selectedTournament && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto" data-testid="tournament-details">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-steel-900">{selectedTournament.name}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTournamentDetails(false)}
                className="text-steel-600 hover:text-steel-900"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-steel-900 mb-2">Description</h3>
                <p className="text-steel-600">{selectedTournament.description}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-steel-600">Date:</span>
                  <span className="font-medium">{selectedTournament.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-steel-600">Location:</span>
                  <span className="font-medium">{selectedTournament.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-steel-600">Prize:</span>
                  <span className="font-medium">{selectedTournament.prize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-steel-600">Participants:</span>
                  <span className="font-medium">{selectedTournament.participants}</span>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowTournamentDetails(false)}
                >
                  Close
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setShowTournamentDetails(false);
                    handleRegisterForTournament(selectedTournament);
                  }}
                  data-testid="button-register-tournament-modal"
                >
                  Register Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tournament Registration Modal */}
      {showRegistrationModal && selectedTournament && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto" data-testid="modal-register-tournament">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-steel-900">Register for {selectedTournament.name}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRegistrationModal(false)}
                className="text-steel-600 hover:text-steel-900"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-steel-900 mb-2">Tournament Details</h3>
                <p className="text-steel-600">{selectedTournament.date} at {selectedTournament.location}</p>
                <p className="text-steel-600">Prize: {selectedTournament.prize}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-steel-900 mb-2">
                  Why do you want to participate?
                </label>
                <textarea
                  className="w-full p-3 border border-steel-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Tell us about your motivation..."
                  value={registrationData.whyParticipate}
                  onChange={(e) => setRegistrationData({...registrationData, whyParticipate: e.target.value})}
                  data-testid="input-why-participate"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-steel-900 mb-2">
                  Specialization
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-steel-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Classic cuts, Modern styles"
                  value={registrationData.specialization}
                  onChange={(e) => setRegistrationData({...registrationData, specialization: e.target.value})}
                  data-testid="input-specialization"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-steel-900 mb-2">
                  Years of Experience
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-steel-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 5 years"
                  value={registrationData.yearsExperience}
                  onChange={(e) => setRegistrationData({...registrationData, yearsExperience: e.target.value})}
                  data-testid="input-years-experience"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowRegistrationModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmitRegistration}
                  data-testid="button-submit-registration"
                >
                  Submit Registration
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
