import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Share, MapPin, Calendar, DollarSign, Briefcase, Loader2 } from "lucide-react";
import { format } from "date-fns";
import StartChatButton from "@/components/messaging/start-chat-button";
import { Post } from "@/shared/types";
import { apiRequest } from "@/lib/queryClient";

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment?: (postId: string, comment: string) => Promise<void>;
  currentUserId?: string;
}

export default function PostCard({ post, onLike, onComment, currentUserId }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Fetch comments when expanded
  const { data: fetchedComments = [], isLoading: isLoadingComments, refetch: refetchComments } = useQuery({
    queryKey: [`/api/community/${post.id}/comments`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/community/${post.id}/comments`);
      const data = await res.json();
      // Map backend comment structure to frontend expectation if needed
      return data.map((c: any) => ({
        id: c.id,
        author: c.authorName || "Unknown",
        authorAvatar: c.authorAvatar,
        text: c.content,
        timestamp: c.createdAt
      }));
    },
    enabled: showComments,
  });

  const getRoleColor = (role?: string) => {
    switch (role) {
      case "professional":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case "hub":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "brand":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100";
      case "trainer":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPostTypeIcon = () => {
    if (post.postType === "job") {
      return <Briefcase className="w-4 h-4" />;
    }
    return null;
  };

  const handleLike = () => {
    onLike(post.id);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !onComment) return;

    setIsSubmittingComment(true);
    try {
      await onComment(post.id, newComment.trim());
      setNewComment("");
      refetchComments(); // Refresh comments after posting
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const authorName = post.authorName || "Unknown User";
  // Use fetched comments if available, otherwise fall back to post.comments (which might be empty initially)
  // If showComments is true, we rely on fetchedComments (or loading state)
  const comments = showComments ? fetchedComments : (post.comments || []);
  const commentCountDisplay = showComments ? fetchedComments.length : (post.commentsCount !== undefined ? post.commentsCount : (post.comments?.length || 0));
  const timestamp = post.timestamp || post.createdAt || new Date().toISOString();

  return (
    <Card className="w-full" data-testid={`post-${post.id}`}>
      <CardContent className="pt-6">
        {/* Post Header */}
        <div className="flex items-start gap-3 mb-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src={post.authorAvatar} alt={authorName} />
            <AvatarFallback className="font-medium">
              {authorName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-foreground" data-testid={`post-author-${post.id}`}>
                {authorName}
              </h4>
              <Badge variant="outline" className={getRoleColor(post.authorRole)}>
                {getPostTypeIcon()}
                {post.postType === "job" ? "Job Post" : (post.authorRole || "Member")}
              </Badge>
              {post.postType === "job" && post.location && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="w-3 h-3 mr-1" />
                  {post.location.city}, {post.location.state}
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(timestamp), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {post.authorId !== currentUserId && (
              <StartChatButton
                otherUserId={post.authorId}
                otherUserName={authorName}
                otherUserRole={post.authorRole as any}
                variant="ghost"
                size="sm"
              />
            )}
          </div>
        </div>

        {/* Post Content */}
        <div className="mb-4 overflow-hidden">
          <p className="text-foreground whitespace-pre-wrap break-words mb-3" data-testid={`post-content-${post.id}`}>
            {post.content}
          </p>

          {/* Job-specific info */}
          {post.postType === "job" && (
            <div className="bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                {post.date && (
                  <div className="flex items-center text-blue-700">
                    <Calendar className="w-4 h-4 mr-1" />
                    {format(new Date(post.date), "MMM d, yyyy")}
                  </div>
                )}
                {post.payRate && (
                  <div className="flex items-center text-blue-700">
                    <DollarSign className="w-4 h-4 mr-1" />
                    ${post.payRate}/{post.payType}
                  </div>
                )}
              </div>
              
              {post.skillsRequired && post.skillsRequired.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-blue-600 mb-1">Skills Required:</p>
                  <div className="flex flex-wrap gap-1">
                    {post.skillsRequired.slice(0, 5).map((skill, index) => (
                      <Badge key={`${skill}-${index}`} variant="outline" className="text-xs bg-white">
                        {skill}
                      </Badge>
                    ))}
                    {post.skillsRequired.length > 5 && (
                      <Badge variant="outline" className="text-xs bg-white">
                        +{post.skillsRequired.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Images */}
          {post.images && post.images.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {post.images.slice(0, 4).map((image, index) => (
                <div key={`${image}-${index}`} className="aspect-square bg-muted rounded-lg overflow-hidden">
                  <img
                    src={image}
                    alt={`Post image ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                    data-testid={`post-image-${post.id}-${index}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interaction Bar */}
        <div className="flex items-center justify-between py-2 border-t border-border">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`${
                post.isLiked ? 'text-red-600 hover:text-red-700' : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid={`button-like-${post.id}`}
            >
              <Heart className={`w-4 h-4 mr-1 ${post.isLiked ? 'fill-current' : ''}`} />
              {post.likes || 0}
            </Button>
            
            {onComment && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="text-muted-foreground hover:text-foreground"
              data-testid={`button-comments-${post.id}`}
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              {commentCountDisplay}
            </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              data-testid={`button-share-${post.id}`}
            >
              <Share className="w-4 h-4 mr-1" />
              Share
            </Button>
          </div>

          {post.postType === "job" && (
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid={`button-apply-${post.id}`}
            >
              Apply Now
            </Button>
          )}
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="border-t border-border pt-4 mt-2">
            {/* Comment Form */}
            <form onSubmit={handleSubmitComment} className="mb-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1"
                  data-testid={`input-comment-${post.id}`}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newComment.trim() || isSubmittingComment}
                  data-testid={`button-submit-comment-${post.id}`}
                >
                  {isSubmittingComment ? "..." : "Post"}
                </Button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-3">
              {isLoadingComments ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                  Loading comments...
                </div>
              ) : (
                <>
                  {comments.map((comment: any) => (
                    <div key={comment.id} className="flex gap-2" data-testid={`comment-${comment.id}`}>
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={comment.authorAvatar} />
                        <AvatarFallback className="text-xs">
                          {comment.author.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="bg-muted/50 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{comment.author}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comment.timestamp), "MMM d 'at' h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm text-foreground">{comment.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {comments.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      No comments yet. Be the first to comment!
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
