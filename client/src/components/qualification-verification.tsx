import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, CheckCircle, XCircle, Clock, Shield } from 'lucide-react';

interface Qualification {
  id: string;
  type: string;
  fileName: string;
  status: 'pending' | 'verified' | 'rejected';
  uploadedAt: string;
  verifiedAt?: string;
  fileSize: string;
}

const mockQualifications: Qualification[] = [
  {
    id: '1',
    type: 'Barber License',
    fileName: 'barber-license.pdf',
    status: 'verified',
    uploadedAt: '2024-01-01',
    verifiedAt: '2024-01-02',
    fileSize: '2.3 MB'
  },
  {
    id: '2',
    type: 'Master Barber Certification',
    fileName: 'master-barber-cert.jpg',
    status: 'pending',
    uploadedAt: '2024-01-10',
    fileSize: '1.8 MB'
  }
];

export default function QualificationVerification() {
  const { toast } = useToast();
  const [qualifications, setQualifications] = useState<Qualification[]>(mockQualifications);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadQualification = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    
    // Simulate upload process
    setTimeout(() => {
      const newQualification: Qualification = {
        id: Date.now().toString(),
        type: 'New Qualification',
        fileName: selectedFile.name,
        status: 'pending',
        uploadedAt: new Date().toISOString().split('T')[0],
        fileSize: `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`
      };

      setQualifications(prev => [...prev, newQualification]);
      setSelectedFile(null);
      setIsUploading(false);

      toast({
        title: "Qualification uploaded successfully",
        description: "Your document is being reviewed by our team.",
      });
    }, 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Qualification Verification</h2>
        <p className="text-gray-600">Upload and manage your professional qualifications</p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload New Qualification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Qualification Document
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="w-full p-2 border border-gray-300 rounded-md"
                data-testid="input-qualification-document"
                aria-label="Upload qualification document"
              />
              <p className="text-xs text-gray-500 mt-1">
                Supported formats: PDF, JPG, PNG (max 10MB)
              </p>
            </div>

            {selectedFile && (
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm">
                  <strong>Selected:</strong> {selectedFile.name}
                </p>
                <p className="text-xs text-gray-600">
                  Size: {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            )}

            <Button
              onClick={handleUploadQualification}
              disabled={!selectedFile || isUploading}
              data-testid="button-upload-qualification"
            >
              {isUploading ? 'Uploading...' : 'Upload Qualification'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Qualifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Qualifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {qualifications.map((qualification) => (
              <div key={qualification.id} className="border rounded-lg p-4" data-testid="qualification-item">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold" data-testid="qualification-type">
                        {qualification.type}
                      </h3>
                      {getStatusIcon(qualification.status)}
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <p data-testid="document-name">
                        <strong>File:</strong> {qualification.fileName}
                      </p>
                      <p data-testid="document-size">
                        <strong>Size:</strong> {qualification.fileSize}
                      </p>
                      <p data-testid="upload-date">
                        <strong>Uploaded:</strong> {qualification.uploadedAt}
                      </p>
                      {qualification.verifiedAt && (
                        <p>
                          <strong>Verified:</strong> {qualification.verifiedAt}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <Badge className={getStatusColor(qualification.status)}>
                      {qualification.status.charAt(0).toUpperCase() + qualification.status.slice(1)}
                    </Badge>
                    
                    {qualification.status === 'pending' && (
                      <div className="mt-2">
                        <div className="flex items-center gap-1 text-xs text-yellow-600">
                          <Clock className="h-3 w-3" />
                          <span data-testid="validation-status">Validating</span>
                        </div>
                        <div className="w-20 bg-gray-200 rounded-full h-1 mt-1">
                          <div 
                            className="bg-yellow-500 h-1 rounded-full animate-pulse w-3/5" 
                            data-testid="validation-progress"
                          />
                        </div>
                      </div>
                    )}

                    {qualification.status === 'verified' && (
                      <div className="mt-2">
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          <span data-testid="validation-result">Document validated successfully</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                          <Shield className="h-3 w-3" />
                          <span data-testid="qualification-status">Verified</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {qualification.status === 'verified' && (
                  <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                    <div className="flex items-center gap-2 text-sm text-green-800">
                      <Shield className="h-4 w-4" />
                      <span data-testid="security-badge">Securely Stored</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-green-600 mt-1">
                      <span data-testid="encryption-indicator">🔒 Encrypted</span>
                      <span>•</span>
                      <span data-testid="access-log">Access logged</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Verification Required Notice */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-yellow-600" />
            <div>
              <h3 className="font-semibold text-yellow-800">Qualification Required</h3>
              <p className="text-sm text-yellow-700">
                You must have at least one verified qualification to apply for shifts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
