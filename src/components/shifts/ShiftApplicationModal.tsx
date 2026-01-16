import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2, User, Phone, FileText } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface ShiftApplicationModalProps {
  shiftId: string;
  shiftTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * ShiftApplicationModal - Modal for applying to a shift
 * Validates profile completeness and submits application
 */
export function ShiftApplicationModal({
  shiftId,
  shiftTitle,
  isOpen,
  onClose,
  onSuccess,
}: ShiftApplicationModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [profileErrors, setProfileErrors] = useState<string[]>([]);

  // Check profile completeness when modal opens
  useEffect(() => {
    if (isOpen && user) {
      const errors: string[] = [];
      if (!user.name || user.name.trim().length === 0) {
        errors.push('name');
      }
      if (!user.phone || user.phone.trim().length === 0) {
        errors.push('phone');
      }
      if (!user.bio || user.bio.trim().length === 0) {
        errors.push('bio');
      }
      setProfileErrors(errors);
    }
  }, [isOpen, user]);

  const applyMutation = useMutation({
    mutationFn: async (applicationData: { message?: string }) => {
      const res = await apiRequest('POST', `/api/shifts/${shiftId}/apply`, applicationData);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to submit application' }));
        throw new Error(errorData.message || 'Failed to submit application');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Application Submitted!',
        description: data.instantAccept
          ? 'You have been accepted for this shift!'
          : 'Your application has been sent to the venue owner.',
      });
      queryClient.invalidateQueries({ queryKey: ['shift', shiftId] });
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      setMessage('');
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to submit application';
      
      // Handle profile incomplete error
      if (errorMessage.includes('PROFILE_INCOMPLETE') || errorMessage.includes('Profile incomplete')) {
        const missingFields = error.message.match(/missingFields.*?\[(.*?)\]/)?.[1]?.split(',').map((f: string) => f.trim().replace(/['"]/g, '')) || [];
        setProfileErrors(missingFields);
        toast({
          title: 'Profile Incomplete',
          description: 'Please complete your profile before applying for shifts.',
          variant: 'destructive',
        });
        return;
      }

      // Handle already applied error
      if (errorMessage.includes('already applied') || errorMessage.includes('409')) {
        toast({
          title: 'Already Applied',
          description: 'You have already applied to this shift.',
          variant: 'default',
        });
        onClose();
        queryClient.invalidateQueries({ queryKey: ['shift', shiftId] });
        return;
      }

      toast({
        title: 'Application Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (profileErrors.length > 0) {
      toast({
        title: 'Profile Incomplete',
        description: 'Please complete your profile before applying.',
        variant: 'destructive',
      });
      return;
    }

    applyMutation.mutate({
      message: message.trim() || undefined,
    });
  };

  const handleCompleteProfile = () => {
    onClose();
    navigate('/profile/edit');
  };

  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'name':
        return <User className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'bio':
        return <FileText className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getFieldLabel = (field: string) => {
    switch (field) {
      case 'name':
        return 'Name';
      case 'phone':
        return 'Phone Number';
      case 'bio':
        return 'Bio';
      default:
        return field;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Apply for Shift</DialogTitle>
          <DialogDescription>
            Apply for: <strong>{shiftTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Profile Completeness Alert */}
          {profileErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">Complete your profile to apply:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {profileErrors.map((field) => (
                      <li key={field} className="flex items-center gap-2">
                        {getFieldIcon(field)}
                        <span>{getFieldLabel(field)}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCompleteProfile}
                    className="mt-2"
                  >
                    Complete Profile
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Message Input */}
          {profileErrors.length === 0 && (
            <div className="space-y-2">
              <Label htmlFor="message">Message to Venue Owner (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Tell the venue owner why you're a great fit for this shift..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={500}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {message.length}/500
              </p>
            </div>
          )}

          {/* Success Message */}
          {applyMutation.isSuccess && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Your application has been submitted successfully!
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={applyMutation.isPending}>
            Cancel
          </Button>
          {profileErrors.length === 0 && (
            <Button
              onClick={handleSubmit}
              disabled={applyMutation.isPending}
            >
              {applyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
