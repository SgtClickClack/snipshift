import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ImageCropper } from "@/components/ui/image-cropper";
import { useImageUpload } from "@/hooks/use-image-upload";
import { apiRequest } from "@/lib/queryClient";
import { updateBusinessProfile } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardHeaderProps {
  /** Banner image URL */
  bannerImage?: string | null;
  /** Profile/Logo image URL */
  profileImage?: string | null;
  /** Title text (e.g., "Professional Dashboard" or business name) */
  title: string;
  /** Subtitle text (e.g., user email or business description) */
  subtitle?: string;
  /** Whether the header is in edit mode (shows edit buttons) */
  editable?: boolean;
  /** Callback when banner is uploaded, receives the download URL */
  onBannerUpload?: (url: string) => void;
  /** Callback when logo/avatar is uploaded, receives the download URL */
  onLogoUpload?: (url: string) => void;
  /** Additional className for the container */
  className?: string;
}

export default function DashboardHeader({
  bannerImage,
  profileImage,
  title,
  subtitle,
  editable = false,
  onBannerUpload,
  onLogoUpload,
  className,
}: DashboardHeaderProps) {
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const { isCompressing: isCompressingBanner, handleImageSelect: handleBannerImageSelect } = useImageUpload();
  const { isCompressing: isCompressingLogo, handleImageSelect: handleLogoImageSelect } = useImageUpload();
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [showBannerCropper, setShowBannerCropper] = useState(false);
  const [bannerImageSrc, setBannerImageSrc] = useState<string | null>(null);
  const [localBannerUrl, setLocalBannerUrl] = useState<string | null | undefined>(bannerImage);
  const [localLogoUrl, setLocalLogoUrl] = useState<string | null | undefined>(profileImage);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Sync local state with props when they change externally
  useEffect(() => {
    setLocalBannerUrl((current) => {
      // Only update if prop is different from current state
      // This prevents overwriting manual updates unnecessarily
      return bannerImage !== current ? bannerImage : current;
    });
  }, [bannerImage]);

  useEffect(() => {
    setLocalLogoUrl((current) => {
      // Only update if prop is different from current state
      // This prevents overwriting manual updates unnecessarily
      return profileImage !== current ? profileImage : current;
    });
  }, [profileImage]);

  const avatarInitials = title
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const handleBannerFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      // Reset input if no file selected
      if (bannerFileInputRef.current) {
        bannerFileInputRef.current.value = '';
      }
      return;
    }

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
      toast({
        title: "Invalid file type",
        description: "Please select a valid image file (JPEG, PNG, GIF, or WebP).",
        variant: "destructive",
      });
      if (bannerFileInputRef.current) {
        bannerFileInputRef.current.value = '';
      }
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
      if (bannerFileInputRef.current) {
        bannerFileInputRef.current.value = '';
      }
      return;
    }

    // Create object URL for the cropper immediately (no compression before cropper)
    try {
      const imageUrl = URL.createObjectURL(file);
      setBannerImageSrc(imageUrl);
      setShowBannerCropper(true);
    } catch (error) {
      console.error('Error creating image URL:', error);
      toast({
        title: "Error",
        description: "Failed to load image. Please try again.",
        variant: "destructive",
      });
      if (bannerFileInputRef.current) {
        bannerFileInputRef.current.value = '';
      }
    }
  };

  const handleBannerCropComplete = async (croppedImageBlob: Blob) => {
    // Validation First: Check if blob exists
    if (!croppedImageBlob) {
      console.error('Banner crop complete called with no blob');
      return;
    }

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
      // Reset input
      if (bannerFileInputRef.current) {
        bannerFileInputRef.current.value = '';
      }
      return;
    }

    setIsUploadingBanner(true);

    try {
      // Convert blob to File for compression
      const croppedFile = new File([croppedImageBlob], 'banner.jpg', { type: 'image/jpeg' });
      
      // The "Real" Await: Compress the cropped image
      const compressedFile = await handleBannerImageSelect(croppedFile);
      if (!compressedFile) {
        throw new Error('Compression failed - no file returned');
      }

      const userId = firebaseUser.uid;
      const storagePath = `users/${userId}/banner.jpg`;
      const storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, compressedFile);

      // The "Real" Await: Wait for Firebase upload to complete
      const downloadURL = await new Promise<string>((resolve, reject) => {
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
            console.error("Banner Firebase upload error:", error);
            reject(error);
          },
          async () => {
            clearTimeout(timeoutId);
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            } catch (error) {
              console.error("Error getting banner download URL:", error);
              reject(error);
            }
          }
        );
      });

      console.log('Banner Firebase upload response:', downloadURL);

      // The "Real" Await: Call API to update profile in database
      const responseData = await updateBusinessProfile({
        bannerUrl: downloadURL,
      });

      console.log('Banner API upload response:', responseData);

      // Check the Result: Verify we got a valid URL back
      if (!responseData.bannerUrl || typeof responseData.bannerUrl !== 'string') {
        throw new Error('API did not return a valid banner URL');
      }

      // Log the new banner URL for debugging
      console.log('New Banner URL:', responseData.bannerUrl);

      // Force UI Refresh (Cache Busting): Append timestamp to URL
      const newUrl = `${responseData.bannerUrl}?t=${Date.now()}`;
      
      // Update local state immediately so user sees the change
      setLocalBannerUrl(newUrl);
      
      // Call parent callback with the new URL
      onBannerUpload?.(newUrl);

      // Only show success if API succeeded
      toast({
        title: "Banner updated",
        description: "Your banner image has been successfully uploaded.",
      });

      // Refresh global user state to get fresh image URLs
      if (refreshUser) {
        refreshUser().catch(err => console.error('Failed to refresh user after banner upload:', err));
      }
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
    // Always reset input on cancel
    if (bannerFileInputRef.current) {
      bannerFileInputRef.current.value = '';
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Validation First: Check if file exists immediately
    const file = e.target.files?.[0];
    if (!file) {
      // Reset input if no file selected
      if (logoFileInputRef.current) {
        logoFileInputRef.current.value = '';
      }
      return;
    }

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
      toast({
        title: "Invalid file type",
        description: "Please select a valid image file (JPEG, PNG, GIF, or WebP).",
        variant: "destructive",
      });
      if (logoFileInputRef.current) {
        logoFileInputRef.current.value = '';
      }
      return;
    }

    // Validate file size (5MB limit) before processing
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      if (logoFileInputRef.current) {
        logoFileInputRef.current.value = '';
      }
      return;
    }

    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload images.",
        variant: "destructive",
      });
      if (logoFileInputRef.current) {
        logoFileInputRef.current.value = '';
      }
      return;
    }

    // Set uploading state immediately
    setIsUploadingLogo(true);

    try {
      // The "Real" Await: Compress the image
      const compressedFile = await handleLogoImageSelect(file);
      if (!compressedFile) {
        throw new Error('Compression failed - no file returned');
      }

      const userId = firebaseUser.uid;
      const fileExtension = 'jpg'; // Always use jpg after compression
      const storagePath = `users/${userId}/avatar.${fileExtension}`;
      const storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, compressedFile);

      // The "Real" Await: Wait for Firebase upload to complete
      const downloadURL = await new Promise<string>((resolve, reject) => {
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
            console.error("Logo Firebase upload error:", error);
            reject(error);
          },
          async () => {
            clearTimeout(timeoutId);
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            } catch (error) {
              console.error("Error getting logo download URL:", error);
              reject(error);
            }
          }
        );
      });

      console.log('Logo Firebase upload response:', downloadURL);

      // The "Real" Await: Call API to update profile in database
      const responseData = await updateBusinessProfile({
        avatarUrl: downloadURL,
      });

      console.log('Logo API upload response:', responseData);

      // Check the Result: Verify we got a valid URL back
      if (!responseData.avatarUrl || typeof responseData.avatarUrl !== 'string') {
        throw new Error('API did not return a valid avatar URL');
      }

      // Force UI Refresh (Cache Busting): Append timestamp to URL
      const newUrl = responseData.avatarUrl + '?t=' + new Date().getTime();
      
      // Update local state immediately so user sees the change
      setLocalLogoUrl(newUrl);
      
      // Call parent callback with the new URL
      onLogoUpload?.(newUrl);

      // Only show success if API succeeded
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been successfully uploaded.",
      });

      // Refresh global user state to get fresh image URLs
      if (refreshUser) {
        refreshUser().catch(err => console.error('Failed to refresh user after logo upload:', err));
      }
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      const errorMessage = error.message || "Failed to upload profile picture. Please try again.";
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
      if (logoFileInputRef.current) {
        logoFileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={cn("relative w-full h-48 md:h-64 rounded-lg overflow-visible mb-16", className)}>
      {/* Banner Image or Gradient Fallback */}
      {localBannerUrl ? (
        <OptimizedImage
          src={localBannerUrl}
          alt="Banner"
          priority={true}
          fallbackType="banner"
          className="w-full h-full object-cover rounded-lg"
          containerClassName="w-full h-full"
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
            className="absolute top-2 right-2 md:top-4 md:right-4 bg-card/90 hover:bg-card shadow-md z-50 pointer-events-auto"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              bannerFileInputRef.current?.click();
            }}
            disabled={isUploadingBanner || isCompressingBanner}
          >
            {isUploadingBanner || isCompressingBanner ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span className="hidden sm:inline">
                  {isCompressingBanner ? "Compressing..." : "Uploading..."}
                </span>
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
            disabled={isUploadingBanner || isCompressingBanner}
          />
          {bannerImageSrc && (
            <ImageCropper
              imageSrc={bannerImageSrc}
              aspectRatio={5 / 1}
              onCropComplete={handleBannerCropComplete}
              onCancel={handleBannerCropCancel}
              open={showBannerCropper}
            />
          )}
        </>
      )}

      {/* Avatar/Logo Container (overlapping bottom-left) */}
      <div className="absolute -bottom-12 left-4 z-10">
        <div className="relative">
          <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-background shadow-lg">
            <AvatarImage src={localLogoUrl || undefined} alt={title} />
            <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
              {avatarInitials}
            </AvatarFallback>
          </Avatar>
          
          {/* Logo Edit Button (overlay on hover, always visible on mobile) */}
          {editable && (
            <>
              <label
                htmlFor="logo-upload-input"
                className="absolute inset-0 rounded-full bg-black bg-opacity-0 hover:bg-opacity-50 active:bg-opacity-50 md:active:bg-opacity-0 transition-all duration-200 flex items-center justify-center cursor-pointer group"
              >
                {isUploadingLogo || isCompressingLogo ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white opacity-50 md:opacity-0 group-hover:opacity-100 md:group-hover:opacity-100 transition-opacity duration-200" />
                )}
              </label>
              <input
                id="logo-upload-input"
                ref={logoFileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleLogoUpload}
                className="hidden"
                disabled={isUploadingLogo || isCompressingLogo}
              />
            </>
          )}
        </div>
      </div>

      {/* Title and Subtitle (overlapping bottom-right) */}
      <div className="absolute -bottom-12 left-40 md:left-48 right-4 z-10 min-w-0">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground break-words line-clamp-2">{title}</h1>
        {subtitle && (
          <p className="text-sm md:text-base text-muted-foreground break-words line-clamp-1 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

