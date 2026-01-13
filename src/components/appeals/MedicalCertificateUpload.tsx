import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  FileCheck, 
  AlertCircle, 
  Loader2, 
  FileText,
  X,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MedicalCertificateUploadProps {
  shiftId: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

interface UploadResponse {
  success: boolean;
  message: string;
  status: 'approved' | 'pending' | 'manual_review' | 'rejected';
  details?: {
    previousStrikes?: number;
    currentStrikes?: number;
    suspensionLifted?: boolean;
    reason?: string;
    certificateUrl?: string;
    estimatedReviewTime?: string;
  };
}

export function MedicalCertificateUpload({ 
  shiftId, 
  onSuccess, 
  onClose 
}: MedicalCertificateUploadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'pending_review'>('idle');

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest('POST', '/api/appeals/upload-certificate', formData, {
        isFormData: true,
      });
      return response.json() as Promise<UploadResponse>;
    },
    onSuccess: (data) => {
      if (data.success || data.status === 'approved') {
        setUploadStatus('success');
        toast({
          title: 'Certificate Verified!',
          description: data.message,
        });
        // Invalidate reputation stats to refresh UI
        queryClient.invalidateQueries({ queryKey: ['/api/me/reputation'] });
        queryClient.invalidateQueries({ queryKey: ['/api/me'] });
        
        // Call success callback after a short delay to show success state
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      } else if (data.status === 'manual_review') {
        setUploadStatus('pending_review');
        toast({
          title: 'Certificate Submitted',
          description: data.message,
        });
      } else {
        toast({
          title: 'Verification Failed',
          description: data.message,
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload certificate. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload an image (JPG, PNG, WebP) or PDF file.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload a file smaller than 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      const input = fileInputRef.current;
      if (input) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        handleFileSelect({ target: input } as React.ChangeEvent<HTMLInputElement>);
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select a medical certificate to upload.',
        variant: 'destructive',
      });
      return;
    }

    setUploadStatus('uploading');
    
    const formData = new FormData();
    formData.append('certificate', selectedFile);
    formData.append('shiftId', shiftId);
    if (additionalNotes.trim()) {
      formData.append('additionalNotes', additionalNotes.trim());
    }

    uploadMutation.mutate(formData);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Success state
  if (uploadStatus === 'success') {
    return (
      <Card className="border-emerald-500/50 bg-emerald-500/10">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-emerald-500">Certificate Verified!</h3>
              <p className="text-muted-foreground mt-1">
                Your suspension has been lifted and strikes reduced.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Refreshing your account status...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pending review state
  if (uploadStatus === 'pending_review') {
    return (
      <Card className="border-amber-500/50 bg-amber-500/10">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-amber-500">Submitted for Review</h3>
              <p className="text-muted-foreground mt-1">
                Your certificate has been submitted and is pending admin review.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              You'll be notified once your appeal has been processed (typically 24-48 hours).
            </p>
            {onClose && (
              <Button variant="outline" onClick={onClose} className="mt-4">
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-primary" />
          Submit Medical Certificate
        </CardTitle>
        <CardDescription>
          Upload a valid medical certificate to appeal your suspension. 
          The certificate should show your name and a date matching your missed shift.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Area */}
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer',
            'hover:border-primary/50 hover:bg-primary/5',
            selectedFile ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          )}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {selectedFile ? (
            <div className="flex items-center gap-4">
              {previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Certificate preview" 
                  className="w-20 h-20 object-cover rounded-lg"
                />
              ) : (
                <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WebP or PDF (max 10MB)
              </p>
            </div>
          )}
        </div>

        {/* Additional Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Add any relevant information about your medical situation..."
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Guidelines */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Certificate Requirements
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Must be an official medical certificate from a licensed practitioner</li>
            <li>• Must clearly show your full name</li>
            <li>• Date must match or cover the date of your missed shift</li>
            <li>• Document must be legible and complete</li>
          </ul>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3">
          {onClose && (
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleSubmit}
            disabled={!selectedFile || uploadMutation.isPending}
            className="flex-1"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Submit Certificate
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default MedicalCertificateUpload;
