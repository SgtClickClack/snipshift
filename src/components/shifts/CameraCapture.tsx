import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Check, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
  className?: string;
}

/**
 * CameraCapture Component
 * 
 * Provides camera capture functionality for mobile devices.
 * Uses HTML5 camera API with capture="environment" to force camera (not gallery).
 * 
 * Security: Prevents gallery uploads by using live camera capture only.
 */
export function CameraCapture({ onCapture, onCancel, className }: CameraCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Verify it's an image
    if (!file.type.startsWith('image/')) {
      alert('Please capture a photo using the camera');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
      setCapturedFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setPreview(null);
    setCapturedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirm = () => {
    if (capturedFile) {
      onCapture(capturedFile);
    }
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("space-y-4", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment" // Forces camera on mobile (rear camera)
        onChange={handleFileSelect}
        className="hidden"
      />

      {!preview ? (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-muted/50">
            <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Capture a photo as proof of shift completion
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Note: Gallery uploads are not allowed. You must use the camera.
            </p>
            <Button onClick={handleCameraClick} size="lg" className="w-full">
              <Camera className="h-5 w-5 mr-2" />
              Open Camera
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden border-2 border-border">
            <img
              src={preview}
              alt="Proof photo preview"
              className="w-full h-auto max-h-96 object-contain"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleRetake}
              variant="outline"
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1"
            >
              <Check className="h-4 w-4 mr-2" />
              Use This Photo
            </Button>
          </div>
        </div>
      )}

      <Button
        onClick={onCancel}
        variant="ghost"
        className="w-full"
      >
        <X className="h-4 w-4 mr-2" />
        Cancel
      </Button>
    </div>
  );
}
