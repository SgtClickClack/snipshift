import React, { useState, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      setError(`File size exceeds ${maxSizeMB}MB limit`);
      return;
    }

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(0);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      // Create storage reference
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const storageFileName = `${fileName}.${fileExtension}`;
      const storagePath = `${pathPrefix}/${entityId}/${storageFileName}`;
      const storageRef = ref(storage, storagePath);

      // Upload file
      const uploadTask = uploadBytesResumable(storageRef, file);

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

  const containerClass = cn(
    'relative border-2 border-dashed border-gray-600 bg-gray-800/50 rounded-lg',
    'flex items-center justify-center overflow-hidden',
    'transition-all hover:border-gray-500 hover:bg-gray-800',
    shape === 'circle' && 'aspect-square rounded-full w-32 h-32',
    shape === 'rect' && 'aspect-video min-h-[200px]',
    className
  );

  return (
    <div className="space-y-2">
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
            <ImageIcon className="h-12 w-12 text-gray-500 mb-2" />
            <p className="text-sm text-gray-400 mb-2">No image selected</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClick}
              disabled={uploading || !user}
              className="bg-gray-700 hover:bg-gray-600 border-gray-600"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Image'}
            </Button>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="w-full px-4 space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-center text-white">
                {Math.round(uploadProgress)}% uploaded
              </p>
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

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {!previewUrl && !uploading && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={!user}
          className="w-full bg-gray-700 hover:bg-gray-600 border-gray-600"
        >
          <Upload className="h-4 w-4 mr-2" />
          Choose Image
        </Button>
      )}
    </div>
  );
}

