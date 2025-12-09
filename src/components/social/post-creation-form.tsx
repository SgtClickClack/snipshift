import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Image, Send, X } from "lucide-react";

interface PostCreationFormProps {
  userRole: "professional" | "hub" | "brand" | "trainer";
  userName: string;
  userAvatar?: string;
  onSubmit: (postData: {
    content: string;
    images: string[];
  }) => void;
  isSubmitting?: boolean;
}

export default function PostCreationForm({
  userRole,
  userName,
  userAvatar,
  onSubmit,
  isSubmitting = false
}: PostCreationFormProps) {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);

  const canCreatePosts = userRole === "brand" || userRole === "trainer";

  const getRoleColor = (role: string) => {
    switch (role) {
      case "brand":
        return "bg-purple-100 text-purple-800";
      case "trainer":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-steel-100 text-steel-800";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    onSubmit({
      content: content.trim(),
      images: images
    });

    // Reset form
    setContent("");
    setImages([]);
    setImageUrl("");
    setShowImageInput(false);
  };

  const handleAddImage = () => {
    if (imageUrl.trim() && !images.includes(imageUrl.trim())) {
      setImages([...images, imageUrl.trim()]);
      setImageUrl("");
      setShowImageInput(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const simulateImageUpload = () => {
    // Simulate image upload with a random Unsplash image
    const mockImage = `https://images.unsplash.com/photo-${Date.now()}?w=400&h=400&fit=crop`;
    setImages([...images, mockImage]);
  };

  if (!canCreatePosts) {
    return (
      <Card className="w-full mb-6">
        <CardContent className="pt-6">
          <div className="text-center py-6">
            <p className="text-steel-500 mb-2">
              Social posting is currently available for Brands and Trainers.
            </p>
            <p className="text-sm text-steel-400">
              {userRole === "professional" && "Professionals can interact with posts and apply to jobs."}
              {userRole === "hub" && "Businesses can post jobs through the job posting feature."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mb-6">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit}>
          {/* User Info Header */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-10 h-10">
              <AvatarImage src={userAvatar} alt={userName} />
              <AvatarFallback className="font-medium">
                {userName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{userName}</p>
              <Badge variant="outline" className={getRoleColor(userRole)}>
                {userRole}
              </Badge>
            </div>
          </div>

          {/* Content Input */}
          <div className="space-y-4">
            <Textarea
              placeholder={`What's happening in the ${userRole === 'brand' ? 'brand' : 'training'} world?`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] resize-none border-0 bg-steel-50 dark:bg-steel-900/50 focus:bg-white dark:focus:bg-steel-800 transition-colors"
              data-testid="textarea-post-content"
            />

            {/* Image Preview */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square bg-steel-200 rounded-lg overflow-hidden">
                      <img
                        src={image}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveImage(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Image URL Input */}
            {showImageInput && (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter image URL..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddImage())}
                  className="flex-1"
                  data-testid="input-image-url"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddImage}
                  disabled={!imageUrl.trim()}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowImageInput(false);
                    setImageUrl("");
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-steel-100">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowImageInput(!showImageInput)}
                className="text-steel-600 hover:text-steel-700"
                data-testid="button-add-image"
              >
                <Image className="w-4 h-4 mr-1" />
                Add Image
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={simulateImageUpload}
                className="text-steel-600 hover:text-steel-700"
                data-testid="button-upload-image"
              >
                <Image className="w-4 h-4 mr-1" />
                Upload
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-steel-400">
                {content.length}/500
              </span>
              <Button
                type="submit"
                disabled={!content.trim() || content.length > 500 || isSubmitting}
                className="bg-primary hover:bg-primary/90"
                data-testid="button-submit-post"
              >
                <Send className="w-4 h-4 mr-1" />
                {isSubmitting ? "Posting..." : "Post"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}