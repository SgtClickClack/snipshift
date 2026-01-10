import { useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, ExternalLink, IdCard, Upload, XCircle } from 'lucide-react';

export function GovernmentIDLocker() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);

  const idDocumentUrl = user?.profile?.id_document_url ?? null;
  const idVerifiedStatus = user?.profile?.id_verified_status ?? null;

  const idUploaded = Boolean(idDocumentUrl);
  const isApproved = idVerifiedStatus === 'APPROVED';
  const isRejected = idVerifiedStatus === 'REJECTED';

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('governmentId', file);

      await apiRequest('PUT', '/api/me', formData);
      await refreshUser();

      toast({
        title: 'Government ID uploaded',
        description: 'Your ID has been uploaded and is pending review.',
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error?.message || 'Failed to upload your ID document.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IdCard className="h-5 w-5" />
          Government ID Verification
        </CardTitle>
        <CardDescription>
          Upload a clear photo or PDF of your government-issued ID. Review may take time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-muted p-2">
                <IdCard className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">ID Document</h3>
                  {idUploaded ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm">Uploaded</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm">Not Uploaded</span>
                    </div>
                  )}

                  {isApproved ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm">Approved</span>
                    </div>
                  ) : isRejected ? (
                    <div className="flex items-center gap-1 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Rejected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Pending Review</span>
                    </div>
                  )}
                </div>

                {idDocumentUrl ? (
                  <a
                    href={idDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    View uploaded ID <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Button
                variant={idUploaded ? 'outline' : 'default'}
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {idUploaded ? 'Re-upload' : 'Upload'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
                aria-label="Government ID Upload"
                title="Government ID Upload"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  handleUpload(file);
                }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

