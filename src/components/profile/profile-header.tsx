import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ImageCropper } from "@/components/ui/image-cropper";

interface ProfileHeaderProps {
  /** Banner image URL */
  bannerUrl?: string | null;
  /** Avatar image URL */
  avatarUrl?: string | null;
  /** User's display name for fallback avatar */
  displayName?: string;
  /** Whether the header is in edit mode (shows edit buttons) */
  editable?: boolean;
  /** Callback when banner is uploaded, receives the download URL */
  onBannerUpload?: (url: string) => void;
  /** Callback when avatar is uploaded, receives the download URL */
  onAvatarUpload?: (url: string) => void;
  /** Additional className for the container */
  className?: string;
}

export default function ProfileHeader({
  bannerUrl,
  avatarUrl,
  displayName = "User",
  editable = false,
  onBannerUpload,
  onAvatarUpload,
  className,
}: ProfileHeaderProps) {
  const { toast } = useToast();
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showBannerCropper, setShowBannerCropper] = useState(false);
  const [bannerImageSrc, setBannerImageSrc] = useState<string | null>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const handleBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
      toast({
        title: "Invalid file type",
        description: "Please select a valid image file (JPEG, PNG, GIF, or WebP).",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    // Create object URL for the cropper
    const imageUrl = URL.createObjectURL(file);
    setBannerImageSrc(imageUrl);
    setShowBannerCropper(true);
  };

  const handleBannerCropComplete = async (croppedImageBlob: Blob) => {
    setShowBannerCropper(false);
    
    // Clean up the object URL
    if (bannerImageSrc) {
      URL.revokeObjectURL(bannerImageSrc);
      setBannerImageSrc(null);
    }

    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload images.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingBanner(true);

    try {
      const userId = firebaseUser.uid;
      const storagePath = `users/${userId}/banner.jpg`;
      const storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, croppedImageBlob);

      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          uploadTask.cancel();
          reject(new Error('Upload timeout'));
        }, 30000);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (progress > 0) {
              clearTimeout(timeoutId);
            }
          },
          (error: any) => {
            clearTimeout(timeoutId);
            console.error("Banner upload error:", error);
            reject(error);
          },
          async () => {
            clearTimeout(timeoutId);
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              onBannerUpload?.(downloadURL);
              toast({
                title: "Banner updated",
                description: "Your banner image has been successfully uploaded.",
              });
              resolve();
            } catch (error) {
              console.error("Error getting banner download URL:", error);
              reject(error);
            }
          }
        );
      });
    } catch (error: any) {
      console.error("Error uploading banner:", error);
      const errorMessage = error.message || "Failed to upload banner image. Please try again.";
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploadingBanner(false);
      if (bannerFileInputRef.current) {
        bannerFileInputRef.current.value = '';
      }
    }
  };

  const handleBannerCropCancel = () => {
    setShowBannerCropper(false);
    if (bannerImageSrc) {
      URL.revokeObjectURL(bannerImageSrc);
      setBannerImageSrc(null);
    }
    if (bannerFileInputRef.current) {
      bannerFileInputRef.current.value = '';
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
      toast({
        title: "Invalid file type",
        description: "Please select a valid image file (JPEG, PNG, GIF, or WebP).",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload images.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const userId = firebaseUser.uid;
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const storagePath = `users/${userId}/avatar.${fileExtension}`;
      const storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          uploadTask.cancel();
          reject(new Error('Upload timeout'));
        }, 30000);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (progress > 0) {
              clearTimeout(timeoutId);
            }
          },
          (error: any) => {
            clearTimeout(timeoutId);
            console.error("Avatar upload error:", error);
            reject(error);
          },
          async () => {
            clearTimeout(timeoutId);
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              onAvatarUpload?.(downloadURL);
              toast({
                title: "Profile picture updated",
                description: "Your profile picture has been successfully uploaded.",
              });
              resolve();
            } catch (error) {
              console.error("Error getting avatar download URL:", error);
              reject(error);
            }
          }
        );
      });
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      const errorMessage = error.message || "Failed to upload profile picture. Please try again.";
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = '';
      }
    }
  };

  const avatarInitials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <div className={cn("relative w-full h-48 md:h-64 rounded-lg overflow-visible", className)}>
      {/* Banner Image or Gradient Fallback */}
      {bannerUrl ? (
        <img
          src={bannerUrl}
          alt="Banner"
          className="w-full h-full object-cover rounded-lg"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg" />
      )}

      {/* Banner Edit Button (top-right) */}
      {editable && (
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="absolute top-2 right-2 md:top-4 md:right-4 bg-card/90 hover:bg-card shadow-md z-10"
            onClick={() => bannerFileInputRef.current?.click()}
            disabled={isUploadingBanner}
          >
            {isUploadingBanner ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span className="hidden sm:inline">Uploading...</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Edit Banner</span>
                <span className="sm:hidden">Banner</span>
              </>
            )}
          </Button>
          <input
            ref={bannerFileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleBannerFileSelect}
            className="hidden"
            disabled={isUploadingBanner}
          />
          {bannerImageSrc && (
            <ImageCropper
              imageSrc={bannerImageSrc}
              aspectRatio={16 / 9}
              onCropComplete={handleBannerCropComplete}
              onCancel={handleBannerCropCancel}
              open={showBannerCropper}
            />
          )}
        </>
      )}

      {/* Avatar Container (overlapping bottom-left) */}
      <div className="absolute -bottom-12 left-4 z-elevated">
        <div className="relative">
          <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-white shadow-lg">
            <AvatarImage src={avatarUrl || undefined} alt={displayName} />
            <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
              {avatarInitials}
            </AvatarFallback>
          </Avatar>
          
          {/* Avatar Edit Button (overlay on hover, always visible on mobile) */}
          {editable && (
            <>
              <label
                htmlFor="avatar-upload-input"
                className="absolute inset-0 rounded-full bg-black bg-opacity-0 hover:bg-opacity-50 active:bg-opacity-50 md:active:bg-opacity-0 transition-all duration-200 flex items-center justify-center cursor-pointer group"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white opacity-50 md:opacity-0 group-hover:opacity-100 md:group-hover:opacity-100 transition-opacity duration-200" />
                )}
              </label>
              <input
                id="avatar-upload-input"
                ref={avatarFileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={isUploadingAvatar}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

