import React, { useState, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useImageUpload } from '@/hooks/use-image-upload';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
  /** Current image URL (for preview) */
  currentImageUrl?: string;
  /** Callback when image is uploaded, receives the download URL */
  onUploadComplete: (url: string) => void;
  /** Callback when upload fails */
  onUploadError?: (error: Error) => void;
  /** Upload path prefix (e.g., 'users' or 'jobs') */
  pathPrefix: string;
  /** Entity ID (user ID or job ID) */
  entityId: string;
  /** File name (e.g., 'avatar' or 'site-photo') */
  fileName: string;
  /** Shape: 'circle' for avatars, 'rect' for job photos */
  shape?: 'circle' | 'rect';
  /** Maximum file size in bytes (default: 5MB) */
  maxSize?: number;
  /** Accepted file types */
  accept?: string;
  /** Additional className */
  className?: string;
}

export function ImageUpload({
  currentImageUrl,
  onUploadComplete,
  onUploadError,
  pathPrefix,
  entityId,
  fileName,
  shape = 'rect',
  maxSize = 5 * 1024 * 1024, // 5MB default
  accept = 'image/jpeg,image/jpg,image/png,image/gif,image/webp',
  className,
}: ImageUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isCompressing, error: compressionError, handleImageSelect, clearError } = useImageUpload();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    setError(null);
    clearError();

    // Show compression toast
    if (!isCompressing) {
      toast({
        title: "Compressing image...",
        description: "Please wait while we optimize your image for upload.",
      });
    }

    // Compress the image
    const compressedFile = await handleImageSelect(file);
    if (!compressedFile) {
      setError(compressionError || 'Failed to process image');
      return;
    }

    // Validate compressed file size
    if (compressedFile.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      setError(`File size exceeds ${maxSizeMB}MB limit`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    // Create preview from compressed file
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(compressedFile);

    try {
      // Create storage reference
      const fileExtension = 'jpg'; // Always use jpg after compression
      const storageFileName = `${fileName}.${fileExtension}`;
      const storagePath = `${pathPrefix}/${entityId}/${storageFileName}`;
      const storageRef = ref(storage, storagePath);

      // Upload compressed file
      const uploadTask = uploadBytesResumable(storageRef, compressedFile);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          setUploading(false);
          setError('Upload failed. Please try again.');
          onUploadError?.(error);
        },
        async () => {
          // Upload complete
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setUploading(false);
            setUploadProgress(100);
            onUploadComplete(downloadURL);
          } catch (error) {
            console.error('Error getting download URL:', error);
            setError('Failed to get image URL');
            onUploadError?.(error as Error);
          }
        }
      );
    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
      setError('Upload failed. Please try again.');
      onUploadError?.(error as Error);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Call onUploadComplete with empty string to clear the image
    onUploadComplete('');
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);

  const containerClass = cn(
    'relative border-2 border-dashed border-steel-600 bg-steel-800/50 rounded-lg',
    'flex items-center justify-center overflow-hidden',
    'transition-all hover:border-steel-500 hover:bg-steel-800',
    shape === 'circle' && 'aspect-square rounded-full w-32 h-32',
    shape === 'rect' && 'aspect-video min-h-[200px]',
    className
  );

  return (
    <div className="space-y-2">
      {/* Show file size limit before upload */}
      {!previewUrl && !uploading && (
        <p className="text-xs text-steel-500">
          Maximum file size: {maxSizeMB}MB (JPEG, PNG, GIF, or WebP)
        </p>
      )}
      
      <div className={containerClass}>
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt="Preview"
              className={cn(
                'w-full h-full object-cover',
                shape === 'circle' && 'rounded-full'
              )}
            />
            {!uploading && (
              <button
                onClick={handleRemove}
                className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 rounded-full text-white"
                type="button"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <ImageIcon className="h-12 w-12 text-steel-500 mb-2" />
            <p className="text-sm text-steel-400 mb-2">No image selected</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClick}
              disabled={uploading || isCompressing || !user}
              className="bg-steel-700 hover:bg-steel-600 border-steel-600 whitespace-nowrap"
            >
              {isCompressing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 flex-shrink-0 animate-spin" />
                  <span className="truncate">Compressing...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{uploading ? 'Uploading...' : 'Upload Image'}</span>
                </>
              )}
            </Button>
          </div>
        )}

        {(uploading || isCompressing) && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="w-full px-4 space-y-2">
              {uploading ? (
                <>
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-center text-white">
                    {Math.round(uploadProgress)}% uploaded
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                  <p className="text-xs text-center text-white">
                    Compressing image...
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading || !user}
      />

      {(error || compressionError) && (
        <p className="text-sm text-red-500">{error || compressionError}</p>
      )}

      {!previewUrl && !uploading && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={!user || isCompressing}
          className="w-full bg-steel-700 hover:bg-steel-600 border-steel-600 whitespace-nowrap"
        >
          {isCompressing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 flex-shrink-0 animate-spin" />
              <span className="truncate">Compressing...</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">Choose Image</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}

