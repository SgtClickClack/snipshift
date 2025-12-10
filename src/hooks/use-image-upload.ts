import { useState } from 'react';
import { compressImage } from '@/lib/image-compression';

interface UseImageUploadReturn {
  /** Whether compression is in progress */
  isCompressing: boolean;
  /** Error message if compression fails */
  error: string | null;
  /** Handle image file selection and compression */
  handleImageSelect: (file: File) => Promise<File | null>;
  /** Clear the error state */
  clearError: () => void;
}

/**
 * Custom hook for handling image uploads with client-side compression.
 * 
 * @returns Object with compression state and handler function
 */
export function useImageUpload(): UseImageUploadReturn {
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = async (file: File): Promise<File | null> => {
    // Reset error state
    setError(null);

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return null;
    }

    setIsCompressing(true);

    try {
      // Compress the image
      const compressedFile = await compressImage(file);
      setIsCompressing(false);
      return compressedFile;
    } catch (err) {
      console.error('Image compression error:', err);
      setError(err instanceof Error ? err.message : 'Failed to compress image');
      setIsCompressing(false);
      return null;
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    isCompressing,
    error,
    handleImageSelect,
    clearError,
  };
}

