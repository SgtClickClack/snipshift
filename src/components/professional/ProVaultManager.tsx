/**
 * ProVaultManager - Professional Document Vault Management
 * 
 * A mobile-friendly component for managing compliance documents:
 * - RSA Certificate
 * - Government ID
 * - Work Rights Verification
 * 
 * Features verification status badges:
 * - Missing (Red Pulse)
 * - Pending (Amber)
 * - Verified (Electric Lime #BAFF39)
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Shield,
  CreditCard,
  Wine,
  Loader2,
  X,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Document types and their configuration
interface DocumentConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  required: boolean;
  acceptedFormats: string;
  fieldName: string;
}

const DOCUMENT_CONFIGS: DocumentConfig[] = [
  {
    id: 'rsa',
    name: 'RSA Certificate',
    description: 'Responsible Service of Alcohol certificate required for bar/alcohol shifts',
    icon: Wine,
    required: false,
    acceptedFormats: '.pdf,.jpg,.jpeg,.png',
    fieldName: 'rsaCertificate',
  },
  {
    id: 'government_id',
    name: 'Government ID',
    description: 'Driver\'s license, passport, or state ID for identity verification',
    icon: CreditCard,
    required: true,
    acceptedFormats: '.pdf,.jpg,.jpeg,.png',
    fieldName: 'governmentId',
  },
  {
    id: 'work_rights',
    name: 'Work Rights',
    description: 'VEVO check or citizenship proof for enterprise venues',
    icon: Shield,
    required: false,
    acceptedFormats: '.pdf,.jpg,.jpeg,.png',
    fieldName: 'workRights',
  },
];

type VerificationStatus = 'missing' | 'pending' | 'verified';

interface DocumentStatus {
  id: string;
  status: VerificationStatus;
  uploadedAt?: string;
  verifiedAt?: string;
  documentUrl?: string;
}

interface VerificationData {
  verificationStatus: string;
  rsaCertificateUploaded: boolean;
  canWorkAlcoholShifts: boolean;
  governmentIdVerified?: boolean;
  vevoVerified?: boolean;
  documents?: DocumentStatus[];
}

// Status Badge Component with animations
function StatusBadge({ status }: { status: VerificationStatus }) {
  const statusConfig = {
    missing: {
      label: 'Missing',
      className: 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse',
      icon: AlertCircle,
    },
    pending: {
      label: 'Pending',
      className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      icon: Clock,
    },
    verified: {
      label: 'Verified',
      className: 'bg-[#BAFF39]/10 text-[#BAFF39] border-[#BAFF39]/20',
      icon: CheckCircle2,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn('flex items-center gap-1 font-medium', config.className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// Upload Modal Component
interface UploadModalProps {
  document: DocumentConfig;
  currentStatus: VerificationStatus;
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
}

function UploadModal({ document, currentStatus, onUpload, isUploading }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const Icon = document.icon;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    try {
      await onUpload(selectedFile);
      setSelectedFile(null);
      setOpen(false);
    } catch (error) {
      // Error handled by parent
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={currentStatus === 'verified' ? 'outline' : 'default'}
          size="sm"
          className={currentStatus === 'missing' ? 'bg-[#BAFF39] hover:bg-[#BAFF39]/90 text-black' : ''}
        >
          <Upload className="h-4 w-4 mr-2" />
          {currentStatus === 'verified' ? 'Update' : 'Upload'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-[#BAFF39]" />
            Upload {document.name}
          </DialogTitle>
          <DialogDescription>
            {document.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor={`file-${document.id}`}>Select Document</Label>
            <Input
              id={`file-${document.id}`}
              type="file"
              accept={document.acceptedFormats}
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Accepted formats: {document.acceptedFormats.replace(/\./g, '').toUpperCase().replace(/,/g, ', ')}
            </p>
          </div>

          {/* Selected File Preview */}
          {selectedFile && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 truncate">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm truncate">{selectedFile.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full bg-[#BAFF39] hover:bg-[#BAFF39]/90 text-black"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Document Row Component
interface DocumentRowProps {
  config: DocumentConfig;
  status: VerificationStatus;
  documentUrl?: string;
  onUpload: (documentId: string, file: File) => Promise<void>;
  isUploading: boolean;
  uploadingDocId: string | null;
}

function DocumentRow({ 
  config, 
  status, 
  documentUrl, 
  onUpload, 
  isUploading, 
  uploadingDocId 
}: DocumentRowProps) {
  const Icon = config.icon;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-2 rounded-lg',
          status === 'verified' ? 'bg-[#BAFF39]/10' : 
          status === 'pending' ? 'bg-amber-500/10' : 'bg-red-500/10'
        )}>
          <Icon className={cn(
            'h-5 w-5',
            status === 'verified' ? 'text-[#BAFF39]' : 
            status === 'pending' ? 'text-amber-500' : 'text-red-500'
          )} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-sm">{config.name}</h4>
            {config.required && (
              <Badge variant="outline" className="text-xs">Required</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {config.description}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:flex-shrink-0">
        <StatusBadge status={status} />
        
        {documentUrl && status === 'verified' && (
          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <a 
              href={documentUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              title="View uploaded document"
              aria-label="View uploaded document"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
        
        <UploadModal
          document={config}
          currentStatus={status}
          onUpload={(file) => onUpload(config.id, file)}
          isUploading={isUploading && uploadingDocId === config.id}
        />
      </div>
    </div>
  );
}

// Main Component
interface ProVaultManagerProps {
  className?: string;
}

export function ProVaultManager({ className }: ProVaultManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  // Fetch verification status
  const { data: verificationData, isLoading } = useQuery<VerificationData>({
    queryKey: ['verification-status', user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/me/verification-status');
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Upload mutation - Uses storage endpoint then updates verification status
  const uploadMutation = useMutation({
    mutationFn: async ({ documentId, file }: { documentId: string; file: File }) => {
      // Step 1: Upload file to storage
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'verification');
      formData.append('documentType', documentId);
      
      const uploadRes = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!uploadRes.ok) {
        // Fallback to direct profile update if storage endpoint not available
        const fallbackFormData = new FormData();
        const fieldMap: Record<string, string> = {
          rsa: 'rsaCertificate',
          government_id: 'governmentId',
          work_rights: 'workRights',
        };
        fallbackFormData.append(fieldMap[documentId] || documentId, file);
        
        const fallbackRes = await fetch('/api/me', {
          method: 'PUT',
          body: fallbackFormData,
          credentials: 'include',
        });
        
        if (!fallbackRes.ok) {
          const error = await fallbackRes.json();
          throw new Error(error.message || 'Upload failed');
        }
        
        return fallbackRes.json();
      }
      
      const uploadData = await uploadRes.json();
      
      // Step 2: Update user profile with document URL and set verification status to 'pending'
      const fieldMap: Record<string, string> = {
        rsa: 'rsaCertificateUrl',
        government_id: 'governmentIdUrl',
        work_rights: 'workRightsUrl',
      };
      
      const updateRes = await fetch('/api/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [fieldMap[documentId] || `${documentId}Url`]: uploadData.url,
          verificationStatus: 'pending',
        }),
        credentials: 'include',
      });
      
      if (!updateRes.ok) {
        const error = await updateRes.json();
        throw new Error(error.message || 'Failed to update profile');
      }
      
      return updateRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-status'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      toast({
        title: 'Document uploaded successfully',
        description: 'Your document is now under review. You\'ll be notified once verified.',
        className: 'border-amber-500/50 bg-amber-500/10',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setUploadingDocId(null);
    },
  });

  const handleUpload = async (documentId: string, file: File) => {
    setUploadingDocId(documentId);
    await uploadMutation.mutateAsync({ documentId, file });
  };

  // Determine document statuses from verification data
  const getDocumentStatus = (docId: string): VerificationStatus => {
    if (!verificationData) return 'missing';
    
    switch (docId) {
      case 'rsa':
        if (verificationData.canWorkAlcoholShifts) return 'verified';
        if (verificationData.rsaCertificateUploaded) return 'pending';
        return 'missing';
      case 'government_id':
        if (verificationData.governmentIdVerified) return 'verified';
        // Check if ID document exists in profile compliance
        if (user?.profile?.id_document_url) return 'pending';
        return 'missing';
      case 'work_rights':
        if (verificationData.vevoVerified) return 'verified';
        return 'missing';
      default:
        return 'missing';
    }
  };

  // Calculate overall compliance percentage
  const calculateCompliancePercentage = (): number => {
    const requiredDocs = DOCUMENT_CONFIGS.filter(d => d.required);
    const verifiedRequired = requiredDocs.filter(d => getDocumentStatus(d.id) === 'verified');
    
    if (requiredDocs.length === 0) return 100;
    return Math.round((verifiedRequired.length / requiredDocs.length) * 100);
  };

  const compliancePercentage = calculateCompliancePercentage();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Compliance Vault
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#BAFF39]" />
              Compliance Vault
            </CardTitle>
            <CardDescription className="mt-1">
              Manage your verification documents to unlock more shifts
            </CardDescription>
          </div>
          
          {/* Compliance Progress */}
          <div className="text-right">
            <div className={cn(
              'text-2xl font-bold',
              compliancePercentage === 100 ? 'text-[#BAFF39]' : 
              compliancePercentage >= 50 ? 'text-amber-500' : 'text-red-500'
            )}>
              {compliancePercentage}%
            </div>
            <div className="text-xs text-muted-foreground">Complete</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {DOCUMENT_CONFIGS.map((config) => (
          <DocumentRow
            key={config.id}
            config={config}
            status={getDocumentStatus(config.id)}
            documentUrl={
              config.id === 'rsa' ? user?.rsaCertificateUrl :
              config.id === 'government_id' ? user?.profile?.id_document_url :
              undefined
            }
            onUpload={handleUpload}
            isUploading={uploadMutation.isPending}
            uploadingDocId={uploadingDocId}
          />
        ))}
        
        {/* Info Banner */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              Documents are reviewed within 24-48 hours. Verified documents unlock access to more shift opportunities.
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default ProVaultManager;
