import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { ImageCropper } from "@/components/ui/image-cropper";
import { useImageUpload } from "@/hooks/useImageUpload";
import { apiRequest } from "@/lib/queryClient";
import { updateBusinessProfile, updateUserProfile } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";

interface DashboardHeaderProps {
  // New API props
  /** User object - if provided, extracts bannerImage and profileImage from user */
  user?: User | null;
  /** Business object - if provided, extracts bannerImage and profileImage from business */
  business?: any | null;
  /** Whether this is a brand dashboard (affects upload endpoint) */
  isBrand?: boolean;
  /** Whether this is a trainer dashboard (affects upload endpoint) */
  isTrainer?: boolean;
  
  // Legacy API props (for backward compatibility)
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

// Helper function to extract URL string from various object structures
function extractUrlString(value: any): string | null {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object') {
    // Try common object structures
    if (value.bannerUrl && typeof value.bannerUrl === 'string') {
      return value.bannerUrl;
    }
    if (value.bannerImage && typeof value.bannerImage === 'string') {
      return value.bannerImage;
    }
    if (value.data?.bannerUrl && typeof value.data.bannerUrl === 'string') {
      return value.data.bannerUrl;
    }
    if (value.url && typeof value.url === 'string') {
      return value.url;
    }
  }
  return null;
}

export default function DashboardHeader({
  // New API props
  user,
  business,
  isBrand = false,
  isTrainer = false,
  // Legacy API props
  bannerImage: legacyBannerImage,
  profileImage: legacyProfileImage,
  title,
  subtitle,
  editable: legacyEditable,
  onBannerUpload,
  onLogoUpload,
  className,
}: DashboardHeaderProps) {
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  
  // Extract banner and profile images from user/business if provided (new API)
  // Otherwise fall back to legacy props
  const bannerImage = user?.bannerUrl || user?.bannerImage || business?.bannerUrl || business?.bannerImage || legacyBannerImage;
  const profileImage = user?.avatarUrl || user?.photoURL || business?.avatarUrl || business?.logoUrl || business?.profileImage || legacyProfileImage;
  
  // Determine editable state: new API takes precedence (isBrand/isTrainer means always editable)
  // Otherwise use legacy editable prop (defaults to false)
  const editable = isBrand || isTrainer || legacyEditable || false;
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
      // Type safety: Ensure current is a string (not an object)
      if (current && typeof current !== 'string') {
        console.error('Banner useEffect - current is not a string, resetting:', current);
        // If current is an object, try to extract URL or reset
        const extractedCurrent = extractUrlString(current);
        if (extractedCurrent) {
          return extractedCurrent;
        }
        // If we can't extract, reset to prop or null
        const extractedProp = extractUrlString(bannerImage);
        return extractedProp || null;
      }

      // Extract URL string from prop if it's an object
      let propUrlString: string | null = null;
      if (typeof bannerImage === 'string') {
        propUrlString = bannerImage;
      } else if (bannerImage && typeof bannerImage === 'object') {
        logger.debug("DashboardHeader", "bannerImage prop is an object, extracting URL:", bannerImage);
        propUrlString = extractUrlString(bannerImage);
        if (!propUrlString) {
          console.error('Banner useEffect - Could not extract URL from object, keeping current:', bannerImage);
          return current;
        }
      } else if (bannerImage === null || bannerImage === undefined) {
        propUrlString = null;
      } else {
        console.error('Banner useEffect - bannerImage prop has unexpected type:', typeof bannerImage, bannerImage);
        return current;
      }

      // Only update if prop is different from current state
      // IMPORTANT: If current state has a cache-busting timestamp (?t=) and prop doesn't,
      // keep the current state to preserve the optimistic update
      if (propUrlString !== current) {
        // Check if current has cache-busting but prop doesn't (base URL match)
        // Only do string operations if both are strings
        if (typeof current === 'string' && typeof propUrlString === 'string') {
          const currentBaseUrl = current.split('?')[0];
          const propBaseUrl = propUrlString.split('?')[0];
          
          if (currentBaseUrl && propBaseUrl && currentBaseUrl === propBaseUrl && current.includes('?t=')) {
            // Current has cache-busting, prop doesn't - keep current state
            // Preserving cache-busted URL
            return current;
          }
        }
        
        // Prop changed, updating state
        return propUrlString;
      }
      return current;
    });
  }, [bannerImage]);

  // Validate banner URL type
  useEffect(() => {
    if (localBannerUrl && typeof localBannerUrl !== 'string') {
      console.error('Banner state is NOT a string! Type:', typeof localBannerUrl, 'Value:', localBannerUrl);
    }
  }, [localBannerUrl]);

  useEffect(() => {
    setLocalLogoUrl((current) => {
      // Only update if prop is different from current state
      // This prevents overwriting manual updates unnecessarily
      return profileImage !== current ? profileImage : current;
    });
  }, [profileImage]);

  const avatarInitials = (title || '')
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

      // Banner Firebase upload successful

      // OPTIMISTIC UPDATE: Update UI immediately with Firebase URL (don't wait for API)
      // Ensure downloadURL is a string
      if (typeof downloadURL !== 'string') {
        console.error('Banner - downloadURL is not a string:', downloadURL);
        throw new Error('Firebase upload did not return a valid URL string');
      }
      
      // Add cache-busting timestamp to force browser to reload the image
      const firebaseUrlWithCacheBust = `${downloadURL}?t=${Date.now()}`;
      const previousBannerUrl = localBannerUrl; // Store previous value for rollback
      
      // Update state immediately so user sees the change instantly
      setLocalBannerUrl(firebaseUrlWithCacheBust);
      
      // Clear any pending file/cropper state - we now have the live URL
      if (bannerImageSrc) {
        URL.revokeObjectURL(bannerImageSrc);
        setBannerImageSrc(null);
      }
      
      // Call parent callback immediately
      onBannerUpload?.(firebaseUrlWithCacheBust);

      // Now save to database in the background (don't await before showing UI)
      try {
        // Use updateUserProfile for brands/trainers, updateBusinessProfile for businesses
        const updateFunction = (isBrand || isTrainer) ? updateUserProfile : updateBusinessProfile;
        const responseData = await updateFunction({
          bannerUrl: downloadURL,
        });

        // Banner API upload response received

        // Extract URL from API response - check multiple possible paths
        // If response has data.bannerUrl, use that. Otherwise check response.bannerUrl. Otherwise fallback to firebaseUrl
        let finalUrl: string | null = null;
        
        if (responseData?.data?.bannerUrl && typeof responseData.data.bannerUrl === 'string') {
          finalUrl = responseData.data.bannerUrl;
        } else if (responseData?.bannerUrl && typeof responseData.bannerUrl === 'string') {
          finalUrl = responseData.bannerUrl;
        } else {
          // API didn't return bannerUrl - keep using Firebase URL (already set optimistically)
          // API response missing bannerUrl, keeping Firebase URL
          finalUrl = downloadURL; // Use the Firebase URL we already have
        }

        // Only update if we have a valid string URL
        if (finalUrl && typeof finalUrl === 'string') {
          const apiUrlWithCacheBust = `${finalUrl}?t=${Date.now()}`;
          setLocalBannerUrl(apiUrlWithCacheBust);
          // Clear any pending file/cropper state - we now have the live URL
          if (bannerImageSrc) {
            URL.revokeObjectURL(bannerImageSrc);
            setBannerImageSrc(null);
          }
          onBannerUpload?.(apiUrlWithCacheBust);
        } else {
          console.error('Banner - Failed to extract valid URL string from API response:', responseData);
        }

        // Show success toast
        toast({
          title: "Banner updated",
          description: "Your banner image has been successfully uploaded.",
        });

        // Refresh global user state to get fresh image URLs
        if (refreshUser) {
          refreshUser().catch(err => console.error('Failed to refresh user after banner upload:', err));
        }
      } catch (apiError: any) {
        // API call failed - revert to previous state
        console.error('Banner API update failed, reverting state:', apiError);
        
        // Ensure previousBannerUrl is a string before reverting
        const safePreviousUrl = (typeof previousBannerUrl === 'string' ? previousBannerUrl : null) || null;
        // Reverting to previous URL
        setLocalBannerUrl(safePreviousUrl);
        onBannerUpload?.(safePreviousUrl || '');
        
        // Show error toast but don't throw - Firebase upload succeeded
        toast({
          title: "Upload warning",
          description: "Image uploaded but failed to save to profile. Please try again.",
          variant: "destructive",
        });
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

      // Logo Firebase upload successful

      // OPTIMISTIC UPDATE: Update UI immediately with Firebase URL (don't wait for API)
      // Add cache-busting timestamp to force browser to reload the image
      const firebaseUrlWithCacheBust = `${downloadURL}?t=${Date.now()}`;
      const previousLogoUrl = localLogoUrl; // Store previous value for rollback
      
      // Update state immediately so user sees the change instantly
      setLocalLogoUrl(firebaseUrlWithCacheBust);
      
      // Call parent callback immediately
      onLogoUpload?.(firebaseUrlWithCacheBust);

      // Now save to database in the background (don't await before showing UI)
      try {
        // Use updateUserProfile for brands/trainers, updateBusinessProfile for businesses
        const updateFunction = (isBrand || isTrainer) ? updateUserProfile : updateBusinessProfile;
        const responseData = await updateFunction({
          avatarUrl: downloadURL,
        });

        // Logo API upload response received

        // Verify API response (optional - Firebase URL is already shown)
        if (responseData.avatarUrl && typeof responseData.avatarUrl === 'string') {
          // API returned a URL - update with API response (may differ from Firebase URL)
          const apiUrlWithCacheBust = `${responseData.avatarUrl}?t=${Date.now()}`;
          setLocalLogoUrl(apiUrlWithCacheBust);
          onLogoUpload?.(apiUrlWithCacheBust);
          // Logo state updated with API response URL
        }

        // Show success toast
        toast({
          title: "Profile picture updated",
          description: "Your profile picture has been successfully uploaded.",
        });

        // Refresh global user state to get fresh image URLs
        if (refreshUser) {
          refreshUser().catch(err => console.error('Failed to refresh user after logo upload:', err));
        }
      } catch (apiError: any) {
        // API call failed - revert to previous state
        console.error('Logo API update failed, reverting state:', apiError);
        setLocalLogoUrl(previousLogoUrl);
        onLogoUpload?.(previousLogoUrl || '');
        
        // Show error toast but don't throw - Firebase upload succeeded
        toast({
          title: "Upload warning",
          description: "Image uploaded but failed to save to profile. Please try again.",
          variant: "destructive",
        });
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

  // Prioritize live state (localBannerUrl) over prop (bannerImage) for preview
  // IMPORTANT: Only use bannerImageSrc (cropper preview) if we're actively cropping
  // Otherwise, always use the live URL (localBannerUrl or bannerImage prop)
  const displayBannerUrl = showBannerCropper 
    ? bannerImageSrc  // Show cropper preview while cropping
    : (localBannerUrl || bannerImage || null); // Show live URL otherwise

  // Display banner URL is computed from state and props

  return (
    <div className={cn("relative w-full max-w-full mb-16", className)}>
      {/* Banner Image or Gradient Fallback */}
      <div className="relative w-full max-w-full h-32 md:h-48 rounded-t-lg overflow-hidden bg-gradient-to-r from-blue-500 to-cyan-500">
        {displayBannerUrl ? (
          <OptimizedImage
            key={`banner-${displayBannerUrl}`} // Force re-render when URL changes (include full URL for cache-busting)
            src={displayBannerUrl}
            alt="Banner"
            priority={true}
            fallbackType="banner"
            className="w-full max-w-full h-full object-cover"
            containerClassName="w-full h-full"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-500 to-cyan-500" />
        )}
      </div>

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
      <div className="absolute -bottom-10 left-6 z-10">
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
                  <Camera className="w-6 h-6 text-white opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200" />
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
      <div className="absolute -bottom-10 left-32 md:left-40 right-4 z-10 min-w-0">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground break-words line-clamp-2">{title}</h1>
        {subtitle && (
          <p className="text-sm md:text-base text-muted-foreground break-words line-clamp-1 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

