import imageCompression from 'browser-image-compression';

/**
 * Compresses an image file on the client side before upload.
 * 
 * @param file - The image file to compress
 * @returns A compressed File object, or the original file if compression fails
 */
export async function compressImage(file: File): Promise<File> {
  // Check if file is an image
  if (!file.type.startsWith('image/')) {
    throw new Error('File is not an image');
  }

  const options = {
    maxSizeMB: 0.5, // 500KB limit
    maxWidthOrHeight: 1920, // High res enough for banners, safe for avatars
    useWebWorker: true, // Keeps the UI responsive
    fileType: 'image/jpeg' as const, // Standardize format
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    // Return original file if compression fails
    return file;
  }
}

