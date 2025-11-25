import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Share, MapPin, Calendar, DollarSign, Briefcase } from "lucide-react";
import { format } from "date-fns";
import StartChatButton from "@/components/messaging/start-chat-button";

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: "professional" | "hub" | "brand" | "trainer";
  authorAvatar?: string;
  content: string;
  images?: string[];
  postType: "social" | "job";
  likes: number;
  comments: Array<{
    id: string;
    author: string;
    authorId: string;
    text: string;
    timestamp: string;
  }>;
  timestamp: string;
  isLiked?: boolean;
  // Job-specific fields
  location?: {
    city: string;
    state: string;
  };
  payRate?: number;
  payType?: string;
  date?: string;
  skillsRequired?: string[];
}

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string, comment: string) => void;
  currentUserId?: string;
}

export default function PostCard({ post, onLike, onComment, currentUserId }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const getRoleColor = (role: string) => {
    switch (role) {
      case "professional":
        return "bg-blue-100 text-blue-800";
      case "hub":
        return "bg-green-100 text-green-800";
      case "brand":
        return "bg-purple-100 text-purple-800";
      case "trainer":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-steel-100 text-steel-800";
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
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    await onComment(post.id, newComment.trim());
    setNewComment("");
    setIsSubmittingComment(false);
  };

  return (
    <Card className="w-full" data-testid={`post-${post.id}`}>
      <CardContent className="pt-6">
        {/* Post Header */}
        <div className="flex items-start gap-3 mb-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src={post.authorAvatar} alt={post.authorName} />
            <AvatarFallback className="font-medium">
              {post.authorName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-steel-900" data-testid={`post-author-${post.id}`}>
                {post.authorName}
              </h4>
              <Badge variant="outline" className={getRoleColor(post.authorRole)}>
                {getPostTypeIcon()}
                {post.postType === "job" ? "Job Post" : post.authorRole}
              </Badge>
              {post.postType === "job" && post.location && (
                <div className="flex items-center text-sm text-steel-500">
                  <MapPin className="w-3 h-3 mr-1" />
                  {post.location.city}, {post.location.state}
                </div>
              )}
            </div>
            <p className="text-sm text-steel-500">
              {format(new Date(post.timestamp), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {post.authorId !== currentUserId && (
              <StartChatButton
                otherUserId={post.authorId}
                otherUserName={post.authorName}
                otherUserRole={post.authorRole}
                variant="ghost"
                size="sm"
              />
            )}
          </div>
        </div>

        {/* Post Content */}
        <div className="mb-4">
          <p className="text-steel-900 whitespace-pre-wrap mb-3" data-testid={`post-content-${post.id}`}>
            {post.content}
          </p>

          {/* Job-specific info */}
          {post.postType === "job" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
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
                      <Badge key={index} variant="outline" className="text-xs bg-white">
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
                <div key={index} className="aspect-square bg-steel-200 rounded-lg overflow-hidden">
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
        <div className="flex items-center justify-between py-2 border-t border-steel-100">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`${
                post.isLiked ? 'text-red-600 hover:text-red-700' : 'text-steel-600 hover:text-steel-700'
              }`}
              data-testid={`button-like-${post.id}`}
            >
              <Heart className={`w-4 h-4 mr-1 ${post.isLiked ? 'fill-current' : ''}`} />
              {post.likes}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="text-steel-600 hover:text-steel-700"
              data-testid={`button-comments-${post.id}`}
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              {post.comments.length}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-steel-600 hover:text-steel-700"
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
          <div className="border-t border-steel-100 pt-4 mt-2">
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
              {post.comments.map((comment) => (
                <div key={comment.id} className="flex gap-2" data-testid={`comment-${comment.id}`}>
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">
                      {comment.author.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="bg-steel-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{comment.author}</span>
                        <span className="text-xs text-steel-500">
                          {format(new Date(comment.timestamp), "MMM d 'at' h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm text-steel-900">{comment.text}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {post.comments.length === 0 && (
                <p className="text-steel-500 text-sm text-center py-4">
                  No comments yet. Be the first to comment!
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}