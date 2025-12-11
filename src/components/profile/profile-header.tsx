import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Camera, Loader2 } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ImageCropper } from "@/components/ui/image-cropper";
import { useImageUpload } from "@/hooks/use-image-upload";
import { apiRequest } from "@/lib/queryClient";

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
    if (value.data?.bannerUrl && typeof value.data.bannerUrl === 'string') {
      return value.data.bannerUrl;
    }
    if (value.url && typeof value.url === 'string') {
      return value.url;
    }
  }
  return null;
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
  const { isCompressing: isCompressingBanner, handleImageSelect: handleBannerImageSelect } = useImageUpload();
  const { isCompressing: isCompressingAvatar, handleImageSelect: handleAvatarImageSelect } = useImageUpload();
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showBannerCropper, setShowBannerCropper] = useState(false);
  const [bannerImageSrc, setBannerImageSrc] = useState<string | null>(null);
  const [localBannerUrl, setLocalBannerUrl] = useState<string | null | undefined>(bannerUrl);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null | undefined>(avatarUrl);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

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
        const extractedProp = extractUrlString(bannerUrl);
        return extractedProp || null;
      }

      // Extract URL string from prop if it's an object
      let propUrlString: string | null = null;
      if (typeof bannerUrl === 'string') {
        propUrlString = bannerUrl;
      } else if (bannerUrl && typeof bannerUrl === 'object') {
        console.warn('Banner useEffect - bannerUrl prop is an object, extracting URL:', bannerUrl);
        propUrlString = extractUrlString(bannerUrl);
        if (!propUrlString) {
          console.error('Banner useEffect - Could not extract URL from object, keeping current:', bannerUrl);
          return current;
        }
      } else if (bannerUrl === null || bannerUrl === undefined) {
        propUrlString = null;
      } else {
        console.error('Banner useEffect - bannerUrl prop has unexpected type:', typeof bannerUrl, bannerUrl);
        return current;
      }

      // Only update if prop is different from current state
      // IMPORTANT: If current state has a cache-busting timestamp (?t=) and prop doesn't,
      // we should still update if the base URL is different (new upload)
      // But preserve cache-busting if the base URL matches (same image, just refreshed)
      if (propUrlString !== current) {
        // Check if current has cache-busting but prop doesn't (base URL match)
        // Only do string operations if both are strings
        if (typeof current === 'string' && typeof propUrlString === 'string') {
          const currentBaseUrl = current.split('?')[0];
          const propBaseUrl = propUrlString.split('?')[0];
          
          // If base URLs match and current has cache-busting, preserve it
          // But if base URLs are different, it's a new image - update with prop
          if (currentBaseUrl && propBaseUrl && currentBaseUrl === propBaseUrl && current.includes('?t=')) {
            // Same image, current has cache-busting - keep current state
            console.log('Banner useEffect - Preserving cache-busted URL (same base):', { 
              current, 
              prop: propUrlString 
            });
            return current;
          }
          
          // Base URLs are different - this is a new image, update with prop
          // Add cache-busting to the new prop URL to force refresh
          const newUrlWithCacheBust = propUrlString.includes('?') 
            ? propUrlString 
            : `${propUrlString}?t=${Date.now()}`;
          console.log('Banner useEffect - New image detected, updating with cache-bust:', { 
            from: current, 
            to: newUrlWithCacheBust 
          });
          return newUrlWithCacheBust;
        }
        
        console.log('Banner useEffect - Prop changed, updating state:', { 
          from: current, 
          to: propUrlString 
        });
        return propUrlString;
      }
      return current;
    });
  }, [bannerUrl]);

  useEffect(() => {
    setLocalAvatarUrl(avatarUrl);
  }, [avatarUrl]);

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

      // OPTIMISTIC UPDATE: Update UI immediately with Firebase URL (don't wait for API)
      // Ensure downloadURL is a string
      if (typeof downloadURL !== 'string') {
        console.error('Banner - downloadURL is not a string:', downloadURL);
        throw new Error('Firebase upload did not return a valid URL string');
      }
      
      // Add cache-busting timestamp to force browser to reload the image
      const firebaseUrlWithCacheBust = `${downloadURL}?t=${Date.now()}`;
      const previousBannerUrl = localBannerUrl; // Store previous value for rollback
      
      console.log('Banner - Previous URL:', previousBannerUrl);
      console.log('Banner - Setting new URL (optimistic):', firebaseUrlWithCacheBust);
      console.log('Setting bannerUrl to string:', firebaseUrlWithCacheBust);
      
      // FORCE IMMEDIATE UPDATE: Update state immediately so user sees the change instantly
      // This must happen BEFORE any async operations to ensure instant UI feedback
      setLocalBannerUrl(firebaseUrlWithCacheBust);
      console.log('Banner state updated optimistically with URL:', firebaseUrlWithCacheBust);
      
      // Clear any pending file/cropper state - we now have the live URL
      if (bannerImageSrc) {
        URL.revokeObjectURL(bannerImageSrc);
        setBannerImageSrc(null);
      }
      
      // Call parent callback immediately to update form data (this triggers parent state update)
      onBannerUpload?.(firebaseUrlWithCacheBust);
      console.log('Banner - Parent callback called with:', firebaseUrlWithCacheBust);

      // Now save to database in the background (don't await before showing UI)
      try {
        const apiResponse = await apiRequest('PUT', '/api/me', {
          bannerUrl: downloadURL,
        });

        // Check the Result: Verify API response is 200 OK
        if (!apiResponse.ok) {
          const errorText = await apiResponse.text();
          throw new Error(`API update failed: ${apiResponse.status} - ${errorText}`);
        }

        const responseData = await apiResponse.json();
        console.log('Banner API upload response:', responseData);
        console.log('Banner API response keys:', Object.keys(responseData || {}));
        console.log('Banner API response.bannerUrl:', responseData?.bannerUrl);

        // Extract URL from API response - check multiple possible paths
        let finalUrl: string | null = null;
        
        if (responseData?.data?.bannerUrl && typeof responseData.data.bannerUrl === 'string') {
          finalUrl = responseData.data.bannerUrl;
        } else if (responseData?.bannerUrl && typeof responseData.bannerUrl === 'string') {
          finalUrl = responseData.bannerUrl;
        } else {
          // API didn't return bannerUrl - keep using Firebase URL (already set optimistically)
          console.log('Banner - API response missing bannerUrl, keeping Firebase URL:', firebaseUrlWithCacheBust);
          finalUrl = downloadURL; // Use the Firebase URL we already have
        }

        // Only update if we have a valid string URL
        if (finalUrl && typeof finalUrl === 'string') {
          const apiUrlWithCacheBust = `${finalUrl}?t=${Date.now()}`;
          console.log('Setting bannerUrl to string:', apiUrlWithCacheBust);
          console.log('Banner - Updating state with API response URL:', apiUrlWithCacheBust);
          setLocalBannerUrl(apiUrlWithCacheBust);
          // Clear any pending file/cropper state - we now have the live URL
          if (bannerImageSrc) {
            URL.revokeObjectURL(bannerImageSrc);
            setBannerImageSrc(null);
          }
          onBannerUpload?.(apiUrlWithCacheBust);
          console.log('Banner state updated with API response URL:', apiUrlWithCacheBust);
        } else {
          console.error('Banner - Failed to extract valid URL string from API response:', responseData);
        }

        // Show success toast
        toast({
          title: "Banner updated",
          description: "Your banner image has been successfully uploaded.",
        });
      } catch (apiError: any) {
        // API call failed - revert to previous state
        console.error('Banner API update failed, reverting state:', apiError);
        
        // Ensure previousBannerUrl is a string before reverting
        const safePreviousUrl = (typeof previousBannerUrl === 'string' ? previousBannerUrl : null) || null;
        console.log('Banner - Reverting to previous URL (type-checked):', safePreviousUrl);
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
      // Always reset uploading state and input
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Validation First: Check if file exists immediately
    const file = e.target.files?.[0];
    if (!file) {
      // Reset input if no file selected
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = '';
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
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = '';
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
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = '';
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
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = '';
      }
      return;
    }

    // Set uploading state immediately
    setIsUploadingAvatar(true);

    try {
      // The "Real" Await: Compress the image
      const compressedFile = await handleAvatarImageSelect(file);
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
            console.error("Avatar Firebase upload error:", error);
            reject(error);
          },
          async () => {
            clearTimeout(timeoutId);
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            } catch (error) {
              console.error("Error getting avatar download URL:", error);
              reject(error);
            }
          }
        );
      });

      console.log('Avatar Firebase upload response:', downloadURL);

      // The "Real" Await: Call API to update profile in database
      const apiResponse = await apiRequest('PUT', '/api/me', {
        avatarUrl: downloadURL,
      });

      // Check the Result: Verify API response is 200 OK
      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`API update failed: ${apiResponse.status} - ${errorText}`);
      }

      const responseData = await apiResponse.json();
      console.log('Avatar API upload response:', responseData);

      // Check the Result: Verify we got a valid URL back
      if (!responseData.avatarUrl || typeof responseData.avatarUrl !== 'string') {
        throw new Error('API did not return a valid avatar URL');
      }

      // Force UI Refresh (Cache Busting): Append timestamp to URL
      const newUrl = responseData.avatarUrl + '?t=' + new Date().getTime();
      
      // Update local state immediately so user sees the change
      setLocalAvatarUrl(newUrl);
      
      // Call parent callback with the new URL
      onAvatarUpload?.(newUrl);

      // Only show success if API succeeded
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been successfully uploaded.",
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
      // Always reset uploading state and input
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

  // Prioritize live state (localBannerUrl) over prop (bannerUrl) for preview
  // IMPORTANT: Only use bannerImageSrc (cropper preview) if we're actively cropping
  // Otherwise, always use the live URL (localBannerUrl or bannerUrl prop)
  const displayBannerUrl = showBannerCropper 
    ? bannerImageSrc  // Show cropper preview while cropping
    : (localBannerUrl || bannerUrl || null); // Show live URL otherwise

  // Debug log to track URL changes
  useEffect(() => {
    if (displayBannerUrl) {
      console.log('ProfileHeader - Display banner URL changed:', displayBannerUrl.substring(0, 100));
      console.log('ProfileHeader - showBannerCropper:', showBannerCropper, 'localBannerUrl:', localBannerUrl?.substring(0, 50), 'bannerUrl prop:', bannerUrl?.substring(0, 50));
    }
  }, [displayBannerUrl, showBannerCropper, localBannerUrl, bannerUrl]);

  return (
    <div className={cn("relative w-full max-w-full h-48 md:h-64 rounded-lg overflow-hidden", className)}>
      {/* Banner Image or Gradient Fallback */}
      {displayBannerUrl ? (
        <OptimizedImage
          key={displayBannerUrl} // Force re-render when URL changes - using full URL ensures cache-busting works
          src={displayBannerUrl}
          alt="Banner"
          priority={true}
          fallbackType="banner"
          className="w-full h-full object-cover rounded-lg"
          containerClassName="w-full h-full absolute inset-0 overflow-hidden"
        />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg absolute inset-0" />
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
            disabled={isUploadingBanner}
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

      {/* Avatar Container (overlapping bottom-left) */}
      <div className="absolute -bottom-12 left-4 z-elevated">
        <div className="relative">
          <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-white shadow-lg">
            <AvatarImage src={localAvatarUrl || undefined} alt={displayName} />
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
                {isUploadingAvatar || isCompressingAvatar ? (
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
                disabled={isUploadingAvatar || isCompressingAvatar}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

