import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle2, ExternalLink, Shield, Upload, XCircle } from 'lucide-react';

const AU_STATES = ['QLD', 'NSW', 'VIC', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;
type AuState = (typeof AU_STATES)[number];

export function RSALocker() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<{
    rsaNumber: string;
    rsaExpiry: string;
    rsaStateOfIssue: '' | AuState;
  }>({
    rsaNumber: user?.rsaNumber || '',
    rsaExpiry: user?.rsaExpiry || '',
    rsaStateOfIssue: (user?.rsaStateOfIssue as AuState | undefined) || '',
  });

  useEffect(() => {
    setForm({
      rsaNumber: user?.rsaNumber || '',
      rsaExpiry: user?.rsaExpiry || '',
      rsaStateOfIssue: (user?.rsaStateOfIssue as AuState | undefined) || '',
    });
  }, [user?.rsaNumber, user?.rsaExpiry, user?.rsaStateOfIssue]);

  const rsaUploaded = Boolean(user?.rsaCertificateUrl);
  const rsaVerified = Boolean(user?.rsaVerified);

  const { rsaExpired, rsaExpiryValid } = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const raw = user?.rsaExpiry;
    if (!raw) {
      return { rsaExpired: false, rsaExpiryValid: true };
    }

    // Prefer local date parsing for YYYY-MM-DD
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    const expiry = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : new Date(raw);

    const valid = !Number.isNaN(expiry.getTime());
    const expired = valid ? todayStart.getTime() >= expiry.getTime() : false;
    return { rsaExpired: expired, rsaExpiryValid: valid };
  }, [user?.rsaExpiry]);

  const handleUpload = async (file: File) => {
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('rsaCertificate', file);
      await apiRequest('PUT', '/api/me', formData);
      await refreshUser();
      toast({
        title: 'RSA uploaded',
        description: 'Your RSA certificate has been uploaded.',
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error?.message || 'Failed to upload RSA certificate.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiRequest('PUT', '/api/me', {
        rsaNumber: form.rsaNumber || undefined,
        rsaExpiry: form.rsaExpiry || undefined,
        rsaStateOfIssue: form.rsaStateOfIssue || undefined,
      });
      await refreshUser();
      toast({
        title: 'RSA details saved',
        description: 'Your RSA details have been updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error?.message || 'Failed to save RSA details.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          RSA Verification
        </CardTitle>
        <CardDescription>
          Upload your RSA certificate and keep your details up to date to unlock shift browsing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-muted p-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">RSA Certificate</h3>
                  {rsaUploaded ? (
                    rsaExpired ? (
                      <div className="flex items-center gap-1 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">Expired</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm">Uploaded</span>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm">Not Uploaded</span>
                    </div>
                  )}

                  {rsaVerified ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm">Verified</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Not Verified</span>
                    </div>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  Upload a clear image or PDF of your RSA certificate. Verification may take time.
                </p>

                {user?.rsaCertificateUrl ? (
                  <a
                    href={user.rsaCertificateUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    View uploaded certificate <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Button
                variant={rsaUploaded && !rsaExpired ? 'outline' : 'default'}
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving}
              >
                <Upload className="mr-2 h-4 w-4" />
                {rsaUploaded && !rsaExpired ? 'Re-upload' : 'Upload'}
              </Button>
              <input
                id="rsaCertificateUpload"
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
                aria-label="RSA Certificate Upload"
                title="RSA Certificate Upload"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  handleUpload(file);
                }}
              />
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rsaNumber">RSA Certificate Number</Label>
              <Input
                id="rsaNumber"
                value={form.rsaNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, rsaNumber: e.target.value }))}
                placeholder="Enter your RSA number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rsaExpiry">Expiry Date</Label>
              <Input
                id="rsaExpiry"
                type="date"
                value={form.rsaExpiry}
                onChange={(e) => setForm((prev) => ({ ...prev, rsaExpiry: e.target.value }))}
              />
              {!rsaExpiryValid ? (
                <p className="text-xs text-destructive">Invalid expiry date format.</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rsaStateOfIssue">State of Issue</Label>
              <Select
                value={form.rsaStateOfIssue}
                onValueChange={(value) => setForm((prev) => ({ ...prev, rsaStateOfIssue: value as AuState }))}
              >
                <SelectTrigger id="rsaStateOfIssue" aria-label="State of Issue">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {AU_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-pulse" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Save RSA Details
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

